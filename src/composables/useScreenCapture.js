import { ref, shallowRef, onUnmounted } from 'vue'

export function useScreenCapture() {
  const stream = shallowRef(null)
  const video = shallowRef(null)
  const canvas = shallowRef(null)
  const isCapturing = ref(false)
  const error = ref(null)

  async function startCapture() {
    error.value = null
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'never', displaySurface: 'monitor' },
        audio: false,
      })

      const videoEl = document.createElement('video')
      videoEl.srcObject = mediaStream
      videoEl.muted = true
      await videoEl.play()

      const canvasEl = document.createElement('canvas')
      canvasEl.width = videoEl.videoWidth
      canvasEl.height = videoEl.videoHeight

      stream.value = mediaStream
      video.value = videoEl
      canvas.value = canvasEl
      isCapturing.value = true

      mediaStream.getVideoTracks()[0].addEventListener('ended', stopCapture)
    } catch (e) {
      error.value = e.message
    }
  }

  function stopCapture() {
    stream.value?.getTracks().forEach(t => t.stop())
    stream.value = null
    video.value = null
    canvas.value = null
    isCapturing.value = false
  }

  // Returns ImageData for a given region (normalized 0-1 coords)
  function captureRegion(x, y, w, h) {
    if (!video.value || !canvas.value) return null
    const vw = video.value.videoWidth
    const vh = video.value.videoHeight
    const ctx = canvas.value.getContext('2d')
    ctx.drawImage(video.value, 0, 0, vw, vh)
    const px = Math.round(x * vw)
    const py = Math.round(y * vh)
    const pw = Math.round(w * vw)
    const ph = Math.round(h * vh)
    return ctx.getImageData(px, py, pw, ph)
  }

  onUnmounted(stopCapture)

  return { isCapturing, error, video, startCapture, stopCapture, captureRegion }
}
