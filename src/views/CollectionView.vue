<template>
  <div class="app-shell">
    <!-- En-tête fixe compact -->
    <header class="app-header">
      <div class="logo">
        <span class="logo-icon">🏛️</span>
        <span class="logo-text">Culture Vault</span>
      </div>
      <div class="header-right">
        <span class="view-title-badge">{{ activeTabTitle }}</span>
      </div>
    </header>

    <!-- Zone de contenu défilante -->
    <main class="app-content">
      <!-- ===================================================================
           ONGLET 1 : BIBLIOTHÈQUE / COLLECTION
           =================================================================== -->
      <section v-if="currentTab === 'library'" class="tab-page">
        <div class="toolbar">
          <div class="toolbar-top">
            <div class="search-box">
              <input 
                v-model="collectionStore.searchQuery" 
                type="text" 
                placeholder="🔍 Filtrer mes œuvres..."
              />
            </div>
            <button class="btn btn-lucky" @click="runLuckyDip" title="Tirer au sort">
              🎲
            </button>
          </div>

          <div class="toolbar-middle">
            <div class="tabs">
              <button 
                v-for="tab in filterTabs" 
                :key="tab.id" 
                class="tab-btn" 
                :class="{ active: collectionStore.activeTypeFilter === tab.id }"
                @click="collectionStore.activeTypeFilter = tab.id"
              >
                {{ tab.label }}
              </button>
            </div>

            <div class="view-toggle">
              <button 
                class="btn-toggle" 
                :class="{ active: collectionStore.currentViewMode === 'grid' }"
                @click="collectionStore.currentViewMode = 'grid'"
                title="Vue Grille"
              >
                🔲
              </button>
              <button 
                class="btn-toggle" 
                :class="{ active: collectionStore.currentViewMode === 'list' }"
                @click="collectionStore.currentViewMode = 'list'"
                title="Vue Liste"
              >
                ☰
              </button>
            </div>
          </div>

          <div class="stats-bar">{{ collectionStore.stats }}</div>
        </div>

        <div v-if="collectionStore.loading" class="loading-state">
          <p>Chargement de la collection...</p>
        </div>

        <div v-else-if="collectionStore.filteredItems.length === 0" class="empty-state">
          <p>Aucun élément trouvé dans cette catégorie.</p>
        </div>

        <div 
          v-else 
          :class="collectionStore.currentViewMode === 'list' ? 'items-list' : 'items-grid'"
        >
          <ItemCard 
            v-for="item in collectionStore.filteredItems" 
            :key="item.id" 
            :item="item" 
            :isListView="collectionStore.currentViewMode === 'list'"
            @delete="confirmDelete"
          />
        </div>
      </section>

      <!-- ===================================================================
           ONGLET 2 : AJOUT & SCANNER
           =================================================================== -->
      <section v-if="currentTab === 'add'" class="tab-page">
        <div class="add-section-header">
          <h2>Ajouter une œuvre</h2>
          <p class="subtitle">Scanne un code-barres ou cherche sur Discogs, OpenLibrary et TMDB.</p>
        </div>
        <ApiSearchPanel />
      </section>

      <!-- ===================================================================
           ONGLET 3 : COMPTE & PROFIL
           =================================================================== -->
      <section v-if="currentTab === 'account'" class="tab-page">
        <div class="profile-card">
          <div class="avatar-circle">{{ userInitial }}</div>
          <div class="user-email-label">Compte connecté</div>
          <div class="user-email-val">{{ authStore.user?.email }}</div>

          <div class="account-stats-grid">
            <div class="stat-card">
              <span class="stat-value">{{ countCollection }}</span>
              <span class="stat-label">En collection</span>
            </div>
            <div class="stat-card">
              <span class="stat-value">{{ countWishlist }}</span>
              <span class="stat-label">En Wishlist</span>
            </div>
            <div class="stat-card">
              <span class="stat-value">{{ countVinyls }}</span>
              <span class="stat-label">Vinyles</span>
            </div>
            <div class="stat-card">
              <span class="stat-value">{{ countBooks }}</span>
              <span class="stat-label">Livres / BDs</span>
            </div>
          </div>

          <div class="profile-actions">
            <button class="btn btn-logout btn-full" @click="handleSignOut">
              🚪 Se déconnecter
            </button>
          </div>
        </div>
      </section>
    </main>

    <!-- ===================================================================
         TAB BAR FIXE EN BAS DE L'ÉCRAN
         =================================================================== -->
    <nav class="bottom-tab-bar">
      <button 
        class="tab-item" 
        :class="{ active: currentTab === 'library' }"
        @click="currentTab = 'library'"
      >
        <span class="tab-icon">📚</span>
        <span class="tab-label">Bibliothèque</span>
      </button>

      <button 
        class="tab-item tab-item-add" 
        :class="{ active: currentTab === 'add' }"
        @click="currentTab = 'add'"
      >
        <div class="add-icon-bubble">➕</div>
        <span class="tab-label">Ajouter</span>
      </button>

      <button 
        class="tab-item" 
        :class="{ active: currentTab === 'account' }"
        @click="currentTab = 'account'"
      >
        <span class="tab-icon">👤</span>
        <span class="tab-label">Compte</span>
      </button>
    </nav>

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
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useCollectionStore } from '../stores/collection';
import ItemCard from '../components/ItemCard.vue';
import ApiSearchPanel from '../components/ApiSearchPanel.vue';

