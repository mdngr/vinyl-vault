<script setup>
import { ref } from 'vue'
import { useAuthStore } from '~/stores/auth'

useHead({
  title: 'Authentification - Culture Vault',
  meta: [
    { name: 'description', content: 'Connecte-toi ou crée un compte pour accéder à ta médiathèque personnelle.' }
  ]
})

const { $supabase } = useNuxtApp()
const authStore = useAuthStore()

const isSignUp = ref(false)
const email = ref('')
const password = ref('')
const firstName = ref('')
const lastName = ref('')
const errorMsg = ref('')
const successMsg = ref('')
const loading = ref(false)

async function handleSubmit() {
  errorMsg.value = ''
  successMsg.value = ''
  loading.value = true

  try {
    if (isSignUp.value) {
      // Inscription via Supabase avec métadonnées utilisateur
      const { data, error } = await $supabase.auth.signUp({
        email: email.value.trim(),
        password: password.value,
        options: {
          data: {
            first_name: firstName.value.trim(),
            last_name: lastName.value.trim()
          }
        }
      })
      if (error) throw error

      if (data?.session) {
        navigateTo('/collection')
      } else {
        successMsg.value = 'Compte créé ! Vérifie tes e-mails pour confirmer ton inscription.'
        isSignUp.value = false
      }
    } else {
      await authStore.signIn(email.value.trim(), password.value)
      navigateTo('/collection')
    }
  } catch (err) {
    errorMsg.value = err.message || 'Une erreur est survenue lors de l\'authentification.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <span class="logo-icon">🏛️</span>
        <h1 class="auth-title">
          <span v-if="isSignUp">Créer un compte</span>
          <span v-else>Connexion</span>
        </h1>
        <p class="auth-subtitle">
          <span v-if="isSignUp">Rejoins Culture Vault et gère ta collection</span>
          <span v-else>Accède à tes vinyles, livres et films</span>
        </p>
      </div>

      <form @submit.prevent="handleSubmit" class="auth-form">
        <!-- Champs Prénom et Nom (uniquement pour la création de compte) -->
        <template v-if="isSignUp">
          <div class="form-row">
            <div class="form-group">
              <label for="firstName">Prénom</label>
              <input 
                id="firstName"
                v-model="firstName" 
                type="text" 
                required 
                placeholder="Jean"
                autocomplete="given-name"
                class="form-input" 
              />
            </div>
            <div class="form-group">
              <label for="lastName">Nom</label>
              <input 
                id="lastName"
                v-model="lastName" 
                type="text" 
                required 
                placeholder="Dupont"
                autocomplete="family-name"
                class="form-input" 
              />
            </div>
          </div>
        </template>

        <div class="form-group">
          <label for="email">Adresse e-mail</label>
          <input 
            id="email"
            v-model="email" 
            type="email" 
            required 
            placeholder="nom@exemple.com"
            autocomplete="email"
            autocapitalize="off"
            class="form-input" 
          />
        </div>

        <div class="form-group">
          <label for="password">Mot de passe</label>
          <input 
            id="password"
            v-model="password" 
            type="password" 
            required 
            placeholder="••••••••"
            :autocomplete="isSignUp ? 'new-password' : 'current-password'"
            class="form-input" 
          />
        </div>

        <div v-if="errorMsg" class="badge badge-error">
          ⚠️ {{ errorMsg }}
        </div>

        <div v-if="successMsg" class="badge badge-success">
          ✅ {{ successMsg }}
        </div>

        <button type="submit" class="btn-submit" :disabled="loading">
          <span v-if="loading">Chargement...</span>
          <span v-else-if="isSignUp">S'inscrire</span>
          <span v-else>Se connecter</span>
        </button>
      </form>

      <button @click="isSignUp = !isSignUp" class="btn-toggle-mode">
        <span v-if="isSignUp">Déjà un compte ? Connexion</span>
        <span v-else>Pas encore de compte ? Créer un compte</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: calc(100vh - 100px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.auth-card {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 20px;
  padding: 32px 24px;
  max-width: 420px;
  width: 100%;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
}

.auth-header {
  text-align: center;
  margin-bottom: 24px;
}

.logo-icon {
  font-size: 2.2rem;
  display: block;
  margin-bottom: 8px;
}

.auth-title {
  margin: 0;
  color: #ffffff;
  font-size: 1.5rem;
  font-weight: 700;
}

.auth-subtitle {
  margin: 6px 0 0 0;
  color: #a1a1aa;
  font-size: 0.85rem;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: left;
}

.form-group label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #a1a1aa;
}

.form-input {
  width: 100%;
  padding: 12px 14px;
  background: #09090b;
  border: 1px solid #27272a;
  border-radius: 10px;
  color: #ffffff;
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.2s ease;
}

.form-input:focus {
  border-color: #3b82f6;
}

.badge {
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 0.8rem;
  line-height: 1.4;
  text-align: left;
}

.badge-error {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
}

.badge-success {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #6ee7b7;
}

.btn-submit {
  width: 100%;
  padding: 14px;
  background: #3b82f6;
  color: #ffffff;
  border: none;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  margin-top: 8px;
  transition: background-color 0.2s ease;
  min-height: 48px;
}

.btn-submit:hover:not(:disabled) {
  background: #2563eb;
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-toggle-mode {
  width: 100%;
  background: transparent;
  border: none;
  color: #a1a1aa;
  font-size: 0.85rem;
  margin-top: 20px;
  cursor: pointer;
  text-decoration: underline;
  transition: color 0.2s ease;
}

.btn-toggle-mode:hover {
  color: #ffffff;
}

@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>