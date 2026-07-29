<template>
  <div class="app-shell">
    <!-- En-tête fixe compact avec Safe Area iOS -->
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
        <!-- BARRE DE RECHERCHE & COMMANDES ÉPURÉES -->
        <div class="toolbar">
          <!-- Ligne 1 : Champ de recherche principal + Tirage au sort -->
          <div class="search-row">
            <div class="search-input-wrapper">
              <span class="search-icon">🔍</span>
              <input 
                v-model="collectionStore.searchQuery" 
                type="text" 
                placeholder="Rechercher dans mes œuvres..."
              />
              <button 
                v-if="collectionStore.searchQuery" 
                class="btn-clear" 
                @click="collectionStore.searchQuery = ''"
              >
                ✕
              </button>
            </div>
            
            <button class="btn-icon btn-lucky" @click="runLuckyDip" title="Tirer au sort">
              🎲
            </button>
          </div>

          <!-- Ligne 2 : Filtres rapides (Wishlist, Catégories, Tri) -->
          <div class="controls-row">
            <!-- Toggle Wishlist -->
            <button 
              class="chip-btn chip-wishlist"
              :class="{ active: collectionStore.showWishlistOnly }"
              @click="collectionStore.showWishlistOnly = !collectionStore.showWishlistOnly"
            >
              ✨ Wishlist
            </button>

            <!-- Dropdown Catégories -->
            <select v-model="collectionStore.activeTypeFilter" class="select-chip">
              <option value="all">📂 Tout</option>
              <option value="vinyl">💿 Vinyles</option>
              <option value="book">📚 Livres</option>
              <option value="movie">🎬 Films</option>
            </select>

            <!-- Bouton Options de Tri -->
            <button class="chip-btn chip-sort" @click="showSortModal = true">
              <span>{{ currentSortLabel }}</span>
              <span class="sort-arrow">{{ collectionStore.sortOrder === 'asc' ? '⬆️' : '⬇️' }}</span>
            </button>
          </div>

          <!-- Ligne 3 : Compteur d'éléments + Sélecteur de Vue (Grille / Liste) -->
          <div class="stats-row">
            <span class="stats-text">{{ collectionStore.stats }}</span>

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
        </div>

        <!-- Chargement / Contenu -->
        <div v-if="collectionStore.loading" class="loading-state">
          <p>Chargement de la collection...</p>
        </div>

        <!-- Empty State structuré -->
        <EmptyState 
          v-else-if="collectionStore.filteredItems.length === 0"
          :showWishlistOnly="collectionStore.showWishlistOnly"
          :searchQuery="collectionStore.searchQuery"
          :activeTypeFilter="collectionStore.activeTypeFilter"
          @action="currentTab = 'add'"
        />

        <!-- Liste / Grille des œuvres -->
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

    <!-- TAB BAR FIXE EN BAS -->
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

    <!-- MODALE OPTION DE TRI -->
    <div v-if="showSortModal" class="modal-overlay" @click.self="showSortModal = false">
      <div class="modal-content sort-modal">
        <div class="modal-header">
          <h3>⚡ Trier les œuvres</h3>
          <button class="btn-close" @click="showSortModal = false">✕</button>
        </div>

        <div class="sort-options-list">
          <label class="sort-option-item">
            <span>Critère de tri</span>
            <select v-model="collectionStore.sortBy" class="modal-select">
              <option value="title">🔤 Titre de l'œuvre</option>
              <option value="artist">👤 Auteur / Artiste</option>
              <option value="year">📅 Année de sortie</option>
            </select>
          </label>

          <label class="sort-option-item">
            <span>Ordre d'affichage</span>
            <div class="toggle-group">
              <button 
                class="toggle-btn" 
                :class="{ active: collectionStore.sortOrder === 'asc' }"
                @click="collectionStore.sortOrder = 'asc'"
              >
                ⬆️ Ascendant (A-Z, Croissant)
              </button>
              <button 
                class="toggle-btn" 
                :class="{ active: collectionStore.sortOrder === 'desc' }"
                @click="collectionStore.sortOrder = 'desc'"
              >
                ⬇️ Descendant (Z-A, Récent)
              </button>
            </div>
          </label>
        </div>

        <button class="btn btn-primary btn-full modal-confirm" @click="showSortModal = false">
          Appliquer
        </button>
      </div>
    </div>

    <!-- MODALE LUCKY DIP -->
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
import EmptyState from '../components/EmptyState.vue';

const router = useRouter();
const authStore = useAuthStore();
const collectionStore = useCollectionStore();

const defaultCover = 'https://via.placeholder.com/200x300/2a2a2a/ffffff?text=Pas+d%27image';

const currentTab = ref('library');
const showSortModal = ref(false);

