<template>
  <div class="home">
    <aside class="sidebar">
      <div class="user-info press" @click="$router.push('/profile/' + (user && user.id))">
        <div class="avatar">
          <img v-if="user && user.avatar" :src="user.avatar" />
          <span v-else>{{ (user && user.username || '?')[0] }}</span>
        </div>
        <div class="name">{{ user && user.username }}</div>
        <div class="num">{{ user && user.number }}</div>
      </div>

      <nav class="nav">
        <div v-for="item in menus" :key="item.key"
             :class="['nav-item', { active: current === item.key }]"
             @click="selectMenu(item.key)">
          {{ item.label }}
          <span v-if="item.key === 'chat' && chatDot" class="menu-dot"></span>
          <span v-if="item.key === 'mail' && mailDot" class="menu-dot"></span>
          <span v-if="item.key === 'notify' && notifyDot" class="menu-dot"></span>
        </div>
        <div v-if="isAdmin" class="nav-item admin" @click="$router.push('/admin')">管理</div>
      </nav>

      <div class="bottom">
        <div class="lang">
          <span @click="changeLang('zh')" :class="{ on: lang === 'zh' }">中</span>
          <span @click="changeLang('en')" :class="{ on: lang === 'en' }">EN</span>
        </div>
        <a @click="settingsOpen = true">{{ t('settings') }}</a>
        <a @click="logout">{{ t('logout') }}</a>
        <a @click="$router.push('/change-password')">{{ t('changePassword') }}</a>
        <a class="delete-account" @click="$router.push('/delete-account')">{{ t('deleteAccount') }}</a>
      </div>
    </aside>

    <main class="main">
      <transition name="rise" mode="out-in">
        <ChatPanel v-if="current === 'chat'" key="chat" />
        <ContactsPanel v-else-if="current === 'contacts'" key="contacts"
                       @open-chat="openChatFromContacts" @go-chat="selectMenu('chat')" @go-mail="selectMenu('mail')" />
        <PostsPanel v-else-if="current === 'posts'" key="posts" />
        <FavoritesPanel v-else-if="current === 'favorites'" key="favorites" />
        <MailPanel v-else-if="current === 'mail'" key="mail" />
        <OnlinePanel v-else-if="current === 'online'" key="online" mode="online" />
        <NotificationPanel v-else-if="current === 'notify'" key="notify" />
      </transition>
    </main>

    <Transition name="rise">
      <div v-if="toast" class="toast" @click="goToast">{{ toast }}</div>
    </Transition>

    <SettingsDialog :open="settingsOpen" @close="settingsOpen = false" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api';
import { t, setLang, i18nState } from '../i18n';
import { useUserStore } from '../store/user';
import { connectSocket, closeSocket } from '../socket';
import { uiState } from '../store/uiState';
import ChatPanel from '../components/ChatPanel.vue';
import ContactsPanel from '../components/ContactsPanel.vue';
import PostsPanel from '../components/PostsPanel.vue';
import FavoritesPanel from '../components/FavoritesPanel.vue';
import MailPanel from '../components/MailPanel.vue';
import OnlinePanel from '../components/OnlinePanel.vue';
import NotificationPanel from '../components/NotificationPanel.vue';
import SettingsDialog from '../components/SettingsDialog.vue';

const router = useRouter();
const store = useUserStore();
const user = computed(() => store.user);
const isAdmin = computed(() => user.value && user.value.isAdmin);
const current = ref('chat');
const lang = computed(() => i18nState.lang);
const chatDot = ref(false);
const mailDot = ref(false);
const notifyDot = ref(false);
const toast = ref('');
const settingsOpen = ref(false);
const toastTarget = ref('mail');
let toastTimer = null;
let socketRef = null;

function showToast(text, target) {
  toast.value = text;
  toastTarget.value = target || 'mail';
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { toast.value = ''; }, 4000);
}

function goMail() {
  current.value = 'mail';
  uiState.homeTab = 'mail';
  mailDot.value = false;
  toast.value = '';
}

function goToast() {
  if (toastTarget.value === 'chat') {
    selectMenu('chat');
    toast.value = '';
  } else if (toastTarget.value === 'notify') {
    selectMenu(isClassic.value ? 'notify' : 'mail');
    toast.value = '';
  } else {
    goMail();
  }
}

function selectMenu(key) {
  current.value = key;
  uiState.homeTab = key;
  if (key === 'chat') chatDot.value = false;
  if (key === 'mail') {
    mailDot.value = false;
    setTimeout(loadFriendRequests, 1200);
  }
  if (key === 'notify') notifyDot.value = false;
}

