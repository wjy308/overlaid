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
        <p v-if="!isCapturing" class="hint">Select the window or screen that contains your HP bar.</p>
        <div v-else class="status status--on">Capturing</div>
        <button v-if="!isCapturing" class="btn btn--primary" @click="startCapture">
          Start Capture
        </button>
        <button v-else class="btn btn--danger" @click="handleStopCapture">
          Stop Capture
        </button>
        <p v-if="captureError" class="error">{{ captureError }}</p>
      </section>

      <!-- Step 2: HP region setup -->
      <section class="card" :class="{ 'card--disabled': !isCapturing }">
        <h3>2. HP Bar Region</h3>
        <p class="hint">Set normalized coordinates (0–1) for the HP bar region in your captured screen.</p>
        <div class="region-inputs">
          <label>X <input v-model.number="region.x" type="number" min="0" max="1" step="0.01" /></label>
          <label>Y <input v-model.number="region.y" type="number" min="0" max="1" step="0.01" /></label>
          <label>W <input v-model.number="region.w" type="number" min="0" max="1" step="0.01" /></label>
          <label>H <input v-model.number="region.h" type="number" min="0" max="1" step="0.01" /></label>
        </div>

        <div class="region-inputs" style="margin-top: 0.75rem">
          <label>Hue min <input v-model.number="colorConfig.hueMin" type="number" min="0" max="360" /></label>
          <label>Hue max <input v-model.number="colorConfig.hueMax" type="number" min="0" max="360" /></label>
        </div>

        <div class="hp-preview">
          <HpBar :hp="hp" />
          <span class="hint" style="font-size:0.75rem">Live preview</span>
        </div>

        <button
          class="btn btn--secondary"
          :disabled="!isCapturing"
          @click="toggleDetection"
        >
          {{ isDetecting ? 'Stop Detection' : 'Start Detection' }}
        </button>
      </section>

      <!-- Step 3: Document PiP -->
      <section class="card" :class="{ 'card--disabled': !isDetecting }">
        <h3>3. Floating Overlay (Document PiP)</h3>
        <p v-if="!pip.isSupported" class="error">
          Document PiP not supported. Use Chrome 116+.
        </p>
        <p v-else class="hint">Opens a floating window that stays on top of your game.</p>

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
import { watch } from 'vue'
import { createApp, h } from 'vue'
import { useScreenCapture } from '../composables/useScreenCapture.js'
import { useHpDetector } from '../composables/useHpDetector.js'
import { useDocumentPiP } from '../composables/useDocumentPiP.js'
import HpBar from '../components/overlay/HpBar.vue'

const { isCapturing, error: captureError, startCapture, stopCapture, captureRegion } = useScreenCapture()
const { hp, isDetecting, region, colorConfig, start: startDetection, stop: stopDetection } = useHpDetector()
const pip = useDocumentPiP()

function handleStopCapture() {
  stopDetection()
  pip.close()
  stopCapture()
}

function toggleDetection() {
  if (isDetecting.value) {
    stopDetection()
  } else {
    startDetection(captureRegion)
  }
}

async function openPiP() {
  const win = await pip.open(280, 80)
  if (!win) return

  const container = win.document.createElement('div')
  container.style.cssText = 'margin:0;padding:8px;background:#111;min-height:100vh'
  win.document.body.style.margin = '0'
  win.document.body.appendChild(container)

  // Wrap HpBar in a component that reads hp from a shared reactive ref
  const pipApp = createApp({
    setup() {
      return () => h(HpBar, { hp: hp.value })
    },
  })

  pipApp.mount(container)

  // Re-render when hp changes by updating the root component
  watch(hp, () => {
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
  max-width: 560px;
  margin: 0 auto;
}

.overlay-view__header {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.overlay-view__header h2 {
  margin: 0;
}

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

.region-inputs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}

.region-inputs label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: #888;
}

.region-inputs input {
  background: #111;
  border: 1px solid #333;
  border-radius: 4px;
  color: #eee;
  padding: 0.25rem 0.4rem;
  font-size: 0.8rem;
  width: 100%;
  box-sizing: border-box;
}

.hp-preview {
  display: flex;
  align-items: center;
  gap: 0.75rem;
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
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn--primary { background: #4ade80; color: #000; }
.btn--secondary { background: #3b82f6; color: #fff; }
.btn--danger { background: #f87171; color: #000; }
.btn--ghost { background: transparent; color: #888; border: 1px solid #333; }
.btn:not(:disabled):hover { opacity: 0.8; }
</style>
