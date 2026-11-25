<template>
  <div class="contacts">
    <div class="contacts-head">
      <div>
        <div class="page-title">通讯录</div>
        <div class="page-sub">{{ friends.length }} 位好友 · {{ groups.length }} 个群聊</div>
      </div>
      <button class="btn add-friend" @click="$emit('go-chat')">添加好友</button>
    </div>

    <div class="search-row">
      <input v-model="query" class="field" placeholder="搜索好友、备注、群聊或编号" />
      <button v-if="query" class="clear-search" @click="query = ''">清除</button>
    </div>

    <div v-if="requestCount" class="request-tip" @click="$emit('go-mail')">
      <span class="request-icon">＋</span>
      <span>有 {{ requestCount }} 个新的好友申请</span>
      <span class="request-arrow">›</span>
    </div>

    <div class="tabs">
      <button :class="['tab', { on: tab === 'friends' }]" @click="tab = 'friends'">
        好友 <span>{{ filteredFriends.length }}</span>
      </button>
      <button :class="['tab', { on: tab === 'groups' }]" @click="tab = 'groups'">
        群聊 <span>{{ filteredGroups.length }}</span>
      </button>
    </div>

    <div class="contact-scroll">
      <template v-if="tab === 'friends'">
        <div v-if="loading" class="empty">加载中…</div>
        <div v-else-if="!filteredFriends.length" class="empty">
          {{ query ? '没有找到匹配的好友' : '还没有好友，去聊天页搜索并添加吧' }}
        </div>
        <div v-for="f in filteredFriends" :key="f._id" class="contact-row" @click="openFriend(f)">
          <div class="avatar contact-avatar">
            <img v-if="f.avatar" :src="f.avatar" />
            <span v-else>{{ (displayName(f) || '?')[0] }}</span>
            <i v-if="f.online" class="online-dot"></i>
          </div>
          <div class="contact-main">
            <div class="contact-name">
              {{ displayName(f) }}
              <span v-if="f.remark" class="real-name">{{ f.username }}</span>
            </div>
            <div class="contact-sub">{{ f.number }}<span v-if="f.city"> · {{ f.city }}</span></div>
          </div>
          <div class="row-actions">
            <button class="mini-btn" @click.stop="startRemark(f)">备注</button>
            <button class="mini-btn primary" @click.stop="openFriend(f)">发消息</button>
            <button class="mini-btn plain" @click.stop="openProfile(f)">主页</button>
          </div>
        </div>
      </template>

      <template v-else>
        <div v-if="loading" class="empty">加载中…</div>
        <div v-else-if="!filteredGroups.length" class="empty">
          {{ query ? '没有找到匹配的群聊' : '还没有群聊，在聊天页点“建群”创建一个吧' }}
        </div>
        <div v-for="g in filteredGroups" :key="g._id" class="contact-row group-row" @click="openGroup(g)">
          <div class="avatar group-avatar">群</div>
          <div class="contact-main">
            <div class="contact-name">
              {{ g.name }}
              <span v-if="g.role === 'owner'" class="role-badge">群主</span>
            </div>
            <div class="contact-sub">{{ g.memberCount }} 位成员<span v-if="g.myNickname"> · 我在本群：{{ g.myNickname }}</span></div>
          </div>
          <div class="row-actions">
            <button class="mini-btn primary" @click.stop="openGroup(g)">发消息</button>
          </div>
        </div>
      </template>
    </div>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="remarkOpen" class="remark-mask" @click.self="closeRemark">
          <div class="remark-card">
            <div class="remark-title">设置好友备注</div>
            <div class="remark-user">给 {{ remarkTarget && remarkTarget.username }} 设置一个你习惯的称呼</div>
            <input v-model="remarkDraft" class="field" maxlength="30" placeholder="备注名，留空恢复原昵称" @keydown.enter="saveRemark" />
            <div class="remark-count">{{ remarkDraft.length }}/30</div>
            <div class="remark-actions">
              <button class="btn-ghost btn" @click="closeRemark">取消</button>
              <button class="btn" :disabled="saving" @click="saveRemark">{{ saving ? '保存中' : '保存' }}</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api';

