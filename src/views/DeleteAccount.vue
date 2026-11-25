<template>
  <div class="page">
    <div class="topbar">
      <span class="back" @click="$router.back()">返回</span>
      <span class="title">巨信 cheat 注销</span>
      <span style="width:40px"></span>
    </div>

    <div class="content">
      <div class="card box">
        <p class="warning">
          提交后需要管理员审核。审核通过后，你的账号和所有朋友圈、好友、聊天记录都会被删除，无法恢复。
        </p>

        <input v-model="number" class="field" placeholder="请输入你的编号" maxlength="16" />
        <textarea v-model="reason" class="field area" placeholder="请填写注销原因" maxlength="500"></textarea>

        <button class="btn submit" :disabled="loading || pending || !number.trim() || !reason.trim()" @click="submit">
          {{ loading ? '提交中…' : (pending ? '等待管理员审核' : '提交注销申请') }}
        </button>

        <p v-if="statusText" class="status">{{ statusText }}</p>
        <p v-if="error" class="error">{{ error }}</p>
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
const number = ref('');
const reason = ref('');
const loading = ref(false);
const error = ref('');
const latest = ref(null);
const pending = computed(() => latest.value && latest.value.status === 'pending');
const statusText = computed(() => {
  if (!latest.value) return '';
  if (latest.value.status === 'pending') return '已提交，等待管理员审核';
  if (latest.value.status === 'rejected') return '上次申请已被拒绝，可以重新提交';
  return '';
});

onMounted(async () => {
  if (store.user && store.user.isAdmin) {
    alert('伟大的王，我们不能没有您当领袖');
    router.replace('/home');
    return;
  }
  try {
    const { data } = await api.get('/api/user/delete-request');
    latest.value = data.request || null;
  } catch (e) {}
});

async function submit() {
  error.value = '';
  if (!number.value.trim()) { error.value = '请输入你的编号'; return; }
  if (!reason.value.trim()) { error.value = '请填写注销原因'; return; }
  loading.value = true;
  try {
    const { data } = await api.post('/api/user/delete-request', {
      number: number.value.trim(),
      reason: reason.value.trim()
    });
    latest.value = data.request;
    alert('已提交，等待管理员审核');
  } catch (e) {
    const resp = e.response && e.response.data;
    if (resp && resp.admin) {
      alert(resp.message || '伟大的王，我们不能没有您当领袖');
      router.replace('/home');
      return;
    }
    error.value = (resp && resp.message) || '提交失败';
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
.box { width: 100%; max-width: 460px; padding: 20px; display: flex; flex-direction: column; gap: 12px; }
.warning { font-size: 13px; line-height: 1.7; color: var(--danger); background: rgba(229,77,66,.08); border: 1px solid rgba(229,77,66,.22); border-radius: 12px; padding: 10px 12px; }
.area { min-height: 120px; resize: vertical; }
.submit { width: 100%; background: linear-gradient(180deg, #ef6a63, #e5484d); box-shadow: 0 6px 18px rgba(229,77,66,.28), inset 0 1px 0 rgba(255,255,255,.45); }
.submit:disabled { opacity: .5; }
.status { font-size: 13px; color: var(--green-dark); text-align: center; }
.error { font-size: 13px; color: var(--danger); text-align: center; }
</style>
