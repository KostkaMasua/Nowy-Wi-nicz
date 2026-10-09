// Model danych aplikacji "Mapa mieszkańców"
// Projekt historyczny: miasto z XIX wieku.

/** Typy relacji między mieszkańcami. */
export type RelationType = 'rodzinna' | 'zawodowa' | 'przyjacielska' | 'sadowa'

/** Dom/posesja oznaczony na mapie. */
export interface House {
  id: string
  /** Nazwa/adres historyczny, np. "Rynek 4" lub "Dom pod Jeleniem". */
  name: string
  /** Współrzędne w układzie obrazu mapy (CRS.Simple): [y, x] w pikselach. */
  position: [number, number]
  /** Kontur budynku (polygon) w [y, x] — do rysowania kształtu zabudowania. */
  outline?: Array<[number, number]>
  /** Rodzaj zabudowy wg mapy katastralnej: 'drewniany' | 'murowany'. */
  kind?: string
}

/** Mieszkaniec miasta. */
export interface Resident {
  id: string
  firstName: string
  lastName: string
  /** Rok urodzenia. */
  birthYear: number
  /** Rok śmierci; null = osoba (w ramach narracji projektu) jeszcze żyje. */
  deathYear: number | null
  /** Zawód / status — kontekst historyczny. */
  occupation?: string
  /** Id domu, który dana osoba zamieszkuje. */
  houseId: string
}

/** Relacja pomiędzy dwiema osobami. */
export interface Relation {
  id: string
  type: RelationType
  /** Id pierwszej osoby. */
  fromId: string
  /** Id drugiej osoby. */
  toId: string
  /** Opcjonalny opis, np. "ojciec", "wspólnik", "spór o miedzę". */
  label?: string
}

/** Komplet danych wczytywanych do aplikacji. */
export interface TownData {
  /** Adres URL / ścieżka do obrazu historycznej mapy. */
  mapImage: string
  /** Rozmiar obrazu mapy w pikselach [szerokość, wysokość]. */
  mapSize: [number, number]
  houses: House[]
  residents: Resident[]
  relations: Relation[]
}

/** Konfiguracja wizualna dla każdego typu relacji. */
export interface RelationStyle {
  label: string
  color: string
  /** Wzór kreskowania SVG dla linii Leaflet (dashArray). */
  dashArray?: string
}

export const RELATION_STYLES: Record<RelationType, RelationStyle> = {
  rodzinna: { label: 'Rodzinna', color: '#c0392b' },
  zawodowa: { label: 'Zawodowa', color: '#2471a3', dashArray: '8 6' },
  przyjacielska: { label: 'Przyjacielska', color: '#1e8449', dashArray: '2 7' },
  sadowa: { label: 'Sądowa', color: '#7d3c98', dashArray: '12 6 3 6' },
}

/** Pomocniczo: tekstowy zapis lat życia, np. "1812–1879" albo "1850–". */
export function lifespan(r: Resident): string {
  return `${r.birthYear}\u2013${r.deathYear ?? ''}`
}
