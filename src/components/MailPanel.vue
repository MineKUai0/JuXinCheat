<template>
  <div class="mail-page">
    <div class="mail-head">
      <div>
        <div class="eyebrow">巨信 CHEAT</div>
        <h1>邮箱</h1>
        <p>通知、好友申请、公告和在线用户都在这里。</p>
      </div>
      <div class="head-actions">
        <button v-if="isVip" class="btn-ghost btn small press" @click="toggleClassic">
          {{ user.classicDiscover ? '使用新版邮箱' : '切换经典发现页' }}
        </button>
        <button class="btn-ghost btn small press" :disabled="loading" @click="refreshAll">
          {{ loading ? '同步中' : '刷新' }}
        </button>
      </div>
    </div>

    <div class="tabs">
      <button v-for="item in tabs" :key="item.key"
              :class="['tab', { active: active === item.key }]"
              @click="selectTab(item.key)">
        {{ item.label }}
        <span v-if="item.badge" class="tab-badge">{{ item.badge > 99 ? '99+' : item.badge }}</span>
      </button>
    </div>

    <div v-if="active === 'inbox'" class="pane">
      <div class="pane-bar">
        <span class="muted">点赞、评论、回复和审核结果</span>
        <button class="text-btn" :disabled="!unread" @click="markAllRead">
          {{ unread ? '全部标为已读' : '已全部读完' }}
        </button>
      </div>
      <div v-if="loading && !inboxLoaded" class="empty">正在同步邮箱…</div>
      <div v-else-if="!notifications.length" class="empty">收件箱还是空的</div>
      <div v-else class="card-list">
        <div v-for="n in notifications" :key="n._id" :class="['notice', { unread: !n.read }]"
             @click="openNotification(n)">
          <div class="avatar small">
            <img v-if="n.actor && n.actor.avatar" :src="n.actor.avatar" />
            <span v-else>{{ ((n.actor && n.actor.username) || '?')[0] }}</span>
          </div>
          <div class="notice-main">
            <div class="notice-title">
              <span class="notice-actor">{{ notificationActor(n) }}</span>
              {{ notificationAction(n) }}
              <span v-if="!n.read" class="green-dot"></span>
            </div>
            <div v-if="n.content" class="notice-content">{{ n.content }}</div>
            <div v-if="n.post" class="notice-post">{{ postText(n.post) }}</div>
            <div class="muted notice-time">{{ timeText(n.createdAt) }}</div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="active === 'requests'" class="pane">
      <div v-if="!requests.length" class="empty">{{ t('noMails') }}</div>
      <div class="card-list">
        <div v-for="r in requests" :key="r._id" class="request-card">
          <button class="close" aria-label="忽略" @click="dismiss(r)">×</button>
          <div class="head">
            <div class="avatar">
              <img v-if="r.from.avatar" :src="r.from.avatar" />
              <span v-else>{{ (r.from.username || '?')[0] }}</span>
            </div>
            <div class="info">
              <div class="name">{{ r.from.username }}</div>
              <div class="muted">巨信号 {{ r.from.number || '未设置' }}</div>
            </div>
          </div>
          <div class="request-message">{{ t('friendRequest') }}</div>
          <div class="actions">
            <button class="btn ok press" @click="accept(r)">{{ t('accept') }}</button>
            <button class="btn-ghost btn press" @click="reject(r)">{{ t('reject') }}</button>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="active === 'announcements'" class="pane">
      <div v-if="isAdmin" class="publish-box">
        <input v-model="annTitle" class="field" maxlength="80" placeholder="公告标题（可选）" />
        <textarea v-model="annText" class="field area" maxlength="20000"
                  placeholder="输入公告内容，支持长文本和图片…"></textarea>
        <div class="publish-foot">
          <span class="muted">{{ annText.length }}/20000 · 图片 {{ annImages.length }}/9</span>
          <label class="btn-ghost btn image-add">
            添加图片
            <input type="file" accept="image/*" multiple hidden @change="addAnnImages" />
          </label>
          <button class="btn press" :disabled="(!annText.trim() && !annImages.length) || publishing" @click="publishAnn">
            {{ publishing ? '发布中' : '发布公告' }}
          </button>
        </div>
        <div v-if="annImages.length" class="image-editor">
          <div v-for="(img, i) in annImages" :key="i" class="image-thumb">
            <img :src="img" />
            <button aria-label="移除图片" @click="annImages.splice(i, 1)">×</button>
          </div>
        </div>
      </div>
      <div v-if="!anns.length" class="empty">暂无公告</div>
      <div class="card-list">
        <article v-for="a in anns" :key="a._id" class="ann-card">
          <div class="ann-title">{{ a.title || '系统公告' }}</div>
          <div class="ann-content">{{ a.content }}</div>
          <div v-if="a.images && a.images.length" class="ann-images">
            <img v-for="(img, i) in a.images" :key="i" :src="img" @click.stop="previewImg = img" />
          </div>
          <div class="ann-foot">
            <span class="muted">{{ fmt(a.createdAt) }}</span>
            <button v-if="isAdmin" class="btn-ghost btn small" @click="delAnn(a)">删除</button>
          </div>
        </article>
      </div>
    </div>

    <div v-else-if="active === 'online'" class="pane online-pane">
      <OnlinePanel mode="online" />
    </div>

    <div v-else class="pane">
      <div v-if="!blocked.length" class="empty">没有拉黑任何人</div>
      <div class="card-list">
        <div v-for="u in blocked" :key="u._id" class="block-row">
          <div class="avatar">
            <img v-if="u.avatar" :src="u.avatar" />
            <span v-else>{{ (u.username || '?')[0] }}</span>
          </div>
          <div class="item-info">
            <div class="item-name">{{ u.username }}</div>
            <div class="muted">巨信号 {{ u.number || '未设置' }}</div>
          </div>
          <button class="btn-ghost btn press" @click="unblock(u)">{{ t('unblock') }}</button>
        </div>
      </div>
    </div>

    <div v-if="previewImg" class="preview-mask" @click="previewImg = ''">
      <img :src="previewImg" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api';
