import { ref, reactive, onUnmounted } from 'vue'

/**
 * Detect HP fill ratio from an ImageData.
 *
 * Strategy: build a smoothed per-column brightness profile, then compare
 * the left 10% (should be filled) vs right 10% (should be empty when HP < 100%).
 * Find the rightmost column that still belongs to the "filled" side.
 *
 * Works regardless of HP bar color and handles both bright-on-dark and
 * dark-on-bright HP bars.
 */
function detectFillRatio(imageData) {
  const { width, height, data } = imageData
  if (width < 5 || height < 1) return 1

  // Sample 5 evenly-spaced rows for noise resilience
  const sampleRows = [0.2, 0.35, 0.5, 0.65, 0.8]
    .map(f => Math.max(0, Math.min(height - 1, Math.floor(f * height))))

  // Build per-column brightness
  const brightness = new Float32Array(width)
  for (let x = 0; x < width; x++) {
    for (const row of sampleRows) {
      const i = (row * width + x) * 4
      brightness[x] += (data[i] + data[i + 1] + data[i + 2]) / 3
    }
    brightness[x] /= sampleRows.length
  }

  // Smooth with a window = ~2% of bar width to eliminate narrow dividers
  const win = Math.max(2, Math.floor(width * 0.02))
  const smoothed = new Float32Array(width)
  for (let x = 0; x < width; x++) {
    let sum = 0, count = 0
    for (let dx = -win; dx <= win; dx++) {
      const nx = x + dx
      if (nx >= 0 && nx < width) { sum += brightness[nx]; count++ }
    }
    smoothed[x] = sum / count
  }

  // Reference: average brightness of leftmost 10% vs rightmost 10%
  const slice = Math.max(1, Math.floor(width * 0.1))
  let leftAvg = 0, rightAvg = 0
  for (let i = 0; i < slice; i++) leftAvg += smoothed[i]
  for (let i = width - slice; i < width; i++) rightAvg += smoothed[i]
  leftAvg /= slice
  rightAvg /= slice

  const range = Math.abs(leftAvg - rightAvg)

  // If the bar has no visible transition the HP is at 100% (or 0%)
  if (range < 12) {
    return leftAvg > 40 ? 1.0 : 0.0
  }

  // Threshold sits 40% of the way from the darker side to the brighter side
  const minSide = Math.min(leftAvg, rightAvg)
  const threshold = minSide + range * 0.4

  const filledIsBrighter = leftAvg > rightAvg

  if (filledIsBrighter) {
    for (let x = width - 1; x >= 0; x--) {
      if (smoothed[x] > threshold) return (x + 1) / width
    }
  } else {
    // Filled portion is the darker one (e.g. dark bar on a light background)
    for (let x = width - 1; x >= 0; x--) {
      if (smoothed[x] < threshold) return (x + 1) / width
    }
  }

  return 0
}

export function useLineDetector() {
  const fillRatio = ref(0)
  const currentLines = ref(0)
  const totalLines = ref(0)
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

  return { fillRatio, currentLines, totalLines, isDetecting, region, start, stop }
}
