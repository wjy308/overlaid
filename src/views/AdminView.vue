<template>
  <!-- PIN 게이트 -->
  <div v-if="!isAuthed" class="gate">
    <form class="gate__form" @submit.prevent="login">
      <div class="gate__logo">overlaid<span class="gate__dot">.</span>admin</div>
      <input
        ref="pinRef"
        v-model="pin"
        class="gate__input"
        type="password"
        placeholder="PIN"
        autocomplete="off"
        :disabled="loading"
      />
      <button class="gate__btn" type="submit" :disabled="loading || !pin">
        {{ loading ? '확인 중…' : '입력' }}
      </button>
      <p v-if="authError" class="gate__error">{{ authError }}</p>
    </form>
  </div>

  <!-- 어드민 편집기 -->
  <div v-else class="admin" :class="{ 'admin--light': !isDark }">

    <!-- 사이드바 -->
    <aside class="admin__sidebar">
      <div class="admin__sidebar-header">
        <span class="admin__sidebar-title">레이드</span>
        <div class="admin__sidebar-actions">
          <button class="admin__icon-btn" @click="isDark = !isDark" :title="isDark ? '라이트 모드' : '다크 모드'">
            {{ isDark ? '☀' : '☾' }}
          </button>
          <button class="admin__icon-btn admin__icon-btn--danger" @click="logout" title="로그아웃">✕</button>
        </div>
      </div>

      <ul class="admin__raid-list">
        <li
          v-for="raid in raids"
          :key="raid.id"
          class="admin__raid-item"
          :class="{ 'admin__raid-item--active': selectedRaidId === raid.id }"
          @click="selectRaid(raid.id)"
        >
          <span class="admin__raid-name">{{ raid.name }}</span>
          <span class="admin__tier">T{{ raid.tier }}</span>
          <button class="admin__raid-del" @click.stop="deleteRaid(raid.id)" title="삭제">✕</button>
        </li>
      </ul>

      <!-- 새 레이드 추가 -->
      <div class="admin__new-raid">
        <template v-if="!showNewForm">
          <button class="admin__add-raid-btn" @click="showNewForm = true">+ 레이드 추가</button>
        </template>
        <form v-else class="admin__new-form" @submit.prevent="addRaid">
          <input
            v-model="newRaid.name"
            class="admin__input"
            type="text"
            placeholder="레이드 이름"
            autofocus
            required
          />
          <div class="admin__new-row">
            <select v-model.number="newRaid.tier" class="admin__input admin__input--sm">
              <option :value="1">T1</option>
              <option :value="2">T2</option>
              <option :value="3">T3</option>
              <option :value="4">T4</option>
            </select>
            <select v-model.number="newRaid.gateCount" class="admin__input admin__input--sm">
              <option :value="1">1관문</option>
              <option :value="2">2관문</option>
              <option :value="3">3관문</option>
              <option :value="4">4관문</option>
            </select>
          </div>
          <div class="admin__new-actions">
            <button type="submit" class="admin__btn admin__btn--primary">추가</button>
            <button type="button" class="admin__btn admin__btn--ghost" @click="showNewForm = false">취소</button>
          </div>
        </form>
      </div>
    </aside>

    <!-- 메인 편집 영역 -->
    <main class="admin__main">
      <template v-if="selectedRaid">

        <!-- 관문 탭 + 관문 추가 -->
        <div class="admin__gate-tabs">
          <button
            v-for="(gate, idx) in selectedRaid.gates"
            :key="gate.id"
            class="admin__gate-tab"
            :class="{ 'admin__gate-tab--active': selectedGateIdx === idx }"
            @click="selectedGateIdx = idx"
          >
            {{ gate.name }}
          </button>
          <button class="admin__gate-tab admin__gate-tab--add" @click="addGate" title="관문 추가">+</button>
        </div>

        <div v-if="selectedGate" class="admin__editor">

          <!-- 툴바 -->
          <div class="admin__toolbar">
            <span class="admin__gate-title">{{ selectedRaid.name }} · {{ selectedGate.name }} HP 기믹</span>
            <span v-if="saveStatus" class="admin__save-status" :class="{ 'admin__save-status--err': saveStatus === 'error' }">
              {{ saveStatus === 'ok' ? '저장됨 ✓' : '저장 실패 ✗' }}
            </span>
            <button class="admin__btn admin__btn--primary" :disabled="saving" @click="save">
              {{ saving ? '저장 중…' : '저장' }}
            </button>
          </div>

          <!-- HP 기믹 테이블 -->
          <table class="admin__table">
            <thead>
              <tr>
                <th class="admin__th admin__th--at">줄 수</th>
                <th class="admin__th admin__th--label">라벨</th>
                <th class="admin__th admin__th--steps">스텝 (줄바꿈으로 구분)</th>
                <th class="admin__th admin__th--del"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(phase, idx) in selectedGate.hpPhases" :key="idx" class="admin__tr">
                <td class="admin__td">
                  <input class="admin__input admin__input--num" type="number" v-model.number="phase.at" min="0" />
                </td>
                <td class="admin__td">
                  <input class="admin__input admin__input--label" type="text" v-model="phase.label" placeholder="라벨" />
                </td>
                <td class="admin__td">
                  <textarea
                    class="admin__textarea"
                    :value="phase.steps?.join('\n') ?? ''"
                    @input="phase.steps = $event.target.value.split('\n').filter(s => s.trim())"
                    placeholder="각 줄이 하나의 스텝이 됩니다"
                    rows="3"
                  />
                </td>
                <td class="admin__td admin__td--del">
                  <button class="admin__del-btn" @click="removePhase(idx)" title="삭제">✕</button>
                </td>
              </tr>
            </tbody>
          </table>

          <button class="admin__add-phase-btn" @click="addPhase">+ 기믹 추가</button>
        </div>
      </template>

      <div v-else class="admin__empty">← 레이드를 선택하세요</div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { RAIDS as LOCAL_RAIDS } from '../data/raids.js'

