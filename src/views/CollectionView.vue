<template>
  <div class="collection-container">
    <!-- Header App -->
    <header class="app-header">
      <div class="logo">
        <span class="logo-icon">🏛️</span>
        <span class="logo-text">Culture Vault</span>
      </div>

      <div class="user-info">
        <span class="user-badge" :title="authStore.user?.email">
          👤 {{ authStore.user?.email }}
        </span>
        <button class="btn btn-logout" @click="handleSignOut">Déconnexion</button>
      </div>
    </header>

    <!-- Module de recherche API / Scanner -->
    <ApiSearchPanel />

    <!-- Toolbar, Filtres & Lucky Dip -->
    <div class="toolbar">
      <div class="toolbar-top">
        <div class="search-box">
          <input 
            v-model="collectionStore.searchQuery" 
            type="text" 
            placeholder="🔍 Filtrer dans ma collection..."
          />
        </div>
        <button class="btn btn-lucky" @click="runLuckyDip" title="Tirer au sort une œuvre">
          🎲 Tirage au sort
        </button>
      </div>

      <div class="tabs">
        <button 
          v-for="tab in tabs" 
          :key="tab.id" 
          class="tab-btn" 
          :class="{ active: collectionStore.activeTypeFilter === tab.id }"
          @click="collectionStore.activeTypeFilter = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="stats-bar">{{ collectionStore.stats }}</div>
    </div>

    <!-- Grille de la collection -->
    <main class="grid-container">
      <div v-if="collectionStore.loading" class="loading-state">
        <p>Chargement de la collection...</p>
      </div>

      <div v-else-if="collectionStore.filteredItems.length === 0" class="empty-state">
        <p>Aucun élément trouvé dans cette catégorie.</p>
      </div>

      <div v-else class="items-grid" :class="`view-${collectionStore.currentViewMode}`">
        <ItemCard 
          v-for="item in collectionStore.filteredItems" 
          :key="item.id" 
          :item="item" 
          @delete="confirmDelete"
        />
      </div>
    </main>

    <!-- Modal Lucky Dip -->
    <div v-if="showLuckyModal" class="modal-overlay" @click.self="showLuckyModal = false">
      <div class="modal-content lucky-modal">
        <div class="modal-header">
          <h3>🎲 Tirage au sort</h3>
          <button class="btn-close" @click="showLuckyModal = false">✕</button>
        </div>

        <div v-if="luckyItem" class="lucky-display">
          <img 
            :src="luckyItem.cover || defaultCover" 
            :alt="luckyItem.title" 
            class="lucky-card-img"
          />
          <span class="type-tag">{{ getTypeLabel(luckyItem.type) }}</span>
          <div class="lucky-title">{{ luckyItem.title }}</div>
          <div class="lucky-artist">{{ luckyItem.artist }} {{ luckyItem.year ? `(${luckyItem.year})` : '' }}</div>
          
          <p v-if="!isRolling" class="lucky-success">
            🎉 Voilà ton choix pour aujourd'hui !
          </p>
          <p v-else class="lucky-rolling">
            Mélange en cours... 🎲
          </p>
        </div>

        <div class="lucky-actions">
          <button class="btn btn-secondary" @click="runLuckyDip" :disabled="isRolling">
            🔄 Retirer au sort
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useCollectionStore } from '../stores/collection';
import ItemCard from '../components/ItemCard.vue';
import ApiSearchPanel from '../components/ApiSearchPanel.vue';

const router = useRouter();
const authStore = useAuthStore();
const collectionStore = useCollectionStore();

const defaultCover = 'https://via.placeholder.com/200x300/2a2a2a/ffffff?text=Pas+d%27image';

// Lucky Dip
const showLuckyModal = ref(false);
const luckyItem = ref(null);
const isRolling = ref(false);

const tabs = [
  { id: 'all', label: 'Tout' },
  { id: 'vinyl', label: '💿 Vinyles' },
  { id: 'book', label: '📚 Livres' },
  { id: 'movie', label: '🎬 Films' },
  { id: 'wishlist', label: '✨ Wishlist' }
];

onMounted(() => {
  collectionStore.fetchItems();
});

async function handleSignOut() {
  collectionStore.clearMemory();
  await authStore.signOut();
  router.push('/');
}

async function confirmDelete(id) {
  if (confirm("Supprimer cet élément ?")) {
    await collectionStore.deleteItem(id);
  }
}

function getTypeLabel(type) {
  const icons = { vinyl: '💿 Vinyle', book: '📚 Livre / BD', movie: '🎬 DVD' };
  return icons[type] || 'Œuvre';
}

function runLuckyDip() {
  const pool = collectionStore.filteredItems;

  if (pool.length === 0) {
    alert("Aucun élément disponible dans cette catégorie pour le tirage au sort !");
    return;
  }

  showLuckyModal.value = true;
  isRolling.value = true;

  let counter = 0;
  const maxSteps = 12;

  const interval = setInterval(() => {
    luckyItem.value = pool[Math.floor(Math.random() * pool.length)];
    counter++;

    if (counter >= maxSteps) {
      clearInterval(interval);
      luckyItem.value = pool[Math.floor(Math.random() * pool.length)];
      isRolling.value = false;
    }
  }, 100);
}
</script>

<style scoped>
.collection-container {
  min-height: 100vh;
  background: #121212;
  color: #fff;
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.2rem;
  font-weight: 700;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-badge {
  background: #1f2937;
  color: #60a5fa;
  border: 1px solid #3b82f6;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
}

.toolbar {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.toolbar-top {
  display: flex;
  gap: 12px;
}

.search-box {
  flex: 1;
}

.search-box input {
  width: 100%;
  padding: 10px 14px;
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 8px;
  color: #fff;
  box-sizing: border-box;
}

.btn-lucky {
  background: #8b5cf6;
  color: #fff;
  border: none;
  padding: 10px 16px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
}

.tab-btn {
  background: #18181b;
  border: 1px solid #27272a;
  color: #a1a1aa;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  white-space: nowrap;
}

.tab-btn.active {
  background: #3b82f6;
  color: #fff;
  border-color: #3b82f6;
}

.stats-bar {
  font-size: 0.85rem;
  color: #a1a1aa;
  text-align: left;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
}

.btn-logout {
  background: #ef4444;
  color: #fff;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
}

.empty-state, .loading-state {
  padding: 40px 0;
  color: #a1a1aa;
}

/* Modal Lucky Dip Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 16px;
  padding: 24px;
  width: 90%;
  max-width: 360px;
  text-align: center;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.btn-close {
  background: none;
  border: none;
  color: #a1a1aa;
  font-size: 1.2rem;
  cursor: pointer;
}

.lucky-card-img {
  width: 180px;
  height: 180px;
  object-fit: cover;
  border-radius: 12px;
  margin-bottom: 12px;
}

.lucky-title {
  font-weight: 700;
  font-size: 1.1rem;
  margin-top: 6px;
}

.lucky-artist {
  color: #a1a1aa;
  font-size: 0.9rem;
}

.lucky-success {
  color: #10b981;
  font-weight: 700;
  margin-top: 12px;
  font-size: 0.9rem;
}

.lucky-rolling {
  color: #a1a1aa;
  margin-top: 12px;
  font-size: 0.9rem;
}

.lucky-actions {
  margin-top: 20px;
}
</style>