"""
Przycina mape do OBSZARU MIASTA (bounding box wykrytych budynkow + margines),
tworzy OSTRZEJSZY podklad (wyzsza rozdzielczosc + unsharp mask) i przelicza
wszystkie wspolrzedne budynkow do nowego, przycietego ukladu.

Wejscie:
  _work/wisnicz-1849-full.png   master z6 (9588x9079)
  dane/buildings_outline.json   budynki w starej przestrzeni 2397x2270 (position/outline = [y,x])
Wyjscie (nadpisuje):
  public/map/wisnicz-1849.jpg   nowy podklad (przyciety, ostrzejszy)
  public/dane/wisnicz.json      houses z nowymi wspolrzednymi + nowy mapSize
  dane/buildings_outline.json   obrysy w nowej przestrzeni

Uruchom:  python scripts/mapa/crop_city.py
"""
import json
import numpy as np
from PIL import Image, ImageFilter
from _paths import FULL_PNG, BG_JPG, TOWN_JSON, OUTLINES_JSON

Image.MAX_IMAGE_PIXELS = None

FULL_W, FULL_H = 9588, 9079
OLD_BASE_W = 2397                 # przestrzen, w ktorej zapisane sa obecne budynki
OLD_SCALE = OLD_BASE_W / FULL_W   # 0.25  (full -> old base)

MARGIN_FRAC = 0.03    # margines wokol miasta (ulamek rozmiaru bboxa)
TARGET_W = 3600       # szerokosc nowego podkladu (ostrzejszy niz 2397)
JPEG_Q = 90


def main():
    buildings = json.load(open(OUTLINES_JSON, encoding="utf-8"))

    # bbox budynkow w PELNEJ rozdzielczosci (z old-base /0.25 -> *4)
    xs, ys = [], []
    for b in buildings:
        for (y, x) in b["outline"]:
            xs.append(x / OLD_SCALE)
            ys.append(y / OLD_SCALE)
    minx, maxx = min(xs), max(xs)
    miny, maxy = min(ys), max(ys)
    bw, bh = maxx - minx, maxy - miny
    mx, my = bw * MARGIN_FRAC, bh * MARGIN_FRAC

    # crop box w full-res, przyciety do granic obrazu
    cx0 = max(0, int(minx - mx))
    cy0 = max(0, int(miny - my))
    cx1 = min(FULL_W, int(maxx + mx))
    cy1 = min(FULL_H, int(maxy + my))
    crop_w, crop_h = cx1 - cx0, cy1 - cy0
    print(f"Crop (full-res): x {cx0}..{cx1}  y {cy0}..{cy1}  = {crop_w}x{crop_h}")

    # --- podklad: przytnij, przeskaluj do TARGET_W, wyostrz ---
    im = Image.open(FULL_PNG).convert("RGB")
    crop = im.crop((cx0, cy0, cx1, cy1))
    target_h = round(TARGET_W * crop_h / crop_w)
    bg = crop.resize((TARGET_W, target_h), Image.LANCZOS)
    # unsharp mask: delikatne wyostrzenie konturow bez aureoli
    bg = bg.filter(ImageFilter.UnsharpMask(radius=1.6, percent=120, threshold=2))
    bg.save(BG_JPG, "JPEG", quality=JPEG_Q, optimize=True)
    print(f"Podklad: {BG_JPG}  {bg.size}")

    # --- nowy uklad wspolrzednych aplikacji = rozmiar podkladu (TARGET_W x target_h) ---
    NEW_W, NEW_H = TARGET_W, target_h
    # pelna rozdzielczosc -> nowy uklad: (p_full - crop_origin) * (NEW / crop)
    sx = NEW_W / crop_w
    sy = NEW_H / crop_h

    def remap(y_old, x_old):
        # old-base -> full-res -> crop-local -> new display
        xf = x_old / OLD_SCALE
        yf = y_old / OLD_SCALE
        return [round((yf - cy0) * sy, 1), round((xf - cx0) * sx, 1)]  # [y, x]

    new_buildings = []
    for b in buildings:
        nb = dict(b)
        nb["position"] = remap(b["position"][0], b["position"][1])
        nb["outline"] = [remap(y, x) for (y, x) in b["outline"]]
        new_buildings.append(nb)

    with open(OUTLINES_JSON, "w", encoding="utf-8") as f:
        json.dump(new_buildings, f, ensure_ascii=False)

    # --- przebuduj wisnicz.json: nowe houses + nowy mapSize; residents/relations bez zmian ---
    town = json.load(open(TOWN_JSON, encoding="utf-8"))
    by_id = {f"D{b['nr']}": b for b in new_buildings}
    for h in town["houses"]:
        nb = by_id.get(h["id"])
        if nb:
            h["position"] = nb["position"]
            h["outline"] = nb["outline"]
    town["mapSize"] = [NEW_W, NEW_H]
    with open(TOWN_JSON, "w", encoding="utf-8") as f:
        json.dump(town, f, ensure_ascii=False, indent=1)

    print(f"Nowy mapSize: [{NEW_W}, {NEW_H}]")
    print(f"Zaktualizowano {len(town['houses'])} domow w {TOWN_JSON}")


if __name__ == "__main__":
    main()
