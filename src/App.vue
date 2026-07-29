<template>
  <div id="app">
    <!-- Contenu de la route actuelle -->
    <router-view />

    <!-- 📱 Tab Bar Mobile Fixe -->
    <nav v-if="authStore.user" class="mobile-tab-bar mobile-only">
      <button 
        class="tab-item" 
        :class="{ active: $route.path === '/collection' && collectionStore.activeTypeFilter === 'vinyl' }"
        @click="navToCollection('vinyl')"
      >
        <span class="tab-icon">🎵</span>
        <span class="tab-label">Musique</span>
      </button>

      <button 
        class="tab-item" 
        :class="{ active: $route.path === '/collection' && collectionStore.activeTypeFilter === 'book' }"
        @click="navToCollection('book')"
      >
        <span class="tab-icon">📚</span>
        <span class="tab-label">Livres</span>
      </button>

      <button 
        class="tab-item" 
        :class="{ active: $route.path === '/collection' && collectionStore.activeTypeFilter === 'all' }"
        @click="navToCollection('movie')"
      >
        <span class="tab-icon">🎬</span>
        <span class="tab-label">Films</span>
      </button>


      <button 
        class="tab-item" 
        :class="{ active: $route.path === '/search' }"
        @click="$router.push('/search')"
      >
        <span class="tab-icon">➕</span>
        <span class="tab-label">Ajouter</span>
      </button>

      <button 
        class="tab-item" 
        :class="{ active: $route.path === '/account' }"
        @click="$router.push('/account')"
      >
        <span class="tab-icon">👤</span>
        <span class="tab-label">Profil</span>
      </button>
    </nav>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from './stores/auth';
import { useCollectionStore } from './stores/collection';
import { supabase } from './services/supabase';

const router = useRouter();
const authStore = useAuthStore();
const collectionStore = useCollectionStore();

// 🔄 Synchronisation active de la session au chargement
onMounted(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  authStore.user = session?.user || null;

  // Écoute les changements d'état (connexion, déconnexion)
  supabase.auth.onAuthStateChange((_event, session) => {
    authStore.user = session?.user || null;
  });
});

function navToCollection(filterType) {
  collectionStore.activeTypeFilter = filterType;
  if (router.currentRoute.value.path !== '/collection') {
    router.push('/collection');
  }
}
</script>

<style>
/* Masqué par défaut en version Desktop */
.mobile-tab-bar {
  display: none;
}

/* Visibilité forcée en version Mobile (<= 768px) */
@media (max-width: 768px) {
  .mobile-tab-bar {
    display: flex !important;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 65px;
    background: rgba(24, 24, 27, 0.98);
    backdrop-filter: blur(12px);
    border-top: 1px solid #27272a;
    justify-content: space-around;
    align-items: center;
    z-index: 2000;
    padding: 0 4px;
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