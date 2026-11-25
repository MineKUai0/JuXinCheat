<template>
  <Teleport to="body">
    <Transition name="pop">
      <div v-if="open" class="report-mask" @click.self="$emit('close')">
        <div class="report-card card">
          <div class="report-title">举报{{ type === 'user' ? '用户' : '朋友圈' }}</div>
          <div class="muted">{{ targetName }}</div>
          <select v-model="reason" class="field">
            <option>垃圾广告</option>
            <option>辱骂攻击</option>
            <option>色情低俗</option>
            <option>诈骗</option>
            <option>其他</option>
          </select>
          <textarea v-model="detail" class="field report-detail" maxlength="500"
                    placeholder="补充说明（选填，最多 500 字）"></textarea>
          <div class="report-actions">
            <button class="btn-ghost btn" :disabled="sending" @click="$emit('close')">取消</button>
            <button class="btn" :disabled="sending" @click="submit">{{ sending ? '提交中' : '提交举报' }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue';
import api from '../api';

const props = defineProps({
  open: Boolean,
  type: { type: String, default: 'user' },
  targetId: { type: String, default: '' },
  targetName: { type: String, default: '' }
});
const emit = defineEmits(['close']);

const reason = ref('垃圾广告');
const detail = ref('');
const sending = ref(false);

watch(() => props.open, function (v) {
  if (v) {
    reason.value = '垃圾广告';
    detail.value = '';
    sending.value = false;
  }
});

async function submit() {
  if (!props.targetId || sending.value) return;
  sending.value = true;
  try {
    await api.post('/api/report', {
      type: props.type,
      id: props.targetId,
      reason: reason.value,
      detail: detail.value
    });
    alert('举报已提交，等待管理员处理');
    emit('close');
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '举报失败');
  } finally {
    sending.value = false;
  }
}
</script>

<style scoped>
.report-mask { position: fixed; inset: 0; z-index: 400; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(18,32,24,.32); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
.report-card { width: min(380px, 100%); padding: 18px; display: flex; flex-direction: column; gap: 10px; border-radius: 18px; background: var(--glass-bg-strong); border: 1px solid var(--glass-border); box-shadow: var(--glass-shadow), var(--glass-highlight); backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur); }
.report-title { font-size: 17px; font-weight: var(--fw-semibold); }
.report-detail { min-height: 90px; resize: vertical; }
.report-actions { display: flex; justify-content: flex-end; gap: 8px; }
</style>
