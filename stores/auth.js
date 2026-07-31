import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const loading = ref(true)

  async function initializeAuth() {
    const { $supabase } = useNuxtApp()
    loading.value = true
    const { data: { session } } = await $supabase.auth.getSession()
    user.value = session?.user ?? null

    $supabase.auth.onAuthStateChange((_event, session) => {
      user.value = session?.user ?? null
      loading.value = false
    })
    loading.value = false
  }

  async function signUp(email, password) {
    const { $supabase } = useNuxtApp()
    const { data, error } = await $supabase.auth.signUp({ email, password })
    if (error) throw error
    return data
  }

  async function signIn(email, password) {
    const { $supabase } = useNuxtApp()
    const { data, error } = await $supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signOut() {
    const { $supabase } = useNuxtApp()
    const { error } = await $supabase.auth.signOut()
    if (error) throw error
    user.value = null
  }

  return { user, loading, initializeAuth, signUp, signIn, signOut }
})