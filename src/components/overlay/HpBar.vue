<template>
  <div class="hp-bar">
    <div class="hp-bar__track">
      <div class="hp-bar__fill" :style="{ width: pct, backgroundColor: fillColor }" />
    </div>
    <div class="hp-bar__info">
      <template v-if="totalLines > 0">
        <span class="hp-bar__current">{{ currentLines }}</span>
        <span class="hp-bar__total"> / {{ totalLines }}</span>
      </template>
      <template v-else>
        <span class="hp-bar__pct">{{ Math.round(fillRatio * 100) }}%</span>
        <span class="hp-bar__scanning">감지중…</span>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  fillRatio:    { type: Number, default: 1 },
  currentLines: { type: Number, default: 0 },
  totalLines:   { type: Number, default: 0 },
})

const pct = computed(() => `${Math.round(props.fillRatio * 100)}%`)

const fillColor = computed(() => {
  if (props.fillRatio > 0.6) return '#4ade80'
  if (props.fillRatio > 0.3) return '#facc15'
  return '#f87171'
})
</script>

<style scoped>
.hp-bar {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.75rem;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 6px;
  backdrop-filter: blur(4px);
  min-width: 220px;
}

.hp-bar__track {
  flex: 1;
  height: 8px;
  background: #2a2a2a;
  border-radius: 4px;
  overflow: hidden;
}

.hp-bar__fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.08s linear, background-color 0.3s;
}

.hp-bar__info {
  display: flex;
  align-items: baseline;
  gap: 0.15rem;
  flex-shrink: 0;
}

.hp-bar__current {
  font-size: 0.9rem;
  font-weight: 700;
  color: #eee;
  font-variant-numeric: tabular-nums;
}

.hp-bar__total {
  font-size: 0.7rem;
  color: #555;
  font-variant-numeric: tabular-nums;
}

.hp-bar__pct {
  font-size: 0.85rem;
  font-weight: 700;
  color: #eee;
  font-variant-numeric: tabular-nums;
}

.hp-bar__scanning {
  font-size: 0.65rem;
  color: #444;
  margin-left: 0.25rem;
  animation: blink 1.2s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1 }
  50% { opacity: 0.3 }
}
</style>
