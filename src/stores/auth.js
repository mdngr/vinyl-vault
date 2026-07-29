import { defineStore } from 'pinia';
import { supabase } from '../services/supabase';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    loading: false,
  }),

  actions: {
    // 1. Initialiser la session au démarrage
    async initialize() {
      this.loading = true;
      try {
        // Correct : getSession()
        const { data: { session } } = await supabase.auth.getSession();
        this.user = session?.user || null;

        supabase.auth.onAuthStateChange((_event, session) => {
          this.user = session?.user || null;
        });
      } catch (err) {
        console.error("Erreur Auth :", err);
      } finally {
        this.loading = false;
      }
    },

    // 2. Connexion (signIn)
    async signIn(email, password) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      this.user = data.user;
      return data;
    },

    // 3. Inscription (signUp)
    async signUp(email, password) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;
      return data;
    },

    // 4. Déconnexion (signOut)
    async signOut() {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      this.user = null;
    }
  }
});