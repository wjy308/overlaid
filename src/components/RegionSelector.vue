<template>
  <div class="rs">
    <div class="rs__canvas-wrap">
      <canvas
        ref="canvasRef"
        class="rs__canvas"
        :class="{ 'rs__canvas--active': isCapturing }"
        @mousedown="onDown"
        @mousemove="onMove"
        @mouseup="onUp"
        @mouseleave="onLeave"
      />
      <div v-if="!isCapturing" class="rs__placeholder">
        화면 캡처 후 드래그로 HP 바 영역을 선택하세요
      </div>
    </div>

    <div v-if="hasRegion" class="rs__preview-wrap">
      <span class="rs__preview-label">선택 영역 미리보기 (실시간)</span>
      <canvas ref="previewRef" class="rs__preview" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'

const props = defineProps({
  video: Object,
  isCapturing: Boolean,
})

const emit = defineEmits(['update:region'])

const canvasRef = ref(null)
const previewRef = ref(null)
const isDragging = ref(false)
const hasRegion = ref(false)

let startX = 0, startY = 0, curX = 0, curY = 0
let committedRegion = null
let rafId = null

function clamp(v) {
  return Math.max(0, Math.min(1, v))
}

function getNormCoords(e) {
  const rect = canvasRef.value.getBoundingClientRect()
  return {
    x: clamp((e.clientX - rect.left) / rect.width),
    y: clamp((e.clientY - rect.top) / rect.height),
  }
}

function onDown(e) {
  if (!props.isCapturing) return
  const { x, y } = getNormCoords(e)
  startX = x; startY = y; curX = x; curY = y
  isDragging.value = true
}

function onMove(e) {
  if (!isDragging.value) return
  const { x, y } = getNormCoords(e)
  curX = x; curY = y
}

function onUp() {
  if (!isDragging.value) return
  isDragging.value = false
  const region = buildRegion()
  if (region.w > 0.005 && region.h > 0.005) {
    committedRegion = region
    hasRegion.value = true
    emit('update:region', region)
  }
}

function onLeave(e) {
  if (isDragging.value) onUp(e)
}

function buildRegion() {
  return {
    x: Math.min(startX, curX),
    y: Math.min(startY, curY),
    w: Math.abs(curX - startX),
    h: Math.abs(curY - startY),
  }
}

function tick() {
  rafId = requestAnimationFrame(tick)
  const canvas = canvasRef.value
  if (!canvas || !props.video) return
  const vw = props.video.videoWidth
  const vh = props.video.videoHeight
  if (!vw || !vh) return

  if (canvas.width !== vw) canvas.width = vw
  if (canvas.height !== vh) canvas.height = vh

  const ctx = canvas.getContext('2d')
  ctx.drawImage(props.video, 0, 0)

  // Draw active or committed region
  const region = isDragging.value ? buildRegion() : committedRegion
  if (region) {
    const rx = region.x * vw
    const ry = region.y * vh
    const rw = region.w * vw
    const rh = region.h * vh

    // Dim everything outside
    ctx.save()
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.fillRect(0, 0, vw, vh)
    ctx.clearRect(rx, ry, rw, rh)
    ctx.drawImage(props.video, rx, ry, rw, rh, rx, ry, rw, rh)

    // Border
    ctx.strokeStyle = '#4ade80'
    ctx.lineWidth = Math.max(2, vw / 500)
    ctx.setLineDash(isDragging.value ? [10, 5] : [])
    ctx.strokeRect(rx, ry, rw, rh)

    // Corner handles
    const hs = Math.max(8, vw / 150)
    ctx.fillStyle = '#4ade80'
    ctx.setLineDash([])
    for (const [hx, hy] of [[rx, ry], [rx + rw, ry], [rx, ry + rh], [rx + rw, ry + rh]]) {
      ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs)
    }
    ctx.restore()
  }

  // Live preview of committed region
  if (!isDragging.value && committedRegion && previewRef.value) {
    const r = committedRegion
    const pw = Math.round(r.w * vw)
    const ph = Math.round(r.h * vh)
    if (pw > 0 && ph > 0) {
      const prev = previewRef.value
      if (prev.width !== pw) prev.width = pw
      if (prev.height !== ph) prev.height = ph
      prev.getContext('2d').drawImage(props.video, r.x * vw, r.y * vh, pw, ph, 0, 0, pw, ph)
    }
  }
}

watch(() => props.isCapturing, (active) => {
  if (active) {
    tick()
  } else {
    cancelAnimationFrame(rafId)
    hasRegion.value = false
    committedRegion = null
  }
})

onUnmounted(() => cancelAnimationFrame(rafId))
</script>

<style scoped>
.rs {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.rs__canvas-wrap {
  position: relative;
  background: #111;
  border-radius: 6px;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rs__canvas {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  cursor: default;
}

.rs__canvas--active {
  cursor: crosshair;
}

.rs__placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #444;
  font-size: 0.8rem;
  text-align: center;
  padding: 1rem;
  pointer-events: none;
}

.rs__preview-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.rs__preview-label {
  font-size: 0.7rem;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.rs__preview {
  max-width: 100%;
  max-height: 80px;
  border-radius: 4px;
  border: 1px solid #2a2a2a;
  display: block;
  object-fit: contain;
}
</style>
