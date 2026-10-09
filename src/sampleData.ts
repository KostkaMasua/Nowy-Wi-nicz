import type { House, Relation, RelationType, Resident, TownData } from './types'

// Generator realistycznego przykładowego zestawu danych:
// XIX-wieczne miasteczko. Deterministyczny (seedowany), więc demo
// wygląda tak samo przy każdym uruchomieniu.

const MAP_W = 1600
const MAP_H = 1200

// Prosty deterministyczny PRNG (mulberry32), by dane były powtarzalne.
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(18_49)
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]
const randInt = (min: number, max: number) =>
  Math.floor(rand() * (max - min + 1)) + min

const MALE_NAMES = [
  'Jan', 'Józef', 'Franciszek', 'Wojciech', 'Antoni', 'Stanisław', 'Kazimierz',
  'Ignacy', 'Tomasz', 'Michał', 'Andrzej', 'Wincenty', 'Marcin', 'Szymon', 'Feliks',
]
const FEMALE_NAMES = [
  'Marianna', 'Katarzyna', 'Agnieszka', 'Jadwiga', 'Rozalia', 'Franciszka',
  'Antonina', 'Zofia', 'Helena', 'Petronela', 'Apolonia', 'Salomea', 'Józefa', 'Tekla',
]
const SURNAMES = [
  'Kowalski', 'Nowak', 'Wiśniewski', 'Wójcik', 'Kowalczyk', 'Kamiński', 'Lewandowski',
  'Zieliński', 'Szymański', 'Woźniak', 'Dąbrowski', 'Kozłowski', 'Jankowski', 'Mazur',
  'Krawczyk', 'Piotrowski', 'Grabowski', 'Nowakowski', 'Pawłowski', 'Michalski',
]
const OCCUPATIONS = [
  'rolnik', 'kowal', 'piekarz', 'tkacz', 'szewc', 'stolarz', 'kupiec', 'młynarz',
  'rzeźnik', 'garncarz', 'organista', 'nauczyciel', 'felczer', 'karczmarz', 'krawiec',
  'bednarz', 'rymarz', 'zegarmistrz', 'aptekarz', 'woźnica',
]
const HOUSE_PREFIXES = [
  'Rynek', 'ul. Długa', 'ul. Kościelna', 'ul. Młyńska', 'ul. Zamkowa',
  'ul. Ogrodowa', 'ul. Krótka', 'Przedmieście', 'ul. Wodna', 'ul. Browarna',
]

function femininize(surname: string): string {
  if (surname.endsWith('ski')) return surname.slice(0, -1) + 'a'
  if (surname.endsWith('cki')) return surname.slice(0, -1) + 'a'
  return surname
}

const HOUSE_COUNT = 320
const AVG_RESIDENTS = 3.4

export function generateSampleData(): TownData {
  const houses: House[] = []
  const residents: Resident[] = []
  const relations: Relation[] = []

  // --- Domy rozmieszczone w kilku "dzielnicach" wokół centrum (rynku) ---
  const centerX = MAP_W / 2
  const centerY = MAP_H / 2
  for (let i = 0; i < HOUSE_COUNT; i++) {
    // Rozkład pierścieniowy: gęściej w centrum, rzadziej na przedmieściach.
    const angle = rand() * Math.PI * 2
    const radius = Math.pow(rand(), 0.6) * (Math.min(MAP_W, MAP_H) / 2 - 80)
    const x = Math.round(centerX + Math.cos(angle) * radius + (rand() - 0.5) * 40)
    const y = Math.round(centerY + Math.sin(angle) * radius * 0.78 + (rand() - 0.5) * 40)
    houses.push({
      id: `h${i + 1}`,
      name: `${pick(HOUSE_PREFIXES)} ${randInt(1, 48)}`,
      position: [
        Math.max(30, Math.min(MAP_H - 30, y)),
        Math.max(30, Math.min(MAP_W - 30, x)),
      ],
    })
  }

  // --- Mieszkańcy: rodziny osadzone w domach ---
  let rid = 0
  for (const house of houses) {
    const count = Math.max(1, Math.round(AVG_RESIDENTS + (rand() - 0.5) * 4))
    const familySurname = pick(SURNAMES)

    // Głowa rodziny
    const fatherBirth = randInt(1790, 1850)
    const father = makeResident(++rid, 'm', familySurname, fatherBirth, house.id)
    residents.push(father)

    // Małżonka
    const mother = makeResident(++rid, 'f', familySurname, randInt(fatherBirth - 3, fatherBirth + 6), house.id)
    residents.push(mother)
    relations.push(rel(father, mother, 'rodzinna', 'małżonkowie'))

    // Dzieci
    const childCount = Math.max(0, count - 2)
    for (let c = 0; c < childCount; c++) {
      const sex = rand() < 0.5 ? 'm' : 'f'
      const childBirth = randInt(fatherBirth + 22, fatherBirth + 40)
      const child = makeResident(++rid, sex, familySurname, childBirth, house.id)
      residents.push(child)
      relations.push(rel(father, child, 'rodzinna', sex === 'm' ? 'syn' : 'córka'))
      relations.push(rel(mother, child, 'rodzinna', sex === 'm' ? 'syn' : 'córka'))
    }
  }

  // --- Relacje międzydomowe (zawodowe, przyjacielskie, sądowe) ---
  const adults = residents.filter((r) => yearsOld(r) >= 18)
  const extraTypes: RelationType[] = ['zawodowa', 'przyjacielska', 'sadowa']
  const labels: Record<string, string[]> = {
    zawodowa: ['wspólnik', 'czeladnik u majstra', 'dostawca', 'wierzyciel', 'najemca'],
    przyjacielska: ['przyjaciel', 'kum', 'świadek na ślubie', 'sąsiad i druh'],
    sadowa: ['spór o miedzę', 'proces o dług', 'skarga o zniesławienie', 'spór spadkowy'],
  }
  const extraCount = Math.round(adults.length * 0.5)
  for (let i = 0; i < extraCount; i++) {
    const a = pick(adults)
    const b = pick(adults)
    if (a.id === b.id || a.houseId === b.houseId) continue
    const type = pick(extraTypes)
    relations.push(rel(a, b, type, pick(labels[type])))
  }

  return {
    mapImage: '', // placeholder generowany proceduralnie; podmień na skan mapy
    mapSize: [MAP_W, MAP_H],
    houses,
    residents,
    relations,
  }
}

function makeResident(
  n: number,
  sex: 'm' | 'f',
  surname: string,
  birthYear: number,
  houseId: string,
): Resident {
  const firstName = sex === 'm' ? pick(MALE_NAMES) : pick(FEMALE_NAMES)
  const lastName = sex === 'm' ? surname : femininize(surname)
  // Czas życia: część osób "jeszcze żyje" w narracji (deathYear null).
  const age = randInt(28, 86)
  const death = birthYear + age
  const deathYear = death > 1899 ? null : death
  return {
    id: `r${n}`,
    firstName,
    lastName,
    birthYear,
    deathYear,
    occupation: pick(OCCUPATIONS),
    houseId,
  }
}

function yearsOld(r: Resident): number {
  return (r.deathYear ?? 1899) - r.birthYear
}

let relCounter = 0
function rel(a: Resident, b: Resident, type: RelationType, label: string): Relation {
  return { id: `rel${++relCounter}`, type, fromId: a.id, toId: b.id, label }
}
