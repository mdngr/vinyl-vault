<template>
  <div id="app">
    <!-- Contenu de la route actuelle -->
    <router-view />

    <!-- 📱 Tab Bar Mobile Fixe : Visible UNIQUEMENT si l'utilisateur est connecté -->
    <nav v-if="authStore.user" class="mobile-tab-bar mobile-only">
      <button 
        class="tab-item" 
        :class="{ active: $route.path === '/collection' && collectionStore.activeTypeFilter === 'all' }"
        @click="navToCollection('all')"
      >
        <span class="tab-icon">📂</span>
        <span class="tab-label">Tout</span>
      </button>

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
import { useRouter } from 'vue-router';
import { useAuthStore } from './stores/auth';
import { useCollectionStore } from './stores/collection';

const router = useRouter();
const authStore = useAuthStore(); // 👈 Récupération du store d'authentification
const collectionStore = useCollectionStore();

function navToCollection(filterType) {
  collectionStore.activeTypeFilter = filterType;
  if (router.currentRoute.value.path !== '/collection') {
    router.push('/collection');
  }
}
</script>