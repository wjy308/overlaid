<template>
  <RouterView />
</template>

<script setup>
import { RouterView } from 'vue-router'
import { useAuthStore } from './stores/authStore.js'

const auth = useAuthStore()
auth.fetchMe()
</script>
