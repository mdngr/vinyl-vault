<template>
  <div class="search-panel">
    <!-- Onglets par média -->
    <div class="media-type-tabs">
      <button 
        class="tab-btn" 
        :class="{ active: searchType === 'vinyl' }" 
        @click="searchType = 'vinyl'"
      >
        🎵 Musique
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: searchType === 'book' }" 
        @click="searchType = 'book'"
      >
        📚 Livres
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: searchType === 'movie' }" 
        @click="searchType = 'movie'"
      >
        🎬 Films
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
        
        <!-- Bouton Scanner qui ouvre la caméra -->
        <button 
          type="button" 
          class="btn-scan-inside" 
          @click="startScanner" 
          title="Scanner un code-barres"
        >
          📷
        </button>
      </div>

      <button type="submit" class="btn-submit" :disabled="loading">
        {{ loading ? 'Recherche...' : 'Chercher' }}
      </button>
    </form>

    <!-- 📷 MODALE CAMÉRA PLEIN ÉCRAN POUR LE SCAN -->
    <div v-if="isScanning" class="scanner-modal">
      <div class="scanner-container">
        <div class="scanner-header">
          <span>Scanner un code-barres</span>
          <button class="btn-close-scanner" @click="stopScanner">✕ Fermer</button>
        </div>

        <div class="video-wrapper">
          <video ref="videoRef" class="scanner-video" autoplay playsinline muted></video>
          <div class="scanner-laser"></div>
        </div>

        <p class="scanner-hint">Cadrez le code-barres (EAN / ISBN) dans la zone</p>
      </div>
    </div>

    <!-- Résultats de recherche -->
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
              <button 
                class="btn-action btn-add-collection" 
                @click="addItem(res, false)"
              >
                ＋ Collection
              </button>
              <button 
                class="btn-action btn-add-wishlist" 
                @click="addItem(res, true)"
              >
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
import { ref, computed, onUnmounted } from 'vue';
import { useCollectionStore } from '../stores/collection';
import { getFormatLabel } from '../constants/formats';

const collectionStore = useCollectionStore();
const defaultCover = 'https://via.placeholder.com/200x300/2a2a2a/ffffff?text=Pas+d%27image';

const searchType = ref('vinyl');
const query = ref('');
const loading = ref(false);
const results = ref([]);

// États Scanner Caméra
const isScanning = ref(false);
const videoRef = ref(null);
let mediaStream = null;
let scanInterval = null;

const placeholderText = computed(() => {
  if (searchType.value === 'vinyl') return 'Album, artiste, EAN...';
  if (searchType.value === 'book') return 'Titre, auteur, ISBN...';
  return 'Titre du film...';
});

function getFormatBadgeLabel(type, formatId) {
  return getFormatLabel(type, formatId) || 'Format standard';
}

function detectMusicFormat(rawFormats = []) {
  const str = rawFormats.join(' ').toLowerCase();
  if (str.includes('cd') || str.includes('compact disc')) return 'cd';
  if (str.includes('cassette')) return 'cassette';
  if (str.includes('7"') || str.includes('single')) return 'vinyl_single';
  if (str.includes('vinyl') || str.includes('lp') || str.includes('12"')) return 'vinyl_lp';
  return 'vinyl_lp';
}

function detectBookFormat(rawFormat = '') {
  const str = String(rawFormat).toLowerCase();
  if (str.includes('manga')) return 'manga';
  if (str.includes('comic') || str.includes('graphic novel')) return 'comic';
  if (str.includes('hardcover') || str.includes('relié')) return 'hardcover';
  return 'paperback';
}

function getExistingItem(resItem) {
  const cleanTitle = resItem.title.trim().toLowerCase();
  const cleanArtist = resItem.artist.trim().toLowerCase();

  return collectionStore.items.find(item => {
    const sameTitle = item.title.trim().toLowerCase() === cleanTitle;
    const sameArtist = item.artist.trim().toLowerCase() === cleanArtist;
    const sameType = item.type === resItem.type;
    return sameTitle && sameArtist && sameType;
  }) || null;
}

