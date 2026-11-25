<template>
  <div class="moment-page">
    <header class="topbar">
      <button class="back" aria-label="返回" @click="goBack">‹ <span>返回</span></button>
      <div class="top-title">朋友圈详情</div>
      <div class="top-actions">
        <button v-if="post && isAuthor" class="top-action danger" @click="removePost">删除</button>
        <button v-else-if="post" class="top-action" @click="showReport = true">举报</button>
        <span v-else class="top-placeholder"></span>
      </div>
    </header>

    <div v-if="loading" class="page-state">
      <div class="loading-dot"></div>
      <span>正在打开这条朋友圈</span>
    </div>

    <div v-else-if="error" class="page-state">
      <div class="state-mark">!</div>
      <div class="state-title">{{ error }}</div>
      <button class="btn state-btn" @click="goHome">回到朋友圈</button>
    </div>

    <main v-else-if="post" class="detail-scroll">
      <article class="moment-detail">
        <div class="author-row" @click="goProfile">
          <div class="avatar author-avatar">
            <img v-if="post.author.avatar" :src="post.author.avatar" />
            <span v-else>{{ (post.author.username || '?')[0] }}</span>
          </div>
          <div class="author-main">
            <div class="author-name">{{ post.author.username }}</div>
            <div class="author-sub">{{ post.author.number }}</div>
          </div>
        </div>

        <div v-if="post.content" class="detail-text">{{ post.content }}</div>

        <div v-if="post.images && post.images.length" class="detail-images"
             :class="'count-' + (post.images.length > 3 ? 3 : post.images.length)">
          <button v-for="(img, i) in post.images" :key="i" class="detail-image"
                  :aria-label="'查看第 ' + (i + 1) + ' 张图片'" @click="preview(img)">
            <img :src="img" />
          </button>
        </div>

        <div class="detail-meta">
          <span>{{ timeText(post.createdAt) }}</span>
          <span v-if="isAuthor" class="privacy-chip">{{ privacyLabel(post.visibility) }}</span>
        </div>

        <div class="detail-bar">
          <button :class="['detail-action', { liked: isLiked }]" @click="toggleLike">
            <span class="like-symbol">{{ isLiked ? '已赞' : '赞' }}</span>
            <span>{{ post.likes ? post.likes.length : 0 }}</span>
          </button>
          <button class="detail-action" @click="focusComment">
            <span>评论</span>
            <span>{{ post.comments ? post.comments.length : 0 }}</span>
          </button>
        </div>
      </article>

      <section v-if="post.likes && post.likes.length" class="likes-card">
        <span class="section-symbol">赞</span>
        <span>{{ post.likes.length }} 人觉得很赞</span>
      </section>

      <section class="comments-card">
        <div class="comments-head">
          <div>
            <div class="comments-title">评论</div>
            <div class="comments-sub">{{ post.comments ? post.comments.length : 0 }} 条讨论</div>
          </div>
          <button class="comment-entry" @click="focusComment">写评论</button>
        </div>

        <div v-if="!commentList.length" class="comments-empty">
          <div class="empty-mark">评</div>
          <div>还没有评论，来聊两句吧</div>
        </div>

        <TransitionGroup v-else name="list" tag="div" class="comment-list">
          <div v-for="c in commentList" :key="c._id" class="comment-item">
            <div class="avatar comment-avatar">
              <img v-if="c.user && c.user.avatar" :src="c.user.avatar" />
              <span v-else>{{ (c.user && c.user.username || '?')[0] }}</span>
            </div>
            <div class="comment-main">
              <div class="comment-head">
                <button v-if="c.user" class="comment-name" @click="goCommentProfile(c)">{{ c.user.username }}</button>
                <span v-else class="comment-name">已注销用户</span>
                <span class="comment-time">{{ timeText(c.createdAt) }}</span>
              </div>
              <div class="comment-text">
                <span v-if="c.replyToName" class="reply-prefix">回复 {{ c.replyToName }}：</span>{{ c.content }}
              </div>
              <div class="comment-ops">
                <button v-if="c.user" class="comment-op" @click="startReply(c)">回复</button>
                <button v-if="canDeleteComment(c)" class="comment-op danger" @click="deleteComment(c)">删除</button>
              </div>
            </div>
          </div>
        </TransitionGroup>
      </section>
    </main>

    <footer v-if="post && !error" class="comment-box">
      <div v-if="replyTo" class="reply-bar">
        <span class="reply-bar-text">正在回复 {{ replyTo.username }}</span>
        <button class="reply-cancel" @click="cancelReply">取消</button>
      </div>
      <div class="comment-input-row">
        <input ref="commentInput" v-model="commentText" class="field" maxlength="500"
               :placeholder="replyTo ? '回复 ' + replyTo.username + '…' : '写评论…'"
               @keydown.enter="onCommentEnter" />
        <button class="btn send-comment" :disabled="sending || !commentText.trim()" @click="submitComment">
          {{ sending ? '发送中' : '发送' }}
        </button>
      </div>
    </footer>

    <ReportDialog v-if="post" :open="showReport" type="post"
                  :target-id="String(post._id)" :target-name="'作者：' + (post.author ? post.author.username : '')"
                  @close="showReport = false" />

    <Transition name="fade">
      <div v-if="previewImg" class="preview-mask" @click="previewImg = ''">
        <img :src="previewImg" />
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../api';
import { t } from '../i18n';
import { useUserStore } from '../store/user';
import ReportDialog from '../components/ReportDialog.vue';

