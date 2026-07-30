<template>
  <div class="collection-page">
    
    <!-- 📱 VUE MOBILE PLEIN ÉCRAN : RECHERCHE & AJOUT -->
    <div v-if="isSearchOpen && isMobile" class="fullscreen-mobile-view">
      <div class="mobile-view-header">
        <button class="btn-back" @click="isSearchOpen = false">← Collection</button>
        <h3>Ajouter une œuvre</h3>
      </div>
      <div class="mobile-view-content">
        <ApiSearchPanel />
      </div>
    </div>

    <!-- 📱 VUE MOBILE PLEIN ÉCRAN : LUCKY PICK -->
    <div v-else-if="isLuckyPickOpen && isMobile" class="fullscreen-mobile-view">
      <div class="mobile-view-header">
        <button class="btn-back" @click="isLuckyPickOpen = false">← Collection</button>
        <h3>🎲 Lucky Pick</h3>
      </div>
      <div class="mobile-view-content">
        <LuckyPickView />
      </div>
    </div>

    <!-- 💻 / 📱 CONTENU PRINCIPAL DE LA COLLECTION -->
    <template v-else>
      <!-- EN-TÊTE DESKTOP -->
      <header class="page-header desktop-only">
        <div class="header-titles">
          <h2>Ma Médiathèque</h2>
          <p class="stats-text">{{ collectionStore.stats }}</p>
        </div>

        <div class="header-actions">
          <button class="btn btn-lucky" @click="isLuckyPickOpen = true">
            🎲 Lucky Pick
          </button>

          <button class="btn btn-primary" @click="$router.push('/search')">
            {{ isSearchOpen ? '✕ Fermer' : '➕ Ajouter' }}
          </button>

          <button class="btn btn-primary" @click="$router.push('/account')">
            👤 Mon compte
          </button>
        </div>
      </header>

      <!-- PANNEAU DE RECHERCHE DESKTOP -->
      <div v-if="isSearchOpen && !isMobile" class="search-section desktop-only">
        <ApiSearchPanel />
      </div>

      <!-- BARRE DE FILTRES ET TRI -->
      <section class="toolbar">
        <div class="filters-group">
          <!-- 🔍 DESKTOP : Input classique -->
          <input 
            v-model="collectionStore.searchQuery" 
            type="text" 
            placeholder="🔍 Titre, artiste..." 
            class="input-search desktop-only"
          />

          <!-- 📱 MOBILE : Bouton loupe dédié -->
          <button 
            class="chip-btn mobile-only btn-search-trigger" 
            :class="{ active: collectionStore.searchQuery || showMobileSearch }"
            @click="toggleMobileSearch"
          >
            🔍 {{ collectionStore.searchQuery ? collectionStore.searchQuery : '' }}
          </button>

          <select v-model="collectionStore.activeTypeFilter" class="select-chip desktop-only">
            <option value="all">📂 Tout</option>
            <option value="vinyl">🎵 Musique</option>
            <option value="book">📚 Livres</option>
            <option value="movie">🎬 Films</option>
          </select>

          <button 
            class="chip-btn" 
            :class="{ active: collectionStore.showWishlistOnly }"
            @click="collectionStore.showWishlistOnly = !collectionStore.showWishlistOnly"
          >
            ✨ Wishlist
          </button>
        </div>

        <!-- 🎲 BOUTON LUCKY PICK -->
        <button v-if="isMobile" class="chip-btn btn-lucky-mobile" @click="isLuckyPickOpen = true">
          🎲
        </button>

        <button class="chip-btn" @click="isSortModalOpen = true">
          🔃 Trier
        </button>

        <div class="view-mode-group">
          <button 
            class="mode-btn" 
            :class="{ active: !isListView }" 
            @click="isListView = false"
            title="Vue Grille"
          >
            ▦
          </button>
          <button 
            class="mode-btn" 
            :class="{ active: isListView }" 
            @click="isListView = true"
            title="Vue Liste"
          >
            ≡
          </button>
        </div>
      </section>

      <!-- 📱 MOBILE : OVERLAY / DÉROULANT DE RECHERCHE DANS LA COLLECTION -->
      <div v-if="showMobileSearch && isMobile" class="mobile-search-overlay">
        <div class="mobile-search-bar">
          <input 
            ref="mobileSearchInput"
            v-model="collectionStore.searchQuery" 
            type="search" 
            placeholder="Titre, artiste..." 
            class="mobile-input-search"
          />
          <button 
            v-if="collectionStore.searchQuery" 
            class="btn-clear-search" 
            @click="collectionStore.searchQuery = ''"
          >
            ✕
          </button>
          <button class="btn-close-search" @click="showMobileSearch = false">
            Fermer
          </button>
        </div>
      </div>

      <!-- CHARGEMENT / LISTE VIDE / CARTES -->
      <div v-if="collectionStore.loading" class="loading-state">
        <p>Chargement des œuvres...</p>
      </div>

      <div v-else-if="collectionStore.filteredItems.length === 0" class="empty-state">
        <p>Aucune œuvre ne correspond à vos critères.</p>
      </div>

      <div 
        v-else 
        class="items-container" 
        :class="{ 'grid-view': !isListView, 'list-view': isListView }"
      >
        <ItemCard 
          v-for="item in collectionStore.filteredItems" 
          :key="item.id" 
          :item="item" 
          :is-list-view="isListView"
          @delete="deleteItem"
        />
      </div>

      <!-- MODALE DESKTOP LUCKY PICK -->
      <LuckyPickModal 
        v-if="!isMobile && isLuckyPickOpen"
        :is-open="isLuckyPickOpen" 
        @close="isLuckyPickOpen = false" 
      />

      <SortModal 
        :is-open="isSortModalOpen" 
        @close="isSortModalOpen = false" 
      />
    </template>

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useCollectionStore } from '../stores/collection';
import ItemCard from '../components/ItemCard.vue';
import ApiSearchPanel from '../components/ApiSearchPanel.vue';
import LuckyPickModal from '../components/LuckyPickModal.vue';
import LuckyPickView from '../components/LuckyPickModal.vue'; 
import SortModal from '../components/SortModal.vue';

