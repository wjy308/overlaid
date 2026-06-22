import { ref, reactive, onUnmounted } from 'vue'

/**
 * Otsu's 1-D thresholding on a Float32Array profile.
 * Returns the threshold value that maximises inter-class variance.
 */
function otsu(profile) {
  const BINS = 128
  const min = Math.min(...profile)
  const max = Math.max(...profile)
  const range = max - min
  if (range < 5) return (min + max) / 2

  const hist = new Int32Array(BINS)
  for (const v of profile) {
    hist[Math.min(BINS - 1, Math.floor(((v - min) / range) * (BINS - 1)))]++
  }

  const total = profile.length
  let sum = 0
  for (let i = 0; i < BINS; i++) sum += i * hist[i]

  let sumB = 0, wB = 0, bestVar = 0, bestT = 0
  for (let t = 0; t < BINS; t++) {
    wB += hist[t]
    if (!wB) continue
    const wF = total - wB
    if (!wF) break
    sumB += t * hist[t]
    const mB = sumB / wB
    const mF = (sum - sumB) / wF
    const v = wB * wF * (mB - mF) ** 2
    if (v > bestVar) { bestVar = v; bestT = t }
  }
  return min + (bestT / (BINS - 1)) * range
}

/**
 * Detect fill ratio (0–1) of a horizontal HP bar.
 *
 * Approach:
 *  1. Sample the middle 40–60% rows to skip decorative borders.
 *  2. Build per-column signal: prefer chroma (colour vibrancy) for coloured
 *     bars, fall back to brightness for monochrome bars.
 *  3. Smooth with a ~3% window to suppress narrow divider marks.
 *  4. Apply Otsu threshold → binary filled/empty classification.
 *  5. Return position of the rightmost "filled" column.
 */
function detectFillRatio(imageData) {
  const { width, height, data } = imageData
  if (width < 5 || height < 1) return 1

  const rows = [0.4, 0.5, 0.6]
    .map(f => Math.max(0, Math.min(height - 1, Math.floor(f * height))))

  const brightness = new Float32Array(width)
  const chroma = new Float32Array(width)

  for (let x = 0; x < width; x++) {
    for (const row of rows) {
      const i = (row * width + x) * 4
      const r = data[i], g = data[i + 1], b = data[i + 2]
      brightness[x] += (r + g + b) / 3
      chroma[x] += Math.max(r, g, b) - Math.min(r, g, b)
    }
    brightness[x] /= rows.length
    chroma[x] /= rows.length
  }

  // Use chroma (colour) signal when the bar is coloured, brightness otherwise
  const chromaRange = Math.max(...chroma) - Math.min(...chroma)
  const raw = chromaRange > 30 ? chroma : brightness

  // Smooth: window ≈ 3% of width to kill narrow dividers
  const win = Math.max(2, Math.floor(width * 0.03))
  const smoothed = new Float32Array(width)
  for (let x = 0; x < width; x++) {
    let s = 0, n = 0
    for (let dx = -win; dx <= win; dx++) {
      const nx = x + dx
      if (nx >= 0 && nx < width) { s += raw[nx]; n++ }
    }
    smoothed[x] = s / n
  }

  const signalRange = Math.max(...smoothed) - Math.min(...smoothed)
  // Not enough contrast → HP is at 0% or 100%
  if (signalRange < 8) {
    return smoothed[Math.floor(width * 0.05)] > (Math.min(...smoothed) + signalRange * 0.5)
      ? 1.0
      : 0.0
  }

  const threshold = otsu(smoothed)

  // Determine fill direction: left side should be filled (HP drains right-to-left)
  const leftVal = smoothed.slice(0, Math.floor(width * 0.1)).reduce((a, b) => a + b, 0) / Math.floor(width * 0.1)
  const filledAbove = leftVal > threshold

  if (filledAbove) {
    for (let x = width - 1; x >= 0; x--) {
      if (smoothed[x] > threshold) return (x + 1) / width
    }
  } else {
    for (let x = width - 1; x >= 0; x--) {
      if (smoothed[x] <= threshold) return (x + 1) / width
    }
  }
  return 0
}

/**
 * Autocorrelation-based divider period detection.
 * Returns total line count or null if no reliable period found.
 */
function detectTotalLines(imageData) {
  const { width, height, data } = imageData
  if (width < 10) return null

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
  for (const v of brightness) variance += (v - mean) ** 2
  variance /= samples
  if (variance < 5) return null

  const centered = brightness.map(v => v - mean)
  const maxLag = Math.floor(samples / 3)
  let bestLag = -1, bestCorr = 0.35

  for (let lag = 2; lag <= maxLag; lag++) {
    let corr = 0
    const n = samples - lag
    for (let x = 0; x < n; x++) corr += centered[x] * centered[x + lag]
    corr /= n * variance
    if (corr > bestCorr) { bestCorr = corr; bestLag = lag }
  }

  if (bestLag < 0) return null
  const total = Math.round(width / (bestLag * (width / samples)))
  return total >= 2 && total <= 5000 ? total : null
}

export function useLineDetector() {
  const fillRatio = ref(0)
  const currentLines = ref(0)
  const totalLines = ref(0)
  const isDetecting = ref(false)
  const region = reactive({ x: 0, y: 0, w: 1, h: 1 })

  let rafId = null
  let captureRegionFn = null
  let frame = 0
  let smoothed = null // EMA state

  function start(captureRegion) {
    captureRegionFn = captureRegion
    isDetecting.value = true
    frame = 0
    smoothed = null
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
      const raw = detectFillRatio(imageData)
      // Exponential moving average — smooths jitter without sacrificing responsiveness
      smoothed = smoothed === null ? raw : 0.15 * raw + 0.85 * smoothed
      fillRatio.value = Math.max(0, Math.min(1, smoothed))

      if (totalLines.value > 0) {
        currentLines.value = Math.round(fillRatio.value * totalLines.value)
      }

      // Attempt total-lines detection every 120 frames until it succeeds
      if (totalLines.value === 0 && frame % 120 === 0) {
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
