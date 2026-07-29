<template>
  <div class="landing-container">
    <!-- Navbar simplifiée pour la Landing Page -->
    <header class="landing-header">
      <div class="logo">
        <span class="logo-icon">🏛️</span>
        <span class="logo-text">Culture Vault</span>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" @click="openAuthModal(false)">Connexion</button>
        <button class="btn btn-primary" @click="openAuthModal(true)">Créer un compte</button>
      </div>
    </header>

    <!-- Hero Section -->
    <main class="hero-section">
      <span class="hero-badge">✨ Ta médiathèque personnelle PWA</span>
      <h1>Catalogue toute ta culture au même endroit.</h1>
      <p class="hero-subtitle">
        Vinyles, livres, BDs, films… Scanne tes codes-barres en vide-grenier, retrouve les cotes d'occasion en temps réel et ne réachète plus jamais un doublon.
      </p>

      <div class="hero-actions">
        <button class="btn btn-primary btn-lg" @click="openAuthModal(true)">
          🚀 Démarrer gratuitement
        </button>
        <button class="btn btn-secondary btn-lg" @click="openAuthModal(false)">
          🔑 Déjà inscrit ? Connexion
        </button>
      </div>

      <!-- Feature Grid -->
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon">📷</div>
          <h3>Scanner Intelligent</h3>
          <p>Détection instantanée des codes-barres avec contrôle du zoom matériel pour les vide-greniers.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🏷️</div>
          <h3>Cotes en Temps Réel</h3>
          <p>Estimations des prix d'occasion basées sur Discogs, Open Library et TMDB.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">✨</div>
          <h3>Wishlist "Anti-Doublons"</h3>
          <p>Conserve une liste d'achats ciblés pour ne plus jamais acheter un album ou livre déjà possédé.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">📶</div>
          <h3>100% Hors-Ligne</h3>
          <p>Accède à l'intégralité de ton catalogue même sans réseau au fond d'une brocante.</p>
        </div>
      </div>
    </main>

    <!-- Modal Authentification -->
    <div v-if="showAuthModal" class="modal-overlay" @click.self="showAuthModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ isSignUpMode ? '📝 Créer un compte' : '🔓 Connexion à mon compte' }}</h3>
          <button class="btn-close" @click="showAuthModal = false">✕</button>
        </div>

        <form @submit.prevent="handleAuth" class="auth-form">
          <div class="form-group">
            <label for="email">Email</label>
            <input 
              id="email" 
              v-model="email" 
              type="email" 
              required 
              placeholder="ton-email@exemple.com" 
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
            />
          </div>

          <div v-if="errorMessage" class="error-message">
            {{ errorMessage }}
          </div>

          <button type="submit" class="btn btn-primary btn-full" :disabled="loading">
            {{ loading ? 'Chargement...' : (isSignUpMode ? 'S\'inscrire' : 'Se connecter') }}
          </button>
        </form>

        <div class="toggle-mode">
          <a href="#" @click.prevent="isSignUpMode = !isSignUpMode">
            {{ isSignUpMode ? 'Déjà un compte ? Se connecter' : 'Pas encore de compte ? S\'inscrire' }}
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { supabase } from '../services/supabase';

const router = useRouter();

// État local du modal et formulaire
const showAuthModal = ref(false);
const isSignUpMode = ref(false);
const email = ref('');
const password = ref('');
const loading = ref(false);
const errorMessage = ref('');

function openAuthModal(isSignUp) {
  isSignUpMode.value = isSignUp;
  errorMessage.value = '';
  showAuthModal.value = true;
}

async function handleAuth() {
  loading.value = true;
  errorMessage.value = '';

  try {
    if (isSignUpMode.value) {
      const { data, error } = await supabase.auth.signUp({
        email: email.value.trim(),
        password: password.value
      });
      if (error) throw error;
      alert("Compte créé avec succès ! Tu peux maintenant te connecter.");
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.value.trim(),
        password: password.value
      });
      if (error) throw error;
      
      // On masque la modale et on redirige
      showAuthModal.value = false;
      await router.push('/collection');
    }
  } catch (err) {
    console.error("Erreur Auth Supabase :", err);
    errorMessage.value = err.message || "Impossible de se connecter.";
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.landing-container {
  min-height: 100vh;
  background-color: #121212;
  color: #f3f4f6;
  padding: 0 20px 60px 20px;
}

.landing-header {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 0;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.25rem;
  font-weight: 700;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.hero-section {
  max-width: 900px;
  margin: 60px auto 0 auto;
  text-align: center;
}

.hero-badge {
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.3);
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  display: inline-block;
  margin-bottom: 24px;
}

.hero-section h1 {
  font-size: 2.75rem;
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 20px;
  background: linear-gradient(135deg, #ffffff 0%, #a1a1aa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-subtitle {
  font-size: 1.15rem;
  color: #a1a1aa;
  max-width: 680px;
  margin: 0 auto 36px auto;
  line-height: 1.6;
}

.hero-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 70px;
}

.btn {
  padding: 10px 18px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.btn-primary {
  background: #3b82f6;
  color: #ffffff;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-secondary {
  background: #27272a;
  color: #f3f4f6;
  border: 1px solid #3f3f46;
}

.btn-secondary:hover {
  background: #3f3f46;
}

.btn-lg {
  padding: 14px 28px;
  font-size: 1.05rem;
}

.btn-full {
  width: 100%;
  margin-top: 10px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.feature-card {
  background: #18181b;
  border: 1px solid #27272a;
  padding: 24px;
  border-radius: 12px;
  text-align: left;
}

.feature-icon {
  font-size: 2rem;
  margin-bottom: 12px;
}

.feature-card h3 {
  font-size: 1.1rem;
  margin-bottom: 8px;
  color: #ffffff;
}

.feature-card p {
  font-size: 0.9rem;
  color: #a1a1aa;
  line-height: 1.5;
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 16px;
  padding: 28px;
  width: 90%;
  max-width: 400px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.btn-close {
  background: none;
  border: none;
  color: #a1a1aa;
  font-size: 1.2rem;
  cursor: pointer;
}

.form-group {
  margin-bottom: 16px;
  text-align: left;
}

.form-group label {
  display: block;
  font-size: 0.85rem;
  color: #a1a1aa;
  margin-bottom: 6px;
}

.form-group input {
  width: 100%;
  padding: 10px 14px;
  background: #09090b;
  border: 1px solid #27272a;
  border-radius: 8px;
  color: #ffffff;
  font-size: 0.95rem;
  box-sizing: border-box;
}

.error-message {
  color: #ef4444;
  font-size: 0.85rem;
  margin-bottom: 12px;
}

.toggle-mode {
  margin-top: 16px;
  text-align: center;
  font-size: 0.85rem;
}

.toggle-mode a {
  color: #60a5fa;
  text-decoration: none;
}
</style>