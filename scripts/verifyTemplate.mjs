// Weryfikuje szablon tą samą logiką, co aplikacja (parseWorkbook).
import * as XLSX from 'xlsx'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const file = join(__dirname, '..', 'public', 'szablon-mieszkancy.xlsx')

const wb = XLSX.read(await (await import('node:fs/promises')).readFile(file))
const names = wb.SheetNames
console.log('Arkusze:', names.join(', '))

const rows = (n) => XLSX.utils.sheet_to_json(wb.Sheets[n], { defval: '' })
const domy = rows('Domy')
const mieszkancy = rows('Mieszkancy')
const relacje = rows('Relacje')

console.log('Domy:', domy.length, '| kolumny:', Object.keys(domy[0]).join(', '))
console.log('Mieszkancy:', mieszkancy.length, '| kolumny:', Object.keys(mieszkancy[0]).join(', '))
console.log('Relacje:', relacje.length, '| kolumny:', Object.keys(relacje[0]).join(', '))

// Spójność referencji
const houseIds = new Set(domy.map((d) => String(d.id)))
const residentIds = new Set(mieszkancy.map((m) => String(m.id)))
const types = new Set(['rodzinna', 'zawodowa', 'przyjacielska', 'sadowa'])

let errors = 0
for (const m of mieszkancy)
  if (!houseIds.has(String(m.dom_id))) { console.log('  BŁĄD: mieszkaniec', m.id, 'wskazuje nieznany dom', m.dom_id); errors++ }
for (const r of relacje) {
  if (!residentIds.has(String(r.od_id))) { console.log('  BŁĄD: relacja', r.id, 'nieznane od_id', r.od_id); errors++ }
  if (!residentIds.has(String(r.do_id))) { console.log('  BŁĄD: relacja', r.id, 'nieznane do_id', r.do_id); errors++ }
  if (!types.has(String(r.typ))) { console.log('  BŁĄD: relacja', r.id, 'nieznany typ', r.typ); errors++ }
}

// Sprawdź, czy wszystkie 4 typy relacji są obecne w przykładzie
const usedTypes = new Set(relacje.map((r) => r.typ))
console.log('Typy relacji w przykładzie:', [...usedTypes].join(', '))

// rok_sm pusty = żyje
const zyjacy = mieszkancy.filter((m) => String(m.rok_sm) === '').length
console.log('Osoby bez roku śmierci (żyjące):', zyjacy)

console.log(errors === 0 ? '\n✅ Szablon spójny, gotowy do importu.' : `\n❌ Znaleziono ${errors} błędów.`)
