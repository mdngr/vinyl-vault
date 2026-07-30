<template>
  <div class="item-card" :class="{ 'is-list': isListView, 'is-wishlist': item.is_wishlist }">
    <!-- Image de couverture -->
    <div class="cover-wrapper">
      <img :src="item.cover || defaultCover" :alt="item.title" class="cover-img" />
      <span v-if="item.is_wishlist" class="wishlist-badge" title="En Wishlist">✨</span>
    </div>

    <!-- Informations principales -->
    <div class="card-details">
      <div class="card-header">
        <h3 class="item-title">{{ item.title }}</h3>
        <p class="item-artist">{{ item.artist }} {{ item.year ? `(${item.year})` : '' }}</p>
      </div>

      <!-- Badges harmonisés : Type + Format -->
      <div class="tags-row">
        <span class="badge badge-type">{{ typeLabel }}</span>
        <span v-if="formatLabel" class="badge badge-format">{{ formatLabel }}</span>
      </div>
    </div>

    <!-- Actions de carte -->
    <div v-if="!isReadonly" class="card-actions">
      <button class="btn-action" @click="openEditModal" title="Modifier">✏️</button>
      <button class="btn-action btn-delete" @click="$emit('delete', item.id)" title="Supprimer">🗑️</button>
    </div>

    <!-- Modale d'Édition -->
    <div v-if="isEditing" class="modal-overlay" @click.self="isEditing = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Modifier l'œuvre</h3>
          <button class="btn-close" @click="isEditing = false">✕</button>
        </div>

        <form @submit.prevent="saveEdit" class="edit-form">
          <div class="form-group">
            <label>Titre</label>
            <input v-model="form.title" type="text" required />
          </div>

          <div class="form-group">
            <label>Auteur / Artiste</label>
            <input v-model="form.artist" type="text" required />
          </div>

          <div class="form-group">
            <label>Année</label>
            <input v-model="form.year" type="text" placeholder="Ex: 1999" />
          </div>

          <!-- Type de média -->
          <div class="form-group">
            <label>Type de média</label>
            <select v-model="form.type" @change="onTypeChange" class="form-select">
              <option value="vinyl">🎵 Musique</option>
              <option value="book">📚 Livre</option>
              <option value="movie">🎬 Film</option>
            </select>
          </div>

          <!-- Format spécifique -->
          <div class="form-group">
            <label>Format</label>
            <select v-model="form.format" class="form-select">
              <option value="">-- Choisir un format --</option>
              <option v-for="fmt in availableFormats" :key="fmt.id" :value="fmt.id">
                {{ fmt.label }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Image de couverture (URL)</label>
            <input v-model="form.cover" type="url" placeholder="https://..." />
          </div>

          <div class="form-group checkbox-group">
            <label>
              <input type="checkbox" v-model="form.is_wishlist" />
              Dans ma Wishlist
            </label>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="isEditing = false">Annuler</button>
            <button type="submit" class="btn btn-primary">Enregistrer</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useCollectionStore } from '../stores/collection';
import { FORMATS_BY_TYPE, getFormatLabel } from '../constants/formats';

const props = defineProps({
  item: { type: Object, required: true },
  isListView: { type: Boolean, default: false },
  isReadonly: {
    type: Boolean,
    default: false
  }
});

defineEmits(['delete']);

const collectionStore = useCollectionStore();
const defaultCover = 'https://via.placeholder.com/200x300/2a2a2a/ffffff?text=Pas+d%27image';

const isEditing = ref(false);
const form = ref({});

// Libellé propre pour le Type
const typeLabel = computed(() => {
  const map = {
    vinyl: '🎵 Musique',
    book: '📚 Livre',
    movie: '🎬 Film'
  };
  return map[props.item.type] || 'Œuvre';
});

// Libellé propre pour le Format
const formatLabel = computed(() => {
  if (!props.item.format) return null;
  return getFormatLabel(props.item.type, props.item.format);
});

// Formats disponibles pour le formulaire d'édition
const availableFormats = computed(() => {
  return FORMATS_BY_TYPE[form.value.type] || [];
});

// Réinitialiser le format si l'utilisateur change la catégorie dans la modale
function onTypeChange() {
  form.value.format = '';
}

function openEditModal() {
  form.value = {
    title: props.item.title || '',
    artist: props.item.artist || '',
    year: props.item.year || '',
    type: props.item.type || 'vinyl',
    format: props.item.format || '',
    cover: props.item.cover || '',
    is_wishlist: !!props.item.is_wishlist
  };
  isEditing.value = true;
}

async function saveEdit() {
  await collectionStore.updateItem(props.item.id, { ...form.value });
  isEditing.value = false;
}
</script>

<style scoped>
.item-card {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 12px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: relative;
  transition: border-color 0.2s ease;
}

.item-card.is-list {
  flex-direction: row;
  align-items: center;
}

.cover-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  background: #09090b;
}

.is-list .cover-wrapper {
  width: 50px;
  height: 50px;
  aspect-ratio: auto;
  flex-shrink: 0;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.wishlist-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 50%;
  padding: 2px 6px;
  font-size: 0.75rem;
}

.card-details {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  text-align: left;
}

.item-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: #fff;
  margin: 0;
  line-height: 1.2;
}

.item-artist {
  font-size: 0.75rem;
  color: #a1a1aa;
  margin: 2px 0 0 0;
}

/* LIGNE DE BADGES HARMONISÉE */
.tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.badge {
  font-size: 0.65rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
  white-space: nowrap;
}

/* Style uniforme pour le Type et le Format */
.badge-type {
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.badge-format {
  background: rgba(255, 255, 255, 0.08);
  color: #e4e4e7;
  border: 1px solid #3f3f46;
}

.card-actions {
  display: flex;
  gap: 4px;
  justify-content: flex-end;
}

.btn-action {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  padding: 4px;
  opacity: 0.7;
}

.btn-action:hover {
  opacity: 1;
}

/* Modale */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.modal-content {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 16px;
  padding: 20px;
  width: 90%;
  max-width: 400px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-align: left;
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
  border: 1px solid #27272a;
  color: #fff;
  padding: 8px;
  border-radius: 8px;
  font-size: 0.85rem;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  cursor: pointer;
}

.modal-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 8px;
}
</style>