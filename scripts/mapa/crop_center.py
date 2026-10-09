"""
Przycina mape do ZWARTEGO CENTRUM miasta (kwadrat zweryfikowany wizualnie wzgledem
zrzutu uzytkownika) i tworzy ostry podklad PROSTO z mastera w pelnej rozdzielczosci.
Przelicza wspolrzedne budynkow do nowego ukladu i usuwa budynki poza kadrem.

Zrodlo wspolrzednych: wersja z galezi main (3600x2958) — czytane przez `git show`,
dzieki czemu skrypt jest deterministyczny niezaleznie od stanu plikow roboczych.

Uruchom:  python scripts/mapa/crop_center.py
"""
import json
import subprocess
import numpy as np
from PIL import Image, ImageFilter
from _paths import FULL_PNG, BG_JPG, TOWN_JSON, OUTLINES_JSON, REPO

Image.MAX_IMAGE_PIXELS = None

# transform master -> podklad main (crop_city.py)
OFF1_X, OFF1_Y = 563, 1979
CROP1_W, CROP1_H = 8641, 7100
PREV_W, PREV_H = 3600, 2958
S1X = PREV_W / CROP1_W
S1Y = PREV_H / CROP1_H

# ZWERYFIKOWANY kadr centrum w ulamkach ukladu PREV (3600x2958):
FX0, FX1 = 0.57, 0.95
FY0, FY1 = 0.15, 0.72

TARGET_W = 3400
JPEG_Q = 90


def git_show(path):
    out = subprocess.run(["git", "-C", REPO, "show", f"main:{path}"],
                         capture_output=True, text=True, encoding="utf-8").stdout
    return json.loads(out)


def prev_to_full(x, y):
    return (x / S1X + OFF1_X, y / S1Y + OFF1_Y)


def main():
    buildings = git_show("dane/buildings_outline.json")
    town = git_show("public/dane/wisnicz.json")

    x0p, x1p = FX0 * PREV_W, FX1 * PREV_W
    y0p, y1p = FY0 * PREV_H, FY1 * PREV_H
    fx0, fy0 = prev_to_full(x0p, y0p)
    fx1, fy1 = prev_to_full(x1p, y1p)
    fx0, fy0 = max(0, int(fx0)), max(0, int(fy0))
    fx1, fy1 = int(fx1), int(fy1)
    cw, ch = fx1 - fx0, fy1 - fy0
    print(f"Centrum (full-res): x {fx0}..{fx1} y {fy0}..{fy1} = {cw}x{ch}")

    im = Image.open(FULL_PNG).convert("RGB")
    crop = im.crop((fx0, fy0, fx1, fy1))
    th = round(TARGET_W * ch / cw)
    bg = crop.resize((TARGET_W, th), Image.LANCZOS)
    bg = bg.filter(ImageFilter.UnsharpMask(radius=1.6, percent=120, threshold=2))
    bg.save(BG_JPG, "JPEG", quality=JPEG_Q, optimize=True)
    print(f"Podklad: {BG_JPG} {bg.size}")

    NEW_W, NEW_H = TARGET_W, th
    sx, sy = NEW_W / cw, NEW_H / ch

    def remap(y_prev, x_prev):
        xf, yf = prev_to_full(x_prev, y_prev)
        return [round((yf - fy0) * sy, 1), round((xf - fx0) * sx, 1)]

    # przelicz budynki + odfiltruj te poza kadrem (wg pozycji centroidu)
    new_outlines = []
    kept_ids = set()
    for b in buildings:
        pos = remap(b["position"][0], b["position"][1])
        y, x = pos
        if not (-10 <= x <= NEW_W + 10 and -10 <= y <= NEW_H + 10):
            continue
        nb = dict(b)
        nb["position"] = pos
        nb["outline"] = [remap(yy, xx) for (yy, xx) in b["outline"]]
        new_outlines.append(nb)
        kept_ids.add(f"D{b['nr']}")
    with open(OUTLINES_JSON, "w", encoding="utf-8") as f:
        json.dump(new_outlines, f, ensure_ascii=False)

    by_id = {f"D{b['nr']}": b for b in new_outlines}
    town["houses"] = [
        {**h, "position": by_id[h["id"]]["position"], "outline": by_id[h["id"]]["outline"]}
        for h in town["houses"] if h["id"] in kept_ids
    ]
    town["residents"] = [r for r in town["residents"] if r["houseId"] in kept_ids]
    kept_res = {r["id"] for r in town["residents"]}
    town["relations"] = [r for r in town["relations"]
                         if r["fromId"] in kept_res and r["toId"] in kept_res]
    town["mapSize"] = [NEW_W, NEW_H]
    with open(TOWN_JSON, "w", encoding="utf-8") as f:
        json.dump(town, f, ensure_ascii=False, indent=1)

    print(f"Nowy mapSize: [{NEW_W}, {NEW_H}]")
    print(f"Domy w kadrze: {len(town['houses'])}  mieszkancy: {len(town['residents'])}  "
          f"relacje: {len(town['relations'])}")


if __name__ == "__main__":
    main()
