<!-- components/OfflineBanner.vue -->
<template>
  <div v-if="isOffline" class="offline-banner">
    ⚠️ Vous êtes actuellement hors-ligne. Consultation en mode cache.
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const isOffline = ref(false)

function updateOnlineStatus() {
  isOffline.value = !navigator.onLine
}

onMounted(() => {
  if (import.meta.client) {
    isOffline.value = !navigator.onLine
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)
  }
})

onUnmounted(() => {
  if (import.meta.client) {
    window.removeEventListener('online', updateOnlineStatus)
    window.removeEventListener('offline', updateOnlineStatus)
  }
})
</script>

<style scoped>
.offline-banner {
  background: #f59e0b;
  color: #000;
  text-align: center;
  padding: 8px 12px;
  font-size: 0.85rem;
  font-weight: 700;
  position: sticky;
  top: 0;
  z-index: 9999;
}
</style>