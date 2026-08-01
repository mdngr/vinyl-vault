<template>
  <div class="account-page">
    <header class="page-header">
      <button class="btn-back desktop-only" @click="navigateTo('/collection')">
        ← Retour à la collection
      </button>
      <h2>Mon Compte</h2>
    </header>

    <div class="account-grid">
      <!-- 1. CARTE PROFIL PRINCIPAL (TOUJOURS VISIBLE) -->
      <div class="account-card profile-card">
        <div class="profile-main">
          <div class="user-avatar">
            {{ userAvatarLetter }}
          </div>
          
          <div class="user-info">
            <h3>{{ fullName }}</h3>
            <p class="user-email">{{ userEmail }}</p>
            <p v-if="userCity" class="user-city">📍 {{ userCity }}</p>
          </div>
        </div>

        <div class="profile-actions-row">
          <button class="btn-action btn-secondary" @click="openEditProfileModal">
            ✏️ Modifier mes informations
          </button>

          <button class="btn-share-link" @click="copyShareLink">
            <span class="share-icon">🔗</span>
            <span>Copier le lien de ma collection</span>
          </button>
        </div>
      </div>

      <!-- 2. CARTE STATISTIQUES GLOBALES (RÉSUMÉ RAPIDE) -->
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

      <!-- 3. ACCORDÉON : RÉGLAGES DES MÉDIAS (DÉPLIABLE & ENREGISTRÉ EN BDD) -->
      <div class="account-card accordion-card">
        <button type="button" class="accordion-trigger" @click="sections.media = !sections.media">
          <div class="accordion-title">
            <span class="accordion-icon">🎛️</span>
            <div>
              <h4>Collections & Médias gérés</h4>
              <p class="accordion-subtitle">Activer ou masquer des catégories</p>
            </div>
          </div>
          <span class="toggle-arrow">{{ sections.media ? '▲' : '▼' }}</span>
        </button>

        <div v-if="sections.media" class="accordion-body">
          <p class="settings-subtext">Coche uniquement les catégories que tu souhaites afficher dans tes filtres et ta recherche.</p>

          <div class="switches-list">
            <label class="switch-item">
              <div class="switch-info">
                <span class="type-icon">🎵</span>
                <span>Musique (Vinyles, CD...)</span>
              </div>
              <input type="checkbox" v-model="userMediaSettings.vinyl" @change="saveMediaSettings" />
            </label>

            <label class="switch-item">
              <div class="switch-info">
                <span class="type-icon">📚</span>
                <span>Livres & BD</span>
              </div>
              <input type="checkbox" v-model="userMediaSettings.book" @change="saveMediaSettings" />
            </label>

            <label class="switch-item">
              <div class="switch-info">
                <span class="type-icon">🎬</span>
                <span>Films & Séries</span>
              </div>
              <input type="checkbox" v-model="userMediaSettings.movie" @change="saveMediaSettings" />
            </label>

            <!-- <label class="switch-item highlight">
              <div class="switch-info">
                <span class="type-icon">🎲</span>
                <span>Jeux de société</span>
              </div>
              <input type="checkbox" v-model="userMediaSettings.boardgame" @change="saveMediaSettings" />
            </label> -->

            <label class="switch-item highlight">
              <div class="switch-info">
                <span class="type-icon">🎮</span>
                <span>Jeux vidéo</span>
              </div>
              <input type="checkbox" v-model="userMediaSettings.videogame" @change="saveMediaSettings" />
            </label>
          </div>
        </div>
      </div>

      <!-- 4. ACCORDÉON : STATISTIQUES DÉTAILLÉES (DÉPLIABLE) -->
      <div class="account-card accordion-card">
        <button type="button" class="accordion-trigger" @click="sections.stats = !sections.stats">
          <div class="accordion-title">
            <span class="accordion-icon">🏷️</span>
            <div>
              <h4>Détail par catégorie</h4>
              <p class="accordion-subtitle">Nombre d'éléments possédés et recherchés</p>
            </div>
          </div>
          <span class="toggle-arrow">{{ sections.stats ? '▲' : '▼' }}</span>
        </button>

        <div v-if="sections.stats" class="accordion-body">
          <div class="stats-types-list">
            <div v-if="userMediaSettings.vinyl" class="type-row">
              <div class="type-label">
                <span class="type-icon">🎵</span>
                <span>Musique</span>
              </div>
              <span class="stat-value">{{ vinylsCount }}</span>
              <span class="sub-stat">{{ vinylsWishlistCount }} en wishlist</span>
            </div>

            <div v-if="userMediaSettings.book" class="type-row">
              <div class="type-label">
                <span class="type-icon">📚</span>
                <span>Livres</span>
              </div>
              <span class="stat-value">{{ booksCount }}</span>
              <span class="sub-stat">{{ booksWishlistCount }} en wishlist</span>
            </div>

            <div v-if="userMediaSettings.movie" class="type-row">
              <div class="type-label">
                <span class="type-icon">🎬</span>
                <span>Films</span>
              </div>
              <span class="stat-value">{{ moviesCount }}</span>
              <span class="sub-stat">{{ moviesWishlistCount }} en wishlist</span>
            </div>

            <div v-if="userMediaSettings.boardgame" class="type-row">
              <div class="type-label">
                <span class="type-icon">🎲</span>
                <span>Jeux</span>
              </div>
              <span class="stat-value">{{ boardgamesCount }}</span>
              <span class="sub-stat">{{ boardgamesWishlistCount }} en wishlist</span>
            </div>

            <div v-if="userMediaSettings.videogame" class="type-row">
              <div class="type-label">
                <span class="type-icon">🎮</span>
                <span>Gaming</span>
              </div>
              <span class="stat-value">{{ videogamesCount }}</span>
              <span class="sub-stat">{{ videogamesWishlistCount }} en wishlist</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 5. ACCORDÉON : OUTILS & REGLAGES (DONNÉES & SÉCURITÉ REGROUPÉS) -->
      <div class="account-card accordion-card">
        <button type="button" class="accordion-trigger" @click="sections.tools = !sections.tools">
          <div class="accordion-title">
            <span class="accordion-icon">⚙️</span>
            <div>
              <h4>Données & Sécurité du compte</h4>
              <p class="accordion-subtitle">Exports, imports Discogs et mot de passe</p>
            </div>
          </div>
          <span class="toggle-arrow">{{ sections.tools ? '▲' : '▼' }}</span>
        </button>

        <div v-if="sections.tools" class="accordion-body">
          <div class="actions-group">
            <span class="group-title">📥 Données & Sauvegardes</span>
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

          <div class="actions-group margin-top">
            <span class="group-title">🔒 Connexion & Session</span>
            <div class="tools-list">
              <button class="btn-action btn-secondary" @click="resetPassword" :disabled="sendingEmail">
                {{ sendingEmail ? 'Envoi en cours...' : '🔑 Réinitialiser mon mot de passe' }}
              </button>

              <button class="btn-action btn-danger" @click="handleLogout">
                🚪 Se déconnecter
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 🎁 MODALE MODIFICATION DU PROFIL -->
    <div v-if="isEditModalOpen" class="modal-overlay" @click.self="isEditModalOpen = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Modifier mes informations</h3>
          <button class="btn-close" @click="isEditModalOpen = false">✕</button>
        </div>

        <form @submit.prevent="saveProfile" class="modal-body">
          <div class="form-group">
            <label>Adresse e-mail (non modifiable)</label>
            <input 
              type="email" 
              :value="userEmail" 
              disabled 
              class="input-disabled"
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="editFirstName">Prénom</label>
              <input 
                id="editFirstName" 
                v-model="editFirstName" 
                type="text" 
                placeholder="Ton prénom"
                required
              />
            </div>

            <div class="form-group">
              <label for="editLastName">Nom</label>
              <input 
                id="editLastName" 
                v-model="editLastName" 
                type="text" 
                placeholder="Ton nom"
                required
              />
            </div>
          </div>

          <div class="form-group">
            <label for="editCity">Ville</label>
            <input 
              id="editCity" 
              v-model="editCity" 
              type="text" 
              placeholder="Ex: Paris, Lyon, Angers..."
            />
          </div>

          <p v-if="editErrorMsg" class="error-msg">{{ editErrorMsg }}</p>

          <div class="modal-actions">
            <button 
              type="button" 
              class="btn-action btn-secondary" 
              @click="isEditModalOpen = false" 
              :disabled="savingProfile"
            >
              Annuler
            </button>
            <button 
              type="submit" 
              class="btn-action btn-primary" 
              :disabled="savingProfile"
            >
              {{ savingProfile ? 'Enregistrement...' : 'Enregistrer' }}
            </button>
          </div>
        </form>
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
import { ref, computed, onMounted, watch } from 'vue';
import { useAuthStore } from '../stores/auth.js';
import { useCollectionStore } from '../stores/collection.js';
import DiscogsImportModal from '../components/DiscogsImportModal.vue';

