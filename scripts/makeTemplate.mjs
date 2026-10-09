// Generuje wzór arkusza Excel (szablon) dla aplikacji "Mapa mieszkańców".
// Trzy arkusze: Domy, Mieszkancy, Relacje — z nagłówkami i przykładami.
import * as XLSX from 'xlsx'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const out = join(__dirname, '..', 'public', 'szablon-mieszkancy.xlsx')

// --- Arkusz: Domy ---------------------------------------------------------
// x, y = współrzędne w pikselach skanu mapy (lewy górny róg = 0,0)
const domy = [
  { id: 'h1', nazwa: 'Rynek 1',       x: 800, y: 560 },
  { id: 'h2', nazwa: 'Rynek 4',       x: 870, y: 600 },
  { id: 'h3', nazwa: 'ul. Długa 12',  x: 640, y: 420 },
  { id: 'h4', nazwa: 'ul. Młyńska 3', x: 980, y: 760 },
  { id: 'h5', nazwa: 'Przedmieście 7', x: 420, y: 300 },
]

// --- Arkusz: Mieszkancy ---------------------------------------------------
// rok_sm pusty = osoba (w narracji) jeszcze żyje
const mieszkancy = [
  { id: 'r1', imie: 'Jan',       nazwisko: 'Kowalski',    rok_ur: 1812, rok_sm: 1879, zawod: 'kowal',      dom_id: 'h1' },
  { id: 'r2', imie: 'Marianna',  nazwisko: 'Kowalska',    rok_ur: 1818, rok_sm: 1885, zawod: '',           dom_id: 'h1' },
  { id: 'r3', imie: 'Wojciech',  nazwisko: 'Kowalski',    rok_ur: 1840, rok_sm: '',   zawod: 'czeladnik',  dom_id: 'h1' },
  { id: 'r4', imie: 'Józef',     nazwisko: 'Nowak',       rok_ur: 1808, rok_sm: 1871, zawod: 'kupiec',     dom_id: 'h2' },
  { id: 'r5', imie: 'Katarzyna', nazwisko: 'Nowak',       rok_ur: 1815, rok_sm: '',   zawod: '',           dom_id: 'h2' },
  { id: 'r6', imie: 'Franciszek',nazwisko: 'Wiśniewski',  rok_ur: 1805, rok_sm: 1868, zawod: 'młynarz',    dom_id: 'h4' },
  { id: 'r7', imie: 'Agnieszka', nazwisko: 'Zielińska',   rok_ur: 1820, rok_sm: 1890, zawod: 'tkaczka',    dom_id: 'h3' },
  { id: 'r8', imie: 'Antoni',    nazwisko: 'Lewandowski', rok_ur: 1810, rok_sm: 1877, zawod: 'rolnik',     dom_id: 'h5' },
]

// --- Arkusz: Relacje ------------------------------------------------------
// typ ∈ {rodzinna, zawodowa, przyjacielska, sadowa}
const relacje = [
  { id: 'rel1', typ: 'rodzinna',     od_id: 'r1', do_id: 'r2', opis: 'małżonkowie' },
  { id: 'rel2', typ: 'rodzinna',     od_id: 'r1', do_id: 'r3', opis: 'syn' },
  { id: 'rel3', typ: 'zawodowa',     od_id: 'r1', do_id: 'r4', opis: 'dostawca żelaza' },
  { id: 'rel4', typ: 'przyjacielska',od_id: 'r4', do_id: 'r6', opis: 'kum' },
  { id: 'rel5', typ: 'sadowa',       od_id: 'r6', do_id: 'r8', opis: 'spór o miedzę' },
  { id: 'rel6', typ: 'zawodowa',     od_id: 'r7', do_id: 'r2', opis: 'najemczyni' },
]

// --- Arkusz pomocniczy: Instrukcja ---------------------------------------
const instrukcja = [
  { pole: 'ARKUSZ "Domy"', opis: 'Lista domów oznaczonych na mapie' },
  { pole: 'id', opis: 'Unikalny identyfikator domu (tekst). Używany w arkuszu Mieszkancy jako dom_id.' },
  { pole: 'nazwa', opis: 'Nazwa/adres historyczny wyświetlany w aplikacji, np. "Rynek 4".' },
  { pole: 'x', opis: 'Pozioma współrzędna w PIKSELACH skanu mapy (0 = lewa krawędź).' },
  { pole: 'y', opis: 'Pionowa współrzędna w PIKSELACH skanu mapy (0 = górna krawędź).' },
  { pole: '', opis: '' },
  { pole: 'ARKUSZ "Mieszkancy"', opis: 'Lista osób zamieszkujących domy' },
  { pole: 'id', opis: 'Unikalny identyfikator osoby (tekst). Używany w arkuszu Relacje.' },
  { pole: 'imie', opis: 'Imię.' },
  { pole: 'nazwisko', opis: 'Nazwisko.' },
  { pole: 'rok_ur', opis: 'Rok urodzenia (liczba).' },
  { pole: 'rok_sm', opis: 'Rok śmierci (liczba). POZOSTAW PUSTE, jeśli osoba żyje.' },
  { pole: 'zawod', opis: 'Zawód/status (opcjonalne).' },
  { pole: 'dom_id', opis: 'id domu z arkusza "Domy", w którym osoba mieszka.' },
  { pole: '', opis: '' },
  { pole: 'ARKUSZ "Relacje"', opis: 'Powiązania między mieszkańcami' },
  { pole: 'id', opis: 'Unikalny identyfikator relacji (tekst).' },
  { pole: 'typ', opis: 'Jeden z: rodzinna, zawodowa, przyjacielska, sadowa.' },
  { pole: 'od_id', opis: 'id pierwszej osoby (z arkusza Mieszkancy).' },
  { pole: 'do_id', opis: 'id drugiej osoby (z arkusza Mieszkancy).' },
  { pole: 'opis', opis: 'Opis relacji, np. "ojciec", "wspólnik", "spór o miedzę" (opcjonalne).' },
]

const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(instrukcja), 'Instrukcja')
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(domy), 'Domy')
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mieszkancy), 'Mieszkancy')
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(relacje), 'Relacje')

// Szerokości kolumn dla czytelności
wb.Sheets['Instrukcja']['!cols'] = [{ wch: 22 }, { wch: 70 }]
wb.Sheets['Domy']['!cols'] = [{ wch: 8 }, { wch: 20 }, { wch: 8 }, { wch: 8 }]
wb.Sheets['Mieszkancy']['!cols'] = [
  { wch: 8 }, { wch: 14 }, { wch: 16 }, { wch: 8 }, { wch: 8 }, { wch: 14 }, { wch: 8 },
]
wb.Sheets['Relacje']['!cols'] = [
  { wch: 8 }, { wch: 14 }, { wch: 8 }, { wch: 8 }, { wch: 24 },
]

XLSX.writeFile(wb, out)
console.log('Zapisano szablon:', out)
