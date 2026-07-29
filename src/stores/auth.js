import { defineStore } from 'pinia';
import { supabase } from '../services/supabase';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    session: null
  }),
  actions: {
    async checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      this.session = session;
      this.user = session?.user || null;

      supabase.auth.onAuthStateChange((_event, session) => {
        this.session = session;
        this.user = session?.user || null;
      });
    },
    async signOut() {
      await supabase.auth.signOut();
      this.user = null;
      this.session = null;
    }
  }
});