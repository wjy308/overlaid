<template>
  <div class="rs">
    <!-- Compact preview -->
    <div class="rs__canvas-wrap">
      <canvas ref="canvasRef" class="rs__canvas" :class="{ 'rs__canvas--active': isCapturing }"
        @mousedown="onDown" @mousemove="onMove" @mouseup="onUp" @mouseleave="onLeave" />
      <div v-if="!isCapturing" class="rs__placeholder">
        화면 캡처 후 영역을 선택하세요
      </div>
    </div>

    <div class="rs__actions">
      <button
        class="btn btn--primary btn--sm"
        :disabled="!isCapturing"
        @click="enterFullscreen"
      >
        전체화면에서 선택
      </button>
      <span v-if="hasRegion" class="rs__selected-hint">✓ 영역 선택됨</span>
    </div>

    <!-- Live preview of selected region -->
    <div v-if="hasRegion" class="rs__preview-wrap">
      <span class="rs__preview-label">선택 영역 실시간 미리보기</span>
      <canvas ref="previewRef" class="rs__preview" />
    </div>
  </div>

  <!-- Fullscreen selection overlay -->
  <Teleport to="body">
    <div v-if="isFullscreen" class="rs-fs">
      <canvas ref="fsCanvasRef" class="rs-fs__canvas"
        @mousedown="onFsDown" @mousemove="onFsMove" @mouseup="onFsUp" />
      <div class="rs-fs__hint">
        드래그로 HP 바 영역을 선택하세요 &nbsp;·&nbsp; <kbd>ESC</kbd> 취소
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick, onUnmounted } from 'vue'

const props = defineProps({
  video: Object,
  isCapturing: Boolean,
})

const emit = defineEmits(['update:region'])

// ── Compact canvas ─────────────────────────────────────
const canvasRef = ref(null)
const previewRef = ref(null)
const isDragging = ref(false)
const hasRegion = ref(false)
let startX = 0, startY = 0, curX = 0, curY = 0
let committedRegion = null
let rafId = null

function clamp(v) { return Math.max(0, Math.min(1, v)) }

function getCompactNorm(e) {
  const rect = canvasRef.value.getBoundingClientRect()
  // The canvas is CSS-scaled; map back to normalized video coords
  return {
    x: clamp((e.clientX - rect.left) / rect.width),
    y: clamp((e.clientY - rect.top) / rect.height),
  }
}

function onDown(e) {
  if (!props.isCapturing) return
  const n = getCompactNorm(e)
  startX = n.x; startY = n.y; curX = n.x; curY = n.y
  isDragging.value = true
}
function onMove(e) {
  if (!isDragging.value) return
  const n = getCompactNorm(e); curX = n.x; curY = n.y
}
function onUp() {
  if (!isDragging.value) return
  isDragging.value = false
  commitRegion(buildRegion())
}
function onLeave(e) { if (isDragging.value) onUp(e) }

function buildRegion() {
  return {
    x: Math.min(startX, curX),
    y: Math.min(startY, curY),
    w: Math.abs(curX - startX),
    h: Math.abs(curY - startY),
  }
}

function commitRegion(r) {
  if (r.w < 0.005 || r.h < 0.005) return
  committedRegion = r
  hasRegion.value = true
  emit('update:region', r)
}

// Compact canvas RAF loop
function tick() {
  rafId = requestAnimationFrame(tick)
  const canvas = canvasRef.value
  if (!canvas || !props.video) return
  const vw = props.video.videoWidth, vh = props.video.videoHeight
  if (!vw || !vh) return

  if (canvas.width !== vw) canvas.width = vw
  if (canvas.height !== vh) canvas.height = vh

  const ctx = canvas.getContext('2d')
  ctx.drawImage(props.video, 0, 0)

  const region = isDragging.value ? buildRegion() : committedRegion
  if (region) drawRegionOverlay(ctx, vw, vh, region, isDragging.value)

  if (!isDragging.value && committedRegion && previewRef.value) {
    const r = committedRegion
    const pw = Math.round(r.w * vw), ph = Math.round(r.h * vh)
    if (pw > 0 && ph > 0) {
      const prev = previewRef.value
      if (prev.width !== pw) prev.width = pw
      if (prev.height !== ph) prev.height = ph
      prev.getContext('2d').drawImage(props.video, r.x * vw, r.y * vh, pw, ph, 0, 0, pw, ph)
    }
  }
}

