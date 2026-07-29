<template>
  <div class="vinyl-card" :class="{ 'is-wishlist': item.is_wishlist }">
    <div class="card-actions">
      <button class="btn-card-action" @click="$emit('edit', item.id)" title="Modifier">✏️</button>
      <button class="btn-card-action" @click="$emit('delete', item.id)" title="Supprimer">✕</button>
    </div>

    <img 
      class="cover-img" 
      :src="item.cover || defaultCover" 
      :alt="item.title" 
      loading="lazy" 
      @error="handleImgError"
    />

    <div class="card-body">
      <span v-if="item.is_wishlist" class="tag-wishlist">✨ Wishlist</span>
      <span v-else class="type-tag">{{ typeBadge }}</span>

      <div class="album-title">{{ item.title }}</div>
      <div class="artist-name">{{ item.artist }} {{ item.year ? `(${item.year})` : '' }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  item: { type: Object, required: true }
});

defineEmits(['edit', 'delete']);

const defaultCover = 'https://via.placeholder.com/200x300/2a2a2a/ffffff?text=Pas+d%27image';

const typeBadge = computed(() => {
  const icons = { vinyl: '💿 Vinyle', book: '📚 Livre / BD', movie: '🎬 DVD' };
  return icons[props.item.type] || 'Œuvre';
});

function handleImgError(e) {
  e.target.src = defaultCover;
}
</script>

<style scoped>
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
  font-size: 0.95rem;
  color: #fff;
  margin-top: 4px;
}

.artist-name {
  font-size: 0.85rem;
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
  display: flex;
  gap: 4px;
}

.btn-card-action {
  background: rgba(0, 0, 0, 0.7);
  border: none;
  color: #fff;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  cursor: pointer;
}
</style>