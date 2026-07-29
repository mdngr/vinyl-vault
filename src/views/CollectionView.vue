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
        <!-- Composant affiché directement dans la page -->
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
            {{ isSearchOpen ? '✕ Fermer' : '👤 Mon compte' }}
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
          <input 
            v-model="collectionStore.searchQuery" 
            type="text" 
            placeholder="🔍 Titre, artiste..." 
            class="input-search"
          />

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
        v-if="!isMobile"
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
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useCollectionStore } from '../stores/collection';
import ItemCard from '../components/ItemCard.vue';
import ApiSearchPanel from '../components/ApiSearchPanel.vue';
import LuckyPickModal from '../components/LuckyPickModal.vue';
import LuckyPickView from '../components/LuckyPickModal.vue'; // Réutilisation du composant
import SortModal from '../components/SortModal.vue';

const isSortModalOpen = ref(false);

const authStore = useAuthStore();
const collectionStore = useCollectionStore();

const isSearchOpen = ref(false);
const isLuckyPickOpen = ref(false);
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

function selectTab(type) {
  isSearchOpen.value = false;
  isLuckyPickOpen.value = false;
  collectionStore.activeTypeFilter = type;
}

function openMobileSearch() {
  isLuckyPickOpen.value = false;
  isSearchOpen.value = !isSearchOpen.value;
}

function openMobileLuckyPick() {
  isSearchOpen.value = false;
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
  padding-bottom: 20px; /* Espace normal en desktop */
}

/* Dégagement spécifique pour la Tab Bar seulement sur Mobile */
@media (max-width: 768px) {
  .collection-page {
    padding: 12px;
    padding-bottom: 90px; /* Dégage la barre fixe */
  }
}

/* DESKTOP / MOBILE DISPLAY UTILS */
.desktop-only { display: flex; }
.mobile-only { display: none; }

@media (max-width: 768px) {
  .desktop-only { display: none !important; }
  .mobile-only { display: flex !important; }
  .collection-page { padding: 12px; padding-bottom: 90px; }
}

/* VUES PLEIN ÉCRAN MOBILE */
.fullscreen-mobile-view {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 65px; /* Laisse apparaitre la Tab Bar en bas */
  background: #09090b;
  z-index: 1500;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 16px;
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

.btn-lucky {
  background: rgba(139, 92, 246, 0.2);
  border: 1px solid rgba(139, 92, 246, 0.4);
  color: #c084fc;
  font-weight: 600;
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
}

.search-section {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 12px;
  padding: 16px;
}

/* --------------------------------------------------
   BARRE D'OUTILS ET FILTRES (RESPONSIVE OPTIMISÉ)
-------------------------------------------------- */
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
  min-width: 0; /* Empêche le débordement Flexbox */
}

.input-search {
  flex: 1;
  min-width: 0; /* Permet au champ de rétrécir correctement sur mobile */
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

/* 📱 AJUSTEMENTS SPÉCIFIQUES SMARTPHONE (<= 768px) */
@media (max-width: 768px) {
  .toolbar {
    flex-direction: row;
    align-items: center;
    gap: 6px;
  }

  .filters-group {
    gap: 6px;
  }

  .input-search {
    font-size: 0.8rem;
    padding: 7px 9px;
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

/* Masquée par défaut sur Desktop / Grands écrans */
.mobile-tab-bar {
  display: none !important;
}

/* --------------------------------------------------
   RESPONSIVE & GESTION DE LA TAB BAR
-------------------------------------------------- */

/* Affichée uniquement sur écran Mobile (<= 768px) */
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

.tab-icon { font-size: 1.1rem; }
.tab-item.active { color: #3b82f6; font-weight: 700; }
.tab-action-lucky.active, .tab-action-lucky { color: #c084fc; }
.tab-action-add.active, .tab-action-add { color: #3b82f6; }
</style>