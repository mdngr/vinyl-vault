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
        
        <!-- Bouton Scanner -->
        <button 
          type="button" 
          class="btn-scan-inside" 
          @click="handleScanClick" 
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

    <!-- 📷 MODALE SCANNER VIDÉO EN DIRECT EN CONTINU -->
    <div v-if="isScanning" class="scanner-modal" @click.self="stopScanner">
      <div class="scanner-container">
        <div class="scanner-header">
          <div class="header-title">
            <span>📷 Scanner d'étagère ({{ searchTypeLabel }})</span>
            <span v-if="scannedBatch.length > 0" class="badge-count">
              {{ scannedBatch.length }} identifié(s)
            </span>
          </div>
          <button class="btn-close-scanner" @click="stopScanner">✕ Fermer</button>
        </div>

        <div class="video-wrapper">
          <div id="interactive-scanner" class="scanner-video"></div>
          <div class="laser-line"></div>
        </div>

        <!-- Indicator de recherche API en arrière-plan -->
        <div v-if="isResolvingApi" class="api-resolving-indicator">
          <span class="spinner"></span> Identification du produit en cours...
        </div>

        <!-- Contrôles du zoom vidéo -->
        <div v-if="hasZoomSupport" class="scanner-zoom-controls">
          <button 
            type="button" 
            class="btn-zoom" 
            @click="zoomScannerOut" 
            :disabled="scannerZoomValue <= scannerZoomMin"
          >
            🔍 -
          </button>
          <span class="zoom-label">{{ parseFloat(scannerZoomValue).toFixed(1) }}x</span>
          <button 
            type="button" 
            class="btn-zoom" 
            @click="zoomScannerIn" 
            :disabled="scannerZoomValue >= scannerZoomMax"
          >
            🔍 +
          </button>
        </div>

        <!-- Sélection de la destination par défaut pour les scans -->
        <div class="target-selection">
          <label>Destination des scans :</label>
          <select v-model="defaultBatchTarget" class="target-select">
            <option :value="false">➕ Collection</option>
            <option :value="true">✨ Wishlist</option>
          </select>
        </div>

        <!-- Tiroir des éléments identifiés en direct -->
        <div v-if="scannedBatch.length > 0" class="scanned-batch-tray">
          <div class="tray-header">
            <h4>Éléments capturés</h4>
            <button class="btn-clear-tray" @click="clearBatch">Vider</button>
          </div>

          <ul class="batch-list">
            <li v-for="(item, idx) in scannedBatch" :key="item.id + '-' + idx" class="batch-item">
              <img :src="item.cover || defaultCover" :alt="item.title" class="batch-cover" />
              <div class="batch-details">
                <span class="batch-item-title">{{ item.title }}</span>
                <span class="batch-item-artist">{{ item.artist }}</span>
              </div>

              <select v-model="item.is_wishlist" class="batch-item-target">
                <option :value="false">Collection</option>
                <option :value="true">Wishlist</option>
              </select>

              <button class="btn-remove-batch" @click="removeFromBatch(idx)">✕</button>
            </li>
          </ul>

          <button class="btn-confirm-batch" @click="saveAllBatch">
            Ajouter les {{ scannedBatch.length }} élément(s)
          </button>
        </div>

        <p class="scanner-hint">Balayez les codes EAN/ISBN des tranches sans arrêter la vidéo</p>
      </div>
    </div>

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
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useCollectionStore } from '~/stores/collection';
import { useAuthStore } from '~/stores/auth';
import { getFormatLabel } from '~/constants/formats';

const collectionStore = useCollectionStore();
const authStore = useAuthStore();
const config = useRuntimeConfig();

const defaultCover = 'https://via.placeholder.com/200x300/2a2a2a/ffffff?text=Pas+d%27image';

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

const searchTypeLabel = computed(() => {
  const current = activeMediaTabs.value.find(t => t.key === searchType.value);
  return current ? current.label : 'Média';
});

watch(activeMediaTabs, (newTabs) => {
  if (newTabs.length > 0 && !newTabs.some(t => t.key === searchType.value)) {
    searchType.value = newTabs[0].key;
  }
}, { immediate: true });

const query = ref('');
const loading = ref(false);
const results = ref([]);

