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
        <LuckyPickModal :is-open="true" @close="isLuckyPickOpen = false" />
      </div>
    </div>

    <!-- 💻 / 📱 CONTENU PRINCIPAL DE LA COLLECTION -->
    <template v-else>
      <!-- EN-TÊTE DESKTOP -->
      <header class="page-header desktop-only">
        <div class="header-titles">
          <h2>Ma Collection {{ activeTypeTitle }}</h2>
          <p class="stats-text">{{ collectionStore.stats }}</p>
        </div>

        <div class="header-actions">
          <button class="btn btn-lucky" @click="isLuckyPickOpen = true">
            🎲 Lucky Pick
          </button>

          <button 
            class="btn btn-wishlist" 
            :class="{ active: collectionStore.showWishlistOnly }"
            @click="collectionStore.showWishlistOnly = !collectionStore.showWishlistOnly"
          >
            ✨ Wishlist
          </button>

          <button class="btn btn-primary" @click="navigateTo('/search')">
            {{ isSearchOpen ? '✕ Fermer' : '➕ Ajouter' }}
          </button>

          <button class="btn btn-secondary" @click="navigateTo('/account')">
            👤 Mon compte
          </button>
        </div>
      </header>

      <!-- PANNEAU DE RECHERCHE DESKTOP -->
      <div v-if="isSearchOpen && !isMobile" class="search-section desktop-only">
        <ApiSearchPanel />
      </div>

      <!-- BARRE DE FILTRES ET TRI (Fixe et réactive au scroll sur Mobile) -->
      <section 
        class="toolbar"
        :class="{ 'is-hidden-mobile': isMobile && isToolbarHidden }"
      >
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

          <!-- 📱 MOBILE : Bouton Wishlist dédié -->
          <button 
            class="chip-btn mobile-only" 
            :class="{ active: collectionStore.showWishlistOnly }"
            @click="collectionStore.showWishlistOnly = !collectionStore.showWishlistOnly"
          >
            ✨ Wishlist
          </button>
        </div>

        <!-- 🎲 BOUTON LUCKY PICK (Mobile & Tablette) -->
        <button class="chip-btn btn-lucky-mobile mobile-only" @click="isLuckyPickOpen = true">
          🎲 Pick
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

      <!-- 2. Aucun résultat trouvé (Collection vide ou filtre sans résultat) -->
      <EmptyState 
        v-else-if="!collectionStore.filteredItems || collectionStore.filteredItems.length === 0"
        :search-query="collectionStore.searchQuery"
        :show-wishlist-only="collectionStore.showWishlistOnly"
        :active-type-filter="collectionStore.activeTypeFilter"
        :total-items-count="collectionStore.items.length"
        @action="handleEmptyStateAction"
      />

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

      <!-- 🖥️ DESKTOP : BARRE FLOTTANTE DE SÉLECTION DE CONTENU (FILTRÉE DYNAMIQUEMENT) -->
      <div class="floating-type-bar desktop-only">
        <!-- Onglet Tout (toujours visible) -->
        <button 
          class="floating-tab" 
          :class="{ active: collectionStore.activeTypeFilter === 'all' }"
          @click="collectionStore.activeTypeFilter = 'all'"
        >
          <span class="tab-emoji">📂</span>
          <span class="tab-title">Tout</span>
        </button>

        <!-- Onglets filtrés selon les préférences utilisateur -->
        <button 
          v-for="tab in activeMediaTabs"
          :key="tab.key"
          class="floating-tab" 
          :class="{ active: collectionStore.activeTypeFilter === tab.key }"
          @click="collectionStore.activeTypeFilter = tab.key"
        >
          <span class="tab-emoji">{{ tab.emoji }}</span>
          <span class="tab-title">{{ tab.label }}</span>
        </button>
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
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useAuthStore } from '~/stores/auth';
import { useCollectionStore } from '~/stores/collection';
import ItemCard from '~/components/ItemCard.vue';
import ApiSearchPanel from '~/components/ApiSearchPanel.vue';
import LuckyPickModal from '~/components/LuckyPickModal.vue';
import SortModal from '~/components/SortModal.vue';
import EmptyState from '~/components/EmptyState.vue';

function handleEmptyStateAction(actionType) {
  if (actionType === 'add' || actionType === 'search') {
    if (isMobile.value) {
      navigateTo('/search');
    } else {
      isSearchOpen.value = true;
    }
  } else if (actionType === 'reset_filters') {
    collectionStore.searchQuery = '';
    collectionStore.activeTypeFilter = 'all';
    collectionStore.showWishlistOnly = false;
  }
}

useHead({
  title: 'Ma collection - Culture Vault',
  meta: [
    { name: 'description', content: 'Explorez et gérez votre collection de vinyles, livres et films.' }
  ]
});

const isSortModalOpen = ref(false);

const authStore = useAuthStore();
const collectionStore = useCollectionStore();

const isSearchOpen = ref(false);
const isLuckyPickOpen = ref(false);
const showMobileSearch = ref(false);
const mobileSearchInput = ref(null);

const isListView = ref(false);
const isMobile = ref(false);

// Réglages des médias activés par l'utilisateur
const userMediaSettings = ref({
  vinyl: true,
  book: true,
  movie: true,
  boardgame: false,
  videogame: false
});

function loadMediaSettings() {
  const userMeta = authStore.user?.user_metadata?.media_settings;
  if (userMeta) {
    userMediaSettings.value = { ...userMediaSettings.value, ...userMeta };
    return;
  }

  if (import.meta.client) {
    const saved = localStorage.getItem('user_media_settings');
    if (saved) {
      try {
        userMediaSettings.value = { ...userMediaSettings.value, ...JSON.parse(saved) };
      } catch (e) {}
    }
  }
}