async function loadFriendRequests() {
  try {
    const { data } = await api.get('/api/friend/requests');
    if (data.requests && data.requests.length) {
      mailDot.value = true;
      showToast(t('newFriendToast'));
    }
  } catch (e) {}
}

function onFriendRequest(d) {
  const name = d && d.from && d.from.username ? d.from.username : '';
  showToast((name ? name + '：' : '') + t('newFriendToast'));
  mailDot.value = true;
}

function onFriendAccepted() {
  showToast('对方已同意你的好友申请');
}

function notificationText(n) {
  if (!n) return '有新通知';
  const name = n.actor && n.actor.username ? n.actor.username : '有人';
  if (n.type === 'like') return name + ' 赞了你的朋友圈';
  if (n.type === 'reply') return name + ' 回复了你的评论';
  if (n.type === 'comment') return name + ' 评论了你的朋友圈';
  if (n.type === 'moderation_approved') return '你的朋友圈已通过审核并公开';
  if (n.type === 'moderation_rejected') return '你的朋友圈未通过审核，请到邮箱查看原因';
  return '有新通知';
}
function onNotification(n) {
  if (!n) return;
  if (isClassic.value && current.value !== 'notify') {
    notifyDot.value = true;
    showToast(notificationText(n), 'notify');
  } else if (!isClassic.value && current.value !== 'mail') {
    mailDot.value = true;
    showToast(notificationText(n), 'mail');
  }
}

function isMuted(list, id) {
  return (list || []).some(function (x) { return String(x) === String(id); });
}

function onChatMessage(m) {
  if (!m || !m.from) return;
  if (String(m.from) === store.myId) return;
  if (current.value === 'chat') return;
  if (isMuted(uiState.mutedPeerIds, m.from)) return;
  chatDot.value = true;
  showToast(t('newMessageToast'), 'chat');
}

function onChatGroupMessage(m) {
  if (!m || !m.from || !m.group) return;
  if (String(m.from) === store.myId) return;
  if (current.value === 'chat') return;
  if (isMuted(uiState.mutedGroupIds, m.group)) return;
  chatDot.value = true;
  showToast(t('newMessageToast'), 'chat');
}

async function loadNotificationDot() {
  try {
    const { data } = await api.get('/api/notification', { params: { limit: 1 } });
    notifyDot.value = (data.unread || 0) > 0;
    if (!isClassic.value && notifyDot.value) mailDot.value = true;
  } catch (e) {}
}

const isClassic = computed(() => !!(user.value && user.value.vipActive && user.value.classicDiscover));
const menus = computed(() => {
  const items = [
    { key: 'chat', label: t('chat') },
    { key: 'contacts', label: t('contacts') },
    { key: 'posts', label: t('posts') },
    { key: 'favorites', label: t('favorites') },
    { key: 'mail', label: t('mail') }
  ];
  if (isClassic.value) {
    items.push({ key: 'online', label: t('online') });
    items.push({ key: 'notify', label: t('notify') });
  }
  return items;
});

watch(isClassic, function (classic) {
  if (!classic && (current.value === 'online' || current.value === 'notify')) {
    selectMenu('mail');
  }
  if (classic && current.value === 'mail') {
    // 切回经典发现页时保留邮箱，用户仍可从左侧进入在线和通知。
    notifyDot.value = false;
  }
});

function openChatFromContacts(target) {
  if (!target || !target.id) return;
  uiState.pendingChat = { id: String(target.id), isGroup: !!target.isGroup, name: target.name || '' };
  selectMenu('chat');
}

function changeLang(l) { setLang(l); }

function logout() {
  if (confirm(t('confirmLogout'))) {
    closeSocket();
    store.logout();
    router.push('/login');
  }
}

onMounted(() => {
  uiState.homeTab = current.value;
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (token) {
    socketRef = connectSocket(token);
    socketRef.on('friend-request', onFriendRequest);
    socketRef.on('friend-accepted', onFriendAccepted);
    socketRef.on('notification', onNotification);
    socketRef.on('message', onChatMessage);
    socketRef.on('group-message', onChatGroupMessage);
  }
  store.refresh().catch(() => {});
  loadFriendRequests();
  loadNotificationDot();
});

onBeforeUnmount(() => {
  uiState.homeTab = '';
  if (socketRef) {
    socketRef.off('friend-request', onFriendRequest);
    socketRef.off('friend-accepted', onFriendAccepted);
    socketRef.off('notification', onNotification);
    socketRef.off('message', onChatMessage);
    socketRef.off('group-message', onChatGroupMessage);
  }
  if (toastTimer) clearTimeout(toastTimer);
});
</script>