// Continuous Scanning & Batch Storage State
const isScanning = ref(false);
const fileInputRef = ref(null);
let html5QrCodeScanner = null;

const scannedBatch = ref([]);
const scannedCodesSet = ref(new Set());
const defaultBatchTarget = ref(false); // false = Collection, true = Wishlist
const isResolvingApi = ref(false);
const lastScanTimestamp = ref(0);

// Zoom scanner vidéo
const hasZoomSupport = ref(false);
const scannerZoomValue = ref(1);
const scannerZoomMin = ref(1);
const scannerZoomMax = ref(3);
let scannerVideoElement = null;
let scannerVideoTrack = null;
let isHardwareZoom = false;

const placeholderText = computed(() => {
  if (searchType.value === 'vinyl') return 'Album, artiste, EAN...';
  if (searchType.value === 'book') return 'Titre, auteur, ISBN...';
  if (searchType.value === 'movie') return 'Titre du film...';
  if (searchType.value === 'boardgame') return 'Catan, Carcassonne, Dixit...';
  if (searchType.value === 'videogame') return 'Zelda, Elden Ring, Mario...';
  return 'Rechercher...';
});

function mapDiscogsFormat(formatsArray) {
  if (!formatsArray || !Array.isArray(formatsArray) || formatsArray.length === 0) {
    return 'vinyl_lp';
  }

  const rawString = formatsArray.map(f => typeof f === 'string' ? f : (f.name || '') + ' ' + (f.descriptions || []).join(' ')).join(' ').toLowerCase();

  if (rawString.includes('7"') || rawString.includes('7 inch') || rawString.includes('single')) {
    return 'vinyl_single';
  }
  if (rawString.includes('10"')) {
    return 'vinyl_10';
  }
  if (rawString.includes('cd') || rawString.includes('compact disc')) {
    return 'cd';
  }
  if (rawString.includes('cassette') || rawString.includes('tape')) {
    return 'cassette';
  }
  if (rawString.includes('file') || rawString.includes('digital') || rawString.includes('mp3') || rawString.includes('flac')) {
    return 'digital_music';
  }

  return 'vinyl_lp';
}

function getFormatBadgeLabel(type, formatId) {
  return getFormatLabel(type, formatId) || 'Format standard';
}

function getExistingItem(resItem) {
  const cleanTitle = (resItem.title || '').trim().toLowerCase();
  const cleanArtist = (resItem.artist || '').trim().toLowerCase();

  return collectionStore.items.find(item => {
    if (resItem.discogs_id && item.discogs_id === resItem.discogs_id) {
      return true;
    }
    return (item.title || '').trim().toLowerCase() === cleanTitle &&
           (item.artist || '').trim().toLowerCase() === cleanArtist &&
           item.type === resItem.type;
  }) || null;
}

// 📷 CLIC BOUTON SCANNER
async function handleScanClick() {
  if (!import.meta.client) return;

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    startLiveScanner();
  } else {
    fileInputRef.value?.click();
  }
}

// 🔴 SCANNER VIDÉO EN DIRECT EN CONTINU AVEC APPEL API AUTOMATIQUE
async function startLiveScanner() {
  if (!import.meta.client) return;

  scannedBatch.value = [];
  scannedCodesSet.value.clear();
  isScanning.value = true;
  scannerZoomValue.value = 1;
  hasZoomSupport.value = false;
  await nextTick();

  try {
    const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');

    const formatsSupported = [
      Html5QrcodeSupportedFormats.EAN_13,
      Html5QrcodeSupportedFormats.EAN_8,
      Html5QrcodeSupportedFormats.UPC_A,
      Html5QrcodeSupportedFormats.UPC_E,
      Html5QrcodeSupportedFormats.CODE_128
    ];

    html5QrCodeScanner = new Html5Qrcode("interactive-scanner", { formatsToSupport: formatsSupported });
    await html5QrCodeScanner.start(
      { facingMode: "environment" },
      { fps: 20, qrbox: { width: 260, height: 140 } },
      (decodedText) => handleContinuousBarcodeDetect(decodedText),
      () => {}
    );

    setupScannerZoom();
  } catch (err) {
    stopScanner();
    fileInputRef.value?.click();
  }
}

