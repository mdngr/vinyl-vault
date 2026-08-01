<template>
  <div id="app">
    <!-- 📡 Bandeau d'alerte Hors-Ligne -->
    <OfflineBanner />

    <!-- 📄 Contenu principal géré par les layouts & pages Nuxt 3 -->
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>

    <!-- 📱 Tab Bar Mobile Flottante avec Masquage au Scroll -->
    <nav 
      v-if="authStore.user" 
      class="mobile-tab-bar mobile-only"
      :class="{ 'is-hidden': isTabBarHidden }"
    >
      <!-- Bouton "Tout" toujours présent -->
      <button 
        class="tab-item" 
        :class="{ active: route.path === '/collection' && collectionStore.activeTypeFilter === 'all' }"
        @click="navToCollection('all')"
      >
        <span class="tab-icon">📂</span>
        <span class="tab-label">Tout</span>
      </button>
      
      <!-- Boutons dynamiques selon les préférences du compte -->
      <button 
        v-for="tab in activeMediaTabs"
        :key="tab.key"
        class="tab-item" 
        :class="{ active: route.path === '/collection' && collectionStore.activeTypeFilter === tab.key }"
        @click="navToCollection(tab.key)"
      >
        <span class="tab-icon">{{ tab.emoji }}</span>
        <span class="tab-label">{{ tab.label }}</span>
      </button>

      <!-- Boutons d'action toujours présents -->
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useCollectionStore } from '~/stores/collection'

const route = useRoute()
const authStore = useAuthStore()
const collectionStore = useCollectionStore()

// Réglages des médias activés
const userMediaSettings = ref({
  vinyl: true,
  book: true,
  movie: true,
  boardgame: false,
  videogame: false
})

function loadMediaSettings() {
  // 1. Priorité aux métadonnées Supabase de l'utilisateur connecté
  const userMeta = authStore.user?.user_metadata?.media_settings;
  if (userMeta) {
    userMediaSettings.value = { ...userMediaSettings.value, ...userMeta };
    return;
  }

  // 2. Fallback au localStorage si déconnecté ou hors-ligne
  if (import.meta.client) {
    const saved = localStorage.getItem('user_media_settings');
    if (saved) {
      try {
        userMediaSettings.value = { ...userMediaSettings.value, ...JSON.parse(saved) };
      } catch (e) {}
    }
  }
}

// Filtre uniquement les médias activés
const activeMediaTabs = computed(() => {
  const allTabs = [
    { key: 'vinyl', label: 'Musique', emoji: '🎵' },
    { key: 'book', label: 'Livres', emoji: '📚' },
    { key: 'movie', label: 'Films', emoji: '🎬' },
    { key: 'boardgame', label: 'Jeux', emoji: '🎲' },
    { key: 'videogame', label: 'Gaming', emoji: '🎮' }
  ]

  return allTabs.filter(tab => userMediaSettings.value[tab.key])
})

// Gestion du scroll pour masquer la barre
const isTabBarHidden = ref(false)
let lastScrollY = 0

function handleScroll() {
  if (!import.meta.client) return;

  const currentScrollY = window.scrollY;
  const windowHeight = window.innerHeight;
  const documentHeight = document.documentElement.scrollHeight;

  // 1. Toujours afficher si on est proche du haut de page (<= 10px)
  if (currentScrollY <= 10) {
    isTabBarHidden.value = false;
    lastScrollY = currentScrollY;
    return;
  }

  // 2. Réafficher automatiquement si on atteint le bas de la page
  if (currentScrollY + windowHeight >= documentHeight - 20) {
    isTabBarHidden.value = false;
    lastScrollY = currentScrollY;
    return;
  }

  // 3. Détection classique du sens de défilement
  const delta = currentScrollY - lastScrollY;

  if (Math.abs(delta) > 5) {
    if (delta > 0) {
      isTabBarHidden.value = true;
    } else {
      isTabBarHidden.value = false;
    }
    lastScrollY = currentScrollY;
  }
}

// Initialisation au chargement
onMounted(async () => {
  loadMediaSettings()

  if (authStore.initializeAuth) {
    await authStore.initializeAuth()
  }

  if (import.meta.client) {
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('storage', loadMediaSettings)
  }
})

onUnmounted(() => {
  if (import.meta.client) {
    window.removeEventListener('scroll', handleScroll)
    window.removeEventListener('storage', loadMediaSettings)
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
  background-color: #09090b;
  color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  min-height: 100vh;
}

#app {
  min-height: 100vh;
  background-color: #09090b;
}

/* Masqué par défaut en version Desktop */
.mobile-tab-bar {
  display: none;
}

/* Visibilité forcée en version Mobile (<= 768px) */
@media (max-width: 768px) {
  body {
    padding-bottom: calc(85px + env(safe-area-inset-bottom, 0px));
    background-color: #09090b;
  }

  .mobile-tab-bar {
    position: fixed;
    bottom: calc(12px + env(safe-area-inset-bottom, 0px));
    left: 12px;
    right: 12px;
    
    height: 62px;
    box-sizing: border-box;
    
    background: rgba(24, 24, 27, 0.85);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 36px;
    
    display: flex !important;
    justify-content: space-around;
    align-items: center;
    padding: 0 4px;
    z-index: 2000;
    
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
    
    transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
    transform: translateY(0);
    opacity: 1;
  }

  .mobile-tab-bar.is-hidden {
    transform: translateY(calc(100% + 24px));
    opacity: 0;
    pointer-events: none;
  }

  .tab-item {
    background: transparent;
    border: 1px solid transparent;
    color: #a1a1aa;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    font-size: 0.55rem;
    font-weight: 600;
    cursor: pointer;
    flex: 1;
    min-width: 0;
    height: 48px;
    border-radius: 24px;
    padding: 0 2px;
    transition: all 0.2s ease;
  }

  .tab-icon {
    font-size: 1rem;
    line-height: 1;
  }

  .tab-label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .tab-item.active {
    background: #3b82f6;
    color: #ffffff;
    box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);
  }
}
</style>