import { ref, reactive, onUnmounted } from 'vue'
import { createWorker } from 'tesseract.js'

/**
 * Upscale 4x + grayscale + contrast stretch.
 * Tesseract accuracy drops sharply on small/low-contrast images.
 */
function prepareCanvas(imageData) {
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
  // Find actual min/max brightness for adaptive stretch
  let lo = 255, hi = 0
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
    if (g < lo) lo = g
    if (g > hi) hi = g
  }
  const range = hi - lo || 1
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
    const stretched = Math.round(((g - lo) / range) * 255)
    d[i] = d[i + 1] = d[i + 2] = stretched
  }
  ctx.putImageData(px, 0, 0)
  return out
}

export function useOcrDetector() {
  const detectedNumber = ref(null)
  const isDetecting = ref(false)
  const isReady = ref(false)
  const initError = ref(null)
  const region = reactive({ x: 0, y: 0, w: 1, h: 1 })

  let worker = null
  let captureRegionFn = null
  let intervalId = null
  let busy = false

  async function init() {
    try {
      worker = await createWorker('eng')
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789',
        tessedit_pageseg_mode: '8',  // single word
        user_defined_dpi: '150',
      })
      isReady.value = true
    } catch (e) {
      initError.value = `Tesseract 초기화 실패: ${e.message}`
    }
  }

  function start(captureRegion) {
    captureRegionFn = captureRegion
    isDetecting.value = true

    intervalId = setInterval(async () => {
      if (busy || !worker || !captureRegionFn) return
      busy = true

      const imageData = captureRegionFn(region.x, region.y, region.w, region.h)
      if (!imageData) { busy = false; return }

      const canvas = prepareCanvas(imageData)
      try {
        const { data: { text } } = await worker.recognize(canvas)
        const digits = text.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
        if (digits.length > 0 && digits.length <= 7) {
          detectedNumber.value = parseInt(digits, 10)
        }
      } catch {}

      busy = false
    }, 300) // ~3 fps — OCR is slow
  }

  function stop() {
    isDetecting.value = false
    clearInterval(intervalId)
    intervalId = null
    busy = false
  }

  // Start initializing immediately so it's ready when user selects region
  init()

  onUnmounted(async () => {
    stop()
    await worker?.terminate()
  })

  return { detectedNumber, isDetecting, isReady, initError, region, start, stop }
}