async function handleContinuousBarcodeDetect(barcode) {
  const now = Date.now();

  // Cooldown de 1.5s pour ne pas re-traiter le même code en boucle pendant le survol
  if (scannedCodesSet.value.has(barcode) && (now - lastScanTimestamp.value < 1500)) {
    return;
  }

  if (!scannedCodesSet.value.has(barcode)) {
    scannedCodesSet.value.add(barcode);
    lastScanTimestamp.value = now;

    if (navigator.vibrate) navigator.vibrate(80);

    // Résolution API en arrière-plan sans stopper le flux vidéo
    isResolvingApi.value = true;
    try {
      const itemData = await fetchSingleItemByBarcode(barcode, searchType.value);
      if (itemData) {
        scannedBatch.value.push({
          ...itemData,
          is_wishlist: defaultBatchTarget.value
        });
      }
    } catch (e) {
      console.warn("Échec résolution API pour barcode:", barcode, e);
    } finally {
      isResolvingApi.value = false;
    }
  }
}

// 🔍 Fonction de résolution API à l'unité selon le type de média
async function fetchSingleItemByBarcode(code, type) {
  const discogsToken = config.public?.discogsToken || '';

  if (type === 'vinyl') {
    const res = await fetch(`https://api.discogs.com/database/search?barcode=${encodeURIComponent(code)}&token=${discogsToken}`);
    const data = await res.json();
    const item = data.results?.[0];
    if (item) {
      return {
        id: item.id,
        discogs_id: item.id,
        title: item.title.includes(' - ') ? item.title.split(' - ')[1] : item.title,
        artist: item.title.includes(' - ') ? item.title.split(' - ')[0] : 'Artiste inconnu',
        year: item.year || '',
        cover: item.cover_image || item.thumb,
        type: 'vinyl',
        detectedFormat: mapDiscogsFormat(item.format)
      };
    }
  } else if (type === 'book') {
    const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(code)}&limit=1`);
    const data = await res.json();
    const doc = data.docs?.[0];
    if (doc) {
      return {
        id: doc.key,
        title: doc.title,
        artist: doc.author_name ? doc.author_name.join(', ') : 'Auteur inconnu',
        year: doc.first_publish_year || '',
        cover: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
        type: 'book',
        detectedFormat: 'paperback'
      };
    }
  } else if (type === 'movie') {
    const tmdbToken = config.public?.tmdbToken;
    const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${tmdbToken}&query=${encodeURIComponent(code)}&language=fr-FR`);
    const data = await res.json();
    const movie = data.results?.[0];
    if (movie) {
      return {
        id: movie.id,
        title: movie.title,
        artist: movie.release_date ? movie.release_date.split('-')[0] : 'Film',
        year: movie.release_date ? movie.release_date.split('-')[0] : '',
        cover: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
        type: 'movie',
        detectedFormat: 'bluray'
      };
    }
  } else if (type === 'videogame') {
    const rawgToken = config.public?.rawgToken || '';
    const res = await fetch(`https://api.rawg.io/api/games?key=${rawgToken}&search=${encodeURIComponent(code)}&page_size=1`);
    const data = await res.json();
    const game = data.results?.[0];
    if (game) {
      const platformNames = (game.platforms || []).map(p => p.platform.name).join(', ');
      return {
        id: game.id,
        title: game.name,
        artist: platformNames || 'Jeu vidéo',
        year: game.released ? game.released.split('-')[0] : '',
        cover: game.background_image || null,
        type: 'videogame',
        detectedFormat: game.platforms?.some(p => p.platform.name.toLowerCase().includes('switch')) ? 'cartridge' : 'disc'
      };
    }
  }

  // Fallback direct si l'API ne renvoie rien
  return {
    id: 'scanned-' + code,
    title: `Code: ${code}`,
    artist: 'Résultat brut',
    year: '',
    cover: null,
    type: type,
    detectedFormat: 'standard'
  };
}

function removeFromBatch(index) {
  const item = scannedBatch.value[index];
  if (item) {
    scannedCodesSet.value.delete(item.id);
    scannedBatch.value.splice(index, 1);
  }
}

function clearBatch() {
  scannedBatch.value = [];
  scannedCodesSet.value.clear();
}

async function saveAllBatch() {
  for (const item of scannedBatch.value) {
    await addItem(item, item.is_wishlist);
  }
  clearBatch();
  stopScanner();
}