const pin       = ref('')
const loading   = ref(false)
const authError = ref('')
const isAuthed  = ref(false)
const pinRef    = ref(null)
const isDark    = ref(true)

const raids           = ref([])
const selectedRaidId  = ref(null)
const selectedGateIdx = ref(0)
const saving          = ref(false)
const saveStatus      = ref('')

const showNewForm = ref(false)
const newRaid     = ref({ name: '', tier: 3, gateCount: 1 })

const selectedRaid = computed(() => raids.value.find(r => r.id === selectedRaidId.value) ?? null)
const selectedGate = computed(() => selectedRaid.value?.gates[selectedGateIdx.value] ?? null)

// ── 인증 ──────────────────────────────────────────
onMounted(async () => {
  try {
    const res = await fetch('/api/auth/me')
    if (res.ok) {
      const data = await res.json()
      if (data.isAdmin) { isAuthed.value = true; await loadRaids() }
    }
  } catch {}
  nextTick(() => pinRef.value?.focus())
})

async function login() {
  if (!pin.value) return
  loading.value = true
  authError.value = ''
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pin.value }),
    })
    if (res.ok) { isAuthed.value = true; pin.value = ''; await loadRaids() }
    else { authError.value = '틀렸습니다'; pin.value = '' }
  } catch { authError.value = '오류가 발생했습니다' }
  finally { loading.value = false }
}

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' })
  isAuthed.value = false
}

// ── 데이터 로드 ───────────────────────────────────
async function loadRaids() {
  try {
    const res = await fetch('/api/raids')
    if (res.ok) {
      const data = await res.json()
      raids.value = Array.isArray(data) && data.length > 0 ? data : LOCAL_RAIDS
    } else { raids.value = LOCAL_RAIDS }
  } catch { raids.value = LOCAL_RAIDS }
}

function selectRaid(id) {
  selectedRaidId.value = id
  selectedGateIdx.value = 0
}

// ── 레이드 추가 / 삭제 ────────────────────────────
function addRaid() {
  const { name, tier, gateCount } = newRaid.value
  if (!name.trim()) return
  const id = 'raid_' + Date.now()
  raids.value.push({
    id,
    name: name.trim(),
    tier,
    gates: Array.from({ length: gateCount }, (_, i) => ({
      id: `${id}_g${i + 1}`,
      name: `${i + 1}관문`,
      hpPhases: [],
    })),
  })
  showNewForm.value = false
  newRaid.value = { name: '', tier: 3, gateCount: 1 }
  selectedRaidId.value = id
  selectedGateIdx.value = 0
}

function deleteRaid(id) {
  if (!confirm('레이드를 삭제할까요?')) return
  raids.value = raids.value.filter(r => r.id !== id)
  if (selectedRaidId.value === id) selectedRaidId.value = null
}

// ── 관문 추가 ─────────────────────────────────────
function addGate() {
  if (!selectedRaid.value) return
  const gates = selectedRaid.value.gates
  const n = gates.length + 1
  gates.push({ id: `${selectedRaid.value.id}_g${n}_${Date.now()}`, name: `${n}관문`, hpPhases: [] })
  selectedGateIdx.value = gates.length - 1
}

// ── 기믹 추가 / 삭제 ──────────────────────────────
function addPhase() {
  if (!selectedGate.value) return
  selectedGate.value.hpPhases.push({ at: 0, label: '', steps: [] })
}

