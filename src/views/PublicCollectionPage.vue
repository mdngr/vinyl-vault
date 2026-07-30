<template>
  <div class="public-collection-page">
    <header class="public-header">
      <div class="header-titles">
        <h2>Collection Partagée</h2>
        <p class="stats-text">{{ items.length }} œuvre(s)</p>
      </div>
      
      <button class="btn btn-primary" @click="$router.push('/login')">
        Créer ma médiathèque
      </button>
    </header>

    <!-- BARRE DE FILTRES -->
    <div class="toolbar">
      <input 
        v-model="searchQuery" 
        type="text" 
        placeholder="🔍 Rechercher dans cette collection..." 
        class="input-search"
      />

      <select v-model="activeFilter" class="select-chip">
        <option value="all">📂 Tout</option>
        <option value="vinyl">🎵 Musique</option>
        <option value="book">📚 Livres</option>
        <option value="movie">🎬 Films</option>
      </select>
    </div>

    <!-- GRILLE D'ŒUVRES -->
    <div v-if="loading" class="loading-state">
      <p>Chargement de la collection...</p>
    </div>

    <div v-else-if="filteredItems.length === 0" class="empty-state">
      <p>Aucune œuvre trouvée.</p>
    </div>

    <div v-else class="items-container grid-view">
      <!-- Clic sur une carte -> Ouverture de la modale -->
      <div 
        v-for="item in filteredItems" 
        :key="item.id" 
        class="card-wrapper"
        @click="isAuthModalOpen = true"
      >
        <ItemCard 
          :item="item" 
          :is-readonly="true" 
        />
      </div>
    </div>

    <!-- 🎁 MODALE INCITATIVE DE CRÉATION DE COMPTE -->
    <div v-if="isAuthModalOpen" class="modal-overlay" @click.self="isAuthModalOpen = false">
      <div class="modal-content auth-modal">
        <button class="btn-close" @click="isAuthModalOpen = false">✕</button>
        
        <div class="modal-body">
          <span class="modal-icon">📚✨</span>
          <h3>Créez votre propre médiathèque !</h3>
          <p>Rejoignez-nous pour cataloguer vos vinyles, livres et films, gérer votre wishlist et partager votre collection.</p>
          
          <div class="modal-actions">
            <button class="btn btn-primary btn-full" @click="$router.push('/login')">
              🚀 Créer mon compte gratuitement
            </button>
            <button class="btn btn-secondary btn-full" @click="isAuthModalOpen = false">
              Continuer la visite
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { supabase } from '../services/supabase';
import ItemCard from '../components/ItemCard.vue';

const route = useRoute();
const userId = route.params.userId;

const items = ref([]);
const loading = ref(true);
const searchQuery = ref('');
const activeFilter = ref('all');
const isAuthModalOpen = ref(false);

onMounted(async () => {
  try {
    loading.value = true;
    const { data, error } = await supabase
      .from('collection') // ⚠️ Ajuste selon le nom exact de ta table
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    items.value = (data || []).filter(item => !item.is_wishlist);
  } catch (err) {
    console.error("Erreur :", err.message);
  } finally {
    loading.value = false;
  }
});

const filteredItems = computed(() => {
  return items.value.filter(item => {
    const matchFilter = activeFilter.value === 'all' || item.type === activeFilter.value;
    const matchQuery = !searchQuery.value || 
      item.title?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      item.artist?.toLowerCase().includes(searchQuery.value.toLowerCase());
    
    return matchFilter && matchQuery;
  });
});
</script>

<style scoped>
.public-collection-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  padding-top: max(16px, env(safe-area-inset-top));
}

.card-wrapper {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.card-wrapper:hover {
  transform: translateY(-2px);
}

.items-container.grid-view {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 14px;
}

/* STYLES DE LA MODALE INCITATIVE */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  padding: 16px;
}

.auth-modal {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 16px;
  padding: 28px 24px;
  max-width: 400px;
  width: 100%;
  position: relative;
  text-align: center;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
}

.btn-close {
  position: absolute;
  top: 12px;
  right: 12px;
  background: transparent;
  border: none;
  color: #71717a;
  font-size: 1.1rem;
  cursor: pointer;
}

.modal-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 12px;
}

.modal-body h3 {
  color: #fff;
  font-size: 1.3rem;
  margin-bottom: 8px;
}

.modal-body p {
  color: #a1a1aa;
  font-size: 0.9rem;
  line-height: 1.5;
  margin-bottom: 24px;
}

.modal-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.btn-full {
  width: 100%;
  padding: 12px;
  font-size: 0.9rem;
}
</style>