import { reactive, computed } from 'vue'
import { RAIDS } from '../data/raids.js'

const STORAGE_KEY = 'overlaid_raid_v1'

// PiP 앱과 메인 앱이 같은 JS 컨텍스트를 쓰므로
// 모듈 수준 reactive 로 두 createApp 인스턴스가 동일한 상태를 공유
const state = reactive({
  raidId: null,
  gateIdx: 0,
})

// 모듈 import 시 1회 복원
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
  if (saved?.raidId) {
    state.raidId = saved.raidId
    state.gateIdx = saved.gateIdx ?? 0
  }
} catch {}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ raidId: state.raidId, gateIdx: state.gateIdx }))
}

export function useRaidStore() {
  const selectedRaid = computed(() => RAIDS.find(r => r.id === state.raidId) ?? null)
  const selectedGate = computed(() => selectedRaid.value?.gates[state.gateIdx] ?? null)

  function selectRaid(raidId) {
    state.raidId = raidId
    state.gateIdx = 0
    persist()
  }

  function selectGate(idx) {
    state.gateIdx = idx
    persist()
  }

  return { state, selectedRaid, selectedGate, selectRaid, selectGate, RAIDS }
}
