<template>
  <div class="search-panel">
    <!-- Onglets par média -->
    <div class="media-type-tabs">
      <button 
        v-for="type in activeMediaTabs"
        :key="type.key"
        class="tab-btn" 
        :class="{ active: searchType === type.key }" 
        @click="searchType = type.key"
      >
        {{ type.emoji }} {{ type.label }}
      </button>
    </div>

    <!-- Formulaire de recherche -->
    <form @submit.prevent="searchApi" class="search-form">
      <div class="search-input-wrapper">
        <input 
          v-model="query" 
          type="text" 
          :placeholder="placeholderText" 
          required 
          class="search-input"
        />
        
        <!-- Bouton Scanner : ouvre le modal dédié -->
        <button 
          type="button" 
          class="btn-scan-inside" 
          @click="isScannerModalOpen = true" 
          title="Scanner un code-barres"
        >
          📷
        </button>

        <!-- Input caché capture photo (fallback) -->
        <input 
          ref="fileInputRef" 
          type="file" 
          accept="image/*" 
          capture="environment" 
          class="hidden-file-input" 
          @change="handleFileUpload" 
        />
      </div>

      <button type="submit" class="btn-submit" :disabled="loading">
        {{ loading ? 'Recherche...' : 'Chercher' }}
      </button>
    </form>

    <!-- 📷 COMPOSANT MODALE SCANNER -->
    <ScannerModal 
      :is-open="isScannerModalOpen" 
      @close="isScannerModalOpen = false" 
      @batch-add="handleBatchAddFromModal" 
    />

    <!-- RÉSULTATS DE RECHERCHE MANUELLE -->
    <div v-if="results.length > 0" class="results-grid">
      <div 
        v-for="res in results" 
        :key="res.id" 
        class="result-card"
        :class="{ 'is-duplicate': getExistingItem(res) }"
      >
        <div class="cover-container">
          <img :src="res.cover || defaultCover" :alt="res.title" class="res-cover" />
          <span v-if="getExistingItem(res)" class="badge-status">
            {{ getExistingItem(res).is_wishlist ? '✨ Wishlist' : '✅ Collection' }}
          </span>
        </div>

        <div class="res-info">
          <div class="res-header">
            <h4 class="res-title" :title="res.title">{{ res.title }}</h4>
            <p class="res-artist">{{ res.artist }} {{ res.year ? `(${res.year})` : '' }}</p>
          </div>

          <div class="format-tag-wrapper">
            <span class="format-badge">{{ getFormatBadgeLabel(res.type, res.detectedFormat) }}</span>
          </div>

          <div class="res-actions">
            <div v-if="getExistingItem(res) && !getExistingItem(res).is_wishlist" class="already-owned-msg">
              ✅ Déjà dans ta collection
            </div>

            <button 
              v-else-if="getExistingItem(res) && getExistingItem(res).is_wishlist"
              class="btn-action btn-add-collection"
              @click="moveToCollection(getExistingItem(res))"
            >
              ➕ Déplacer en Collection
            </button>

            <template v-else>
              <button class="btn-action btn-add-collection" @click="addItem(res, false)">
                ＋ Collection
              </button>
              <button class="btn-action btn-add-wishlist" @click="addItem(res, true)">
                ✨ Wishlist
              </button>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useCollectionStore } from '~/stores/collection';
import { useAuthStore } from '~/stores/auth';
import { getFormatLabel } from '~/constants/formats';
import ScannerModal from '~/components/ScannerModal.vue';

const collectionStore = useCollectionStore();
const authStore = useAuthStore();
const config = useRuntimeConfig();

const defaultCover = 'https://via.placeholder.com/200x300/2a2a2a/ffffff?text=Pas+d%27image';
const isScannerModalOpen = ref(false);
const fileInputRef = ref(null);

const userMediaSettings = ref({
  vinyl: true,
  book: true,
  movie: true,
  boardgame: false,
  videogame: false
});

function loadMediaSettings() {
  const metaSettings = authStore.user?.user_metadata?.media_settings;
  if (metaSettings) {
    userMediaSettings.value = { ...userMediaSettings.value, ...metaSettings };
  } else if (import.meta.client) {
    const saved = localStorage.getItem('user_media_settings');
    if (saved) {
      try {
        userMediaSettings.value = { ...userMediaSettings.value, ...JSON.parse(saved) };
      } catch (e) {
        console.error("Erreur de lecture des médias activés", e);
      }
    }
  }
}

onMounted(() => {
  loadMediaSettings();
  if (import.meta.client) {
    window.addEventListener('media-settings-changed', loadMediaSettings);
    window.addEventListener('storage', loadMediaSettings);
  }
});

onUnmounted(() => {
  if (import.meta.client) {
    window.removeEventListener('media-settings-changed', loadMediaSettings);
    window.removeEventListener('storage', loadMediaSettings);
  }
});

watch(() => authStore.user, () => {
  loadMediaSettings();
}, { immediate: true });

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

const searchType = ref('vinyl');
const query = ref('');
const loading = ref(false);
const results = ref([]);

