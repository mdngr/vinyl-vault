<template>
  <div 
    class="item-card" 
    :class="{ 'is-list': isListView, 'is-wishlist': item.is_wishlist }"
    @click="goToDetail"
  >
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

      <!-- Badges : Type + Format + Spécificité Collectionneur -->
      <div class="tags-row">
        <span class="badge badge-type">{{ typeLabel }}</span>
        <span v-if="formatLabel" class="badge badge-format">{{ formatLabel }}</span>
        
        <!-- 🔍 BADGE : S'affiche dès qu'AU MOINS UNE info collectionneur existe -->
        <span 
          v-if="hasCollectorData" 
          class="badge badge-collector-indicator" 
          :title="collectorSummary"
        >
          🔍 {{ collectorBadgeLabel }}
        </span>
      </div>

      <!-- ⭐️ RATING RÉDUIT -->
      <div v-if="item.rating && item.rating > 0" class="mini-rating" title="Note attribuée">
        <span class="stars-text">{{ '★'.repeat(item.rating) }}</span>
        <span class="rating-num">{{ item.rating }}/5</span>
      </div>

      <!-- 🛒 BOUTON D'AFFILIATION (Wishlist uniquement) -->
      <div v-if="item.is_wishlist" class="affiliate-wrapper">
        <a 
          :href="affiliateUrl" 
          target="_blank" 
          rel="noopener sponsored" 
          class="btn-affiliate"
          title="Trouver au meilleur prix"
          @click.stop
        >
          🛒 Acheter ({{ merchantName }})
        </a>
      </div>
    </div>

    <!-- Actions de carte -->
    <div v-if="!isReadonly" class="card-actions">
      <button class="btn-action btn-delete" @click.stop="$emit('delete', item.id)" title="Supprimer">🗑️</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { getFormatLabel } from '~/constants/formats';

const props = defineProps({
  item: { type: Object, required: true },
  isListView: { type: Boolean, default: false },
  isReadonly: { type: Boolean, default: false }
});

defineEmits(['delete']);

const defaultCover = 'https://via.placeholder.com/200x300/2a2a2a/ffffff?text=Pas+d%27image';

function goToDetail() {
  navigateTo(`/items/${props.item.id}`);
}

const typeLabel = computed(() => {
  const map = {
    vinyl: '🎵 Musique',
    book: '📚 Livre',
    movie: '🎬 Film',
    boardgame: '🎲 Jeu',
    videogame: '🎮 Gaming'
  };
  return map[props.item.type] || 'Œuvre';
});

const formatLabel = computed(() => {
  if (!props.item.format) return null;
  return getFormatLabel(props.item.type, props.item.format);
});

// 🎯 Détecte si AU MOINS UN CHAMP de la fiche collectionneur est renseigné
const hasCollectorData = computed(() => {
  const data = props.item.collector_data;
  if (!data || typeof data !== 'object') return false;

  return Object.values(data).some(val => {
    if (Array.isArray(val)) return val.length > 0;
    return val !== null && val !== undefined && val !== '';
  });
});

// Libellé prioritaire pour le badge
const collectorBadgeLabel = computed(() => {
  const data = props.item.collector_data;
  if (!data) return 'Info';

  if (data.tags && data.tags.includes('sealed')) return 'Scellé';
  if (data.tags && data.tags.includes('cib')) return 'CIB';
  if (data.tags && data.tags.includes('autographed')) return 'Signé';

  if (data.mediaCondition) return `État ${data.mediaCondition}`;
  if (data.storageLocation) return data.storageLocation;
  if (data.purchasePrice) return `${data.purchasePrice}€`;
  if (data.limitedNumber) return 'Limité';

  return 'Info';
});

// Tooltip dynamique récapitulant tous les champs renseignés
const collectorSummary = computed(() => {
  const data = props.item.collector_data;
  if (!data) return '';

  const parts = [];
  if (data.mediaCondition) parts.push(`Médias : ${data.mediaCondition}`);
  if (data.sleeveCondition) parts.push(`Pochette/Boîte : ${data.sleeveCondition}`);
  if (data.purchasePrice) parts.push(`Prix : ${data.purchasePrice}€`);
  if (data.storageLocation) parts.push(`Emplacement : ${data.storageLocation}`);
  if (data.matrix) parts.push(`Matrice : ${data.matrix}`);
  if (data.productCode) parts.push(`Code : ${data.productCode}`);

  return parts.join(' | ') || 'Fiche renseignée';
});

const merchantName = computed(() => {
  const map = {
    book: 'Place des Libraires',
    vinyl: 'Discogs / Bandcamp',
    movie: 'Fnac / Éditeurs',
    boardgame: 'Philibert',
    videogame: 'Ebay / LBC'
  };
  return map[props.item.type] || 'Acheter';
});

const affiliateUrl = computed(() => {
  const query = encodeURIComponent(`${props.item.title || ''} ${props.item.artist || ''}`);

  if (props.item.type === 'book') {
    return `https://www.place-des-libraires.fr/listelivres.php?mots=${query}`;
  } else if (props.item.type === 'vinyl') {
    return `https://www.discogs.com/fr/search/?q=${query}`;
  } else if (props.item.type === 'boardgame') {
    return `https://www.philibertnet.com/fr/recherche?search_query=${query}`;
  } else if (props.item.type === 'videogame') {
    return `https://www.ebay.fr/sch/i.html?_nkw=${query}`;
  }

  return `https://www.fnac.com/SearchResult/ResultList.aspx?Search=${query}`;
});
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
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.item-card:hover {
  border-color: #3f3f46;
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
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
  background: rgba(0, 0, 0, 0.75);
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

.badge-collector-indicator {
  background: rgba(168, 85, 247, 0.15);
  color: #c084fc;
  border: 1px solid rgba(168, 85, 247, 0.35);
}

.mini-rating {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
}

.stars-text {
  color: #f59e0b;
  font-size: 0.75rem;
  letter-spacing: 1px;
}

.rating-num {
  font-size: 0.65rem;
  color: #71717a;
  font-weight: 600;
}

.affiliate-wrapper {
  margin-top: 6px;
}

.btn-affiliate {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.35);
  color: #fbbf24;
  padding: 5px 8px;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s ease;
}

.btn-affiliate:hover {
  background: #f59e0b;
  color: #000;
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
  transition: opacity 0.2s ease;
}

.btn-action:hover {
  opacity: 1;
}
</style>