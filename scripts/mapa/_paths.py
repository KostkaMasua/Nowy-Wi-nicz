"""Wspolne sciezki dla skryptow regeneracji mapy i budynkow.

Uklad w repo:
  scripts/mapa/*.py        <- te skrypty
  scripts/mapa/_work/      <- duze pliki posrednie (master PNG) — gitignore
  public/map/              <- podklad aplikacji (wisnicz-1849.jpg)
  public/dane/             <- wisnicz.json
  dane/                    <- buildings_outline.json
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))      # scripts/mapa -> scripts -> repo
WORK = os.path.join(HERE, "_work")                  # duze pliki posrednie
os.makedirs(WORK, exist_ok=True)

# pliki posrednie (nie wersjonowane)
FULL_PNG = os.path.join(WORK, "wisnicz-1849-full.png")   # master z6 9588x9079
BUILDINGS_JSON = os.path.join(WORK, "buildings_full.json")

# pliki wersjonowane w repo (produkty koncowe)
BG_JPG = os.path.join(REPO, "public", "map", "wisnicz-1849.jpg")
TOWN_JSON = os.path.join(REPO, "public", "dane", "wisnicz.json")
OUTLINES_JSON = os.path.join(REPO, "dane", "buildings_outline.json")
