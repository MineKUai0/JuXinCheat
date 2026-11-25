<template>
  <div class="page">
    <div class="card box">
      <h2>{{ t('forgotPassword') }}</h2>
      <p class="tip">输入注册邮箱，收到 16 位验证码后设置新密码。</p>

      <input v-model="email" class="field" :placeholder="t('email')"
             autocomplete="email" autocapitalize="off" autocorrect="off" spellcheck="false" />

      <div class="code-row">
        <input v-model="code" class="field" :placeholder="t('verifyCode')" maxlength="16" inputmode="numeric" />
        <button class="btn-ghost btn code-btn" :disabled="counting > 0 || sending" @click="sendCode">
          {{ counting > 0 ? counting + 's' : t('sendCode') }}
        </button>
      </div>

      <input v-model="password" type="password" class="field" :placeholder="t('passwordMinPlaceholder')"
             autocomplete="new-password" />
      <input v-model="confirmPassword" type="password" class="field" :placeholder="t('confirmNewPassword')"
             autocomplete="new-password" />

      <button class="btn submit" :disabled="loading" @click="submit">
        {{ loading ? t('loading') : t('resetPassword') }}
      </button>

      <a class="back" @click="$router.push('/login')">{{ t('goLogin') }}</a>

      <p v-if="tip" class="tip-text">{{ tip }}</p>
      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api';
import { t } from '../i18n';
import { useUserStore } from '../store/user';
import { closeSocket } from '../socket';

const router = useRouter();
const store = useUserStore();
const email = ref('');
const code = ref('');
const password = ref('');
const confirmPassword = ref('');
const counting = ref(0);
const sending = ref(false);
const loading = ref(false);
const tip = ref('');
const error = ref('');
let countdownTimer = null;

async function sendCode() {
  error.value = '';
  tip.value = '';
  if (!email.value.trim()) { error.value = '请先填邮箱'; return; }
  sending.value = true;
  try {
    const { data } = await api.post('/api/auth/forgot-code', { email: email.value.trim() });
    if (data.devCode) tip.value = '【开发模式】验证码：' + data.devCode;
    else tip.value = '验证码已发送到邮箱';
    if (countdownTimer) clearInterval(countdownTimer);
    counting.value = 60;
    countdownTimer = setInterval(() => {
      counting.value--;
      if (counting.value <= 0) {
        clearInterval(countdownTimer);
        countdownTimer = null;
      }
    }, 1000);
  } catch (e) {
    error.value = (e.response && e.response.data && e.response.data.message) || '发送失败';
  } finally {
    sending.value = false;
  }
}

async function submit() {
  error.value = '';
  if (!email.value.trim()) { error.value = '请填写邮箱'; return; }
  if (!/^\d{16}$/.test(code.value.trim())) { error.value = '请输入 16 位验证码'; return; }
  if (password.value.length < 6) { error.value = t('passwordMin'); return; }
  if (password.value !== confirmPassword.value) { error.value = t('passwordMismatch'); return; }
  loading.value = true;
  try {
    await api.post('/api/auth/reset-password', {
      email: email.value.trim(),
      code: code.value.trim(),
      password: password.value
    });
    closeSocket();
    store.logout();
    alert(t('resetSuccess'));
    router.replace('/login');
  } catch (e) {
    error.value = (e.response && e.response.data && e.response.data.message) || '重置失败';
  } finally {
    loading.value = false;
  }
}

onBeforeUnmount(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
});
</script>

<style scoped>
.page { height: 100%; display: flex; align-items: center; justify-content: center; padding: 20px; background: transparent; }
.box { width: 100%; max-width: 400px; padding: 28px; display: flex; flex-direction: column; gap: 12px; }
h2 { text-align: center; font-size: 22px; color: var(--green); }
.tip { text-align: center; font-size: 13px; color: var(--text-soft); line-height: 1.7; }
.code-row { display: flex; gap: 8px; }
.code-row .field { flex: 1; min-width: 0; }
.code-btn { white-space: nowrap; padding: 10px 12px; font-size: 13px; }
.submit { width: 100%; padding: 12px; font-size: 16px; }
.back { text-align: center; font-size: 13px; color: var(--green); cursor: pointer; }
.tip-text { color: var(--green); font-size: 13px; text-align: center; }
.error { color: var(--danger); font-size: 13px; text-align: center; }
</style>
