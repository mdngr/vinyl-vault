<template>
  <div class="account-page">
    <header class="page-header">
      <button class="btn-back desktop-only" @click="$router.push('/collection')">
        ← Retour à la collection
      </button>
      <h2>Mon Compte</h2>
    </header>

    <div class="account-grid">
      <!-- CARTE PROFIL (Mise en avant sur mobile) -->
      <div class="account-card profile-card">
        <div class="user-avatar">
          {{ userEmail ? userEmail.charAt(0).toUpperCase() : '👤' }}
        </div>
        <div class="user-info">
          <h3>{{ userEmail }}</h3>
          <p class="user-id">ID : <code>{{ userId }}</code></p>
        </div>
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
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useCollectionStore } from '../stores/collection';
import { supabase } from '../services/supabase';

const router = useRouter();
const authStore = useAuthStore();
const collectionStore = useCollectionStore();

const sendingEmail = ref(false);

const userEmail = computed(() => authStore.user?.email || 'Utilisateur');
const userId = computed(() => authStore.user?.id || 'Inconnu');

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
  transition: all 0.3s ease;
}

.user-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #3b82f6;
  color: #fff;
  font-size: 1.5rem;
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
  font-size: 1.2rem;
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
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
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

.type-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.type-icon {
  font-size: 1rem;
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

.sub-stat {
  font-size: 0.7rem;
  color: #71717a;
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
  margin-bottom: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.btn-action:last-child {
  margin-bottom: 0;
}

.btn-secondary {
  background: #27272a;
  color: #fff;
  border-color: #3f3f46;
}

.btn-secondary:hover { background: #3f3f46; }

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
    padding: 16px;
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
    flex-direction: column;
    text-align: center;
    padding: 30px 20px;
    gap: 16px;
  }

  .user-avatar {
    width: 80px;
    height: 80px;
    font-size: 2.2rem;
  }

  .user-info h3 {
    font-size: 1.4rem;
  }

  .user-id {
    font-size: 0.8rem;
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

  .type-item {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  .stat-value {
    font-size: 1.2rem;
  }

  .stat-label {
    font-size: 0.85rem;
  }

  .btn-action {
    padding: 16px;
    font-size: 1rem;
  }
}

stats-types-list {
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

  /* Grille à 3 colonnes pour alignement parfait */
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
  text-align: center; /* Aligne les chiffres exactement au centre de la colonne du milieu */
}

.type-row .sub-stat {
  font-size: 0.75rem;
  color: #71717a;
  text-align: right; /* Aligne le sous-texte sur le bord droit */
}

/* Ajustement mobile */
@media (max-width: 768px) {
  .type-row {
    grid-template-columns: 110px 1fr 100px;
    padding: 12px 14px;
  }
  
  .type-label {
    font-size: 0.75rem;
  }
}
</style>