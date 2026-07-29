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
      <!-- Section Hero -->
      <section class="hero-section">
        <div class="badge-pill">✨ Votre médiathèque personnelle</div>
        <h1 class="hero-title">
          Toute votre culture,<br />
          <span class="text-gradient">au même endroit.</span>
        </h1>
        <p class="hero-subtitle">
          Organisez, filtrez et explorez vos vinyles, livres et films préférés en quelques clics.
        </p>

        <!-- Grille de fonctionnalités en cartes -->
        <div class="features-grid">
          <div class="feature-card">
            <span class="feature-icon">💿</span>
            <h3>Musique</h3>
            <p>Collectionnez vos vinyles & albums.</p>
          </div>
          <div class="feature-card">
            <span class="feature-icon">📚</span>
            <h3>Livres & BDs</h3>
            <p>Gardez une trace de vos lectures.</p>
          </div>
          <div class="feature-card">
            <span class="feature-icon">🎬</span>
            <h3>Cinéma</h3>
            <p>Répertoriez vos films & séries.</p>
          </div>
          <div class="feature-card">
            <span class="feature-icon">🎲</span>
            <h3>Tirage au sort</h3>
            <p>Laissez le hasard choisir pour vous.</p>
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
            <div class="form-group">
              <label for="email">Adresse e-mail</label>
              <input 
                id="email" 
                v-model="email" 
                type="email" 
                placeholder="nom@exemple.com" 
                required 
                autocomplete="email"
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
                autocomplete="current-password"
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
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const authSectionRef = ref(null);
const isLogin = ref(true);
const email = ref('');
const password = ref('');
const loading = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

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
      await authStore.signIn(email.value, password.value);
      router.push('/collection');
    } else {
      await authStore.signUp(email.value, password.value);
      successMsg.value = 'Compte créé ! Vérifiez votre boîte mail si la confirmation est requise.';
      isLogin.value = true;
    }
  } catch (err) {
    errorMsg.value = err.message || "Une erreur est survenue lors de l'authentification.";
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
/* Conteneur Global */
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

/* Halos lumineux d'arrière-plan */
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

/* Header */
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

/* Bouton Login Header */
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

/* Contenu Principal */
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

/* Desktop Layout : 2 colonnes */
@media (min-width: 900px) {
  .landing-content {
    grid-template-columns: 1.2fr 0.8fr;
  }
}

/* Hero Section */
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
  margin-bottom: 28px;
  max-width: 540px;
}

/* Grille de Fonctionnalités */
.features-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

@media (min-width: 600px) and (max-width: 899px) {
  .features-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.feature-card {
  background: rgba(24, 24, 27, 0.6);
  backdrop-filter: blur(12px);
  border: 1px solid #27272a;
  border-radius: 12px;
  padding: 14px;
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.feature-card:hover {
  border-color: #3f3f46;
  transform: translateY(-2px);
}

.feature-icon {
  font-size: 1.4rem;
  display: block;
  margin-bottom: 6px;
}

.feature-card h3 {
  font-size: 0.85rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 2px;
}

.feature-card p {
  font-size: 0.72rem;
  color: #71717a;
  margin: 0;
  line-height: 1.3;
}

/* Section Auth / Carte Formulaire */
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

/* Footer */
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