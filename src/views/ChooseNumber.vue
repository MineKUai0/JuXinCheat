<template>
  <div class="page">
    <div class="card box">
      <img src="/logo.svg" class="brand-logo" alt="logo" />
      <h2>{{ t('chooseNumberTitle') }}</h2>
      <p class="tip">{{ t('chooseNumberTip') }}</p>

      <input v-model="juSignal" class="field" :placeholder="t('chooseNumberPlaceholder')"
             maxlength="16" @keydown.enter="onEnter" />

      <button class="btn" :disabled="loading" @click="submit">
        {{ loading ? t('loading') : t('chooseNumberConfirm') }}
      </button>

      <a class="back" @click="logout">{{ t('logout') }}</a>
      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api';
import { t } from '../i18n';
import { useUserStore } from '../store/user';

const router = useRouter();
const store = useUserStore();
const juSignal = ref('');
const loading = ref(false);
const error = ref('');

onMounted(async () => {
  if (store.user && store.user.number) { router.replace('/home'); return; }
  // 多标签页同时选号时，另一个标签可能已经设置成功
  try { await store.refresh(); } catch (e) {}
  if (store.user && store.user.number) router.replace('/home');
});

function onEnter(e) {
  if (e && (e.isComposing || e.keyCode === 229)) return;
  if (e) e.preventDefault();
  submit();
}

async function submit() {
  error.value = '';
  const v = juSignal.value.trim();
  if (!v) { error.value = t('chooseNumberEmpty'); return; }
  loading.value = true;
  try {
    const { data } = await api.post('/api/auth/set-number', { juSignal: v });
    store.setUser(data.user);
    router.push('/home');
  } catch (e) {
    const msg = (e.response && e.response.data && e.response.data.message) || t('chooseNumberFailed');
    if (msg.indexOf('已经设置过') !== -1) {
      try { await store.refresh(); } catch (err) {}
      if (store.user && store.user.number) { router.replace('/home'); return; }
    }
    error.value = msg;
  } finally { loading.value = false; }
}

function logout() {
  store.logout();
  router.push('/login');
}
</script>

<style scoped>
.page { height: 100%; display: flex; align-items: center; justify-content: center; background: transparent; padding: 20px; }
.box { width: 100%; max-width: 380px; padding: 34px 28px; display: flex; flex-direction: column; gap: 14px; }
.brand-logo { width: 76px; height: 76px; display: block; margin: 0 auto 4px; border-radius: 18px; }
h2 { text-align: center; font-size: 22px; font-weight: 700; color: var(--green); }
.tip { text-align: center; font-size: 13px; color: var(--text-soft); line-height: 1.7; }
.btn { width: 100%; padding: 12px; font-size: 16px; }
.back { text-align: center; font-size: 13px; cursor: pointer; color: var(--text-soft); }
.error { color: var(--danger); font-size: 13px; text-align: center; }
</style>
