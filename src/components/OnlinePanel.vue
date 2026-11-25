<template>
  <div class="online">
    <div v-if="!loaded" class="empty">{{ t('loading') }}</div>
    <div v-else-if="!nonFriends.length" class="empty">{{ t('noOnline') }}</div>
    <TransitionGroup v-else name="pop" tag="div" class="grid">
      <div v-for="u in nonFriends" :key="u._id" class="person card">
        <div class="avatar" @click="openProfile(u)">
          <img v-if="u.avatar" :src="u.avatar" />
          <span v-else>{{ (u.username || '?')[0] }}</span>
        </div>
        <div class="pname" @click="openProfile(u)">{{ u.username }}</div>
        <div class="muted">{{ u.number }}</div>
        <div v-if="u.city" class="city">{{ u.city }}</div>
        <div class="person-actions">
          <button v-if="!u.relation || u.relation === 'none'" class="btn small press" @click="add(u)">{{ t('addFriend') }}</button>
          <span v-else class="relation-tag">{{ relationText(u) }}</span>
          <button v-if="u.relation !== 'blocked_by'" class="btn-ghost btn small press" @click="block(u)">{{ t('block') }}</button>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api';
import { t } from '../i18n';
import { getSocket } from '../socket';

const router = useRouter();
const online = ref([]);
const friendIds = ref([]);
const loaded = ref(false);

const nonFriends = computed(() => {
  const set = new Set(friendIds.value.map(String));
  return online.value.filter(function (u) {
    return !set.has(String(u._id)) && u.relation !== 'blocked' && u.relation !== 'blocked_by';
  });
});

async function load() {
  try {
    const [o, f] = await Promise.all([
      api.get('/api/user/online'),
      api.get('/api/friend/list')
    ]);
    online.value = o.data.users;
    friendIds.value = f.data.friends.map(x => String(x._id));
  } catch (e) {
    online.value = [];
  } finally {
    loaded.value = true;
  }
}

function openProfile(u) { router.push('/profile/' + u._id); }

function relationText(u) {
  if (u.relation === 'friend') return t('alreadyFriend');
  if (u.relation === 'pending_out') return t('requestSent');
  if (u.relation === 'blocked') return t('blocked');
  if (u.relation === 'blocked_by') return t('blockedByOther');
  return t('pendingIn');
}

async function add(u) {
  try {
    await api.post('/api/friend/request', { to: u._id });
    u.relation = 'pending_out';
    alert(t('friendAdded'));
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '失败');
  }
}

async function block(u) {
  if (!confirm(t('block') + ' ' + u.username + ' ?')) return;
  try {
    await api.post('/api/friend/block', { id: u._id });
    online.value = online.value.filter(x => String(x._id) !== String(u._id));
    alert(t('blocked'));
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '失败');
  }
}

let reloadTimer = null;
function onOnline() {
  if (reloadTimer) clearTimeout(reloadTimer);
  reloadTimer = setTimeout(function () {
    reloadTimer = null;
    load();
  }, 300);
}

onMounted(() => {
  load();
  const s = getSocket();
  if (s) s.on('online', onOnline);
});

onBeforeUnmount(() => {
  const s = getSocket();
  if (s) s.off('online', onOnline);
  if (reloadTimer) { clearTimeout(reloadTimer); reloadTimer = null; }
});
</script>

<style scoped>
.online { height: 100%; overflow: auto; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; position: relative; }
.person { padding: 16px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 6px; transition: box-shadow .2s ease, transform .2s ease; }
.person:hover { box-shadow: 0 4px 14px rgba(0,0,0,.08); transform: translateY(-2px); }
.avatar { width: 56px; height: 56px; font-size: 22px; cursor: pointer; border-radius: 10px; }
.avatar img { border-radius: 10px; }
.pname { font-weight: var(--fw-semibold); font-size: var(--fs-base); letter-spacing: var(--tracking); cursor: pointer; }
.pname:hover { color: var(--green); }
.city { font-size: 12px; color: var(--green); }
.person-actions { display: flex; gap: 6px; margin-top: 6px; }
.btn.small, .btn-ghost.small { padding: 5px 10px; font-size: 12px; border-radius: 8px; }
.btn:disabled { background: #ccc; }
.relation-tag { font-size: 12px; font-weight: var(--fw-medium); color: var(--text-soft); padding: 5px 9px; border-radius: 8px; background: rgba(255,255,255,.24); border: 1px solid rgba(255,255,255,.6); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); white-space: nowrap; }
.empty { text-align: center; color: var(--text-soft); padding: 40px; font-size: 14px; }
</style>
