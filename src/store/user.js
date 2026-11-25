import { defineStore } from 'pinia';
import api from '../api';
import { applyVipTheme } from '../utils/vipTheme';

function readUser() {
  const s = readToken() ? sessionStorage.getItem('user') : null;
  try { return s ? JSON.parse(s) : null; } catch (e) { return null; }
}
function readToken() {
  const token = sessionStorage.getItem('token');
  return token && token === sessionStorage.getItem('jxLegacyToken') ? token : '';
}

export const useUserStore = defineStore('user', {
  state: () => ({
    token: readToken(),
    user: readUser(),
    onlineIds: []
  }),
  getters: {
    isLogin: (s) => !!s.token && !!s.user,
    myId: (s) => (s.user ? String(s.user.id) : '')
  },
  actions: {
    setLogin(token, user, remember) {
      this.token = token;
      this.user = user;
      applyVipTheme(user);
      const store = remember ? localStorage : sessionStorage;
      const other = remember ? sessionStorage : localStorage;
      other.removeItem('token');
      other.removeItem('user');
      store.setItem('token', token);
      store.setItem('user', JSON.stringify(user));
    },
    setUser(user) {
      this.user = user;
      applyVipTheme(user);
      const store = localStorage.getItem('token') ? localStorage : sessionStorage;
      store.setItem('user', JSON.stringify(user));
    },
    logout() {
      this.token = '';
      this.user = null;
      applyVipTheme(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('jxLegacyToken');
    },
    async refresh() {
      if (!this.token) return;
      try {
        const { data } = await api.get('/api/auth/me');
        this.setUser(data.user);
      } catch (e) {}
    }
  }
});
