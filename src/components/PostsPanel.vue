<template>
  <div ref="scrollRef" class="moments" data-testid="moments-panel">
    <section class="cover">
      <div class="cover-glow"></div>
      <div class="cover-top">
        <div class="cover-copy">
          <div class="cover-kicker">巨信朋友圈</div>
          <h1>记录此刻，<br class="cover-break" />分享给在意的人</h1>
          <p>照片、心情和近况，都可以留在这里。</p>
        </div>
        <button class="compose-open" data-testid="moment-compose-open" @click="openComposer">发布朋友圈</button>
      </div>
      <div class="cover-user" @click="goProfile(store.user)">
        <span class="avatar cover-avatar">
          <img v-if="store.user && store.user.avatar" :src="store.user.avatar" />
          <span v-else>{{ (store.user && store.user.username || '?')[0] }}</span>
        </span>
        <span class="cover-user-name">{{ (store.user && store.user.username) || '我' }}</span>
      </div>
      <div class="cover-pattern" aria-hidden="true"><i></i><i></i><i></i></div>
    </section>

    <div class="toolbar">
      <div class="tabs">
        <button :class="['tab', { on: currentTab === 'all' }]" @click="currentTab = 'all'">
          全部 <span>{{ posts.length }}</span>
        </button>
        <button :class="['tab', { on: currentTab === 'mine' }]" @click="currentTab = 'mine'">
          我的朋友圈 <span>{{ mineCount }}</span>
        </button>
      </div>
      <button class="refresh" :disabled="loading" @click="load">{{ loading ? '加载中' : '刷新' }}</button>
    </div>

    <div v-if="loading && !posts.length" class="feed-state loading-state">
      <div class="skeleton"></div>
      <div class="skeleton short"></div>
      <div class="skeleton"></div>
    </div>
    <div v-else-if="loadError" class="feed-state">
      <div class="state-title">朋友圈没有加载出来</div>
      <div class="state-sub">{{ loadError }}</div>
      <button class="btn retry-btn" @click="load">重新加载</button>
    </div>
    <div v-else-if="!filteredPosts.length" class="feed-state">
      <div class="empty-mark">圈</div>
      <div class="state-title">{{ currentTab === 'mine' ? '你还没有发布朋友圈' : '这里还很安静' }}</div>
      <div class="state-sub">{{ currentTab === 'mine' ? '记录今天的一点小事吧。' : '发布第一条朋友圈，让朋友看到你的近况。' }}</div>
      <button v-if="currentTab === 'mine'" class="btn retry-btn" @click="openComposer">发布朋友圈</button>
    </div>

    <TransitionGroup v-else name="rise" tag="div" class="timeline">
      <article v-for="p in filteredPosts" :key="p._id" class="moment-card" data-testid="moment-card">
        <div class="avatar moment-avatar" @click="goProfile(p.author)">
          <img v-if="p.author.avatar" :src="p.author.avatar" />
          <span v-else>{{ (p.author.username || '?')[0] }}</span>
        </div>

        <div class="moment-main">
          <div class="moment-head">
            <button class="moment-name" @click="goProfile(p.author)">{{ p.author.username }}</button>
            <span v-if="isMine(p)" class="privacy-tag">{{ privacyLabel(p.visibility) }}</span>
            <span v-if="isMine(p) && moderationOf(p) === 'pending'" class="moderation-tag pending">审核中</span>
            <span v-else-if="isMine(p) && moderationOf(p) === 'rejected'" class="moderation-tag rejected">未通过</span>
          </div>

          <div v-if="isMine(p) && moderationOf(p) !== 'approved'" class="moderation-note" :class="moderationOf(p)">
            {{ moderationOf(p) === 'pending' ? '文字和图片已提交管理员审核，通过后才会公开。' : ('审核未通过：' + (p.moderationReason || '不符合内容规范')) }}
          </div>

          <p v-if="p.content" class="moment-text" @click="goDetail(p)">{{ p.content }}</p>

          <div v-if="p.images && p.images.length" class="moment-images"
               :class="'count-' + (p.images.length > 3 ? 3 : p.images.length)">
            <button v-for="(img, i) in p.images" :key="i" class="moment-image"
                    :aria-label="'查看第 ' + (i + 1) + ' 张图片'" @click.stop="previewImage(img)">
              <img :src="img" />
              <span v-if="p.images.length > 9 && i === 8" class="image-more">+{{ p.images.length - 9 }}</span>
            </button>
          </div>

          <div class="moment-meta">
            <span>{{ timeText(p.createdAt) }}</span>
            <button v-if="isMine(p)" class="meta-delete" @click.stop="removePost(p)">删除</button>
          </div>

          <div v-if="isApproved(p)" class="moment-actions">
            <button :class="['moment-action', { liked: isLiked(p) }]" data-testid="moment-like"
                    @click.stop="toggleLike(p)">
              <span class="action-mark">{{ isLiked(p) ? '已赞' : '赞' }}</span>
              <span v-if="p.likes && p.likes.length" class="action-count">{{ p.likes.length }}</span>
            </button>
            <button class="moment-action" @click.stop="goDetail(p)">
              <span class="action-mark">评论</span>
              <span v-if="p.comments && p.comments.length" class="action-count">{{ p.comments.length }}</span>
            </button>
          </div>

          <div v-if="isApproved(p) && ((p.likes && p.likes.length) || (p.comments && p.comments.length))" class="social-box">
            <div v-if="p.likes && p.likes.length" class="like-row">
              <span class="social-label">赞</span>
              <span>{{ p.likes.length }} 人觉得很赞</span>
            </div>
            <button v-for="c in previewComments(p)" :key="c._id" class="comment-preview" @click.stop="goDetail(p)">
              <span class="comment-name">{{ c.user ? c.user.username : '已注销用户' }}</span>
              <span v-if="c.replyName" class="comment-reply">回复 {{ c.replyName }}</span>
              <span class="comment-colon">：</span>
              <span class="comment-content">{{ c.content }}</span>
            </button>
            <button v-if="p.comments && p.comments.length > 3" class="all-comments" @click.stop="goDetail(p)">
              查看全部 {{ p.comments.length }} 条评论
            </button>
          </div>
        </div>
      </article>
    </TransitionGroup>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="composerOpen" class="modal-mask" data-testid="moment-composer" @click.self="closeComposer">
          <div class="composer-sheet">
            <div class="composer-head">
              <div>
                <div class="composer-title">发表朋友圈</div>
                <div class="composer-sub">这一刻的想法，朋友会看到</div>
              </div>
              <button class="sheet-close" aria-label="关闭" @click="closeComposer">×</button>
            </div>

            <textarea ref="contentInput" v-model="content" class="composer-text" maxlength="2000"
                      data-testid="moment-content" placeholder="这一刻的想法…"></textarea>

            <TransitionGroup v-if="images.length" name="pop" tag="div" class="composer-images">
              <div v-for="(img, i) in images" :key="img" class="composer-thumb">
                <img :src="img" />
                <button class="thumb-del" aria-label="移除图片" @click="images.splice(i, 1)">×</button>
              </div>
            </TransitionGroup>

            <label v-if="images.length < 9" class="add-image press">
              <input type="file" accept="image/*" multiple style="display:none" @change="onPickImages" />
              <span class="add-image-plus">＋</span>
              <span>添加图片 {{ images.length }}/9</span>
            </label>

            <div class="composer-privacy">
              <label for="moment-visibility">谁可以看</label>
              <select id="moment-visibility" v-model="visibility" class="field privacy-select">
                <option value="public">公开</option>
                <option value="friends">好友可见</option>
                <option value="onlyme">仅自己可见</option>
                <option value="specified">指定好友可见</option>
              </select>
              <button v-if="visibility === 'specified'" class="pick-friends-btn" @click="openFriendPicker">
                选择好友 {{ visibleTo.length ? '(' + visibleTo.length + ')' : '' }}
              </button>
            </div>

            <div class="composer-foot">
              <span :class="['char-count', { near: content.length > 1800 }]">{{ content.length }}/2000</span>
              <button class="btn publish-btn" data-testid="moment-publish"
                      :disabled="publishing || (!content.trim() && !images.length) || (visibility === 'specified' && !visibleTo.length)"
                      @click="publish">{{ publishing ? '发布中' : '发表' }}</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showPicker" class="modal-mask picker-mask" @click.self="showPicker = false">
          <div class="friend-picker">
            <div class="composer-head">
              <div>
                <div class="composer-title">选择可见好友</div>
                <div class="composer-sub">已选 {{ visibleTo.length }} 人</div>
              </div>
              <button class="sheet-close" aria-label="关闭" @click="showPicker = false">×</button>
            </div>
            <div class="picker-search"><input v-model="friendQuery" class="field" placeholder="搜索好友或备注" /></div>
            <div class="friend-list">
              <button v-for="f in filteredFriends" :key="f._id" class="friend-row" @click="toggleFriend(f._id)">
                <span :class="['friend-check', { on: visibleTo.includes(String(f._id)) }]">✓</span>
                <span class="avatar friend-avatar">
                  <img v-if="f.avatar" :src="f.avatar" />
                  <span v-else>{{ (displayFriend(f) || '?')[0] }}</span>
                </span>
                <span class="friend-main">
                  <span class="friend-name">{{ displayFriend(f) }}</span>
                  <span class="friend-number">{{ f.number }}</span>
                </span>
              </button>
              <div v-if="!filteredFriends.length" class="picker-empty">没有匹配的好友</div>
            </div>
            <button class="btn picker-done" :disabled="!visibleTo.length" @click="showPicker = false">
              {{ visibleTo.length ? '确定（' + visibleTo.length + '）' : '至少选择一位好友' }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Transition name="fade">
      <div v-if="previewImg" class="preview-mask" @click="previewImg = ''">
        <img :src="previewImg" />
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api';
import { t } from '../i18n';
import { useUserStore } from '../store/user';
import { readImageFile } from '../utils/image';

const router = useRouter();
const store = useUserStore();
const posts = ref([]);
const currentTab = ref('all');
const loading = ref(false);
const loadError = ref('');
const composerOpen = ref(false);
const content = ref('');
const images = ref([]);
const visibility = ref('public');
const visibleTo = ref([]);
const publishing = ref(false);
const friends = ref([]);
const showPicker = ref(false);
const friendQuery = ref('');
const previewImg = ref('');
const contentInput = ref(null);
const scrollRef = ref(null);

const mineCount = computed(function () {
  return posts.value.filter(function (p) { return String(p.author && p.author._id) === store.myId; }).length;
});

const filteredPosts = computed(function () {
  if (currentTab.value === 'mine') {
    return posts.value.filter(function (p) { return String(p.author && p.author._id) === store.myId; });
  }
  return posts.value;
});

const filteredFriends = computed(function () {
  const keyword = friendQuery.value.trim().toLowerCase();
  if (!keyword) return friends.value;
  return friends.value.filter(function (f) {
    return String(displayFriend(f)).toLowerCase().includes(keyword) ||
      String(f.number || '').toLowerCase().includes(keyword);
  });
});

async function load() {
  loading.value = true;
  loadError.value = '';
  try {
    const { data } = await api.get('/api/post');
    posts.value = data.posts || [];
  } catch (e) {
    loadError.value = (e.response && e.response.data && e.response.data.message) || '请检查网络后重试';
  } finally {
    loading.value = false;
  }
}

function openComposer() {
  composerOpen.value = true;
  nextTick(function () { if (contentInput.value) contentInput.value.focus(); });
}

function closeComposer() {
  if (publishing.value) return;
  composerOpen.value = false;
  showPicker.value = false;
}

async function onPickImages(e) {
  const files = Array.from(e.target.files || []);
  e.target.value = '';
  for (const f of files) {
    if (images.value.length >= 9) { alert('最多 9 张图片'); break; }
    try {
      images.value.push(await readImageFile(f, { maxSize: 1600, quality: 0.8 }));
    } catch (err) {
      alert(err.message);
    }
  }
}

async function publish() {
  if (publishing.value) return;
  if (!content.value.trim() && !images.value.length) return;
  if (visibility.value === 'specified' && !visibleTo.value.length) {
    alert('请选择至少一位可见好友');
    return;
  }
  publishing.value = true;
  try {
    const body = {
      content: content.value,
      visibility: visibility.value,
      images: images.value
    };
    if (visibility.value === 'specified') body.visibleTo = visibleTo.value;
    const { data } = await api.post('/api/post', body);
    if (data && data.post) posts.value.unshift(data.post);
    if (data && data.message) alert(data.message);
    content.value = '';
    images.value = [];
    visibleTo.value = [];
    visibility.value = 'public';
    showPicker.value = false;
    composerOpen.value = false;
    currentTab.value = 'all';
    await load();
    if (scrollRef.value) scrollRef.value.scrollTop = 0;
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '发布失败');
  } finally {
    publishing.value = false;
  }
}