useHead({
  title: 'Mon compte - Culture Vault',
  meta: [
    { name: 'description', content: 'Catalogne tes albums, suis tes pièces rares et garde un œil sur ta discothèque.' }
  ]
});

const authStore = useAuthStore();
const collectionStore = useCollectionStore();
const { $supabase } = useNuxtApp();

const sendingEmail = ref(false);
const isImportModalOpen = ref(false);

// État des accordéons
const sections = ref({
  media: false,
  stats: false,
  tools: false
});

// Réglages par défaut des types de médias
const userMediaSettings = ref({
  vinyl: true,
  book: true,
  movie: true,
  boardgame: false,
  videogame: false
});

// État du profil
const userProfile = ref({
  first_name: '',
  last_name: '',
  city: ''
});

// Modale d'édition
const isEditModalOpen = ref(false);
const editFirstName = ref('');
const editLastName = ref('');
const editCity = ref('');
const savingProfile = ref(false);
const editErrorMsg = ref('');

const userEmail = computed(() => authStore.user?.email || 'Utilisateur');

const fullName = computed(() => {
  if (userProfile.value.first_name || userProfile.value.last_name) {
    return `${userProfile.value.first_name} ${userProfile.value.last_name}`.trim();
  }
  const meta = authStore.user?.user_metadata;
  if (meta?.first_name || meta?.last_name) {
    return `${meta.first_name || ''} ${meta.last_name || ''}`.trim();
  }
  return userEmail.value;
});

