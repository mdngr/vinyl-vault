<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-card">
      <div class="modal-header">
        <h3>Trier la collection</h3>
        <button class="btn-close" @click="$emit('close')">✕</button>
      </div>

      <div class="sort-options">
        <button 
          class="sort-option-btn" 
          :class="{ active: isCurrent('title', 'asc') }"
          @click="setSort('title', 'asc')"
        >
          <span>🔤 Titre (A-Z)</span>
          <span v-if="isCurrent('title', 'asc')">✓</span>
        </button>

        <button 
          class="sort-option-btn" 
          :class="{ active: isCurrent('title', 'desc') }"
          @click="setSort('title', 'desc')"
        >
          <span>🔤 Titre (Z-A)</span>
          <span v-if="isCurrent('title', 'desc')">✓</span>
        </button>

        <button 
          class="sort-option-btn" 
          :class="{ active: isCurrent('artist', 'asc') }"
          @click="setSort('artist', 'asc')"
        >
          <span>👤 Artiste / Auteur (A-Z)</span>
          <span v-if="isCurrent('artist', 'asc')">✓</span>
        </button>

        <button 
          class="sort-option-btn" 
          :class="{ active: isCurrent('year', 'desc') }"
          @click="setSort('year', 'desc')"
        >
          <span>📅 Année (Plus récent)</span>
          <span v-if="isCurrent('year', 'desc')">✓</span>
        </button>

        <button 
          class="sort-option-btn" 
          :class="{ active: isCurrent('year', 'asc') }"
          @click="setSort('year', 'asc')"
        >
          <span>📅 Année (Plus ancien)</span>
          <span v-if="isCurrent('year', 'asc')">✓</span>
        </button>

        <button 
          class="sort-option-btn" 
          :class="{ active: isCurrent('created_at', 'desc') }"
          @click="setSort('created_at', 'desc')"
        >
          <span>🕒 Date d'ajout (Récents)</span>
          <span v-if="isCurrent('created_at', 'desc')">✓</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useCollectionStore } from '../stores/collection';

defineProps({
  isOpen: { type: Boolean, default: false }
});

const emit = defineEmits(['close']);
const collectionStore = useCollectionStore();

function isCurrent(by, order) {
  return collectionStore.sortBy === by && collectionStore.sortOrder === order;
}

function setSort(by, order) {
  collectionStore.sortBy = by;
  collectionStore.sortOrder = order;
  emit('close');
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 3000;
  padding: 16px;
}

.modal-card {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 16px;
  padding: 20px;
  width: 100%;
  max-width: 340px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #fff;
}

.btn-close {
  background: transparent;
  border: none;
  color: #a1a1aa;
  font-size: 1.1rem;
  cursor: pointer;
}

.sort-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sort-option-btn {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #09090b;
  border: 1px solid #27272a;
  color: #a1a1aa;
  padding: 12px 14px;
  border-radius: 10px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.sort-option-btn.active {
  background: rgba(59, 130, 246, 0.15);
  border-color: #3b82f6;
  color: #60a5fa;
  font-weight: 600;
}
</style>