function isMine(p) {
  return String(p.author && p.author._id) === store.myId;
}

function moderationOf(p) {
  return p && p.moderationStatus ? p.moderationStatus : 'approved';
}

function isApproved(p) {
  return moderationOf(p) === 'approved';
}

function isLiked(p) {
  return (p.likes || []).map(String).includes(store.myId);
}

async function toggleLike(p) {
  if (isMine(p)) { alert('不能给自己点赞'); return; }
  try {
    const { data } = await api.post('/api/post/' + p._id + '/like');
    p.likes = data.likes || [];
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '操作失败');
  }
}

async function removePost(p) {
  if (!confirm(t('confirmDeletePost'))) return;
  try {
    await api.delete('/api/post/' + p._id);
    posts.value = posts.value.filter(function (x) { return String(x._id) !== String(p._id); });
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '删除失败');
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
  if (value === 'specified') return '部分好友';
  return '公开';
}

function previewComments(p) {
  const comments = p.comments || [];
  const map = new Map();
  comments.forEach(function (c) { map.set(String(c._id), c); });
  return comments.slice(-3).map(function (c) {
    let replyName = '';
    if (c.parent) {
      const parent = map.get(String(c.parent));
      if (parent && parent.user) replyName = parent.user.username || '';
    }
    return Object.assign({}, c, { replyName: replyName });
  });
}

