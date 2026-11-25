<template>
  <div class="page">
    <div class="topbar">
      <span class="back" @click="$router.back()">返回</span>
      <span class="title">个人主页</span>
      <span style="width:40px"></span>
    </div>

    <div v-if="error" class="empty-state">{{ error }}</div>

    <div v-else-if="user" class="content">
      <div class="card profile">
        <div class="avatar-big avatar" @click="pickAvatar">
          <img v-if="user.avatar" :src="user.avatar" />
          <span v-else>{{ (user.username || '?')[0] }}</span>
        </div>
        <div class="name">
          {{ user.username }}
          <span v-for="(b, i) in badges" :key="'pb-' + i"
                :class="['title-badge', 'title-' + (b.style || 'vip')]">
            <span class="title-badge-text">{{ b.name }}</span>
          </span>
        </div>
        <div v-if="isMe && editingName" class="name-editor">
          <input v-model="nameDraft" class="field name-input" maxlength="30" placeholder="输入新的用户名" />
          <div class="bio-count">{{ nameDraft.length }}/30 · 巨信号不可修改</div>
          <div class="bio-actions">
            <button class="btn-ghost btn" :disabled="savingName" @click="cancelName">取消</button>
            <button class="btn" :disabled="savingName || !nameDraft.trim() || nameDraft.trim() === user.username" @click="saveName">
              {{ savingName ? '保存中' : '保存用户名' }}
            </button>
          </div>
        </div>
        <div v-if="user.remark" class="remark-line">备注：{{ user.remark }}</div>
        <div class="muted">编号 {{ user.number }}</div>
        <div class="muted" v-if="user.city">城市 {{ user.city }}</div>
        <div v-if="isMe" :class="['vip-profile-card', { active: user.vipActive }]">
          <div class="vip-card-copy">
            <div class="vip-card-title vip-two-tone">{{ user.vipActive ? '黑金 VIP 已开启' : '黑金 VIP' }}</div>
            <div class="vip-card-desc">
              <template v-if="user.vipActive">专属黑金主题、消息标识、50MB 文件发送与 7 天受保护存储。{{ user.vipSince ? ' 开通于 ' + fmtDate(user.vipSince) : '' }}</template>
              <template v-else>输入管理员发放的激活码，开通文件发送与专属黑金界面。</template>
            </div>
          </div>
          <button v-if="!user.vipActive" class="btn vip-activate-btn" @click="vipOpen = true">输入激活码</button>
        </div>
        <div v-if="user.bio" class="bio">{{ user.bio }}</div>
        <div v-else-if="isMe" class="bio empty-bio">还没有个人简介，写一句介绍自己吧。</div>

        <div v-if="isMe && editingBio" class="bio-editor">
          <textarea v-model="bioDraft" class="field bio-input" maxlength="200"
                    placeholder="写一句个人简介（最多 200 字）"></textarea>
          <div class="bio-count">{{ bioDraft.length }}/200</div>
          <div class="bio-actions">
            <button class="btn-ghost btn" :disabled="savingBio" @click="cancelBio">取消</button>
            <button class="btn" :disabled="savingBio" @click="saveBio">{{ savingBio ? '保存中' : '保存简介' }}</button>
          </div>
        </div>

        <div class="btns">
          <template v-if="isMe">
            <button class="btn-ghost btn" :disabled="uploading" @click="pickAvatar">
              {{ uploading ? t('loading') : t('changeAvatar') }}
            </button>
            <button class="btn-ghost btn" @click="startBio">{{ user.bio ? '编辑简介' : '写简介' }}</button>
            <button class="btn-ghost btn" @click="startName">修改用户名</button>
          </template>
          <template v-else>
            <span v-if="blocked" class="relation">{{ t('blocked') }}</span>
            <span v-else-if="blockedBy" class="relation">{{ t('blockedByOther') }}</span>
            <button v-else-if="!isFriend && !requested && !pendingIn" class="btn" @click="addFriend">加好友</button>
            <span v-else-if="isFriend" class="relation">{{ t('alreadyFriend') }}</span>
            <span v-else-if="requested" class="relation">{{ t('requestSent') }}</span>
            <span v-else-if="pendingIn" class="relation">{{ t('pendingIn') }}</span>

            <button v-if="isFriend" class="btn-ghost btn" @click="startRemark">设置备注</button>
            <button v-if="isFriend" class="btn-ghost btn danger-ghost" @click="deleteFriend">删除好友</button>
            <button v-if="blocked" class="btn-ghost btn" @click="unblockUser">{{ t('unblock') }}</button>
            <button v-else-if="!blockedBy" class="btn-ghost btn" @click="blockUser">{{ t('block') }}</button>
            <button class="btn-ghost btn danger-ghost" @click="showReport = true">举报</button>
          </template>
        </div>
      </div>
    </div>

    <input ref="fileInput" type="file" accept="image/*" class="hidden-file" @change="onFile" />

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="remarkOpen" class="remark-mask" @click.self="remarkOpen = false">
          <div class="remark-dialog">
            <div class="remark-title">好友备注</div>
            <input v-model="remarkDraft" class="field" maxlength="30" placeholder="备注名，留空恢复原昵称" />
            <div class="remark-actions">
              <button class="btn-ghost btn" @click="remarkOpen = false">取消</button>
              <button class="btn" :disabled="savingRemark" @click="saveRemark">{{ savingRemark ? '保存中' : '保存' }}</button>
            </div>
          </div>
        </div>
      </Transition>
      <Transition name="fade">
        <div v-if="vipOpen" class="remark-mask" @click.self="vipOpen = false">
          <div class="remark-dialog vip-code-dialog">
            <div class="remark-title vip-two-tone">激活黑金 VIP</div>
            <p class="vip-code-tip">激活码由管理员发放，每个激活码只能使用一次。</p>
            <input v-model="vipCode" class="field vip-code-input" maxlength="32"
                   placeholder="JXVIP-XXXX-XXXX-XXXX-XXXX" autocomplete="off"
                   @keyup.enter="redeemVip" />
            <p v-if="vipError" class="vip-code-error">{{ vipError }}</p>
            <div class="remark-actions">
              <button class="btn-ghost btn" @click="vipOpen = false">取消</button>
              <button class="btn" :disabled="vipBusy || !vipCode.trim()" @click="redeemVip">{{ vipBusy ? '激活中' : '立即激活' }}</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <ReportDialog v-if="user" :open="showReport" type="user"
                  :target-id="String(user._id || user.id)" :target-name="user.username"
                  @close="showReport = false" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import api from '../api';
