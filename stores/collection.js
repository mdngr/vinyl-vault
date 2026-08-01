import { defineStore } from 'pinia';
import { useAuthStore } from './auth';

export const useCollectionStore = defineStore('collection', {
  state: () => ({
    items: [],
    loading: false,
    activeTypeFilter: 'all',
    showWishlistOnly: false,
    currentViewMode: 'grid',
    searchQuery: '',
    sortBy: 'title', // 'title', 'artist', 'year'
    sortOrder: 'asc'  // 'asc', 'desc'
  }),

  getters: {
    filteredItems(state) {
      const query = state.searchQuery.toLowerCase().trim();

      let result = state.items.filter(item => {
        const matchesStatus = state.showWishlistOnly ? !!item.is_wishlist : !item.is_wishlist;
        const matchesType = state.activeTypeFilter === 'all' || item.type === state.activeTypeFilter;
        const matchesText = !query || 
          (item.title && item.title.toLowerCase().includes(query)) ||
          (item.artist && item.artist.toLowerCase().includes(query));

        return matchesStatus && matchesType && matchesText;
      });

      return result.sort((a, b) => {
        let valA = a[state.sortBy] || '';
        let valB = b[state.sortBy] || '';

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

      if (count === 0) return '0 élément';

      const pluralize = (nb, singular, plural = singular + 's') => {
        return `${nb} ${nb > 1 ? plural : singular}`;
      };

      const status = state.showWishlistOnly ? 'en wishlist' : 'en collection';

      if (state.activeTypeFilter === 'vinyl') {
        return `${pluralize(count, 'œuvre musicale', 'œuvres musicales')} ${status}`;
      }
      if (state.activeTypeFilter === 'book') {
        return `${pluralize(count, 'livre')} ${status}`;
      }
      if (state.activeTypeFilter === 'movie') {
        return `${pluralize(count, 'film')} ${status}`;
      }

      return `${pluralize(count, 'œuvre')} ${status}`;
    }
  },

  actions: {
    // 🛡️ Sauvegarde sécurisée dans le cache
    saveToCache(userId) {
      if (import.meta.client && userId) {
        localStorage.setItem(`culture_vault_cache_${userId}`, JSON.stringify(this.items));
      }
    },

    // 📂 Chargement sécurisé du cache local
    loadFromCache(userId) {
      if (!import.meta.client || !userId) return false;
      const cacheKey = `culture_vault_cache_${userId}`;
      const localCache = localStorage.getItem(cacheKey);

      if (localCache) {
        try {
          const parsed = JSON.parse(localCache);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.items = parsed;
            return true;
          }
        } catch (e) {
          console.error("Erreur lecture cache local", e);
        }
      }
      return false;
    },

    async fetchItems() {
      const authStore = useAuthStore();
      const userId = authStore.user?.id;

      if (!userId) {
        return;
      }

      if (this.items.length === 0) {
        this.loadFromCache(userId);
      }

      this.loading = true;

      try {
        const { $supabase } = useNuxtApp();
        const { data, error } = await $supabase
          .from('vinyls') // 👈 Cible la table public.vinyls
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          this.items = data.map(i => ({
            id: i.id,
            title: i.title,
            artist: i.artist,
            year: i.year,
            genre: i.genre,
            cover: i.cover,
            type: i.type || 'vinyl',
            format: i.format,
            is_wishlist: !!i.is_wishlist,
            rating: i.rating ?? 0,
            notes: i.notes ?? '',
            collector_data: i.collector_data ?? {} // 👈 Corrigé : 'i.collector_data' au lieu de 'o'
          }));

          this.saveToCache(userId);
        }
      } catch (err) {
        console.warn("Mode hors-ligne : conservation des données locales.", err.message);
      } finally {
        this.loading = false;
      }
    },

    async addItem(newItem) {
      try {
        const authStore = useAuthStore();
        if (!authStore.user) throw new Error("Utilisateur non connecté");

        const { $supabase } = useNuxtApp();

        const cleanTitle = (newItem.title || '').trim().toLowerCase();
        const cleanArtist = (newItem.artist || '').trim().toLowerCase();

        const isDuplicate = this.items.some(item => {
          const sameTitle = (item.title || '').trim().toLowerCase() === cleanTitle;
          const sameArtist = (item.artist || '').trim().toLowerCase() === cleanArtist;
          const sameType = item.type === newItem.type;
          return sameTitle && sameArtist && sameType;
        });

        if (isDuplicate) {
          const confirmAdd = confirm(
            `"${newItem.title}" de ${newItem.artist} existe déjà dans ta médiathèque.\nVeux-tu quand même l'ajouter ?`
          );
          if (!confirmAdd) return false;
        }

        const payload = {
          user_id: authStore.user.id,
          title: newItem.title,
          artist: newItem.artist,
          year: newItem.year || null,
          type: newItem.type || 'vinyl',
          format: newItem.format || null,
          cover: newItem.cover || null,
          is_wishlist: !!newItem.is_wishlist
        };

        const { data, error } = await $supabase
          .from('vinyls')
          .insert([payload])
          .select();

        if (error) throw error;

        if (data && data.length > 0) {
          this.items.unshift(data[0]);
          this.saveToCache(authStore.user.id);
        }
        return true;
      } catch (err) {
        console.error("Erreur lors de l'ajout :", err.message);
        throw err;
      }
    },

    async updateItem(id, updatedFields) {
      try {
        const authStore = useAuthStore();
        const { $supabase } = useNuxtApp();

        const { data, error } = await $supabase
          .from('vinyls')
          .update({
            title: updatedFields.title,
            artist: updatedFields.artist,
            year: updatedFields.year,
            type: updatedFields.type,
            format: updatedFields.format || null,
            cover: updatedFields.cover,
            is_wishlist: updatedFields.is_wishlist,
            rating: updatedFields.rating,
            notes: updatedFields.notes,
            collector_data: updatedFields.collector_data
          })
          .eq('id', id)
          .select();

        if (error) throw error;

        const index = this.items.findIndex(item => item.id === id);
        if (index !== -1 && data && data.length > 0) {
          this.items[index] = data[0];
          if (authStore.user) {
            this.saveToCache(authStore.user.id);
          }
        }
      } catch (err) {
        console.error("Erreur mise à jour :", err.message);
      }
    },

    async deleteItem(id) {
      const authStore = useAuthStore();
      if (!authStore.user) return;

      const { $supabase } = useNuxtApp();
      const { error } = await $supabase.from('vinyls').delete().eq('id', id);
      if (error) throw error;

      this.items = this.items.filter(i => i.id !== id);
      this.saveToCache(authStore.user.id);
    },

    clearMemory() {
      const authStore = useAuthStore();
      if (import.meta.client && authStore.user?.id) {
        localStorage.removeItem(`culture_vault_cache_${authStore.user.id}`);
      }
      this.items = [];
    }
  }
});