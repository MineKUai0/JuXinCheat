<template>
  <div class="login-page">
    <Teleport to="body">
      <div v-if="policyOpen" class="policy-mask" role="dialog" aria-modal="true"
           aria-labelledby="policy-title">
        <div class="policy-dialog">
          <div class="policy-head">
            <div class="policy-kicker">注册前必须阅读并同意</div>
            <h2 id="policy-title">{{ policyDoc?.title || '用户协议、隐私政策与免责声明' }}</h2>
            <p>注册前请完整阅读以下规则。未勾选同意或选择拒绝，都不能创建账号。</p>
          </div>

          <div class="policy-summary">
            网站由个人兴趣维护，用户必须对自己发布、上传、发送的内容和行为负责。服务器实名登记人、域名购买人和网站作者不参与用户之间的交流、交易或纠纷，也不对用户行为承担连带责任；法律强制规定的责任除外。严禁发布黄赌毒、诈骗、暴力、骚扰、侵权或其它违法违规内容，朋友圈文字和图片都会先审核再公开。
          </div>

          <div v-if="policyLoading" class="policy-state">正在加载完整条款…</div>
          <div v-else-if="policyError" class="policy-state policy-error">
            <span>{{ policyError }}</span>
            <button class="btn-ghost btn" @click="loadPolicy">重新加载</button>
          </div>
          <div v-else class="policy-body">
            <section v-for="(section, i) in policyDoc?.sections || []" :key="i" class="policy-section">
              <h3>{{ section.title }}</h3>
              <p v-for="(paragraph, j) in section.paragraphs || []" :key="j">{{ paragraph }}</p>
            </section>
          </div>

          <div class="policy-foot">
            <label class="policy-check">
              <input v-model="policyChecked" type="checkbox" :disabled="!policyDoc" />
              <span>我已完整阅读并同意《用户协议》《隐私政策》和《免责声明》，理解并接受网站责任边界，承诺不发布违法违规内容。</span>
            </label>
            <div class="policy-actions">
              <button class="btn-ghost btn policy-reject" @click="rejectPolicy">拒绝</button>
              <button class="btn policy-allow" :disabled="!policyChecked || !policyDoc" @click="allowPolicy">
                允许并继续
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <div class="login-card card">
      <img src="/logo.png" class="brand-logo" alt="巨信 cheat 普通用户 logo" />
      <h1 class="app-title">{{ t('registerTitle') }}</h1>

      <input v-model="username" class="field" :placeholder="t('username')" />
      <input v-model="email" class="field" type="email" inputmode="email"
             :placeholder="t('email')" autocomplete="email" autocapitalize="off" spellcheck="false"
             @input="onEmailEdit" />

      <div class="code-row">
        <input v-model="code" class="field" :placeholder="t('verifyCode')" maxlength="16" />
        <button class="btn-ghost btn code-btn" :disabled="counting > 0 || sending" @click="sendCode">
          {{ sending ? '发送中' : (counting > 0 ? counting + 's' : t('sendCode')) }}
        </button>
      </div>

      <input v-model="password" type="password" class="field" :placeholder="t('passwordMinPlaceholder')"
             autocomplete="new-password" autocapitalize="off" autocorrect="off" spellcheck="false" />
      <input v-model="confirmPassword" type="password" class="field" placeholder="再次输入密码"
             autocomplete="new-password" autocapitalize="off" autocorrect="off" spellcheck="false" />

      <label class="terms-check">
        <input v-model="acceptedTerms" type="checkbox" />
        <span>我已阅读并同意<a href="/terms" target="_blank" rel="noopener">《用户协议、隐私政策与免责声明》</a></span>
      </label>

      <button class="btn login-btn" :disabled="loading || !acceptedTerms" @click="doRegister">
        {{ loading ? t('loading') : t('register') }}
      </button>

      <div class="links">
        <a @click="$router.push('/login')">{{ t('goLogin') }}</a>
      </div>

      <p v-if="tip" class="tip">{{ tip }}</p>
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

const username = ref('');
const email = ref('');
const code = ref('');
const password = ref('');
const confirmPassword = ref('');
const counting = ref(0);
const sending = ref(false);
const loading = ref(false);
const tip = ref('');
const error = ref('');
const acceptedTerms = ref(false);
const policyOpen = ref(true);
const policyChecked = ref(false);
const policyDoc = ref(null);
const policyLoading = ref(true);
const policyError = ref('');

async function loadPolicy() {
  policyLoading.value = true;
  policyError.value = '';
  try {
    const { data } = await api.get('/api/auth/terms');
    policyDoc.value = data || {};
  } catch (e) {
    policyDoc.value = null;
    policyError.value = (e.response && e.response.data && e.response.data.message) || '条款加载失败，请检查网络后重试';
  } finally {
    policyLoading.value = false;
  }
}

function rejectPolicy() {
  policyChecked.value = false;
  router.replace('/login');
}

function allowPolicy() {
  if (!policyChecked.value || !policyDoc.value) return;
  policyOpen.value = false;
}

async function sendCode() {
  error.value = ''; tip.value = '';
  if (!email.value) { error.value = '请先填邮箱'; return; }
  if (sending.value) return;
  sending.value = true;
  try {
    const { data } = await api.post('/api/auth/send-code', { email: email.value });
    if (data.devCode) tip.value = '【开发模式】验证码：' + data.devCode;
    else tip.value = '验证码已发送到邮箱';
    counting.value = 60;
    const timer = setInterval(() => {
      counting.value--;
      if (counting.value <= 0) clearInterval(timer);
    }, 1000);
  } catch (e) {
    error.value = (e.response && e.response.data && e.response.data.message) || '发送失败';
  } finally { sending.value = false; }
}

