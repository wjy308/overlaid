<template>
  <div class="overlay-view">
    <header class="overlay-view__header">
      <button class="btn btn--ghost" @click="$router.push('/')">← Back</button>
      <h2>Overlay</h2>
    </header>

    <main class="overlay-view__main">
      <!-- Step 1: Screen capture -->
      <section class="card">
        <h3>1. 화면 캡처</h3>
        <template v-if="!isCapturing">
          <p class="hint">
            브라우저 제약상 화면 공유 허가가 필요해요.<br>
            대화상자에서 <strong>화면 전체(모니터)</strong>를 선택하면
            HP 숫자 위치를 바로 지정할 수 있어요.
          </p>
          <button class="btn btn--primary" @click="startCapture">캡처 시작</button>
        </template>
        <template v-else>
          <div class="status status--on">캡처 중</div>
          <button class="btn btn--danger" @click="handleStopCapture">캡처 중지</button>
        </template>
        <p v-if="captureError" class="error">{{ captureError }}</p>
      </section>

      <!-- Step 2: Region selection + live OCR -->
      <section class="card" :class="{ 'card--disabled': !isCapturing }">
        <h3>2. HP 숫자 영역 선택</h3>
        <p class="hint">
          캡처 시작 직후 전체화면 모드가 열립니다.
          게임 화면에서 <strong>HP 숫자가 표시되는 부분만</strong> 드래그로 선택하세요.
        </p>

        <div v-if="!isReady" class="init-banner">
          <span class="spinner" /> OCR 엔진 초기화 중… (최초 1회)
        </div>
        <p v-if="initError" class="error">{{ initError }}</p>

        <RegionSelector
          ref="regionSelectorRef"
          :video="video"
          :isCapturing="isCapturing"
          @update:region="onRegionSelected"
        />

        <!-- Live OCR preview -->
        <div v-if="isDetecting" class="live-row">
          <HpBar
            :detectedNumber="detectedNumber"
            :isReady="isReady"
            :isDetecting="isDetecting"
          />
        </div>
      </section>

      <!-- Step 3: Floating overlay -->
      <section class="card" :class="{ 'card--disabled': !isDetecting }">
        <h3>3. 플로팅 오버레이</h3>
        <p v-if="!pip.isSupported" class="error">
          Document PiP 미지원 — Chrome 116+ 를 사용하세요.
        </p>
        <p v-else class="hint">게임 위에 항상 떠있는 창으로 HP 숫자를 표시합니다.</p>
        <button v-if="!pip.isOpen.value" class="btn btn--primary"
          :disabled="!pip.isSupported || !isDetecting" @click="openPiP">
          오버레이 열기
        </button>
        <button v-else class="btn btn--danger" @click="pip.close">오버레이 닫기</button>
        <p v-if="pip.error.value" class="error">{{ pip.error.value }}</p>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { createApp, h } from 'vue'
import { useScreenCapture } from '../composables/useScreenCapture.js'
import { useOcrDetector } from '../composables/useOcrDetector.js'
import { useDocumentPiP } from '../composables/useDocumentPiP.js'
import HpBar from '../components/overlay/HpBar.vue'
import RegionSelector from '../components/RegionSelector.vue'

const { isCapturing, error: captureError, startCapture, stopCapture, captureRegion, video } = useScreenCapture()
const { detectedNumber, isDetecting, isReady, initError, region, start: startDetection, stop: stopDetection } = useOcrDetector()
const pip = useDocumentPiP()

const regionSelectorRef = ref(null)

// Auto-open fullscreen selector when capture starts
watch(isCapturing, (active) => {
  if (active) {
    nextTick(() => setTimeout(() => regionSelectorRef.value?.openFullscreen(), 400))
  }
})

function onRegionSelected(r) {
  Object.assign(region, r)
  stopDetection()
  startDetection(captureRegion)
}

function handleStopCapture() {
  stopDetection()
  pip.close()
  stopCapture()
}

async function openPiP() {
  const win = await pip.open(200, 100)
  if (!win) return

  const container = win.document.createElement('div')
  container.style.cssText = 'margin:0;padding:12px;background:#111;min-height:100vh;display:flex;align-items:center'
  win.document.body.style.margin = '0'
  win.document.body.appendChild(container)

  const pipApp = createApp({
    setup() {
      return () => h(HpBar, {
        detectedNumber: detectedNumber.value,
        isReady: isReady.value,
        isDetecting: isDetecting.value,
      })
    },
  })
  pipApp.mount(container)

  watch([detectedNumber, isDetecting], () => {
    pipApp._instance?.update()
  })
}
</script>

<style scoped>
.overlay-view {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  gap: 1.5rem;
  max-width: 640px;
  margin: 0 auto;
}

.overlay-view__header { display: flex; align-items: center; gap: 1rem; }
.overlay-view__header h2 { margin: 0; }
.overlay-view__main { display: flex; flex-direction: column; gap: 1rem; }

.card {
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.card--disabled { opacity: 0.5; pointer-events: none; }
.card h3 { margin: 0; font-size: 0.95rem; color: #ccc; }

.hint { color: #666; font-size: 0.8rem; margin: 0; line-height: 1.6; }
.hint strong { color: #aaa; }

.init-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: #888;
  padding: 0.5rem 0.75rem;
  background: #111;
  border-radius: 6px;
  border: 1px solid #2a2a2a;
}

.spinner {
  width: 12px; height: 12px;
  border: 2px solid #333;
  border-top-color: #4ade80;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

@keyframes spin { to { transform: rotate(360deg) } }

.status--on {
  display: inline-flex; align-items: center; gap: 0.4rem;
  font-size: 0.8rem; color: #4ade80;
}
.status--on::before {
  content: ''; width: 8px; height: 8px; border-radius: 50%;
  background: #4ade80; animation: pulse 1.5s infinite;
}
@keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.3 } }

.live-row { display: flex; align-items: center; gap: 0.75rem; }

.error { color: #f87171; font-size: 0.8rem; margin: 0; }

.btn {
  padding: 0.6rem 1rem; border-radius: 6px; font-size: 0.875rem;
  font-weight: 600; cursor: pointer; border: none;
  transition: opacity 0.15s; align-self: flex-start;
}
.btn:disabled { opacity: 0.4; cursor: not-allowed; }
.btn--primary  { background: #4ade80; color: #000; }
.btn--danger   { background: #f87171; color: #000; }
.btn--ghost    { background: transparent; color: #888; border: 1px solid #333; }
.btn:not(:disabled):hover { opacity: 0.8; }
</style>
