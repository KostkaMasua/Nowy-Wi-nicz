"""
Faza 1/5. Pobiera CALA mape katastralna Wisnicza (Nowy Wisnicz) 1849 z
maksymalnego poziomu zoomu kafelkow (z6) i sklada wszystkie kafelki w jeden
obraz pelnej rozdzielczosci (scripts/mapa/_work/wisnicz-1849-full.png).

Serwer gdal2tiles/TMS: y liczony od DOLU. Max zoom = 6 (z7 -> 403).
Pelny obraz z6: ~9588 x 9079 px, siatka 38 x 36 kafelkow po 256 px.

Uruchom:  python scripts/mapa/fetch_full.py
"""
import io
import concurrent.futures as cf
from PIL import Image
import requests
from _paths import FULL_PNG

Image.MAX_IMAGE_PIXELS = None

BASE = "https://maps.geshergalicia.org/cadastral/wisnicz-nowy-1849"
Z = 6
TILE = 256
FULL_W = 9588
FULL_H = 9079
COLS = -(-FULL_W // TILE)   # 38
ROWS = -(-FULL_H // TILE)   # 36

session = requests.Session()
session.headers.update({"User-Agent": "Mozilla/5.0"})


def fetch_tile(x, row):
    y_tms = ROWS - 1 - row  # TMS: y od dolu
    url = f"{BASE}/{Z}/{x}/{y_tms}.jpg"
    for _ in range(4):
        try:
            r = session.get(url, timeout=30)
            if r.status_code == 200 and r.content:
                return (x, row, r.content)
            if r.status_code in (403, 404):
                return (x, row, None)
        except Exception:
            pass
    return (x, row, None)


def main():
    canvas = Image.new("RGB", (COLS * TILE, ROWS * TILE), (232, 220, 192))
    jobs = [(x, row) for x in range(COLS) for row in range(ROWS)]
    ok = miss = done = 0
    with cf.ThreadPoolExecutor(max_workers=24) as ex:
        for x, row, content in ex.map(lambda j: fetch_tile(*j), jobs):
            done += 1
            if content is None:
                miss += 1
            else:
                try:
                    tile = Image.open(io.BytesIO(content)).convert("RGB")
                    canvas.paste(tile, (x * TILE, row * TILE))
                    ok += 1
                except Exception:
                    miss += 1
            if done % 200 == 0:
                print(f"  ... {done}/{len(jobs)} tiles", flush=True)

    cropped = canvas.crop((0, 0, FULL_W, FULL_H))
    cropped.save(FULL_PNG, "PNG")
    print(f"Kafelki OK={ok} brak={miss}")
    print(f"Zapisano: {FULL_PNG} ({cropped.width}x{cropped.height}px)")
    print("Dalej: python scripts/mapa/fill_gaps.py")


if __name__ == "__main__":
    main()
