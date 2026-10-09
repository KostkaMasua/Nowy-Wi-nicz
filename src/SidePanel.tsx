import type { TownModel } from './dataModel'
import { lifespan, RELATION_STYLES } from './types'

interface Props {
  model: TownModel
  selectedHouseId: string | null
  selectedResidentId: string | null
  onSelectResident: (residentId: string | null) => void
  onSelectHouse: (houseId: string) => void
  onClear: () => void
}

export function SidePanel({
  model,
  selectedHouseId,
  selectedResidentId,
  onSelectResident,
  onSelectHouse,
  onClear,
}: Props) {
  if (!selectedHouseId) {
    return (
      <div className="panel-empty">
        <h2>Mapa mieszkańców</h2>
        <p>
          Kliknij budynek na mapie (żółty — drewniany, różowy — murowany),
          aby zobaczyć listę jego mieszkańców; pozostałe budynki zostaną
          ukryte. Następnie kliknij mieszkańca, aby zobaczyć jego relacje —
          zostaną narysowane liniami do domów powiązanych osób.
        </p>
        <RelationLegend />
      </div>
    )
  }

  const house = model.house(selectedHouseId)
  const residents = model.residentsOf(selectedHouseId)
  const selected = selectedResidentId ? model.resident(selectedResidentId) : null
  const relations = selectedResidentId ? model.relationsOf(selectedResidentId) : []

  return (
    <div className="panel">
      <button className="back-btn" onClick={onClear}>
        <span className="back-arrow" aria-hidden />
        Wszystkie domy
      </button>
      <div className="panel-section">
        <div className="panel-eyebrow">Dom</div>
        <h2>{house?.name ?? 'Nieznany dom'}</h2>
        <div className="panel-meta">
          {residents.length} {pluralMieszkancy(residents.length)}
        </div>
      </div>

      <div className="panel-section">
        <h3>Mieszkańcy</h3>
        <ul className="resident-list">
          {residents.map((r) => {
            const active = r.id === selectedResidentId
            return (
              <li key={r.id}>
                <button
                  className={`resident-item${active ? ' active' : ''}`}
                  onClick={() => onSelectResident(active ? null : r.id)}
                >
                  <span className="resident-name">
                    {r.firstName} {r.lastName}
                  </span>
                  <span className="resident-years">{lifespan(r)}</span>
                  {r.occupation && (
                    <span className="resident-occ">{r.occupation}</span>
                  )}
                </button>
              </li>
            )
          })}
          {residents.length === 0 && <li className="muted">Brak danych o mieszkańcach.</li>}
        </ul>
      </div>

      {selected && (
        <div className="panel-section">
          <h3>
            Relacje: {selected.firstName} {selected.lastName}
          </h3>
          {relations.length === 0 && (
            <p className="muted">Brak zapisanych relacji dla tej osoby.</p>
          )}
          <ul className="relation-list">
            {relations.map(({ relation, other }) => {
              const style = RELATION_STYLES[relation.type]
              const otherHouse = model.house(other.houseId)
              return (
                <li key={relation.id} className="relation-item">
                  <span
                    className="relation-swatch"
                    style={{ background: style.color }}
                    aria-hidden
                  />
                  <div className="relation-body">
                    <button
                      className="relation-person"
                      onClick={() => {
                        onSelectHouse(other.houseId)
                        onSelectResident(other.id)
                      }}
                    >
                      {other.firstName} {other.lastName}
                    </button>
                    <div className="relation-meta">
                      <span className="relation-type" style={{ color: style.color }}>
                        {style.label}
                      </span>
                      {relation.label && <span> · {relation.label}</span>}
                      {otherHouse && <span className="muted"> · {otherHouse.name}</span>}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
          <RelationLegend />
        </div>
      )}
    </div>
  )
}

function RelationLegend() {
  return (
    <div className="legend">
      <div className="legend-title">Typy relacji</div>
      {Object.values(RELATION_STYLES).map((s) => (
        <div className="legend-row" key={s.label}>
          <span
            className="legend-line"
            style={{
              borderTopColor: s.color,
              borderTopStyle: s.dashArray ? 'dashed' : 'solid',
            }}
          />
          <span>{s.label}</span>
        </div>
      ))}
    </div>
  )
}

function pluralMieszkancy(n: number): string {
  if (n === 1) return 'mieszkaniec'
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return 'mieszkańców'
  return 'mieszkańców'
}
