<template>
  <div class="favorites">
    <div class="fav-head">
      <div>
        <div class="page-title">收藏</div>
        <div class="page-sub">保存你不想弄丢的聊天内容</div>
      </div>
      <button class="refresh-btn" @click="load">刷新</button>
    </div>

    <div class="tabs">
      <button v-for="item in tabs" :key="item.key"
              :class="['tab', { on: tab === item.key }]" @click="tab = item.key">
        {{ item.label }} <span>{{ countOf(item.key) }}</span>
      </button>
    </div>

    <div class="fav-scroll">
      <div v-if="loading" class="empty">加载中…</div>
      <div v-else-if="!filtered.length" class="empty">
        {{ favorites.length ? '这个分类里还没有收藏' : '在聊天里长按或右键消息，选择“收藏”' }}
      </div>
      <div v-for="f in filtered" :key="f._id" class="fav-item">
        <div class="fav-meta">
          <span class="source-kind">{{ f.sourceKind === 'group' ? '群聊' : '私聊' }}</span>
          <span class="source-name">{{ f.sourceName || '未知来源' }}</span>
          <span class="fav-time">{{ fmtTime(f.createdAt) }}</span>
        </div>
        <div v-if="f.type === 'text'" class="fav-text">{{ f.content }}</div>
        <div v-else-if="f.type === 'image'" class="fav-image-wrap">
          <img class="fav-image" :src="f.image" @click="previewImg = f.image" />
        </div>
        <div v-else class="fav-voice" @click="playVoice(f)">
          <span class="voice-icon">{{ playingId === f._id ? '暂停' : '播放' }}</span>
          <span class="voice-wave"><i></i><i></i><i></i><i></i></span>
          <span class="voice-dur">{{ f.duration }}″</span>
        </div>
        <div class="fav-foot">
          <button v-if="f.type === 'text'" class="text-op" @click="copyText(f)">复制</button>
          <button v-if="f.type === 'image'" class="text-op" @click="previewImg = f.image">查看大图</button>
          <button class="text-op danger" @click="removeFavorite(f)">删除收藏</button>
        </div>
      </div>
    </div>

    <Transition name="fade">
      <div v-if="previewImg" class="preview-mask" @click="previewImg = ''">
        <img :src="previewImg" />
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import api from '../api';

const favorites = ref([]);
const loading = ref(true);
const tab = ref('all');
const previewImg = ref('');
const playingId = ref('');
let audio = null;

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'text', label: '文字' },
  { key: 'image', label: '图片' },
  { key: 'voice', label: '语音' }
];

const filtered = computed(function () {
  if (tab.value === 'all') return favorites.value;
  return favorites.value.filter(function (f) { return f.type === tab.value; });
});

function countOf(key) {
  if (key === 'all') return favorites.value.length;
  return favorites.value.filter(function (f) { return f.type === key; }).length;
}

function pad(n) { return n < 10 ? '0' + n : '' + n; }

function fmtTime(value) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const hm = pad(d.getHours()) + ':' + pad(d.getMinutes());
  if (d.toDateString() === now.toDateString()) return hm;
  return (d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + hm;
}

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get('/api/favorite');
    favorites.value = data.favorites || [];
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '收藏加载失败');
  } finally {
    loading.value = false;
  }
}

function stopAudio() {
  if (audio) {
    audio.pause();
    audio = null;
  }
  playingId.value = '';
}

function playVoice(f) {
  if (!f || !f.voice) return;
  if (playingId.value === f._id) {
    stopAudio();
    return;
  }
  stopAudio();
  audio = new Audio(f.voice);
  playingId.value = f._id;
  audio.onended = stopAudio;
  audio.onerror = function () {
    stopAudio();
    alert('语音播放失败');
  };
  audio.play().catch(function () {
    stopAudio();
    alert('语音播放失败');
  });
}

function copyText(f) {
  if (!f || !f.content) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(f.content).catch(function () {});
  }
}

