<template>
  <div id="app">
    <!-- Contenu de la route actuelle (CollectionView, SearchView, etc.) -->
    <router-view />

    <!-- Tab Bar Mobile Fixe (Présente sur TOUTES les pages) -->
    <nav class="mobile-tab-bar mobile-only">
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
        :class="{ active: $route.path === '/collection' && collectionStore.activeTypeFilter === 'movie' }"
        @click="navToCollection('movie')"
      >
        <span class="tab-icon">🎬</span>
        <span class="tab-label">Films</span>
      </button>

      <button 
        class="tab-item tab-action-add" 
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
import { useCollectionStore } from './stores/collection';

const router = useRouter();
const collectionStore = useCollectionStore();

function navToCollection(filterType) {
  collectionStore.activeTypeFilter = filterType;
  if (router.currentRoute.value.path !== '/collection') {
    router.push('/collection');
  }
}
</script>

<style>
/* Style global pour la Tab Bar Mobile */
.mobile-tab-bar {
  display: none;
}

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

  .tab-action-add {
    color: #3b82f6;
  }
}
</style>