const route = useRoute();
const router = useRouter();
const store = useUserStore();
const post = ref(null);
const commentText = ref('');
const previewImg = ref('');
const error = ref('');
const loading = ref(true);
const sending = ref(false);
const replyTo = ref(null);
const commentInput = ref(null);
const showReport = ref(false);

const isLiked = computed(function () {
  if (!post.value) return false;
  return (post.value.likes || []).map(String).includes(store.myId);
});

const isAuthor = computed(function () {
  return !!(post.value && post.value.author && String(post.value.author._id) === store.myId);
});

const commentList = computed(function () {
  if (!post.value) return [];
  const map = new Map();
  (post.value.comments || []).forEach(function (c) { map.set(String(c._id), c); });
  return (post.value.comments || []).map(function (c) {
    let replyToName = '';
    if (c.parent) {
      const parent = map.get(String(c.parent));
      if (parent && parent.user) replyToName = parent.user.username || '';
    }
    return Object.assign({}, c, { replyToName: replyToName });
  });
});

function canDeleteComment(c) {
  if (!c || !c.user) return false;
  if (String(c.user._id) === store.myId) return true;
  if (isAuthor.value) return true;
  return !!(store.user && store.user.isAdmin);
}

function startReply(c) {
  if (!c || !c.user) return;
  replyTo.value = { id: String(c._id), username: c.user.username || '' };
  nextTick(function () { if (commentInput.value) commentInput.value.focus(); });
}

function cancelReply() {
  replyTo.value = null;
}

function focusComment() {
  nextTick(function () { if (commentInput.value) commentInput.value.focus(); });
}

async function deleteComment(c) {
  if (!post.value || !c) return;
  if (!confirm('删除这条评论？它下面的回复也会一起删除。')) return;
  try {
    const { data } = await api.delete('/api/post/' + post.value._id + '/comment/' + c._id);
    post.value = data.post;
    if (replyTo.value && !post.value.comments.some(function (x) { return String(x._id) === replyTo.value.id; })) {
      replyTo.value = null;
    }
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '删除失败');
  }
}

async function removePost() {
  if (!confirm(t('confirmDeletePost'))) return;
  try {
    await api.delete('/api/post/' + post.value._id);
    router.push('/home');
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '删除失败');
  }
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await api.get('/api/post/' + route.params.id);
    post.value = data.post;
    if (route.query.comment) nextTick(focusComment);
  } catch (e) {
    error.value = (e.response && e.response.data && e.response.data.message) || '朋友圈不存在或无权查看';
  } finally {
    loading.value = false;
  }
}

async function toggleLike() {
  if (!post.value) return;
  if (isAuthor.value) {
    alert('不能给自己点赞');
    return;
  }
  try {
    const { data } = await api.post('/api/post/' + post.value._id + '/like');
    post.value.likes = data.likes || [];
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '操作失败');
  }
}

function onCommentEnter(e) {
  if (e && (e.isComposing || e.keyCode === 229)) return;
  if (e) e.preventDefault();
  submitComment();
}

async function submitComment() {
  if (sending.value || !post.value || !commentText.value.trim()) return;
  sending.value = true;
  try {
    const body = { content: commentText.value.trim() };
    if (replyTo.value) body.parent = replyTo.value.id;
    const { data } = await api.post('/api/post/' + post.value._id + '/comment', body);
    post.value = data.post;
    commentText.value = '';
    replyTo.value = null;
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '评论失败');
  } finally {
    sending.value = false;
  }
}

