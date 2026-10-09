// Generuje proceduralny obraz-placeholder stylizowany na XIX-wieczny
// plan miasta (sepia, rzeka, siatka ulic, rynek). Zwraca data-URL,
// który podstawiamy jako imageOverlay dopóki użytkownik nie wgra skanu.

export function makePlaceholderMap(w: number, h: number): string {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  // Tło — stary papier (sepia)
  ctx.fillStyle = '#e8dcc0'
  ctx.fillRect(0, 0, w, h)

  // Delikatne plamy "starzenia" papieru
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * w
    const y = Math.random() * h
    const r = Math.random() * 60
    ctx.fillStyle = `rgba(120, 90, 50, ${Math.random() * 0.03})`
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  // Rzeka przecinająca miasto
  ctx.strokeStyle = 'rgba(90, 120, 150, 0.5)'
  ctx.lineWidth = 26
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-20, h * 0.2)
  ctx.bezierCurveTo(w * 0.3, h * 0.35, w * 0.5, h * 0.1, w * 0.7, h * 0.5)
  ctx.bezierCurveTo(w * 0.85, h * 0.75, w * 0.95, h * 0.7, w + 20, h * 0.85)
  ctx.stroke()

  // Siatka ulic (promieniste + obwodnice wokół rynku)
  const cx = w / 2
  const cy = h / 2
  ctx.strokeStyle = 'rgba(90, 60, 30, 0.35)'
  ctx.lineWidth = 3
  for (let a = 0; a < 12; a++) {
    const ang = (a / 12) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + Math.cos(ang) * w, cy + Math.sin(ang) * h)
    ctx.stroke()
  }
  for (let r = 90; r < Math.max(w, h); r += 130) {
    ctx.beginPath()
    ctx.ellipse(cx, cy, r, r * 0.78, 0, 0, Math.PI * 2)
    ctx.stroke()
  }

  // Rynek (centralny plac)
  ctx.fillStyle = 'rgba(150, 120, 70, 0.4)'
  ctx.strokeStyle = 'rgba(80, 50, 20, 0.7)'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.rect(cx - 70, cy - 55, 140, 110)
  ctx.fill()
  ctx.stroke()

  // Ratusz na rynku
  ctx.fillStyle = 'rgba(80, 50, 20, 0.6)'
  ctx.fillRect(cx - 22, cy - 18, 44, 36)

  // Podpis-kartusz
  ctx.fillStyle = 'rgba(70, 45, 20, 0.85)'
  ctx.font = 'italic 34px Georgia, serif'
  ctx.fillText('Mapa miasta — A.D. 1849', 40, h - 48)
  ctx.font = 'italic 18px Georgia, serif'
  ctx.fillStyle = 'rgba(70, 45, 20, 0.6)'
  ctx.fillText('(obraz poglądowy — podmień na skan historycznej mapy)', 40, h - 22)

  // Ramka
  ctx.strokeStyle = 'rgba(70, 45, 20, 0.8)'
  ctx.lineWidth = 10
  ctx.strokeRect(5, 5, w - 10, h - 10)

  return canvas.toDataURL('image/png')
}
