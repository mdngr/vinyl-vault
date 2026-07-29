import { createRouter, createWebHistory } from 'vue-router';
import LandingView from '../views/LandingView.vue';
import CollectionView from '../views/CollectionView.vue';
import SearchView from '../views/SearchView.vue';
import AccountView from '../views/AccountView.vue';
import { supabase } from '../services/supabase';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'landing', component: LandingView },
    { path: '/collection', name: 'collection', component: CollectionView, meta: { requiresAuth: true }},
    { path: '/search', name: 'search', component: SearchView, meta: { requiresAuth: true }},
    { path: '/account', name: 'account', component: AccountView, meta: { requiresAuth: true }} // 👈 Route ajoutée
  ]
});

// Guard de Navigation avec getSession() (au lieu de checkSession)
router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  
  // Utiliser getSession() qui est la méthode officielle v2
  const { data: { session } } = await supabase.auth.getSession();

  if (requiresAuth && !session) {
    next('/');
  } else if (to.path === '/' && session) {
    next('/collection');
  } else {
    next();
  }
});

export default router;