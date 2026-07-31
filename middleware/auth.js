import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(async (to) => {
  const authStore = useAuthStore()
  if (authStore.loading) {
    await authStore.initializeAuth()
  }
  if (!authStore.user) {
    return navigateTo('/auth')
  }
})