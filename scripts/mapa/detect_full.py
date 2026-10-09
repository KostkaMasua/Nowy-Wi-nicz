"""
Faza 3/5. Wykrywa budynki na CALEJ mapie w pelnej rozdzielczosci (z6,
9588x9079), nie tylko w centrum. Port logiki z detect_outlines_precise.mjs:

 1) maska kolorow: zolty (drewniane) / rozowy-karmin (murowane),
 2) domkniecie morfologiczne 1 px (zasklepia dziury po czerwonych cyfrach),
 3) etykietowanie spojnych obszarow (budynki),
 4) sledzenie konturu (skimage.find_contours) + Douglas-Peucker (approximate_polygon),
 5) przeliczenie wspolrzednych z z6 (9588x9079) do przestrzeni aplikacji
    (2397x2270 = skala /4), zgodnej z istniejacym mapSize.

Wynik: _work/buildings_full.json  [{nr,type,position:[y,x],outline:[[y,x],...]}]

Uruchom (po fill_gaps.py):  python scripts/mapa/detect_full.py
"""
import json
import numpy as np
from PIL import Image
from scipy import ndimage
from skimage import measure
from _paths import FULL_PNG, BUILDINGS_JSON

Image.MAX_IMAGE_PIXELS = None

FULL_W, FULL_H = 9588, 9079
BASE_W = 2397               # przestrzen aplikacji (jak w wisnicz.json)
SCALE = BASE_W / FULL_W     # ~0.25

MIN_A, MAX_A, MAX_BB = 120, 16000, 340   # progi wielkosci bloba (px z6)
MERGE_DIST = 14             # scalanie bliskich centroidow (px z6)
DP_TOL = 2.2                # tolerancja Douglas-Peucker (px z6)
PINK_FRAC = 0.35            # udzial rozowego -> 'murowany'


def build_masks(arr):
    r = arr[:, :, 0].astype(int)
    g = arr[:, :, 1].astype(int)
    b = arr[:, :, 2].astype(int)
    yellow = (r > 170) & (g > 150) & (b < 140) & (np.abs(r - g) < 60) & ((r - b) > 50)
    pink = (r > 170) & (g < 160) & (b > 90) & (b < 190) & ((r - g) > 40) & ((r - b) > 25)
    return (yellow | pink), pink


def main():
    im = Image.open(FULL_PNG).convert("RGB")
    arr = np.asarray(im)
    print(f"Obraz: {im.width}x{im.height}")

    mask, pink = build_masks(arr)
    st = ndimage.generate_binary_structure(2, 1)
    closed = ndimage.binary_closing(mask, structure=st, iterations=1)
    labels, n = ndimage.label(closed, structure=st)
    print(f"Surowych obszarow: {n}")

    objs = ndimage.find_objects(labels)
    idx_all = np.arange(1, n + 1)
    counts = ndimage.sum(np.ones_like(labels), labels, index=idx_all)
    centroids = ndimage.center_of_mass(closed, labels, index=idx_all)
    pink_counts = ndimage.sum(pink, labels, index=idx_all)

    cands = []
    for i in range(1, n + 1):
        area = counts[i - 1]
        if area < MIN_A or area > MAX_A:
            continue
        sl = objs[i - 1]
        if sl is None:
            continue
        ys, xs = sl
        if (xs.stop - xs.start) > MAX_BB or (ys.stop - ys.start) > MAX_BB:
            continue
        cy, cx = centroids[i - 1]
        cands.append({"idx": i, "area": float(area), "cx": cx, "cy": cy,
                      "pink": float(pink_counts[i - 1]), "slice": sl})

    cands.sort(key=lambda c: -c["area"])
    picked = []
    for c in cands:
        if any((c["cx"] - p["cx"]) ** 2 + (c["cy"] - p["cy"]) ** 2 < MERGE_DIST ** 2 for p in picked):
            continue
        picked.append(c)
    print(f"Kandydatow po filtrach i scaleniu: {len(picked)}")

    buildings = []
    nr = 0
    for c in picked:
        ys, xs = c["slice"]
        sub = (labels[ys.start:ys.stop, xs.start:xs.stop] == c["idx"])
        padded = np.pad(sub.astype(float), 1)
        contours = measure.find_contours(padded, 0.5)
        if not contours:
            continue
        simp = measure.approximate_polygon(max(contours, key=len), tolerance=DP_TOL)
        if len(simp) < 4:
            continue
        pts = [(col - 1 + xs.start, row - 1 + ys.start) for (row, col) in simp]
        if len(pts) > 1 and abs(pts[0][0] - pts[-1][0]) < 1e-6 and abs(pts[0][1] - pts[-1][1]) < 1e-6:
            pts = pts[:-1]
        if len(pts) < 3:
            continue
        nr += 1
        typ = "murowany" if (c["pink"] / c["area"]) > PINK_FRAC else "drewniany"
        outline = [[round(y * SCALE, 1), round(x * SCALE, 1)] for (x, y) in pts]
        pos = [round(c["cy"] * SCALE, 1), round(c["cx"] * SCALE, 1)]
        buildings.append({"nr": nr, "type": typ, "position": pos, "outline": outline})

    with open(BUILDINGS_JSON, "w", encoding="utf-8") as f:
        json.dump(buildings, f, ensure_ascii=False)
    mur = sum(1 for b in buildings if b["type"] == "murowany")
    print(f"Budynki na CALEJ mapie: {len(buildings)} (murowane {mur}, drewniane {len(buildings)-mur})")
    print(f"Zapisano: {BUILDINGS_JSON}")
    print("Dalej: python scripts/mapa/make_bg.py && python scripts/mapa/rebuild_json.py")


if __name__ == "__main__":
    main()
