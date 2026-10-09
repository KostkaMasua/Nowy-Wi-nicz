import * as XLSX from 'xlsx'
import type { House, Relation, RelationType, Resident, TownData } from './types'

// Import danych z arkusza Excel.
//
// Oczekiwany układ (3 arkusze; nazwy rozpoznawane bez względu na wielkość liter):
//
//  Arkusz "Domy" (houses):
//    id | nazwa | x | y
//
//  Arkusz "Mieszkancy" (residents):
//    id | imie | nazwisko | rok_ur | rok_sm | zawod | dom_id
//    (rok_sm pusty = osoba żyje)
//
//  Arkusz "Relacje" (relations):
//    id | typ | od_id | do_id | opis
//    typ ∈ {rodzinna, zawodowa, przyjacielska, sadowa}
//
// Funkcja jest odporna na drobne różnice w nagłowkach (aliasy poniżej).

type Row = Record<string, unknown>

const str = (v: unknown): string => (v == null ? '' : String(v).trim())
const num = (v: unknown): number => {
  const n = Number(str(v).replace(',', '.'))
  return Number.isFinite(n) ? n : NaN
}
const numOrNull = (v: unknown): number | null => {
  const s = str(v)
  if (s === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/** Zwraca pierwszą kolumnę z pasującym (znormalizowanym) nagłówkiem. */
function field(row: Row, aliases: string[]): unknown {
  const keys = Object.keys(row)
  for (const alias of aliases) {
    const match = keys.find((k) => normalize(k) === normalize(alias))
    if (match != null) return row[match]
  }
  return undefined
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // usuń znaki diakrytyczne
    .replace(/[^a-z0-9]/g, '')
}

function sheetRows(wb: XLSX.WorkBook, names: string[]): Row[] {
  const sheetName = wb.SheetNames.find((n) =>
    names.some((want) => normalize(n) === normalize(want)),
  )
  if (!sheetName) return []
  return XLSX.utils.sheet_to_json<Row>(wb.Sheets[sheetName], { defval: '' })
}

const VALID_TYPES: RelationType[] = ['rodzinna', 'zawodowa', 'przyjacielska', 'sadowa']
function parseType(v: unknown): RelationType {
  const n = normalize(str(v))
  const found = VALID_TYPES.find((t) => normalize(t) === n)
  return found ?? 'przyjacielska'
}

export interface ImportResult {
  data: TownData
  warnings: string[]
}

export function parseWorkbook(
  wb: XLSX.WorkBook,
  opts: { mapImage?: string; mapSize?: [number, number] } = {},
): ImportResult {
  const warnings: string[] = []

  const houseRows = sheetRows(wb, ['Domy', 'houses', 'domy'])
  const residentRows = sheetRows(wb, ['Mieszkancy', 'Mieszkańcy', 'residents'])
  const relationRows = sheetRows(wb, ['Relacje', 'relations'])

  const houses: House[] = houseRows.map((row, i) => {
    const id = str(field(row, ['id'])) || `h${i + 1}`
    return {
      id,
      name: str(field(row, ['nazwa', 'name', 'adres'])) || id,
      position: [num(field(row, ['y'])) || 0, num(field(row, ['x'])) || 0],
    }
  })
  const houseIds = new Set(houses.map((h) => h.id))

  const residents: Resident[] = residentRows.map((row, i) => {
    const id = str(field(row, ['id'])) || `r${i + 1}`
    const houseId = str(field(row, ['dom_id', 'domid', 'houseid', 'dom']))
    if (houseId && !houseIds.has(houseId)) {
      warnings.push(`Mieszkaniec ${id}: nieznany dom "${houseId}".`)
    }
    return {
      id,
      firstName: str(field(row, ['imie', 'imię', 'firstname'])),
      lastName: str(field(row, ['nazwisko', 'lastname'])),
      birthYear: num(field(row, ['rok_ur', 'rokur', 'birthyear', 'urodzenie'])) || 0,
      deathYear: numOrNull(field(row, ['rok_sm', 'roksm', 'deathyear', 'smierc', 'śmierć'])),
      occupation: str(field(row, ['zawod', 'zawód', 'occupation'])) || undefined,
      houseId,
    }
  })
  const residentIds = new Set(residents.map((r) => r.id))

  const relations: Relation[] = relationRows
    .map((row, i): Relation | null => {
      const fromId = str(field(row, ['od_id', 'odid', 'fromid', 'od', 'osoba1']))
      const toId = str(field(row, ['do_id', 'doid', 'toid', 'do', 'osoba2']))
      if (!residentIds.has(fromId) || !residentIds.has(toId)) {
        warnings.push(`Relacja #${i + 1}: nieznana osoba (${fromId} → ${toId}).`)
        return null
      }
      return {
        id: str(field(row, ['id'])) || `rel${i + 1}`,
        type: parseType(field(row, ['typ', 'type', 'rodzaj'])),
        fromId,
        toId,
        label: str(field(row, ['opis', 'label', 'etykieta'])) || undefined,
      }
    })
    .filter((r): r is Relation => r !== null)

  return {
    data: {
      mapImage: opts.mapImage ?? '',
      mapSize: opts.mapSize ?? [1600, 1200],
      houses,
      residents,
      relations,
    },
    warnings,
  }
}

/** Wczytuje plik .xlsx wybrany przez użytkownika. */
export async function importExcelFile(file: File): Promise<ImportResult> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  return parseWorkbook(wb)
}
