<template>
  <div class="terms-page">
    <div class="terms-card card">
      <div class="terms-head">
        <div>
          <div class="kicker">巨信 cheat</div>
          <h1>{{ doc.title || '用户协议、隐私政策与免责声明' }}</h1>
          <div class="meta">版本 {{ doc.version || 1 }} · 更新于 {{ doc.updatedAt || '2026-11-15' }}</div>
        </div>
        <button class="close" aria-label="返回" @click="goBack">×</button>
      </div>

      <div v-if="loading" class="state">正在加载条款…</div>
      <div v-else-if="error" class="state error">{{ error }}</div>
      <div v-else class="terms-body">
        <div class="summary">
          请认真阅读。禁止发布黄赌毒、诈骗、暴力、骚扰、侵权或其它违法违规内容；朋友圈文字和图片都会先审核再公开。
          网站由个人兴趣维护，用户应对自己的内容和行为负责。服务器实名登记人、域名购买人和网站作者不参与用户之间的交流、交易或纠纷，也不对用户行为承担连带责任；法律强制规定的责任除外。
        </div>
        <section v-for="(section, i) in doc.sections || []" :key="i" class="section">
          <h2>{{ section.title }}</h2>
          <p v-for="(p, j) in section.paragraphs || []" :key="j">{{ p }}</p>
        </section>
      </div>

      <div v-if="needsAccept" class="accept-box">
        <label class="check-line">
          <input v-model="agreed" type="checkbox" />
          <span>我已阅读并同意《用户协议》《隐私政策》和《免责声明》，并承诺不发布违法违规内容。</span>
        </label>
        <button class="btn accept-btn" :disabled="!agreed || accepting" @click="accept">
          {{ accepting ? '正在保存…' : '同意并继续使用' }}
        </button>
        <button class="btn-ghost btn logout-btn" @click="logout">不同意，退出登录</button>
      </div>
      <div v-else class="accept-box">
        <button class="btn accept-btn" @click="goBack">{{ store.token ? '返回巨信' : '返回登录' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api';
import { useUserStore } from '../store/user';

const router = useRouter();
const store = useUserStore();
const doc = ref({});
const loading = ref(true);
const error = ref('');
const agreed = ref(false);
const accepting = ref(false);
const needsAccept = computed(function () {
  return !!store.token && !!store.user && store.user.termsAccepted !== true;
});

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await api.get('/api/auth/terms');
    doc.value = data || {};
  } catch (e) {
    error.value = (e.response && e.response.data && e.response.data.message) || '条款加载失败，请检查网络后重试';
  } finally {
    loading.value = false;
  }
}

async function accept() {
  if (!agreed.value || accepting.value) return;
  accepting.value = true;
  error.value = '';
  try {
    const { data } = await api.post('/api/auth/accept-terms', { version: doc.value.version || 1 });
    store.setUser(data.user);
    router.replace(data.user && data.user.number ? '/home' : '/choose-number');
  } catch (e) {
    error.value = (e.response && e.response.data && e.response.data.message) || '保存失败，请重试';
  } finally {
    accepting.value = false;
  }
}

function goBack() {
  if (!store.token) router.push('/login');
  else if (needsAccept.value) router.push('/home');
  else router.back();
}

function logout() {
  store.logout();
  router.replace('/login');
}

onMounted(load);
</script>

<style scoped>
.terms-page { min-height: 100%; display: flex; justify-content: center; padding: 22px 14px; }
.terms-card { width: min(820px, 100%); padding: 22px; display: flex; flex-direction: column; gap: 16px; max-height: calc(100vh - 44px); }
.terms-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; }
.kicker { color: var(--green); font-size: 12px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
.terms-head h1 { margin: 5px 0 6px; font-size: clamp(21px, 4vw, 28px); line-height: 1.3; color: var(--text); }
.meta { color: var(--text-soft); font-size: 12px; }
.close { width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--glass-border); background: var(--glass-bg); color: var(--text-soft); font-size: 23px; flex-shrink: 0; }
.terms-body { overflow: auto; padding-right: 4px; line-height: 1.8; }
.summary { padding: 12px 14px; border-radius: 14px; background: var(--green-light); color: var(--green-dark); font-size: 14px; margin-bottom: 16px; }
.section { margin-bottom: 18px; }
.section h2 { font-size: 16px; margin-bottom: 7px; color: var(--text); }
.section p { margin: 0 0 8px; color: var(--text-soft); font-size: 14px; }
.accept-box { border-top: 1px solid var(--line); padding-top: 14px; display: flex; flex-direction: column; gap: 9px; }
.check-line { display: flex; align-items: flex-start; gap: 9px; font-size: 13px; color: var(--text); line-height: 1.65; cursor: pointer; }
.check-line input { margin-top: 4px; }
.accept-btn { width: 100%; padding: 12px; }
.logout-btn { width: 100%; }
.state { padding: 40px 10px; text-align: center; color: var(--text-soft); }
.state.error { color: var(--danger); }
@media (max-width: 560px) { .terms-page { padding: 0; } .terms-card { max-height: none; min-height: 100vh; border-radius: 0; padding: 18px; } }
</style>
