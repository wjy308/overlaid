import { ref, reactive, onUnmounted } from 'vue'

// Sample reference color from leftmost pixels and find the rightmost column
// that still matches — that's the HP fill boundary.
function detectFillRatio(imageData) {
  const { width, height, data } = imageData
  if (width === 0 || height === 0) return 0

  const midRow = Math.floor(height / 2)

  // Reference color = average of leftmost 3 columns at mid-height
  const refSamples = Math.min(3, width)
  let refR = 0, refG = 0, refB = 0
  for (let x = 0; x < refSamples; x++) {
    const i = (midRow * width + x) * 4
    refR += data[i]; refG += data[i + 1]; refB += data[i + 2]
  }
  refR /= refSamples; refG /= refSamples; refB /= refSamples

  // Scan right-to-left: find the rightmost column matching the reference color
  const threshold = 80 // Euclidean RGB distance
  for (let x = width - 1; x >= 0; x--) {
    let r = 0, g = 0, b = 0
    // Average 5 rows around mid-height for noise resistance
    for (let dy = -2; dy <= 2; dy++) {
      const row = Math.max(0, Math.min(height - 1, midRow + dy))
      const i = (row * width + x) * 4
      r += data[i]; g += data[i + 1]; b += data[i + 2]
    }
    r /= 5; g /= 5; b /= 5

    const dist = Math.sqrt((r - refR) ** 2 + (g - refG) ** 2 + (b - refB) ** 2)
    if (dist < threshold) return (x + 1) / width
  }
  return 0
}

// Count vertical divider marks by finding periodic brightness dips.
// Returns number of dividers found (segments = dividers + 1 if bordered).
function countDividers(imageData) {
  const { width, height, data } = imageData
  if (width < 10) return 0

  const midRow = Math.floor(height / 2)

  // Build per-column brightness profile (average 3 rows)
  const brightness = new Float32Array(width)
  for (let x = 0; x < width; x++) {
    for (let dy = -1; dy <= 1; dy++) {
      const row = Math.max(0, Math.min(height - 1, midRow + dy))
      const i = (row * width + x) * 4
      brightness[x] += (data[i] + data[i + 1] + data[i + 2]) / 3
    }
    brightness[x] /= 3
  }

  const avg = brightness.reduce((s, v) => s + v, 0) / width
  const darkThreshold = avg * 0.6

  // Count dark valleys (each contiguous dark zone = one divider)
  let count = 0
  let inDark = false
  for (let x = 0; x < width; x++) {
    if (brightness[x] < darkThreshold) {
      if (!inDark) { count++; inDark = true }
    } else {
      inDark = false
    }
  }
  return count
}

export function useLineDetector() {
  const fillRatio = ref(0)
  const currentLines = ref(0)
  const totalLines = ref(0)
  const detectedDividers = ref(null) // null = not yet scanned
  const isDetecting = ref(false)

  const region = reactive({ x: 0, y: 0, w: 1, h: 1 })

  let rafId = null
  let captureRegionFn = null

  function start(captureRegion) {
    captureRegionFn = captureRegion
    isDetecting.value = true
    tick()
  }

  function stop() {
    isDetecting.value = false
    cancelAnimationFrame(rafId)
    rafId = null
  }

  // One-shot: try to count dividers to auto-fill totalLines
  function autoDetectTotal() {
    const imageData = captureRegionFn?.(region.x, region.y, region.w, region.h)
    if (!imageData) return
    const d = countDividers(imageData)
    detectedDividers.value = d
    // dividers separate segments; border lines at edges aren't "lines" in the game sense
    if (d > 1) totalLines.value = d - 1
  }

  function tick() {
    if (!isDetecting.value) return
    const imageData = captureRegionFn?.(region.x, region.y, region.w, region.h)
    if (imageData) {
      const ratio = detectFillRatio(imageData)
      fillRatio.value = ratio
      if (totalLines.value > 0) {
        currentLines.value = Math.round(ratio * totalLines.value)
      }
    }
    rafId = requestAnimationFrame(tick)
  }

  onUnmounted(stop)

  return { fillRatio, currentLines, totalLines, detectedDividers, isDetecting, region, start, stop, autoDetectTotal }
}
