<template>
  <div class="api-search-panel">
    <div class="search-inputs">
      <select v-model="selectedType" class="type-select">
        <option value="vinyl">💿 Vinyles</option>
        <option value="book">📚 Livres / BDs</option>
        <option value="movie">🎬 DVDs / Films</option>
      </select>

      <input 
        v-model="queryInput" 
        type="text" 
        placeholder="Titre, artiste, ISBN, code-barres..." 
        @keyup.enter="triggerSearch"
      />

      <button class="btn btn-primary" @click="triggerSearch" :disabled="loading">
        {{ loading ? '...' : '🔍' }}
      </button>

      <button class="btn btn-scan" @click="isScannerOpen = true" title="Scanner un code-barres">
        📷
      </button>
    </div>

    <!-- Modale du Scanner -->
    <ScannerModal 
      :isOpen="isScannerOpen" 
      @close="isScannerOpen = false" 
      @scan="handleScanResult" 
    />

    <!-- Résultats de recherche -->
    <div v-if="searchResults.length > 0" class="results-container">
      <div 
        v-for="(item, idx) in searchResults" 
        :key="idx" 
        class="result-item"
        :class="{ 'is-duplicate': isDuplicate(item) }"
      >
        <img :src="item.cover || defaultCover" alt="" />
        <div class="result-info">
          <div class="result-title">
            {{ item.title }}
            <span v-if="isDuplicate(item)" class="badge-duplicate">⚠️ Dans la collection</span>
          </div>
          <div class="result-sub">{{ item.artist }} {{ item.year ? `(${item.year})` : '' }}</div>
          <div v-if="item.suggestedPrice" class="price-tag">🏷️ Cote: {{ item.suggestedPrice }}</div>

          <div class="result-actions">
            <button class="btn btn-sm btn-primary" @click="saveItem(item, false)">+ Collection</button>
            <button class="btn btn-sm btn-wishlist" @click="saveItem(item, true)">+ ✨ Wishlist</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { searchMediaAPI } from '../services/api';
import { useCollectionStore } from '../stores/collection';
import ScannerModal from './ScannerModal.vue';

const collectionStore = useCollectionStore();

const selectedType = ref('vinyl');
const queryInput = ref('');
const loading = ref(false);
const isScannerOpen = ref(false);
const searchResults = ref([]);

const defaultCover = 'https://via.placeholder.com/50';

async function triggerSearch() {
  if (!queryInput.value.trim()) return;
  loading.value = true;
  try {
    searchResults.value = await searchMediaAPI(queryInput.value.trim(), selectedType.value);
  } finally {
    loading.value = false;
  }
}

function handleScanResult(code) {
  queryInput.value = code;
  triggerSearch();
}

function isDuplicate(item) {
  return collectionStore.items.some(existing => 
    existing.type === selectedType.value &&
    !existing.is_wishlist &&
    existing.title.toLowerCase().trim() === item.title.toLowerCase().trim() &&
    existing.artist.toLowerCase().trim() === item.artist.toLowerCase().trim()
  );
}

async function saveItem(item, isWishlist) {
  if (isDuplicate(item) && !isWishlist) {
    if (!confirm(`"${item.title}" est déjà dans ta collection. L'ajouter quand même ?`)) return;
  }

  await collectionStore.addItem({
    title: item.title,
    artist: item.artist,
    year: item.year,
    genre: item.genre,
    cover: item.cover,
    type: selectedType.value,
    is_wishlist: isWishlist
  });

  searchResults.value = [];
  queryInput.value = '';
}
</script>

<style scoped>
.api-search-panel {
  margin-bottom: 24px;
}

.search-inputs {
  display: flex;
  gap: 8px;
}

.type-select, .search-inputs input {
  background: #18181b;
  border: 1px solid #27272a;
  color: #fff;
  padding: 10px 12px;
  border-radius: 8px;
}

.search-inputs input {
  flex: 1;
}

.btn-scan {
  background: #27272a;
  border: 1px solid #3f3f46;
  color: #fff;
  padding: 10px 14px;
  border-radius: 8px;
  cursor: pointer;
}

.results-container {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 12px;
  margin-top: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-item {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 8px;
  border-radius: 8px;
  background: #09090b;
}

.result-item.is-duplicate {
  border: 1px solid #f59e0b;
}

.result-item img {
  width: 50px;
  height: 50px;
  object-fit: cover;
  border-radius: 6px;
}

.result-info {
  flex: 1;
  text-align: left;
}

.result-title {
  font-weight: 700;
  font-size: 0.9rem;
}

.badge-duplicate {
  font-size: 0.7rem;
  color: #fbbf24;
  margin-left: 6px;
}

.result-sub {
  font-size: 0.8rem;
  color: #a1a1aa;
}

.price-tag {
  font-size: 0.75rem;
  color: #10b981;
  margin-top: 2px;
}

.result-actions {
  display: flex;
  gap: 6px;
  margin-top: 6px;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 0.75rem;
  border-radius: 6px;
  border: none;
  cursor: pointer;
}

.btn-wishlist {
  background: #27272a;
  color: #fbbf24;
  border: 1px solid #3f3f46;
}
</style>