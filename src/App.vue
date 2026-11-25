<template>
  <router-view v-slot="{ Component }">
    <transition name="page" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<script setup>
import { watch, onMounted, onBeforeUnmount } from 'vue';
import { closeSocket, connectSocket, getSocket } from './socket';
import { installNotify, notifyNewMessage } from './utils/notify';
import { useUserStore } from './store/user';
import { uiState } from './store/uiState';
import { applyVipTheme } from './utils/vipTheme';
import { prefs } from './utils/prefs';

const store = useUserStore();
let globalSocket = null;

function onGlobalMessage(m) {
  if (!m || !m.from) return;
  if (String(m.from) === String(store.myId)) return;
  if (uiState.mutedPeerIds.includes(String(m.from))) return;
  // 正在首页聊天标签、正开着这个会话、页面也可见时不打扰
  const viewing = window.location.pathname === '/home' &&
    uiState.homeTab === 'chat' &&
    uiState.activeChatId === String(m.from) &&
    !uiState.oldContext &&
    !document.hidden;
  if (!viewing) notifyNewMessage();
}

function onGlobalGroupMessage(m) {
  if (!m || !m.group || !m.from) return;
  if (String(m.from) === String(store.myId)) return;
  if (uiState.mutedGroupIds.includes(String(m.group))) return;
  const viewing = window.location.pathname === '/home' &&
    uiState.homeTab === 'chat' &&
    uiState.activeGroupId === String(m.group) &&
    !uiState.oldContext &&
    !document.hidden;
  if (!viewing) notifyNewMessage();
}

function onGlobalNotification(n) {
  if (!n) return;
  const viewing = window.location.pathname === '/home' &&
    uiState.homeTab === 'notify' &&
    !document.hidden;
  if (!viewing) notifyNewMessage();
}

function onVipChanged(d) {
  if (!d || !store.user) return;
  const wasVip = !!store.user.vipActive;
  const next = Object.assign({}, store.user, {
    vipActive: !!d.vipActive,
    vipSince: d.vipSince || null,
    badges: Array.isArray(d.badges) ? d.badges : store.user.badges
  });
  store.setUser(next);
  applyVipTheme(next);
  if (!wasVip && next.vipActive) {
    alert('您是尊贵的黑金VIP，欢迎您使用巨信cheat');
  }
}

function onTitlesChanged(d) {
  if (!d || !d.user || !store.user) return;
  const changedId = String(d.user.id || d.user._id || '');
  if (changedId !== String(store.myId)) return;
  store.setUser(Object.assign({}, store.user, d.user));
}

function bindSocket(token) {
  if (!token) {
    closeSocket();
    globalSocket = null;
    uiState.mutedPeerIds = [];
    uiState.mutedGroupIds = [];
    return;
  }
  const s = getSocket() || connectSocket(token);
  if (globalSocket === s) return;
  if (globalSocket) {
    globalSocket.off('message', onGlobalMessage);
    globalSocket.off('group-message', onGlobalGroupMessage);
    globalSocket.off('notification', onGlobalNotification);
    globalSocket.off('vip-changed', onVipChanged);
    globalSocket.off('titles-changed', onTitlesChanged);
  }
  globalSocket = s;
  s.on('message', onGlobalMessage);
  s.on('group-message', onGlobalGroupMessage);
  s.on('notification', onGlobalNotification);
  s.on('vip-changed', onVipChanged);
  s.on('titles-changed', onTitlesChanged);
}

// App 生命周期内只保留一个全局 Socket 监听，所有页面都能收到新消息提醒
watch(() => store.token, bindSocket, { immediate: true });
watch(() => store.user && store.user.vipActive, function (vipActive) {
  applyVipTheme(vipActive ? store.user : null);
}, { immediate: true });
watch(() => prefs.vipClassicUi, function () {
  applyVipTheme(store.user);
});

function onForceLogout(e) {
  const reason = e && e.detail && e.detail.reason;
  // 改密/重置页面已经先退出登录时，不再重复提示和跳转
  const hasToken = !!(localStorage.getItem('token') || sessionStorage.getItem('token'));
  if (reason === 'password' && !hasToken) {
    closeSocket();
    return;
  }
  if (reason === 'banned') alert('你的账号已被封禁');
  else if (reason === 'deleted') alert('你的账号已被删除');
  else if (reason === 'password') {
    if (window.location.pathname !== '/change-password' && window.location.pathname !== '/forgot-password') {
      alert('密码已修改，请重新登录');
    }
  }
  else alert('您的账号已在别处登录');
  closeSocket();
  store.logout();
  window.location.href = '/emergency';
}

onMounted(() => {
  installNotify();
  window.addEventListener('jx-force-logout', onForceLogout);
});
onBeforeUnmount(() => {
  window.removeEventListener('jx-force-logout', onForceLogout);
  if (globalSocket) {
    globalSocket.off('message', onGlobalMessage);
    globalSocket.off('group-message', onGlobalGroupMessage);
    globalSocket.off('notification', onGlobalNotification);
    globalSocket.off('vip-changed', onVipChanged);
    globalSocket.off('titles-changed', onTitlesChanged);
  }
});
</script>
