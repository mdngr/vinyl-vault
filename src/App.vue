<template>
  <router-view />
</template>

<script setup>
import { onMounted } from 'vue';
import { useAuthStore } from './stores/auth';

const authStore = useAuthStore();

onMounted(() => {
  // Vérifie la session Supabase au démarrage de l'app
  authStore.checkSession();
});
</script>

<style>
/* Les styles globaux sont déjà chargés via main.css */
</style>