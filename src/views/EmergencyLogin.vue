<template>
  <main class="emergency">
    <form class="card" @submit.prevent="login">
      <RouterLink to="/">返回下载页</RouterLink>
      <h1>应急登录</h1>
      <p>仅用于客户端暂时无法连接时的应急访问，连续登录客户端满 30 天后可使用。</p>
      <label>账号<input v-model.trim="account" class="field" autocomplete="username" placeholder="巨信号、用户名或邮箱" required /></label>
      <label>密码<input v-model="password" class="field" type="password" autocomplete="current-password" required /></label>
      <button class="btn" type="submit" :disabled="busy">{{ busy ? '登录中…' : '登录' }}</button>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
    </form>
  </main>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api';
import { useUserStore } from '../store/user';

const router = useRouter();
const store = useUserStore();
const account = ref('');
const password = ref('');
const busy = ref(false);
const error = ref('');

async function login() {
  busy.value = true;
  error.value = '';
  try {
    const { data } = await api.post('/api/auth/login', { account: account.value, password: password.value });
    sessionStorage.setItem('jxLegacyToken', data.token);
    store.setLogin(data.token, data.user, false);
    if (data.unreadCount > 0) window.alert('您有 ' + data.unreadCount + ' 条未接收的消息');
    await router.push('/home');
  } catch (e) {
    error.value = e.response?.data?.message || '登录失败，请稍后重试';
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.emergency { height: 100%; overflow-y: auto; padding: 32px 18px; display: grid; justify-items: center; align-items: start; }
form { margin-top: min(9vh, 70px); width: min(100%, 430px); padding: 26px; display: grid; gap: 14px; }
h1, p { margin: 0; }
h1 { font-size: clamp(1.28rem, 5vw, 1.65rem); }
p { line-height: 1.6; }
label { display: grid; gap: 6px; }
a { width: fit-content; }
</style>