function onEmailEdit() {
  code.value = '';
  tip.value = '邮箱已修改，请重新获取验证码';
  error.value = '';
}

async function doRegister() {
  error.value = '';
  if (!username.value || !email.value || !code.value || !password.value || !confirmPassword.value) {
    error.value = '请填写完整'; return;
  }
  if (!acceptedTerms.value) { error.value = '请先阅读并同意用户协议、隐私政策与免责声明'; return; }
  if (password.value.length < 6) { error.value = t('passwordMin'); return; }
  if (password.value !== confirmPassword.value) { error.value = '两次输入的密码不一致'; return; }
  loading.value = true;
  try {
    const { data } = await api.post('/api/auth/register', {
      username: username.value, email: email.value, code: code.value,
      password: password.value, acceptedTerms: true
    });
    store.setLogin(data.token, data.user, false);
    alert('注册成功');
    router.push('/choose-number');
  } catch (e) {
    error.value = (e.response && e.response.data && e.response.data.message) || '注册失败';
  } finally { loading.value = false; }
}

onMounted(loadPolicy);
</script>

<style scoped>
.login-page { height: 100%; display: flex; align-items: center; justify-content: center; background: transparent; padding: 20px; }
.login-card { width: 100%; max-width: 380px; padding: 34px 28px; display: flex; flex-direction: column; gap: 14px; }
.brand-logo { width: 88px; height: 88px; display: block; margin: 0 auto 4px; border-radius: 24px; object-fit: cover; }
.app-title { text-align: center; font-size: var(--fs-xl); font-weight: 700; line-height: 1.2; letter-spacing: .02em; color: var(--green-dark); margin-bottom: 8px; }
.code-row { display: flex; gap: 8px; }
.code-row .field { flex: 1; }
.code-btn { white-space: nowrap; padding: 10px 12px; font-size: 13px; }
.login-btn { width: 100%; padding: 12px; font-size: 16px; }
.links { text-align: center; font-size: var(--fs-sm); line-height: var(--lh-snug); margin-top: 8px; }
.links a { cursor: pointer; color: var(--green-dark); font-weight: var(--fw-medium); }
.tip { color: var(--green); font-size: 13px; text-align: center; }
.error { color: var(--danger); font-size: 13px; text-align: center; }
.terms-check { display: flex; align-items: flex-start; gap: 8px; color: var(--text-soft); font-size: 12px; line-height: 1.55; cursor: pointer; }
.terms-check input { margin-top: 3px; }
.terms-check a { color: var(--green-dark); text-decoration: underline; }

.policy-mask {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(10, 16, 14, .72);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
.policy-dialog {
  width: min(920px, 100%);
  max-height: calc(100vh - 40px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(196, 224, 210, .92);
  border-radius: 28px;
  background: #f7faf7;
  box-shadow: 0 28px 80px rgba(0, 0, 0, .34);
}
.policy-head { flex-shrink: 0; padding: 24px 26px 14px; background: linear-gradient(180deg, #fff, #f2f9f4); }
.policy-kicker { color: var(--green-dark); font-size: 11px; font-weight: 800; letter-spacing: .16em; }
.policy-head h2 { margin: 7px 0 8px; color: var(--text); font-size: clamp(20px, 3vw, 28px); line-height: 1.3; }
.policy-head p { margin: 0; color: var(--text-soft); font-size: 13px; line-height: 1.65; }
.policy-summary {
  flex-shrink: 0;
  margin: 0 24px 14px;
  padding: 13px 15px;
  border: 1px solid rgba(7,193,96,.24);
  border-radius: 16px;
  background: rgba(7,193,96,.09);
  color: #164a32;
  font-size: 13px;
  line-height: 1.75;
  font-weight: 500;
}
.policy-body { min-height: 0; flex: 1; overflow: auto; padding: 0 25px 18px; overscroll-behavior: contain; }
.policy-section { margin-bottom: 16px; }
.policy-section h3 { margin: 0 0 6px; color: var(--text); font-size: 15px; }
.policy-section p { margin: 0 0 8px; color: #4d5c55; font-size: 13px; line-height: 1.78; }
.policy-state { min-height: 160px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 24px; color: var(--text-soft); font-size: 14px; }
.policy-error { color: var(--danger); text-align: center; }
.policy-foot { flex-shrink: 0; padding: 15px 24px 20px; border-top: 1px solid var(--line); background: rgba(255,255,255,.76); }
.policy-check { display: flex; align-items: flex-start; gap: 10px; color: var(--text); font-size: 13px; line-height: 1.65; cursor: pointer; }
.policy-check input { flex-shrink: 0; width: 18px; height: 18px; margin-top: 2px; accent-color: var(--green); }
.policy-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 14px; }
.policy-actions .btn { min-width: 118px; }
.policy-reject { color: var(--danger); }
.policy-allow:disabled { opacity: .45; cursor: not-allowed; }

@media (max-width: 560px) {
  .policy-mask { padding: 0; }
  .policy-dialog { width: 100%; height: 100%; max-height: none; border-radius: 0; border: 0; }
  .policy-head { padding: 20px 18px 12px; }
  .policy-summary { margin: 0 16px 12px; padding: 11px 13px; font-size: 12.5px; }
  .policy-body { padding: 0 18px 16px; }
  .policy-foot { padding: 13px 16px calc(16px + env(safe-area-inset-bottom)); }
  .policy-actions { flex-wrap: wrap; }
  .policy-actions .btn { flex: 1; min-width: 120px; }
}
</style>
