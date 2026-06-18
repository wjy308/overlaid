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
    </main>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
function goToOverlay() {
  router.push('/overlay')
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
</style>
