<template>
  <div class="public-collection-page">
    <header class="public-header">
      <div class="header-titles">
        <h2>Collection Partagée</h2>
        <p class="stats-text">{{ items.length }} œuvre(s)</p>
      </div>
      
      <button class="btn btn-secondary" @click="$router.push('/')">
        🏠 Accueil
      </button>
    </header>

    <!-- BARRE DE FILTRES SIMPLIFIÉE -->
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

    <!-- ÉTATS DE CHARGEMENT / VIDE -->
    <div v-if="loading" class="loading-state">
      <p>Chargement de la collection...</p>
    </div>

    <div v-else-if="filteredItems.length === 0" class="empty-state">
      <p>Aucune œuvre trouvée dans cette collection.</p>
    </div>

    <!-- GRILLE D'ŒUVRES (LECTURE SEULE) -->
    <div v-else class="items-container grid-view">
      <ItemCard 
        v-for="item in filteredItems" 
        :key="item.id" 
        :item="item" 
        :is-readonly="true" 
      />
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

onMounted(async () => {
  try {
    const { data, error } = await supabase
      .from('vinyls')
      .select('*')
      .eq('user_id', userId)
      .eq('is_wishlist', false) // Exclut la wishlist par défaut
      .order('created_at', { ascending: false });

    if (error) throw error;
    items.value = data || [];
  } catch (err) {
    console.error("Erreur lors du chargement :", err.message);
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

.public-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #27272a;
}

.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.input-search {
  flex: 1;
  background: #18181b;
  border: 1px solid #27272a;
  color: #fff;
  padding: 8px 12px;
  border-radius: 8px;
}

.items-container.grid-view {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 14px;
}
</style>