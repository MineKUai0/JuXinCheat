<template>
  <div class="page">
    <div class="card box">
      <img src="/logo.png" class="brand-logo" alt="巨信 cheat 普通用户 logo" />
      <h2>管理员登录</h2>
      <p class="subtitle">仅管理员账号可进入管理端</p>
      <input v-model="account" class="field" :placeholder="t('adminAccount')"
             autocomplete="username" autocapitalize="off" autocorrect="off" spellcheck="false"
             @keyup.enter="doLogin" />
      <input v-model="password" type="password" class="field" :placeholder="t('password')"
             autocomplete="current-password" autocapitalize="off" autocorrect="off" spellcheck="false"
             @keyup.enter="doLogin" />
      <input v-if="need2fa" v-model="twoFactorCode" class="field" inputmode="numeric" maxlength="6"
             placeholder="管理员动态验证码" autocomplete="one-time-code" @keyup.enter="doLogin" />
      <button class="btn" :disabled="loading" @click="doLogin">{{ loading ? t('loading') : (need2fa ? '验证并进入' : t('adminEnter')) }}</button>
      <a class="back" @click="$router.push('/login')">{{ t('back') }}</a>
      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="error" class="api-hint">请求地址：{{ apiBase }}</p>
    </div>
    <VipWelcome v-if="showVipWelcome" @enter="enterAfterVipWelcome" />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api';
import { t } from '../i18n';
import { useUserStore } from '../store/user';
import VipWelcome from '../components/VipWelcome.vue';

const router = useRouter();
const store = useUserStore();
const account = ref('');
const password = ref('');
const twoFactorCode = ref('');
const need2fa = ref(false);
const loading = ref(false);
const error = ref('');
const showVipWelcome = ref(false);
const apiBase = api.defaults.baseURL || window.location.origin;

function describeError(e) {
  const resp = e.response && e.response.data;
  if (e.response) {
    const status = e.response.status;
    const msg = resp && typeof resp === 'object' ? resp.message : '';
    if (status === 502 || status === 503 || status === 504) {
      return '后端未启动或隧道断开（HTTP ' + status + '）';
    }
    return '服务器返回 HTTP ' + status + (msg ? '：' + msg : '');
  }
  if (e.code === 'ECONNABORTED') return '请求超时：手机到后端 15 秒内没有响应（DNS、网络或隧道问题）';
  if (e.message === 'Network Error') return '网络错误：连不上后端（DNS 解析失败、被拦截或证书错误）';
  return '请求失败：' + (e.code || e.message || '未知错误');
}

async function doLogin() {
  error.value = '';
  if (!account.value || !password.value) { error.value = '请填写'; return; }
  if (password.value.length < 6) { error.value = t('passwordMin'); return; }
  if (need2fa.value && !/^\d{6}$/.test(twoFactorCode.value)) {
    error.value = '请输入 6 位动态验证码';
    return;
  }
  loading.value = true;
  try {
    const body = { account: account.value, password: password.value };
    if (need2fa.value) body.twoFactorCode = twoFactorCode.value;
    const { data } = await api.post('/api/auth/admin-login', body);
    if (!data.user.isAdmin) { error.value = '该账号不是管理员，请使用普通用户登录'; return; }
    sessionStorage.setItem('jxLegacyToken', data.token);
    store.setLogin(data.token, data.user, false);
    if (data.user.vipActive) showVipWelcome.value = true;
    else router.push(data.user.termsAccepted !== true ? '/terms' : '/admin');
  } catch (e) {
    const resp = e.response && e.response.data;
    if (resp && resp.twoFactorRequired) {
      need2fa.value = true;
      error.value = resp.message || '请输入管理员动态验证码';
    } else if (resp && resp.banned) {
      error.value = '你的账号已被封禁';
    } else {
      error.value = describeError(e);
    }
  } finally { loading.value = false; }
}

function enterAfterVipWelcome() {
  showVipWelcome.value = false;
  router.push(store.user && store.user.termsAccepted !== true ? '/terms' : '/admin');
}
</script>

<style scoped>
.page { height: 100%; display: flex; align-items: center; justify-content: center; padding: 20px; background: transparent; }
.box { width: 100%; max-width: 360px; padding: 28px; display: flex; flex-direction: column; gap: 12px; }
.brand-logo { width: 82px; height: 82px; display: block; margin: 0 auto 2px; border-radius: 22px; object-fit: cover; }
h2 { text-align: center; color: var(--green); margin-bottom: 8px; font-size: 20px; }
.subtitle { text-align: center; color: var(--text-soft); font-size: 13px; margin: -6px 0 2px; }
.back { text-align: center; font-size: 13px; cursor: pointer; color: var(--green); }
.error { color: var(--danger); font-size: 13px; text-align: center; }
.api-hint { color: #888; font-size: 12px; text-align: center; word-break: break-all; margin-top: -6px; }
</style>
