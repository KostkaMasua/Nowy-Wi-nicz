import { createCanvas } from 'canvas'
import fs from 'node:fs'
fs.mkdirSync('public/icons', { recursive: true })
for (const size of [192, 512]) {
  const c = createCanvas(size, size), x = c.getContext('2d')
  x.fillStyle = '#2a200f'; x.fillRect(0, 0, size, size)
  // „dom” z dachem + znacznik lokalizacji — prosta ikona w sepii
  x.fillStyle = '#e8c062'
  const s = size / 512
  x.beginPath(); x.moveTo(256*s, 110*s); x.lineTo(410*s, 250*s); x.lineTo(370*s, 250*s)
  x.lineTo(370*s, 390*s); x.lineTo(142*s, 390*s); x.lineTo(142*s, 250*s); x.lineTo(102*s, 250*s); x.closePath(); x.fill()
  x.fillStyle = '#b9770e'; x.fillRect(226*s, 300*s, 60*s, 90*s)
  x.strokeStyle = '#c0392b'; x.lineWidth = 10*s; x.setLineDash([22*s, 14*s])
  x.beginPath(); x.moveTo(110*s, 440*s); x.quadraticCurveTo(256*s, 380*s, 402*s, 440*s); x.stroke()
  fs.writeFileSync(`public/icons/icon-${size}.png`, c.toBuffer('image/png'))
}
