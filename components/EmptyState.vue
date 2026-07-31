<template>
  <div class="empty-state-card">
    <div class="icon-wrapper">
      <span class="emoji">{{ config.emoji }}</span>
    </div>

    <h3 class="title">{{ config.title }}</h3>
    <p class="description">{{ config.description }}</p>

    <button 
      v-if="config.actionLabel" 
      class="btn btn-primary btn-action" 
      @click="$emit('action', config.actionType)"
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
  // Nombre total d'éléments de l'utilisateur (sans aucun filtre appliqué)
  totalItemsCount: { type: Number, default: 0 }
});

defineEmits(['action']);

const config = computed(() => {
  // 1. Recherche par mot-clé sans résultat
  if (props.searchQuery) {
    return {
      emoji: '🔍',
      title: 'Aucun résultat trouvé',
      description: `Impossible de trouver "${props.searchQuery}". Essaie avec d'autres termes ou ajoute cette œuvre à ta médiathèque.`,
      actionLabel: 'Ajouter cette œuvre ➕',
      actionType: 'add'
    };
  }

  // 2. Wishlist vide (alors qu'il y a déjà de la musique/des livres/films en collection)
  if (props.showWishlistOnly) {
    return {
      emoji: '✨',
      title: 'Ta wishlist est vide',
      description: 'Repère des vinyles, livres ou films qui te font envie et ajoute-les ici pour garder une trace de tes futures pépites.',
      actionLabel: 'Rechercher une pépite 💡',
      actionType: 'search'
    };
  }

  // 3. Catégorie spécifique vide mais la collection globale contient des choses (ex: possède des vinyles mais aucun livre)
  if (props.activeTypeFilter !== 'all' && props.totalItemsCount > 0) {
    const labels = { vinyl: 'œuvre musicale', book: 'livre', movie: 'film' };
    const label = labels[props.activeTypeFilter] || 'élément';
    return {
      emoji: '📦',
      title: `Aucun ${label} dans ta collection`,
      description: `Tu n'as pas encore répertorié de ${label}. Clique ci-dessous pour enrichir cette section.`,
      actionLabel: `Ajouter un ${label} ➕`,
      actionType: 'add'
    };
  }

  // 4. PREMIER LANCEMENT : La collection est 100% vierge
  if (props.totalItemsCount === 0) {
    return {
      emoji: '🏛️',
      title: 'Bienvenue dans ta voûte culturelle !',
      description: 'Ton espace est encore vide. Scanne le code-barres de ton premier vinyle, livre ou film, ou cherche-le par son nom.',
      actionLabel: 'Ajouter ma première œuvre 🚀',
      actionType: 'add'
    };
  }

  // 5. Cas général par défaut (ex: combinaison de filtres sans résultat)
  return {
    emoji: '⚙️',
    title: 'Aucun élément ne correspond',
    description: 'Ajuste tes filtres de recherche pour afficher les éléments de ta collection.',
    actionLabel: 'Réinitialiser les filtres 🔄',
    actionType: 'reset_filters'
  };
});
</script>

<style scoped>
.empty-state-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 20px;
  margin: 20px 0;
  background: #18181b;
  border: 1px dashed #3f3f46;
  border-radius: 16px;
}

.icon-wrapper {
  width: 72px;
  height: 72px;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.emoji {
  font-size: 2.2rem;
}

.title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 8px;
}

.description {
  font-size: 0.85rem;
  color: #a1a1aa;
  max-width: 320px;
  line-height: 1.4;
  margin-bottom: 20px;
}

.btn-action {
  padding: 12px 20px;
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