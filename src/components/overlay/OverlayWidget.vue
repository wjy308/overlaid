<template>
  <div class="ow">

    <!-- 헤더: 컴팩트 레이드 선택기 -->
    <header class="ow__header">
      <RaidSelector :compact="true" />
    </header>

    <!-- HP + 타이머 수치 -->
    <div class="ow__values">
      <!-- HP -->
      <div class="ow__value-block">
        <span class="ow__value-label">HP</span>
        <span class="ow__value-num ow__value-num--hp">
          {{ detectedNumber ?? '—' }}
        </span>
        <span v-if="!isHpReady" class="ow__value-sub">초기화 중…</span>
        <span v-else-if="isDetecting && detectedNumber === null" class="ow__value-sub">인식 중…</span>
      </div>

      <!-- 구분선 (타이머 활성 시) -->
      <div v-if="isTimerDetecting" class="ow__divider" />

      <!-- 타이머 -->
      <div v-if="isTimerDetecting" class="ow__value-block">
        <span class="ow__value-label">광폭화</span>
        <span class="ow__value-num ow__value-num--timer" :class="{ 'ow__value-num--danger': isTimerLow }">
          {{ detectedTimeStr ?? '--:--:--' }}
        </span>
        <span v-if="!isTimerReady" class="ow__value-sub">초기화 중…</span>
      </div>
    </div>

    <!-- 공략 섹션 -->
    <div v-if="selectedGate" class="ow__guide">
      <div class="ow__guide-header">공략</div>

      <!-- HP 기반 기믹 -->
      <template v-if="selectedGate.hpPhases.length > 0">
        <div class="ow__section-label">HP 기준</div>
        <ul class="ow__phases">
          <li
            v-for="(phase, idx) in selectedGate.hpPhases"
            :key="'hp-' + idx"
            class="ow__phase"
            :class="hpPhaseClass(phase)"
          >
            <span class="ow__phase-val">{{ phase.at.toLocaleString() }}</span>
            <span class="ow__phase-label">{{ phase.label }}</span>
            <span v-if="isNextHpPhase(phase)" class="ow__phase-next">NEXT</span>
          </li>
        </ul>
      </template>

      <!-- 시간 기반 기믹 -->
      <template v-if="selectedGate.timePhases.length > 0">
        <div class="ow__section-label">시간 기준</div>
        <ul class="ow__phases">
          <li
            v-for="(phase, idx) in selectedGate.timePhases"
            :key="'t-' + idx"
            class="ow__phase"
            :class="timePhaseClass(phase)"
          >
            <span class="ow__phase-val">{{ secsToStr(phase.at) }}</span>
            <span class="ow__phase-label">
              {{ phase.label }}
              <span v-if="phase.repeat" class="ow__phase-repeat">↺ {{ phase.repeat }}초</span>
            </span>
            <span v-if="isNextTimePhase(phase)" class="ow__phase-next">NEXT</span>
          </li>
        </ul>
      </template>

      <!-- 둘 다 비어있으면 준비중 표시 -->
      <div
        v-if="selectedGate.hpPhases.length === 0 && selectedGate.timePhases.length === 0"
        class="ow__guide-pending"
      >
        <span class="ow__pending-dot" />
        공략 데이터 준비 중
      </div>
    </div>

    <div v-else class="ow__guide">
      <div class="ow__guide-header">공략</div>
      <div class="ow__guide-empty">레이드를 먼저 선택하세요</div>
    </div>

  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRaidStore } from '../../stores/raidStore.js'
import RaidSelector from '../RaidSelector.vue'

const props = defineProps({
  detectedNumber:  { type: Number,  default: null },
  isHpReady:       { type: Boolean, default: false },
  isDetecting:     { type: Boolean, default: false },
  detectedSeconds: { type: Number,  default: null },
  detectedTimeStr: { type: String,  default: null },
  isTimerReady:    { type: Boolean, default: false },
  isTimerDetecting:{ type: Boolean, default: false },
})

const { selectedGate } = useRaidStore()

// 남은 시간 3분 이하면 빨간색 경고
const isTimerLow = computed(() =>
  props.detectedSeconds !== null && props.detectedSeconds <= 180
)

// 초 → "m:ss" 문자열
function secsToStr(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

// ── HP 기반 페이즈 판별 ────────────────────────────────
// HP는 감소 → phase.at 이상이면 아직 도달 전(upcoming), 미만이면 통과
function isHpPassed(phase) {
  if (props.detectedNumber === null) return false
  return props.detectedNumber < phase.at
}

function isNextHpPhase(phase) {
  if (!selectedGate.value || props.detectedNumber === null) return false
  const upcoming = selectedGate.value.hpPhases.filter(p => props.detectedNumber >= p.at)
  if (!upcoming.length) return false
  const next = upcoming.reduce((a, b) => b.at > a.at ? b : a)
  return next.at === phase.at
}

function hpPhaseClass(phase) {
  if (isNextHpPhase(phase)) return 'ow__phase--next'
  if (isHpPassed(phase))    return 'ow__phase--passed'
  return ''
}

// ── 시간 기반 페이즈 판별 ─────────────────────────────
// 타이머는 카운트다운 → 현재 seconds > phase.at 이면 아직 도달 전
function isTimePassed(phase) {
  if (props.detectedSeconds === null) return false
  return props.detectedSeconds < phase.at
}

function isNextTimePhase(phase) {
  if (!selectedGate.value || props.detectedSeconds === null) return false
  // 아직 지나지 않은 것들 중 at 값이 가장 큰 것 (현재 시간에 가장 가까운 것)
  const upcoming = selectedGate.value.timePhases.filter(p => props.detectedSeconds > p.at)
  if (!upcoming.length) return false
  const next = upcoming.reduce((a, b) => b.at > a.at ? b : a)
  return next.at === phase.at
}

function timePhaseClass(phase) {
  if (isNextTimePhase(phase)) return 'ow__phase--next'
  if (isTimePassed(phase))    return 'ow__phase--passed'
  return ''
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
  padding: 0.6rem 0.75rem 0.5rem;
  border-bottom: 1px solid #1e1e1e;
  flex-shrink: 0;
}

/* ── 수치 영역 (HP + 타이머) ─────────────────────── */
.ow__values {
  display: flex;
  align-items: center;
  gap: 0;
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
</style>
