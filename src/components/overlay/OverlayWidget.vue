<template>
  <div class="ow">

    <!-- 헤더: 레이드 선택 + 뷰 모드 토글 -->
    <header class="ow__header">
      <RaidSelector :compact="true" />
      <div class="ow__mode-toggle">
        <button
          class="ow__mode-btn"
          :class="{ 'ow__mode-btn--active': viewMode === 'simple' }"
          @click="setViewMode('simple')"
        >간단</button>
        <button
          class="ow__mode-btn"
          :class="{ 'ow__mode-btn--active': viewMode === 'detail' }"
          @click="setViewMode('detail')"
        >상세</button>
      </div>
    </header>

    <!-- HP + 타이머 수치 -->
    <div class="ow__values">
      <div class="ow__value-block">
        <span class="ow__value-label">HP</span>
        <span class="ow__value-num ow__value-num--hp">{{ detectedNumber ?? '—' }}</span>
        <span v-if="!isHpReady" class="ow__value-sub">초기화 중…</span>
        <span v-else-if="isDetecting && detectedNumber === null" class="ow__value-sub">인식 중…</span>
      </div>

      <div v-if="isTimerDetecting" class="ow__divider" />

      <div v-if="isTimerDetecting" class="ow__value-block">
        <span class="ow__value-label">광폭화</span>
        <span class="ow__value-num ow__value-num--timer" :class="{ 'ow__value-num--danger': isTimerLow }">
          {{ detectedTimeStr ?? '--:--:--' }}
        </span>
        <span v-if="!isTimerReady" class="ow__value-sub">초기화 중…</span>
      </div>
    </div>

    <!-- 공략 섹션 -->
    <div v-if="selectedGate" ref="guideRef" class="ow__guide">
      <div class="ow__guide-header">공략</div>

      <!-- HP 기반 기믹 -->
      <template v-if="selectedGate.hpPhases.length > 0">
        <div class="ow__section-label">HP 기준</div>
        <ul class="ow__phases">
          <template v-for="(phase, idx) in selectedGate.hpPhases" :key="'hp-' + idx">
            <!-- 페이즈 행 -->
            <li
              class="ow__phase"
              :class="[hpPhaseClass(phase), hasExpandableSteps(phase, 'hp-' + idx) ? 'ow__phase--expandable' : '']"
              @click="onPhaseClick(phase, 'hp-' + idx)"
            >
              <span class="ow__phase-val">{{ phase.at.toLocaleString() }}</span>
              <span class="ow__phase-label">{{ phase.label }}</span>
              <span v-if="isNextHpPhase(phase)" class="ow__phase-next">NEXT</span>
              <!-- 간단 모드 + steps 있으면 펼치기 아이콘 -->
              <span
                v-if="viewMode === 'simple' && isNextHpPhase(phase) && phase.steps?.length"
                class="ow__phase-expand"
              >{{ expandedKey === 'hp-' + idx ? '▴' : '▾' }}</span>
            </li>
            <!-- steps: 상세 모드는 NEXT면 항상, 간단 모드는 클릭 시만 -->
            <li
              v-if="shouldShowSteps(phase, 'hp-' + idx, isNextHpPhase(phase))"
              class="ow__steps"
            >
              <ol>
                <li v-for="(step, si) in phase.steps" :key="si">{{ step }}</li>
              </ol>
            </li>
          </template>
        </ul>
      </template>

      <!-- 시간 기반 기믹 -->
      <template v-if="selectedGate.timePhases.length > 0">
        <div class="ow__section-label">시간 기준</div>
        <ul class="ow__phases">
          <template v-for="(phase, idx) in selectedGate.timePhases" :key="'t-' + idx">
            <li
              class="ow__phase"
              :class="[timePhaseClass(phase), hasExpandableSteps(phase, 't-' + idx) ? 'ow__phase--expandable' : '']"
              @click="onPhaseClick(phase, 't-' + idx)"
            >
              <span class="ow__phase-val">{{ secsToStr(phase.at) }}</span>
              <span class="ow__phase-label">
                {{ phase.label }}
                <span v-if="phase.repeat" class="ow__phase-repeat">↺ {{ phase.repeat }}초</span>
              </span>
              <span v-if="isNextTimePhase(phase)" class="ow__phase-next">NEXT</span>
              <span
                v-if="viewMode === 'simple' && isNextTimePhase(phase) && phase.steps?.length"
                class="ow__phase-expand"
              >{{ expandedKey === 't-' + idx ? '▴' : '▾' }}</span>
            </li>
            <li
              v-if="shouldShowSteps(phase, 't-' + idx, isNextTimePhase(phase))"
              class="ow__steps"
            >
              <ol>
                <li v-for="(step, si) in phase.steps" :key="si">{{ step }}</li>
              </ol>
            </li>
          </template>
        </ul>
      </template>

      <!-- 둘 다 비어있으면 준비중 -->
      <div
        v-if="selectedGate.hpPhases.length === 0 && selectedGate.timePhases.length === 0"
        class="ow__guide-pending"
      >
        <span class="ow__pending-dot" />
        공략 데이터 준비 중
      </div>
    </div>

    <div v-else ref="guideRef" class="ow__guide">
      <div class="ow__guide-header">공략</div>
      <div class="ow__guide-empty">레이드를 먼저 선택하세요</div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import { useRaidStore } from '../../stores/raidStore.js'
