import { ref, reactive } from 'vue'

// Counts pixels within HSL hue range and returns ratio filled
function analyzeHpBar(imageData, config) {
  const { data, width, height } = imageData
  const { hueMin, hueMax, satMin, lightMin, lightMax } = config
  let filled = 0
  let total = width * height

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255
    const g = data[i + 1] / 255
    const b = data[i + 2] / 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const delta = max - min
    const l = (max + min) / 2

    if (delta < 0.01) continue
    const s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min)
    if (s < satMin || l < lightMin || l > lightMax) continue

    let h = 0
    if (max === r) h = ((g - b) / delta + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / delta + 2) / 6
    else h = ((r - g) / delta + 4) / 6
    h *= 360

    if (h >= hueMin && h <= hueMax) filled++
  }

  return total > 0 ? filled / total : 0
}

export function useHpDetector() {
  const hp = ref(1)
  const isDetecting = ref(false)

  // Region as normalized coords { x, y, w, h }
  const region = reactive({ x: 0, y: 0, w: 1, h: 1 })

  // Color config for HP bar pixel matching
  const colorConfig = reactive({
    hueMin: 0,     // red start
    hueMax: 30,    // red end (adjust per game)
    satMin: 0.4,
    lightMin: 0.2,
    lightMax: 0.8,
  })

  let rafId = null
  let captureRegionFn = null

  function start(captureRegion) {
    captureRegionFn = captureRegion
    isDetecting.value = true
    tick()
  }

  function stop() {
    isDetecting.value = false
    if (rafId) cancelAnimationFrame(rafId)
    rafId = null
  }

  function tick() {
    if (!isDetecting.value) return
    const imageData = captureRegionFn?.(region.x, region.y, region.w, region.h)
    if (imageData) {
      hp.value = analyzeHpBar(imageData, colorConfig)
    }
    rafId = requestAnimationFrame(tick)
  }

  return { hp, isDetecting, region, colorConfig, start, stop }
}
