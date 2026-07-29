import { defineStore } from 'pinia';
import { supabase } from '../services/supabase';
import { useAuthStore } from './auth';

export const useCollectionStore = defineStore('collection', {
  state: () => ({
    items: [],
    loading: false,
    activeTypeFilter: 'all',
    currentViewMode: window.innerWidth < 768 ? 'list' : 'masonry',
    searchQuery: ''
  }),

  getters: {
    filteredItems(state) {
      const query = state.searchQuery.toLowerCase().trim();

      return state.items.filter(item => {
        let matchesType = false;
        if (state.activeTypeFilter === 'wishlist') {
          matchesType = item.is_wishlist === true;
        } else {
          const isCategoryMatch = (state.activeTypeFilter === 'all' || item.type === state.activeTypeFilter);
          matchesType = isCategoryMatch && !item.is_wishlist;
        }

        const matchesText = !query || 
          (item.title && item.title.toLowerCase().includes(query)) ||
          (item.artist && item.artist.toLowerCase().includes(query));

        return matchesType && matchesText;
      });
    },

    stats(state) {
      const collectionCount = state.items.filter(i => !i.is_wishlist).length;
      const wishlistCount = state.items.filter(i => i.is_wishlist).length;
      return `${collectionCount} élément(s) • ${wishlistCount} wishlist`;
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