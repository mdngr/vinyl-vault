<template>
  <div class="public-collection-page">
    <header class="public-header">
      <div class="header-titles">
        <h2>Collection Partagée {{ ownerName ? `de ${ownerName}` : '' }}</h2>
        <p class="stats-text">{{ items.length }} œuvre(s)</p>
      </div>
      
      <div class="header-actions">
        <button class="btn btn-primary" @click="isAuthModalOpen = true">
          🚀 Créer ma médiathèque
        </button>
        <button class="btn btn-secondary" @click="navigateTo('/')">
          🏠 Accueil
        </button>
      </div>
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
            <button class="btn btn-primary btn-full" @click="navigateTo('/')">
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
import ItemCard from '~/components/ItemCard.vue';

const route = useRoute();
const { $supabase } = useNuxtApp();
const userId = route.params.id;

const items = ref([]);
const ownerProfile = ref(null);
const loading = ref(true);
const searchQuery = ref('');
const activeFilter = ref('all');
const isAuthModalOpen = ref(false);

const ownerName = computed(() => {
  if (!ownerProfile.value) return '';
  const first = ownerProfile.value.first_name || '';
  const last = ownerProfile.value.last_name || '';
  return `${first} ${last}`.trim();
});

useHead({
  title: computed(() => ownerName.value ? `Collection de ${ownerName.value} - Culture Vault` : 'Collection partagée - Culture Vault'),
  meta: [
    { name: 'description', content: 'Découvrez cette collection partagée de vinyles, livres et films sur Culture Vault.' }
  ]
});

onMounted(async () => {
  try {
    loading.value = true;
    
    // Fetch des œuvres du profil partagé
    const { data: vinylsData, error: vinylsError } = await $supabase
      .from('vinyls')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (vinylsError) throw vinylsError;

    // Fetch des infos utilisateur (Profil)
    const { data: profileData } = await $supabase
      .from('profiles')
      .select('first_name, last_name, city')
      .eq('id', userId)
      .maybeSingle();

    if (profileData) {
      ownerProfile.value = profileData;
    }

    // Exclure la wishlist pour le mode public
    items.value = (vinylsData || []).filter(item => !item.is_wishlist);
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

.header-titles h2 {
  margin: 0;
  color: #fff;
  font-size: 1.5rem;
}

.stats-text {
  margin: 4px 0 0 0;
  font-size: 0.85rem;
  color: #a1a1aa;
}

.header-actions {
  display: flex;
  gap: 10px;
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
  outline: none;
}

.input-search:focus {
  border-color: #3b82f6;
}

.select-chip {
  background: #18181b;
  border: 1px solid #27272a;
  color: #a1a1aa;
  padding: 8px 12px;
  border-radius: 8px;
  outline: none;
}

.items-container.grid-view {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 14px;
}

.card-wrapper {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.card-wrapper:hover {
  transform: translateY(-2px);
}

/* STYLES DE LA MODALE INCITATIVE */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
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
  font-size: 2.8rem;
  display: block;
  margin-bottom: 12px;
}

.modal-body h3 {
  color: #fff;
  font-size: 1.25rem;
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

.btn-primary {
  background: #3b82f6;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 8px 14px;
  font-weight: 600;
  cursor: pointer;
}

.btn-secondary {
  background: #27272a;
  color: #ffffff;
  border: 1px solid #3f3f46;
  border-radius: 8px;
  padding: 8px 14px;
  font-weight: 600;
  cursor: pointer;
}

.loading-state, .empty-state {
  text-align: center;
  padding: 40px;
  color: #a1a1aa;
}

@media (max-width: 768px) {
  .public-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  
  .header-actions {
    width: 100%;
  }

  .header-actions .btn {
    flex: 1;
    text-align: center;
  }
}
</style>