const placeholderText = computed(() => {
  if (searchType.value === 'vinyl') return 'Album, artiste, EAN...';
  if (searchType.value === 'book') return 'Titre, auteur, ISBN...';
  if (searchType.value === 'movie') return 'Titre du film...';
  if (searchType.value === 'boardgame') return 'Catan, Carcassonne, Dixit...';
  if (searchType.value === 'videogame') return 'Zelda, Elden Ring, Mario...';
  return 'Rechercher...';
});

function mapDiscogsFormat(formatsArray) {
  if (!formatsArray || !Array.isArray(formatsArray) || formatsArray.length === 0) return 'vinyl_lp';
  const rawString = formatsArray.map(f => typeof f === 'string' ? f : (f.name || '') + ' ' + (f.descriptions || []).join(' ')).join(' ').toLowerCase();

  if (rawString.includes('7"') || rawString.includes('single')) return 'vinyl_single';
  if (rawString.includes('10"')) return 'vinyl_10';
  if (rawString.includes('cd')) return 'cd';
  if (rawString.includes('cassette')) return 'cassette';
  if (rawString.includes('digital')) return 'digital_music';
  return 'vinyl_lp';
}

function getFormatBadgeLabel(type, formatId) {
  return getFormatLabel(type, formatId) || 'Format standard';
}

function getExistingItem(resItem) {
  const cleanTitle = (resItem.title || '').trim().toLowerCase();
  const cleanArtist = (resItem.artist || '').trim().toLowerCase();

  return collectionStore.items.find(item => {
    if (resItem.discogs_id && item.discogs_id === resItem.discogs_id) return true;
    return (item.title || '').trim().toLowerCase() === cleanTitle &&
           (item.artist || '').trim().toLowerCase() === cleanArtist &&
           item.type === resItem.type;
  }) || null;
}

// 📦 TRAITEMENT DES SCANS ENVOYÉS PAR LE MODAL
async function handleBatchAddFromModal(scannedItems) {
  for (const item of scannedItems) {
    const isWishlist = item.target === 'wishlist';
    
    // Si ce n'est qu'un ISBN/code brut, on enrichit via l'API Open Library
    try {
      const res = await fetch(`https://openlibrary.org/search.json?isbn=${encodeURIComponent(item.isbn)}&limit=1`);
      const data = await res.json();
      const doc = data.docs?.[0];

      if (doc) {
        await addItem({
          title: doc.title,
          artist: doc.author_name ? doc.author_name.join(', ') : 'Auteur inconnu',
          year: doc.first_publish_year || null,
          cover: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
          type: 'book',
          detectedFormat: 'paperback'
        }, isWishlist);
      } else {
        await addItem({
          title: `Livre (${item.isbn})`,
          artist: 'Auteur inconnu',
          year: null,
          cover: null,
          type: 'book',
          detectedFormat: 'paperback'
        }, isWishlist);
      }
    } catch (e) {
      console.warn("Erreur d'enrichissement ISBN :", item.isbn, e);
    }
  }
}

async function handleFileUpload(event) {
  if (!import.meta.client) return;
  const file = event.target.files[0];
  if (!file) return;

  loading.value = true;
  try {
    const { Html5Qrcode } = await import('html5-qrcode');
    const html5QrCode = new Html5Qrcode("reader-vue");
    const decodedText = await html5QrCode.scanFile(file, true);
    query.value = decodedText;
    searchApi();
  } catch (err) {
    alert("Aucun code-barres n'a pu être détecté sur cette photo.");
  } finally {
    loading.value = false;
    event.target.value = '';
  }
}

// RECHERCHE MANUELLE MULTI-API
async function searchApi() {
  if (!query.value.trim()) return;
  loading.value = true;
  results.value = [];

  const discogsToken = config.public?.discogsToken || '';

  try {
    if (searchType.value === 'vinyl') {
      const endpoint = `https://api.discogs.com/database/search?q=${encodeURIComponent(query.value)}&type=release&token=${discogsToken}`;
      const res = await fetch(endpoint);
      const data = await res.json();
      
      results.value = (data.results || []).slice(0, 12).map(item => ({
        id: item.id,
        discogs_id: item.id,
        title: item.title.includes(' - ') ? item.title.split(' - ')[1] : item.title,
        artist: item.title.includes(' - ') ? item.title.split(' - ')[0] : 'Artiste inconnu',
        year: item.year || '',
        cover: item.cover_image || item.thumb,
        type: 'vinyl',
        detectedFormat: mapDiscogsFormat(item.format)
      }));

    } else if (searchType.value === 'book') {
      const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query.value)}&limit=12`);
      const data = await res.json();
      results.value = (data.docs || []).map(doc => ({
        id: doc.key,
        title: doc.title,
        artist: doc.author_name ? doc.author_name.join(', ') : 'Auteur inconnu',
        year: doc.first_publish_year || '',
        cover: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
        type: 'book',
        detectedFormat: 'paperback'
      }));

    } else if (searchType.value === 'movie') {
      const tmdbToken = config.public?.tmdbToken;
      const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${tmdbToken}&query=${encodeURIComponent(query.value)}&language=fr-FR`);
      const data = await res.json();
      results.value = (data.results || []).slice(0, 12).map(movie => ({
        id: movie.id,
        title: movie.title,
        artist: movie.release_date ? movie.release_date.split('-')[0] : 'Film',
        year: movie.release_date ? movie.release_date.split('-')[0] : '',
        cover: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
        type: 'movie',
        detectedFormat: 'bluray'
      }));

    } else if (searchType.value === 'videogame') {
      const rawgToken = config.public?.rawgToken || '';
      const res = await fetch(`https://api.rawg.io/api/games?key=${rawgToken}&search=${encodeURIComponent(query.value)}&page_size=12`);
      const data = await res.json();
      results.value = (data.results || []).map(game => ({
        id: game.id,
        title: game.name,
        artist: (game.platforms || []).map(p => p.platform.name).join(', ') || 'Jeu vidéo',
        year: game.released ? game.released.split('-')[0] : '',
        cover: game.background_image || null,
        type: 'videogame',
        detectedFormat: game.platforms?.some(p => p.platform.name.toLowerCase().includes('switch')) ? 'cartridge' : 'disc'
      }));
    }
  } catch (err) {
    alert("Erreur lors de la recherche : " + err.message);
  } finally {
    loading.value = false;
  }
}