function removePhase(idx) {
  selectedGate.value.hpPhases.splice(idx, 1)
}

// ── 저장 ──────────────────────────────────────────
async function save() {
  saving.value = true
  saveStatus.value = ''
  try {
    const res = await fetch('/api/admin/raids', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(raids.value),
    })
    saveStatus.value = res.ok ? 'ok' : 'error'
  } catch { saveStatus.value = 'error' }
  finally { saving.value = false; setTimeout(() => { saveStatus.value = '' }, 3000) }
}
</script>

<style scoped>
/* ── 테마 변수 ─────────────────────────────────── */
.admin {
  --bg:         #0d0d0d;
  --bg2:        #161616;
  --bg3:        #1e1e1e;
  --border:     #2a2a2a;
  --text:       #e8e8e8;
  --text2:      #a0a0a0;
  --text3:      #606060;
  --accent:     #4ade80;
  --accent-fg:  #000;
  --danger:     #f87171;
  --input-bg:   #111;
}

.admin--light {
  --bg:         #f0f0f0;
  --bg2:        #ffffff;
  --bg3:        #e4e4e4;
  --border:     #d0d0d0;
  --text:       #1a1a1a;
  --text2:      #555555;
  --text3:      #999999;
  --accent:     #16a34a;
  --accent-fg:  #fff;
  --danger:     #dc2626;
  --input-bg:   #ffffff;
}

/* ── PIN 게이트 ────────────────────────────────── */
.gate {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0d0d0d;
}

.gate__form {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  width: 240px;
}

.gate__logo {
  font-size: 1.1rem;
  font-weight: 700;
  color: #555;
  letter-spacing: -0.02em;
  margin-bottom: 0.5rem;
}

.gate__dot { color: #4ade80; }

.gate__input {
  width: 100%;
  padding: 0.6rem 0.9rem;
  background: #111;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  color: #eee;
  font-size: 1rem;
  text-align: center;
  letter-spacing: 0.3em;
  outline: none;
  transition: border-color 0.15s;
}

.gate__input:focus { border-color: #4ade80; }

.gate__btn {
  width: 100%;
  padding: 0.55rem;
  background: #4ade80;
  color: #000;
  font-weight: 700;
  font-size: 0.85rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: opacity 0.15s;
}

.gate__btn:disabled { opacity: 0.4; cursor: not-allowed; }
.gate__btn:not(:disabled):hover { opacity: 0.85; }
.gate__error { font-size: 0.78rem; color: #f87171; margin: 0; }

/* ── 레이아웃 ───────────────────────────────────── */
.admin {
  display: flex;
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-size: 0.875rem;
}

.admin__sidebar {
  width: 200px;
  flex-shrink: 0;
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  background: var(--bg2);
}

.admin__sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border);
}

.admin__sidebar-title {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text2);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.admin__sidebar-actions { display: flex; gap: 0.25rem; }

.admin__icon-btn {
  background: none;
  border: none;
  color: var(--text3);
  cursor: pointer;
  font-size: 0.85rem;
  padding: 0.2rem 0.35rem;
  border-radius: 4px;
  transition: background 0.1s, color 0.1s;
}

.admin__icon-btn:hover { background: var(--bg3); color: var(--text2); }
.admin__icon-btn--danger:hover { color: var(--danger); }

/* ── 레이드 목록 ────────────────────────────────── */
.admin__raid-list {
  list-style: none;
  margin: 0;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.admin__raid-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.7rem;
  border-radius: 7px;
  cursor: pointer;
  color: var(--text2);
  transition: background 0.1s, color 0.1s;
}

.admin__raid-item:hover { background: var(--bg3); color: var(--text); }
.admin__raid-item--active { background: var(--bg3); color: var(--accent); font-weight: 600; }

.admin__raid-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.admin__tier {
  font-size: 0.62rem;
  font-weight: 600;
  color: var(--text3);
  flex-shrink: 0;
}

.admin__raid-del {
  background: none;
  border: none;
  color: transparent;
  cursor: pointer;
  font-size: 0.65rem;
  padding: 0.1rem 0.2rem;
  flex-shrink: 0;
  transition: color 0.1s;
}

.admin__raid-item:hover .admin__raid-del { color: var(--text3); }
.admin__raid-del:hover { color: var(--danger) !important; }

/* ── 새 레이드 폼 ───────────────────────────────── */
.admin__new-raid {
  padding: 0.6rem;
  border-top: 1px solid var(--border);
  margin-top: auto;
}

.admin__add-raid-btn {
  width: 100%;
  padding: 0.45rem;
  background: none;
  border: 1px dashed var(--border);
  border-radius: 7px;
  color: var(--text3);
  font-size: 0.78rem;
  cursor: pointer;
  transition: border-color 0.12s, color 0.12s;
}

.admin__add-raid-btn:hover { border-color: var(--accent); color: var(--accent); }

.admin__new-form { display: flex; flex-direction: column; gap: 0.4rem; }
.admin__new-row { display: flex; gap: 0.4rem; }
.admin__input--sm { flex: 1; }

.admin__new-actions { display: flex; gap: 0.4rem; }

/* ── 공통 버튼 ─────────────────────────────────── */
.admin__btn {
  padding: 0.4rem 0.9rem;
  font-size: 0.8rem;
  font-weight: 600;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: opacity 0.15s;
  white-space: nowrap;
}

.admin__btn--primary {
  background: var(--accent);
  color: var(--accent-fg);
}

.admin__btn--primary:disabled { opacity: 0.4; cursor: not-allowed; }
.admin__btn--primary:not(:disabled):hover { opacity: 0.85; }

.admin__btn--ghost {
  flex: 1;
  background: none;
  border: 1px solid var(--border);
  color: var(--text2);
}

.admin__btn--ghost:hover { border-color: var(--text3); color: var(--text); }

/* ── 메인 영역 ─────────────────────────────────── */
.admin__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: auto;
  background: var(--bg);
}

