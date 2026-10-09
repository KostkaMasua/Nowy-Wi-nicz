// Pobiera fragment centrum miasta w pełnej rozdzielczości (zoom 6)
// do wykrywania budynków. Centrum na podkładzie z4 było ~x:1250..1700,
// y:760..1250 (w skali 2397x2270). W skali z6 (9588x9079) mnożymy ×4.
import { writeFile, mkdir } from 'node:fs/promises'
import { createCanvas, loadImage } from 'canvas'

const BASE = 'https://maps.geshergalicia.org/cadastral/wisnicz-nowy-1849'
const Z = 6
const TILE = 256

// Pełny obraz z6: 9588 x 9079. Siatka kafelków: ceil(9588/256)=38 x ceil(9079/256)=36.
const FULL_W = 9588
const FULL_H = 9079
const ROWS = Math.ceil(FULL_H / TILE) // 36

// Obszar centrum w pikselach z6 — przesunięty na główny blok zabudowy
// (prawy-dolny obszar: zwarta zabudowa miejska). x 5900..7900, y 3600..5600
const X0 = 5900, X1 = 7900, Y0 = 3600, Y1 = 5600
const cx0 = Math.floor(X0 / TILE), cx1 = Math.ceil(X1 / TILE)
const ry0 = Math.floor(Y0 / TILE), ry1 = Math.ceil(Y1 / TILE)

const outW = (cx1 - cx0) * TILE
const outH = (ry1 - ry0) * TILE
const canvas = createCanvas(outW, outH)
const ctx = canvas.getContext('2d')
ctx.fillStyle = '#e8dcc0'
ctx.fillRect(0, 0, outW, outH)

async function fetchTile(x, yTMS) {
  const res = await fetch(`${BASE}/${Z}/${x}/${yTMS}.jpg`, { redirect: 'follow' })
  if (!res.ok) return null
  return Buffer.from(await res.arrayBuffer())
}

let ok = 0, miss = 0
for (let x = cx0; x < cx1; x++) {
  for (let row = ry0; row < ry1; row++) {
    const yTMS = ROWS - 1 - row
    const buf = await fetchTile(x, yTMS)
    if (!buf) { miss++; continue }
    try {
      const img = await loadImage(buf)
      ctx.drawImage(img, (x - cx0) * TILE, (row - ry0) * TILE)
      ok++
    } catch { miss++ }
  }
}

await mkdir('/projects/sandbox/dane', { recursive: true })
await writeFile('/projects/sandbox/dane/center-hires.png', canvas.toBuffer('image/png'))
// Zapisz metadane offsetu (gdzie w z6 zaczyna się wycinek)
await writeFile('/projects/sandbox/dane/center-meta.json', JSON.stringify({
  zoom: Z, tile: TILE,
  offsetX6: cx0 * TILE, offsetY6: ry0 * TILE,
  width: outW, height: outH,
  fullW: FULL_W, fullH: FULL_H,
  // skala z6 -> z4 (podkład aplikacji): /4
  scaleToBase: 2397 / FULL_W, // ~0.25
}, null, 2))
console.log(`Kafelki OK=${ok} miss=${miss}, wycinek ${outW}x${outH}px`)
console.log(`Offset w z6: (${cx0*TILE}, ${ry0*TILE})`)
