<template>
  <main class="bridge-page">
    <div class="bridge-card">
      <div class="brand"><img src="/logo.png" alt="" /><b>巨信 Cheat</b></div>
      <template v-if="!success">
        <h1>{{ text.title }}</h1>
        <p class="hint">{{ text.hint }}</p>
        <div v-if="client === 'admin' || mode === 'admin'" class="mode-label">{{ text.adminMode }}</div>
        <label>{{ text.account }}<input v-model="account" class="field" autocomplete="username" @keyup.enter="submit" /></label>
        <label>{{ text.password }}<input v-model="password" class="field" type="password" autocomplete="current-password" @keyup.enter="submit" /></label>
        <label v-if="requires2fa">{{ text.twoFactor }}<input v-model="twoFactor" class="field" maxlength="10" inputmode="numeric" @keyup.enter="submit" /></label>
        <p v-if="error" class="error">{{ error }}</p>
        <button class="primary" :disabled="busy" @click="submit">{{ busy ? text.waiting : text.login }}</button>
        <p class="small">{{ text.returnHint }}</p>
      </template>
      <template v-else>
        <div class="success-mark">✓</div>
        <h1>{{ text.success }}</h1>
        <p class="hint">{{ text.successHint }}</p>
        <p class="small">{{ text.autoClose }}</p>
      </template>
    </div>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const params = new URLSearchParams(window.location.search);
const state = params.get('state') || '';
const challenge = params.get('challenge') || '';
const client = params.get('client') || 'desktop';
const mode = params.get('mode') || '';
const account = ref('');
const password = ref('');
const twoFactor = ref('');
const requires2fa = ref(false);
const busy = ref(false);
const success = ref(false);
const finished = ref(false);
const error = ref('');
let cancelSent = false;
const lang = ref('zh');
const copies = {
  zh: { title: '客户端登录', hint: '登录成功后会授权当前设备，请返回客户端。', account: '账号', password: '密码', twoFactor: '管理员动态验证码', login: '登录并授权', waiting: '正在登录…', success: '登录成功', successHint: '授权已完成，请返回客户端。', autoClose: '不要关闭客户端，它会自动获取登录凭证。', adminMode: '管理员登录', returnHint: '本页面只用于客户端授权登录。' },
  'zh-TW': { title: '客戶端登入', hint: '登入成功後會授權目前裝置，請返回客戶端。', account: '帳號', password: '密碼', twoFactor: '管理員動態驗證碼', login: '登入並授權', waiting: '正在登入…', success: '登入成功', successHint: '授權已完成，請返回客戶端。', autoClose: '不要關閉客戶端，它會自動取得登入憑證。', adminMode: '管理員登入', returnHint: '本頁面只用於客戶端授權登入。' },
  en: { title: 'Client sign-in', hint: 'Sign in to authorize this device, then return to the client.', account: 'Account', password: 'Password', twoFactor: 'Admin verification code', login: 'Sign in and authorize', waiting: 'Signing in…', success: 'Signed in', successHint: 'Authorization complete. Return to the client.', autoClose: 'Keep the client open; it will receive the login token automatically.', adminMode: 'Admin sign-in', returnHint: 'This page is only for client authorization.' }
};
const text = computed(() => copies[lang.value] || copies.zh);

function setLocale(value) {
  lang.value = value === 'zh-TW' || value === 'en' ? value : 'zh';
}
function cancelLogin() {
  if (finished.value || cancelSent || !state) return;
  cancelSent = true;
  const body = JSON.stringify({ state });
  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon('/api/client-auth/cancel', blob)) return;
    }
  } catch (e) {}
  try {
    fetch('/api/client-auth/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true
    });
  } catch (e) {}
}
function onPageHide() {
  cancelLogin();
}
onMounted(async () => {
  window.addEventListener('beforeunload', onPageHide);
  window.addEventListener('pagehide', onPageHide);
  if (!state || !/^[a-f0-9]{16,128}$/i.test(state) || !/^[a-f0-9]{64}$/i.test(challenge)) {
    error.value = '登录链接已失效，请返回客户端重新发起登录。';
    return;
  }
  try {
    const response = await fetch('/api/app/region', { headers: { Accept: 'application/json' } });
    if (response.ok) setLocale((await response.json()).locale);
  } catch (e) {}
});
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', onPageHide);
  window.removeEventListener('pagehide', onPageHide);
});

async function submit() {
  error.value = '';
  if (!account.value.trim() || !password.value) {
    error.value = '请填写账号和密码';
    return;
  }
  busy.value = true;
  try {
    const response = await fetch('/api/client-auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        state,
        challenge,
        client,
        admin: client === 'admin' || mode === 'admin',
        account: account.value.trim(),
        password: password.value,
        twoFactorCode: twoFactor.value.trim()
      })
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401 && data.twoFactorRequired) {
      requires2fa.value = true;
      error.value = data.message || '请输入动态验证码';
      return;
    }
    if (!response.ok) {
      error.value = data.message || '登录失败，请重试';
      return;
    }
    if (data.bridgeReady) {
      finished.value = true;
      success.value = true;
      return;
    }
    error.value = data.message || '登录未完成';
  } catch (e) {
    error.value = '网络错误，请稍后重试';
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.bridge-page{min-height:100vh;display:grid;place-items:center;padding:22px;background:radial-gradient(circle at 15% 10%,#d9f5e6,#f4f7f5 55%,#eef2ff);font-family:var(--font-sans,"Microsoft YaHei",system-ui,sans-serif)}
.bridge-card{width:min(100%,430px);padding:34px 28px;border-radius:24px;background:rgba(255,255,255,.82);border:1px solid rgba(255,255,255,.9);box-shadow:0 24px 70px rgba(20,70,45,.12);backdrop-filter:blur(18px)}
.brand{display:flex;align-items:center;gap:10px;margin-bottom:22px;color:#077a45;font-size:18px}.brand img{width:38px;height:38px;border-radius:12px}
h1{margin:0 0 8px;color:#122018;font-size:26px;letter-spacing:-.04em}.hint,.small{color:#64766b;font-size:13px;line-height:1.7}.small{margin-top:14px}
label{display:block;margin:14px 0 0;color:#26372d;font-size:13px;font-weight:650}
.field{display:block;width:100%;box-sizing:border-box;margin-top:7px;padding:12px 13px;border:1px solid #cbd9d0;border-radius:10px;background:#fff;color:#122018;font-size:15px;outline:none}
.field:focus{border-color:#18b875;box-shadow:0 0 0 3px rgba(24,184,117,.13)}
.primary{width:100%;margin-top:18px;padding:12px;border:0;border-radius:10px;background:#08b76c;color:#fff;font-size:15px;font-weight:750;cursor:pointer}.primary:disabled{opacity:.6;cursor:wait}
.error{margin:12px 0 0;color:#d34e4e;font-size:13px;line-height:1.6}
.mode-label{display:inline-block;margin-bottom:4px;padding:4px 8px;border-radius:999px;background:#e9f7ef;color:#087b49;font-size:11px}
.success-mark{display:grid;place-items:center;width:64px;height:64px;margin-bottom:18px;border-radius:50%;background:#d9f7e7;color:#08a663;font-size:34px;font-weight:800}
@media(max-width:420px){.bridge-card{padding:28px 20px}}
</style>