function timeText(value) {
  const time = new Date(value).getTime();
  if (!time || isNaN(time)) return '';
  const diff = Math.max(0, Date.now() - time);
  if (diff < 60 * 1000) return '刚刚';
  if (diff < 60 * 60 * 1000) return Math.floor(diff / 60000) + ' 分钟前';
  if (diff < 24 * 60 * 60 * 1000) return Math.floor(diff / 3600000) + ' 小时前';
  if (diff < 7 * 24 * 60 * 60 * 1000) return Math.floor(diff / 86400000) + ' 天前';
  const d = new Date(time);
  const now = new Date();
  if (d.getFullYear() === now.getFullYear()) return (d.getMonth() + 1) + '月' + d.getDate() + '日';
  return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
}

function privacyLabel(value) {
  if (value === 'friends') return '好友可见';
  if (value === 'onlyme') return '仅自己';
  if (value === 'specified') return '部分好友可见';
  return '公开';
}

function goProfile() {
  if (post.value && post.value.author) router.push('/profile/' + post.value.author._id);
}

function goCommentProfile(c) {
  if (c && c.user && c.user._id) router.push('/profile/' + c.user._id);
}

function preview(img) {
  previewImg.value = img;
}

function goBack() {
  if (window.history.length > 1) router.back();
  else router.push('/home');
}

function goHome() {
  router.push('/home');
}

onMounted(load);
</script>

