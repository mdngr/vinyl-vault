<template>
  <div class="item-detail-page">
    
    <!-- CHARGEMENT -->
    <div v-if="loading" class="loading-state">
      <p>Chargement de l'œuvre...</p>
    </div>

    <!-- ERREUR SI ÉLÉMENT NON TROUVÉ -->
    <div v-else-if="!item" class="error-state">
      <p>Œuvre introuvable.</p>
      <button class="btn-back" @click="navigateTo('/collection')">← Retour à la collection</button>
    </div>

    <!-- CONTENU CHARGÉ AVEC SÉCURITÉ NULL-CHECK -->
    <template v-else>
      <!-- BARRE D'ACTION HAUTE -->
      <div class="top-nav">
        <button class="btn-back" @click="navigateTo('/collection')">
          ← Collection
        </button>

        <div class="top-actions">
          <button 
            class="btn-icon" 
            :class="{ active: isEditing }"
            @click="toggleEditMode"
            title="Modifier l'œuvre"
          >
            ✏️
          </button>
          <button 
            class="btn-icon" 
            :class="{ active: item.is_wishlist }"
            @click="toggleWishlist"
            title="Ajouter à la wishlist"
          >
            ✨
          </button>
          <button class="btn-icon danger" @click="deleteItem" title="Supprimer">
            🗑️
          </button>
        </div>
      </div>

      <!-- 📝 FORMULAIRE D'ÉDITION COMPLET -->
      <section v-if="isEditing" class="edit-section">
        <div class="section-header">
          <h2>✏️ Modifier les informations</h2>
          <button class="btn-close" @click="isEditing = false">✕ Annuler</button>
        </div>

        <form @submit.prevent="saveFullEdit" class="edit-form">
          <div class="form-group">
            <label>Titre</label>
            <input v-model="editForm.title" type="text" required />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Auteur / Artiste</label>
              <input v-model="editForm.artist" type="text" required />
            </div>

            <div class="form-group">
              <label>Année</label>
              <input v-model="editForm.year" type="text" placeholder="Ex: 1999" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Type de média</label>
              <select v-model="editForm.type" @change="onTypeChange" class="form-select">
                <option value="vinyl">🎵 Musique</option>
                <option value="book">📚 Livre</option>
                <option value="movie">🎬 Film</option>
                <option value="boardgame">🎲 Jeu de société</option>
                <option value="videogame">🎮 Jeu vidéo</option>
              </select>
            </div>

            <div class="form-group">
              <label>Format</label>
              <select v-model="editForm.format" class="form-select">
                <option value="">-- Choisir un format --</option>
                <option v-for="fmt in availableFormats" :key="fmt.id" :value="fmt.id">
                  {{ fmt.label }}
                </option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Genre</label>
              <input v-model="editForm.genre" type="text" placeholder="Ex: Rock, Sci-Fi..." />
            </div>

            <div class="form-group">
              <label>Éditeur / Label / Studio</label>
              <input v-model="editForm.publisher" type="text" placeholder="Ex: Gallimard, Sub Pop..." />
            </div>
          </div>

          <div class="form-group">
            <label>Image de couverture (URL)</label>
            <input v-model="editForm.cover" type="url" placeholder="https://..." />
          </div>

          <div class="form-group checkbox-group">
            <label>
              <input type="checkbox" v-model="editForm.is_wishlist" />
              Dans ma Wishlist
            </label>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="isEditing = false">Annuler</button>
            <button type="submit" class="btn btn-primary">Enregistrer les modifications</button>
          </div>
        </form>
      </section>

      <!-- 🖼️ HERO / INFOS ESSENTIELLES (MODE LECTURE) -->
      <div v-else class="hero-section">
        <div class="cover-wrapper">
          <img :src="item.cover || item.cover_url || '/placeholder-cover.png'" :alt="item.title" class="cover-image" />
          <span class="type-badge">{{ typeBadge.emoji }} {{ typeBadge.label }}</span>
        </div>

        <div class="info-main">
          <h1 class="item-title">{{ item.title }}</h1>
          <h2 class="item-artist">{{ item.artist || item.author || item.director }}</h2>
          
          <div class="metadata-pills">
            <span v-if="item.year" class="pill">{{ item.year }}</span>
            <span v-if="formatBadgeLabel" class="pill pill-format">{{ formatBadgeLabel }}</span>
            <span v-if="item.genre" class="pill">{{ item.genre }}</span>
            <span v-if="item.publisher" class="pill">{{ item.publisher }}</span>
          </div>

          <!-- RATING & BASCULE POSSÉDÉ / WISHLIST -->
          <div class="quick-status">
            <div 
              class="status-badge" 
              :class="item.is_wishlist ? 'status-wishlist' : 'status-owned'"
              @click="toggleWishlist"
              style="cursor: pointer;"
              title="Cliquer pour changer le statut"
            >
              {{ item.is_wishlist ? '✨ Dans la Wishlist' : '📦 En Collection' }}
            </div>

            <!-- Note / Évaluation rapide -->
            <div class="rating-stars">
              <button 
                v-for="star in 5" 
                :key="star" 
                class="star-btn"
                :class="{ active: star <= (item.rating || 0) }"
                @click="setRating(star)"
              >
                ★
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- NOTES PERSONNELLES / COMMENTAIRE -->
      <div class="notes-section">
        <label for="personal-notes">Notes personnelles</label>
        <textarea 
          id="personal-notes"
          v-model="item.notes" 
          placeholder="Avis, contexte d'écoute, morceau préféré, pressage recherché..."
          rows="3"
          class="custom-textarea"
          @blur="saveChanges"
        ></textarea>
      </div>

      <!-- 🔍 MODULE COLLECTIONNEUR AVANCÉ (JSONB) -->
      <ItemCollectorDetails 
        :item-type="item.type" 
        v-model="item.collector_data" 
        @update:modelValue="saveChanges"
      />
    </template>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useCollectionStore } from '~/stores/collection';