import { t } from '../i18n';
import { useUserStore } from '../store/user';
import { getSocket } from '../socket';
import { readImageFile } from '../utils/image';
import OnlinePanel from './OnlinePanel.vue';

const router = useRouter();
const store = useUserStore();
const user = computed(() => store.user || {});
const isVip = computed(() => !!user.value.vipActive);
const isAdmin = computed(() => !!user.value.isAdmin);

const active = ref('inbox');
const loading = ref(false);
const inboxLoaded = ref(false);
const notifications = ref([]);
const unread = ref(0);
const requests = ref([]);
const blocked = ref([]);
const anns = ref([]);
const annTitle = ref('');
const annText = ref('');
const annImages = ref([]);
const publishing = ref(false);
const previewImg = ref('');

const tabs = computed(() => [
  { key: 'inbox', label: '收件箱', badge: unread.value },
  { key: 'requests', label: '好友申请', badge: requests.value.length },
  { key: 'announcements', label: '公告', badge: 0 },
  { key: 'online', label: '在线', badge: 0 },
  { key: 'blocked', label: '黑名单', badge: blocked.value.length }
]);

function fmt(value) {
  if (!value) return '';
  try { return new Date(value).toLocaleString(); } catch (e) { return value; }
}
function timeText(value) {
  const stamp = new Date(value).getTime();
  if (Number.isNaN(stamp)) return '';
  const diff = Date.now() - stamp;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前';
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前';
  if (diff < 7 * 86400000) return Math.floor(diff / 86400000) + ' 天前';
  return fmt(value);
}
function errMsg(e) {
  return (e.response && e.response.data && e.response.data.message) || '操作失败';
}
function notificationActor(n) {
  if (n.type === 'moderation_approved' || n.type === 'moderation_rejected') return '管理员';
  return (n.actor && n.actor.username) || '有人';
}
function notificationAction(n) {
  if (n.type === 'like') return '赞了你的朋友圈';
  if (n.type === 'reply') return '回复了你的评论';
  if (n.type === 'comment') return '评论了你的朋友圈';
  if (n.type === 'moderation_approved') return '通过了你的朋友圈审核';
  if (n.type === 'moderation_rejected') return '未通过你的朋友圈审核';
  return '发来一条通知';
}
function postText(post) {
  if (!post) return '';
  const text = String(post.content || '').trim();
  if (text) return '朋友圈：' + (text.length > 80 ? text.slice(0, 80) + '…' : text);
  if (post.images && post.images.length) return '朋友圈：[图片]';
  return '';
}

