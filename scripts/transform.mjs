import * as XLSX from 'xlsx'
import { readFile, writeFile } from 'node:fs/promises'
import { IMIONA, STAN, normalizeSurname } from './dictionaries.mjs'

const wb = XLSX.read(await readFile('/projects/sandbox/dane/winicz.xlsx'))
const rows = XLSX.utils.sheet_to_json(wb.Sheets['Arkusz1'], { defval: '' })

// Niemapowalne pierwsze człony, które NIE są imionami (role/instytucje) —
// zostawiamy bez zmian, nie zgłaszamy jako braki.
const NIE_IMIE = new Set([
  'małżonka', 'syn', 'córka', 'zięć', 'matka', 'ojciec', 'brat', 'siostra', 'wdowa',
  'cech', 'contubernium', 'magistrat', 'magstrat', 'magistratus', 'chłopiec', 'żydzi', 'żyd',
  'pan', 'pani', 'jwi', 'jw', 'jmp', 'jwp', 'wielmożny', 'ksiądz', 'urząd',
  '?', '-', 'kotca',
])

const nieznaneImiona = new Map()

// Spolszcz pojedynczy człon traktowany jako imię.
function mapImie(token) {
  const clean = token.replace(/[.,;]+$/, '')
  const key = clean.toLowerCase()
  if (IMIONA[key]) return IMIONA[key]
  return null
}

// Przetwórz pełny zapis osoby: "Imię Nazwisko" (czasem tylko nazwisko,
// czasem rola + nazwisko, np. "Małżonka Dziedzicowicza").
function transformPerson(raw) {
  const s = String(raw).trim()
  if (!s) return ''
  const tokens = s.split(/\s+/)
  const out = []
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]
    const low = tok.toLowerCase().replace(/[.,;]+$/, '')
    if (NIE_IMIE.has(low)) {
      out.push(tok) // rola/instytucja — bez zmian
      continue
    }
    if (i === 0) {
      // pierwszy człon: spróbuj jako imię
      const pol = mapImie(tok)
      if (pol) {
        out.push(pol)
      } else {
        // nie znaleziono w słowniku imion — to pewnie nazwisko lub nieznane imię
        // Heurystyka: jeśli wygląda łacińsko (końcówka -us/-i/-ae) i jednoczłonowe
        if (/(us|ii|ae|um)$/i.test(low) && tokens.length === 1) {
          nieznaneImiona.set(tok, (nieznaneImiona.get(tok) || 0) + 1)
        }
        out.push(normalizeSurname(tok))
      }
    } else {
      // kolejne człony: nazwisko -> normalizacja pisowni
      out.push(normalizeSurname(tok))
    }
  }
  return out.join(' ')
}

// Spolszcz stan społeczny (może zawierać kilka wartości po przecinku).
function transformStan(raw) {
  const s = String(raw).trim()
  if (!s) return ''
  return s
    .split(/\s*,\s*/)
    .map((part) => {
      const key = part.toLowerCase()
      return STAN[key] || part
    })
    .join(', ')
}

// Zbuduj nowy arkusz: oryginalne kolumny + spolszczone warianty + oryginały.
const OSOBY_KOL = ['Kto', 'Z kim', 'Osoby powiązane']
const outRows = rows.map((r) => {
  const o = { ...r }
  // usuń puste kolumny __EMPTY*
  for (const k of Object.keys(o)) if (/^__EMPTY/.test(k)) delete o[k]

  for (const col of OSOBY_KOL) {
    const orig = String(r[col] ?? '').trim()
    o[col] = transformPerson(orig) // nadpisz spolszczoną wersją
    o[`${col} (oryginał)`] = orig // zachowaj oryginał
  }
  const stanOrig = String(r['Stan społeczny'] ?? '').trim()
  o['Stan społeczny'] = transformStan(stanOrig)
  o['Stan społeczny (oryginał)'] = stanOrig
  return o
})

// Zapis
const outWb = XLSX.utils.book_new()
const outWs = XLSX.utils.json_to_sheet(outRows)
XLSX.utils.book_append_sheet(outWb, outWs, 'Winicz_ujednolicony')
await writeFile(
  '/projects/sandbox/public/dane/Ksiega-radziecka-Wisnicza-ujednolicona.xlsx',
  XLSX.write(outWb, { type: 'buffer', bookType: 'xlsx' }),
)

console.log('Przetworzono wierszy:', outRows.length)
console.log('Zapisano: public/dane/Ksiega-radziecka-Wisnicza-ujednolicona.xlsx')
if (nieznaneImiona.size) {
  console.log('\n⚠️  Niezmapowane możliwe imiona łacińskie (do weryfikacji):')
  ;[...nieznaneImiona.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([n, c]) => console.log(`   ${c}x ${n}`))
} else {
  console.log('\n✅ Wszystkie rozpoznane imiona łacińskie zmapowane.')
}

// Pokaż próbkę 20 przekształceń
console.log('\n=== Próbka przekształceń (Kto: oryginał -> polski) ===')
let shown = 0
for (const r of rows) {
  const orig = String(r.Kto).trim()
  if (!orig) continue
  const pol = transformPerson(orig)
  if (pol !== orig) {
    console.log(`   ${orig}  ->  ${pol}`)
    if (++shown >= 20) break
  }
}
