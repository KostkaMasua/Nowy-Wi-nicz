# Mapa mieszkańców Wiśnicza

Interaktywna mapa relacji mieszkańców Wiśnicza (Nowy Wiśnicz): **Księga radziecka 1712–1736** (dane z lat 1724–1736) na tle **mapy katastralnej z 1849 r.** (Gesher Galicia).

Kliknij budynek → lista mieszkańców (pozostałe domy znikają) → kliknij osobę → linie relacji do domów powiązanych osób.
Działa w przeglądarce, także na telefonie (Android/iOS), oraz jako aplikacja instalowana z ekranu głównego (PWA, z trybem offline).

## Ważne zastrzeżenia
- Położenia budynków są prawdziwe (wykryte z mapy z 1849 r.), ale **przypisanie osób do domów jest umowne** (po kolei) — żadne źródło nie łączy osób z lat 1724–1736 z numerami domów z 1849 r.
- Księga nie zawiera lat życia osób, więc w aplikacji widnieje „0–".
- Imiona (łacina → polski), stany społeczne i warianty nazwisk zostały ujednolicone; oryginały są w kolumnach „(oryginał)". Scalenie wariantów nazwisk może łączyć różne osoby.
- Wszystkie relacje mają obecnie typ „sądowa" (osoby występujące w tej samej sprawie).

## Uruchomienie lokalne
```bash
npm install
npm run dev      # podgląd
npm run build    # wersja produkcyjna w katalogu dist/
```

## Publikacja (GitHub Pages)
Ustawienia repozytorium → Pages → Source: **GitHub Actions**. Workflow `.github/workflows/pages.yml` zbuduje i opublikuje stronę po każdym wypchnięciu do `main`.
Adres: `https://<użytkownik>.github.io/Nowy-Wi-nicz/`.
Na telefonie otwórz adres w Chrome → menu → „Dodaj do ekranu głównego".

## Struktura
- `src/` – aplikacja (React + TypeScript + Leaflet)
- `public/dane/wisnicz.json` – dane aplikacji (domy, osoby, relacje); `public/map/` – podkład mapy
- `dane/` – dane źródłowe i pliki robocze
- `scripts/` – skrypty przetwarzania danych (ujednolicanie, wykrywanie budynków, budowa JSON)
