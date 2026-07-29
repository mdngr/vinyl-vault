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
        
        <!-- Bouton Scanner -->
        <button 
          type="button" 
          class="btn-scan-inside" 
          @click="handleScanClick" 
          title="Scanner un code-barres"
        >
          📷
        </button>

        <!-- Input caché capture photo -->
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

    <!-- 📷 MODALE SCANNER EN DIRECT -->
    <div v-if="isScanning" class="scanner-modal">
      <div class="scanner-container">
        <div class="scanner-header">
          <span>Scanner un code-barres</span>
          <button class="btn-close-scanner" @click="stopScanner">✕ Fermer</button>
        </div>

        <div class="video-wrapper">
          <div id="interactive-scanner" class="scanner-video"></div>
        </div>

        <p class="scanner-hint">Pointez la caméra vers le code EAN / ISBN</p>
      </div>
    </div>

    <!-- 🔍 MODALE ZOOM & RECADRAGE POUR LA PHOTO CAPTURÉE -->
    <div v-if="isCropping" class="crop-modal">
      <div class="crop-container">
        <div class="crop-header">
          <span>🔎 Zoomer sur le code-barres</span>
          <button class="btn-close-scanner" @click="cancelCrop">✕ Annuler</button>
        </div>

        <div class="crop-image-wrapper">
          <img ref="cropImageRef" :src="rawImageSrc" class="crop-image" alt="Code-barres à recadrer" />
        </div>

        <div class="crop-actions">
          <button class="btn-crop-zoom" @click="zoomIn">🔍+</button>
          <button class="btn-crop-zoom" @click="zoomOut">🔍-</button>
          <button class="btn-crop-submit" @click="confirmCropAndScan" :disabled="loading">
            {{ loading ? 'Analyse...' : '✅ Valider & Analyser' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Container caché pour l'analyse Html5Qrcode -->
    <div id="interactive-scanner-hidden" style="display: none;"></div>

    <!-- RÉSULTATS DE RECHERCHE -->
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
import { ref, computed, onUnmounted, nextTick } from 'vue';
import { Html5Qrcode } from 'html5-qrcode';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';
import { useCollectionStore } from '../stores/collection';
import { getFormatLabel } from '../constants/formats';

const collectionStore = useCollectionStore();
const defaultCover = 'https://via.placeholder.com/200x300/2a2a2a/ffffff?text=Pas+d%27image';

const searchType = ref('vinyl');
const query = ref('');
const loading = ref(false);
const results = ref([]);

// Scanner & Fallback refs
const isScanning = ref(false);
const fileInputRef = ref(null);
let html5QrCodeScanner = null;

// Zoom & Crop refs
const isCropping = ref(false);
const rawImageSrc = ref('');
const cropImageRef = ref(null);
let cropperInstance = null;

const placeholderText = computed(() => {
  if (searchType.value === 'vinyl') return 'Album, artiste, EAN...';
  if (searchType.value === 'book') return 'Titre, auteur, ISBN...';
  return 'Titre du film...';
});

function getFormatBadgeLabel(type, formatId) {
  return getFormatLabel(type, formatId) || 'Format standard';
}

function getExistingItem(resItem) {
  const cleanTitle = resItem.title.trim().toLowerCase();
  const cleanArtist = resItem.artist.trim().toLowerCase();

  return collectionStore.items.find(item => {
    return item.title.trim().toLowerCase() === cleanTitle &&
           item.artist.trim().toLowerCase() === cleanArtist &&
           item.type === resItem.type;
  }) || null;
}

// 📷 CLIC SUR LE BOUTON SCANNER
async function handleScanClick() {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    startLiveScanner();
  } else {
    fileInputRef.value?.click();
  }
}

// 🔴 SCANNER VIDÉO EN DIRECT
async function startLiveScanner() {
  isScanning.value = true;
  await nextTick();

  try {
    html5QrCodeScanner = new Html5Qrcode("interactive-scanner");
    await html5QrCodeScanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 150 } },
      (decodedText) => {
        query.value = decodedText;
        stopScanner();
        searchApi();
      },
      () => {}
    );
  } catch (err) {
    stopScanner();
    fileInputRef.value?.click();
  }
}

function stopScanner() {
  if (html5QrCodeScanner && isScanning.value) {
    html5QrCodeScanner.stop().catch(() => {}).finally(() => {
      isScanning.value = false;
    });
  } else {
    isScanning.value = false;
  }
}

// 📸 FALLBACK PHOTO : RÉCEPTION DE LA PHOTO & OUVERTURE DU CROPPER
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    rawImageSrc.value = e.target.result;
    isCropping.value = true;
    await nextTick();
    initCropper();
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

function initCropper() {
  if (cropperInstance) cropperInstance.destroy();
  
  cropperInstance = new Cropper(cropImageRef.value, {
    viewMode: 1,
    dragMode: 'move',
    autoCropArea: 0.8,
    restore: false,
    guides: true,
    center: true,
    highlight: false,
    cropBoxMovable: true,
    cropBoxResizable: true,
    toggleDragModeOnDblclick: false,
  });
}

function zoomIn() {
  cropperInstance?.zoom(0.1);
}

function zoomOut() {
  cropperInstance?.zoom(-0.1);
}

function cancelCrop() {
  if (cropperInstance) cropperInstance.destroy();
  isCropping.value = false;
  rawImageSrc.value = '';
}

