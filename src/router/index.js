import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import LandingView from '../views/LandingView.vue';
import CollectionView from '../views/CollectionView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'landing', component: LandingView },
    { 
      path: '/collection', 
      name: 'collection', 
      component: CollectionView,
      meta: { requiresAuth: true } 
    }
  ]
});

// Guard de navigation Supabase
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();
  await authStore.checkSession();

  if (to.meta.requiresAuth && !authStore.user) {
    next({ name: 'landing' });
  } else if (to.name === 'landing' && authStore.user) {
    next({ name: 'collection' });
  } else {
    next();
  }
});

export default router;