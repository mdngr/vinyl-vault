<template>
  <div class="empty-state-card">
    <div class="icon-wrapper">
      <span class="emoji">{{ config.emoji }}</span>
    </div>

    <h3 class="title">{{ config.title }}</h3>
    <p class="description">{{ config.description }}</p>

    <!-- Puces d'avantages (Cliquables vers /search) -->
    <div v-if="isNewUser" class="quick-features">
      <button class="feature-chip" @click="goToSearch">📷 Scan EAN/ISBN</button>
      <button class="feature-chip" @click="goToSearch">✨ Wishlist</button>
      <button class="feature-chip" @click="goToSearch">🎲 Lucky Pick</button>
    </div>
    <br />
    <!-- Bouton principal de redirection vers la recherche -->
    <button 
      v-if="config.actionLabel" 
      class="btn btn-primary btn-action" 
      @click="handleAction"
    >
      {{ config.actionLabel }}
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  showWishlistOnly: { type: Boolean, default: false },
  searchQuery: { type: String, default: '' },
  activeTypeFilter: { type: String, default: 'all' },
  totalItemsCount: { type: Number, default: 0 }
});

const emit = defineEmits(['action']);

const isNewUser = computed(() => {
  return props.totalItemsCount === 0 && !props.searchQuery;
});

const config = computed(() => {
  // 1. Recherche sans résultat
  if (props.searchQuery) {
    return {
      emoji: '🔍',
      title: 'Aucun résultat trouvé',
      description: `Impossible de trouver "${props.searchQuery}". Essaie avec d'autres termes ou ajoute cette œuvre.`,
      actionLabel: 'Ajouter une œuvre ➕'
    };
  }

  // 2. Wishlist vide
  if (props.showWishlistOnly) {
    return {
      emoji: '✨',
      title: 'Ta wishlist est vide',
      description: 'Garde une trace des vinyles, livres ou films que tu souhaites acquérir.',
      actionLabel: 'Rechercher une pépite 💡'
    };
  }

  // 3. Catégorie spécifique vide
  if (props.activeTypeFilter !== 'all' && props.totalItemsCount > 0) {
    const labels = { vinyl: 'œuvre musicale', book: 'livre', movie: 'film' };
    const label = labels[props.activeTypeFilter] || 'élément';
    return {
      emoji: '📦',
      title: `Aucun ${label} dans ta collection`,
      description: `Tu n'as pas encore répertorié de ${label}.`,
      actionLabel: `Ajouter un ${label} ➕`
    };
  }

  // 4. Premier lancement (Nouvel utilisateur)
  if (props.totalItemsCount === 0) {
    return {
      emoji: '🏛️',
      title: 'Bienvenue dans ta voûte culturelle !',
      description: 'Ton espace est encore vide. Commence à cataloguer tes vinyles, livres et films préférés.',
      actionLabel: 'Ajouter ma première œuvre 🚀'
    };
  }

  // 5. Cas par défaut
  return {
    emoji: '⚙️',
    title: 'Aucun élément ne correspond',
    description: 'Ajuste tes filtres de recherche pour afficher tes œuvres.',
    actionLabel: 'Chercher une œuvre 🔍'
  };
});

function goToSearch() {
  emit('action', 'search');
  navigateTo('/search');
}

function handleAction() {
  goToSearch();
}
</script>

<style scoped>
.empty-state-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 32px 20px;
  margin: 16px 0;
  background: #18181b;
  border: 1px dashed #3f3f46;
  border-radius: 16px;
}

.icon-wrapper {
  width: 60px;
  height: 60px;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.emoji {
  font-size: 1.8rem;
}

.title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 6px;
}

.description {
  font-size: 0.85rem;
  color: #a1a1aa;
  max-width: 360px;
  line-height: 1.4;
  margin: 0;
}

/* Puces d'avantages compactes et interactives */
.quick-features {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin: 16px 0 20px 0;
}

.feature-chip {
  background: #09090b;
  border: 1px solid #27272a;
  color: #e4e4e7;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.feature-chip:hover {
  background: #27272a;
  border-color: #3b82f6;
  color: #ffffff;
}

.btn-action {
  margin-top: 20px;
  padding: 10px 20px;
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: 10px;
  background: #3b82f6;
  color: #ffffff;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.3);
  transition: background-color 0.2s ease;
}

.btn-action:hover {
  background: #2563eb;
}
</style>