// 🔍 VALIDATION DU RECADRAGE & ANALYSE DE L'IMAGE ZOOMÉE
async function confirmCropAndScan() {
  if (!cropperInstance) return;
  loading.value = true;

  const canvas = cropperInstance.getCroppedCanvas({
    width: 800,
    height: 800,
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'high',
  });

  canvas.toBlob(async (blob) => {
    if (!blob) {
      loading.value = false;
      return;
    }

    const croppedFile = new File([blob], "barcode-cropped.jpg", { type: "image/jpeg" });
    const html5QrCode = new Html5Qrcode("interactive-scanner-hidden");

    try {
      const decodedText = await html5QrCode.scanFile(croppedFile, true);
      query.value = decodedText;
      cancelCrop();
      searchApi();
    } catch (err) {
      alert("Aucun code-barres n'a été détecté dans la zone sélectionnée. Essaye de zoomer plus près du code-barres.");
    } finally {
      loading.value = false;
    }
  }, 'image/jpeg');
}

onUnmounted(() => {
  stopScanner();
  if (cropperInstance) cropperInstance.destroy();
});

// RECHERCHE API
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
        detectedFormat: 'vinyl_lp'
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

async function addItem(item, isWishlist) {
  await collectionStore.addItem({
    title: item.title,
    artist: item.artist,
    year: item.year ? item.year.toString() : null,
    type: item.type,
    format: item.detectedFormat,
    cover: item.cover,
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
.media-type-tabs { display: flex; gap: 8px; }
.tab-btn { flex: 1; padding: 12px; background: #18181b; border: 1px solid #27272a; color: #a1a1aa; border-radius: 12px; font-weight: 600; font-size: 0.9rem; cursor: pointer; }
.tab-btn.active { background: #3b82f6; color: #fff; border-color: #3b82f6; }

.search-form { display: flex; flex-direction: column; gap: 10px; }
.search-input-wrapper { position: relative; display: flex; align-items: center; width: 100%; }
.search-input { width: 100%; padding: 14px 48px 14px 16px; background: #18181b; border: 1px solid #27272a; border-radius: 12px; color: #fff; font-size: 0.95rem; outline: none; }
.btn-scan-inside { position: absolute; right: 8px; background: transparent; border: none; font-size: 1.3rem; padding: 8px; cursor: pointer; border-radius: 8px; }

.hidden-file-input { display: none; }

.btn-submit { width: 100%; padding: 14px; background: #3b82f6; color: #fff; border: none; border-radius: 12px; font-weight: 700; font-size: 0.95rem; cursor: pointer; }

/* MODALE SCANNER VIDÉO */
.scanner-modal { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.95); display: flex; justify-content: center; align-items: center; z-index: 4000; padding: 16px; }
.scanner-container { background: #18181b; border: 1px solid #27272a; border-radius: 20px; padding: 20px; width: 100%; max-width: 400px; display: flex; flex-direction: column; gap: 16px; align-items: center; }
.scanner-header { display: flex; justify-content: space-between; align-items: center; width: 100%; color: #fff; font-weight: 700; }
.btn-close-scanner { background: rgba(255, 255, 255, 0.1); border: none; color: #fff; padding: 6px 12px; border-radius: 8px; font-size: 0.8rem; cursor: pointer; }
.video-wrapper { width: 100%; aspect-ratio: 4/3; border-radius: 12px; overflow: hidden; background: #000; }
.scanner-video { width: 100%; height: 100%; }
.scanner-hint { font-size: 0.8rem; color: #a1a1aa; text-align: center; margin: 0; }

/* 🔎 MODALE ZOOM & RECADRAGE CROPPER (STYLE REPRIS ET OPTIMISÉ) */
.crop-modal {
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

.crop-container {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 20px;
  padding: 20px;
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.crop-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #fff;
  font-weight: 700;
}

.crop-image-wrapper {
  width: 100%;
  height: 300px;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
}

.crop-image {
  max-width: 100%;
  display: block;
}

/* BARRE D'ACTIONS DE RECADRAGE & ZOOM */
.crop-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  width: 100%;
}

.btn-crop-zoom {
  background: #27272a;
  border: 1px solid #3f3f46;
  color: #fff;
  padding: 12px 16px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;
  min-width: 48px;
}

.btn-crop-zoom:hover {
  background: #3f3f46;
}

.btn-crop-submit {
  flex: 1;
  background: #3b82f6;
  color: #fff;
  border: none;
  padding: 12px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s ease;
}

.btn-crop-submit:hover:not(:disabled) {
  background: #2563eb;
}

.btn-crop-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* RÉSULTATS */
.results-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; margin-top: 12px; }
.result-card { background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 10px; display: flex; gap: 12px; position: relative; }
.result-card.is-duplicate { border-color: #3b82f6; background: rgba(24, 24, 27, 0.95); }
.cover-container { position: relative; width: 68px; height: 88px; flex-shrink: 0; }
.res-cover { width: 100%; height: 100%; object-fit: cover; border-radius: 8px; background: #09090b; }
.badge-status { position: absolute; bottom: -4px; left: -4px; right: -4px; background: #1d4ed8; color: #fff; font-size: 0.55rem; font-weight: 700; padding: 2px 4px; border-radius: 4px; text-align: center; }
.res-info { flex: 1; display: flex; flex-direction: column; justify-content: space-between; min-width: 0; text-align: left; }
.res-title { font-size: 0.82rem; font-weight: 700; color: #fff; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.res-artist { font-size: 0.72rem; color: #a1a1aa; margin: 2px 0 0 0; }
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