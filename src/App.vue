<template>
  <RouterView />
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { RouterView, useRouter } from 'vue-router'

const router = useRouter()

// 스페이스 5회 → 엔터 5회 시퀀스 감지
const _k = [32,32,32,32,32,13,13,13,13,13]
let _i = 0

function _h(e) {
  if (e.keyCode === _k[_i]) {
    _i++
    if (_i === _k.length) {
      _i = 0
      router.push('/admin')
    }
  } else {
    _i = e.keyCode === _k[0] ? 1 : 0
  }
}

onMounted(() => window.addEventListener('keydown', _h))
onUnmounted(() => window.removeEventListener('keydown', _h))
</script>