import { t } from '../i18n';
import { useUserStore } from '../store/user';
import { readImageFile } from '../utils/image';
import ReportDialog from '../components/ReportDialog.vue';

const route = useRoute();
const store = useUserStore();
const user = ref(null);
const fileInput = ref(null);
const isFriend = ref(false);
const requested = ref(false);
const pendingIn = ref(false);
const blocked = ref(false);
const blockedBy = ref(false);
const uploading = ref(false);
const error = ref('');
const showReport = ref(false);
const editingBio = ref(false);
const bioDraft = ref('');
const savingBio = ref(false);
const editingName = ref(false);
const nameDraft = ref('');
const savingName = ref(false);
const remarkOpen = ref(false);
const remarkDraft = ref('');
const savingRemark = ref(false);
const vipOpen = ref(false);
const vipCode = ref('');
const vipBusy = ref(false);
const vipError = ref('');

const isMe = computed(() => {
  if (!user.value) return false;
  return String(user.value._id || user.value.id) === store.myId;
});
const badges = computed(() => {
  const u = user.value;
  if (!u) return [];
  if (Array.isArray(u.badges) && u.badges.length) return u.badges;
  return u.vipActive ? [{ kind: 'vip', name: '黑金VIP', style: 'vip' }] : [];
});

async function load() {
  error.value = '';
  try {
    const { data } = await api.get('/api/user/' + route.params.id);
    user.value = data.user;
    isFriend.value = data.user.relation === 'friend';
    requested.value = data.user.relation === 'pending_out';
    pendingIn.value = data.user.relation === 'pending_in';
    blocked.value = data.user.relation === 'blocked';
    blockedBy.value = data.user.relation === 'blocked_by';
  } catch (e) {
    error.value = (e.response && e.response.data && e.response.data.message) || '用户不存在';
  }
}

function pickAvatar() {
  if (!isMe.value) return;
  fileInput.value.click();
}

