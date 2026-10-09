import * as XLSX from 'xlsx'
import { readFile } from 'node:fs/promises'

const wb = XLSX.read(await readFile('/projects/sandbox/dane/winicz.xlsx'))
console.log('ARKUSZE:', wb.SheetNames.join(' | '))
console.log('='.repeat(70))

for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name]
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '', header: 1 })
  console.log(`\n### Arkusz "${name}" — ${rows.length} wierszy`)
  if (rows.length === 0) continue
  // Pokaż pierwsze 6 wierszy (nagłówek + próbki)
  const preview = rows.slice(0, 6)
  preview.forEach((r, i) => {
    const cells = r.map((c) => String(c).slice(0, 30))
    console.log(`  [${i}] ${JSON.stringify(cells)}`)
  })
  console.log(`  ... (łącznie ${rows.length} wierszy)`)
}