function goDetail(p) {
  router.push('/post/' + p._id);
}

function goProfile(user) {
  if (user && user._id) router.push('/profile/' + user._id);
}

function previewImage(src) {
  previewImg.value = src;
}

async function openFriendPicker() {
  if (!friends.value.length) {
    try {
      const { data } = await api.get('/api/friend/list');
      friends.value = data.friends || [];
    } catch (e) {
      alert('好友列表加载失败');
      return;
    }
  }
  friendQuery.value = '';
  showPicker.value = true;
}

function displayFriend(f) {
  return f.remark || f.username || '';
}

function toggleFriend(id) {
  const key = String(id);
  const index = visibleTo.value.indexOf(key);
  if (index >= 0) visibleTo.value.splice(index, 1);
  else visibleTo.value.push(key);
}

onMounted(load);
</script>

<style scoped>
.moments { height: 100%; overflow: auto; display: flex; flex-direction: column; gap: 14px; padding: 0 2px 24px; }
.cover { position: relative; min-height: 196px; overflow: hidden; border-radius: 22px; padding: 22px; display: flex; flex-direction: column; justify-content: space-between; color: #fff; background: linear-gradient(132deg, #072d1e 0%, #0b5a38 42%, #0b8b55 72%, #4bc48b 100%); box-shadow: 0 18px 45px rgba(5, 75, 44, .24), inset 0 1px 0 rgba(255,255,255,.18); isolation: isolate; }
.cover-glow { position: absolute; width: 260px; height: 260px; right: -66px; top: -92px; border-radius: 50%; background: radial-gradient(circle, rgba(137,255,196,.45), rgba(85,207,157,.08) 52%, transparent 70%); z-index: -1; }
.cover-pattern { position: absolute; inset: 0; z-index: -1; opacity: .22; overflow: hidden; }
.cover-pattern i { position: absolute; border: 1px solid rgba(255,255,255,.55); border-radius: 42% 58% 61% 39%; transform: rotate(-16deg); }
.cover-pattern i:nth-child(1) { width: 230px; height: 130px; right: 34px; bottom: -48px; }
.cover-pattern i:nth-child(2) { width: 160px; height: 90px; right: -22px; bottom: 30px; }
.cover-pattern i:nth-child(3) { width: 120px; height: 120px; right: 180px; top: -74px; border-radius: 50%; }
.cover-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
.cover-kicker { font-size: 11px; font-weight: 600; letter-spacing: .18em; color: rgba(228,255,240,.74); }
.cover-break { display: none; }
.cover h1 { margin: 6px 0 7px; font-size: clamp(22px, 3.4vw, 31px); line-height: 1.2; font-weight: 650; letter-spacing: .015em; text-wrap: balance; text-shadow: 0 2px 16px rgba(0,28,14,.24); }
.cover p { margin: 0; max-width: 460px; font-size: 13px; line-height: 1.6; color: rgba(241,255,247,.72); }
.compose-open { flex-shrink: 0; border: 1px solid rgba(255,255,255,.34); border-radius: 999px; padding: 9px 16px; color: #fff; background: rgba(255,255,255,.13); font-size: 13px; font-weight: 600; backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); box-shadow: inset 0 1px 0 rgba(255,255,255,.2); transition: background .16s ease, transform .16s ease; }
.compose-open:hover { background: rgba(255,255,255,.22); transform: translateY(-1px); }
.cover-user { display: flex; align-items: center; gap: 8px; width: fit-content; padding: 5px 10px 5px 5px; border-radius: 999px; background: rgba(3,35,21,.24); border: 1px solid rgba(255,255,255,.18); cursor: pointer; }
.cover-avatar { width: 29px; height: 29px; font-size: 12px; border: 1px solid rgba(255,255,255,.38); }
.cover-avatar img { border-radius: 50%; }
.cover-user-name { font-size: 12px; color: rgba(255,255,255,.88); }
.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 0 2px; }
.tabs { display: flex; gap: 5px; padding: 3px; border-radius: 12px; background: var(--glass-bg); border: 1px solid var(--glass-border); }
.tab { border: 0; border-radius: 9px; padding: 7px 13px; background: transparent; color: var(--text-soft); font-size: 12px; white-space: nowrap; }
.tab span { margin-left: 3px; opacity: .7; font-size: 10px; }
.tab.on { color: var(--green-dark); background: var(--green-light); font-weight: 600; }
.refresh { border: 0; background: transparent; color: var(--text-soft); font-size: 12px; padding: 6px; }
.refresh:disabled { opacity: .5; }
.timeline { display: flex; flex-direction: column; gap: 10px; position: relative; max-width: 760px; width: 100%; align-self: center; }
.moment-card { display: flex; gap: 11px; padding: 16px; border-radius: 18px; background: var(--glass-bg-strong); border: 1px solid var(--glass-border); box-shadow: var(--glass-highlight); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); }
.moment-avatar { width: 44px; height: 44px; font-size: 17px; cursor: pointer; flex-shrink: 0; }
.moment-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
.moment-main { flex: 1; min-width: 0; }
.moment-head { display: flex; align-items: center; gap: 7px; min-height: 22px; }
.moment-name { border: 0; padding: 0; background: transparent; color: var(--green-dark); font-size: 14px; font-weight: 650; cursor: pointer; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.privacy-tag { flex-shrink: 0; padding: 1px 6px; border-radius: 5px; color: var(--text-soft); background: var(--glass-bg); border: 1px solid var(--glass-border); font-size: 9px; }
.moderation-tag { flex-shrink: 0; padding: 2px 7px; border-radius: 999px; font-size: 10px; font-weight: 600; }
.moderation-tag.pending { background: rgba(230,155,54,.16); color: #b56d0b; }
.moderation-tag.rejected { background: rgba(217,58,63,.12); color: var(--danger); }
.moderation-note { margin-top: 8px; padding: 8px 10px; border-radius: 10px; font-size: 12px; line-height: 1.55; }
.moderation-note.pending { background: rgba(230,155,54,.12); color: #9a5d0b; }
.moderation-note.rejected { background: rgba(217,58,63,.09); color: var(--danger); }
.moment-text { margin: 6px 0 9px; color: var(--text); font-size: var(--fs-base); line-height: 1.72; letter-spacing: var(--tracking); white-space: pre-wrap; word-break: break-word; cursor: pointer; }
.moment-images { display: grid; gap: 4px; width: min(100%, 460px); margin: 9px 0; }
.moment-images.count-1 { grid-template-columns: minmax(0, 300px); }
.moment-images.count-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.moment-images.count-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.moment-image { position: relative; padding: 0; border: 0; background: transparent; border-radius: 7px; overflow: hidden; cursor: zoom-in; aspect-ratio: 1; }
.moment-image img { display: block; width: 100%; height: 100%; object-fit: cover; transition: transform .2s ease; }
.moment-image:hover img { transform: scale(1.035); }
.image-more { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #fff; background: rgba(0,0,0,.45); font-size: 20px; font-weight: 600; }
.moment-meta { display: flex; align-items: center; gap: 12px; margin-top: 5px; color: var(--text-faint); font-size: 11px; }
.meta-delete { border: 0; padding: 0; background: transparent; color: var(--text-faint); font-size: 11px; }
.meta-delete:hover { color: var(--danger); }
.moment-actions { display: flex; align-items: center; gap: 17px; margin-top: 8px; }
.moment-action { display: inline-flex; align-items: center; gap: 4px; border: 0; padding: 5px 0; background: transparent; color: var(--text-soft); font-size: 12px; font-weight: 500; }
.moment-action:hover { color: var(--green-dark); }
.moment-action.liked { color: var(--green); }
.action-mark { position: relative; }
.action-count { font-size: 10px; color: var(--text-faint); }
.social-box { margin-top: 6px; padding: 8px 10px; border-radius: 8px; background: rgba(94, 121, 105, .09); border: 1px solid rgba(94, 121, 105, .09); display: flex; flex-direction: column; gap: 4px; }
.like-row { display: flex; align-items: baseline; gap: 7px; padding-bottom: 4px; border-bottom: 1px solid rgba(94,121,105,.12); color: var(--green-dark); font-size: 11px; }
.social-label { font-weight: 650; }
.comment-preview { display: block; border: 0; padding: 1px 0; background: transparent; color: var(--text); font-size: 11.5px; line-height: 1.55; text-align: left; word-break: break-word; }
.comment-name { color: var(--green-dark); font-weight: 600; }
.comment-reply { color: var(--text-soft); margin-left: 3px; }
.comment-colon { color: var(--text-soft); }
.comment-content { color: var(--text); }
.all-comments { align-self: flex-start; border: 0; padding: 2px 0; background: transparent; color: var(--green-dark); font-size: 10.5px; }
.feed-state { flex: 1; min-height: 250px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 40px 18px; text-align: center; color: var(--text-soft); }
.state-title { color: var(--text); font-size: 15px; font-weight: 600; }
.state-sub { max-width: 340px; font-size: 12px; line-height: 1.6; color: var(--text-soft); }
.empty-mark { width: 54px; height: 54px; display: flex; align-items: center; justify-content: center; margin-bottom: 4px; border-radius: 18px; color: var(--green-dark); background: var(--green-light); font-size: 20px; font-weight: 650; }
.retry-btn { margin-top: 4px; padding: 8px 16px; font-size: 12px; }
.loading-state { align-items: stretch; justify-content: flex-start; padding-top: 18px; }
.skeleton { height: 96px; border-radius: 16px; background: linear-gradient(100deg, rgba(255,255,255,.28) 20%, rgba(255,255,255,.55) 40%, rgba(255,255,255,.28) 60%); background-size: 200% 100%; animation: shimmer 1.4s infinite; border: 1px solid var(--glass-border); }
.skeleton.short { height: 64px; width: 76%; }
@keyframes shimmer { from { background-position: 160% 0; } to { background-position: -60% 0; } }
.modal-mask { position: fixed; inset: 0; z-index: 310; display: flex; align-items: center; justify-content: center; padding: 18px; background: rgba(8,22,14,.34); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
.composer-sheet, .friend-picker { width: min(560px, 100%); max-height: 88vh; overflow: auto; display: flex; flex-direction: column; gap: 12px; padding: 18px; border-radius: 22px; background: var(--glass-bg-strong); border: 1px solid var(--glass-border); box-shadow: var(--glass-shadow), var(--glass-highlight); backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur); }
.composer-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.composer-title { font-size: 18px; font-weight: 650; letter-spacing: var(--tracking); }
.composer-sub { margin-top: 2px; font-size: 11px; color: var(--text-soft); }
.sheet-close { width: 32px; height: 32px; border: 1px solid var(--glass-border); border-radius: 50%; background: var(--glass-bg); color: var(--text-soft); font-size: 21px; line-height: 1; flex-shrink: 0; }
.composer-text { width: 100%; min-height: 118px; resize: vertical; border: 1px solid var(--glass-border); border-radius: 13px; padding: 12px 13px; outline: none; color: var(--text); background: var(--glass-bg); font: inherit; font-size: 14px; line-height: 1.7; }
.composer-text:focus { border-color: rgba(7,193,96,.42); box-shadow: 0 0 0 3px rgba(7,193,96,.1); }
.composer-images { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
.composer-thumb { position: relative; border-radius: 9px; overflow: hidden; aspect-ratio: 1; background: var(--glass-bg); }
.composer-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.thumb-del { position: absolute; right: 4px; top: 4px; width: 22px; height: 22px; border: 0; border-radius: 50%; color: #fff; background: rgba(10,20,14,.56); font-size: 16px; line-height: 1; backdrop-filter: blur(8px); }
.add-image { min-height: 52px; display: flex; align-items: center; justify-content: center; gap: 7px; border: 1px dashed rgba(7,193,96,.34); border-radius: 12px; color: var(--green-dark); background: rgba(7,193,96,.045); font-size: 12px; cursor: pointer; }
.add-image-plus { font-size: 20px; line-height: 1; }
.composer-privacy { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 9px 10px; border-radius: 12px; background: var(--glass-bg); border: 1px solid var(--glass-border); font-size: 12px; color: var(--text-soft); }
.privacy-select { width: 145px; padding: 7px 9px; font-size: 12px; }
.pick-friends-btn { border: 1px solid rgba(7,193,96,.25); border-radius: 9px; padding: 7px 10px; color: var(--green-dark); background: var(--green-light); font-size: 11px; }
.composer-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.char-count { font-size: 10px; color: var(--text-faint); }
.char-count.near { color: #d07a1c; }
.publish-btn { min-width: 88px; padding: 9px 18px; }
.picker-mask { z-index: 330; }
.friend-picker { width: min(430px, 100%); }
.picker-search .field { width: 100%; padding: 8px 11px; font-size: 12px; }
.friend-list { min-height: 130px; max-height: 46vh; overflow: auto; display: flex; flex-direction: column; gap: 3px; }
.friend-row { width: 100%; display: flex; align-items: center; gap: 9px; border: 0; border-radius: 10px; padding: 7px; background: transparent; color: var(--text); text-align: left; }
.friend-row:hover { background: var(--green-light); }
.friend-check { width: 21px; height: 21px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 6px; border: 1.5px solid var(--glass-border); background: var(--glass-bg); color: transparent; font-size: 12px; }
.friend-check.on { color: #fff; border-color: var(--green); background: var(--green); }
.friend-avatar { width: 34px; height: 34px; font-size: 13px; }
.friend-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
.friend-main { display: flex; flex-direction: column; min-width: 0; gap: 1px; }
.friend-name { font-size: 13px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.friend-number { font-size: 10px; color: var(--text-soft); }
.picker-empty { padding: 34px 12px; text-align: center; color: var(--text-soft); font-size: 12px; }
.picker-done { width: 100%; padding: 9px; }
.preview-mask { position: fixed; inset: 0; z-index: 500; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(0,0,0,.87); cursor: zoom-out; }
.preview-mask img { max-width: 94%; max-height: 92%; border-radius: 8px; object-fit: contain; }
@media (max-width: 720px) {
  .moments { gap: 10px; padding-bottom: 18px; }
  .cover { min-height: 168px; padding: 16px; border-radius: 17px; }
  .cover-break { display: inline; }
  .cover h1 { font-size: 21px; max-width: 250px; }
  .cover p { font-size: 11px; max-width: 230px; }
  .cover-kicker { font-size: 9px; }
  .cover-top { gap: 8px; }
  .compose-open { padding: 7px 11px; font-size: 11px; }
  .cover-user { padding: 4px 8px 4px 4px; }
  .toolbar { align-items: stretch; }
  .tab { padding: 6px 9px; font-size: 11px; }
  .moment-card { padding: 12px; gap: 9px; border-radius: 15px; }
  .moment-avatar { width: 38px; height: 38px; font-size: 14px; }
  .moment-text { font-size: 13px; line-height: 1.7; }
  .moment-images { width: 100%; gap: 3px; }
  .moment-actions { gap: 14px; }
  .modal-mask { padding: 0; align-items: flex-end; }
  .composer-sheet, .friend-picker { width: 100%; max-height: 92vh; border-radius: 20px 20px 0 0; padding: 16px; }
  .composer-text { min-height: 105px; }
  .privacy-select { flex: 1; min-width: 118px; }
  .picker-mask { align-items: flex-end; }
}
@media (max-width: 380px) {
  .cover { min-height: 154px; padding: 13px; }
  .cover h1 { font-size: 19px; max-width: 205px; }
  .cover p { display: none; }
  .compose-open { padding: 7px 9px; font-size: 10.5px; }
  .tab { padding: 6px 7px; font-size: 10.5px; }
  .refresh { font-size: 10.5px; }
  .moment-card { padding: 10px; }
  .social-box { padding: 7px 8px; }
  .composer-sheet, .friend-picker { padding: 13px; }
}
</style>
