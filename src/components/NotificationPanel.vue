<template>
  <div class="notify-page">
    <div class="notify-head card">
      <div>
        <div class="notify-title">通知</div>
        <div class="muted">点赞、评论和回复</div>
      </div>
      <button class="btn-ghost btn read-all press" :disabled="!unread" @click="markAll">
        {{ unread ? '全部已读' : '已全部读完' }}
      </button>
    </div>

    <div v-if="loading" class="empty card">加载中</div>
    <div v-else-if="!list.length" class="empty card">还没有通知</div>

    <TransitionGroup v-else name="list" tag="div" class="notify-list">
      <div v-for="n in list" :key="n._id" :class="['notice', 'card', { unread: !n.read }]" @click="open(n)">
        <div class="avatar small">
          <img v-if="n.actor && n.actor.avatar" :src="n.actor.avatar" />
          <span v-else>{{ ((n.actor && n.actor.username) || '?')[0] }}</span>
        </div>
        <div class="notice-body">
          <div class="notice-line">
            <span class="actor">{{ n.actor ? n.actor.username : '已注销用户' }}</span>
            {{ actionText(n) }}
          </div>
          <div v-if="n.content" class="snippet">{{ n.content }}</div>
          <div v-if="n.post" class="post-snippet">{{ postText(n.post) }}</div>
          <div class="notice-time">{{ timeText(n.createdAt) }}</div>
        </div>
        <span v-if="!n.read" class="unread-dot"></span>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api';
import { getSocket, connectSocket } from '../socket';

const router = useRouter();
const list = ref([]);
const unread = ref(0);
const loading = ref(true);
let socketRef = null;

function actionText(n) {
  if (n.type === 'like') return '赞了你的朋友圈';
  if (n.type === 'reply') return '回复了你的评论';
  return '评论了你的朋友圈';
}
function postText(post) {
  if (!post) return '';
  const text = (post.content || '').trim();
  if (text) return '朋友圈：' + (text.length > 60 ? text.slice(0, 60) + '…' : text);
  if (post.images && post.images.length) return '朋友圈：[图片]';
  return '';
}
function timeText(value) {
  const t = new Date(value).getTime();
  if (isNaN(t)) return '';
  const diff = Date.now() - t;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前';
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前';
  if (diff < 7 * 86400000) return Math.floor(diff / 86400000) + ' 天前';
  const d = new Date(value);
  return (d.getMonth() + 1) + '-' + d.getDate();
}

async function load(markRead) {
  loading.value = true;
  try {
    const { data } = await api.get('/api/notification', { params: { limit: 50 } });
    list.value = data.notifications || [];
    unread.value = data.unread || 0;
    if (markRead && unread.value) {
      await api.post('/api/notification/read');
      unread.value = 0;
      list.value = list.value.map(function (n) { return Object.assign({}, n, { read: true }); });
    }
  } catch (e) {
    list.value = [];
  } finally {
    loading.value = false;
  }
}

async function markAll() {
  try {
    await api.post('/api/notification/read');
    unread.value = 0;
    list.value = list.value.map(function (n) { return Object.assign({}, n, { read: true }); });
  } catch (e) {
    alert('操作失败');
  }
}

async function open(n) {
  if (!n) return;
  if (!n.read) {
    n.read = true;
    unread.value = Math.max(0, unread.value - 1);
    api.post('/api/notification/' + n._id + '/read').catch(function () {});
  }
  if (n.post && n.post._id) router.push('/post/' + n.post._id);
  else alert('朋友圈已删除');
}

function onNotification(n) {
  if (!n || !n._id) return;
  if (list.value.some(function (x) { return String(x._id) === String(n._id); })) return;
  const item = Object.assign({}, n, { read: true });
  list.value.unshift(item);
  api.post('/api/notification/' + n._id + '/read').catch(function () {});
}

onMounted(() => {
  load(true);
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  socketRef = getSocket() || (token ? connectSocket(token) : null);
  if (socketRef) socketRef.on('notification', onNotification);
});
onBeforeUnmount(() => {
  if (socketRef) socketRef.off('notification', onNotification);
});
</script>

<style scoped>
.notify-page { height: 100%; overflow: auto; display: flex; flex-direction: column; gap: 12px; padding-right: 4px; }
.notify-head { padding: 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.notify-title { font-size: var(--fs-lg); font-weight: var(--fw-semibold); letter-spacing: var(--tracking); }
.read-all { padding: 8px 14px; font-size: var(--fs-sm); white-space: nowrap; }
.empty { padding: 40px; text-align: center; color: var(--text-soft); font-size: 14px; }
.notify-list { display: flex; flex-direction: column; gap: 10px; position: relative; }
.notice { padding: 14px; display: flex; gap: 10px; align-items: flex-start; cursor: pointer; transition: background .18s ease, transform .18s ease; }
.notice:hover { background: rgba(255,255,255,.36); transform: translateY(-1px); }
.notice.unread { border-color: rgba(7,193,96,.45); }
.avatar.small { width: 36px; height: 36px; font-size: 14px; }
.notice-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.notice-line { font-size: var(--fs-base); line-height: var(--lh-snug); color: var(--text); }
.actor { font-weight: var(--fw-semibold); color: var(--green-dark); }
.snippet { font-size: var(--fs-sm); color: var(--text); background: rgba(255,255,255,.3); border-radius: 8px; padding: 5px 9px; word-break: break-word; }
.post-snippet { font-size: var(--fs-xs); color: var(--text-faint); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.notice-time { font-size: var(--fs-2xs); color: var(--text-faint); font-variant-numeric: tabular-nums; }
.unread-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--danger); flex-shrink: 0; margin-top: 6px; }
@media (max-width: 720px) {
  .notify-head { padding: 12px; }
  .notify-title { font-size: 18px; }
  .notice { padding: 12px; }
}
</style>
