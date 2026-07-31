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

      const pluralize = (nb, singular, plural = singular + 's') => {
        return `${nb} ${nb > 1 ? plural : singular}`;
      };

      const status = state.showWishlistOnly ? 'en wishlist' : 'en collection';

      // Catégorie Musique (CDs, Vinyles, Cassettes...)
      if (state.activeTypeFilter === 'vinyl') {
        return `${pluralize(count, 'œuvre musicale', 'œuvres musicales')} ${status}`;
      }

      // Catégorie Livres (Romans, BDs, Mangas...)
      if (state.activeTypeFilter === 'book') {
        return `${pluralize(count, 'livre')} ${status}`;
      }

      // Catégorie Films (DVDs, Blu-ray...)
      if (state.activeTypeFilter === 'movie') {
        return `${pluralize(count, 'film')} ${status}`;
      }

      // Tout
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
              format: i.format,
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

    // 1. Ajouter une œuvre (avec le format)
    // Dans src/stores/collection.js -> actions

    async addItem(newItem) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) throw new Error("Utilisateur non connecté");

        // 🔍 1. Contrôle des doublons en mémoire
        const cleanTitle = newItem.title.trim().toLowerCase();
        const cleanArtist = newItem.artist.trim().toLowerCase();

        const isDuplicate = this.items.some(item => {
          const sameTitle = item.title.trim().toLowerCase() === cleanTitle;
          const sameArtist = item.artist.trim().toLowerCase() === cleanArtist;
          const sameType = item.type === newItem.type;
          return sameTitle && sameArtist && sameType;
        });

        if (isDuplicate) {
          const confirmAdd = confirm(
            `"${newItem.title}" de ${newItem.artist} existe déjà dans ta médiathèque.\nVeux-tu quand même l'ajouter ?`
          );
          if (!confirmAdd) return false; // Annulation par l'utilisateur
        }

        // 📤 2. Insertion dans Supabase
        const payload = {
          user_id: session.user.id,
          title: newItem.title,
          artist: newItem.artist,
          year: newItem.year || null,
          type: newItem.type || 'vinyl',
          format: newItem.format || null,
          cover: newItem.cover || null,
          is_wishlist: !!newItem.is_wishlist
        };

        const { data, error } = await supabase
          .from('vinyls')
          .insert([payload])
          .select();

        if (error) throw error;

        if (data && data.length > 0) {
          this.items.unshift(data[0]);
        }
        return true; // Ajout réussi
      } catch (err) {
        console.error("Erreur lors de l'ajout :", err.message);
        throw err;
      }
    },

    // 2. Mettre à jour une œuvre (Édition de carte)
    async updateItem(id, updatedFields) {
      try {
        const { data, error } = await supabase
          .from('vinyls')
          .update({
            title: updatedFields.title,
            artist: updatedFields.artist,
            year: updatedFields.year,
            type: updatedFields.type,
            format: updatedFields.format || null, // 👈 S'assurer que le format est sauvegardé
            cover: updatedFields.cover,
            is_wishlist: updatedFields.is_wishlist
          })
          .eq('id', id)
          .select();

        if (error) throw error;

        // Mettre à jour le state local Pinia
        const index = this.items.findIndex(item => item.id === id);
        if (index !== -1 && data && data.length > 0) {
          this.items[index] = data[0];
        }
      } catch (err) {
        console.error("Erreur mise à jour :", err.message);
      }
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