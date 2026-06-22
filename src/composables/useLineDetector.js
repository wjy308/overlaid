import { ref, reactive, onUnmounted } from 'vue'

/**
 * Fill ratio: compare left-10% vs right-10% brightness to set an adaptive
 * threshold, then find the rightmost column that's on the "filled" side.
 */
function detectFillRatio(imageData) {
  const { width, height, data } = imageData
  if (width < 5 || height < 1) return 1

  const sampleRows = [0.2, 0.35, 0.5, 0.65, 0.8]
    .map(f => Math.max(0, Math.min(height - 1, Math.floor(f * height))))

  const brightness = new Float32Array(width)
  for (let x = 0; x < width; x++) {
    for (const row of sampleRows) {
      const i = (row * width + x) * 4
      brightness[x] += (data[i] + data[i + 1] + data[i + 2]) / 3
    }
    brightness[x] /= sampleRows.length
  }

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

  const slice = Math.max(1, Math.floor(width * 0.1))
  let leftAvg = 0, rightAvg = 0
  for (let i = 0; i < slice; i++) leftAvg += smoothed[i]
  for (let i = width - slice; i < width; i++) rightAvg += smoothed[i]
  leftAvg /= slice
  rightAvg /= slice

  const range = Math.abs(leftAvg - rightAvg)
  if (range < 12) return leftAvg > 40 ? 1.0 : 0.0

  const threshold = Math.min(leftAvg, rightAvg) + range * 0.4

  if (leftAvg > rightAvg) {
    for (let x = width - 1; x >= 0; x--) {
      if (smoothed[x] > threshold) return (x + 1) / width
    }
  } else {
    for (let x = width - 1; x >= 0; x--) {
      if (smoothed[x] < threshold) return (x + 1) / width
    }
  }
  return 0
}

/**
 * Total lines: find the repeating period of divider marks via autocorrelation
 * on a downsampled brightness profile.
 * Returns the line count, or null if no clear period is found.
 */
function detectTotalLines(imageData) {
  const { width, height, data } = imageData
  if (width < 10) return null

  // Downsample horizontally to ≤300 samples for perf
  const samples = Math.min(width, 300)
  const step = width / samples
  const brightness = new Float32Array(samples)

  for (let s = 0; s < samples; s++) {
    const x = Math.floor(s * step)
    for (let y = 0; y < height; y++) {
      const i = (y * width + x) * 4
      brightness[s] += (data[i] + data[i + 1] + data[i + 2]) / 3
    }
    brightness[s] /= height
  }

  const mean = brightness.reduce((a, b) => a + b, 0) / samples
  let variance = 0
  for (let i = 0; i < samples; i++) variance += (brightness[i] - mean) ** 2
  variance /= samples

  // Not enough brightness variation → no visible dividers
  if (variance < 5) return null

  const centered = brightness.map(v => v - mean)
  const maxLag = Math.floor(samples / 3)

  let bestLag = -1
  let bestCorr = 0.25 // minimum confidence threshold

  for (let lag = 2; lag <= maxLag; lag++) {
    let corr = 0
    const n = samples - lag
    for (let x = 0; x < n; x++) corr += centered[x] * centered[x + lag]
    corr /= n * variance
    if (corr > bestCorr) {
      bestCorr = corr
      bestLag = lag
    }
  }

  if (bestLag < 0) return null

  // Convert lag in downsampled space → actual pixel period → line count
  const actualPeriod = bestLag * (width / samples)
  const total = Math.round(width / actualPeriod)

  return total >= 2 && total <= 5000 ? total : null
}

export function useLineDetector() {
  const fillRatio = ref(0)
  const currentLines = ref(0)
  const totalLines = ref(0)   // 0 = not yet detected
  const isDetecting = ref(false)

  const region = reactive({ x: 0, y: 0, w: 1, h: 1 })

  let rafId = null
  let captureRegionFn = null
  let frame = 0

  function start(captureRegion) {
    captureRegionFn = captureRegion
    isDetecting.value = true
    frame = 0
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
      fillRatio.value = detectFillRatio(imageData)

      if (totalLines.value > 0) {
        currentLines.value = Math.round(fillRatio.value * totalLines.value)
      }

      // Attempt total-lines detection every 90 frames until it succeeds
      if (totalLines.value === 0 && frame % 90 === 0) {
        const detected = detectTotalLines(imageData)
        if (detected) totalLines.value = detected
      }
    }

    frame++
    rafId = requestAnimationFrame(tick)
  }

  onUnmounted(stop)

  return { fillRatio, currentLines, totalLines, isDetecting, region, start, stop }
}
