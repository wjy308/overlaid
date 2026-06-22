import { ref, reactive, onUnmounted } from 'vue'
import { createWorker } from 'tesseract.js'
import { prepareCanvas } from '../utils/canvasPrep.js'

// "09:30:00" → { seconds: 570, str: "09:30:00" } 변환
// 형식: MM:SS:CS (분:초:센티초) — 세 번째 값은 표시만, 비교는 MM:SS 기준
function parseTimerText(raw) {
  const match = raw.match(/(\d{1,2}):(\d{2}):(\d{2})/)
  if (!match) return null
  const mins = parseInt(match[1], 10)
  const secs = parseInt(match[2], 10)
  if (secs >= 60 || mins > 99) return null
  return {
    seconds: mins * 60 + secs,
    str: `${String(mins).padStart(2, '0')}:${match[2]}:${match[3]}`,
  }
}

export function useTimerDetector() {
  const detectedSeconds = ref(null)  // 총 초 (계산·비교용)
  const detectedTimeStr = ref(null)  // "9:30" (표시용)
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
        // 콜론 포함 — mm:ss 형식 인식
        tessedit_char_whitelist: '0123456789:',
        // PSM 7: 단일 텍스트 행 (타이머처럼 짧은 한 줄에 유리)
        tessedit_pageseg_mode: '7',
        user_defined_dpi: '150',
      })
      isReady.value = true
    } catch (e) {
      initError.value = `타이머 OCR 초기화 실패: ${e.message}`
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
        const result = parseTimerText(text)
        if (result) {
          detectedSeconds.value = result.seconds
          detectedTimeStr.value = result.str
        }
      } catch {}
      busy = false
    }, 500)
  }

  function stop() {
    isDetecting.value = false
    clearInterval(intervalId)
    intervalId = null
    busy = false
  }

  init()

  onUnmounted(async () => {
    stop()
    await worker?.terminate()
  })

  return { detectedSeconds, detectedTimeStr, isDetecting, isReady, initError, region, start, stop }
}