function setupScannerZoom() {
  if (!import.meta.client) return;
  let attempts = 0;
  const interval = setInterval(() => {
    scannerVideoElement = document.querySelector("#interactive-scanner video");
    attempts++;

    if (scannerVideoElement && scannerVideoElement.srcObject) {
      clearInterval(interval);
      const stream = scannerVideoElement.srcObject;
      scannerVideoTrack = stream.getVideoTracks()[0];

      const capabilities = scannerVideoTrack?.getCapabilities ? scannerVideoTrack.getCapabilities() : {};

      if (capabilities.zoom) {
        isHardwareZoom = true;
        scannerZoomMin.value = capabilities.zoom.min || 1;
        scannerZoomMax.value = Math.min(capabilities.zoom.max || 4, 4);
        scannerZoomValue.value = capabilities.zoom.min || 1;
      } else {
        isHardwareZoom = false;
        scannerZoomMin.value = 1;
        scannerZoomMax.value = 3;
        scannerZoomValue.value = 1;
      }
      hasZoomSupport.value = true;
    }

    if (attempts > 20) clearInterval(interval);
  }, 200);
}

function zoomScannerIn() {
  if (scannerZoomValue.value < scannerZoomMax.value) {
    scannerZoomValue.value = Math.min(parseFloat((scannerZoomValue.value + 0.3).toFixed(1)), scannerZoomMax.value);
    applyScannerZoom();
  }
}

function zoomScannerOut() {
  if (scannerZoomValue.value > scannerZoomMin.value) {
    scannerZoomValue.value = Math.max(parseFloat((scannerZoomValue.value - 0.3).toFixed(1)), scannerZoomMin.value);
    applyScannerZoom();
  }
}

function applyScannerZoom() {
  const factor = parseFloat(scannerZoomValue.value);
  if (isHardwareZoom && scannerVideoTrack) {
    scannerVideoTrack.applyConstraints({ advanced: [{ zoom: factor }] }).catch(() => {});
  } else if (scannerVideoElement) {
    scannerVideoElement.style.transform = `scale(${factor})`;
    scannerVideoElement.style.transformOrigin = `center center`;
  }
}

function stopScanner() {
  if (scannerVideoElement) {
    scannerVideoElement.style.transform = 'none';
  }
  scannerVideoElement = null;
  scannerVideoTrack = null;
  hasZoomSupport.value = false;

  if (html5QrCodeScanner && isScanning.value) {
    html5QrCodeScanner.stop().catch(() => {}).finally(() => {
      isScanning.value = false;
    });
  } else {
    isScanning.value = false;
  }
}

