<template>
  <!-- 풀 모드: 설정 페이지용 카드 그리드 -->
  <div v-if="!compact" class="rs-full">
    <!-- 선택 요약 -->
    <div v-if="selectedRaid" class="rs-full__summary">
      <span class="rs-full__summary-name">{{ selectedRaid.name }}</span>
      <span class="rs-full__summary-gate">{{ selectedGate?.name }}</span>
      <span class="rs-full__summary-phase">
        공략: {{ selectedGate?.hpPhases.length ? selectedGate.hpPhases.length + '개 페이즈' : 'DB 연결 예정' }}
      </span>
    </div>
    <p v-else class="rs-full__hint">레이드를 선택하면 오버레이에 공략이 표시됩니다.</p>
    <div class="rs-full__grid">
      <button
        v-for="raid in RAIDS"
        :key="raid.id"
        class="rs-full__card"
        :class="{ 'rs-full__card--active': state.raidId === raid.id }"
        @click="selectRaid(raid.id)"
      >
        <span class="rs-full__name">{{ raid.name }}</span>
        <span class="rs-full__tier">T{{ raid.tier }}</span>
      </button>
    </div>

    <!-- 선택된 레이드의 관문 선택 -->
    <div v-if="selectedRaid" class="rs-full__gates">
      <button
        v-for="(gate, idx) in selectedRaid.gates"
        :key="gate.id"
        class="rs-full__gate"
        :class="{ 'rs-full__gate--active': state.gateIdx === idx }"
        @click="selectGate(idx)"
      >
        {{ gate.name }}
      </button>
    </div>
  </div>

  <!-- 컴팩트 모드: PiP 창 내부용 드롭다운 -->
  <div v-else class="rs-compact" ref="rootRef">
    <div class="rs-compact__bar">
      <!-- 레이드 이름 토글 버튼 -->
      <button class="rs-compact__raid-btn" @click="toggleDropdown">
        {{ selectedRaid?.name ?? '레이드 선택' }}
        <span class="rs-compact__arrow" :class="{ 'rs-compact__arrow--open': open }">▾</span>
      </button>
      <!-- 관문 버튼들 -->
      <div v-if="selectedRaid" class="rs-compact__gates">
        <button
          v-for="(gate, idx) in selectedRaid.gates"
          :key="gate.id"
          class="rs-compact__gate"
          :class="{ 'rs-compact__gate--active': state.gateIdx === idx }"
          @click="selectGate(idx)"
        >
          {{ gate.name.replace('관문', '') }}관
        </button>
      </div>
    </div>

    <!-- 드롭다운 목록 -->
    <div v-if="open" class="rs-compact__dropdown">
      <button
        v-for="raid in RAIDS"
        :key="raid.id"
        class="rs-compact__item"
        :class="{ 'rs-compact__item--active': state.raidId === raid.id }"
        @click="onPickRaid(raid.id)"
      >
        {{ raid.name }}
        <span class="rs-compact__item-tier">T{{ raid.tier }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRaidStore } from '../stores/raidStore.js'

const props = defineProps({
  compact: { type: Boolean, default: false },
})

const { state, selectedRaid, selectRaid, selectGate, RAIDS } = useRaidStore()

const open = ref(false)
const rootRef = ref(null)

function toggleDropdown() {
  open.value = !open.value
}

function onPickRaid(raidId) {
  selectRaid(raidId)
  open.value = false
}
</script>

<style scoped>
/* ── 풀 모드 ─────────────────────────────────────── */
.rs-full { display: flex; flex-direction: column; gap: 0.75rem; }

.rs-full__hint {
  font-size: 0.78rem;
  color: #7a6a3a;
  margin: 0;
}

.rs-full__summary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.rs-full__summary-name {
  font-size: 0.85rem;
  font-weight: 700;
  color: #4ade80;
}

.rs-full__summary-gate {
  font-size: 0.78rem;
  color: #aaa;
  background: #111;
  border: 1px solid #333;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
}

.rs-full__summary-phase {
  font-size: 0.72rem;
  color: #555;
}

.rs-full__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 0.5rem;
}

.rs-full__card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  padding: 0.75rem 0.5rem;
  background: #111;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  color: inherit;
}

.rs-full__card:hover {
  border-color: #444;
  background: #1a1a1a;
}

.rs-full__card--active {
  border-color: #4ade80;
  background: rgba(74, 222, 128, 0.06);
}

.rs-full__name {
  font-size: 0.85rem;
  font-weight: 600;
  color: #ddd;
}

.rs-full__tier {
  font-size: 0.65rem;
  color: #555;
  font-weight: 500;
}

.rs-full__card--active .rs-full__name { color: #4ade80; }
.rs-full__card--active .rs-full__tier { color: #2d8c55; }

.rs-full__gates {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.rs-full__gate {
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  background: #111;
  border: 1px solid #2a2a2a;
  color: #888;
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}

.rs-full__gate:hover { border-color: #444; color: #ccc; }

.rs-full__gate--active {
  border-color: #4ade80;
  color: #4ade80;
  background: rgba(74, 222, 128, 0.06);
}

/* ── 컴팩트 모드 ─────────────────────────────────── */
.rs-compact {
  position: relative;
  font-size: 0.75rem;
}

.rs-compact__bar {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.rs-compact__raid-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.3rem 0.6rem;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 6px;
  color: #ddd;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.15s;
}

.rs-compact__raid-btn:hover { border-color: #555; }

.rs-compact__arrow {
  display: inline-block;
  transition: transform 0.15s;
  font-size: 0.65rem;
  color: #666;
}

.rs-compact__arrow--open { transform: rotate(180deg); }

.rs-compact__gates {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.rs-compact__gate {
  padding: 0.25rem 0.45rem;
  background: #111;
  border: 1px solid #2a2a2a;
  border-radius: 4px;
  color: #666;
  font-size: 0.68rem;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
  white-space: nowrap;
}

.rs-compact__gate:hover { border-color: #444; color: #bbb; }

.rs-compact__gate--active {
  border-color: #4ade80;
  color: #4ade80;
}

.rs-compact__dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 100;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 0.3rem;
  min-width: 130px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
}

.rs-compact__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.4rem 0.6rem;
  border-radius: 5px;
  background: none;
  border: none;
  color: #aaa;
  font-size: 0.75rem;
  cursor: pointer;
  text-align: left;
  transition: background 0.1s, color 0.1s;
}

.rs-compact__item:hover { background: #252525; color: #ddd; }

.rs-compact__item--active {
  color: #4ade80;
  background: rgba(74, 222, 128, 0.07);
}

.rs-compact__item-tier {
  font-size: 0.6rem;
  color: #444;
}
.rs-compact__item--active .rs-compact__item-tier { color: #2d8c55; }
</style>