<style scoped>
.moment-page { height: 100%; min-height: 0; display: flex; flex-direction: column; background: var(--bg); }
.topbar { flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 11px 14px; border-bottom: 1px solid var(--glass-border); background: rgba(255,255,255,.2); backdrop-filter: blur(22px); -webkit-backdrop-filter: blur(22px); }
.back { display: inline-flex; align-items: center; gap: 2px; border: 0; padding: 3px 4px; background: transparent; color: var(--green-dark); font-size: 14px; }
.back span { font-size: 12px; }
.top-title { flex: 1; text-align: center; color: var(--text); font-size: 14px; font-weight: 650; }
.top-actions { min-width: 52px; display: flex; justify-content: flex-end; }
.top-action { border: 0; padding: 4px 3px; background: transparent; color: var(--text-soft); font-size: 12px; }
.top-action.danger { color: var(--danger); }
.top-placeholder { width: 30px; }
.page-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 32px 18px; color: var(--text-soft); text-align: center; font-size: 13px; }
.state-mark { width: 52px; height: 52px; display: flex; align-items: center; justify-content: center; border-radius: 17px; color: var(--danger); background: var(--glass-bg); border: 1px solid var(--glass-border); font-size: 24px; font-weight: 650; }
.state-title { color: var(--text); font-size: 15px; font-weight: 600; }
.state-btn { margin-top: 5px; padding: 8px 16px; font-size: 12px; }
.loading-dot { width: 28px; height: 28px; border-radius: 50%; border: 2px solid rgba(7,193,96,.18); border-top-color: var(--green); animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.detail-scroll { flex: 1; min-height: 0; overflow: auto; padding: 14px; display: flex; flex-direction: column; gap: 12px; }
.moment-detail, .likes-card, .comments-card { width: min(720px, 100%); align-self: center; border-radius: 18px; background: var(--glass-bg-strong); border: 1px solid var(--glass-border); box-shadow: var(--glass-highlight); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); }
.moment-detail { padding: 17px; }
.author-row { display: flex; align-items: center; gap: 10px; width: fit-content; cursor: pointer; }
.author-avatar { width: 44px; height: 44px; font-size: 17px; }
.author-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
.author-name { color: var(--green-dark); font-size: 14px; font-weight: 650; }
.author-sub { margin-top: 1px; color: var(--text-faint); font-size: 10px; }
.detail-text { margin: 13px 0 10px; color: var(--text); font-size: 15px; line-height: 1.82; letter-spacing: var(--tracking); white-space: pre-wrap; word-break: break-word; }
.detail-images { display: grid; gap: 5px; width: min(100%, 540px); margin: 11px 0; }
.detail-images.count-1 { grid-template-columns: minmax(0, 330px); }
.detail-images.count-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.detail-images.count-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.detail-image { padding: 0; border: 0; border-radius: 8px; overflow: hidden; aspect-ratio: 1; background: var(--glass-bg); cursor: zoom-in; }
.detail-image img { width: 100%; height: 100%; display: block; object-fit: cover; transition: transform .2s ease; }
.detail-image:hover img { transform: scale(1.035); }
.detail-meta { display: flex; align-items: center; gap: 8px; margin-top: 9px; color: var(--text-faint); font-size: 11px; }
.privacy-chip { padding: 1px 6px; border-radius: 5px; border: 1px solid var(--glass-border); background: var(--glass-bg); }
.detail-bar { display: flex; align-items: center; gap: 20px; margin-top: 12px; padding-top: 10px; border-top: 1px solid rgba(94,121,105,.12); }
.detail-action { display: inline-flex; align-items: center; gap: 4px; border: 0; padding: 3px 0; background: transparent; color: var(--text-soft); font-size: 12px; font-weight: 500; }
.detail-action:hover { color: var(--green-dark); }
.detail-action.liked { color: var(--green); }
.like-symbol { font-weight: 600; }
.likes-card { display: flex; align-items: center; gap: 6px; padding: 10px 15px; color: var(--green-dark); font-size: 11px; }
.section-symbol { display: inline-flex; align-items: center; justify-content: center; width: 21px; height: 21px; border-radius: 7px; color: var(--green-dark); background: var(--green-light); font-size: 10px; font-weight: 650; }
.comments-card { padding: 15px; }
.comments-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding-bottom: 10px; border-bottom: 1px solid rgba(94,121,105,.12); }
.comments-title { color: var(--text); font-size: 14px; font-weight: 650; }
.comments-sub { margin-top: 1px; color: var(--text-faint); font-size: 10px; }
.comment-entry { border: 1px solid var(--glass-border); border-radius: 9px; padding: 5px 9px; color: var(--text-soft); background: var(--glass-bg); font-size: 10px; }
.comments-empty { display: flex; flex-direction: column; align-items: center; gap: 7px; padding: 28px 12px 20px; color: var(--text-soft); font-size: 11px; }
.empty-mark { width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; border-radius: 12px; color: var(--green-dark); background: var(--green-light); font-size: 14px; font-weight: 650; }
.comment-list { display: flex; flex-direction: column; gap: 0; position: relative; }
.comment-item { display: flex; gap: 9px; padding: 11px 0; border-bottom: 1px solid rgba(94,121,105,.09); }
.comment-item:last-child { border-bottom: 0; padding-bottom: 2px; }
.comment-avatar { width: 30px; height: 30px; font-size: 12px; flex-shrink: 0; }
.comment-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
.comment-main { flex: 1; min-width: 0; }
.comment-head { display: flex; align-items: baseline; gap: 7px; }
.comment-name { max-width: 70%; border: 0; padding: 0; background: transparent; color: var(--green-dark); font-size: 11px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.comment-time { color: var(--text-faint); font-size: 9px; }
.comment-text { margin-top: 3px; color: var(--text); font-size: 13px; line-height: 1.64; word-break: break-word; white-space: pre-wrap; }
.reply-prefix { color: var(--text-soft); }
.comment-ops { display: flex; gap: 12px; margin-top: 3px; }
.comment-op { border: 0; padding: 1px 0; background: transparent; color: var(--text-faint); font-size: 10px; }
.comment-op:hover { color: var(--green-dark); }
.comment-op.danger { color: var(--danger); }
.comment-box { flex-shrink: 0; display: flex; flex-direction: column; gap: 6px; padding: 9px 12px calc(9px + env(safe-area-inset-bottom)); border-top: 1px solid var(--glass-border); background: rgba(255,255,255,.2); backdrop-filter: blur(22px); -webkit-backdrop-filter: blur(22px); }
.comment-input-row { width: min(720px, 100%); align-self: center; display: flex; gap: 7px; }
.comment-input-row .field { flex: 1; min-width: 0; padding: 8px 11px; font-size: 13px; }
.send-comment { padding: 8px 13px; font-size: 12px; white-space: nowrap; }
.reply-bar { width: min(720px, 100%); align-self: center; display: flex; align-items: center; gap: 8px; font-size: 10px; color: var(--text-soft); }
.reply-bar-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.reply-cancel { flex-shrink: 0; border: 0; padding: 1px 3px; background: transparent; color: var(--danger); font-size: 10px; }
.preview-mask { position: fixed; inset: 0; z-index: 500; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(0,0,0,.87); cursor: zoom-out; }
.preview-mask img { max-width: 94%; max-height: 92%; border-radius: 8px; object-fit: contain; }
@media (max-width: 720px) {
  .topbar { padding: 9px 11px; }
  .detail-scroll { padding: 9px; gap: 9px; }
  .moment-detail { padding: 13px; border-radius: 15px; }
  .detail-text { font-size: 14px; line-height: 1.78; }
  .detail-images { width: 100%; gap: 3px; }
  .likes-card, .comments-card { border-radius: 15px; }
  .comments-card { padding: 12px; }
  .comment-box { padding: 7px 9px calc(7px + env(safe-area-inset-bottom)); }
}
@media (max-width: 380px) {
  .author-avatar { width: 39px; height: 39px; }
  .moment-detail { padding: 11px; }
  .detail-text { font-size: 13.5px; }
  .comment-text { font-size: 12.5px; }
  .send-comment { padding: 7px 10px; }
}
</style>
