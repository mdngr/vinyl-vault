<template>
  <div class="account-page">
    <header class="page-header">
      <button class="btn-back desktop-only" @click="$router.push('/collection')">
        ← Retour à la collection
      </button>
      <h2>Mon Compte</h2>
    </header>

    <div class="account-grid">
      <!-- CARTE PROFIL -->
      <div class="account-card profile-card">
        <div class="profile-main">
          <div class="user-avatar">
            {{ userEmail ? userEmail.charAt(0).toUpperCase() : '👤' }}
          </div>
          
          <div class="user-info">
            <h3>{{ userEmail }}</h3>
            <p class="user-id" :title="userId">
              ID : <code>{{ truncatedUserId }}</code>
            </p>
          </div>
        </div>

        <button class="btn-share-link" @click="copyShareLink">
          <span class="share-icon">🔗</span>
          <span>Copier le lien de ma collection</span>
        </button>
      </div>

      <!-- CARTE STATISTIQUES GLOBALES -->
      <div class="account-card stats-card">
        <h4>📊 Vue d'ensemble</h4>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">Total d'œuvres</span>
            <span class="stat-value">{{ collectionStore.items.length }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">En Collection</span>
            <span class="stat-value">{{ collectionItemsCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">En Wishlist</span>
            <span class="stat-value">{{ wishlistItemsCount }}</span>
          </div>
        </div>
      </div>

      <!-- CARTE STATISTIQUES PAR TYPE -->
      <div class="account-card stats-card">
        <h4>🏷️ Répartition par type</h4>
        <div class="stats-types-list">
          <div class="type-row">
            <div class="type-label">
              <span class="type-icon">🎵</span>
              <span>Musique</span>
            </div>
            <span class="stat-value">{{ vinylsCount }}</span>
            <span class="sub-stat">{{ vinylsWishlistCount }} en wishlist</span>
          </div>

          <div class="type-row">
            <div class="type-label">
              <span class="type-icon">📚</span>
              <span>Livres</span>
            </div>
            <span class="stat-value">{{ booksCount }}</span>
            <span class="sub-stat">{{ booksWishlistCount }} en wishlist</span>
          </div>

          <div class="type-row">
            <div class="type-label">
              <span class="type-icon">🎬</span>
              <span>Films</span>
            </div>
            <span class="stat-value">{{ moviesCount }}</span>
            <span class="sub-stat">{{ moviesWishlistCount }} en wishlist</span>
          </div>
        </div>
      </div>

      <!-- 📥 CARTE IMPORTS & EXPORTS -->
      <div class="account-card actions-card">
        <h4>📥 Données & Sauvegardes</h4>
        
        <div class="tools-list">
          <button class="btn-action btn-secondary" @click="isImportModalOpen = true">
            <span class="btn-icon">🎵</span>
            <span>Importer ma Wantlist Discogs (.csv)</span>
          </button>

          <button 
            class="btn-action btn-secondary" 
            @click="exportCollection" 
            :disabled="collectionStore.items.length === 0"
          >
            <span class="btn-icon">📦</span>
            <span>Exporter ma médiathèque (CSV)</span>
          </button>
        </div>
      </div>

      <!-- CARTE ACTIONS -->
      <div class="account-card actions-card">
        <h4>⚙️ Sécurité & Session</h4>
        
        <button class="btn-action btn-secondary" @click="resetPassword" :disabled="sendingEmail">
          {{ sendingEmail ? 'Envoi en cours...' : '🔑 Réinitialiser mon mot de passe' }}
        </button>

        <button class="btn-action btn-danger" @click="handleLogout">
          🚪 Se déconnecter
        </button>
      </div>
    </div>

    <!-- 🎁 MODALE IMPORT DISCOGS -->
    <DiscogsImportModal 
      v-if="isImportModalOpen" 
      @close="isImportModalOpen = false"
      @imported="handleImportSuccess"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import { useCollectionStore } from '../stores/collection.js';
import { supabase } from '../services/supabase.js';
import DiscogsImportModal from '../components/DiscogsImportModal.vue';

const router = useRouter();
const authStore = useAuthStore();
const collectionStore = useCollectionStore();

const sendingEmail = ref(false);
const isImportModalOpen = ref(false);

const userEmail = computed(() => authStore.user?.email || 'Utilisateur');
const userId = computed(() => authStore.user?.id || 'Inconnu');

const truncatedUserId = computed(() => {
  if (!userId.value || userId.value === 'Inconnu') return 'Inconnu';
  return `${userId.value.slice(0, 4)}...${userId.value.slice(-4)}`;
});

// Stats globales
const collectionItemsCount = computed(() => {
  return collectionStore.items.filter(i => !i.is_wishlist).length;
});

const wishlistItemsCount = computed(() => {
  return collectionStore.items.filter(i => i.is_wishlist).length;
});

// Stats par type
const vinylsCount = computed(() => {
  return collectionStore.items.filter(i => i.type === 'vinyl').length;
});

const vinylsWishlistCount = computed(() => {
  return collectionStore.items.filter(i => i.type === 'vinyl' && i.is_wishlist).length;
});

const booksCount = computed(() => {
  return collectionStore.items.filter(i => i.type === 'book').length;
});

const booksWishlistCount = computed(() => {
  return collectionStore.items.filter(i => i.type === 'book' && i.is_wishlist).length;
});

const moviesCount = computed(() => {
  return collectionStore.items.filter(i => i.type === 'movie').length;
});

const moviesWishlistCount = computed(() => {
  return collectionStore.items.filter(i => i.type === 'movie' && i.is_wishlist).length;
});

async function resetPassword() {
  if (!authStore.user?.email) return;
  
  sendingEmail.value = true;
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(authStore.user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
    alert("Un e-mail de réinitialisation de mot de passe vous a été envoyé !");
  } catch (err) {
    alert("Erreur : " + err.message);
  } finally {
    sendingEmail.value = false;
  }
}

async function handleLogout() {
  if (confirm("Voulez-vous vraiment vous déconnecter ?")) {
    await authStore.logout();
    router.push('/');
  }
}

function copyShareLink() {
  if (!authStore.user?.id) return;
  const shareUrl = `${window.location.origin}/share/${authStore.user.id}`;
  navigator.clipboard.writeText(shareUrl);
  alert("Lien de votre collection copié !");
}

// Rafraîchir le store après l'import CSV
async function handleImportSuccess() {
  await collectionStore.fetchItems();
}

// Exportation de la médiathèque au format CSV
function exportCollection() {
  if (collectionStore.items.length === 0) return;

  const headers = ['Title', 'Artist', 'Year', 'Type', 'Format', 'Wishlist'];
  const rows = collectionStore.items.map(item => [
    `"${(item.title || '').replace(/"/g, '""')}"`,
    `"${(item.artist || '').replace(/"/g, '""')}"`,
    item.year || '',
    item.type || '',
    item.format || '',
    item.is_wishlist ? 'true' : 'false'
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' 
    + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `culture_vault_export_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
</script>

<style scoped>
.account-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  padding-bottom: 90px;
}

.page-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0;
  color: #fff;
  font-size: 1.6rem;
}

.btn-back {
  align-self: flex-start;
  background: #18181b;
  border: 1px solid #27272a;
  color: #a1a1aa;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-back:hover {
  background: #27272a;
  color: #fff;
}

.account-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.account-card {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}

/* CARTE PROFIL */
.profile-card {
  flex-direction: column;
  align-items: stretch;
  gap: 16px;
}

.profile-main {
  display: flex;
  align-items: center;
  gap: 14px;
}

.user-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #3b82f6;
  color: #fff;
  font-size: 1.4rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-info h3 {
  margin: 0;
  color: #fff;
  font-size: 1.15rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-id {
  margin: 4px 0 0 0;
  font-size: 0.75rem;
  color: #71717a;
}

.user-id code {
  background: #09090b;
  color: #a1a1aa;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}

.btn-share-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 10px 14px;
  background: #27272a;
  border: 1px solid #3f3f46;
  border-radius: 10px;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-share-link:hover {
  background: #3f3f46;
  border-color: #52525b;
}

.btn-share-link:active {
  transform: scale(0.98);
}

.share-icon {
  font-size: 0.95rem;
}

/* CARTES STATS ET ACTIONS */
.stats-card, .actions-card {
  flex-direction: column;
  align-items: stretch;
}

.stats-card h4, .actions-card h4 {
  margin: 0 0 16px 0;
  color: #fff;
  font-size: 1.05rem;
}

/* GRILLE STATS (Desktop) */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  width: 100%;
}

.stat-item {
  background: #09090b;
  border: 1px solid #27272a;
  border-radius: 12px;
  padding: 16px 12px;
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 4px;
}

.stat-value {
  font-size: 1.4rem;
  font-weight: 700;
  color: #3b82f6;
}

.stat-label {
  font-size: 0.75rem;
  color: #a1a1aa;
  font-weight: 600;
  text-transform: uppercase;
}

/* REPARTITION PAR TYPE */
.stats-types-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.type-row {
  background: #09090b;
  border: 1px solid #27272a;
  border-radius: 12px;
  padding: 14px 18px;
  display: grid;
  grid-template-columns: 140px 1fr 120px;
  align-items: center;
}

.type-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #a1a1aa;
  text-transform: uppercase;
}

.type-icon {
  font-size: 1.1rem;
}

.type-row .stat-value {
  font-size: 1.4rem;
  font-weight: 700;
  color: #3b82f6;
  text-align: center;
}

.type-row .sub-stat {
  font-size: 0.75rem;
  color: #71717a;
  text-align: right;
}

/* LISTE DES OUTILS DONNÉES */
.tools-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.btn-icon {
  font-size: 1.1rem;
}

/* BOUTONS ACTIONS */
.btn-action {
  width: 100%;
  padding: 14px;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s ease;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.btn-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #27272a;
  color: #fff;
  border-color: #3f3f46;
}

.btn-secondary:hover:not(:disabled) { background: #3f3f46; }

.btn-danger {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  border-color: rgba(239, 68, 68, 0.3);
}

.btn-danger:hover {
  background: #ef4444;
  color: #fff;
}

.desktop-only { display: inline-flex; }

/* 📱 AJUSTEMENTS SMARTPHONE */
@media (max-width: 768px) {
  .desktop-only { display: none !important; }

  .account-page {
    padding-top: max(12px, env(safe-area-inset-top));
    padding-left: 12px;
    padding-right: 12px;
    padding-bottom: calc(75px + env(safe-area-inset-bottom));
  }

  .page-header h2 {
    text-align: center;
    font-size: 1.8rem;
    margin-bottom: 8px;
  }

  .profile-card {
    text-align: center;
    padding: 24px 16px;
  }

  .profile-main {
    flex-direction: column;
    text-align: center;
    gap: 10px;
  }

  .user-avatar {
    width: 64px;
    height: 64px;
    font-size: 1.8rem;
  }

  .user-info h3 {
    font-size: 1.25rem;
  }

  .stats-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .stat-item {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 14px 18px;
    text-align: left;
  }

  .type-row {
    grid-template-columns: 110px 1fr 100px;
    padding: 12px 14px;
  }
  
  .type-label {
    font-size: 0.75rem;
  }

  .btn-action {
    padding: 16px;
    font-size: 1rem;
  }
}
</style>