import { FORMATS_BY_TYPE, getFormatLabel } from '~/constants/formats';
import ItemCollectorDetails from '~/components/ItemCollectorDetails.vue';

const route = useRoute();
const collectionStore = useCollectionStore();

const loading = ref(true);
const item = ref(null);
const isEditing = ref(false);
const editForm = ref({});

const typeBadges = {
  vinyl: { label: 'Musique', emoji: '🎵' },
  book: { label: 'Livre', emoji: '📚' },
  movie: { label: 'Film', emoji: '🎬' },
  boardgame: { label: 'Jeu de société', emoji: '🎲' },
  videogame: { label: 'Jeu vidéo', emoji: '🎮' }
};

const typeBadge = computed(() => {
  return typeBadges[item.value?.type] || { label: 'Élément', emoji: '📦' };
});

const formatBadgeLabel = computed(() => {
  if (!item.value?.format) return null;
  return getFormatLabel(item.value.type, item.value.format);
});

const availableFormats = computed(() => {
  return FORMATS_BY_TYPE[editForm.value.type] || [];
});

onMounted(async () => {
  const itemId = route.params.id;
  
  // Cherche d'abord dans le store
  let found = collectionStore.items.find(i => String(i.id) === String(itemId));
  
  if (found) {
    item.value = JSON.parse(JSON.stringify(found));
  } else if (collectionStore.fetchItemById) {
    // Sinon charge via l'API
    const res = await collectionStore.fetchItemById(itemId);
    if (res) item.value = JSON.parse(JSON.stringify(res));
  }

  // Initialise l'objet collector_data si inexistant
  if (item.value && !item.value.collector_data) {
    item.value.collector_data = {};
  }
  
  loading.value = false;
});

function toggleEditMode() {
  if (!isEditing.value && item.value) {
    editForm.value = {
      title: item.value.title || '',
      artist: item.value.artist || item.value.author || item.value.director || '',
      year: item.value.year || '',
      type: item.value.type || 'vinyl',
      format: item.value.format || '',
      genre: item.value.genre || '',
      publisher: item.value.publisher || '',
      cover: item.value.cover || item.value.cover_url || '',
      is_wishlist: !!item.value.is_wishlist
    };
  }
  isEditing.value = !isEditing.value;
}

function onTypeChange() {
  editForm.value.format = '';
}

async function saveFullEdit() {
  if (!item.value) return;

  item.value = {
    ...item.value,
    ...editForm.value
  };

  await saveChanges();
  isEditing.value = false;
}

async function toggleWishlist() {
  if (!item.value) return;
  item.value.is_wishlist = !item.value.is_wishlist;
  if (isEditing.value) {
    editForm.value.is_wishlist = item.value.is_wishlist;
  }
  await saveChanges();
}

