// Rozszerza detekcję A1: dla każdego budynku wyznacza KONTUR (polygon),
// a nie tylko centroid. Kontur = otoczka obrysu spójnego obszaru koloru.
import { readFile, writeFile } from 'node:fs/promises'
import { createCanvas, loadImage } from 'canvas'

const img = await loadImage('/projects/sandbox/dane/center-hires.png')
const meta = JSON.parse(await readFile('/projects/sandbox/dane/center-meta.json', 'utf8'))
const W = img.width, H = img.height
const c = createCanvas(W, H)
const ctx = c.getContext('2d')
ctx.drawImage(img, 0, 0)
const { data } = ctx.getImageData(0, 0, W, H)

function isBuilding(r, g, b) {
  const yellow = r > 170 && g > 150 && b < 140 && Math.abs(r - g) < 60 && r - b > 50
  const pink = r > 170 && g < 160 && b > 90 && b < 190 && r - g > 40 && r - b > 25
  return yellow || pink
}
// Typ budynku (do kolorowania): żółty=drewniany, różowy=murowany
function buildingType(r, g, b) {
  const pink = r > 170 && g < 160 && b > 90 && b < 190 && r - g > 40 && r - b > 25
  return pink ? 'murowany' : 'drewniany'
}

const mask = new Uint8Array(W * H)
const typ = new Uint8Array(W * H) // 1=murowany, 0=drewniany
for (let i = 0; i < W * H; i++) {
  const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2]
  if (isBuilding(r, g, b)) { mask[i] = 1; typ[i] = buildingType(r, g, b) === 'murowany' ? 1 : 0 }
}

// --- flood-fill + zebranie pikseli obwodu dla każdego bloba ---
const visited = new Uint8Array(W * H)
const stack = new Int32Array(W * H)
const blobs = []
for (let start = 0; start < W * H; start++) {
  if (!mask[start] || visited[start]) continue
  let sp = 0; stack[sp++] = start; visited[start] = 1
  const pix = []
  let murCount = 0
  while (sp > 0) {
    const p = stack[--sp]
    pix.push(p)
    if (typ[p]) murCount++
    const x = p % W, y = (p / W) | 0
    const nb = [p - 1, p + 1, p - W, p + W]
    const xs = [x - 1, x + 1, x, x], ys = [y, y, y - 1, y + 1]
    for (let k = 0; k < 4; k++) {
      const np = nb[k], nx = xs[k], ny = ys[k]
      if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue
      if (mask[np] && !visited[np]) { visited[np] = 1; stack[sp++] = np }
    }
  }
  if (pix.length < 120 || pix.length > 12000) continue
  blobs.push({ pix, mur: murCount / pix.length })
}

// Dla bloba policz kontur jako otoczkę wypukłą (convex hull) jego pikseli
// — prosty, stabilny kształt "przycisku" dobrze oddający bryłę budynku.
function convexHull(points) {
  const pts = points.slice().sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
  if (pts.length < 3) return pts
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower = []
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop()
    lower.push(p)
  }
  const upper = []
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop()
    upper.push(p)
  }
  upper.pop(); lower.pop()
  return lower.concat(upper)
}

// Przelicz piksel wycinka -> piksel podkładu aplikacji (z4).
const s = meta.scaleToBase
const toBase = (px, py) => [
  Math.round((meta.offsetX6 + px) * s),
  Math.round((meta.offsetY6 + py) * s),
]

// Zbierz tylko piksele brzegowe (dla hull wystarczą skrajne) — ale hull i tak
// działa na całości; by było szybciej, próbkujemy co n-ty piksel.
let merged = []
for (const bl of blobs) {
  const sample = bl.pix.length > 1500 ? bl.pix.filter((_, i) => i % 3 === 0) : bl.pix
  const pts = sample.map((p) => [p % W, (p / W) | 0])
  const hull = convexHull(pts)
  if (hull.length < 3) continue
  // centroid
  let sx = 0, sy = 0
  for (const [x, y] of hull) { sx += x; sy += y }
  const cx = sx / hull.length, cy = sy / hull.length
  merged.push({
    cx, cy, mur: bl.mur,
    hull: hull.map(([x, y]) => toBase(x, y)),
    centroidBase: toBase(cx, cy),
  })
}

// Scal budynki o bardzo bliskich centroidach (<14 px wycinka)
merged.sort((a, b) => b.hull.length - a.hull.length)
const final = []
for (const b of merged) {
  if (final.some((m) => Math.hypot(m.cx - b.cx, m.cy - b.cy) < 14)) continue
  final.push(b)
}

const buildings = final.map((b, i) => ({
  nr: i + 1,
  type: b.mur > 0.4 ? 'murowany' : 'drewniany',
  position: [b.centroidBase[1], b.centroidBase[0]], // [y,x] dla Leaflet
  // polygon w [y,x] (Leaflet lat/lng = y/x w CRS.Simple)
  outline: b.hull.map(([x, y]) => [y, x]),
}))

await writeFile('/projects/sandbox/dane/buildings_outline.json', JSON.stringify(buildings))
console.log(`Budynki z konturem: ${buildings.length}`)
console.log(`  murowane: ${buildings.filter((b) => b.type === 'murowany').length}`)
console.log(`  drewniane: ${buildings.filter((b) => b.type === 'drewniany').length}`)
const avgPts = (buildings.reduce((s2, b) => s2 + b.outline.length, 0) / buildings.length).toFixed(1)
console.log(`  śr. wierzchołków konturu: ${avgPts}`)
