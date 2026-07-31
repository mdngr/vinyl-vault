<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Import Wantlist Discogs</h3>
        <button class="btn-close" @click="$emit('close')">✕</button>
      </div>

      <div class="modal-body">
        <p class="import-desc">
          Sélectionne ton fichier CSV exporté depuis Discogs. Les pochettes seront automatiquement récupérées via l'API Discogs.
        </p>

        <input 
          type="file" 
          accept=".csv" 
          ref="fileInput" 
          @change="handleFileUpload" 
          class="file-input"
          :disabled="uploading"
        />

        <div v-if="parsedRawItems.length > 0" class="preview-info">
          <span v-if="!uploading">📦 {{ parsedRawItems.length }} vinyles trouvés dans le fichier</span>
          <div v-else class="progress-container">
            <span>⏳ Récupération des pochettes & Importation : {{ progressCount }} / {{ parsedRawItems.length }}</span>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn btn-secondary" @click="$emit('close')" :disabled="uploading">Annuler</button>
          <button 
            class="btn btn-primary" 
            :disabled="parsedRawItems.length === 0 || uploading"
            @click="processAndImport"
          >
            {{ uploading ? `Import (${progressPercent}%)` : 'Lancer l\'importation' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../stores/auth';

const emit = defineEmits(['close', 'imported']);
const authStore = useAuthStore();

const DISCOGS_TOKEN = import.meta.env.VITE_DISCOGS_TOKEN;
const parsedRawItems = ref([]);
const uploading = ref(false);
const progressCount = ref(0);

const progressPercent = computed(() => {
  if (parsedRawItems.value.length === 0) return 0;
  return Math.round((progressCount.value / parsedRawItems.value.length) * 100);
});

// Lecture du fichier CSV
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result;
    parsedRawItems.value = parseDiscogsCSV(text);
  };
  reader.readAsText(file);
}

// Extraction des lignes du CSV Discogs
function parseDiscogsCSV(csvText) {
  const lines = csvText.split(/\r\n|\n/);
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const results = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCSVLine(lines[i]);
    
    const row = {};
    headers.forEach((h, index) => {
      row[h.trim()] = values[index] ? values[index].trim() : '';
    });

    if (row['Artist'] && row['Title']) {
      results.push({
        artist: row['Artist'],
        title: row['Title'],
        year: row['Released'] || null,
        formatRaw: row['Format'] || ''
      });
    }
  }

  return results;
}

function parseCSVLine(text) {
  const regex = /(?!\s*$)\s*(?:'([^'\\]*(?:\\[\S\s][^'\\]*)*)'|"([^"\\]*(?:\\[\S\s][^"\\]*)*)"|([^,\s"]*))\s*(?:,|$)/g;
  const arr = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index === regex.lastIndex) regex.lastIndex++;
    arr.push(match[1] || match[2] || match[3] || '');
  }
  return arr;
}

function mapDiscogsFormat(rawFormat) {
  if (!rawFormat) return 'lp';
  const lower = rawFormat.toLowerCase();
  if (lower.includes('7"')) return '7inch';
  if (lower.includes('12"')) return '12inch';
  if (lower.includes('cd')) return 'cd';
  if (lower.includes('cassette')) return 'tape';
  return 'lp';
}

// Recherche de la pochette sur l'API Discogs pour un vinyle
async function fetchCoverFromDiscogs(artist, title) {
  try {
    const query = encodeURIComponent(`${artist} ${title}`);
    let url = `https://api.discogs.com/database/search?q=${query}&type=release`;
    if (DISCOGS_TOKEN) {
      url += `&token=${DISCOGS_TOKEN}`;
    }

    const res = await fetch(url);
    if (!res.ok) return null;
    
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      return data.results[0].cover_image || data.results[0].thumb || null;
    }
  } catch (err) {
    console.warn(`Impossible de récupérer la pochette pour ${artist} - ${title}`, err);
  }
  return null;
}

// Pause asynchrone pour respecter les quotas de l'API Discogs
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Traitement enrichi + envoi dans Supabase
async function processAndImport() {
  if (parsedRawItems.value.length === 0) return;

  uploading.value = true;
  progressCount.value = 0;

  const itemsToInsert = [];

  for (const raw of parsedRawItems.value) {
    // 1. Appel API Discogs pour choper la pochette
    const coverUrl = await fetchCoverFromDiscogs(raw.artist, raw.title);

    itemsToInsert.push({
      user_id: authStore.user?.id,
      title: raw.title,
      artist: raw.artist,
      year: raw.year,
      type: 'vinyl',
      format: mapDiscogsFormat(raw.formatRaw),
      cover: coverUrl,
      is_wishlist: true
    });

    progressCount.value++;
    // Pause de 100ms pour éviter les blocages de l'API Discogs
    await delay(100);
  }

  try {
    const { error } = await supabase
      .from('vinyls')
      .insert(itemsToInsert);

    if (error) throw error;

    alert(`Succès : ${itemsToInsert.length} vinyles importés avec leurs pochettes !`);
    emit('imported');
    emit('close');
  } catch (err) {
    alert("Erreur lors de l'enregistrement : " + err.message);
  } finally {
    uploading.value = false;
  }
}
</script>

<style scoped>
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
  margin-bottom: 16px;
}

.modal-header h3 {
  margin: 0;
  color: #fff;
}

.btn-close {
  background: transparent;
  border: none;
  color: #71717a;
  font-size: 1.1rem;
  cursor: pointer;
}

.import-desc {
  color: #a1a1aa;
  font-size: 0.9rem;
  line-height: 1.4;
  margin-bottom: 16px;
}

.file-input {
  width: 100%;
  background: #09090b;
  border: 1px dashed #3f3f46;
  padding: 12px;
  border-radius: 8px;
  color: #fff;
  font-size: 0.85rem;
  cursor: pointer;
}

.preview-info {
  margin-top: 14px;
  font-size: 0.85rem;
  color: #3b82f6;
  font-weight: 600;
}

/* PROGRESS BAR */
.progress-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: #27272a;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #3b82f6;
  transition: width 0.2s ease;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}
</style>