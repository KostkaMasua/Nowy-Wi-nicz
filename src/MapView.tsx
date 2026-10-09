import { useEffect, useRef } from 'react'
import L from 'leaflet'
import type { TownModel } from './dataModel'
import { RELATION_STYLES } from './types'

interface Props {
  model: TownModel
  mapImage: string
  /** Aktualnie wybrany dom. */
  selectedHouseId: string | null
  /** Aktualnie wybrany mieszkaniec (rysujemy jego relacje). */
  selectedResidentId: string | null
  onSelectHouse: (houseId: string) => void
  /** Kliknięcie w puste tło mapy — powrót do widoku wszystkich domów. */
  onClear?: () => void
  /** Ile pikseli od dołu zasłania panel (telefon) — używane przy centrowaniu. */
  bottomInset?: number
}

// Kolory zabudowy wg mapy katastralnej.
const KIND_STYLE = {
  murowany: { color: '#8e3b2e', fill: '#d9897b' },
  drewniany: { color: '#8a6d1f', fill: '#e8c062' },
  default: { color: '#5a3a1a', fill: '#b9770e' },
}
function kindStyle(kind?: string) {
  return KIND_STYLE[(kind as keyof typeof KIND_STYLE) ?? 'default'] || KIND_STYLE.default
}

export function MapView({
  model,
  mapImage,
  selectedHouseId,
  selectedResidentId,
  onSelectHouse,
  onClear,
  bottomInset = 0,
}: Props) {
  const insetRef = useRef(bottomInset)
  insetRef.current = bottomInset
  const onClearRef = useRef(onClear)
  onClearRef.current = onClear
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const [, hImg] = model.data.mapSize // [szer., wys.] obrazu

  // Konwersja piksel [y,x] -> Leaflet latlng. W CRS.Simple oś "lat" rośnie
  // W GÓRĘ, a piksele obrazu liczymy od GÓRY — dlatego lat = (wysokość - y).
  // Dzięki temu punkty i WIELOBOKI (kontury budynków) są spójne z podkładem.
  const toLatLng = (p: [number, number]): L.LatLngExpression => [hImg - p[0], p[1]]
  const toLatLngs = (pts: Array<[number, number]>): L.LatLngExpression[] =>
    pts.map(toLatLng)
  // Warstwa budynków (polygony) + klaster zastępczy przy dużym oddaleniu.
  const buildingsRef = useRef<Map<string, L.Polygon>>(new Map())
  const buildingLayerRef = useRef<L.LayerGroup | null>(null)
  const relationLayerRef = useRef<L.LayerGroup | null>(null)
  const highlightLayerRef = useRef<L.LayerGroup | null>(null)

  const [w, h] = model.data.mapSize

  // --- Inicjalizacja mapy (raz) ---
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const bounds: L.LatLngBoundsExpression = [
      [0, 0],
      [h, w],
    ]
    const map = L.map(containerRef.current, {
      crs: L.CRS.Simple,
      minZoom: -3,
      maxZoom: 4,
      zoomSnap: 0.25,
      attributionControl: false,
    })
    map.setMaxBounds(
      L.latLngBounds([
        [-h * 0.5, -w * 0.5],
        [h * 1.5, w * 1.5],
      ]),
    )

    L.imageOverlay(mapImage, bounds).addTo(map)

    const pts = model.data.houses.map((hh) => toLatLng(hh.position))
    if (pts.length > 0) {
      map.fitBounds(L.latLngBounds(pts as L.LatLngBoundsLiteral), { padding: [60, 60] })
    } else {
      map.fitBounds(bounds)
    }

    const buildingLayer = L.layerGroup().addTo(map)
    const relationLayer = L.layerGroup().addTo(map)
    const highlightLayer = L.layerGroup().addTo(map)
    buildingLayerRef.current = buildingLayer
    relationLayerRef.current = relationLayer
    highlightLayerRef.current = highlightLayer

    // Zbuduj polygon-przycisk dla każdego budynku.
    for (const house of model.data.houses) {
      const ks = kindStyle(house.kind)
      const latlngs =
        house.outline && house.outline.length >= 3
          ? toLatLngs(house.outline)
          : // fallback: kwadracik wokół centroidu
            toLatLngs(squareAround(house.position, 8))

      const poly = L.polygon(latlngs, {
        color: ks.color,
        weight: 1.5,
        fillColor: ks.fill,
        fillOpacity: 0.85,
        className: 'building-poly',
      })
      poly.bindTooltip(house.name, { direction: 'top', sticky: true })
      poly.on('click', (e) => {
        L.DomEvent.stopPropagation(e)
        onSelectHouse(house.id)
      })
      poly.on('mouseover', () => poly.setStyle({ weight: 3, fillOpacity: 1 }))
      poly.on('mouseout', () => poly.setStyle({ weight: 1.5, fillOpacity: 0.85 }))
      buildingsRef.current.set(house.id, poly)
      buildingLayer.addLayer(poly)
    }

    map.on('click', () => onClearRef.current?.())

    // Zmiana rozmiaru/obrót ekranu telefonu.
    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(containerRef.current)

    mapRef.current = map

    return () => {
      ro.disconnect()
      map.remove()
      mapRef.current = null
      buildingsRef.current.clear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- Widoczność budynków zależna od selekcji ---
  // Reguła: brak selekcji -> wszystkie widoczne.
  //         wybrany dom (bez osoby) -> tylko ten dom.
  //         wybrana osoba -> jej dom + domy osób powiązanych.
  useEffect(() => {
    const layer = buildingLayerRef.current
    if (!layer) return

    // Zbiór domów, które mają pozostać widoczne.
    let visible: Set<string> | null = null
    if (selectedResidentId) {
      const resident = model.resident(selectedResidentId)
      visible = new Set()
      if (resident) {
        visible.add(resident.houseId)
        for (const { other } of model.relationsOf(selectedResidentId)) {
          visible.add(other.houseId)
        }
      }
    } else if (selectedHouseId) {
      visible = new Set([selectedHouseId])
    }

    for (const [id, poly] of buildingsRef.current) {
      const show = visible === null || visible.has(id)
      const el = (poly as unknown as { _path?: SVGElement })._path
      if (el) {
        el.style.transition = 'opacity 0.25s'
        el.style.opacity = show ? '1' : '0'
        el.style.pointerEvents = show ? 'auto' : 'none'
      }
      // całkowite ukrycie po animacji (lekka optymalizacja hit-testu)
      if (!show) poly.setStyle({ fillOpacity: 0, opacity: 0 })
      else {
        const ks = kindStyle(model.house(id)?.kind)
        poly.setStyle({ fillOpacity: 0.85, opacity: 1, color: ks.color, fillColor: ks.fill })
      }
    }
  }, [selectedHouseId, selectedResidentId, model])

  // --- Podświetlenie wybranego domu (obrys akcentowy) ---
  useEffect(() => {
    const layer = highlightLayerRef.current
    if (!layer) return
    layer.clearLayers()
    if (!selectedHouseId) return
    const house = model.house(selectedHouseId)
    if (!house) return
    const latlngs =
      house.outline && house.outline.length >= 3
        ? toLatLngs(house.outline)
        : toLatLngs(squareAround(house.position, 10))
    L.polygon(latlngs, {
      color: '#c0392b',
      weight: 3,
      fillColor: '#e74c3c',
      fillOpacity: 0.3,
      interactive: false,
    }).addTo(layer)
  }, [selectedHouseId, model])

  // --- Rysowanie relacji wybranego mieszkańca ---
  useEffect(() => {
    const layer = relationLayerRef.current
    const map = mapRef.current
    if (!layer || !map) return
    layer.clearLayers()
    if (!selectedResidentId) return

    const resident = model.resident(selectedResidentId)
    if (!resident) return
    const home = model.house(resident.houseId)
    if (!home) return

    const relations = model.relationsOf(selectedResidentId)
    const homeLL = toLatLng(home.position)
    const touched: L.LatLngExpression[] = [homeLL]

    for (const { relation, other } of relations) {
      const otherHouse = model.house(other.houseId)
      if (!otherHouse) continue
      const style = RELATION_STYLES[relation.type]
      const otherLL = toLatLng(otherHouse.position)

      L.polyline([homeLL, otherLL], {
        color: style.color,
        weight: 2.5,
        opacity: 0.9,
        dashArray: style.dashArray,
        interactive: false,
      }).addTo(layer)

      // obrys domu po drugiej stronie w kolorze relacji
      const latlngs =
        otherHouse.outline && otherHouse.outline.length >= 3
          ? toLatLngs(otherHouse.outline)
          : toLatLngs(squareAround(otherHouse.position, 8))
      L.polygon(latlngs, {
        color: style.color,
        weight: 2,
        fillColor: style.color,
        fillOpacity: 0.4,
        interactive: false,
      })
        .bindTooltip(`${otherHouse.name} — ${other.firstName} ${other.lastName}`, {
          direction: 'top',
        })
        .addTo(layer)

      touched.push(otherLL)
    }

    if (touched.length > 1) {
      map.flyToBounds(L.latLngBounds(touched as L.LatLngBoundsLiteral), {
        paddingTopLeft: [40, 40],
        paddingBottomRight: [40, 40 + insetRef.current],
        maxZoom: 2,
        duration: 0.6,
      })
    }
  }, [selectedResidentId, model])

  return <div ref={containerRef} className="map-canvas" />
}

// Kwadrat wokół punktu [y,x] o danym półboku (w pikselach) — fallback,
// gdy brak konturu. Zwraca piksele; konwersję na latlng robi toLatLngs.
function squareAround(pos: [number, number], r: number): Array<[number, number]> {
  const [y, x] = pos
  return [
    [y - r, x - r],
    [y - r, x + r],
    [y + r, x + r],
    [y + r, x - r],
  ]
}
