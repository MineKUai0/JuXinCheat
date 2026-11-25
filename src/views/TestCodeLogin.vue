<template>
  <div class="page">
    <div class="card box">
      <h2>测试码登录</h2>

      <template v-if="!verified">
        <input v-model="code" class="field" placeholder="请输入 25 位测试码" @keyup.enter="verify" />
        <button class="btn" :disabled="loading" @click="verify">{{ loading ? t('loading') : '验证' }}</button>
      </template>

      <template v-else>
        <p class="ok">测试码正确，请创建账号</p>
        <input v-model="email" class="field" placeholder="邮箱" />
        <input v-model="username" class="field" placeholder="用户名" />
        <input v-model="password" type="password" class="field" placeholder="密码（至少 6 位）"
               autocomplete="new-password" autocapitalize="off" autocorrect="off" spellcheck="false" />
        <button class="btn" :disabled="loading" @click="create">{{ loading ? t('loading') : '创建并进入' }}</button>
      </template>

      <a class="back" @click="$router.push('/login')">{{ t('back') }}</a>
      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api';
import { t } from '../i18n';
import { useUserStore } from '../store/user';

const router = useRouter();
const store = useUserStore();

const code = ref('');
const verified = ref(false);
const email = ref('');
const username = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

async function verify() {
  error.value = '';
  if (!code.value) { error.value = '请输入测试码'; return; }
  loading.value = true;
  try {
    const { data } = await api.post('/api/auth/test-verify', { code: code.value });
    if (data.ok) verified.value = true;
    else error.value = data.message || '测试码错误';
  } catch (e) {
    error.value = (e.response && e.response.data && e.response.data.message) || '测试码错误';
  } finally { loading.value = false; }
}

async function create() {
  error.value = '';
  if (!email.value || !username.value || !password.value) {
    error.value = '请填写完整'; return;
  }
  if (password.value.length < 6) { error.value = '密码至少 6 位'; return; }
  loading.value = true;
  try {
    const { data } = await api.post('/api/auth/test-create', {
      code: code.value, email: email.value, username: username.value,
      password: password.value
    });
    store.setLogin(data.token, data.user, false);
    router.push('/choose-number');
  } catch (e) {
    error.value = (e.response && e.response.data && e.response.data.message) || '创建失败';
  } finally { loading.value = false; }
}
</script>

<style scoped>
.page { height: 100%; display: flex; align-items: center; justify-content: center; padding: 20px; background: transparent; }
.box { width: 100%; max-width: 400px; padding: 28px; display: flex; flex-direction: column; gap: 12px; }
h2 { text-align: center; color: var(--green); margin-bottom: 8px; font-size: 20px; }
.ok { color: var(--green); font-size: 13px; text-align: center; }
.back { text-align: center; font-size: 13px; cursor: pointer; color: var(--green); }
.error { color: var(--danger); font-size: 13px; text-align: center; }
</style>
