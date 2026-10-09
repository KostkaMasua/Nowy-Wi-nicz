import * as XLSX from 'xlsx'
import { readFile } from 'node:fs/promises'

const wb = XLSX.read(await readFile('/projects/sandbox/dane/winicz.xlsx'))
const rows = XLSX.utils.sheet_to_json(wb.Sheets['Arkusz1'], { defval: '' })

console.log('Liczba wierszy danych:', rows.length)
console.log('Kolumny:', Object.keys(rows[0]).join(' | '))
console.log('='.repeat(70))

// Ile rekordów ma wypełnione ID (= liczba spraw)
const withId = rows.filter((r) => String(r.ID).trim() !== '')
console.log('\nWiersze z ID (sprawy):', withId.length)
console.log('Wiersze bez ID (kontynuacje):', rows.length - withId.length)

// Zakres lat
const lata = withId.map((r) => +r.Rok).filter((n) => n > 0)
console.log('Zakres lat:', Math.min(...lata), '-', Math.max(...lata))

const uniq = (key, n = 40) => {
  const vals = new Map()
  for (const r of rows) {
    const v = String(r[key]).trim()
    if (v) vals.set(v, (vals.get(v) || 0) + 1)
  }
  const sorted = [...vals.entries()].sort((a, b) => b[1] - a[1])
  console.log(`\n### "${key}" — ${vals.size} unikalnych. Top ${n}:`)
  sorted.slice(0, n).forEach(([v, c]) => console.log(`   ${c}x  ${v}`))
}

uniq('Stan społeczny', 25)
uniq('Charakter wpisu', 25)
uniq('Temat sprawy', 30)

// Przykładowe pełne osoby (Kto, Z kim)
console.log('\n### Przykładowe "Kto" (pierwsze 25 niepustych):')
rows.map((r) => String(r.Kto).trim()).filter(Boolean).slice(0, 25).forEach((v) => console.log('   ', v))

console.log('\n### Przykładowe "Osoby powiązane" (pierwsze 25 niepustych):')
rows.map((r) => String(r['Osoby powiązane']).trim()).filter(Boolean).slice(0, 25).forEach((v) => console.log('   ', v))
