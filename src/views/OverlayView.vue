<template>
  <div class="overlay-view">
    <header class="overlay-view__header">
      <button class="btn btn--ghost" @click="$router.push('/')">← Back</button>
      <h2>Overlay <span class="game-badge">로스트아크</span></h2>
    </header>

    <main class="overlay-view__main">

      <!-- Step 1: 화면 캡처 -->
      <section class="card">
        <h3>1. 화면 캡처</h3>
        <template v-if="!isCapturing">
          <p class="hint">
            브라우저 제약상 화면 공유 허가가 필요해요.<br>
            대화상자에서 <strong>화면 전체(모니터)</strong>를 선택하세요.
          </p>
          <button class="btn btn--primary" @click="startCapture">캡처 시작</button>
        </template>
        <template v-else>
          <div class="status status--on">캡처 중</div>
          <button class="btn btn--danger" @click="handleStopCapture">캡처 중지</button>
        </template>
        <p v-if="captureError" class="error">{{ captureError }}</p>
      </section>

      <!-- Step 2: HP 숫자 영역 -->
      <section class="card" :class="{ 'card--disabled': !isCapturing }">
        <h3>2. HP 숫자 영역</h3>

        <div v-if="savedRegion" class="region-status">
          <span class="region-status__ok">✓ 저장된 영역 사용 중</span>
          <button class="btn btn--ghost btn--sm" @click="resetRegion">영역 재설정</button>
        </div>
        <p v-else class="hint">
          캡처 시작 직후 전체화면 모드가 열립니다.
          게임 화면에서 <strong>HP 숫자 (x999 부분)</strong>를 드래그로 선택하세요.
        </p>

        <div v-if="!isHpReady" class="init-banner">
          <span class="spinner" /> OCR 엔진 초기화 중… (최초 1회)
        </div>
        <p v-if="hpInitError" class="error">{{ hpInitError }}</p>

        <RegionSelector
          ref="hpSelectorRef"
          :video="video"
          :isCapturing="isCapturing"
          :initialRegion="savedRegion"
          @update:region="onHpRegionSelected"
        />

        <div v-if="isDetecting" class="live-row">
          <HpBar
            :detectedNumber="detectedNumber"
            :isReady="isHpReady"
            :isDetecting="isDetecting"
          />
        </div>
      </section>

      <!-- TODO: Step 3: 광폭화 타이머 영역 — 추후 개발 예정
      <section class="card" :class="{ 'card--disabled': !isCapturing }">
        <h3>
          3. 광폭화 타이머 영역
          <span class="badge-optional">선택사항</span>
        </h3>
        <p class="hint">
          보스 HP 바 아래 <strong>mm:ss 형식 타이머</strong>를 선택하면<br>
          시간 기반 기믹도 오버레이에 표시됩니다.
        </p>
        <div v-if="savedTimerRegion" class="region-status">
          <span class="region-status__ok">✓ 타이머 영역 설정됨</span>
          <button class="btn btn--ghost btn--sm" @click="resetTimerRegion">재설정</button>
        </div>
        <div v-if="!isTimerReady && savedTimerRegion" class="init-banner">
          <span class="spinner" /> 타이머 OCR 초기화 중…
        </div>
        <p v-if="timerInitError" class="error">{{ timerInitError }}</p>
        <div class="timer-actions">
          <button v-if="!savedTimerRegion" class="btn btn--ghost" :disabled="!isCapturing"
            @click="timerSelectorRef?.openFullscreen()">타이머 영역 선택</button>
          <div v-if="isTimerDetecting && detectedTimeStr" class="live-timer">
            <span class="live-timer__val">{{ detectedTimeStr }}</span>
            <span class="live-timer__label">광폭화</span>
          </div>
        </div>
        <RegionSelector ref="timerSelectorRef" :video="video" :isCapturing="isCapturing"
          :initialRegion="savedTimerRegion" @update:region="onTimerRegionSelected" />
      </section>
      -->

      <!-- Step 4: 레이드 선택 -->
      <section class="card">
        <h3>4. 레이드 선택</h3>
        <p class="hint">
          진행 중인 레이드와 관문을 선택하세요.
          오버레이 창에서도 언제든 변경할 수 있어요.
        </p>
        <RaidSelector />
      </section>

      <!-- Step 5: 공략 로직 테스트 -->
      <section class="card">
        <h3>
          5. 공략 미리보기
          <span class="badge-optional">테스트</span>
        </h3>
        <p class="hint">
          HP · 타이머 값을 직접 입력해서 공략 표시 로직을 확인하세요.<br>
          게임 없이도 페이즈 하이라이트가 올바른지 검증할 수 있어요.
        </p>

        <div class="preview-inputs">
          <label class="preview-input-group">
            <span>HP (줄)</span>
            <input
              class="preview-input"
              type="number"
              placeholder="예: 150"
              v-model.number="previewHp"
              min="0"
            />
          </label>
          <button class="btn btn--ghost btn--sm" @click="previewHp = null">
            초기화
          </button>
        </div>

        <div class="preview-widget">
          <OverlayWidget
            :detectedNumber="previewHp"
            :isHpReady="true"
            :isDetecting="previewHp !== null"
          />
        </div>
      </section>

      <!-- Step 6: 플로팅 오버레이 -->
      <section class="card" :class="{ 'card--disabled': !isDetecting }">
        <h3>6. 플로팅 오버레이</h3>
        <p v-if="!pip.isSupported" class="error">
          Document PiP 미지원 — Chrome 116+ 를 사용하세요.
        </p>
        <p v-else class="hint">
          게임 위에 항상 떠있는 창으로 HP · 타이머 · 공략을 표시합니다.
        </p>
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
import { ref, watch, nextTick, onMounted } from 'vue'
import { createApp, h } from 'vue'
import { useScreenCapture } from '../composables/useScreenCapture.js'
import { useOcrDetector } from '../composables/useOcrDetector.js'
// import { useTimerDetector } from '../composables/useTimerDetector.js'  // TODO: 타이머 개발 시 복구
import { useDocumentPiP } from '../composables/useDocumentPiP.js'
import HpBar from '../components/overlay/HpBar.vue'
import OverlayWidget from '../components/overlay/OverlayWidget.vue'
import RegionSelector from '../components/RegionSelector.vue'
import RaidSelector from '../components/RaidSelector.vue'

