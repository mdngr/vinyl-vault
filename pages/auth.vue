<script setup>
import { ref } from 'vue'
import { useAuthStore } from '~/stores/auth'

const { $supabase } = useNuxtApp()
const authStore = useAuthStore()

const isSignUp = ref(false)
const email = ref('')
const password = ref('')
const firstName = ref('')
const lastName = ref('')
const errorMsg = ref('')

async function handleSubmit() {
  errorMsg.value = ''
  try {
    if (isSignUp.value) {
      // Inscription direct via Supabase pour transmettre les métadonnées de profil
      const { data, error } = await $supabase.auth.signUp({
        email: email.value,
        password: password.value,
        options: {
          data: {
            first_name: firstName.value,
            last_name: lastName.value
          }
        }
      })
      if (error) throw error
      alert('Vérifie tes emails !')
    } else {
      await authStore.signIn(email.value, password.value)
      navigateTo('/collection')
    }
  } catch (err) {
    errorMsg.value = err.message
  }
}
</script>

<template>
  <div class="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md mt-10">
    <h1 class="text-2xl font-bold mb-6 text-center">
      <span v-if="isSignUp">Créer un compte</span>
      <span v-else>Se connecter</span>
    </h1>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Champs Prénom et Nom (uniquement pour la création de compte) -->
      <template v-if="isSignUp">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium mb-1">Prénom</label>
            <input 
              v-model="firstName" 
              type="text" 
              required 
              class="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-amber-500" 
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Nom</label>
            <input 
              v-model="lastName" 
              type="text" 
              required 
              class="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-amber-500" 
            />
          </div>
        </div>
      </template>

      <div>
        <label class="block text-sm font-medium mb-1">Email</label>
        <input v-model="email" type="email" required class="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-amber-500" />
      </div>

      <div>
        <label class="block text-sm font-medium mb-1">Mot de passe</label>
        <input v-model="password" type="password" required class="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-amber-500" />
      </div>

      <p v-if="errorMsg" class="text-red-500 text-sm font-medium">{{ errorMsg }}</p>

      <button type="submit" class="w-full bg-amber-600 text-white py-2 rounded font-medium hover:bg-amber-700 transition">
        <span v-if="isSignUp">S'inscrire</span>
        <span v-else>Se connecter</span>
      </button>
    </form>

    <button @click="isSignUp = !isSignUp" class="w-full text-center text-sm text-slate-500 mt-4 underline">
      <span v-if="isSignUp">Déjà un compte ? Connexion</span>
      <span v-else>Pas de compte ? S'inscrire</span>
    </button>
  </div>
</template>