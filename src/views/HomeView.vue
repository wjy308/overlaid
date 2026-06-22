<template>
  <div class="home">
    <header class="home__header">
      <h1>overlaid</h1>
      <p>Game overlay powered by screen capture + Document PiP</p>
    </header>

    <main class="home__main">
      <section class="card">
        <h2>Setup</h2>
        <p>overlaid captures a region of your screen, detects your HP bar via pixel color, and displays a floating overlay using the Document Picture-in-Picture API.</p>
      </section>

      <section class="card">
        <h2>Requirements</h2>
        <ul>
          <li>Chrome 116+ (Document PiP)</li>
          <li>Screen capture permission</li>
        </ul>
      </section>

      <button class="btn btn--primary" @click="goToOverlay">
        Launch Overlay
      </button>

      <div class="auth">
        <template v-if="!auth.loading">
          <div v-if="auth.isAdmin" class="auth__user">
            <span class="auth__badge">Admin</span>
            <button class="btn btn--ghost" @click="auth.logout">로그아웃</button>
          </div>
          <form v-else class="auth__form" @submit.prevent="handleLogin">
            <input
              v-model="password"
              type="password"
              class="auth__input"
              placeholder="관리자 비밀번호"
              autocomplete="current-password"
            />
            <button type="submit" class="btn btn--ghost">로그인</button>
            <span v-if="errorMsg" class="auth__error">{{ errorMsg }}</span>
          </form>
        </template>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore.js'

const router = useRouter()
const auth = useAuthStore()
const password = ref('')
const errorMsg = ref('')

function goToOverlay() {
  router.push('/overlay')
}

async function handleLogin() {
  errorMsg.value = ''
  try {
    await auth.login(password.value)
    password.value = ''
  } catch (e) {
    errorMsg.value = e.message
  }
}
</script>

<style scoped>
.home {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  padding: 2rem;
}

.home__header {
  text-align: center;
}

.home__header h1 {
  font-size: 3rem;
  font-weight: 800;
  letter-spacing: -0.05em;
  margin: 0;
}

.home__header p {
  color: #888;
  margin-top: 0.5rem;
}

.home__main {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: 480px;
}

.card {
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  padding: 1.25rem 1.5rem;
}

.card h2 {
  margin: 0 0 0.5rem;
  font-size: 1rem;
  color: #ccc;
}

.card p, .card li {
  color: #888;
  font-size: 0.875rem;
  line-height: 1.6;
  margin: 0;
}

.card ul {
  padding-left: 1.25rem;
  margin: 0;
}

.btn--primary {
  padding: 0.75rem 1.5rem;
  background: #4ade80;
  color: #000;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}

.btn--primary:hover {
  opacity: 0.85;
}

.auth {
  display: flex;
  justify-content: center;
}

.auth__user {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.auth__badge {
  font-size: 0.75rem;
  background: #4ade80;
  color: #000;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-weight: 700;
  letter-spacing: 0.03em;
}

.auth__form {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.auth__input {
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 6px;
  color: #ccc;
  font-size: 0.875rem;
  padding: 0.4rem 0.75rem;
  outline: none;
  width: 180px;
}

.auth__input:focus {
  border-color: #555;
}

.auth__error {
  font-size: 0.8rem;
  color: #f87171;
}

.btn--ghost {
  background: transparent;
  border: 1px solid #333;
  border-radius: 5px;
  color: #888;
  font-size: 0.875rem;
  padding: 0.4rem 0.75rem;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
  white-space: nowrap;
}

.btn--ghost:hover {
  border-color: #555;
  color: #ccc;
}
</style>
