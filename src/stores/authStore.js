import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const isAdmin = ref(false)
  const loading = ref(true)

  async function fetchMe() {
    try {
      const res = await fetch('/api/auth/me')
      isAdmin.value = res.ok ? (await res.json()).isAdmin === true : false
    } catch {
      isAdmin.value = false
    } finally {
      loading.value = false
    }
  }

  async function login(password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (!res.ok) {
      const { error } = await res.json()
      throw new Error(error)
    }
    isAdmin.value = true
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    isAdmin.value = false
  }

  return { isAdmin, loading, fetchMe, login, logout }
})
