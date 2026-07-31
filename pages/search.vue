<template>
  <div class="search-page">
    <header class="page-header">
      <!-- Bouton Retour visible uniquement sur Desktop -->
      <button class="btn-back desktop-only" @click="navigateTo('/collection')">
        ← Retour à la collection
      </button>

      <div class="header-titles">
        <h2>Ajouter une œuvre</h2>
        <p class="subtitle">Recherchez un titre, un artiste, un EAN ou un ISBN</p>
      </div>
    </header>

    <div class="search-content">
      <ApiSearchPanel />
    </div>
  </div>
</template>

<script setup>
import ApiSearchPanel from '~/components/ApiSearchPanel.vue'

useHead({
  title: 'Ajouter une oeuvre - Culture Vault',
  meta: [
    { name: 'description', content: 'Recherchez et ajoutez de nouveaux vinyles, livres ou films à votre médiathèque.' }
  ]
})
</script>

<style scoped>
.search-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  padding-bottom: 90px;
}

.page-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.header-titles h2 {
  margin: 0;
  color: #fff;
  font-size: 1.6rem;
}

.subtitle {
  color: #a1a1aa;
  font-size: 0.85rem;
  margin-top: 4px;
}

/* Bouton Retour Desktop */
.btn-back {
  align-self: flex-start;
  background: #18181b;
  border: 1px solid #27272a;
  color: #a1a1aa;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-back:hover {
  background: #27272a;
  color: #fff;
}

.desktop-only {
  display: inline-flex;
}

/* 📱 AJUSTEMENTS SMARTPHONE */
@media (max-width: 768px) {
  .desktop-only {
    display: none !important;
  }

  .search-page {
    padding-top: max(12px, env(safe-area-inset-top));
    padding-left: 12px;
    padding-right: 12px;
    padding-bottom: calc(75px + env(safe-area-inset-bottom));
  }

  .page-header {
    text-align: center;
    margin-bottom: 20px;
  }

  .header-titles h2 {
    font-size: 1.8rem;
  }

  .subtitle {
    font-size: 0.9rem;
    line-height: 1.4;
  }
}
</style>