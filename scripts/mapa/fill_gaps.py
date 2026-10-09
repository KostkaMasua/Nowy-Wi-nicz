"""
Faza 2/5. Wypelnia LUKI w zszytym obrazie. Niektore kafelki wracaja z 403
losowo (throttling serwera). Wykrywa kafelki 'puste' (prawie jednolite tlo)
i pobiera je ponownie z wytrwalymi powtorkami i opoznieniem.

Uruchom (po fetch_full.py):  python scripts/mapa/fill_gaps.py
"""
import io
import time
import random
import concurrent.futures as cf
import numpy as np
from PIL import Image
import requests
from _paths import FULL_PNG

Image.MAX_IMAGE_PIXELS = None
BASE = "https://maps.geshergalicia.org/cadastral/wisnicz-nowy-1849"
Z = 6
TILE = 256
FULL_W, FULL_H = 9588, 9079
COLS = -(-FULL_W // TILE)
ROWS = -(-FULL_H // TILE)

session = requests.Session()
session.headers.update({"User-Agent": "Mozilla/5.0"})
BG = np.array([232, 220, 192])


def is_blank(arr):
    diff = np.abs(arr.astype(int) - BG).sum(axis=2)
    return (diff < 24).mean() > 0.985


def fetch(x, row, tries=10):
    y_tms = ROWS - 1 - row
    url = f"{BASE}/{Z}/{x}/{y_tms}.jpg"
    for _ in range(tries):
        try:
            r = session.get(url, timeout=30)
            if r.status_code == 200 and r.content:
                return r.content
            if r.status_code == 404:
                return None
        except Exception:
            pass
        time.sleep(0.3 + random.random() * 0.7)
    return None


def main():
    im = Image.open(FULL_PNG).convert("RGB")
    full = Image.new("RGB", (COLS * TILE, ROWS * TILE), tuple(BG.tolist()))
    full.paste(im, (0, 0))
    arr = np.asarray(full)

    blanks = []
    for x in range(COLS):
        for row in range(ROWS):
            sub = arr[row * TILE:(row + 1) * TILE, x * TILE:(x + 1) * TILE]
            if sub.shape[0] == TILE and sub.shape[1] == TILE and is_blank(sub):
                blanks.append((x, row))
    print(f"Pustych kafelkow do ponownej proby: {len(blanks)}")

    results = {}
    with cf.ThreadPoolExecutor(max_workers=8) as ex:
        futmap = {ex.submit(fetch, x, row): (x, row) for (x, row) in blanks}
        done = 0
        for fut in cf.as_completed(futmap):
            x, row = futmap[fut]
            content = fut.result()
            done += 1
            if content:
                results[(x, row)] = content
            if done % 50 == 0:
                print(f"  ... {done}/{len(blanks)} (odzyskano {len(results)})", flush=True)

    filled = 0
    for (x, row), content in results.items():
        try:
            tile = Image.open(io.BytesIO(content)).convert("RGB")
            full.paste(tile, (x * TILE, row * TILE))
            filled += 1
        except Exception:
            pass

    cropped = full.crop((0, 0, FULL_W, FULL_H))
    cropped.save(FULL_PNG, "PNG")
    print(f"Wypelniono {filled} kafelkow.")
    print(f"Zapisano ponownie: {FULL_PNG}")
    print("Dalej: python scripts/mapa/detect_full.py")


if __name__ == "__main__":
    main()