const activeTabTitle = computed(() => {
  if (currentTab.value === 'add') return '➕ Ajout';
  if (currentTab.value === 'account') return '👤 Profil';
  return collectionStore.showWishlistOnly ? '✨ Ma Wishlist' : '📚 Ma Collection';
});

const currentSortLabel = computed(() => {
  const map = { title: 'Titre', artist: 'Auteur', year: 'Année' };
  return map[collectionStore.sortBy] || 'Tri';
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
/* App Shell & Header */
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

.app-header {
  height: auto;
  min-height: 52px;
  padding-top: calc(env(safe-area-inset-top) + 8px);
  padding-bottom: 8px;
  padding-left: 16px;
  padding-right: 16px;
  background: #18181b;
  border-bottom: 1px solid #27272a;
  display: flex;
  align-items: center;
  justify-content: space-between;
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
  font-size: 0.75rem;
  background: #27272a;
  color: #60a5fa;
  padding: 3px 8px;
  border-radius: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.app-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  padding-bottom: calc(80px + env(safe-area-inset-bottom));
  -webkit-overflow-scrolling: touch;
}

.tab-page {
  max-width: 1000px;
  margin: 0 auto;
}

/* NAVBAR ET COMMANDES OPTIMISÉES */
.toolbar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
  background: #18181b;
  padding: 10px;
  border-radius: 12px;
  border: 1px solid #27272a;
}

.search-row {
  display: flex;
  gap: 8px;
}

.search-input-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 10px;
  font-size: 0.85rem;
  opacity: 0.6;
}

.search-input-wrapper input {
  width: 100%;
  padding: 8px 30px 8px 32px;
  background: #09090b;
  border: 1px solid #27272a;
  border-radius: 8px;
  color: #fff;
  font-size: 0.85rem;
}

.btn-clear {
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  color: #a1a1aa;
  cursor: pointer;
  font-size: 0.8rem;
}

.btn-lucky {
  background: #8b5cf6;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* Ligne des filtres */
.controls-row {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
}

.chip-btn, .select-chip {
  background: #09090b;
  border: 1px solid #27272a;
  color: #a1a1aa;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  height: 32px;
  flex: 1;
}

.chip-wishlist.active {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
  border-color: #f59e0b;
}

.select-chip {
  color: #60a5fa;
  outline: none;
}

.chip-sort {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

/* Ligne du compteur et du sélecteur de vue */
.stats-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 2px;
}

.stats-text {
  font-size: 0.75rem;
  color: #a1a1aa;
}

.view-toggle {
  display: flex;
  background: #09090b;
  border: 1px solid #27272a;
  border-radius: 8px;
  padding: 2px;
}

.btn-toggle {
  background: transparent;
  border: none;
  color: #a1a1aa;
  padding: 2px 6px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
}

.btn-toggle.active {
  background: #27272a;
  color: #fff;
}

/* Grille & Liste */
.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(135px, 1fr));
  gap: 10px;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Profil & Stats */
.profile-card {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 16px;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.avatar-circle {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #3b82f6;
  color: #fff;
  font-size: 1.6rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.account-stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  width: 100%;
  margin: 20px 0;
}

.stat-card {
  background: #09090b;
  border: 1px solid #27272a;
  border-radius: 10px;
  padding: 10px;
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.2rem;
  font-weight: 700;
  color: #60a5fa;
}

.stat-label {
  font-size: 0.7rem;
  color: #a1a1aa;
}

/* Bottom Tab Bar */
.bottom-tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100vw;
  height: calc(60px + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: #18181b;
  border-top: 1px solid #27272a;
  display: flex;
  justify-content: space-around;
  align-items: center;
  z-index: 1000;
}

.tab-item {
  background: transparent;
  border: none;
  color: #a1a1aa;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  height: 100%;
  cursor: pointer;
}

.tab-item.active {
  color: #3b82f6;
}

.tab-icon {
  font-size: 1.2rem;
}

.tab-label {
  font-size: 0.65rem;
  font-weight: 600;
}

.tab-item-add .add-icon-bubble {
  background: #3b82f6;
  color: #fff;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
}

/* Modales & Tri */
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
  padding: 20px;
  width: 90%;
  max-width: 360px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.sort-options-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
  text-align: left;
}

.sort-option-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.8rem;
  color: #a1a1aa;
}

.modal-select {
  background: #09090b;
  border: 1px solid #27272a;
  color: #fff;
  padding: 8px;
  border-radius: 8px;
}

.toggle-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.toggle-btn {
  background: #09090b;
  border: 1px solid #27272a;
  color: #a1a1aa;
  padding: 8px;
  border-radius: 8px;
  font-size: 0.8rem;
  cursor: pointer;
  text-align: left;
}

.toggle-btn.active {
  background: #27272a;
  color: #60a5fa;
  border-color: #3b82f6;
}

.btn-close {
  background: none;
  border: none;
  color: #a1a1aa;
  font-size: 1.2rem;
  cursor: pointer;
}
</style>