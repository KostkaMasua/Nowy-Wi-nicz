"""
Faza 4/5. Tworzy podklad aplikacji public/map/wisnicz-1849.jpg (2397x2270)
z mastera w pelnej rozdzielczosci (LANCZOS). Podklad jest lekki (dla telefonu),
master NIE jest wersjonowany w repo.

Uruchom (po fill_gaps.py):  python scripts/mapa/make_bg.py
"""
import os
from PIL import Image
from _paths import FULL_PNG, BG_JPG

Image.MAX_IMAGE_PIXELS = None

im = Image.open(FULL_PNG).convert("RGB")
bg = im.resize((2397, 2270), Image.LANCZOS)
os.makedirs(os.path.dirname(BG_JPG), exist_ok=True)
bg.save(BG_JPG, "JPEG", quality=88, optimize=True)
print(f"Podklad: {BG_JPG} ({os.path.getsize(BG_JPG)/1024:.0f} KB) {bg.size}")