async function handleFileUpload(event) {
  if (!import.meta.client) return;
  const file = event.target.files[0];
  if (!file) return;

  loading.value = true;
  try {
    const { Html5Qrcode } = await import('html5-qrcode');
    const html5QrCode = new Html5Qrcode("interactive-scanner");
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

onUnmounted(() => {
  stopScanner();
});

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

    } else if (searchType.value === 'boardgame') {
      const res = await fetch(`https://api.boardgameatlas.com/api/search?name=${encodeURIComponent(query.value)}&limit=10&client_id=`);
      if (res.ok) {
        const data = await res.json();
        results.value = (data || []).slice(0, 12).map(game => ({
          id: game.gameId,
          title: game.name,
          artist: 'Jeu de société',
          year: game.yearPublished || '',
          cover: game.thumbnail || null,
          type: 'boardgame',
          detectedFormat: 'base_game'
        }));
      }

    } else if (searchType.value === 'videogame') {
      const rawgToken = config.public?.rawgToken || '';
      const res = await fetch(
        `https://api.rawg.io/api/games?key=${rawgToken}&search=${encodeURIComponent(query.value)}&page_size=12`
      );
      const data = await res.json();

      results.value = (data.results || []).map(game => {
        const platformNames = (game.platforms || []).map(p => p.platform.name).join(', ');
        return {
          id: game.id,
          title: game.name,
          artist: platformNames || 'Jeu vidéo',
          year: game.released ? game.released.split('-')[0] : '',
          cover: game.background_image || null,
          type: 'videogame',
          detectedFormat: game.platforms?.some(p => p.platform.name.toLowerCase().includes('switch')) ? 'cartridge' : 'disc'
        };
      });
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

/* MODALE SCANNER VIDÉO CONTINU */
.scanner-modal { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.92); display: flex; justify-content: center; align-items: center; z-index: 4000; padding: 16px; }
.scanner-container { background: #18181b; border: 1px solid #27272a; border-radius: 20px; padding: 20px; width: 100%; max-width: 440px; max-height: 90vh; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
.scanner-header { display: flex; justify-content: space-between; align-items: center; width: 100%; color: #fff; font-weight: 700; }
.header-title { display: flex; align-items: center; gap: 8px; font-size: 0.95rem; }
.badge-count { background: #3b82f6; color: #fff; font-size: 0.75rem; padding: 2px 8px; border-radius: 12px; font-weight: 600; }
.btn-close-scanner { background: rgba(255, 255, 255, 0.1); border: none; color: #fff; padding: 6px 12px; border-radius: 8px; font-size: 0.8rem; cursor: pointer; }

.video-wrapper { width: 100%; aspect-ratio: 4/3; border-radius: 12px; overflow: hidden; background: #000; position: relative; }
.scanner-video { width: 100%; height: 100%; }

/* 🔴 Ligne Laser Animée */
.laser-line {
  position: absolute;
  top: 50%;
  left: 10%;
  width: 80%;
  height: 2px;
  background: #ef4444;
  box-shadow: 0 0 10px #ef4444, 0 0 18px #ef4444;
  pointer-events: none;
  animation: scan-anim 2s infinite ease-in-out;
  z-index: 10;
}

@keyframes scan-anim {
  0% { transform: translateY(-35px); opacity: 0.5; }
  50% { transform: translateY(35px); opacity: 1; }
  100% { transform: translateY(-35px); opacity: 0.5; }
}

.api-resolving-indicator { font-size: 0.75rem; color: #60a5fa; text-align: center; display: flex; align-items: center; justify-content: center; gap: 6px; }
.spinner { display: inline-block; width: 12px; height: 12px; border: 2px solid #60a5fa; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.target-selection { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #27272a; border-radius: 8px; color: #a1a1aa; font-size: 0.8rem; }
.target-select, .batch-item-target { background: #18181b; border: 1px solid #3f3f46; color: #fff; padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; }

/* Tiroir des éléments scannés */
.scanned-batch-tray { background: #27272a; border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.tray-header { display: flex; justify-content: space-between; align-items: center; }
.tray-header h4 { margin: 0; font-size: 0.85rem; color: #fff; }
.btn-clear-tray { background: none; border: none; color: #ef4444; font-size: 0.75rem; cursor: pointer; }
.batch-list { list-style: none; padding: 0; margin: 0; max-height: 160px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
.batch-item { display: flex; align-items: center; gap: 10px; background: #18181b; padding: 6px 8px; border-radius: 8px; }
.batch-cover { width: 32px; height: 42px; object-fit: cover; border-radius: 4px; }
.batch-details { flex: 1; min-width: 0; display: flex; flex-direction: column; text-align: left; }
.batch-item-title { font-size: 0.8rem; color: #fff; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.batch-item-artist { font-size: 0.7rem; color: #a1a1aa; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.btn-remove-batch { background: none; border: none; color: #71717a; cursor: pointer; padding: 2px 6px; }
.btn-confirm-batch { background: #3b82f6; color: #fff; border: none; padding: 10px; border-radius: 8px; font-weight: 700; font-size: 0.85rem; cursor: pointer; margin-top: 4px; }

:deep(#interactive-scanner video) { transition: transform 0.1s ease-out; object-fit: cover; }
.scanner-zoom-controls { display: flex; align-items: center; justify-content: center; gap: 16px; width: 100%; }
.btn-zoom { background: #27272a; border: 1px solid #3f3f46; color: #fff; padding: 6px 14px; border-radius: 8px; font-weight: 700; font-size: 0.85rem; cursor: pointer; }
.btn-zoom:disabled { opacity: 0.4; cursor: not-allowed; }
.zoom-label { color: #a1a1aa; font-size: 0.85rem; font-weight: 600; min-width: 45px; text-align: center; }
.scanner-hint { font-size: 0.75rem; color: #71717a; text-align: center; margin: 0; }

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