const HP_REGION_KEY = 'overlaid_region_v1'
// const TIMER_REGION_KEY = 'overlaid_timer_region_v1'  // TODO: 타이머 개발 시 복구

const { isCapturing, error: captureError, startCapture, stopCapture, captureRegion, video } = useScreenCapture()

// HP OCR (Lost Ark: 'x999' 형식)
const {
  detectedNumber, isDetecting, isReady: isHpReady,
  initError: hpInitError, region: hpRegion,
  start: startHpDetection, stop: stopHpDetection,
} = useOcrDetector({ hpPrefix: 'x' })

// TODO: 타이머 OCR — 추후 개발 예정
// const {
//   detectedSeconds, detectedTimeStr, isDetecting: isTimerDetecting,
//   isReady: isTimerReady, initError: timerInitError, region: timerRegion,
//   start: startTimerDetection, stop: stopTimerDetection,
// } = useTimerDetector()

const pip = useDocumentPiP()
const hpSelectorRef    = ref(null)
// const timerSelectorRef = ref(null)  // TODO: 타이머 개발 시 복구
const savedRegion      = ref(null)
// const savedTimerRegion = ref(null)  // TODO: 타이머 개발 시 복구

// ── 공략 미리보기 테스트용 ────────────────────────────
const previewHp = ref(null)

// ── localStorage 복원 ────────────────────────────────
onMounted(() => {
  try {
    const raw = localStorage.getItem(HP_REGION_KEY)
    if (raw) {
      const r = JSON.parse(raw)
      savedRegion.value = r
      Object.assign(hpRegion, r)
    }
  } catch {}

  // TODO: 타이머 영역 복원 — 추후 개발 예정
  // try {
  //   const raw = localStorage.getItem(TIMER_REGION_KEY)
  //   if (raw) { const r = JSON.parse(raw); savedTimerRegion.value = r; Object.assign(timerRegion, r) }
  // } catch {}
})

// ── 캡처 시작 → 자동 흐름 ──────────────────────────
watch(isCapturing, (active) => {
  if (!active) return
  nextTick(() => {
    setTimeout(() => {
      if (savedRegion.value) {
        startHpDetection(captureRegion)
        // TODO: if (savedTimerRegion.value) startTimerDetection(captureRegion)
      } else {
        hpSelectorRef.value?.openFullscreen()
      }
    }, 400)
  })
})

