import { createCanvas, loadImage } from 'canvas'
import fs from 'node:fs'
const img = await loadImage('dane/wisnicz-1849-full.png')
const c = createCanvas(img.width, img.height)
const ctx = c.getContext('2d')
ctx.fillStyle = '#fff'; ctx.fillRect(0,0,c.width,c.height)
ctx.drawImage(img, 0, 0)
fs.writeFileSync('public/map/wisnicz-1849.jpg', c.toBuffer('image/jpeg', { quality: 0.82 }))
console.log(img.width, img.height)
