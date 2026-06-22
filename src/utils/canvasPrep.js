// HP · 타이머 OCR 공통 전처리
// 4배 확대 + 그레이스케일 + 적응형 대비 스트레치
export function prepareCanvas(imageData) {
  const scale = 4
  const src = document.createElement('canvas')
  src.width = imageData.width
  src.height = imageData.height
  src.getContext('2d').putImageData(imageData, 0, 0)

  const out = document.createElement('canvas')
  out.width = imageData.width * scale
  out.height = imageData.height * scale
  const ctx = out.getContext('2d')
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(src, 0, 0, out.width, out.height)

  const px = ctx.getImageData(0, 0, out.width, out.height)
  const d = px.data
  let lo = 255, hi = 0
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
    if (g < lo) lo = g
    if (g > hi) hi = g
  }
  const range = hi - lo || 1
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
    const v = Math.round(((g - lo) / range) * 255)
    d[i] = d[i + 1] = d[i + 2] = v
  }
  ctx.putImageData(px, 0, 0)
  return out
}