const router = useRouter();
const authStore = useAuthStore();
const collectionStore = useCollectionStore();

const defaultCover = 'https://via.placeholder.com/200x300/2a2a2a/ffffff?text=Pas+d%27image';

// Onglet actif ('library' | 'add' | 'account')
const currentTab = ref('library');

const activeTabTitle = computed(() => {
  if (currentTab.value === 'add') return '➕ Ajout';
  if (currentTab.value === 'account') return '👤 Profil';
  return '📚 Ma Collection';
});

// Stats profil
const userInitial = computed(() => {
  return authStore.user?.email ? authStore.user.email.charAt(0).toUpperCase() : '👤';
});

const countCollection = computed(() => collectionStore.items.filter(i => !i.is_wishlist).length);
const countWishlist = computed(() => collectionStore.items.filter(i => i.is_wishlist).length);
const countVinyls = computed(() => collectionStore.items.filter(i => i.type === 'vinyl').length);
const countBooks = computed(() => collectionStore.items.filter(i => i.type === 'book').length);

// Lucky Dip
const showLuckyModal = ref(false);
const luckyItem = ref(null);
const isRolling = ref(false);

const filterTabs = [
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
/* Conteneur App Shell */
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  max-width: 100vw;
  overflow: hidden;
  background: #121212;
  color: #fff;
}

/* Header Fixe Haut */
.app-header {
  height: 56px;
  background: #18181b;
  border-bottom: 1px solid #27272a;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  flex-shrink: 0;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 1.1rem;
}

.view-title-badge {
  font-size: 0.8rem;
  background: #27272a;
  color: #60a5fa;
  padding: 4px 10px;
  border-radius: 12px;
  font-weight: 600;
}

/* Zone Défilante Milieu */
.app-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  padding-bottom: 80px; /* Marge pour ne pas cacher le bas par la TabBar */
  -webkit-overflow-scrolling: touch;
}

.tab-page {
  max-width: 1000px;
  margin: 0 auto;
}

/* Page Ajout */
.add-section-header {
  text-align: left;
  margin-bottom: 16px;
}

.add-section-header h2 {
  font-size: 1.25rem;
  font-weight: 700;
}

.add-section-header .subtitle {
  font-size: 0.85rem;
  color: #a1a1aa;
}

/* Page Compte */
.profile-card {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 16px;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.avatar-circle {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: #3b82f6;
  color: #fff;
  font-size: 1.8rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.user-email-label {
  font-size: 0.8rem;
  color: #a1a1aa;
}

.user-email-val {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 24px;
}

.account-stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  width: 100%;
  margin-bottom: 24px;
}

.stat-card {
  background: #09090b;
  border: 1px solid #27272a;
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.3rem;
  font-weight: 700;
  color: #60a5fa;
}

.stat-label {
  font-size: 0.75rem;
  color: #a1a1aa;
}

.profile-actions {
  width: 100%;
}

.btn-full {
  width: 100%;
  padding: 12px;
}

/* TAB BAR FIXE BAS */
.bottom-tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100vw;
  height: 64px;
  background: #18181b;
  border-top: 1px solid #27272a;
  display: flex;
  justify-content: space-around;
  align-items: center;
  z-index: 1000;
  padding-bottom: env(safe-area-inset-bottom); /* Support iPhone notch */
}

.tab-item {
  background: transparent;
  border: none;
  color: #a1a1aa;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  flex: 1;
  height: 100%;
  cursor: pointer;
  transition: color 0.2s ease;
}

.tab-item.active {
  color: #3b82f6;
}

.tab-icon {
  font-size: 1.25rem;
}

.tab-label {
  font-size: 0.7rem;
  font-weight: 600;
}

/* Bouton Central 'Ajouter' en surbrillance */
.tab-item-add .add-icon-bubble {
  background: #3b82f6;
  color: #fff;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  transition: transform 0.2s ease;
}

.tab-item-add.active .add-icon-bubble {
  transform: scale(1.1);
  background: #2563eb;
}

/* Toolbar & Grille */
.toolbar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.toolbar-top {
  display: flex;
  gap: 10px;
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
}

.btn-lucky {
  background: #8b5cf6;
  color: #fff;
  border: none;
  padding: 10px 14px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
}

.toolbar-middle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.tabs {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  flex: 1;
}

.tab-btn {
  background: #18181b;
  border: 1px solid #27272a;
  color: #a1a1aa;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 0.8rem;
  cursor: pointer;
  white-space: nowrap;
}

.tab-btn.active {
  background: #3b82f6;
  color: #fff;
  border-color: #3b82f6;
}

.view-toggle {
  display: flex;
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 8px;
  padding: 2px;
}

.btn-toggle {
  background: transparent;
  border: none;
  color: #a1a1aa;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
}

.btn-toggle.active {
  background: #27272a;
  color: #fff;
}

.stats-bar {
  font-size: 0.8rem;
  color: #a1a1aa;
  text-align: left;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Modales */
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
  z-index: 2000;
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

.btn-close {
  background: none;
  border: none;
  color: #a1a1aa;
  font-size: 1.2rem;
  cursor: pointer;
}
</style>