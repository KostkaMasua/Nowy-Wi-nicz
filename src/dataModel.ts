import type { House, Relation, Resident, TownData } from './types'

// Indeksy ułatwiające szybkie wyszukiwanie przy kilkuset domach
// i tysiącach relacji.
export class TownModel {
  readonly data: TownData
  private housesById = new Map<string, House>()
  private residentsById = new Map<string, Resident>()
  private residentsByHouse = new Map<string, Resident[]>()
  private relationsByResident = new Map<string, Relation[]>()

  constructor(data: TownData) {
    this.data = data
    for (const h of data.houses) {
      this.housesById.set(h.id, h)
      this.residentsByHouse.set(h.id, [])
    }
    for (const r of data.residents) {
      this.residentsById.set(r.id, r)
      this.residentsByHouse.get(r.houseId)?.push(r)
    }
    for (const rel of data.relations) {
      this.index(rel.fromId, rel)
      this.index(rel.toId, rel)
    }
  }

  private index(residentId: string, rel: Relation) {
    const list = this.relationsByResident.get(residentId)
    if (list) list.push(rel)
    else this.relationsByResident.set(residentId, [rel])
  }

  house(id: string): House | undefined {
    return this.housesById.get(id)
  }

  resident(id: string): Resident | undefined {
    return this.residentsById.get(id)
  }

  residentsOf(houseId: string): Resident[] {
    return this.residentsByHouse.get(houseId) ?? []
  }

  /** Relacje danej osoby wraz z "drugą stroną" relacji. */
  relationsOf(residentId: string): Array<{ relation: Relation; other: Resident }> {
    const list = this.relationsByResident.get(residentId) ?? []
    const out: Array<{ relation: Relation; other: Resident }> = []
    for (const relation of list) {
      const otherId = relation.fromId === residentId ? relation.toId : relation.fromId
      const other = this.residentsById.get(otherId)
      if (other) out.push({ relation, other })
    }
    return out
  }

  get houseCount() {
    return this.data.houses.length
  }
  get residentCount() {
    return this.data.residents.length
  }
  get relationCount() {
    return this.data.relations.length
  }
}