async function setRating(stars) {
  if (!item.value) return;
  item.value.rating = item.value.rating === stars ? 0 : stars;
  await saveChanges();
}

async function saveChanges() {
  if (!item.value) return;
  
  await collectionStore.updateItem(item.value.id, {
    ...item.value,
    rating: item.value.rating,
    notes: item.value.notes,
    collector_data: item.value.collector_data,
    is_wishlist: item.value.is_wishlist
  });
}

async function deleteItem() {
  if (!item.value) return;
  if (confirm("Supprimer définitivement cette œuvre de ta collection ?")) {
    await collectionStore.deleteItem(item.value.id);
    navigateTo('/collection');
  }
}
</script>

<style scoped>
.item-detail-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-bottom: 120px;
}

.loading-state, .error-state {
  text-align: center;
  padding: 60px 20px;
  color: #a1a1aa;
}

/* TOP NAV */
.top-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.btn-back {
  background: #18181b;
  border: 1px solid #27272a;
  color: #3b82f6;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.top-actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  background: #18181b;
  border: 1px solid #27272a;
  color: #a1a1aa;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-icon.active {
  background: rgba(245, 158, 11, 0.2);
  border-color: #f59e0b;
}

.btn-icon.danger:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: #ef4444;
}

/* FORMULAIRE D'ÉDITION */
.edit-section {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-header h2 {
  margin: 0;
  font-size: 1.2rem;
  color: #fff;
}

.btn-close {
  background: transparent;
  border: none;
  color: #71717a;
  cursor: pointer;
  font-size: 0.9rem;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-group label {
  font-size: 0.75rem;
  color: #a1a1aa;
}

.form-group input, .form-select {
  background: #09090b;
  border: 1px solid #3f3f46;
  color: #fff;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 0.85rem;
  outline: none;
}

.form-group input:focus, .form-select:focus {
  border-color: #3b82f6;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  cursor: pointer;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

.btn {
  padding: 8px 14px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
}

.btn-primary {
  background: #3b82f6;
  color: #ffffff;
  border: none;
}

.btn-secondary {
  background: #27272a;
  color: #ffffff;
  border: 1px solid #3f3f46;
}

/* HERO SECTION */
.hero-section {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

.cover-wrapper {
  position: relative;
  width: 220px;
  flex-shrink: 0;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
  border: 1px solid #27272a;
}

.cover-image {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  display: block;
}

.type-badge {
  position: absolute;
  bottom: 8px;
  left: 8px;
  background: rgba(9, 9, 11, 0.85);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #fff;
}

.info-main {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.item-title {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 800;
  color: #ffffff;
  line-height: 1.2;
}

.item-artist {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #a1a1aa;
}

.metadata-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

.pill {
  background: #18181b;
  border: 1px solid #27272a;
  color: #71717a;
  font-size: 0.75rem;
  padding: 3px 8px;
  border-radius: 6px;
}

.pill-format {
  color: #e4e4e7;
  border-color: #3f3f46;
}

.quick-status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}

.status-badge {
  font-size: 0.8rem;
  font-weight: 700;
  padding: 6px 12px;
  border-radius: 8px;
  transition: opacity 0.2s ease;
}

.status-badge:hover {
  opacity: 0.85;
}

.status-owned {
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.status-wishlist {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

/* STARS */
.rating-stars {
  display: flex;
  gap: 2px;
}

.star-btn {
  background: transparent;
  border: none;
  color: #3f3f46;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0 2px;
  transition: color 0.15s ease;
}

.star-btn.active {
  color: #f59e0b;
}

/* NOTES */
.notes-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: #18181b;
  border: 1px solid #27272a;
  padding: 16px;
  border-radius: 12px;
}

.notes-section label {
  font-size: 0.8rem;
  font-weight: 700;
  color: #a1a1aa;
}

.custom-textarea {
  background: #09090b;
  border: 1px solid #3f3f46;
  color: #ffffff;
  padding: 10px;
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.85rem;
  resize: vertical;
  outline: none;
}

.custom-textarea:focus {
  border-color: #3b82f6;
}

/* RESPONSIVE MOBILE */
@media (max-width: 640px) {
  .hero-section {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .cover-wrapper {
    width: 180px;
  }

  .metadata-pills, .quick-status {
    justify-content: center;
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>