// ── Fullscreen overlay ─────────────────────────────────
const isFullscreen = ref(false)
const fsCanvasRef = ref(null)
let fsRafId = null
let fsDragStart = null, fsDragCur = null
let fsIsDragging = false
let fsVideoRect = null // { dx, dy, dw, dh } — letterbox rect in canvas coords

function enterFullscreen() {
  if (!props.isCapturing || !props.video) return
  isFullscreen.value = true
  nextTick(() => {
    const canvas = fsCanvasRef.value
    if (!canvas) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    fsTick()
  })
}

function exitFullscreen() {
  isFullscreen.value = false
  cancelAnimationFrame(fsRafId)
  fsIsDragging = false
  fsDragStart = null
  fsDragCur = null
}

function computeVideoRect(canvas, video) {
  const cw = canvas.width, ch = canvas.height
  const vw = video.videoWidth, vh = video.videoHeight
  const videoAR = vw / vh, canvasAR = cw / ch
  let dw, dh, dx, dy
  if (videoAR > canvasAR) {
    dw = cw; dh = Math.round(cw / videoAR); dx = 0; dy = Math.round((ch - dh) / 2)
  } else {
    dh = ch; dw = Math.round(ch * videoAR); dx = Math.round((cw - dw) / 2); dy = 0
  }
  return { dx, dy, dw, dh }
}

function fsClientToNorm(clientX, clientY) {
  if (!fsVideoRect) return { x: 0, y: 0 }
  const { dx, dy, dw, dh } = fsVideoRect
  return {
    x: clamp((clientX - dx) / dw),
    y: clamp((clientY - dy) / dh),
  }
}

function fsBuildRegion() {
  if (!fsDragStart || !fsDragCur) return null
  return {
    x: Math.min(fsDragStart.x, fsDragCur.x),
    y: Math.min(fsDragStart.y, fsDragCur.y),
    w: Math.abs(fsDragCur.x - fsDragStart.x),
    h: Math.abs(fsDragCur.y - fsDragStart.y),
  }
}

function onFsDown(e) {
  const n = fsClientToNorm(e.clientX, e.clientY)
  fsDragStart = n; fsDragCur = n; fsIsDragging = true
}
function onFsMove(e) {
  if (!fsIsDragging) return
  fsDragCur = fsClientToNorm(e.clientX, e.clientY)
}
function onFsUp() {
  if (!fsIsDragging) return
  fsIsDragging = false
  const r = fsBuildRegion()
  if (r && r.w > 0.002 && r.h > 0.001) {
    commitRegion(r)
    // Briefly show the confirmed selection then close
    setTimeout(exitFullscreen, 300)
  }
}

function fsTick() {
  if (!isFullscreen.value) return
  fsRafId = requestAnimationFrame(fsTick)

  const canvas = fsCanvasRef.value
  if (!canvas || !props.video) return
  const vw = props.video.videoWidth, vh = props.video.videoHeight
  if (!vw || !vh) return

  const ctx = canvas.getContext('2d')
  const cw = canvas.width, ch = canvas.height

  // Keep canvas sized to viewport (handles window resize)
  if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }

  fsVideoRect = computeVideoRect(canvas, props.video)
  const { dx, dy, dw, dh } = fsVideoRect

  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, cw, ch)
  ctx.drawImage(props.video, dx, dy, dw, dh)

  const region = fsIsDragging ? fsBuildRegion() : (fsDragStart ? fsBuildRegion() : null)
  if (region) {
    const rx = region.x * dw + dx
    const ry = region.y * dh + dy
    const rw = region.w * dw
    const rh = region.h * dh

    ctx.save()
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(0, 0, cw, ch)
    ctx.clearRect(rx, ry, rw, rh)
    // Redraw the selected area at full brightness
    ctx.drawImage(props.video,
      region.x * vw, region.y * vh, region.w * vw, region.h * vh,
      rx, ry, rw, rh)
    ctx.strokeStyle = '#4ade80'
    ctx.lineWidth = 2
    ctx.setLineDash(fsIsDragging ? [8, 4] : [])
    ctx.strokeRect(rx, ry, rw, rh)
    ctx.restore()
  }
}

