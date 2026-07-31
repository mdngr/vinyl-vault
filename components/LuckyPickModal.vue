<template>
  <!-- Mode Modale Desktop -->
  <div v-if="isOpen && !isMobile" class="modal-overlay" @click.self="closeModal">
    <div class="modal-card">
      <button class="btn-close" @click="closeModal">✕</button>

      <div class="modal-header">
        <span class="modal-icon">🎲</span>
        <h3>Tirage au sort</h3>
        <p class="modal-subtitle">Laisse le hasard choisir ce que tu vas écouter, lire ou regarder !</p>
      </div>

      <div v-if="!hasItems" class="empty-pick">
        <p>Aucune œuvre ne correspond à tes filtres actuels dans la collection.</p>
      </div>

      <div v-else class="pick-content">
        <div class="pick-card" :class="{ 'is-spinning': isSpinning }">
          <div class="cover-wrapper">
            <img 
              :src="selectedItem?.cover || defaultCover" 
              :alt="selectedItem?.title" 
              class="pick-cover" 
            />
          </div>

          <div class="pick-details">
            <h4 class="pick-title">{{ selectedItem?.title || '...' }}</h4>
            <p class="pick-artist">{{ selectedItem?.artist }} {{ selectedItem?.year ? `(${selectedItem.year})` : '' }}</p>
            
            <div class="pick-badges" v-if="selectedItem">
              <span class="badge badge-type">{{ getTypeLabel(selectedItem.type) }}</span>
              <span v-if="getFormatText(selectedItem)" class="badge badge-format">
                {{ getFormatText(selectedItem) }}
              </span>
            </div>
          </div>
        </div>

        <div class="pick-actions">
          <button class="btn btn-primary btn-roll" :disabled="isSpinning" @click="roll">
            {{ isSpinning ? 'Tirage en cours...' : '🎲 Relancer un tirage' }}
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Mode Page Plein Écran Mobile -->
  <div v-else class="mobile-lucky-container">
    <div class="modal-header">
      <span class="modal-icon">🎲</span>
      <p class="modal-subtitle">Laisse le hasard choisir ce que tu vas écouter, lire ou regarder !</p>
    </div>

    <div v-if="!hasItems" class="empty-pick">
      <p>Aucune œuvre ne correspond à tes filtres actuels dans la collection.</p>
    </div>

    <div v-else class="pick-content">
      <div class="pick-card" :class="{ 'is-spinning': isSpinning }">
        <div class="cover-wrapper">
          <img 
            :src="selectedItem?.cover || defaultCover" 
            :alt="selectedItem?.title" 
            class="pick-cover" 
          />
        </div>

        <div class="pick-details">
          <h4 class="pick-title">{{ selectedItem?.title || '...' }}</h4>
          <p class="pick-artist">{{ selectedItem?.artist }} {{ selectedItem?.year ? `(${selectedItem.year})` : '' }}</p>
          
          <div class="pick-badges" v-if="selectedItem">
            <span class="badge badge-type">{{ getTypeLabel(selectedItem.type) }}</span>
            <span v-if="getFormatText(selectedItem)" class="badge badge-format">
              {{ getFormatText(selectedItem) }}
            </span>
          </div>
        </div>
      </div>

      <div class="pick-actions">
        <button class="btn btn-primary btn-roll" :disabled="isSpinning" @click="roll">
          {{ isSpinning ? 'Tirage en cours...' : '🎲 Relancer un tirage' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useCollectionStore } from '../stores/collection';
import { getFormatLabel } from '../constants/formats';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  isMobile: { type: Boolean, default: false }
});

const emit = defineEmits(['close']);

const collectionStore = useCollectionStore();
const defaultCover = 'https://via.placeholder.com/200x300/2a2a2a/ffffff?text=Pas+d%27image';

const selectedItem = ref(null);
const isSpinning = ref(false);

// Filtrer uniquement les éléments de la collection (exclure la Wishlist)
const availableItems = computed(() => {
  return collectionStore.filteredItems.filter(item => !item.is_wishlist);
});

const hasItems = computed(() => availableItems.value.length > 0);

function getTypeLabel(type) {
  const map = { vinyl: '🎵 Musique', book: '📚 Livre', movie: '🎬 Film' };
  return map[type] || 'Œuvre';
}

function getFormatText(item) {
  if (!item?.format) return null;
  return getFormatLabel(item.type, item.format);
}

// Animation de roulette / tirage au sort
function roll() {
  if (!hasItems.value) return;

  isSpinning.value = true;
  let counter = 0;
  const maxSteps = 15;
  const intervalTime = 70;

  const timer = setInterval(() => {
    const randomIndex = Math.floor(Math.random() * availableItems.value.length);
    selectedItem.value = availableItems.value[randomIndex];
    counter++;

    if (counter >= maxSteps) {
      clearInterval(timer);
      isSpinning.value = false;
    }
  }, intervalTime);
}

function closeModal() {
  emit('close');
}

// Lancer le tirage automatiquement au montage
onMounted(() => {
  if (hasItems.value) {
    roll();
  }
});

// Écouter l'ouverture de la modale sur Desktop
watch(() => props.isOpen, (newVal) => {
  if (newVal && hasItems.value) {
    roll();
  }
});
</script>

<style scoped>
/* MODALE DESKTOP */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 3000;
  padding: 16px;
}

.modal-card {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 20px;
  padding: 24px;
  width: 100%;
  max-width: 380px;
  position: relative;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
}

.btn-close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: transparent;
  border: none;
  color: #a1a1aa;
  font-size: 1.2rem;
  cursor: pointer;
}

/* CONTAINER MOBILE PLEIN ÉCRAN */
.mobile-lucky-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  text-align: center;
}

.modal-header {
  margin-bottom: 16px;
}

.modal-icon {
  font-size: 2.2rem;
  display: block;
  margin-bottom: 4px;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.2rem;
  color: #fff;
}

.modal-subtitle {
  font-size: 0.75rem;
  color: #a1a1aa;
  margin-top: 4px;
}

.pick-card {
  background: #09090b;
  border: 1px solid #27272a;
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  transition: transform 0.1s ease;
  width: 100%;
}

.pick-card.is-spinning {
  opacity: 0.7;
  transform: scale(0.98);
}

.cover-wrapper {
  width: 160px;
  height: 160px;
  border-radius: 10px;
  overflow: hidden;
  background: #18181b;
}

.pick-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pick-details {
  width: 100%;
}

.pick-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pick-artist {
  margin: 4px 0 0 0;
  font-size: 0.8rem;
  color: #a1a1aa;
}

.pick-badges {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 8px;
}

.badge {
  font-size: 0.65rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
}

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

.pick-actions {
  margin-top: 20px;
  width: 100%;
}

.btn-roll {
  width: 100%;
  padding: 12px;
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
}

.btn-roll:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.empty-pick {
  padding: 20px 0;
  color: #a1a1aa;
  font-size: 0.85rem;
}
</style>