<template>
  <div class="login-page">
    <div class="login-card card">
      <div class="lang-switch">
        <span @click="changeLang('zh')" :class="{active: lang==='zh'}">中文</span>
        <span class="divider">|</span>
        <span @click="changeLang('en')" :class="{active: lang==='en'}">English</span>
      </div>

      <img src="/logo.png" class="brand-logo" alt="巨信 cheat 普通用户 logo" />
      <h1 class="app-title">{{ t('appName') }}</h1>

      <input v-model="account" class="field" :placeholder="accountPlaceholder"
             autocomplete="username" autocapitalize="off" autocorrect="off" spellcheck="false"
             @keyup.enter="doLogin" />
      <input v-model="password" :type="showPassword ? 'text' : 'password'" class="field"
             :placeholder="t('password')"
             autocomplete="current-password" autocapitalize="off" autocorrect="off" spellcheck="false"
             @keyup.enter="doLogin" />
      <input v-if="need2fa" v-model="twoFactorCode" class="field" inputmode="numeric" maxlength="6"
             placeholder="管理员动态验证码" autocomplete="one-time-code" @keyup.enter="doLogin" />

      <div class="login-options">
        <label class="auto-login">
          <input type="checkbox" v-model="autoLogin" @change="onAutoLoginChange" />
          <span>{{ t('autoLogin') }}</span>
        </label>
        <label class="auto-login show-pwd">
          <input type="checkbox" v-model="showPassword" />
          <span>{{ t('showPassword') }}</span>
        </label>
      </div>

      <button class="btn login-btn" :disabled="loading" @click="doLogin">
        {{ loading ? t('loading') : t('login') }}
      </button>

      <div class="other-ways" @click="showOther = !showOther">
        {{ t('otherWays') }}
        <span class="arrow">{{ showOther ? '▲' : '▼' }}</span>
      </div>

      <div v-if="showOther" class="other-panel">
        <div @click="setMode('number')" :class="['mode-item', {active: loginMode==='number'}]">{{ t('byNumber') }}</div>
        <div @click="setMode('username')" :class="['mode-item', {active: loginMode==='username'}]">{{ t('byUsername') }}</div>
        <div @click="setMode('email')" :class="['mode-item', {active: loginMode==='email'}]">{{ t('byEmail') }}</div>
      </div>

      <div class="links">
        <a @click="$router.push('/register')">{{ t('goRegister') }}</a>
        <a @click="$router.push('/forgot-password')">{{ t('forgotPassword') }}</a>
        <a @click="$router.push('/terms')">隐私条款与免责声明</a>
        <a @click="$router.push('/admin-login')">{{ t('adminLogin') }}</a>
        <a @click="$router.push('/test-login')">测试码登录</a>
      </div>

      <p v-if="error" class="error">{{ error }}</p>
    </div>

    <VipWelcome v-if="showVipWelcome" @enter="enterAfterVipWelcome" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api';
import { t, setLang, i18nState } from '../i18n';
import { useUserStore } from '../store/user';
import VipWelcome from '../components/VipWelcome.vue';

const router = useRouter();
const store = useUserStore();

const account = ref('');
const password = ref('');
const twoFactorCode = ref('');
const need2fa = ref(false);
const autoLogin = ref(false);
const showPassword = ref(false);
const showOther = ref(false);
const loginMode = ref('number');
const loading = ref(false);
const error = ref('');
const showVipWelcome = ref(false);
const nextPath = ref('/home');

const lang = computed(() => i18nState.lang);
const accountPlaceholder = computed(() => {
  if (loginMode.value === 'username') return t('username');
  if (loginMode.value === 'email') return t('email');
  return '巨信号';
});

function setMode(m) { loginMode.value = m; account.value = ''; }
function changeLang(l) { setLang(l); }
function onAutoLoginChange() { if (autoLogin.value) alert(t('autoLoginTip')); }

function fmtBanTime(until) {
  if (!until) return '';
  try { return new Date(until).toLocaleString(); } catch (e) { return until; }
}

async function doLogin() {
  error.value = '';
  if (!account.value || !password.value) { error.value = '请填写账号和密码'; return; }
  if (password.value.length < 6) { error.value = t('passwordTooShort'); return; }
  if (need2fa.value && !/^\d{6}$/.test(twoFactorCode.value)) {
    error.value = '请输入 6 位管理员动态验证码';
    return;
  }
  loading.value = true;
  try {
    const body = { account: account.value, password: password.value };
    if (need2fa.value) body.twoFactorCode = twoFactorCode.value;
    const { data } = await api.post('/api/auth/login', body);
    store.setLogin(data.token, data.user, autoLogin.value);
    nextPath.value = data.user.termsAccepted !== true ? '/terms' : (data.user.number ? '/home' : '/choose-number');
    if (data.user.vipActive) showVipWelcome.value = true;
    else router.push(nextPath.value);
  } catch (e) {
    const resp = e.response && e.response.data;
    if (resp && resp.twoFactorRequired) {
      need2fa.value = true;
      error.value = resp.message || '请输入管理员动态验证码';
    } else if (resp && resp.adminLoginRequired) {
      error.value = resp.message || '管理员请使用单独的管理员登录入口';
      setTimeout(function () { router.push('/admin-login'); }, 700);
    } else if (resp && resp.banned) {
      error.value = '你的账号已被封禁，解封时间：' + fmtBanTime(resp.until) + (resp.reason ? '（原因：' + resp.reason + '）' : '');
    } else {
      error.value = (resp && resp.message) || '登录失败';
    }
  } finally { loading.value = false; }
}

function enterAfterVipWelcome() {
  showVipWelcome.value = false;
  router.push(nextPath.value);
}
</script>

<style scoped>
.login-page { height: 100%; display: flex; align-items: center; justify-content: center; background: transparent; padding: 20px; }
.login-card { width: 100%; max-width: 380px; padding: 34px 28px; display: flex; flex-direction: column; gap: 14px; position: relative; }
.lang-switch { position: absolute; top: 14px; right: 18px; font-size: 13px; color: var(--text-soft); }
.lang-switch span { cursor: pointer; padding: 2px 4px; }
.lang-switch span.active { color: var(--green); font-weight: 600; }
.lang-switch .divider { margin: 0 4px; cursor: default; }
.brand-logo { width: 88px; height: 88px; display: block; margin: 0 auto 4px; border-radius: 24px; object-fit: cover; }
.app-title { text-align: center; font-size: var(--fs-xl); font-weight: 700; line-height: 1.2; letter-spacing: .02em; color: var(--green-dark); margin-bottom: 8px; }
.login-options { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.auto-login { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-soft); cursor: pointer; user-select: none; }
.auto-login input { width: auto; }
.show-pwd { color: var(--green-dark); }
.login-btn { width: 100%; padding: 12px; font-size: 16px; }
.other-ways { text-align: center; font-size: 13px; color: var(--text-soft); cursor: pointer; user-select: none; }
.other-ways .arrow { margin-left: 4px; font-size: 10px; }
.other-panel { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
.mode-item { padding: 6px 12px; font-size: 13px; font-weight: var(--fw-medium); border-radius: 20px; background: rgba(255,255,255,.24); border: 1px solid rgba(255,255,255,.5); cursor: pointer; color: var(--text-soft); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); }
.mode-item.active { background: var(--green-light); color: var(--green); font-weight: 600; }
.links { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; font-size: var(--fs-sm); line-height: var(--lh-snug); text-align: center; }
.links a { cursor: pointer; color: var(--green-dark); font-weight: var(--fw-medium); }
.error { color: var(--danger); font-size: 13px; text-align: center; margin-top: 4px; }
</style>
