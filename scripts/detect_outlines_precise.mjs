// Dokładne (wklęsłe) obrysy budynków.
// 1) maska kolorów budynków (jak w A1),
// 2) flood-fill -> spójne obszary (budynki),
// 3) Moore boundary tracing -> dokładny kontur brzegu,
// 4) Douglas–Peucker -> uproszczenie polilinii (mniej punktów, ten sam kształt).
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
function isPink(r, g, b) {
  return r > 170 && g < 160 && b > 90 && b < 190 && r - g > 40 && r - b > 25
}

const mask = new Uint8Array(W * H)
const pink = new Uint8Array(W * H)
for (let i = 0; i < W * H; i++) {
  const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2]
  if (isBuilding(r, g, b)) { mask[i] = 1; if (isPink(r, g, b)) pink[i] = 1 }
}

// --- Domknięcie morfologiczne (dylatacja+erozja) 1 px, by zasklepić dziury
//     od czerwonych cyfr/linii wewnątrz parcel i scalić drobne przerwy. ---
function dilate(src) {
  const out = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x
    if (src[i]) { out[i] = 1; continue }
    if ((x > 0 && src[i - 1]) || (x < W - 1 && src[i + 1]) ||
        (y > 0 && src[i - W]) || (y < H - 1 && src[i + W])) out[i] = 1
  }
  return out
}
function erode(src) {
  const out = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x
    if (!src[i]) continue
    const keep = !((x > 0 && !src[i - 1]) || (x < W - 1 && !src[i + 1]) ||
                   (y > 0 && !src[i - W]) || (y < H - 1 && !src[i + W]))
    out[i] = keep ? 1 : 0
  }
  return out
}
// Domknięcie 1 px (dylatacja+erozja) — zasklepia dziury po cyfrach,
// ale NIE scala sąsiednich budynków (to robiło agresywne 2 px).
let m = dilate(mask); m = erode(m)

// --- flood-fill: spójne obszary ---
const visited = new Uint8Array(W * H)
const stack = new Int32Array(W * H)
const blobs = []
for (let start = 0; start < W * H; start++) {
  if (!m[start] || visited[start]) continue
  let sp = 0; stack[sp++] = start; visited[start] = 1
  let count = 0, pk = 0, minx = W, maxx = 0, miny = H, maxy = 0, sx = 0, sy = 0
  const cells = []
  while (sp > 0) {
    const p = stack[--sp]; count++; cells.push(p)
    if (pink[p]) pk++
    const x = p % W, y = (p / W) | 0
    sx += x; sy += y
    if (x < minx) minx = x; if (x > maxx) maxx = x
    if (y < miny) miny = y; if (y > maxy) maxy = y
    const nb = [p - 1, p + 1, p - W, p + W]
    const xs = [x - 1, x + 1, x, x], ys = [y, y, y - 1, y + 1]
    for (let k = 0; k < 4; k++) {
      const np = nb[k], nx = xs[k], ny = ys[k]
      if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue
      if (m[np] && !visited[np]) { visited[np] = 1; stack[sp++] = np }
    }
  }
  if (count < 120 || count > 14000) continue
  const bw = maxx - minx + 1, bh = maxy - miny + 1
  if (bw > 320 || bh > 320) continue
  blobs.push({ cells, count, pk, minx, maxx, miny, maxy, cx: sx / count, cy: sy / count })
}

