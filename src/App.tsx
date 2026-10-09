import { useEffect, useMemo, useRef, useState } from 'react'
import { MapView } from './MapView'
import { SidePanel } from './SidePanel'
import { TownModel } from './dataModel'
import { generateSampleData } from './sampleData'
import { makePlaceholderMap } from './placeholderMap'
import { importExcelFile } from './importExcel'
import type { TownData } from './types'

/** Zamienia ścieżkę z danych na adres względny wobec miejsca publikacji (działa też w podkatalogu). */
function assetUrl(path: string): string {
  if (!path || /^(https?:|data:|blob:)/.test(path)) return path
  return import.meta.env.BASE_URL + path.replace(/^\/+/, '')
}

function useIsMobile(): boolean {
  const q = '(max-width: 768px)'
  const [m, setM] = useState(() => window.matchMedia(q).matches)
  useEffect(() => {
    const mq = window.matchMedia(q)
    const on = () => setM(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return m
}

export default function App() {
  const [town, setTown] = useState<TownData>(() => generateSampleData())
  const [selectedHouseId, setSelectedHouseId] = useState<string | null>(null)
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(null)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const isMobile = useIsMobile()
  const [sheetOpen, setSheetOpen] = useState(false)

  // Przy starcie wczytaj realne dane Wiśnicza (jeśli dostępne).
  useEffect(() => {
    fetch(assetUrl('dane/wisnicz.json'))
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: TownData) => {
        setTown(data)
        setImportMsg(
          `Wczytano Księgę radziecką Wiśnicza 1724–1736: ${data.houses.length} domów, ` +
            `${data.residents.length} osób, ${data.relations.length} relacji sądowych.`,
        )
      })
      .catch(() => {
        /* brak pliku — zostaje zestaw przykładowy */
      })
  }, [])

  // Model + obraz mapy. Jeśli dane nie podają skanu, generujemy placeholder.
  const model = useMemo(() => new TownModel(town), [town])
  const mapImage = useMemo(() => {
    if (town.mapImage) return assetUrl(town.mapImage)
    return makePlaceholderMap(town.mapSize[0], town.mapSize[1])
  }, [town])

  // Remount mapy po zmianie zestawu danych (nowy obraz/współrzędne).
  const mapKey = useMemo(() => `${town.residents.length}-${town.mapImage}`, [town])

  function selectHouse(houseId: string) {
    setSelectedHouseId(houseId)
    setSelectedResidentId(null)
    setSheetOpen(true)
  }

  function clearSelection() {
    setSelectedHouseId(null)
    setSelectedResidentId(null)
    setSheetOpen(false)
  }

  const selectedHouse = selectedHouseId ? model.house(selectedHouseId) : null
  const sheetTitle = selectedHouse
    ? `${selectedHouse.name} · ${model.residentsOf(selectedHouse.id).length} os.`
    : 'Dotknij budynek na mapie'
  // Ile pikseli od dołu zasłania panel (mapa uwzględnia to przy centrowaniu).
  const bottomInset = isMobile
    ? sheetOpen
      ? Math.round(window.innerHeight * 0.45)
      : 56
    : 0

  async function handleImport(file: File) {
    try {
      const { data, warnings } = await importExcelFile(file)
      // Zachowaj obraz mapy z poprzednich danych, jeśli nowy arkusz go nie ma.
      const merged: TownData = {
        ...data,
        mapImage: data.mapImage || town.mapImage,
        mapSize: town.mapSize,
      }
      setTown(merged)
      setSelectedHouseId(null)
      setSelectedResidentId(null)
      setImportMsg(
        `Wczytano: ${data.houses.length} domów, ${data.residents.length} mieszkańców, ` +
          `${data.relations.length} relacji.` +
          (warnings.length ? ` Ostrzeżenia: ${warnings.length}.` : ''),
      )
    } catch (err) {
      setImportMsg(`Błąd importu: ${(err as Error).message}`)
    }
  }

  function loadSample() {
    setTown(generateSampleData())
    setSelectedHouseId(null)
    setSelectedResidentId(null)
    setImportMsg(null)
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-title">
          <svg className="app-logo" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="12" cy="12" r="7" />
            <path d="M12 2v5M12 17v5M2 12h5M17 12h5" />
          </svg>
          <div>
            <h1>Mapa mieszkańców Wiśnicza</h1>
            <div className="app-sub">
              Księga radziecka 1724–1736 · mapa katastralna 1849 — narzędzie historyczne
            </div>
          </div>
        </div>
        <div className="app-stats">
          <span>{model.houseCount} domów</span>
          <span>{model.residentCount} mieszkańców</span>
          <span>{model.relationCount} relacji</span>
        </div>
        <div className="app-actions">
          <button className="btn" onClick={() => fileRef.current?.click()}>
            Wczytaj arkusz Excel
          </button>
          <button className="btn btn-ghost" onClick={loadSample}>
            Dane przykładowe
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleImport(f)
              e.target.value = ''
            }}
          />
        </div>
      </header>

      {importMsg && <div className="import-banner">{importMsg}</div>}

      <div className="app-body">
        <aside className={`app-side ${sheetOpen ? 'is-open' : 'is-peek'}`}>
          <button
            className="sheet-handle"
            onClick={() => setSheetOpen((o) => !o)}
            aria-expanded={sheetOpen}
          >
            <span className="sheet-grip" aria-hidden />
            <span className="sheet-title">{sheetTitle}</span>
            <span className="sheet-chevron" aria-hidden />
          </button>
          <div className="sheet-content">
          <SidePanel
            model={model}
            selectedHouseId={selectedHouseId}
            selectedResidentId={selectedResidentId}
            onSelectResident={setSelectedResidentId}
            onSelectHouse={selectHouse}
            onClear={clearSelection}
          />
          </div>
        </aside>
        <main className="app-map">
          <MapView
            key={mapKey}
            model={model}
            mapImage={mapImage}
            selectedHouseId={selectedHouseId}
            selectedResidentId={selectedResidentId}
            onSelectHouse={selectHouse}
            onClear={clearSelection}
            bottomInset={bottomInset}
          />
        </main>
      </div>
    </div>
  )
}