.admin__empty { padding: 2rem; color: var(--text3); }

/* ── 관문 탭 ────────────────────────────────────── */
.admin__gate-tabs {
  display: flex;
  gap: 0.25rem;
  padding: 0.75rem 1rem 0;
  border-bottom: 1px solid var(--border);
  background: var(--bg2);
}

.admin__gate-tab {
  padding: 0.4rem 1rem;
  border-radius: 7px 7px 0 0;
  border: 1px solid transparent;
  border-bottom: none;
  background: none;
  color: var(--text3);
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.1s, background 0.1s;
}

.admin__gate-tab:hover { color: var(--text2); background: var(--bg3); }

.admin__gate-tab--active {
  background: var(--bg);
  border-color: var(--border);
  color: var(--text);
  font-weight: 600;
}

.admin__gate-tab--add {
  color: var(--text3);
  font-size: 1rem;
  padding: 0.25rem 0.7rem;
}

.admin__gate-tab--add:hover { color: var(--accent); background: none; }

/* ── 편집기 ─────────────────────────────────────── */
.admin__editor {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.admin__toolbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.admin__gate-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text2);
  flex: 1;
}

.admin__save-status { font-size: 0.78rem; color: var(--accent); }
.admin__save-status--err { color: var(--danger); }

/* ── 테이블 ─────────────────────────────────────── */
.admin__table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }

.admin__th {
  text-align: left;
  padding: 0.45rem 0.6rem;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text3);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border-bottom: 1px solid var(--border);
}

.admin__th--at    { width: 80px; }
.admin__th--label { width: 160px; }
.admin__th--del   { width: 36px; }

.admin__tr { border-bottom: 1px solid var(--border); }
.admin__tr:hover { background: var(--bg2); }

.admin__td { padding: 0.45rem 0.6rem; vertical-align: top; }
.admin__td--del { text-align: center; vertical-align: middle; }

/* ── 입력 ───────────────────────────────────────── */
.admin__input {
  width: 100%;
  padding: 0.4rem 0.6rem;
  background: var(--input-bg);
  border: 1px solid var(--border);
  border-radius: 5px;
  color: var(--text);
  font-size: 0.82rem;
  outline: none;
  transition: border-color 0.12s;
  box-sizing: border-box;
}

.admin__input:focus { border-color: var(--accent); }
.admin__input--num { width: 68px; }

.admin__textarea {
  width: 100%;
  padding: 0.4rem 0.6rem;
  background: var(--input-bg);
  border: 1px solid var(--border);
  border-radius: 5px;
  color: var(--text);
  font-size: 0.8rem;
  outline: none;
  resize: vertical;
  line-height: 1.5;
  font-family: inherit;
  transition: border-color 0.12s;
  box-sizing: border-box;
}

.admin__textarea:focus { border-color: var(--accent); }

.admin__del-btn {
  background: none;
  border: none;
  color: var(--text3);
  cursor: pointer;
  font-size: 0.75rem;
  padding: 0.2rem;
  transition: color 0.1s;
}

.admin__del-btn:hover { color: var(--danger); }

.admin__add-phase-btn {
  align-self: flex-start;
  padding: 0.4rem 0.85rem;
  background: none;
  border: 1px dashed var(--border);
  border-radius: 7px;
  color: var(--text3);
  font-size: 0.8rem;
  cursor: pointer;
  transition: border-color 0.12s, color 0.12s;
}

.admin__add-phase-btn:hover { border-color: var(--accent); color: var(--accent); }
</style>