<style scoped>
.home { display: flex; height: 100%; background: var(--bg); }
.sidebar { width: 160px; background: rgba(255,255,255,.2); border-right: 1px solid var(--glass-border); display: flex; flex-direction: column; padding: 16px 0; backdrop-filter: blur(32px) saturate(175%); -webkit-backdrop-filter: blur(32px) saturate(175%); box-shadow: 8px 0 32px rgba(18,48,31,.07); }
.user-info { text-align: center; padding: 0 12px 16px; border-bottom: 1px solid var(--line); cursor: pointer; }
.user-info .avatar { width: 48px; height: 48px; margin: 0 auto 8px; font-size: 20px; }
.user-info .avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
.user-info .name { font-size: var(--fs-base); font-weight: var(--fw-semibold); letter-spacing: var(--tracking); }
.user-info .num { font-size: var(--fs-xs); color: var(--text-soft); font-variant-numeric: tabular-nums; }
.nav { flex: 1; padding: 10px 0; }
.nav-item { padding: 12px 24px; font-size: var(--fs-base); font-weight: var(--fw-medium); color: var(--green-dark); cursor: pointer; transition: background .18s ease, padding-left .18s ease; }
.nav-item:hover { background: var(--green-light); padding-left: 28px; }
.nav-item.active { background: var(--green-light); font-weight: var(--fw-semibold); border-right: 3px solid var(--green); }
.nav-item.admin { color: #d97706; }
.bottom { padding: 10px 16px; display: flex; flex-direction: column; gap: 8px; align-items: center; }
.bottom a { font-size: var(--fs-sm); line-height: var(--lh-snug); color: var(--text-soft); font-weight: var(--fw-medium); cursor: pointer; }
.bottom .delete-account { color: var(--danger); }
.lang { display: flex; gap: 8px; font-size: 12px; }
.lang span { cursor: pointer; padding: 2px 8px; border-radius: 10px; color: var(--text-soft); background: var(--bg); transition: all .18s ease; }
.lang span.on { background: var(--green); color: #fff; }
.main { flex: 1; padding: 16px; overflow: hidden; }
.menu-dot { display: inline-block; width: 8px; height: 8px; margin-left: 6px; border-radius: 50%; background: var(--danger); vertical-align: middle; animation: dotPulse 1.6s infinite; }
@keyframes dotPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(229,77,66,.5); } 50% { box-shadow: 0 0 0 4px rgba(229,77,66,0); } }
.toast { position: fixed; right: 22px; bottom: 22px; background: var(--glass-bg-strong); color: var(--text); border: 1px solid var(--glass-border); border-left: 4px solid var(--green); box-shadow: var(--glass-shadow); backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur); padding: 12px 18px; border-radius: 14px; font-size: 14px; line-height: 1.5; font-weight: var(--fw-medium); cursor: pointer; z-index: 300; max-width: 320px; }
.toast:hover { background: var(--green-light); }

@media (max-width: 720px) {
  .home { flex-direction: column; }
  .sidebar {
    width: 100%; flex-direction: row; flex-wrap: wrap; align-items: center;
    padding: 6px 8px; border-right: none; border-bottom: 1px solid var(--glass-border);
    gap: 4px;
  }
  .user-info {
    order: 1;
    display: flex; align-items: center; gap: 6px; flex-shrink: 0;
    padding: 0 6px 0 0; border-bottom: none; text-align: left;
  }
  .user-info .avatar { width: 34px; height: 34px; margin: 0; font-size: 15px; }
  .user-info .name, .user-info .num { display: none; }
  .nav {
    order: 3; display: flex; flex: 0 0 100%; width: 100%; padding: 3px 0 0;
    justify-content: space-around; gap: 2px; overflow-x: auto; scrollbar-width: none;
  }
  .nav::-webkit-scrollbar { display: none; }
  .nav-item { flex-shrink: 0; padding: 6px 8px; font-size: 12.5px; border-radius: 10px; white-space: nowrap; }
  .nav-item:hover { padding-left: 8px; background: transparent; }
  .nav-item.active { border-right: none; border-bottom: none; background: var(--green-light); box-shadow: inset 0 0 0 1px rgba(7, 193, 96, .16); }
  .bottom { order: 2; flex-direction: row; align-items: center; padding: 0; gap: 5px; margin-left: auto; flex-shrink: 0; }
  .bottom a { font-size: 10.5px; line-height: 1.2; white-space: nowrap; }
  .lang { display: none; }
  .main { padding: 8px; }
  .toast { right: 12px; bottom: 12px; left: 12px; max-width: none; }
}

@media (max-width: 380px) {
  .lang { display: none; }
  .nav-item { padding: 6px 5px; font-size: 12px; }
  .bottom { gap: 4px; padding: 0; }
  .bottom a { font-size: 10.5px; }
  .user-info .avatar { width: 30px; height: 30px; }
}
</style>
