// Wykrywa budynki na wycinku mapy katastralnej przez kolor:
//  - żółty  = budynki drewniane
//  - różowy/karminowy = budynki murowane
// Grupuje piksele w spójne obszary (budynki) i liczy ich centroidy.
import { readFile, writeFile } from 'node:fs/promises'
import { createCanvas, loadImage } from 'canvas'

const img = await loadImage('/projects/sandbox/dane/center-hires.png')
const meta = JSON.parse(await readFile('/projects/sandbox/dane/center-meta.json', 'utf8'))
const W = img.width, H = img.height
const c = createCanvas(W, H)
const ctx = c.getContext('2d')
ctx.drawImage(img, 0, 0)
const { data } = ctx.getImageData(0, 0, W, H)

// Klasyfikacja piksela jako "budynek".
function isBuilding(r, g, b) {
  // Żółty: wysokie R i G, niskie B, R≈G
  const yellow = r > 170 && g > 150 && b < 140 && Math.abs(r - g) < 60 && r - b > 50
  // Różowy/karmin: R wyraźnie > G,B; nie czysta czerwień linii (te są cienkie)
  const pink = r > 170 && g < 160 && b > 90 && b < 190 && r - g > 40 && r - b > 25
  return yellow || pink
}

// Maska budynków
const mask = new Uint8Array(W * H)
for (let i = 0; i < W * H; i++) {
  const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2]
  if (isBuilding(r, g, b)) mask[i] = 1
}

// Flood-fill (BFS) spójnych obszarów. Budynek = blob o rozsądnym rozmiarze.
const visited = new Uint8Array(W * H)
const blobs = []
const stack = new Int32Array(W * H)
for (let start = 0; start < W * H; start++) {
  if (!mask[start] || visited[start]) continue
  let sp = 0
  stack[sp++] = start
  visited[start] = 1
  let count = 0, sx = 0, sy = 0
  let minx = W, maxx = 0, miny = H, maxy = 0
  while (sp > 0) {
    const p = stack[--sp]
    const x = p % W, y = (p / W) | 0
    count++; sx += x; sy += y
    if (x < minx) minx = x; if (x > maxx) maxx = x
    if (y < miny) miny = y; if (y > maxy) maxy = y
    // 4-sąsiedztwo
    const nb = [p - 1, p + 1, p - W, p + W]
    const xs = [x - 1, x + 1, x, x]
    const ys = [y, y, y - 1, y + 1]
    for (let k = 0; k < 4; k++) {
      const np = nb[k], nx = xs[k], ny = ys[k]
      if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue
      if (mask[np] && !visited[np]) { visited[np] = 1; stack[sp++] = np }
    }
  }
  const bw = maxx - minx + 1, bh = maxy - miny + 1
  // Filtr: budynek ma od ~120 do ~8000 px i sensowne proporcje
  if (count >= 120 && count <= 12000 && bw < 300 && bh < 300) {
    blobs.push({ cx: sx / count, cy: sy / count, area: count, bw, bh })
  }
}

// Scal budynki leżące bardzo blisko siebie (centroidy < 14 px) — redukcja szumu.
blobs.sort((a, b) => b.area - a.area)
const merged = []
for (const bl of blobs) {
  const near = merged.find((m) => Math.hypot(m.cx - bl.cx, m.cy - bl.cy) < 14)
  if (near) continue
  merged.push(bl)
}

// Przelicz pozycje z układu wycinka (hi-res z6) do układu podkładu aplikacji (z4, 2397x2270).
// Piksel wycinka -> piksel z6 -> piksel z4.
const z6ToBase = meta.scaleToBase // ~0.25
function toBase(px, py) {
  const x6 = meta.offsetX6 + px
  const y6 = meta.offsetY6 + py
  return [Math.round(x6 * z6ToBase), Math.round(y6 * z6ToBase)]
}

const buildings = merged.map((b, i) => {
  const [bx, by] = toBase(b.cx, b.cy)
  return { nr: i + 1, xBase: bx, yBase: by, area: b.area, cxHires: Math.round(b.cx), cyHires: Math.round(b.cy) }
})

await writeFile('/projects/sandbox/dane/buildings.json', JSON.stringify(buildings, null, 1))
console.log(`Wykryto budynków: ${buildings.length}`)
console.log(`(z ${blobs.length} surowych blobów po scaleniu)`)

// Rysunek kontrolny: zaznacz wykryte budynki na wycinku
ctx.lineWidth = 3
ctx.strokeStyle = '#0040ff'
ctx.fillStyle = 'rgba(0,80,255,0.25)'
for (const b of merged) {
  ctx.beginPath(); ctx.arc(b.cx, b.cy, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
}
await writeFile('/projects/sandbox/dane/buildings-overlay.png', c.toBuffer('image/png'))
console.log('Zapisano dane/buildings.json oraz podgląd dane/buildings-overlay.png')
