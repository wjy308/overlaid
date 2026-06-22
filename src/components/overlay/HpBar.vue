<template>
  <div class="hp-bar">
    <span class="hp-bar__number">{{ detectedNumber ?? '—' }}</span>
    <span class="hp-bar__status">
      <template v-if="!isReady">초기화 중…</template>
      <template v-else-if="isDetecting && detectedNumber === null">인식 중…</template>
      <template v-else-if="isDetecting">HP</template>
    </span>
  </div>
</template>

<script setup>
defineProps({
  detectedNumber: { type: Number, default: null },
  isReady:        { type: Boolean, default: false },
  isDetecting:    { type: Boolean, default: false },
})
</script>

<style scoped>
.hp-bar {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  padding: 0.5rem 0.85rem;
  background: rgba(0, 0, 0, 0.82);
  border-radius: 6px;
  backdrop-filter: blur(6px);
  min-width: 120px;
}

.hp-bar__number {
  font-size: 1.6rem;
  font-weight: 800;
  color: #eee;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  line-height: 1;
}

.hp-bar__status {
  font-size: 0.7rem;
  color: #555;
  white-space: nowrap;
}
</style>
