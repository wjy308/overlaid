<template>
  <div class="hp-bar">
    <div class="hp-bar__label">HP</div>
    <div class="hp-bar__track">
      <div
        class="hp-bar__fill"
        :style="{ width: pct, backgroundColor: fillColor }"
      />
    </div>
    <div class="hp-bar__value">{{ Math.round(props.hp * 100) }}%</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  hp: { type: Number, default: 1 },
})

const pct = computed(() => `${Math.round(props.hp * 100)}%`)

const fillColor = computed(() => {
  if (props.hp > 0.6) return '#4ade80'
  if (props.hp > 0.3) return '#facc15'
  return '#f87171'
})
</script>

<style scoped>
.hp-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba(0, 0, 0, 0.75);
  border-radius: 6px;
  backdrop-filter: blur(4px);
  min-width: 200px;
}

.hp-bar__label {
  font-size: 0.75rem;
  font-weight: 700;
  color: #aaa;
  width: 1.5rem;
  flex-shrink: 0;
}

.hp-bar__track {
  flex: 1;
  height: 8px;
  background: #333;
  border-radius: 4px;
  overflow: hidden;
}

.hp-bar__fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.1s, background-color 0.3s;
}

.hp-bar__value {
  font-size: 0.75rem;
  color: #ccc;
  width: 2.5rem;
  text-align: right;
  flex-shrink: 0;
}
</style>
