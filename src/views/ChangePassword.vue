<template>
  <div class="page">
    <div class="topbar">
      <span class="back" @click="$router.back()">返回</span>
      <span class="title">{{ t('changePassword') }}</span>
      <span style="width:40px"></span>
    </div>

    <div class="content">
      <div class="card box">
        <p class="tip">修改成功后，其他设备上的登录会失效，需要重新登录。</p>

        <input v-model="currentPassword" type="password" class="field" :placeholder="t('currentPassword')"
               autocomplete="current-password" />
        <input v-model="newPassword" type="password" class="field" :placeholder="t('newPassword')"
               autocomplete="new-password" />
        <input v-model="confirmPassword" type="password" class="field" :placeholder="t('confirmNewPassword')"
               autocomplete="new-password" />

        <button class="btn" :disabled="loading" @click="submit">
          {{ loading ? t('loading') : t('changePassword') }}
        </button>

        <p v-if="error" class="error">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api';
import { t } from '../i18n';
import { useUserStore } from '../store/user';
import { closeSocket } from '../socket';

const router = useRouter();
const store = useUserStore();
const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const error = ref('');

async function submit() {
  error.value = '';
  if (!currentPassword.value) { error.value = t('currentPasswordEmpty'); return; }
  if (newPassword.value.length < 6) { error.value = t('passwordMin'); return; }
  if (newPassword.value !== confirmPassword.value) { error.value = t('passwordMismatch'); return; }
  loading.value = true;
  try {
    await api.post('/api/auth/change-password', {
      currentPassword: currentPassword.value,
      newPassword: newPassword.value
    });
    closeSocket();
    store.logout();
    alert(t('changePasswordSuccess'));
    router.replace('/login');
  } catch (e) {
    error.value = (e.response && e.response.data && e.response.data.message) || '修改失败';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.page { height: 100%; display: flex; flex-direction: column; background: var(--bg); }
.topbar { background: rgba(255,255,255,.2); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--glass-border); }
.back { color: var(--green); cursor: pointer; font-size: 14px; }
.title { font-weight: 600; }
.content { flex: 1; overflow: auto; padding: 18px; display: flex; align-items: flex-start; justify-content: center; }
.box { width: 100%; max-width: 420px; padding: 22px; display: flex; flex-direction: column; gap: 12px; }
.tip { font-size: 13px; font-weight: var(--fw-regular); line-height: 1.7; color: var(--text-soft); background: rgba(255,255,255,.22); border: 1px solid var(--glass-border); border-radius: 12px; padding: 10px 12px; backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); }
.btn { width: 100%; padding: 12px; margin-top: 4px; }
.error { font-size: 13px; color: var(--danger); text-align: center; }
</style>