async function addItem(item, isWishlist) {
  await collectionStore.addItem({
    title: item.title,
    artist: item.artist,
    year: item.year ? item.year.toString() : null,
    type: item.type,
    format: item.detectedFormat || 'paperback',
    cover: item.cover,
    discogs_id: item.discogs_id || null,
    is_wishlist: isWishlist
  });
}

async function moveToCollection(existingItem) {
  await collectionStore.updateItem(existingItem.id, {
    ...existingItem,
    is_wishlist: false
  });
}
</script>

<style scoped>
.search-panel { display: flex; flex-direction: column; gap: 16px; }
.media-type-tabs { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; }
.tab-btn { flex: 1; min-width: 90px; padding: 10px 8px; background: #18181b; border: 1px solid #27272a; color: #a1a1aa; border-radius: 12px; font-weight: 600; font-size: 0.85rem; cursor: pointer; white-space: nowrap; transition: all 0.2s ease; }
.tab-btn.active { background: #3b82f6; color: #fff; border-color: #3b82f6; }

.search-form { display: flex; flex-direction: column; gap: 10px; }
.search-input-wrapper { position: relative; display: flex; align-items: center; width: 100%; }
.search-input { width: 100%; padding: 14px 48px 14px 16px; background: #18181b; border: 1px solid #27272a; border-radius: 12px; color: #fff; font-size: 0.95rem; outline: none; }
.btn-scan-inside { position: absolute; right: 8px; background: transparent; border: none; font-size: 1.3rem; padding: 8px; cursor: pointer; border-radius: 8px; }

.hidden-file-input { display: none; }
.btn-submit { width: 100%; padding: 14px; background: #3b82f6; color: #fff; border: none; border-radius: 12px; font-weight: 700; font-size: 0.95rem; cursor: pointer; }

/* RÉSULTATS */
.results-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; margin-top: 12px; }
.result-card { background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 10px; display: flex; gap: 12px; position: relative; }
.result-card.is-duplicate { border-color: #3b82f6; background: rgba(24, 24, 27, 0.95); }
.cover-container { position: relative; width: 68px; height: 88px; flex-shrink: 0; }
.res-cover { width: 100%; height: 100%; object-fit: cover; border-radius: 8px; background: #09090b; }
.badge-status { position: absolute; bottom: -4px; left: -4px; right: -4px; background: #1d4ed8; color: #fff; font-size: 0.55rem; font-weight: 700; padding: 2px 4px; border-radius: 4px; text-align: center; }
.res-info { flex: 1; display: flex; flex-direction: column; justify-content: space-between; min-width: 0; text-align: left; }
.res-title { font-size: 0.82rem; font-weight: 700; color: #fff; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.res-artist { font-size: 0.72rem; color: #a1a1aa; margin: 2px 0 0 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.format-tag-wrapper { margin: 6px 0; }
.format-badge { display: inline-block; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); color: #e4e4e7; font-size: 0.65rem; font-weight: 600; padding: 2px 8px; border-radius: 6px; }
.res-actions { display: flex; gap: 6px; }
.btn-action { flex: 1; padding: 6px 4px; border-radius: 6px; font-size: 0.7rem; font-weight: 600; cursor: pointer; border: 1px solid transparent; }
.btn-add-collection { background: rgba(255, 255, 255, 0.08); border-color: rgba(255, 255, 255, 0.15); color: #ffffff; }
.btn-add-wishlist { background: rgba(245, 158, 11, 0.15); border-color: rgba(245, 158, 11, 0.3); color: #fbbf24; }
.already-owned-msg { width: 100%; text-align: center; font-size: 0.7rem; font-weight: 600; color: #34d399; background: rgba(16, 185, 129, 0.1); padding: 6px; border-radius: 6px; }

@media (min-width: 769px) {
  .search-form { flex-direction: row; }
  .search-input-wrapper { flex: 1; }
  .btn-submit { width: auto; padding: 0 24px; }
}
</style>