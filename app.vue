<template>
  <div id="app">
    <!-- 📡 Bandeau d'alerte Hors-Ligne -->
    <OfflineBanner />

    <!-- 📄 Contenu principal géré par les layouts & pages Nuxt 3 -->
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>

    <!-- 📱 Tab Bar Mobile Fixe -->
    <nav v-if="authStore.user" class="mobile-tab-bar mobile-only">
      <button 
        class="tab-item" 
        :class="{ active: route.path === '/collection' && collectionStore.activeTypeFilter === 'all' }"
        @click="navToCollection('all')"
      >
        <span class="tab-icon">📂</span>
        <span class="tab-label">Tout</span>
      </button>
      
      <button 
        class="tab-item" 
        :class="{ active: route.path === '/collection' && collectionStore.activeTypeFilter === 'vinyl' }"
        @click="navToCollection('vinyl')"
      >
        <span class="tab-icon">🎵</span>
        <span class="tab-label">Musique</span>
      </button>

      <button 
        class="tab-item" 
        :class="{ active: route.path === '/collection' && collectionStore.activeTypeFilter === 'book' }"
        @click="navToCollection('book')"
      >
        <span class="tab-icon">📚</span>
        <span class="tab-label">Livres</span>
      </button>

      <button 
        class="tab-item" 
        :class="{ active: route.path === '/collection' && collectionStore.activeTypeFilter === 'movie' }"
        @click="navToCollection('movie')"
      >
        <span class="tab-icon">🎬</span>
        <span class="tab-label">Films</span>
      </button>

      <button 
        class="tab-item" 
        :class="{ active: route.path === '/search' }"
        @click="navigateTo('/search')"
      >
        <span class="tab-icon">➕</span>
        <span class="tab-label">Ajouter</span>
      </button>

      <button 
        class="tab-item" 
        :class="{ active: route.path === '/account' }"
        @click="navigateTo('/account')"
      >
        <span class="tab-icon">👤</span>
        <span class="tab-label">Profil</span>
      </button>
    </nav>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useCollectionStore } from '~/stores/collection'

const route = useRoute()
const authStore = useAuthStore()
const collectionStore = useCollectionStore()

// Initialisation de la session au chargement
onMounted(async () => {
  if (authStore.initializeAuth) {
    await authStore.initializeAuth()
  }
})

function navToCollection(filterType) {
  collectionStore.activeTypeFilter = filterType
  if (route.path !== '/collection') {
    navigateTo('/collection')
  }
}
</script>

<style>
/* Reset & Styles globaux */
html, body {
  margin: 0;
  padding: 0;
  background-color: #121212;
  color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

/* Masqué par défaut en version Desktop */
.mobile-tab-bar {
  display: none;
}

/* Visibilité forcée en version Mobile (<= 768px) */
@media (max-width: 768px) {
  .mobile-tab-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    
    height: calc(56px + env(safe-area-inset-bottom, 0px));
    padding-bottom: env(safe-area-inset-bottom, 0px);
    
    background: rgba(24, 24, 27, 0.98);
    backdrop-filter: blur(12px);
    border-top: 1px solid #27272a;
    display: flex !important;
    justify-content: space-around;
    align-items: flex-start;
    padding-top: 6px;
    z-index: 2000;
  }

  .tab-item {
    background: transparent;
    border: none;
    color: #71717a;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    font-size: 0.65rem;
    cursor: pointer;
    flex: 1;
    padding: 0;
  }

  .tab-icon {
    font-size: 1.1rem;
  }

  .tab-item.active {
    color: #3b82f6;
    font-weight: 700;
  }
}
</style>