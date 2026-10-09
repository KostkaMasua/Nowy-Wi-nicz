# Regeneracja mapy i budynków (pełna rozdzielczość)

Te skrypty odtwarzają **master mapy w pełnej rozdzielczości** oraz **wykrywają
budynki na całym mieście** z mapy katastralnej 1849 (Gesher Galicia). Master
(≈82 MB PNG) **nie jest wersjonowany** w repo — produkuje go faza 1–2 do
`scripts/mapa/_work/` (katalog ignorowany przez git). W repo trafiają tylko
lekkie produkty końcowe:

- `public/map/wisnicz-1849.jpg` — podkład aplikacji (2397×2270),
- `public/dane/wisnicz.json` — domy + mieszkańcy + relacje,
- `dane/buildings_outline.json` — obrysy budynków.

## Wymagania

- Python 3.10+
- `pip install -r scripts/mapa/requirements.txt`

## Uruchomienie (z katalogu głównego repo)

```bash
python scripts/mapa/fetch_full.py     # 1. pobierz wszystkie kafelki z6 -> master PNG
python scripts/mapa/fill_gaps.py      # 2. uzupełnij luki (serwer bywa kapryśny)
python scripts/mapa/detect_full.py    # 3. wykryj budynki na całej mapie
python scripts/mapa/make_bg.py        # 4. podkład 2397x2270 z mastera
python scripts/mapa/rebuild_json.py   # 5. przebuduj wisnicz.json + buildings_outline.json
```

Po fazie 5 zbuduj aplikację: `npm run build`.

## Uwagi

- Maksymalny poziom zoomu kafelków na serwerze to **z6** (9588×9079 px); z7
  zwraca 403.
- Detekcja budynków jest kolorystyczna (żółte = drewniane, różowe/karmin =
  murowane) + śledzenie konturu + Douglas–Peucker. Progi w `detect_full.py`.
- Źródło: oryginał mapy w domenie publicznej; zszyty obraz © Gesher Galicia.