const emit = defineEmits(['open-chat', 'go-chat', 'go-mail']);

const router = useRouter();
const friends = ref([]);
const groups = ref([]);
const requests = ref([]);
const query = ref('');
const tab = ref('friends');
const loading = ref(true);
const remarkOpen = ref(false);
const remarkTarget = ref(null);
const remarkDraft = ref('');
const saving = ref(false);

const requestCount = computed(function () { return requests.value.length; });

function displayName(f) {
  return (f && (f.remark || f.username)) || '';
}

function matches(text) {
  return String(text || '').toLowerCase().includes(query.value.trim().toLowerCase());
}

const filteredFriends = computed(function () {
  const q = query.value.trim();
  const list = q ? friends.value.filter(function (f) {
    return matches(displayName(f)) || matches(f.username) || matches(f.number) || matches(f.city);
  }) : friends.value.slice();
  return list.sort(function (a, b) {
    if (!!a.online !== !!b.online) return a.online ? -1 : 1;
    return displayName(a).localeCompare(displayName(b), 'zh-CN');
  });
});

const filteredGroups = computed(function () {
  const q = query.value.trim();
  const list = q ? groups.value.filter(function (g) {
    return matches(g.name) || matches(g.myNickname);
  }) : groups.value.slice();
  return list.sort(function (a, b) {
    return String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN');
  });
});

async function load() {
  loading.value = true;
  try {
    const [friendRes, groupRes, requestRes] = await Promise.all([
      api.get('/api/friend/list'),
      api.get('/api/group/list'),
      api.get('/api/friend/requests')
    ]);
    friends.value = friendRes.data.friends || [];
    groups.value = groupRes.data.groups || [];
    requests.value = requestRes.data.requests || [];
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '通讯录加载失败');
  } finally {
    loading.value = false;
  }
}

function openFriend(f) {
  if (!f) return;
  emitChat({ id: String(f._id), isGroup: false, name: displayName(f) });
}

function openGroup(g) {
  if (!g) return;
  emitChat({ id: String(g._id), isGroup: true, name: g.name });
}

function emitChat(target) {
  emit('open-chat', target);
}

function openProfile(f) {
  if (f) router.push('/profile/' + f._id);
}

function startRemark(f) {
  remarkTarget.value = f;
  remarkDraft.value = f.remark || '';
  remarkOpen.value = true;
}

function closeRemark() {
  remarkOpen.value = false;
  remarkTarget.value = null;
  remarkDraft.value = '';
}

