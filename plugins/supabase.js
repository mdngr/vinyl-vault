import { createSupabaseClient } from '~/services/supabaseClient'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const supabase = createSupabaseClient(config.public?.supabaseUrl, config.public?.supabaseAnonKey)
  
  return {
    provide: {
      supabase
    }
  }
})