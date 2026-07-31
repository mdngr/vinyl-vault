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
      @click="$emit('action')"
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
  activeTypeFilter: { type: String, default: 'all' }
});

defineEmits(['action']);

const config = computed(() => {
  // 1. Recherche sans résultat
  if (props.searchQuery) {
    return {
      emoji: '🔍',
      title: 'Aucun résultat trouvé',
      description: `Impossible de trouver "${props.searchQuery}". Essaie avec un autre mot-clé ou ajoute cette œuvre à ta bibliothèque.`,
      actionLabel: 'Ajouter cette œuvre ➕'
    };
  }

  // 2. Wishlist vide
  if (props.showWishlistOnly) {
    return {
      emoji: '✨',
      title: 'Ta wishlist est vide',
      description: 'Repère des vinyles, livres ou films qui te font envie et ajoute-les ici pour garder une trace de tes futures pépites.',
      actionLabel: 'Chercher des idées 💡'
    };
  }

  // 3. Catégorie spécifique vide (ex: Vinyles)
  if (props.activeTypeFilter !== 'all') {
    const labels = { vinyl: 'vinyle', book: 'livre', movie: 'film' };
    const label = labels[props.activeTypeFilter] || 'élément';
    return {
      emoji: '📦',
      title: `Aucun ${label} pour le moment`,
      description: `Tu n'as pas encore ajouté de ${label} dans ta collection.`,
      actionLabel: `Ajouter un ${label} ➕`
    };
  }

  // 4. Collection totalement vide (Premier lancement)
  return {
    emoji: '🏛️',
    title: 'Bienvenue dans ta voûte culturelle !',
    description: 'Ton espace est encore vierge. Commence à répertorier tes vinyles, livres et films préférés en scannant leur code-barres ou par recherche.',
    actionLabel: 'Ajouter ma première œuvre 🚀'
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
  padding: 10px 20px;
  font-weight: 600;
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.3);
}
</style>