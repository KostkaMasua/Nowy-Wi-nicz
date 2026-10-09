import * as XLSX from 'xlsx'
import { readFile, writeFile } from 'node:fs/promises'

const wb = XLSX.read(await readFile('/projects/sandbox/dane/winicz.xlsx'))
const rows = XLSX.utils.sheet_to_json(wb.Sheets['Arkusz1'], { defval: '' })

// Zbierz wszystkie wystąpienia osób z kolumn Kto, Z kim, Osoby powiązane
const bag = new Map()
const add = (v) => {
  const s = String(v).trim()
  if (s) bag.set(s, (bag.get(s) || 0) + 1)
}
for (const r of rows) {
  add(r.Kto)
  add(r['Z kim'])
  add(r['Osoby powiązane'])
}
const sorted = [...bag.entries()].sort((a, b) => b[1] - a[1])
console.log('Unikalnych zapisów osób:', sorted.length)

// Wyodrębnij unikalne pierwsze człony (potencjalne imiona) do budowy słownika
const firstTokens = new Map()
for (const [name] of sorted) {
  const tok = name.split(/\s+/)[0]
  firstTokens.set(tok, (firstTokens.get(tok) || 0) + 1)
}
const toks = [...firstTokens.entries()].sort((a, b) => b[1] - a[1])

await writeFile(
  '/projects/sandbox/dane/_persons.txt',
  sorted.map(([n, c]) => `${c}\t${n}`).join('\n'),
)
await writeFile(
  '/projects/sandbox/dane/_firsttokens.txt',
  toks.map(([n, c]) => `${c}\t${n}`).join('\n'),
)
console.log('Zapisano dane/_persons.txt oraz dane/_firsttokens.txt')
console.log('\nTop 60 pierwszych członów (imiona/tytuły):')
toks.slice(0, 60).forEach(([t, c]) => console.log(`  ${c}x ${t}`))