// ── HP 영역 핸들러 ──────────────────────────────────
function onHpRegionSelected(r) {
  Object.assign(hpRegion, r)
  savedRegion.value = r
  localStorage.setItem(HP_REGION_KEY, JSON.stringify(r))
  stopHpDetection()
  startHpDetection(captureRegion)
}

function resetRegion() {
  localStorage.removeItem(HP_REGION_KEY)
  savedRegion.value = null
  stopHpDetection()
  nextTick(() => hpSelectorRef.value?.openFullscreen())
}

// TODO: 타이머 영역 핸들러 — 추후 개발 예정
// function onTimerRegionSelected(r) {
//   Object.assign(timerRegion, r); savedTimerRegion.value = r
//   localStorage.setItem(TIMER_REGION_KEY, JSON.stringify(r))
//   stopTimerDetection(); startTimerDetection(captureRegion)
// }
// function resetTimerRegion() {
//   localStorage.removeItem(TIMER_REGION_KEY); savedTimerRegion.value = null; stopTimerDetection()
// }

// ── 전체 중지 ───────────────────────────────────────
function handleStopCapture() {
  stopHpDetection()
  // stopTimerDetection()  // TODO: 타이머 개발 시 복구
  pip.close()
  stopCapture()
}

// ── PiP 오버레이 ────────────────────────────────────
async function openPiP() {
  const win = await pip.open(300, 420)
  if (!win) return

  win.document.body.style.cssText = 'margin:0;padding:0;background:#0f0f0f;'
  const container = win.document.createElement('div')
  win.document.body.appendChild(container)

  const pipApp = createApp({
    setup() {
      return () => h(OverlayWidget, {
        detectedNumber: detectedNumber.value,
        isHpReady:      isHpReady.value,
        isDetecting:    isDetecting.value,
        // TODO: 타이머 props — 추후 개발 예정
        // detectedSeconds: detectedSeconds.value,
        // detectedTimeStr: detectedTimeStr.value,
        // isTimerReady: isTimerReady.value,
        // isTimerDetecting: isTimerDetecting.value,
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

.overlay-view__header { display: flex; align-items: center; gap: 0.75rem; }
.overlay-view__header h2 { margin: 0; display: flex; align-items: center; gap: 0.5rem; }

.game-badge {
  font-size: 0.65rem;
  font-weight: 600;
  background: #1e3a5f;
  color: #60a5fa;
  padding: 0.2rem 0.5rem;
  border-radius: 99px;
  letter-spacing: 0.03em;
}

.badge-optional {
  font-size: 0.6rem;
  font-weight: 500;
  background: #1f2a1f;
  color: #4a7a4a;
  padding: 0.15rem 0.45rem;
  border-radius: 99px;
  vertical-align: middle;
  margin-left: 0.4rem;
}

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

.region-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.region-status__ok { font-size: 0.8rem; color: #4ade80; }

.timer-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.live-timer {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  padding: 0.3rem 0.75rem;
  background: #111;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
}

.live-timer__val {
  font-size: 1.2rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: #fbbf24;
  letter-spacing: -0.02em;
}

.live-timer__label {
  font-size: 0.68rem;
  color: #555;
}

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
.btn--sm { padding: 0.3rem 0.65rem; font-size: 0.75rem; }
.btn:disabled { opacity: 0.4; cursor: not-allowed; }
.btn--primary  { background: #4ade80; color: #000; }
.btn--danger   { background: #f87171; color: #000; }
.btn--ghost    { background: transparent; color: #888; border: 1px solid #333; }
.btn:not(:disabled):hover { opacity: 0.8; }

/* ── 공략 미리보기 ─────────────────────────────────── */
.preview-inputs {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.preview-input-group {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.72rem;
  color: #666;
}

.preview-input {
  width: 100px;
  padding: 0.4rem 0.6rem;
  background: #111;
  border: 1px solid #333;
  border-radius: 6px;
  color: #eee;
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
  outline: none;
  transition: border-color 0.15s;
}

.preview-input:focus { border-color: #4ade80; }
.preview-input::placeholder { color: #333; }

.preview-widget {
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  overflow: hidden;
  width: 300px;
  min-height: 200px;
}
</style>