import RaidSelector from '../RaidSelector.vue'

const props = defineProps({
  detectedNumber:   { type: Number,  default: null },
  isHpReady:        { type: Boolean, default: false },
  isDetecting:      { type: Boolean, default: false },
  detectedSeconds:  { type: Number,  default: null },
  detectedTimeStr:  { type: String,  default: null },
  isTimerReady:     { type: Boolean, default: false },
  isTimerDetecting: { type: Boolean, default: false },
})

const { selectedGate, viewMode, setViewMode } = useRaidStore()

const guideRef = ref(null)

// 페이즈 판별에 사용하는 안정화된 HP값 — 500ms 디바운스
// 빠르게 줄이 빠질 때 중간값에서 페이즈가 흔들리는 현상 방지
const stableHp = ref(props.detectedNumber)
let hpDebounceTimer = null
watch(() => props.detectedNumber, (val) => {
  clearTimeout(hpDebounceTimer)
  hpDebounceTimer = setTimeout(() => { stableHp.value = val }, 500)
})
onUnmounted(() => clearTimeout(hpDebounceTimer))

// 간단 모드에서 임시로 펼쳐진 페이즈 키 (stableHp 바뀌면 초기화)
const expandedKey = ref(null)

watch(stableHp, () => { expandedKey.value = null })
watch(() => props.detectedSeconds, () => { expandedKey.value = null })

const isTimerLow = computed(() =>
  props.detectedSeconds !== null && props.detectedSeconds <= 180
)