const userCity = computed(() => userProfile.value.city || authStore.user?.user_metadata?.city || '');

const userAvatarLetter = computed(() => {
  if (userProfile.value.first_name) return userProfile.value.first_name.charAt(0).toUpperCase();
  if (userEmail.value && userEmail.value !== 'Utilisateur') return userEmail.value.charAt(0).toUpperCase();
  return '👤';
});

// 📥 Chargement des préférences de médias (BDD Supabase avec fallback localStorage)
function loadMediaSettings() {
  const metaSettings = authStore.user?.user_metadata?.media_settings;

  if (metaSettings) {
    userMediaSettings.value = { ...userMediaSettings.value, ...metaSettings };
    if (import.meta.client) {
      localStorage.setItem('user_media_settings', JSON.stringify(userMediaSettings.value));
    }
  } else if (import.meta.client) {
    const saved = localStorage.getItem('user_media_settings');
    if (saved) {
      try {
        userMediaSettings.value = { ...userMediaSettings.value, ...JSON.parse(saved) };
      } catch (e) {
        console.error("Erreur lecture media settings", e);
      }
    }
  }
}

// 💾 Sauvegarde des préférences dans la BDD Supabase + LocalStorage & notification inter-composants
async function saveMediaSettings() {
  if (import.meta.client) {
    localStorage.setItem('user_media_settings', JSON.stringify(userMediaSettings.value));
    window.dispatchEvent(new Event('media-settings-changed'));
  }

  if (authStore.user) {
    try {
      const { error } = await $supabase.auth.updateUser({
        data: {
          media_settings: userMediaSettings.value
        }
      });

      if (error) throw error;
    } catch (err) {
      console.error('Erreur lors de la sauvegarde dans Supabase :', err.message);
    }
  }
}

