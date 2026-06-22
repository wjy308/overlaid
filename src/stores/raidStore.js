import { reactive, computed, ref } from 'vue'
import { RAIDS as LOCAL_RAIDS } from '../data/raids.js'

const STORAGE_KEY    = 'overlaid_raid_v1'
const VIEW_MODE_KEY  = 'overlaid_view_mode'

// 로컬 데이터로 먼저 시작 → API 로드 후 업데이트 (폴백 보장)
const raidsData = ref(LOCAL_RAIDS)
const isRaidsLoading = ref(false)
const raidsError = ref(null)

// 'simple' | 'detail' — PiP·메인 앱 공유, localStorage 저장
const viewMode = ref(localStorage.getItem(VIEW_MODE_KEY) || 'simple')

function setViewMode(mode) {
  viewMode.value = mode
  localStorage.setItem(VIEW_MODE_KEY, mode)
}

// PiP 앱과 메인 앱이 같은 JS 컨텍스트를 공유하므로
// 모듈 수준 reactive 상태로 두 createApp 인스턴스가 동일한 상태를 공유
const state = reactive({
  raidId: null,
  gateIdx: 0,
})

// localStorage 초기화 (최초 import 시 1회 실행)
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

// Upstash Redis → Vercel API 경유로 레이드 데이터 로드
async function loadRaids() {
  isRaidsLoading.value = true
  raidsError.value = null
  try {
    const res = await fetch('/api/raids')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    // API 응답이 빈 배열이면 로컬 폴백 유지
    if (Array.isArray(data) && data.length > 0) {
      raidsData.value = data
    }
  } catch {
    // API 실패 시 로컬 데이터로 조용히 폴백
  } finally {
    isRaidsLoading.value = false
  }
}

// 앱 로드 시 백그라운드에서 최신 데이터 가져오기
loadRaids()

export function useRaidStore() {
  const selectedRaid = computed(() => raidsData.value.find(r => r.id === state.raidId) ?? null)
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

  return {
    state,
    raidsData,
    isRaidsLoading,
    raidsError,
    selectedRaid,
    selectedGate,
    selectRaid,
    selectGate,
    viewMode,
    setViewMode,
  }
}
