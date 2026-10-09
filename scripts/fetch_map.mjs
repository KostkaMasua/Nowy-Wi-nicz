// Pobiera kafelki mapy katastralnej Wiśnicza (gdal2tiles, TMS) z poziomu zoom 4
// i składa je w jeden obraz PNG, który posłuży jako podkład w aplikacji.
import { writeFile, mkdir } from 'node:fs/promises'
import { createCanvas, loadImage } from 'canvas'

const BASE = 'https://maps.geshergalicia.org/cadastral/wisnicz-nowy-1849'
const Z = 4
const TILE = 256

// Wymiary obrazu na poziomie z4 (z analizy): ~2397 x 2270 px
const IMG_W = 2397
const IMG_H = 2270
const COLS = Math.ceil(IMG_W / TILE) // 10
const ROWS = Math.ceil(IMG_H / TILE) // 9

// Pełna wysokość siatki kafelków (ROWS*256) — potrzebna do przeliczenia TMS.
const GRID_H = ROWS * TILE

const canvas = createCanvas(COLS * TILE, ROWS * TILE)
const ctx = canvas.getContext('2d')
ctx.fillStyle = '#e8dcc0'
ctx.fillRect(0, 0, canvas.width, canvas.height)

async function fetchTile(x, yTMS) {
  const url = `${BASE}/${Z}/${x}/${yTMS}.jpg`
  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok) return null
  const buf = Buffer.from(await res.arrayBuffer())
  return buf
}

let ok = 0,
  miss = 0
for (let x = 0; x < COLS; x++) {
  for (let row = 0; row < ROWS; row++) {
    // gdal2tiles używa TMS: y liczony od DOŁU. Wiersz ekranowy `row` (od góry)
    // odpowiada kafelkowi TMS y = (ROWS-1 - row).
    const yTMS = ROWS - 1 - row
    const buf = await fetchTile(x, yTMS)
    if (!buf) {
      miss++
      continue
    }
    try {
      const img = await loadImage(buf)
      ctx.drawImage(img, x * TILE, row * TILE)
      ok++
    } catch {
      miss++
    }
  }
}

await mkdir('/projects/sandbox/public/map', { recursive: true })
const out = canvas.toBuffer('image/png')
await writeFile('/projects/sandbox/public/map/wisnicz-1849.png', out)
console.log(`Kafelki OK=${ok} brakujące=${miss}`)
console.log(`Zapisano podkład: public/map/wisnicz-1849.png (${canvas.width}x${canvas.height}px, ${(out.length / 1024 / 1024).toFixed(2)} MB)`)
console.log(`Przycięcie do treści: ${IMG_W}x${IMG_H}px`)
