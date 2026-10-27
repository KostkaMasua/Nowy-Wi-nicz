# Backend – API danych Wiśnicza

Prosty serwer HTTP (tylko biblioteka standardowa Pythona, bez zależności), oparty na szkielecie z `arekjaskulski/testrevolution`. Udostępnia dane z `public/dane/wisnicz.json`.

## Uruchomienie
```bash
cd backend
python3 -m wisnicz_api          # http://127.0.0.1:8000
python3 -m unittest discover -s tests
```

Zmienne środowiskowe: `WISNICZ_HOST`, `WISNICZ_PORT`, `WISNICZ_DATA` (ścieżka do JSON), `WISNICZ_CORS_ORIGIN` (domyślnie `*`).

## Endpointy (GET)
| Ścieżka | Opis |
|---|---|
| `/health` | `{"status": "ok"}` |
| `/api/stats` | liczba domów, mieszkańców, relacji |
| `/api/houses` | lista domów |
| `/api/houses/{id}` | dom wraz z mieszkańcami |
| `/api/residents?q=&houseId=` | wyszukiwanie po imieniu, nazwisku, stanie; filtr po domu |
| `/api/residents/{id}` | osoba wraz z relacjami |
| `/api/relations?personId=` | relacje (wszystkie lub danej osoby) |
