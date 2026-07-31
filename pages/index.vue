<template>
  <div class="landing-shell">
    <!-- Overlay d'ambiance avec dégradés luminescents -->
    <div class="bg-glow bg-glow-1"></div>
    <div class="bg-glow bg-glow-2"></div>

    <!-- Header avec Bouton de Connexion rapide -->
    <header class="landing-header">
      <div class="logo">
        <span class="logo-icon">🏛️</span>
        <span class="logo-text">Culture Vault</span>
      </div>

      <button class="btn-header-login" @click="scrollToAuth">
        Se connecter
      </button>
    </header>

    <main class="landing-content">
      <!-- Section Hero & Preview App -->
      <section class="hero-section">
        <div class="badge-pill">✨ Votre médiathèque personnelle</div>
        <h1 class="hero-title">
          Toute votre culture,<br />
          <span class="text-gradient">au même endroit.</span>
        </h1>
        <p class="hero-subtitle">
          Organisez, filtrez et explorez vos vinyles, livres et films préférés en quelques clics.
        </p>

        <!-- Preview Interactive / Maquette de l'App -->
        <div class="app-preview-card">
          <div class="preview-header">
            <div class="preview-dots">
              <span class="dot dot-red"></span>
              <span class="dot dot-yellow"></span>
              <span class="dot dot-green"></span>
            </div>
            <div class="preview-title-bar">Aperçu — Ma Collection</div>
          </div>

          <div class="preview-body">
            <div class="preview-toolbar">
              <div class="fake-search">🔍 Abbey Road...</div>
              <div class="fake-chips">
                <span class="fake-chip active">✨ Wishlist</span>
                <span class="fake-chip">💿 Vinyles</span>
                <span class="fake-chip">📚 Livres</span>
              </div>
            </div>

            <div class="preview-grid">
              <div class="preview-item">
                <div class="preview-cover cover-1">💿</div>
                <div class="preview-info">
                  <span class="preview-item-title">Abbey Road</span>
                  <span class="preview-item-sub">The Beatles</span>
                </div>
              </div>

              <div class="preview-item">
                <div class="preview-cover cover-2">📚</div>
                <div class="preview-info">
                  <span class="preview-item-title">Dune</span>
                  <span class="preview-item-sub">Frank Herbert</span>
                </div>
              </div>

              <div class="preview-item">
                <div class="preview-cover cover-3">🎬</div>
                <div class="preview-info">
                  <span class="preview-item-title">Interstellar</span>
                  <span class="preview-item-sub">Christopher Nolan</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Section Formulaire Connexion / Inscription -->
      <section id="auth-form-section" ref="authSectionRef" class="auth-section">
        <div class="auth-card">
          <div class="auth-tabs">
            <button 
              class="auth-tab-btn" 
              :class="{ active: isLogin }" 
              @click="isLogin = true"
            >
              Connexion
            </button>
            <button 
              class="auth-tab-btn" 
              :class="{ active: !isLogin }" 
              @click="isLogin = false"
            >
              Créer un compte
            </button>
          </div>

          <form @submit.prevent="handleAuth" class="auth-form">
            <div v-if="!isLogin" class="form-row">
              <div class="form-group">
                <label for="firstName">Prénom</label>
                <input 
                  id="firstName" 
                  v-model="firstName" 
                  type="text" 
                  placeholder="Jean" 
                  required 
                  autocomplete="given-name"
                />
              </div>

              <div class="form-group">
                <label for="lastName">Nom</label>
                <input 
                  id="lastName" 
                  v-model="lastName" 
                  type="text" 
                  placeholder="Dupont" 
                  required 
                  autocomplete="family-name"
                />
              </div>
            </div>

            <div class="form-group">
              <label for="email">Adresse e-mail</label>
              <input 
                id="email" 
                v-model="email" 
                type="email" 
                placeholder="nom@exemple.com" 
                required 
                autocomplete="email"
                autocapitalize="off"
              />
            </div>

            <div class="form-group">
              <label for="password">Mot de passe</label>
              <input 
                id="password" 
                v-model="password" 
                type="password" 
                placeholder="••••••••" 
                required 
                :autocomplete="isLogin ? 'current-password' : 'new-password'"
              />
            </div>

            <div v-if="errorMsg" class="error-badge">
              ⚠️ {{ errorMsg }}
            </div>

            <div v-if="successMsg" class="success-badge">
              ✅ {{ successMsg }}
            </div>

            <button type="submit" class="btn btn-primary btn-submit" :disabled="loading">
              <span v-if="loading">Chargement...</span>
              <span v-else>{{ isLogin ? 'Se connecter' : 'Rejoindre Culture Vault' }}</span>
            </button>
          </form>
        </div>
      </section>
    </main>

    <footer class="landing-footer">
      <p>Culture Vault &copy; {{ new Date().getFullYear() }} — Tous droits réservés.</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useAuthStore } from '~/stores/auth';

useHead({
  title: 'Culture Vault',
  meta: [
    { name: 'description', content: 'Catalogne tes albums, suis tes pièces rares et garde un œil sur ta discothèque.' }
  ]
});

const authStore = useAuthStore();
const { $supabase } = useNuxtApp();

const authSectionRef = ref(null);
const isLogin = ref(true);
const firstName = ref('');
const lastName = ref('');
const email = ref('');
const password = ref('');
const loading = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

// Redirection si l'utilisateur est déjà authentifié
watch(() => authStore.user, (user) => {
  if (user) {
    navigateTo('/collection');
  }
}, { immediate: true });