async function loadInbox() {
  const { data } = await api.get('/api/notification', { params: { limit: 100 } });
  notifications.value = data.notifications || [];
  unread.value = data.unread || 0;
  inboxLoaded.value = true;
}
async function loadRequests() {
  const { data } = await api.get('/api/friend/requests');
  requests.value = data.requests || [];
}
async function loadBlocked() {
  const { data } = await api.get('/api/friend/blocked');
  blocked.value = data.blocked || [];
}
async function loadAnns() {
  const { data } = await api.get('/api/admin/announcements');
  anns.value = data.announcements || [];
}

async function refreshAll() {
  if (loading.value) return;
  loading.value = true;
  const jobs = [loadInbox(), loadRequests(), loadBlocked(), loadAnns()];
  const results = await Promise.allSettled(jobs);
  if (results.every(function (r) { return r.status === 'rejected'; })) {
    alert('邮箱同步失败，请检查网络后重试');
  }
  loading.value = false;
}

function selectTab(key) {
  active.value = key;
  if (key === 'inbox') loadInbox().catch(function () {});
  if (key === 'requests') loadRequests().catch(function () {});
  if (key === 'blocked') loadBlocked().catch(function () {});
  if (key === 'announcements') loadAnns().catch(function () {});
}

async function markAllRead() {
  try {
    await api.post('/api/notification/read');
    unread.value = 0;
    notifications.value = notifications.value.map(function (n) { return Object.assign({}, n, { read: true }); });
  } catch (e) { alert(errMsg(e)); }
}

async function openNotification(n) {
  if (!n) return;
  if (!n.read) {
    n.read = true;
    unread.value = Math.max(0, unread.value - 1);
    api.post('/api/notification/' + n._id + '/read').catch(function () {});
  }
  if (n.post && n.post._id) router.push('/post/' + n.post._id);
  else alert('这条朋友圈已经不存在');
}

async function accept(r) {
  try {
    await api.post('/api/friend/accept', { id: r._id });
    requests.value = requests.value.filter(function (x) { return x._id !== r._id; });
  } catch (e) { alert(errMsg(e)); }
}
async function reject(r) {
  try {
    await api.post('/api/friend/reject', { id: r._id });
    requests.value = requests.value.filter(function (x) { return x._id !== r._id; });
  } catch (e) { alert(errMsg(e)); }
}
async function dismiss(r) {
  if (!confirm('忽略这条好友申请？')) return;
  await reject(r);
}
async function unblock(u) {
  try {
    await api.post('/api/friend/unblock', { id: u._id });
    blocked.value = blocked.value.filter(function (x) { return x._id !== u._id; });
  } catch (e) { alert(errMsg(e)); }
}

async function addAnnImages(e) {
  const files = Array.from(e.target.files || []);
  e.target.value = '';
  for (const file of files) {
    if (annImages.value.length >= 9) { alert('最多 9 张公告图片'); break; }
    try {
      annImages.value.push(await readImageFile(file, { maxSize: 1400, quality: 0.8 }));
    } catch (err) { alert(err.message || '图片读取失败'); }
  }
}
async function publishAnn() {
  if (publishing.value) return;
  if (!annText.value.trim() && !annImages.value.length) return;
  publishing.value = true;
  try {
    await api.post('/api/admin/announcement', {
      title: annTitle.value.trim(),
      content: annText.value,
      images: annImages.value
    });
    annTitle.value = '';
    annText.value = '';
    annImages.value = [];
    await loadAnns();
  } catch (e) { alert(errMsg(e)); }
  finally { publishing.value = false; }
}
async function delAnn(a) {
  if (!confirm('删除此公告？')) return;
  try {
    await api.delete('/api/admin/announcement/' + a._id);
    await loadAnns();
  } catch (e) { alert(errMsg(e)); }
}

