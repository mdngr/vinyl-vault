import { defineStore } from 'pinia';
import { supabase } from '../services/supabase';
import { useAuthStore } from './auth';

export const useCollectionStore = defineStore('collection', {
  state: () => ({
    items: [],
    loading: false,
    activeTypeFilter: 'all',
    showWishlistOnly: false,
    currentViewMode: 'grid',
    searchQuery: '',
    // 🔽 Nouveaux états pour le tri
    sortBy: 'title', // 'title', 'artist', 'year'
    sortOrder: 'asc'  // 'asc', 'desc'
  }),

  getters: {
    filteredItems(state) {
      const query = state.searchQuery.toLowerCase().trim();

      // 1. Filtrage
      let result = state.items.filter(item => {
        const matchesStatus = state.showWishlistOnly ? !!item.is_wishlist : !item.is_wishlist;
        const matchesType = state.activeTypeFilter === 'all' || item.type === state.activeTypeFilter;
        const matchesText = !query || 
          (item.title && item.title.toLowerCase().includes(query)) ||
          (item.artist && item.artist.toLowerCase().includes(query));

        return matchesStatus && matchesType && matchesText;
      });

      // 2. Tri dynamique
      return result.sort((a, b) => {
        let valA = a[state.sortBy] || '';
        let valB = b[state.sortBy] || '';

        // Si on trie par année, on convertit en nombre
        if (state.sortBy === 'year') {
          valA = parseInt(valA, 10) || 0;
          valB = parseInt(valB, 10) || 0;
        } else {
          valA = valA.toString().toLowerCase();
          valB = valB.toString().toLowerCase();
        }

        let comparison = 0;
        if (valA > valB) comparison = 1;
        if (valA < valB) comparison = -1;

        return state.sortOrder === 'asc' ? comparison : -comparison;
      });
    },

    stats(state) {
      const items = this.filteredItems;
      const count = items.length;

      if (count === 0) {
        return '0 élément';
      }

      // Helper pour accorder automatiquement au singulier/pluriel
      const pluralize = (nb, singular, plural = singular + 's') => {
        return `${nb} ${nb > 1 ? plural : singular}`;
      };

      const status = state.showWishlistOnly ? 'en wishlist' : 'en collection';

      // Si un type spécifique est filtré (Vinyle, Livre, Film)
      if (state.activeTypeFilter === 'vinyl') {
        return `${pluralize(count, 'vinyle')} ${status}`;
      }

      if (state.activeTypeFilter === 'book') {
        return `${pluralize(count, 'livre')} ${status}`;
      }

      if (state.activeTypeFilter === 'movie') {
        return `${pluralize(count, 'film')} ${status}`;
      }

      // Si l'onglet "Tout" est sélectionné
      return `${pluralize(count, 'œuvre')} ${status}`;
    }
  },

  actions: {
    async fetchItems() {
      const authStore = useAuthStore();
      if (!authStore.user) {
        this.items = [];
        return;
      }

      const userId = authStore.user.id;
      const cacheKey = `culture_vault_cache_${userId}`;
      this.loading = true;

      // 1. Restauration immédiate du cache local de l'utilisateur
      const localCache = localStorage.getItem(cacheKey);
      if (localCache) {
        try {
          this.items = JSON.parse(localCache);
        } catch (e) {
          this.items = [];
        }
      }

      // 2. Fetch Supabase isolé
      try {
        const { data, error } = await supabase
          .from('vinyls')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          if (authStore.user && authStore.user.id === userId) {
            this.items = data.map(i => ({
              id: i.id,
              title: i.title,
              artist: i.artist,
              year: i.year,
              genre: i.genre,
              cover: i.cover,
              type: i.type || 'vinyl',
              is_wishlist: !!i.is_wishlist
            }));

            localStorage.setItem(cacheKey, JSON.stringify(this.items));
          }
        }
      } catch (err) {
        console.warn("Mode hors-ligne : utilisation du cache local.");
      } finally {
        this.loading = false;
      }
    },

    async addItem(item) {
      const authStore = useAuthStore();
      if (!authStore.user) return;

      const itemToInsert = {
        id: item.id || Date.now(),
        title: item.title,
        artist: item.artist,
        year: item.year,
        genre: item.genre,
        cover: item.cover,
        type: item.type,
        is_wishlist: item.is_wishlist || false,
        user_id: authStore.user.id
      };

      const { error } = await supabase.from('vinyls').insert([itemToInsert]);
      if (error) throw error;

      this.items.unshift(itemToInsert);
      localStorage.setItem(`culture_vault_cache_${authStore.user.id}`, JSON.stringify(this.items));
    },

    async deleteItem(id) {
      const authStore = useAuthStore();
      if (!authStore.user) return;

      const { error } = await supabase.from('vinyls').delete().eq('id', id);
      if (error) throw error;

      this.items = this.items.filter(i => i.id !== id);
      localStorage.setItem(`culture_vault_cache_${authStore.user.id}`, JSON.stringify(this.items));
    },

    clearMemory() {
      this.items = [];
    }
  }
});