// Chargement du profil depuis Supabase
async function fetchUserProfile() {
  if (!authStore.user?.id) return;
  try {
    const { data, error } = await $supabase
      .from('profiles')
      .select('first_name, last_name, city')
      .eq('id', authStore.user.id)
      .maybeSingle();

    if (error) throw error;
    if (data) {
      userProfile.value = data;
    }
  } catch (err) {
    console.error('Erreur chargement profil :', err.message);
  }
}

watch(() => authStore.user, (newUser) => {
  if (newUser?.id) {
    loadMediaSettings();
    fetchUserProfile();
    if (collectionStore.items.length === 0) {
      collectionStore.fetchItems();
    }
  }
}, { immediate: true });

function openEditProfileModal() {
  const meta = authStore.user?.user_metadata || {};
  editFirstName.value = userProfile.value.first_name || meta.first_name || '';
  editLastName.value = userProfile.value.last_name || meta.last_name || '';
  editCity.value = userProfile.value.city || meta.city || '';
  editErrorMsg.value = '';
  isEditModalOpen.value = true;
}

async function saveProfile() {
  savingProfile.value = true;
  editErrorMsg.value = '';

  try {
    const updates = {
      id: authStore.user.id,
      first_name: editFirstName.value.trim(),
      last_name: editLastName.value.trim(),
      city: editCity.value.trim(),
      updated_at: new Date().toISOString()
    };

    const { error: profileError } = await $supabase
      .from('profiles')
      .upsert(updates);

    if (profileError) throw profileError;

    await $supabase.auth.updateUser({
      data: {
        first_name: editFirstName.value.trim(),
        last_name: editLastName.value.trim(),
        city: editCity.value.trim()
      }
    });

    userProfile.value = {
      first_name: editFirstName.value.trim(),
      last_name: editLastName.value.trim(),
      city: editCity.value.trim()
    };

    isEditModalOpen.value = false;
  } catch (err) {
    editErrorMsg.value = err.message || 'Impossible de sauvegarder les modifications.';
  } finally {
    savingProfile.value = false;
  }
}

// Stats globales
const collectionItemsCount = computed(() => {
  return collectionStore.items.filter(i => !i.is_wishlist).length;
});

const wishlistItemsCount = computed(() => {
  return collectionStore.items.filter(i => i.is_wishlist).length;
});

// Stats par type
const vinylsCount = computed(() => collectionStore.items.filter(i => i.type === 'vinyl').length);
const vinylsWishlistCount = computed(() => collectionStore.items.filter(i => i.type === 'vinyl' && i.is_wishlist).length);

const booksCount = computed(() => collectionStore.items.filter(i => i.type === 'book').length);
const booksWishlistCount = computed(() => collectionStore.items.filter(i => i.type === 'book' && i.is_wishlist).length);

const moviesCount = computed(() => collectionStore.items.filter(i => i.type === 'movie').length);
const moviesWishlistCount = computed(() => collectionStore.items.filter(i => i.type === 'movie' && i.is_wishlist).length);

const boardgamesCount = computed(() => collectionStore.items.filter(i => i.type === 'boardgame').length);
const boardgamesWishlistCount = computed(() => collectionStore.items.filter(i => i.type === 'boardgame' && i.is_wishlist).length);

const videogamesCount = computed(() => collectionStore.items.filter(i => i.type === 'videogame').length);
const videogamesWishlistCount = computed(() => collectionStore.items.filter(i => i.type === 'videogame' && i.is_wishlist).length);