async function toggleClassic() {
  try {
    const { data } = await api.put('/api/user/preferences', {
      classicDiscover: !user.value.classicDiscover
    });
    store.setUser(data.user);
    alert(data.user.classicDiscover ? '已开启经典发现页，左侧菜单会恢复在线和通知入口。' : '已切换回新版邮箱聚合界面。');
  } catch (e) { alert(errMsg(e)); }
}

function onIncomingNotification(n) {
  if (!n || !n._id) return;
  if (notifications.value.some(function (x) { return String(x._id) === String(n._id); })) return;
  notifications.value.unshift(Object.assign({}, n, { read: true }));
  api.post('/api/notification/' + n._id + '/read').catch(function () {});
}
function onFriendRequest() {
  loadRequests().catch(function () {});
}

onMounted(() => {
  refreshAll();
  const socket = getSocket();
  if (socket) {
    socket.on('notification', onIncomingNotification);
    socket.on('friend-request', onFriendRequest);
  }
});
onBeforeUnmount(() => {
  const socket = getSocket();
  if (socket) {
    socket.off('notification', onIncomingNotification);
    socket.off('friend-request', onFriendRequest);
  }
});
</script>

<style scoped>
.mail-page { height: 100%; overflow: auto; display: flex; flex-direction: column; gap: 12px; padding-right: 4px; }
.mail-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; padding: 18px 20px; border: 1px solid var(--glass-border); border-radius: 22px; background: var(--glass-bg-strong); box-shadow: var(--glass-shadow), var(--glass-highlight); backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur); }
.eyebrow { color: var(--green); font-size: 10px; font-weight: 800; letter-spacing: .16em; }
.mail-head h1 { margin: 3px 0 4px; font-size: clamp(24px, 4vw, 32px); letter-spacing: .04em; }
.mail-head p { margin: 0; color: var(--text-soft); font-size: 13px; line-height: 1.5; }
.head-actions { display: flex; gap: 7px; flex-wrap: wrap; justify-content: flex-end; }
.tabs { display: flex; gap: 7px; flex-wrap: wrap; }
.tab { border: 1px solid var(--glass-border); border-radius: 999px; padding: 8px 13px; background: var(--glass-bg); color: var(--text-soft); font: inherit; font-size: 12px; cursor: pointer; transition: all .18s ease; }
.tab.active { color: #fff; border-color: transparent; background: linear-gradient(135deg, #0aa95a, var(--green)); box-shadow: 0 5px 14px rgba(7,193,96,.24); }
.tab-badge { display: inline-flex; min-width: 17px; height: 17px; align-items: center; justify-content: center; margin-left: 4px; padding: 0 5px; border-radius: 999px; background: var(--danger); color: #fff; font-size: 9px; vertical-align: 1px; }
.tab.active .tab-badge { background: rgba(0,0,0,.24); }
.pane { display: flex; flex-direction: column; gap: 10px; min-height: 220px; }
.pane-bar { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 3px 3px 1px; font-size: 12px; }
.text-btn { border: 0; background: transparent; color: var(--green-dark); font: inherit; font-size: 12px; cursor: pointer; }
.text-btn:disabled { color: var(--text-faint); }
.empty { text-align: center; color: var(--text-soft); padding: 46px 20px; font-size: 14px; }
.card-list { display: flex; flex-direction: column; gap: 9px; }
.notice, .request-card, .ann-card, .block-row { border: 1px solid var(--glass-border); background: var(--glass-bg-strong); box-shadow: var(--glass-highlight); backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur); border-radius: 17px; }
.notice { display: flex; gap: 11px; padding: 13px 14px; cursor: pointer; transition: transform .18s ease, box-shadow .18s ease; }
.notice:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(18,48,31,.1); }
.notice.unread { border-color: rgba(7,193,96,.34); background: linear-gradient(135deg, rgba(7,193,96,.085), var(--glass-bg-strong)); }
.avatar { width: 44px; height: 44px; font-size: 17px; }
.avatar.small { width: 36px; height: 36px; font-size: 14px; flex-shrink: 0; }
.notice-main { flex: 1; min-width: 0; }
.notice-title { color: var(--text); font-size: 13px; line-height: 1.5; }
.notice-actor { color: var(--green-dark); font-weight: 650; margin-right: 4px; }
.notice-content { margin-top: 4px; padding: 7px 9px; border-radius: 9px; background: var(--green-light); font-size: 12px; line-height: 1.55; word-break: break-word; }
.notice-post { margin-top: 4px; color: var(--text-soft); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.notice-time { margin-top: 4px; font-size: 10px; }
.green-dot { display: inline-block; width: 7px; height: 7px; margin-left: 5px; border-radius: 50%; background: var(--green); vertical-align: 1px; }
.request-card { position: relative; padding: 15px; }
.head { display: flex; align-items: center; gap: 11px; }
.info { flex: 1; }
.info .name, .item-name { font-weight: 650; font-size: 14px; }
.request-message { margin: 13px 0; font-size: 13px; }
.actions { display: flex; gap: 8px; }
.actions .btn, .actions .btn-ghost { flex: 1; padding: 8px; }
.close { position: absolute; right: 9px; top: 6px; border: 0; background: transparent; color: var(--text-soft); font-size: 22px; cursor: pointer; }
.publish-box { display: flex; flex-direction: column; gap: 8px; padding: 14px; border: 1px solid var(--glass-border); border-radius: 17px; background: var(--glass-bg-strong); }
.area { min-height: 120px; resize: vertical; }
.publish-foot, .ann-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.image-add { position: relative; overflow: hidden; cursor: pointer; }
.image-editor, .ann-images { display: grid; grid-template-columns: repeat(auto-fill, minmax(76px, 1fr)); gap: 6px; }
.image-thumb { position: relative; aspect-ratio: 1; overflow: hidden; border-radius: 10px; }
.image-thumb img, .ann-images img { width: 100%; height: 100%; object-fit: cover; display: block; }
.image-thumb button { position: absolute; right: 3px; top: 3px; border: 0; border-radius: 50%; width: 21px; height: 21px; background: rgba(0,0,0,.55); color: #fff; cursor: pointer; }
.ann-card { padding: 15px; }
.ann-title { margin-bottom: 7px; font-size: 16px; font-weight: 700; }
.ann-content { white-space: pre-wrap; word-break: break-word; line-height: 1.75; font-size: 13px; }
.ann-images { margin-top: 10px; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.ann-images img { aspect-ratio: 1; border-radius: 10px; cursor: zoom-in; }
.ann-foot { margin-top: 10px; }
.block-row { display: flex; align-items: center; gap: 11px; padding: 12px 14px; }
.item-info { flex: 1; min-width: 0; }
.online-pane { min-height: 380px; }
.preview-mask { position: fixed; inset: 0; z-index: 600; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(0,0,0,.88); }
.preview-mask img { max-width: 94vw; max-height: 92vh; object-fit: contain; border-radius: 9px; }
.btn.small, .btn-ghost.small { padding: 6px 10px; font-size: 11px; }
@media (max-width: 620px) {
  .mail-head { padding: 14px; border-radius: 18px; flex-direction: column; }
  .head-actions { justify-content: flex-start; }
  .tab { padding: 7px 10px; font-size: 11px; }
  .notice { padding: 11px; }
  .avatar { width: 38px; height: 38px; font-size: 15px; }
}
</style>
