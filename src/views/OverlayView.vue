<template>
  <div class="overlay-view">
    <header class="overlay-view__header">
      <button class="btn btn--ghost" @click="$router.push('/')">← Back</button>
      <h2>Overlay</h2>
    </header>

    <main class="overlay-view__main">
      <!-- Step 1: Screen capture -->
      <section class="card">
        <h3>1. Screen Capture</h3>
        <p v-if="!isCapturing" class="hint">게임 창 또는 화면을 선택하세요.</p>
        <div v-else class="status status--on">Capturing</div>
        <button v-if="!isCapturing" class="btn btn--primary" @click="startCapture">
          Start Capture
        </button>
        <button v-else class="btn btn--danger" @click="handleStopCapture">
          Stop Capture
        </button>
        <p v-if="captureError" class="error">{{ captureError }}</p>
      </section>

      <!-- Step 2: Region selection -->
      <section class="card" :class="{ 'card--disabled': !isCapturing }">
        <h3>2. HP 바 영역 선택</h3>
        <p class="hint">드래그로 HP 바 위치를 선택하세요.</p>

        <RegionSelector
          :video="video"
          :isCapturing="isCapturing"
          @update:region="onRegionSelected"
        />
      </section>

      <!-- Step 3: Line count config -->
      <section class="card" :class="{ 'card--disabled': !regionSelected }">
        <h3>3. 줄 수 설정</h3>

        <div class="line-config">
          <label class="line-config__label">
            총 줄 수
            <input
              v-model.number="totalLines"
              type="number"
              min="1"
              placeholder="예: 900"
              class="input-num"
            />
            <span class="hint">게임 공략 또는 보스 정보에서 총 피통 줄 수를 확인하세요</span>
          </label>
        </div>

        <!-- Detection toggle -->
        <div class="detect-row">
          <button
            class="btn btn--secondary"
            :disabled="!regionSelected || totalLines < 1"
            @click="toggleDetection"
          >
            {{ isDetecting ? 'Stop Detection' : 'Start Detection' }}
          </button>

          <!-- Live preview -->
          <div v-if="isDetecting" class="live-preview">
            <HpBar
              :fillRatio="fillRatio"
              :currentLines="currentLines"
              :totalLines="totalLines"
            />
          </div>
        </div>
      </section>

      <!-- Step 4: Document PiP -->
      <section class="card" :class="{ 'card--disabled': !isDetecting }">
        <h3>4. 플로팅 오버레이 (Document PiP)</h3>
        <p v-if="!pip.isSupported" class="error">
          Document PiP 미지원 브라우저입니다. Chrome 116+ 를 사용하세요.
        </p>
        <p v-else class="hint">게임 위에 떠있는 창으로 현재 줄 수를 표시합니다.</p>

        <button
          v-if="!pip.isOpen.value"
          class="btn btn--primary"
          :disabled="!pip.isSupported || !isDetecting"
          @click="openPiP"
        >
          Open Floating Overlay
        </button>
        <button v-else class="btn btn--danger" @click="pip.close">
          Close Overlay
        </button>
        <p v-if="pip.error.value" class="error">{{ pip.error.value }}</p>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { createApp, h } from 'vue'
import { useScreenCapture } from '../composables/useScreenCapture.js'
import { useLineDetector } from '../composables/useLineDetector.js'
import { useDocumentPiP } from '../composables/useDocumentPiP.js'
import HpBar from '../components/overlay/HpBar.vue'
import RegionSelector from '../components/RegionSelector.vue'

const { isCapturing, error: captureError, startCapture, stopCapture, captureRegion, video } = useScreenCapture()
const {
  fillRatio, currentLines, totalLines,
  isDetecting, region, start: startDetection, stop: stopDetection,
} = useLineDetector()
const pip = useDocumentPiP()

const regionSelected = ref(false)

function onRegionSelected(r) {
  Object.assign(region, r)
  regionSelected.value = true
}


function handleStopCapture() {
  stopDetection()
  pip.close()
  stopCapture()
  regionSelected.value = false
}

function toggleDetection() {
  if (isDetecting.value) {
    stopDetection()
  } else {
    startDetection(captureRegion)
  }
}

async function openPiP() {
  const win = await pip.open(280, 90)
  if (!win) return

  const container = win.document.createElement('div')
  container.style.cssText = 'margin:0;padding:8px;background:#111;min-height:100vh'
  win.document.body.style.margin = '0'
  win.document.body.appendChild(container)

  const pipApp = createApp({
    setup() {
      return () => h(HpBar, {
        fillRatio: fillRatio.value,
        currentLines: currentLines.value,
        totalLines: totalLines.value,
      })
    },
  })

  pipApp.mount(container)

  watch([fillRatio, currentLines], () => {
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

.overlay-view__header {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.overlay-view__header h2 { margin: 0; }

.overlay-view__main {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card {
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.card--disabled {
  opacity: 0.5;
  pointer-events: none;
}

.card h3 {
  margin: 0;
  font-size: 0.95rem;
  color: #ccc;
}

.hint {
  color: #666;
  font-size: 0.8rem;
  margin: 0;
}

.status--on {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: #4ade80;
}

.status--on::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4ade80;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1 }
  50% { opacity: 0.3 }
}

.line-config {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.line-config__label {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: #888;
}

.line-config__row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.input-num {
  width: 100px;
  background: #111;
  border: 1px solid #333;
  border-radius: 4px;
  color: #eee;
  padding: 0.35rem 0.5rem;
  font-size: 0.875rem;
}

.input-num:focus {
  outline: none;
  border-color: #4ade80;
}

.detect-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.live-preview {
  flex: 1;
  min-width: 0;
}

.error {
  color: #f87171;
  font-size: 0.8rem;
  margin: 0;
}

.btn {
  padding: 0.6rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: opacity 0.15s;
  align-self: flex-start;
  white-space: nowrap;
}

.btn--sm {
  padding: 0.35rem 0.65rem;
  font-size: 0.8rem;
}

.btn:disabled { opacity: 0.4; cursor: not-allowed; }
.btn--primary  { background: #4ade80; color: #000; }
.btn--secondary { background: #3b82f6; color: #fff; }
.btn--danger   { background: #f87171; color: #000; }
.btn--ghost    { background: transparent; color: #888; border: 1px solid #333; }
.btn:not(:disabled):hover { opacity: 0.8; }
</style>