const DISCOGS_TOKEN = import.meta.env.VITE_DISCOGS_TOKEN;

async function searchApi() {
  if (!query.value.trim()) return;
  loading.value = true;
  results.value = [];

  try {
    if (searchType.value === 'vinyl') {
      const endpoint = `https://api.discogs.com/database/search?q=${encodeURIComponent(query.value)}&type=release&token=${DISCOGS_TOKEN || ''}`;
      const res = await fetch(endpoint);
      const data = await res.json();
      
      results.value = (data.results || []).slice(0, 12).map(item => ({
        id: item.id,
        title: item.title.includes(' - ') ? item.title.split(' - ')[1] : item.title,
        artist: item.title.includes(' - ') ? item.title.split(' - ')[0] : 'Artiste inconnu',
        year: item.year || '',
        cover: item.cover_image || item.thumb,
        type: 'vinyl',
        detectedFormat: detectMusicFormat(item.format || [])
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
        detectedFormat: detectBookFormat(doc.format ? doc.format[0] : '')
      }));
    } else if (searchType.value === 'movie') {
      const TMDB_KEY = '3fd2be6f0c70a2a598f084dd2754b4c1';
      const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(query.value)}&language=fr-FR`);
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
    }
  } catch (err) {
    alert("Erreur lors de la recherche : " + err.message);
  } finally {
    loading.value = false;
  }
}

// 📷 LOGIQUE DE DÉMARRAGE CAMÉRA & SCAN CODE-BARRES
async function startScanner() {
  if (!('BarcodeDetector' in window)) {
    alert("Votre navigateur ne supporte pas la détection native de code-barres. Utilisez Chrome ou Safari sur mobile.");
    return;
  }

  isScanning.value = true;
  try {
    // Demande l'accès à la caméra arrière prioritairement
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });

    if (videoRef.value) {
      videoRef.value.srcObject = mediaStream;
      await videoRef.value.play();
    }

    const barcodeDetector = new window.BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128']
    });

    // Boucle de scan active toutes les 350ms sur le flux vidéo
    scanInterval = setInterval(async () => {
      if (videoRef.value && videoRef.value.readyState === videoRef.value.HAVE_ENOUGH_DATA) {
        try {
          const barcodes = await barcodeDetector.detect(videoRef.value);
          if (barcodes.length > 0) {
            const scannedCode = barcodes[0].rawValue;
            query.value = scannedCode;
            stopScanner();
            searchApi(); // Lance automatiquement la recherche avec le code-barres trouvé
          }
        } catch (err) {
          // Ignore les erreurs de frame isolées pendant le scan
        }
      }
    }, 350);

  } catch (err) {
    alert("Impossible d'accéder à la caméra : " + err.message);
    stopScanner();
  }
}

function stopScanner() {
  if (scanInterval) clearInterval(scanInterval);
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
  isScanning.value = false;
}

onUnmounted(() => {
  stopScanner();
});

async function addItem(item, isWishlist) {
  const payload = {
    title: item.title,
    artist: item.artist,
    year: item.year ? item.year.toString() : null,
    type: item.type,
    format: item.detectedFormat,
    cover: item.cover,
    is_wishlist: isWishlist
  };

  await collectionStore.addItem(payload);
}

async function moveToCollection(existingItem) {
  await collectionStore.updateItem(existingItem.id, {
    ...existingItem,
    is_wishlist: false
  });
}
</script>

<style scoped>
.search-panel { 
  display: flex; 
  flex-direction: column; 
  gap: 16px; 
}

.media-type-tabs { 
  display: flex; 
  gap: 8px; 
}

.tab-btn { 
  flex: 1; 
  padding: 12px; 
  background: #18181b; 
  border: 1px solid #27272a; 
  color: #a1a1aa; 
  border-radius: 12px; 
  font-weight: 600; 
  font-size: 0.9rem;
  cursor: pointer; 
}

.tab-btn.active { 
  background: #3b82f6; 
  color: #fff; 
  border-color: #3b82f6; 
}

.search-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.search-input {
  width: 100%;
  padding: 14px 48px 14px 16px;
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 12px;
  color: #fff;
  font-size: 0.95rem;
  outline: none;
}

.search-input:focus {
  border-color: #3b82f6;
}

.btn-scan-inside {
  position: absolute;
  right: 8px;
  background: transparent;
  border: none;
  font-size: 1.3rem;
  padding: 8px;
  cursor: pointer;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-scan-inside:hover {
  background: rgba(255, 255, 255, 0.1);
}

.btn-submit {
  width: 100%;
  padding: 14px;
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
}

.btn-submit:hover:not(:disabled) {
  background: #2563eb;
}

/* 📷 STYLING DE LA MODALE CAMÉRA SCANNER */
.scanner-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 4000;
  padding: 16px;
}

.scanner-container {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 20px;
  padding: 20px;
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
}

.scanner-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  color: #fff;
  font-weight: 700;
}

.btn-close-scanner {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #fff;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.8rem;
  cursor: pointer;
}

.video-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 3/4;
  border-radius: 12px;
  overflow: hidden;
  background: #000;
  border: 1px solid #3f3f46;
}

.scanner-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Ligne laser animée pour le style */
.scanner-laser {
  position: absolute;
  top: 50%;
  left: 10%;
  right: 10%;
  height: 2px;
  background: #ef4444;
  box-shadow: 0 0 10px #ef4444;
  animation: scanLaser 2s infinite ease-in-out;
}

@keyframes scanLaser {
  0%, 100% { top: 20%; }
  50% { top: 80%; }
}

.scanner-hint {
  font-size: 0.8rem;
  color: #a1a1aa;
  text-align: center;
  margin: 0;
}

/* RÉSULTATS */
.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
  margin-top: 12px;
}

.result-card {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 12px;
  padding: 10px;
  display: flex;
  gap: 12px;
  position: relative;
}

.result-card.is-duplicate {
  border-color: #3b82f6;
  background: rgba(24, 24, 27, 0.95);
}

.cover-container {
  position: relative;
  width: 68px;
  height: 88px;
  flex-shrink: 0;
}

.res-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
  background: #09090b;
}

.badge-status {
  position: absolute;
  bottom: -4px;
  left: -4px;
  right: -4px;
  background: #1d4ed8;
  color: #fff;
  font-size: 0.55rem;
  font-weight: 700;
  padding: 2px 4px;
  border-radius: 4px;
  text-align: center;
  white-space: nowrap;
}

.res-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
  text-align: left;
}

.res-title {
  font-size: 0.82rem;
  font-weight: 700;
  color: #fff;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.res-artist {
  font-size: 0.72rem;
  color: #a1a1aa;
  margin: 2px 0 0 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.format-tag-wrapper { margin: 6px 0; }

.format-badge {
  display: inline-block;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #e4e4e7;
  font-size: 0.65rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
}

.res-actions { display: flex; gap: 6px; }

.btn-action {
  flex: 1;
  padding: 6px 4px;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  white-space: nowrap;
}

.btn-add-collection {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.15);
  color: #ffffff;
}

.btn-add-collection:hover { background: #3b82f6; border-color: #3b82f6; }

.btn-add-wishlist {
  background: rgba(245, 158, 11, 0.15);
  border-color: rgba(245, 158, 11, 0.3);
  color: #fbbf24;
}

.btn-add-wishlist:hover { background: #f59e0b; color: #000; }

.already-owned-msg {
  width: 100%;
  text-align: center;
  font-size: 0.7rem;
  font-weight: 600;
  color: #34d399;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  padding: 6px;
  border-radius: 6px;
}

@media (min-width: 769px) {
  .search-form {
    flex-direction: row;
  }
  .search-input-wrapper {
    flex: 1;
  }
  .btn-submit {
    width: auto;
    padding: 0 24px;
  }
}
</style>