async function onFile(e) {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  uploading.value = true;
  try {
    const avatar = await readImageFile(f, { maxSize: 512, quality: 0.85 });
    const { data } = await api.put('/api/user/avatar', { avatar: avatar });
    // 详情接口用 _id，头像接口返回 id，合并保留 _id，避免页面把自己当成陌生人
    user.value = Object.assign({}, user.value, data.user);
    store.setUser(data.user);
    alert('头像已更新');
  } catch (err) {
    alert(err.message || '头像上传失败');
  } finally {
    uploading.value = false;
  }
}

function startBio() {
  bioDraft.value = (user.value && user.value.bio) || '';
  editingBio.value = true;
}

function startName() {
  nameDraft.value = (user.value && user.value.username) || '';
  editingName.value = true;
}

function cancelName() {
  editingName.value = false;
  nameDraft.value = '';
}

async function saveName() {
  if (savingName.value) return;
  savingName.value = true;
  try {
    const { data } = await api.put('/api/user/username', { username: nameDraft.value.trim() });
    user.value = Object.assign({}, user.value, data.user, { _id: user.value._id });
    store.setUser(data.user);
    editingName.value = false;
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '用户名修改失败');
  } finally {
    savingName.value = false;
  }
}

function cancelBio() {
  editingBio.value = false;
  bioDraft.value = '';
}

async function saveBio() {
  if (savingBio.value) return;
  savingBio.value = true;
  try {
    const { data } = await api.put('/api/user/profile', { bio: bioDraft.value.trim() });
    user.value = Object.assign({}, user.value, data.user, { _id: user.value._id });
    store.setUser(data.user);
    editingBio.value = false;
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '简介保存失败');
  } finally {
    savingBio.value = false;
  }
}

function startRemark() {
  if (!user.value) return;
  remarkDraft.value = user.value.remark || '';
  remarkOpen.value = true;
}

async function saveRemark() {
  if (!user.value || savingRemark.value) return;
  savingRemark.value = true;
  try {
    const { data } = await api.put('/api/friend/' + user.value._id + '/remark', {
      remark: remarkDraft.value.trim()
    });
    user.value.remark = data.remark || '';
    remarkOpen.value = false;
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '备注保存失败');
  } finally {
    savingRemark.value = false;
  }
}

function fmtDate(value) {
  if (!value) return '';
  try { return new Date(value).toLocaleDateString(); } catch (e) { return ''; }
}

async function redeemVip() {
  const code = vipCode.value.trim();
  if (!code || !user.value || vipBusy.value) return;
  vipBusy.value = true;
  vipError.value = '';
  try {
    const { data } = await api.post('/api/vip/redeem', { code: code });
    user.value = Object.assign({}, user.value, data.user, { _id: user.value._id });
    store.setUser(Object.assign({}, store.user, data.user));
    vipOpen.value = false;
    vipCode.value = '';
  } catch (e) {
    vipError.value = (e.response && e.response.data && e.response.data.message) || '激活失败';
  } finally {
    vipBusy.value = false;
  }
}

async function addFriend() {
  try {
    await api.post('/api/friend/request', { to: user.value._id });
    requested.value = true;
    alert(t('addSuccess'));
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '失败');
  }
}

async function deleteFriend() {
  if (!user.value) return;
  if (!confirm('删除好友 ' + user.value.username + '？删除后双方不能再发消息，聊天记录会保留。')) return;
  try {
    await api.delete('/api/friend/' + user.value._id);
    isFriend.value = false;
    requested.value = false;
    pendingIn.value = false;
    alert('已删除好友');
    await load();
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '删除失败');
  }
}

async function blockUser() {
  if (!user.value) return;
  if (!confirm('确定拉黑？')) return;
  try {
    await api.post('/api/friend/block', { id: user.value._id });
    blocked.value = true;
    blockedBy.value = false;
    isFriend.value = false;
    requested.value = false;
    pendingIn.value = false;
    alert(t('blocked'));
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '拉黑失败');
  }
}

async function unblockUser() {
  if (!user.value) return;
  try {
    await api.post('/api/friend/unblock', { id: user.value._id });
    alert('已取消拉黑');
    await load();
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '取消拉黑失败');
  }
}

onMounted(load);
</script>