async function saveRemark() {
  if (!remarkTarget.value || saving.value) return;
  saving.value = true;
  try {
    const { data } = await api.put('/api/friend/' + remarkTarget.value._id + '/remark', {
      remark: remarkDraft.value.trim()
    });
    remarkTarget.value.remark = data.remark || '';
    closeRemark();
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '备注保存失败');
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.contacts { height: 100%; overflow: hidden; display: flex; flex-direction: column; gap: 12px; }
.contacts-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.page-title { font-size: var(--fs-lg); font-weight: var(--fw-semibold); letter-spacing: var(--tracking); }
.page-sub { margin-top: 2px; font-size: var(--fs-xs); color: var(--text-soft); }
.add-friend { padding: 8px 14px; font-size: var(--fs-sm); border-radius: 11px; }
.search-row { display: flex; gap: 8px; align-items: center; }
.search-row .field { flex: 1; min-width: 0; }
.clear-search { border: 0; background: transparent; color: var(--text-soft); font-size: var(--fs-xs); }
.request-tip { display: flex; align-items: center; gap: 9px; padding: 11px 13px; border-radius: 13px; background: var(--glass-bg); border: 1px solid var(--glass-border); color: var(--text); font-size: var(--fs-sm); cursor: pointer; }
.request-icon { width: 26px; height: 26px; display: inline-flex; align-items: center; justify-content: center; border-radius: 8px; background: var(--green); color: #fff; font-weight: var(--fw-semibold); }
.request-arrow { margin-left: auto; font-size: 20px; color: var(--text-soft); }
.tabs { display: flex; gap: 6px; padding: 4px; width: fit-content; border-radius: 12px; background: var(--glass-bg); border: 1px solid var(--glass-border); }
.tab { border: 0; border-radius: 9px; padding: 7px 15px; background: transparent; color: var(--text-soft); font-size: var(--fs-sm); }
.tab span { margin-left: 3px; opacity: .75; font-size: var(--fs-2xs); }
.tab.on { background: var(--green); color: #fff; }
.contact-scroll { flex: 1; min-height: 0; overflow: auto; display: flex; flex-direction: column; gap: 8px; padding-right: 3px; }
.contact-row { display: flex; align-items: center; gap: 12px; min-height: 68px; padding: 11px 13px; border-radius: 16px; background: var(--glass-bg); border: 1px solid var(--glass-border); box-shadow: var(--glass-highlight); cursor: pointer; transition: transform .16s ease, background .16s ease; }
.contact-row:hover { background: var(--green-light); transform: translateY(-1px); }
.contact-avatar { width: 44px; height: 44px; font-size: 17px; position: relative; }
.contact-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
.online-dot { position: absolute; right: 1px; bottom: 1px; width: 10px; height: 10px; border-radius: 50%; background: var(--green); border: 2px solid var(--card); }
.contact-main { flex: 1; min-width: 0; }
.contact-name { font-size: var(--fs-base); font-weight: var(--fw-semibold); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.real-name { margin-left: 6px; color: var(--text-soft); font-size: var(--fs-2xs); font-weight: var(--fw-regular); }
.contact-sub { margin-top: 2px; font-size: var(--fs-xs); color: var(--text-soft); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.group-avatar { width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, rgba(7,193,96,.22), rgba(64,156,255,.24)); color: var(--green-dark); font-size: 15px; border: 1px solid var(--glass-border); }
.role-badge { margin-left: 6px; padding: 1px 6px; border-radius: 6px; background: var(--green-light); color: var(--green-dark); font-size: 10px; font-weight: var(--fw-semibold); }
.row-actions { display: flex; align-items: center; gap: 5px; flex-shrink: 0; }
.mini-btn { border: 1px solid var(--glass-border); border-radius: 8px; padding: 5px 8px; background: var(--glass-bg); color: var(--text-soft); font-size: 11px; white-space: nowrap; }
.mini-btn.primary { border-color: transparent; background: var(--green); color: #fff; }
.mini-btn.plain { background: transparent; }
.empty { padding: 44px 16px; text-align: center; color: var(--text-soft); font-size: var(--fs-sm); }
.remark-mask { position: fixed; inset: 0; z-index: 400; display: flex; align-items: center; justify-content: center; padding: 18px; background: rgba(10,22,15,.36); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
.remark-card { width: min(380px, 100%); display: flex; flex-direction: column; gap: 10px; padding: 18px; border-radius: 18px; background: var(--glass-bg-strong); border: 1px solid var(--glass-border); box-shadow: var(--glass-shadow), var(--glass-highlight); backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur); }
.remark-title { font-size: 17px; font-weight: var(--fw-semibold); }
.remark-user { font-size: var(--fs-xs); color: var(--text-soft); line-height: 1.55; }
.remark-count { align-self: flex-end; font-size: 10px; color: var(--text-faint); margin-top: -5px; }
.remark-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 3px; }
@media (max-width: 720px) {
  .contacts { gap: 9px; }
  .page-title { font-size: 20px; }
  .contact-row { padding: 10px 11px; gap: 9px; min-height: 64px; }
  .contact-avatar, .group-avatar { width: 40px; height: 40px; }
  .row-actions { gap: 3px; }
  .mini-btn { padding: 5px 6px; font-size: 10.5px; }
  .mini-btn.plain { display: none; }
  .real-name { display: none; }
}
@media (max-width: 380px) {
  .mini-btn:not(.primary) { display: none; }
  .page-sub { font-size: 10.5px; }
}
</style>
