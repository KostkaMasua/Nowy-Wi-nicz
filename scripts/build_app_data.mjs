import * as XLSX from 'xlsx'
import { readFile, writeFile } from 'node:fs/promises'

// Wczytaj JUŻ UJEDNOLICONY plik.
const wb = XLSX.read(
  await readFile('/projects/sandbox/public/dane/Ksiega-radziecka-Wisnicza-ujednolicona.xlsx'),
)
const rows = XLSX.utils.sheet_to_json(wb.Sheets['Winicz_ujednolicony'], { defval: '' })

// --- 1. Zbuduj rejestr unikalnych osób (po spolszczonej nazwie) ---
const NIE_OSOBA = /^(małżonka|syn|córka|zięć|matka|ojciec|brat|siostra|wdowa|cech|contubernium|magistrat|magstrat|magistratus|chłopiec|żydzi|żyd|pan|pani|urząd)\b/i
// Zapisy, które NIE są konkretną osobą — pomijamy całkowicie.
const PLACEHOLDER = new Set(['?', '-', '', 'nieznany', 'nieznana'])

const osoby = new Map() // nazwa -> {name, stan, count}
function rejestruj(name, stan) {
  const s = String(name).trim()
  if (!s || PLACEHOLDER.has(s.toLowerCase()) || NIE_OSOBA.test(s)) return
  if (!osoby.has(s)) osoby.set(s, { name: s, stan: stan || '', count: 0 })
  const o = osoby.get(s)
  o.count++
  if (!o.stan && stan) o.stan = stan
}

for (const r of rows) {
  rejestruj(r.Kto, r['Stan społeczny'])
  rejestruj(r['Z kim'], '')
  rejestruj(r['Osoby powiązane'], '')
}

const lista = [...osoby.values()].sort((a, b) => b.count - a.count)
console.log('Unikalnych osób (rejestr):', lista.length)

// --- 2. Przypisz osoby do REALNYCH budynków wykrytych na mapie 1849 ---
// Pozycje budynków pochodzą z detekcji kolorystycznej (żółte/różowe parcele).
// Numer domu pozostaje PORZĄDKOWY (nasz), ale pozycja jest realna.
const buildings = JSON.parse(
  await (await import('node:fs/promises')).readFile('/projects/sandbox/dane/buildings_outline.json', 'utf8'),
)
console.log('Wczytano realnych budynków z mapy (z konturem):', buildings.length)

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(1849)

// Utwórz domy z realnych pozycji budynków (position=[y,x], outline, typ).
const domy = buildings.map((b) => ({
  id: `D${b.nr}`,
  'nr domu (porządkowy)': b.nr,
  x: b.position[1],
  y: b.position[0],
  typ: b.type,
  outline: b.outline,
}))

// Przypisz każdą osobę do budynku. Osób (652) jest więcej niż budynków (~384),
// więc część budynków pomieści kilka osób (realistyczne: wiele rodzin w domu).
// Rozdzielamy równomiernie, deterministycznie.
const nB = domy.length
const mieszkancy = lista.map((o, i) => {
  const bIdx = i % nB // round-robin: równomierne obciążenie budynków
  const dom = domy[bIdx]
  const parts = o.name.split(/\s+/)
  const nazwisko = parts.length > 1 ? parts[parts.length - 1] : parts[0]
  const imie = parts.length > 1 ? parts.slice(0, -1).join(' ') : ''
  return {
    id: `O${i + 1}`,
    imie,
    nazwisko,
    'pełna nazwa': o.name,
    'stan społeczny': o.stan,
    'nr domu (porządkowy)': dom['nr domu (porządkowy)'],
    dom_id: dom.id,
    'liczba wystąpień': o.count,
  }
})
void rand // (zachowane na wypadek jitteru pozycji w przyszłości)

// --- 3. Zbuduj RELACJE z par w sprawach ---
// W obrębie jednej sprawy (ID) osoby Kto / Z kim / Osoby powiązane są powiązane.
// Grupujemy wiersze po sprawach (ID wypełnione = nowa sprawa).
const relacje = []
let relId = 0
let currentCase = null
const caseActors = []