<style scoped>
.page { height: 100%; display: flex; flex-direction: column; background: var(--bg); }
.hidden-file { position: fixed; left: -9999px; top: 0; width: 1px; height: 1px; opacity: 0; overflow: hidden; }
.topbar { background: rgba(255,255,255,.2); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--glass-border); }
.back { color: var(--green); cursor: pointer; font-size: 14px; }
.title { font-weight: 600; }
.content { flex: 1; overflow: auto; padding: 16px; }
.empty-state { flex: 1; display: flex; align-items: center; justify-content: center; color: var(--text-soft); font-size: 14px; padding: 40px; text-align: center; }
.profile { padding: 32px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.avatar-big { width: 96px; height: 96px; font-size: 36px; cursor: pointer; margin-bottom: 8px; }
.avatar-big img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
.name { font-size: 22px; font-weight: var(--fw-semibold); letter-spacing: .02em; line-height: 1.3; }
.name-editor { width: min(420px, 100%); display: flex; flex-direction: column; gap: 7px; margin-top: 8px; text-align: left; }
.name-input { text-align: center; font-size: var(--fs-md); }
.vip-profile-badge { display: inline-block; margin-left: 7px; padding: 2px 9px; border: 1px solid #a77b20; border-radius: 999px; font-size: 11px; line-height: 1.65; letter-spacing: .06em; vertical-align: 2px; }
.btns { display: flex; gap: 10px; margin-top: 16px; flex-wrap: wrap; justify-content: center; align-items: center; }
.relation { font-size: 13px; color: var(--text-soft); padding: 8px 4px; }
.remark-line { font-size: var(--fs-xs); color: var(--green-dark); padding: 2px 8px; border-radius: 7px; background: var(--green-light); }
.bio { max-width: 560px; margin-top: 8px; padding: 13px 16px; border-radius: 14px; background: rgba(255,255,255,.18); border: 1px solid var(--glass-border); font-size: var(--fs-base); line-height: 1.75; white-space: pre-wrap; word-break: break-word; }
.empty-bio { color: var(--text-soft); font-size: var(--fs-sm); }
.bio-editor { width: min(560px, 100%); display: flex; flex-direction: column; gap: 7px; margin-top: 8px; }
.bio-input { min-height: 96px; resize: vertical; text-align: left; }
.bio-count { align-self: flex-end; color: var(--text-faint); font-size: 10px; margin-top: -3px; }
.bio-actions { display: flex; justify-content: flex-end; gap: 8px; }
.remark-mask { position: fixed; inset: 0; z-index: 400; display: flex; align-items: center; justify-content: center; padding: 18px; background: rgba(10,22,15,.36); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
.remark-dialog { width: min(380px, 100%); display: flex; flex-direction: column; gap: 12px; padding: 18px; border-radius: 18px; background: var(--glass-bg-strong); border: 1px solid var(--glass-border); box-shadow: var(--glass-shadow), var(--glass-highlight); backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur); }
.remark-title { font-size: 17px; font-weight: var(--fw-semibold); }
.remark-actions { display: flex; justify-content: flex-end; gap: 8px; }
.vip-profile-card { width: min(560px, 100%); margin-top: 10px; padding: 15px 16px; display: flex; align-items: center; gap: 14px; text-align: left; border: 1px solid rgba(164, 124, 39, .42); border-radius: 18px; background: rgba(255,255,255,.16); }
.vip-profile-card.active { border-color: #9b7420; background: rgba(12, 9, 3, .84); }
.vip-card-copy { flex: 1; min-width: 0; }
.vip-card-title { display: inline-block; font-size: 16px; font-weight: 700; letter-spacing: .04em; }
.vip-card-desc { margin-top: 4px; font-size: 12px; line-height: 1.6; color: var(--text-soft); }
.vip-profile-card.active .vip-card-desc { color: #d9c38b; }
.vip-activate-btn { flex-shrink: 0; background: #b28a2e; border-color: #d9b95c; box-shadow: none; }
.vip-code-dialog { gap: 10px; }
.vip-code-tip { font-size: 13px; color: var(--text-soft); line-height: 1.6; }
.vip-code-input { font-family: ui-monospace, Consolas, monospace; letter-spacing: .06em; text-transform: uppercase; }
.vip-code-error { color: var(--danger); font-size: 13px; }
@media (max-width: 480px) {
  .vip-profile-card { align-items: stretch; flex-direction: column; }
  .vip-activate-btn { width: 100%; }
}
html[data-theme='dark'] .bio { background: rgba(255,255,255,.055); }
</style>