async function resetPassword() {
  if (!authStore.user?.email) return;
  
  sendingEmail.value = true;
  try {
    const { error } = await $supabase.auth.resetPasswordForEmail(authStore.user.email, {
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
    try {
      if (collectionStore.clearMemory) {
        collectionStore.clearMemory();
      }
      await authStore.signOut();
      navigateTo('/');
    } catch (err) {
      console.error("Erreur déconnexion :", err);
      alert("Impossible de vous déconnecter : " + err.message);
    }
  }
}

function copyShareLink() {
  if (!authStore.user?.id) return;
  const shareUrl = `${window.location.origin}/share/${authStore.user.id}`;
  navigator.clipboard.writeText(shareUrl);
  alert("Lien de votre collection copié !");
}

async function handleImportSuccess() {
  await collectionStore.fetchItems();
}

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

onMounted(() => {
  loadMediaSettings();
  if (authStore.user?.id) {
    fetchUserProfile();
    if (collectionStore.items.length === 0) {
      collectionStore.fetchItems();
    }
  }
});
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
  flex-direction: column;
  gap: 16px;
}

/* CARTE PROFIL */
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

.user-email {
  margin: 2px 0 0 0;
  font-size: 0.85rem;
  color: #a1a1aa;
}

.user-city {
  margin: 2px 0 0 0;
  font-size: 0.8rem;
  color: #60a5fa;
}

.profile-actions-row {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.btn-share-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px 14px;
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

.share-icon {
  font-size: 0.95rem;
}

/* CARTE STATS GLOBALES */
.stats-card h4 {
  margin: 0 0 12px 0;
  color: #fff;
  font-size: 1.05rem;
}

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

/* 📂 STYLES ACCORDÉONS (DÉPLIABLES) */
.accordion-card {
  padding: 0;
  overflow: hidden;
}

.accordion-trigger {
  width: 100%;
  padding: 18px 20px;
  background: transparent;
  border: none;
  color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s ease;
}

.accordion-trigger:hover {
  background: rgba(255, 255, 255, 0.03);
}

.accordion-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.accordion-icon {
  font-size: 1.3rem;
}

.accordion-title h4 {
  margin: 0;
  font-size: 1rem;
  color: #fff;
  font-weight: 700;
}

.accordion-subtitle {
  margin: 2px 0 0 0;
  font-size: 0.78rem;
  color: #71717a;
}

.toggle-arrow {
  font-size: 0.75rem;
  color: #a1a1aa;
}

.accordion-body {
  padding: 0 20px 20px 20px;
  border-top: 1px solid #27272a;
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 4px;
  padding-top: 16px;
}

.settings-subtext {
  font-size: 0.8rem;
  color: #a1a1aa;
  margin: 0;
}

.switches-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.switch-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  background: #09090b;
  border: 1px solid #27272a;
  border-radius: 10px;
  color: #fff;
  font-size: 0.9rem;
  cursor: pointer;
}

.switch-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.switch-item input[type="checkbox"] {
  accent-color: #3b82f6;
  width: 18px;
  height: 18px;
  cursor: pointer;
}

/* LISTE TYPES DE STATS */
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

/* REGROUPEMENT D'ACTIONS */
.actions-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.actions-group.margin-top {
  margin-top: 8px;
  padding-top: 14px;
  border-top: 1px dashed #27272a;
}

.group-title {
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #a1a1aa;
  letter-spacing: 0.05em;
}

.tools-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.btn-icon {
  font-size: 1.1rem;
}

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

.btn-primary {
  background: #3b82f6;
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
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

/* MODALE STYLES */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2500;
  padding: 16px;
}

.modal-content {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 16px;
  padding: 24px;
  max-width: 440px;
  width: 100%;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-header h3 {
  margin: 0;
  color: #fff;
  font-size: 1.2rem;
}

.btn-close {
  background: transparent;
  border: none;
  color: #71717a;
  font-size: 1.1rem;
  cursor: pointer;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #a1a1aa;
}

.form-group input {
  width: 100%;
  padding: 10px 12px;
  background: #09090b;
  border: 1px solid #27272a;
  border-radius: 8px;
  color: #fff;
  font-size: 0.9rem;
  outline: none;
}

.form-group input:focus:not(.input-disabled) {
  border-color: #3b82f6;
}

.input-disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #121212 !important;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.error-msg {
  color: #f87171;
  font-size: 0.85rem;
  margin: 0;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 8px;
}

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

  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>