import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  { path: '/', component: () => import('../views/Downloads.vue') },
  { path: '/emergency', component: () => import('../views/EmergencyLogin.vue') },
  { path: '/admin-login', component: () => import('../views/AdminLogin.vue') },
  { path: '/admin', component: () => import('../views/AdminPanel.vue'), meta: { admin: true } },
  { path: '/login', redirect: '/' },
  { path: '/choose-number', component: () => import('../views/ChooseNumber.vue') },
  { path: '/home', component: () => import('../views/Home.vue') },
  { path: '/post/:id', component: () => import('../views/PostDetail.vue') },
  { path: '/profile/:id', component: () => import('../views/Profile.vue') },
  { path: '/delete-account', component: () => import('../views/DeleteAccount.vue') },
  { path: '/change-password', component: () => import('../views/ChangePassword.vue') },
  { path: '/terms', component: () => import('../views/Terms.vue') },
  { path: '/:pathMatch(.*)*', redirect: '/' }
];

const router = createRouter({ history: createWebHistory(), routes });

router.beforeEach((to) => {
  if (to.path === '/' || to.path === '/emergency' || to.path === '/admin-login') return true;
  const token = sessionStorage.getItem('token');
  if (!token || token !== sessionStorage.getItem('jxLegacyToken')) return '/';

  let u = null;
  try {
    u = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || 'null');
  } catch (e) { u = null; }

  if (to.meta && to.meta.admin && (!u || !u.isAdmin)) return '/';

  // 老用户和条款更新后必须同意一次；条款页本身可读，不形成重定向循环。
  if (u && to.path !== '/terms' && u.termsAccepted !== true) {
    return '/terms';
  }

  // 注册后还没设置巨信号：强制进入选号页
  if (u && !u.number && to.path !== '/choose-number' && to.path !== '/terms') {
    return '/choose-number';
  }
  // 已经设置过巨信号，不允许再进选号页
  if (token && u && u.number && to.path === '/choose-number') return '/home';

  return true;
});

export default router;