// --- Moore boundary tracing dla pojedynczego bloba ---
function traceBoundary(blob) {
  const { minx, maxx, miny, maxy } = blob
  const bw = maxx - minx + 3, bh = maxy - miny + 3 // margines 1 px
  const sub = new Uint8Array(bw * bh)
  for (const p of blob.cells) {
    const x = (p % W) - minx + 1, y = ((p / W) | 0) - miny + 1
    sub[y * bw + x] = 1
  }
  const at = (x, y) => (x < 0 || y < 0 || x >= bw || y >= bh ? 0 : sub[y * bw + x])
  // znajdź start: pierwszy zapełniony piksel (skan)
  let sx = -1, sy = -1
  for (let y = 0; y < bh && sy < 0; y++) for (let x = 0; x < bw; x++) {
    if (sub[y * bw + x]) { sx = x; sy = y; break }
  }
  if (sx < 0) return []
  // 8-kierunkowe sąsiedztwo (CW) zaczynając od lewej
  const dirs = [[-1,0],[-1,-1],[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1]]
  const contour = []
  let cx = sx, cy = sy, bdir = 6 // przyjdź "z dołu"
  const start = `${cx},${cy}`
  let guard = 0, maxGuard = bw * bh * 8
  do {
    contour.push([cx, cy])
    let found = false
    for (let k = 0; k < 8; k++) {
      const d = (bdir + 1 + k) % 8
      const nx = cx + dirs[d][0], ny = cy + dirs[d][1]
      if (at(nx, ny)) {
        cx = nx; cy = ny
        bdir = (d + 4) % 8 // kierunek powrotny
        found = true
        break
      }
    }
    if (!found) break
    if (++guard > maxGuard) break
  } while (!(cx === sx && cy === sy && contour.length > 2) && `${cx},${cy}` !== start || contour.length < 2)
  // mapuj z powrotem do układu wycinka
  return contour.map(([x, y]) => [x + minx - 1, y + miny - 1])
}

// --- Douglas–Peucker (uproszczenie polilinii) ---
function rdp(points, eps) {
  if (points.length < 3) return points
  let dmax = 0, idx = 0
  const [ax, ay] = points[0], [bx, by] = points[points.length - 1]
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i]
    const d = perp(px, py, ax, ay, bx, by)
    if (d > dmax) { dmax = d; idx = i }
  }
  if (dmax > eps) {
    const left = rdp(points.slice(0, idx + 1), eps)
    const right = rdp(points.slice(idx), eps)
    return left.slice(0, -1).concat(right)
  }
  return [points[0], points[points.length - 1]]
}
function perp(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay
  const len = Math.hypot(dx, dy) || 1
  return Math.abs((px - ax) * dy - (py - ay) * dx) / len
}

const s = meta.scaleToBase
const toBase = (px, py) => [
  Math.round((meta.offsetX6 + px) * s),
  Math.round((meta.offsetY6 + py) * s),
]

// scal po centroidzie
blobs.sort((a, b) => b.count - a.count)
const picked = []
for (const bl of blobs) {
  if (picked.some((p) => Math.hypot(p.cx - bl.cx, p.cy - bl.cy) < 14)) continue
  picked.push(bl)
}

const buildings = []
let nr = 0
for (const bl of picked) {
  const raw = traceBoundary(bl)
  if (raw.length < 4) continue
  const simplified = rdp(raw, 2.2) // eps w px wycinka (~0.55 px podkładu)
  if (simplified.length < 3) continue
  const outline = simplified.map(([x, y]) => {
    const [bx, by] = toBase(x, y)
    return [by, bx] // [y,x] dla Leaflet
  })
  const [cxB, cyB] = toBase(bl.cx, bl.cy)
  buildings.push({
    nr: ++nr,
    type: bl.pk / bl.count > 0.35 ? 'murowany' : 'drewniany',
    position: [cyB, cxB],
    outline,
  })
}

await writeFile('/projects/sandbox/dane/buildings_outline.json', JSON.stringify(buildings))
const avg = (buildings.reduce((a, b) => a + b.outline.length, 0) / buildings.length).toFixed(1)
console.log(`Budynki z DOKŁADNYM konturem: ${buildings.length}`)
console.log(`  murowane: ${buildings.filter((b) => b.type === 'murowany').length}`)
console.log(`  drewniane: ${buildings.filter((b) => b.type === 'drewniany').length}`)
console.log(`  śr. wierzchołków po uproszczeniu: ${avg}`)

// podgląd kontroli
ctx.lineWidth = 2
for (const b of buildings) {
  ctx.strokeStyle = b.type === 'murowany' ? '#c0392b' : '#1a6ec0'
  ctx.beginPath()
  // narysuj w układzie wycinka: odwróć skalowanie
  b.outline.forEach(([y, x], i) => {
    const px = x / s - meta.offsetX6
    const py = y / s - meta.offsetY6
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
  })
  ctx.closePath(); ctx.stroke()
}
await writeFile('/projects/sandbox/dane/outlines-overlay.png', c.toBuffer('image/png'))
console.log('Zapisano dane/buildings_outline.json + podgląd dane/outlines-overlay.png')
