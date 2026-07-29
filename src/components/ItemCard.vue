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

    <div class="card-actions">
      <button class="btn-card-action" @click="$emit('delete', item.id)" title="Supprimer">✕</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  item: { type: Object, required: true },
  isListView: { type: Boolean, default: false }
});

defineEmits(['delete']);

const defaultCover = 'https://via.placeholder.com/200x300/2a2a2a/ffffff?text=Pas+d%27image';

const typeBadge = computed(() => {
  const icons = { vinyl: '💿 Vinyle', book: '📚 Livre', movie: '🎬 DVD' };
  return icons[props.item.type] || 'Œuvre';
});

function handleImgError(e) {
  e.target.src = defaultCover;
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
  padding: 12px;
  text-align: left;
}

.album-title {
  font-weight: 700;
  font-size: 0.9rem;
  color: #fff;
  margin-top: 4px;
}

.artist-name {
  font-size: 0.8rem;
  color: #a1a1aa;
}

.type-tag, .tag-wishlist {
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 10px;
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
  top: 8px;
  right: 8px;
}

.btn-card-action {
  background: rgba(0, 0, 0, 0.7);
  border: none;
  color: #fff;
  border-radius: 50%;
  width: 26px;
  height: 26px;
  cursor: pointer;
}

/* Mode Ligne (Liste) */
.vinyl-card.list-view {
  flex-direction: row;
  align-items: center;
  padding: 8px 12px;
}

.vinyl-card.list-view .cover-img {
  width: 48px;
  height: 48px;
  border-radius: 6px;
}

.vinyl-card.list-view .card-body {
  padding: 0 12px;
  flex: 1;
}

.vinyl-card.list-view .card-actions {
  position: static;
}
</style>