function secsToStr(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

// ── HP 기반 페이즈 판별 (stableHp 기준) ───────────
function isHpPassed(phase) {
  if (stableHp.value === null) return false
  return stableHp.value < phase.at
}

// 현재 NEXT 페이즈의 at 값 (스크롤 트리거용)
const nextHpAt = computed(() => {
  if (!selectedGate.value || stableHp.value === null) return null
  const upcoming = selectedGate.value.hpPhases.filter(p => stableHp.value >= p.at)
  if (!upcoming.length) return null
  return upcoming.reduce((a, b) => b.at > a.at ? b : a).at
})

function isNextHpPhase(phase) {
  return nextHpAt.value === phase.at
}

function hpPhaseClass(phase) {
  if (isNextHpPhase(phase)) return 'ow__phase--next'
  if (isHpPassed(phase))    return 'ow__phase--passed'
  return ''
}

// NEXT 페이즈가 바뀌면 해당 항목으로 자동 스크롤
watch(nextHpAt, () => {
  nextTick(() => {
    guideRef.value?.querySelector('.ow__phase--next')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
})

// ── 시간 기반 페이즈 판별 ─────────────────────────
function isTimePassed(phase) {
  if (props.detectedSeconds === null) return false
  return props.detectedSeconds < phase.at
}

// 현재 NEXT 시간 페이즈의 at 값 (스크롤 트리거용)
const nextTimeAt = computed(() => {
  if (!selectedGate.value || props.detectedSeconds === null) return null
  const upcoming = selectedGate.value.timePhases.filter(p => props.detectedSeconds >= p.at)
  if (!upcoming.length) return null
  return upcoming.reduce((a, b) => b.at > a.at ? b : a).at
})

function isNextTimePhase(phase) {
  return nextTimeAt.value === phase.at
}

function timePhaseClass(phase) {
  if (isNextTimePhase(phase)) return 'ow__phase--next'
  if (isTimePassed(phase))    return 'ow__phase--passed'
  return ''
}

// NEXT 시간 페이즈가 바뀌면 해당 항목으로 자동 스크롤
watch(nextTimeAt, () => {
  nextTick(() => {
    guideRef.value?.querySelector('.ow__phase--next')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
})

// ── steps 표시 여부 ────────────────────────────────
// 상세 모드: NEXT면 항상
// 간단 모드: NEXT이고 명시적으로 펼친 경우에만
function shouldShowSteps(phase, key, isNext) {
  if (!phase.steps?.length || !isNext) return false
  if (viewMode.value === 'detail') return true
  return expandedKey.value === key
}

function hasExpandableSteps(phase, key) {
  const isNext = key.startsWith('hp-')
    ? isNextHpPhase(phase)
    : isNextTimePhase(phase)
  return viewMode.value === 'simple' && isNext && phase.steps?.length > 0
}

function onPhaseClick(phase, key) {
  if (!hasExpandableSteps(phase, key)) return
  expandedKey.value = expandedKey.value === key ? null : key
}
</script>

<style scoped>
.ow {
  display: flex;
  flex-direction: column;
  background: #0f0f0f;
  min-height: 100vh;
  color: #eee;
  font-family: inherit;
}

/* ── 헤더 ─────────────────────────────────────────── */
.ow__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.6rem 0.75rem 0.5rem;
  border-bottom: 1px solid #1e1e1e;
  flex-shrink: 0;
}

/* ── 뷰 모드 토글 ─────────────────────────────────── */
.ow__mode-toggle {
  display: flex;
  gap: 0.15rem;
  background: #111;
  border: 1px solid #222;
  border-radius: 6px;
  padding: 0.15rem;
  flex-shrink: 0;
}

.ow__mode-btn {
  padding: 0.2rem 0.55rem;
  border-radius: 4px;
  border: none;
  background: none;
  color: #444;
  font-size: 0.65rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
  white-space: nowrap;
}

.ow__mode-btn--active {
  background: #1e1e1e;
  color: #ccc;
}

/* ── 수치 영역 ────────────────────────────────────── */
.ow__values {
  display: flex;
  align-items: center;
  padding: 0.55rem 0.75rem;
  border-bottom: 1px solid #1e1e1e;
  flex-shrink: 0;
}

.ow__value-block {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  flex: 1;
}

.ow__divider {
  width: 1px;
  height: 2.4rem;
  background: #1e1e1e;
  margin: 0 0.75rem;
  flex-shrink: 0;
}

.ow__value-label {
  font-size: 0.55rem;
  font-weight: 700;
  color: #3a3a3a;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.ow__value-num {
  font-size: 1.8rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.03em;
  line-height: 1;
}

.ow__value-num--hp    { color: #fff; }
.ow__value-num--timer { color: #fbbf24; }
.ow__value-num--danger{ color: #f87171 !important; }

.ow__value-sub {
  font-size: 0.6rem;
  color: #3a3a3a;
}

/* ── 공략 ─────────────────────────────────────────── */
.ow__guide {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0.5rem 0.75rem;
  gap: 0.3rem;
  overflow-y: auto;
}

.ow__guide-header {
  font-size: 0.58rem;
  font-weight: 700;
  color: #333;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 0.1rem;
}

.ow__section-label {
  font-size: 0.58rem;
  color: #333;
  margin-top: 0.3rem;
  padding-bottom: 0.15rem;
  border-bottom: 1px solid #1a1a1a;
}

.ow__guide-empty,
.ow__guide-pending {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.72rem;
  color: #2a2a2a;
  padding: 0.3rem 0;
}

.ow__pending-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #1e1e1e;
  border: 1px dashed #2a2a2a;
  flex-shrink: 0;
}

/* ── 페이즈 목록 ──────────────────────────────────── */
.ow__phases {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.ow__phase {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.25rem 0.35rem;
  border-radius: 4px;
  border: 1px solid transparent;
  font-size: 0.72rem;
  transition: background 0.1s;
}

.ow__phase--expandable { cursor: pointer; }
.ow__phase--expandable:hover { background: rgba(255,255,255,0.02); }

.ow__phase-val {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  color: #444;
  min-width: 2.5rem;
  text-align: right;
  flex-shrink: 0;
}

.ow__phase-label {
  color: #444;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.ow__phase-repeat {
  font-size: 0.6rem;
  color: #333;
}

/* 통과한 페이즈 */
.ow__phase--passed .ow__phase-val,
.ow__phase--passed .ow__phase-label {
  color: #222;
  text-decoration: line-through;
  text-decoration-color: #222;
}

/* 다음 페이즈 강조 */
.ow__phase--next {
  background: rgba(74, 222, 128, 0.06);
  border-color: rgba(74, 222, 128, 0.18);
}

.ow__phase--next .ow__phase-val   { color: #4ade80; }
.ow__phase--next .ow__phase-label { color: #ccc; }

.ow__phase-next {
  font-size: 0.52rem;
  font-weight: 700;
  color: #4ade80;
  letter-spacing: 0.06em;
  opacity: 0.7;
  flex-shrink: 0;
}

.ow__phase-expand {
  font-size: 0.6rem;
  color: #4ade80;
  opacity: 0.5;
  flex-shrink: 0;
}

/* ── 단계별 공략 ──────────────────────────────────── */
.ow__steps {
  list-style: none;
  padding: 0.3rem 0 0.4rem 1rem;
  margin: 0;
  border-left: 2px solid rgba(74, 222, 128, 0.2);
  margin-left: 0.35rem;
  margin-bottom: 0.2rem;
}

.ow__steps ol {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  counter-reset: step-counter;
}

.ow__steps ol li {
  display: flex;
  gap: 0.4rem;
  font-size: 0.72rem;
  color: #bbb;
  line-height: 1.4;
  counter-increment: step-counter;
}

.ow__steps ol li::before {
  content: counter(step-counter) '.';
  color: #4ade80;
  font-size: 0.65rem;
  font-weight: 700;
  flex-shrink: 0;
  min-width: 1rem;
  opacity: 0.7;
}
</style>