onMounted(() => {
  if (authStore.user) {
    navigateTo('/collection');
  }
});

function scrollToAuth() {
  isLogin.value = true;
  if (authSectionRef.value) {
    authSectionRef.value.scrollIntoView({ behavior: 'smooth' });
  }
}

async function handleAuth() {
  loading.value = true;
  errorMsg.value = '';
  successMsg.value = '';

  try {
    if (isLogin.value) {
      await authStore.signIn(email.value.trim(), password.value);
      navigateTo('/collection');
    } else {
      const { data, error } = await $supabase.auth.signUp({
        email: email.value.trim(),
        password: password.value,
        options: {
          data: {
            first_name: firstName.value.trim(),
            last_name: lastName.value.trim()
          }
        }
      });
      if (error) throw error;

      if (data?.session) {
        navigateTo('/collection');
      } else {
        successMsg.value = 'Compte créé ! Vérifiez votre boîte mail si la confirmation est requise.';
        isLogin.value = true;
      }
    }
  } catch (err) {
    errorMsg.value = err.message || "Une erreur est survenue lors de l'authentification.";
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.landing-shell {
  min-height: 100vh;
  min-height: 100dvh;
  width: 100vw;
  max-width: 100vw;
  background-color: #121212;
  color: #ffffff;
  position: relative;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
}

.bg-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.15;
  pointer-events: none;
  z-index: 0;
}

.bg-glow-1 {
  width: 350px;
  height: 350px;
  background: #3b82f6;
  top: -100px;
  left: -100px;
}

.bg-glow-2 {
  width: 400px;
  height: 400px;
  background: #8b5cf6;
  bottom: -150px;
  right: -100px;
}

.landing-header {
  height: auto;
  min-height: 60px;
  padding-top: calc(env(safe-area-inset-top) + 12px);
  padding-bottom: 12px;
  padding-left: clamp(16px, 5vw, 40px);
  padding-right: clamp(16px, 5vw, 40px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 10;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 800;
  font-size: clamp(1.1rem, 2vw, 1.4rem);
}

.logo-icon {
  font-size: 1.4em;
}

.btn-header-login {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #ffffff;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);
}

.btn-header-login:hover {
  background: #3b82f6;
  border-color: #3b82f6;
}

.landing-content {
  flex: 1;
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: clamp(16px, 4vw, 40px);
  display: grid;
  grid-template-columns: 1fr;
  gap: clamp(32px, 5vw, 64px);
  align-items: center;
}

@media (min-width: 900px) {
  .landing-content {
    grid-template-columns: 1.1fr 0.9fr;
  }
}

.hero-section {
  text-align: left;
}

.badge-pill {
  display: inline-block;
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.3);
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 16px;
}

.hero-title {
  font-size: clamp(2rem, 5vw, 3.2rem);
  font-weight: 800;
  line-height: 1.15;
  margin-bottom: 16px;
  letter-spacing: -0.02em;
}

.text-gradient {
  background: linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-subtitle {
  font-size: clamp(0.95rem, 2vw, 1.15rem);
  color: #a1a1aa;
  line-height: 1.5;
  margin-bottom: 24px;
  max-width: 540px;
}

.app-preview-card {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
  max-width: 500px;
}

.preview-header {
  background: #09090b;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #27272a;
  position: relative;
}

.preview-dots {
  display: flex;
  gap: 6px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.dot-red { background: #ef4444; }
.dot-yellow { background: #f59e0b; }
.dot-green { background: #10b981; }

.preview-title-bar {
  position: absolute;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 0.75rem;
  color: #a1a1aa;
  pointer-events: none;
}

.preview-body {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-toolbar {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.fake-search {
  background: #09090b;
  border: 1px solid #27272a;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.75rem;
  color: #71717a;
  text-align: left;
}

.fake-chips {
  display: flex;
  gap: 6px;
}

.fake-chip {
  background: #09090b;
  border: 1px solid #27272a;
  color: #a1a1aa;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.7rem;
}

.fake-chip.active {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
  border-color: #f59e0b;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.preview-item {
  background: #09090b;
  border: 1px solid #27272a;
  border-radius: 8px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.preview-cover {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  margin-bottom: 6px;
}

.cover-1 { background: #1e3a8a; }
.cover-2 { background: #78350f; }
.cover-3 { background: #312e81; }

.preview-info {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.preview-item-title {
  font-size: 0.7rem;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-item-sub {
  font-size: 0.6rem;
  color: #a1a1aa;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.auth-section {
  width: 100%;
}

.auth-card {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 20px;
  padding: clamp(20px, 4vw, 32px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
}

.auth-tabs {
  display: flex;
  background: #09090b;
  padding: 4px;
  border-radius: 12px;
  border: 1px solid #27272a;
  margin-bottom: 24px;
}

.auth-tab-btn {
  flex: 1;
  background: transparent;
  border: none;
  color: #a1a1aa;
  padding: 10px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.auth-tab-btn.active {
  background: #27272a;
  color: #ffffff;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  text-align: left;
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
}

.form-group label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #a1a1aa;
}

.form-group input {
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

.form-group input:focus {
  border-color: #3b82f6;
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

.error-badge, .success-badge {
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 0.8rem;
  line-height: 1.4;
}

.error-badge {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
}

.success-badge {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #6ee7b7;
}

.landing-footer {
  padding: 20px;
  padding-bottom: calc(env(safe-area-inset-bottom) + 16px);
  text-align: center;
  font-size: 0.75rem;
  color: #52525b;
  position: relative;
  z-index: 10;
}
</style>