const isSortModalOpen = ref(false);

const authStore = useAuthStore();
const collectionStore = useCollectionStore();

const isSearchOpen = ref(false);
const isLuckyPickOpen = ref(false);
const showMobileSearch = ref(false);
const mobileSearchInput = ref(null);

const isListView = ref(false);
const isMobile = ref(window.innerWidth <= 768);

function handleResize() {
  isMobile.value = window.innerWidth <= 768;
}

onMounted(async () => {
  window.addEventListener('resize', handleResize);
  await collectionStore.fetchItems();
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

watch(
  () => authStore.user,
  async (newUser) => {
    if (newUser) {
      await collectionStore.fetchItems();
    }
  },
  { immediate: true }
);

function toggleMobileSearch() {
  showMobileSearch.value = !showMobileSearch.value;
  if (showMobileSearch.value) {
    nextTick(() => {
      mobileSearchInput.value?.focus();
    });
  }
}

function selectTab(type) {
  isSearchOpen.value = false;
  isLuckyPickOpen.value = false;
  showMobileSearch.value = false;
  collectionStore.activeTypeFilter = type;
}

function openMobileSearch() {
  isLuckyPickOpen.value = false;
  showMobileSearch.value = false;
  isSearchOpen.value = !isSearchOpen.value;
}

function openMobileLuckyPick() {
  isSearchOpen.value = false;
  showMobileSearch.value = false;
  isLuckyPickOpen.value = !isLuckyPickOpen.value;
}

async function deleteItem(id) {
  if (confirm("Voulez-vous vraiment supprimer cet élément ?")) {
    await collectionStore.deleteItem(id);
  }
}
</script>

<style scoped>
.collection-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

/* DESKTOP / MOBILE DISPLAY UTILS */
.desktop-only { display: flex; }
.mobile-only { display: none; }

@media (max-width: 768px) {
  .desktop-only { display: none !important; }
  .mobile-only { display: flex !important; }
  
  .collection-page { 
    padding-top: max(12px, env(safe-area-inset-top));
    padding-left: 12px;
    padding-right: 12px;
    padding-bottom: calc(75px + env(safe-area-inset-bottom));
  }
}

/* VUES PLEIN ÉCRAN MOBILE */
.fullscreen-mobile-view {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: calc(65px + env(safe-area-inset-bottom));
  padding-top: max(16px, env(safe-area-inset-top));
  padding-left: 16px;
  padding-right: 16px;
  background: #09090b;
  z-index: 1500;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.mobile-view-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  border-bottom: 1px solid #27272a;
  padding-bottom: 12px;
}

.mobile-view-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #fff;
}

.btn-back {
  background: #18181b;
  border: 1px solid #27272a;
  color: #3b82f6;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

/* EN-TÊTE DESKTOP & TOOLBAR */
.page-header { justify-content: space-between; align-items: center; }
.header-titles h2 { margin: 0; font-size: 1.5rem; color: #fff; }
.stats-text { margin: 4px 0 0 0; font-size: 0.85rem; color: #a1a1aa; }
.header-actions { display: flex; gap: 10px; }

.btn {
  padding: 8px 14px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
}

.btn-primary {
  background: #3b82f6;
  color: #fff;
  border: none;
}

.btn-lucky {
  background: rgba(139, 92, 246, 0.2);
  border: 1px solid rgba(139, 92, 246, 0.4);
  color: #c084fc;
}

.search-section {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 12px;
  padding: 16px;
}

/* BARRE D'OUTILS ET FILTRES */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.filters-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.input-search {
  flex: 1;
  min-width: 0;
  background: #18181b;
  border: 1px solid #27272a;
  color: #fff;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 0.85rem;
  outline: none;
}

.input-search:focus {
  border-color: #3b82f6;
}

/* 📱 BANDEAU MOBILE DE RECHERCHE DÉROULANT */
.mobile-search-overlay {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 10px;
  padding: 8px;
  margin-top: -8px;
}

.mobile-search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mobile-input-search {
  flex: 1;
  background: #09090b;
  border: 1px solid #3f3f46;
  color: #fff;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.9rem;
  outline: none;
}

.mobile-input-search:focus {
  border-color: #3b82f6;
}

.btn-clear-search {
  background: transparent;
  border: none;
  color: #71717a;
  font-size: 0.9rem;
  padding: 4px 8px;
  cursor: pointer;
}

.btn-close-search {
  background: transparent;
  border: none;
  color: #3b82f6;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 8px;
}

.btn-search-trigger {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.select-chip, .chip-btn {
  background: #18181b;
  border: 1px solid #27272a;
  color: #a1a1aa;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 0.8rem;
  white-space: nowrap;
  cursor: pointer;
  flex-shrink: 0;
}

.chip-btn.active {
  background: #f59e0b;
  color: #000;
  border-color: #f59e0b;
  font-weight: 600;
}

.view-mode-group {
  display: flex;
  gap: 2px;
  background: #18181b;
  border: 1px solid #27272a;
  padding: 2px;
  border-radius: 8px;
  flex-shrink: 0;
}

.mode-btn {
  background: transparent;
  border: none;
  color: #71717a;
  padding: 6px 10px;
  cursor: pointer;
  border-radius: 6px;
  font-size: 0.85rem;
}

.mode-btn.active {
  background: #27272a;
  color: #fff;
}

/* 📱 AJUSTEMENTS SMARTPHONE */
@media (max-width: 768px) {
  .toolbar {
    flex-direction: row;
    align-items: center;
    gap: 6px;
  }

  .filters-group {
    gap: 6px;
  }

  .chip-btn {
    padding: 7px 9px;
    font-size: 0.75rem;
  }

  .mode-btn {
    padding: 5px 8px;
    font-size: 0.8rem;
  }
}

/* GRILLE / LISTE */
.items-container.grid-view { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 14px; }
.items-container.list-view { display: flex; flex-direction: column; gap: 8px; }
.loading-state, .empty-state { text-align: center; padding: 40px; color: #a1a1aa; }

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

.tab-icon { font-size: 1.1rem; }
.tab-item.active { color: #3b82f6; font-weight: 700; }
.tab-action-lucky.active, .tab-action-lucky { color: #c084fc; }
.tab-action-add.active, .tab-action-add { color: #3b82f6; }

/* Bouton Lucky Pick compact dans la toolbar */
.btn-lucky-mobile {
  background: rgba(139, 92, 246, 0.2) !important;
  border-color: rgba(139, 92, 246, 0.4) !important;
  color: #c084fc !important;
  font-weight: 700;
  padding: 8px 10px;
}

@media (max-width: 768px) {
  .btn-lucky-mobile {
    padding: 7px 10px;
    font-size: 0.75rem;
  }
}
</style>