// ESC key handler
function onKeydown(e) {
  if (e.key === 'Escape' && isFullscreen.value) exitFullscreen()
}
window.addEventListener('keydown', onKeydown)

// ── Lifecycle ──────────────────────────────────────────
watch(() => props.isCapturing, (active) => {
  if (active) {
    tick()
  } else {
    cancelAnimationFrame(rafId)
    if (isFullscreen.value) exitFullscreen()
    hasRegion.value = false
    committedRegion = null
  }
})

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  cancelAnimationFrame(fsRafId)
  window.removeEventListener('keydown', onKeydown)
})

// ── Shared drawing helper ──────────────────────────────
function drawRegionOverlay(ctx, vw, vh, r, dashed) {
  const rx = r.x * vw, ry = r.y * vh, rw = r.w * vw, rh = r.h * vh
  ctx.save()
  ctx.fillStyle = 'rgba(0,0,0,0.45)'
  ctx.fillRect(0, 0, vw, vh)
  ctx.clearRect(rx, ry, rw, rh)
  ctx.strokeStyle = '#4ade80'
  ctx.lineWidth = Math.max(2, vw / 500)
  ctx.setLineDash(dashed ? [10, 5] : [])
  ctx.strokeRect(rx, ry, rw, rh)
  const hs = Math.max(6, vw / 200)
  ctx.fillStyle = '#4ade80'
  ctx.setLineDash([])
  for (const [hx, hy] of [[rx, ry], [rx + rw, ry], [rx, ry + rh], [rx + rw, ry + rh]]) {
    ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs)
  }
  ctx.restore()
}
</script>

<style scoped>
.rs {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.rs__canvas-wrap {
  position: relative;
  background: #0a0a0a;
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
  color: #333;
  font-size: 0.8rem;
  text-align: center;
  padding: 1rem;
  pointer-events: none;
}

.rs__actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.rs__selected-hint {
  font-size: 0.8rem;
  color: #4ade80;
}

.rs__preview-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.rs__preview-label {
  font-size: 0.7rem;
  color: #444;
  letter-spacing: 0.04em;
}

.rs__preview {
  max-width: 100%;
  max-height: 72px;
  border-radius: 3px;
  border: 1px solid #222;
  display: block;
}

/* ── Fullscreen overlay ── */
.rs-fs {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: #000;
  cursor: crosshair;
}

.rs-fs__canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.rs-fs__hint {
  position: absolute;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.75);
  color: #ccc;
  padding: 0.5rem 1.25rem;
  border-radius: 99px;
  font-size: 0.875rem;
  pointer-events: none;
  white-space: nowrap;
  border: 1px solid #2a2a2a;
}

.rs-fs__hint kbd {
  background: #333;
  padding: 0.1rem 0.4rem;
  border-radius: 3px;
  font-family: inherit;
  font-size: 0.8rem;
}

/* shared btn styles (no scoped cascade from parent) */
.btn {
  padding: 0.6rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: opacity 0.15s;
}

.btn--sm {
  padding: 0.4rem 0.85rem;
  font-size: 0.8rem;
}

.btn:disabled { opacity: 0.35; cursor: not-allowed; }
.btn--primary { background: #4ade80; color: #000; }
.btn:not(:disabled):hover { opacity: 0.8; }
</style>