// Calcule les onglets affichés dans la barre flottante desktop
const activeMediaTabs = computed(() => {
  const allTabs = [
    { key: 'vinyl', label: 'Musique', emoji: '🎵' },
    { key: 'book', label: 'Livres', emoji: '📚' },
    { key: 'movie', label: 'Films', emoji: '🎬' },
    { key: 'boardgame', label: 'Jeux', emoji: '🎲' },
    { key: 'videogame', label: 'Gaming', emoji: '🎮' }
  ];

  return allTabs.filter(tab => userMediaSettings.value[tab.key]);
});

// Gestion du scroll mobile pour masquer / réafficher la barre de filtres
const isToolbarHidden = ref(false);
let lastScrollY = 0;

function handleScroll() {
  if (!import.meta.client || !isMobile.value) return;

  const currentScrollY = window.scrollY;

  if (currentScrollY <= 10) {
    isToolbarHidden.value = false;
    lastScrollY = currentScrollY;
    return;
  }

  const delta = currentScrollY - lastScrollY;

  if (Math.abs(delta) > 5) {
    if (delta > 0) {
      isToolbarHidden.value = true;
    } else {
      isToolbarHidden.value = false;
    }
    lastScrollY = currentScrollY;
  }
}

const activeTypeTitle = computed(() => {
  const map = {
    vinyl: '· Musique',
    book: '· Livres',
    movie: '· Films',
    boardgame: '· Jeux',
    videogame: '· Gaming'
  };
  return map[collectionStore.activeTypeFilter] || '';
});

function handleResize() {
  if (import.meta.client) {
    isMobile.value = window.innerWidth <= 768;
  }
}

onMounted(async () => {
  loadMediaSettings();
  handleResize();

  // S'assure que le filtre démarre sur 'all'
  if (!collectionStore.activeTypeFilter) {
    collectionStore.activeTypeFilter = 'all';
  }

  if (import.meta.client) {
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('storage', loadMediaSettings);
    window.addEventListener('media-settings-changed', loadMediaSettings);
  }

  if (collectionStore.items.length === 0) {
    await collectionStore.fetchItems();
  }
});

onUnmounted(() => {
  if (import.meta.client) {
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('scroll', handleScroll);
    window.removeEventListener('storage', loadMediaSettings);
    window.removeEventListener('media-settings-changed', loadMediaSettings);
  }
});

watch(
  () => authStore.user,
  async (newUser) => {
    if (newUser) {
      loadMediaSettings();
      if (collectionStore.items.length === 0) {
        await collectionStore.fetchItems();
      }
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
  padding-bottom: 90px;
}

/* DESKTOP / MOBILE DISPLAY UTILS */
.desktop-only { display: flex; }
.mobile-only { display: none; }

@media (max-width: 768px) {
  .desktop-only { display: none !important; }
  .mobile-only { display: flex !important; }
  
  .collection-page { 
    padding-top: calc(54px + max(12px, env(safe-area-inset-top)));
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
  transition: all 0.2s ease;
}

.btn-primary {
  background: #3b82f6;
  color: #fff;
  border: none;
}

.btn-secondary {
  background: #18181b;
  border: 1px solid #27272a;
  color: #a1a1aa;
}

.btn-lucky {
  background: rgba(139, 92, 246, 0.2);
  border: 1px solid rgba(139, 92, 246, 0.4);
  color: #c084fc;
}

.btn-wishlist {
  background: #18181b;
  border: 1px solid #27272a;
  color: #a1a1aa;
}

.btn-wishlist.active {
  background: rgba(245, 158, 11, 0.2);
  border-color: rgba(245, 158, 11, 0.5);
  color: #fbbf24;
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

/* BANDEAU MOBILE DE RECHERCHE DÉROULANT */
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

.chip-btn {
  background: #18181b;
  border: 1px solid #27272a;
  color: #a1a1aa;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.8rem;
  white-space: nowrap;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s ease;
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

/* 🖥️ BARRE FLOTTANTE DESKTOP (NAVIGATION PAR TYPE DYNAMIQUE) */
.floating-type-bar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(24, 24, 27, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 40px;
  padding: 6px 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
  z-index: 2000;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.floating-type-bar:hover {
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6), 0 0 16px rgba(59, 130, 246, 0.15);
}

.floating-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: 1px solid transparent;
  color: #a1a1aa;
  padding: 8px 18px;
  border-radius: 30px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.floating-tab:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.05);
}

.floating-tab.active {
  background: #3b82f6;
  color: #ffffff;
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);
}

.tab-emoji {
  font-size: 1rem;
}

/* 📱 AJUSTEMENTS SMARTPHONE */
@media (max-width: 768px) {
  .toolbar {
    position: fixed;
    top: calc(8px + env(safe-area-inset-top));
    left: 12px;
    right: 12px;
    width: auto;
    z-index: 1000;
    background: rgba(18, 18, 18, 0.92);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    padding: 6px 8px;
    border-radius: 14px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
    
    flex-direction: row;
    align-items: center;
    gap: 6px;

    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
    transform: translateY(0);
    opacity: 1;
  }

  .toolbar.is-hidden-mobile {
    transform: translateY(calc(-100% - 20px - env(safe-area-inset-top)));
    opacity: 0;
    pointer-events: none;
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
.loading-state { text-align: center; padding: 40px; color: #a1a1aa; }

.btn-lucky-mobile {
  background: rgba(139, 92, 246, 0.2) !important;
  border-color: rgba(139, 92, 246, 0.4) !important;
  color: #c084fc !important;
  font-weight: 700;
  padding: 7px 10px;
  font-size: 0.75rem;
}
</style>