<template>
  <div 
    class="vinyl-card" 
    :class="{ 
      'is-wishlist': item.is_wishlist, 
      'list-view': isListView 
    }"
  >
    <img 
      class="cover-img" 
      :src="item.cover || defaultCover" 
      :alt="item.title" 
      loading="lazy" 
      @error="handleImgError"
    />

    <div class="card-body">
      <div class="card-tags">
        <span v-if="item.is_wishlist" class="tag-wishlist">✨ Wishlist</span>
        <span v-else class="type-tag">{{ typeBadge }}</span>
      </div>

      <div class="album-title">{{ item.title }}</div>
      <div class="artist-name">{{ item.artist }} {{ item.year ? `(${item.year})` : '' }}</div>
    </div>

    <!-- Actions : Édition & Suppression -->
    <div class="card-actions">
      <button class="btn-card-action" @click="openEditModal" title="Modifier">✏️</button>
      <button class="btn-card-action btn-delete" @click="$emit('delete', item.id)" title="Supprimer">✕</button>
    </div>

    <!-- Modale d'Édition -->
    <div v-if="isEditing" class="modal-overlay" @click.self="isEditing = false">
      <div class="modal-content edit-modal">
        <div class="modal-header">
          <h3>✏️ Modifier l'œuvre</h3>
          <button class="btn-close" @click="isEditing = false">✕</button>
        </div>

        <form @submit.prevent="saveChanges" class="edit-form">
          <div class="form-group">
            <label>Titre</label>
            <input v-model="form.title" type="text" required />
          </div>

          <div class="form-group">
            <label>Auteur / Artiste</label>
            <input v-model="form.artist" type="text" required />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Année</label>
              <input v-model="form.year" type="text" placeholder="Ex: 1995" />
            </div>

            <div class="form-group">
              <label>Type</label>
              <select v-model="form.type">
                <option value="vinyl">💿 Vinyle</option>
                <option value="book">📚 Livre</option>
                <option value="movie">🎬 Film</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>URL de la couverture</label>
            <input v-model="form.cover" type="text" placeholder="https://..." />
          </div>

          <div class="form-checkbox">
            <label>
              <input type="checkbox" v-model="form.is_wishlist" />
              Dans la Wishlist ✨
            </label>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="isEditing = false">Annuler</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { supabase } from '../services/supabase';
import { useCollectionStore } from '../stores/collection';

const props = defineProps({
  item: { type: Object, required: true },
  isListView: { type: Boolean, default: false }
});

defineEmits(['delete']);

const collectionStore = useCollectionStore();
const defaultCover = 'https://via.placeholder.com/200x300/2a2a2a/ffffff?text=Pas+d%27image';

const isEditing = ref(false);
const saving = ref(false);

const form = ref({
  title: '',
  artist: '',
  year: '',
  type: 'vinyl',
  cover: '',
  is_wishlist: false
});

const typeBadge = computed(() => {
  const icons = { vinyl: '💿 Vinyle', book: '📚 Livre', movie: '🎬 DVD' };
  return icons[props.item.type] || 'Œuvre';
});

function handleImgError(e) {
  e.target.src = defaultCover;
}

function openEditModal() {
  form.value = {
    title: props.item.title || '',
    artist: props.item.artist || '',
    year: props.item.year || '',
    type: props.item.type || 'vinyl',
    cover: props.item.cover || '',
    is_wishlist: !!props.item.is_wishlist
  };
  isEditing.value = true;
}

async function saveChanges() {
  saving.value = true;

  try {
    const updatedData = {
      title: form.value.title.trim(),
      artist: form.value.artist.trim(),
      year: form.value.year ? form.value.year.toString().trim() : null,
      type: form.value.type,
      cover: form.value.cover.trim(),
      is_wishlist: form.value.is_wishlist
    };

    // 1. Mise à jour dans Supabase
    const { error } = await supabase
      .from('vinyls')
      .update(updatedData)
      .eq('id', props.item.id);

    if (error) throw error;

    // 2. Mise à jour dans le store Pinia local
    Object.assign(props.item, updatedData);
    
    // Mettre à jour le cache local
    const userId = collectionStore.user?.id;
    if (userId) {
      localStorage.setItem(`culture_vault_cache_${userId}`, JSON.stringify(collectionStore.items));
    }

    isEditing.value = false;
  } catch (err) {
    alert("Erreur lors de la modification : " + err.message);
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
/* Mode Carte (Grille) */
.vinyl-card {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
}

.vinyl-card.is-wishlist {
  border-color: #f59e0b;
}

.cover-img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  background: #09090b;
}

.card-body {
  padding: 10px;
  text-align: left;
}

.album-title {
  font-weight: 700;
  font-size: 0.85rem;
  color: #fff;
  margin-top: 4px;
  line-height: 1.2;
}

.artist-name {
  font-size: 0.75rem;
  color: #a1a1aa;
}

.type-tag, .tag-wishlist {
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 8px;
  font-weight: 600;
  display: inline-block;
}

.type-tag {
  background: #27272a;
  color: #60a5fa;
}

.tag-wishlist {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
}

.card-actions {
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  gap: 4px;
}

.btn-card-action {
  background: rgba(0, 0, 0, 0.75);
  border: none;
  color: #fff;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  cursor: pointer;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-delete:hover {
  background: rgba(239, 68, 68, 0.9);
}

/* Mode Ligne (Liste) */
.vinyl-card.list-view {
  flex-direction: row;
  align-items: center;
  padding: 8px 12px;
}

.vinyl-card.list-view .cover-img {
  width: 44px;
  height: 44px;
  border-radius: 6px;
}

.vinyl-card.list-view .card-body {
  padding: 0 10px;
  flex: 1;
}

.vinyl-card.list-view .card-actions {
  position: static;
}

/* Formulaire d'édition dans la Modale */
.edit-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
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

.form-row {
  display: flex;
  gap: 8px;
}

.form-row .form-group {
  flex: 1;
}

.form-checkbox label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  cursor: pointer;
  color: #fbbf24;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}
</style>