function nazwaOsoby(v) {
  const s = String(v).trim()
  if (!s || PLACEHOLDER.has(s.toLowerCase()) || NIE_OSOBA.test(s)) return null
  return osoby.has(s) ? s : null
}

function flushCase() {
  if (!currentCase) return
  const uniq = [...new Set(caseActors)]
  // Połącz "Kto" z każdą inną osobą sprawy (gwiazda wokół inicjatora).
  const kto = currentCase.kto
  for (const other of uniq) {
    if (other === kto) continue
    if (!kto) break
    relacje.push({
      id: `R${++relId}`,
      typ: 'sadowa',
      od_id: idOf(kto),
      do_id: idOf(other),
      opis: currentCase.temat || currentCase.charakter || 'sprawa sądowa',
      rok: currentCase.rok,
    })
  }
}

const idByName = new Map(mieszkancy.map((m) => [m['pełna nazwa'], m.id]))
function idOf(name) {
  return idByName.get(name) || ''
}

for (const r of rows) {
  const hasId = String(r.ID).trim() !== ''
  if (hasId) {
    flushCase()
    caseActors.length = 0
    currentCase = {
      kto: nazwaOsoby(r.Kto),
      temat: String(r['Temat sprawy'] || '').trim(),
      charakter: String(r['Charakter wpisu'] || '').trim(),
      rok: String(r.Rok || '').trim(),
    }
  }
  for (const col of ['Kto', 'Z kim', 'Osoby powiązane']) {
    const n = nazwaOsoby(r[col])
    if (n) caseActors.push(n)
  }
}
flushCase()

// usuń zduplikowane relacje (ta sama para + opis)
const seen = new Set()
const relacjeU = relacje.filter((r) => {
  if (!r.od_id || !r.do_id || r.od_id === r.do_id) return false
  const key = [r.od_id, r.do_id, r.opis].sort().join('|')
  if (seen.has(key)) return false
  seen.add(key)
  return true
})

console.log('Domy (fikcyjne):', domy.length)
console.log('Mieszkańcy:', mieszkancy.length)
console.log('Relacje sądowe:', relacjeU.length)

// --- 4. Zapisz arkusz Excel z wynikiem (Domy / Mieszkancy / Relacje) ---
const outWb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(outWb, XLSX.utils.json_to_sheet(domy), 'Domy')
XLSX.utils.book_append_sheet(outWb, XLSX.utils.json_to_sheet(mieszkancy), 'Mieszkancy')
XLSX.utils.book_append_sheet(outWb, XLSX.utils.json_to_sheet(relacjeU), 'Relacje')
await writeFile(
  '/projects/sandbox/public/dane/Wisnicz-domy-osoby-relacje.xlsx',
  XLSX.write(outWb, { type: 'buffer', bookType: 'xlsx' }),
)

// --- 5. Zapisz JSON dla aplikacji ---
const townData = {
  mapImage: 'map/wisnicz-1849.jpg',
  mapSize: [2397, 2270],
  houses: domy.map((d) => ({
    id: d.id,
    name: `Dom nr ${d['nr domu (porządkowy)']}`,
    position: [d.y, d.x],
    outline: d.outline,
    kind: d.typ,
  })),
  residents: mieszkancy.map((m) => ({
    id: m.id,
    firstName: m.imie,
    lastName: m.nazwisko,
    birthYear: 0,
    deathYear: null,
    occupation: m['stan społeczny'] || undefined,
    houseId: m.dom_id,
  })),
  relations: relacjeU.map((r) => ({
    id: r.id, type: 'sadowa', fromId: r.od_id, toId: r.do_id,
    label: `${r.opis}${r.rok ? ' (' + r.rok + ')' : ''}`,
  })),
}
await writeFile(
  '/projects/sandbox/public/dane/wisnicz.json',
  JSON.stringify(townData, null, 1),
)
console.log('\nZapisano:')
console.log('  public/dane/Wisnicz-domy-osoby-relacje.xlsx')
console.log('  public/dane/wisnicz.json')