async function removeFavorite(f) {
  if (!f || !confirm('从收藏中删除这条内容？')) return;
  try {
    await api.delete('/api/favorite/' + f._id);
    if (playingId.value === f._id) stopAudio();
    favorites.value = favorites.value.filter(function (x) { return x._id !== f._id; });
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '删除失败');
  }
}

onMounted(load);
onBeforeUnmount(stopAudio);
</script>

<style scoped>
.favorites { height: 100%; display: flex; flex-direction: column; gap: 12px; overflow: hidden; }
.fav-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.page-title { font-size: var(--fs-lg); font-weight: var(--fw-semibold); }
.page-sub { margin-top: 2px; font-size: var(--fs-xs); color: var(--text-soft); }
.refresh-btn { border: 1px solid var(--glass-border); border-radius: 10px; padding: 7px 12px; background: var(--glass-bg); color: var(--text-soft); font-size: var(--fs-xs); }
.tabs { display: flex; gap: 4px; padding: 4px; width: fit-content; border-radius: 12px; background: var(--glass-bg); border: 1px solid var(--glass-border); }
.tab { border: 0; border-radius: 9px; padding: 7px 12px; background: transparent; color: var(--text-soft); font-size: var(--fs-sm); }
.tab span { font-size: var(--fs-2xs); opacity: .7; }
.tab.on { background: var(--green); color: #fff; }
.fav-scroll { flex: 1; min-height: 0; overflow: auto; display: flex; flex-direction: column; gap: 9px; padding-right: 3px; }
.fav-item { padding: 13px; border-radius: 16px; background: var(--glass-bg); border: 1px solid var(--glass-border); box-shadow: var(--glass-highlight); }
.fav-meta { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; font-size: var(--fs-2xs); color: var(--text-soft); }
.source-kind { padding: 1px 6px; border-radius: 5px; background: var(--green-light); color: var(--green-dark); font-weight: var(--fw-semibold); }
.source-name { max-width: 40%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fav-time { margin-left: auto; font-variant-numeric: tabular-nums; }
.fav-text { font-size: var(--fs-base); color: var(--text); line-height: 1.7; white-space: pre-wrap; word-break: break-word; }
.fav-image-wrap { display: flex; }
.fav-image { width: min(220px, 72vw); max-height: 220px; object-fit: cover; border-radius: 10px; cursor: zoom-in; }
.fav-voice { display: inline-flex; align-items: center; gap: 9px; padding: 9px 12px; border-radius: 11px; background: var(--green-light); color: var(--green-dark); cursor: pointer; }
.voice-icon { font-size: var(--fs-xs); font-weight: var(--fw-semibold); }
.voice-wave { display: inline-flex; gap: 3px; align-items: center; }
.voice-wave i { width: 3px; border-radius: 2px; background: currentColor; opacity: .65; }
.voice-wave i:nth-child(1) { height: 7px; }
.voice-wave i:nth-child(2) { height: 14px; }
.voice-wave i:nth-child(3) { height: 9px; }
.voice-wave i:nth-child(4) { height: 16px; }
.voice-dur { font-size: var(--fs-xs); opacity: .8; }
.fav-foot { display: flex; gap: 14px; margin-top: 9px; padding-top: 8px; border-top: 1px solid var(--line); }
.text-op { border: 0; padding: 0; background: transparent; color: var(--text-soft); font-size: var(--fs-xs); }
.text-op:hover { color: var(--green); }
.text-op.danger { margin-left: auto; color: var(--danger); }
.empty { padding: 54px 18px; text-align: center; color: var(--text-soft); font-size: var(--fs-sm); line-height: 1.6; }
.preview-mask { position: fixed; inset: 0; z-index: 300; background: rgba(0,0,0,.86); display: flex; align-items: center; justify-content: center; cursor: zoom-out; }
.preview-mask img { max-width: 92%; max-height: 92%; border-radius: 10px; }
@media (max-width: 720px) {
  .tab { padding: 7px 9px; font-size: 12.5px; }
  .fav-item { padding: 11px; }
}
</style>
