<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="settings-mask" data-testid="settings-dialog" @click.self="$emit('close')">
        <div class="settings-card">
          <div class="settings-head">
            <div>
              <div class="settings-title">设置</div>
              <div class="settings-sub">外观只保存在这台设备上</div>
            </div>
            <button class="close-btn" aria-label="关闭设置" @click="$emit('close')">×</button>
          </div>

          <section class="setting-section">
            <div class="section-title">深色模式</div>
            <div class="segment segment-two">
              <button v-for="item in themeOptions" :key="item.value"
                      :class="['segment-btn', { on: prefs.theme === item.value }]"
                      @click="setTheme(item.value)">{{ item.label }}</button>
            </div>
          </section>

          <section class="setting-section">
            <div class="section-title">字体大小</div>
            <div class="font-options">
              <button v-for="item in fontOptions" :key="item.value"
                      :class="['font-btn', item.value, { on: prefs.fontScale === item.value }]"
                      @click="setFontScale(item.value)">{{ item.label }}</button>
            </div>
            <div class="preview-text">这是一段聊天文字预览，调整到看着舒服就好。</div>
          </section>

          <section v-if="store.user && store.user.vipActive" class="setting-section">
            <div class="section-title">VIP 界面</div>
            <div class="segment">
              <button :class="['segment-btn', { on: !prefs.vipClassicUi }]"
                      @click="setVipClassicUi(false)">黑金界面</button>
              <button :class="['segment-btn', { on: prefs.vipClassicUi }]"
                      @click="setVipClassicUi(true)">原来的界面</button>
            </div>
            <div class="setting-note">
              {{ prefs.vipClassicUi ? '当前使用普通界面，黑金 VIP 徽章和权益仍然保留。' : '当前使用黑金界面，可随时切回原来的普通界面。' }}
            </div>
          </section>

          <section class="setting-section">
            <div class="section-title">聊天背景</div>
            <div class="bg-grid">
              <button v-for="item in backgroundPresets" :key="item.id"
                      :class="['bg-swatch', { on: isBgSelected(item) }]"
                      :style="{ background: item.value || 'var(--field-bg)' }"
                      :title="item.label"
                      @click="choosePreset(item)">
                <span>{{ item.label }}</span>
              </button>
              <label class="bg-swatch upload" title="上传聊天背景">
                <input type="file" accept="image/*" hidden @change="onBackgroundFile" />
                <span>{{ prefs.chatBg.type === 'image' ? '更换图片' : '上传图片' }}</span>
              </label>
            </div>
            <button class="reset-bg" @click="resetBackground">恢复默认背景</button>
          </section>

          <div class="settings-foot">
            <button class="btn" @click="$emit('close')">完成</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import {
  prefs, setTheme, setFontScale, setChatBackground, setVipClassicUi
} from '../utils/prefs';
import { useUserStore } from '../store/user';
import { readImageFile } from '../utils/image';

defineProps({ open: { type: Boolean, default: false } });
defineEmits(['close']);

const store = useUserStore();

const themeOptions = [
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
  { value: 'system', label: '跟随系统' }
];

const fontOptions = [
  { value: 'small', label: '小' },
  { value: 'normal', label: '标准' },
  { value: 'large', label: '大' },
  { value: 'xlarge', label: '特大' }
];

const backgroundPresets = [
  { id: 'default', label: '默认', value: '' },
  { id: 'mint', label: '薄荷', value: 'linear-gradient(145deg, #d8f7e8, #edfaf3 55%, #d6edff)' },
  { id: 'peach', label: '暖阳', value: 'linear-gradient(145deg, #ffe6cf, #fff4df 55%, #ffd9dc)' },
  { id: 'sky', label: '晴空', value: 'linear-gradient(145deg, #d9ecff, #eef6ff 55%, #e4e1ff)' },
  { id: 'night', label: '夜色', value: 'linear-gradient(145deg, #15251c, #1b2f25 55%, #0f2029)' },
  { id: 'paper', label: '纸张', value: 'repeating-linear-gradient(0deg, #faf6ea, #faf6ea 22px, #f0eadb 23px)' }
];

function isBgSelected(item) {
  if (item.id === 'default') return prefs.chatBg.type === 'default';
  return prefs.chatBg.type === 'preset' && prefs.chatBg.value === item.value;
}

function choosePreset(item) {
  if (item.id === 'default') setChatBackground({ type: 'default', value: '' });
  else setChatBackground({ type: 'preset', value: item.value });
}

function resetBackground() {
  setChatBackground({ type: 'default', value: '' });
}

async function onBackgroundFile(e) {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const value = await readImageFile(file, { maxSize: 1400, quality: 0.78, maxBytes: 3 * 1024 * 1024 });
    if (!setChatBackground({ type: 'image', value: value })) {
      alert('背景图片太大，请换一张');
    }
  } catch (err) {
    alert(err.message || '背景图片读取失败');
  }
}
</script>

<style scoped>
.settings-mask { position: fixed; inset: 0; z-index: 500; display: flex; align-items: center; justify-content: center; padding: 18px; background: rgba(10, 22, 15, .34); backdrop-filter: blur(9px); -webkit-backdrop-filter: blur(9px); }
.settings-card { width: min(540px, 100%); max-height: 88vh; overflow: auto; padding: 20px; border-radius: 22px; border: 1px solid var(--glass-border); background: var(--glass-bg-strong); box-shadow: var(--glass-shadow), var(--glass-highlight); backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur); display: flex; flex-direction: column; gap: 20px; }
.settings-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.settings-title { font-size: 20px; font-weight: var(--fw-semibold); }
.settings-sub { margin-top: 3px; font-size: var(--fs-xs); color: var(--text-soft); }
.close-btn { width: 34px; height: 34px; border: 1px solid var(--glass-border); border-radius: 50%; background: var(--glass-bg); color: var(--text-soft); font-size: 22px; line-height: 1; }
.setting-section { display: flex; flex-direction: column; gap: 10px; }
.section-title { font-size: var(--fs-sm); font-weight: var(--fw-semibold); color: var(--text-soft); }
.segment { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; padding: 4px; border-radius: 13px; background: var(--glass-bg); border: 1px solid var(--glass-border); }
.segment.segment-two { grid-template-columns: repeat(2, 1fr); }
.segment-btn { border: 0; border-radius: 9px; padding: 9px 7px; background: transparent; color: var(--text-soft); font-size: var(--fs-sm); }
.segment-btn.on { background: var(--green); color: #fff; box-shadow: 0 4px 12px rgba(7,193,96,.25); }
.font-options { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.font-btn { border: 1px solid var(--glass-border); border-radius: 11px; padding: 10px 4px; background: var(--glass-bg); color: var(--text-soft); }
.font-btn.small { font-size: 12px; }
.font-btn.normal { font-size: 14px; }
.font-btn.large { font-size: 17px; }
.font-btn.xlarge { font-size: 20px; }
.font-btn.on { border-color: var(--green); color: var(--green-dark); background: var(--green-light); font-weight: var(--fw-semibold); }
.preview-text { padding: 11px 13px; border-radius: 12px; background: var(--glass-bg); border: 1px solid var(--glass-border); color: var(--text); font-size: var(--fs-base); line-height: 1.65; }
.setting-note { color: var(--text-soft); font-size: var(--fs-xs); line-height: 1.6; }
.bg-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.bg-swatch { position: relative; min-height: 62px; border-radius: 12px; border: 2px solid var(--glass-border); color: #153020; font-size: 12px; font-weight: var(--fw-semibold); overflow: hidden; background: var(--glass-bg); }
.bg-swatch span { position: relative; display: inline-block; padding: 4px 8px; border-radius: 8px; background: rgba(255,255,255,.72); color: #153020; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
.bg-swatch.on { border-color: var(--green); box-shadow: 0 0 0 3px rgba(7,193,96,.16); }
.bg-swatch.upload { display: flex; align-items: center; justify-content: center; border-style: dashed; cursor: pointer; background: var(--glass-bg); color: var(--text-soft); }
.bg-swatch.upload span { background: transparent; color: var(--text-soft); }
.reset-bg { align-self: flex-start; border: 0; padding: 2px 0; background: transparent; color: var(--text-soft); font-size: var(--fs-xs); text-decoration: underline; text-underline-offset: 3px; }
.settings-foot { display: flex; justify-content: flex-end; }
@media (max-width: 420px) {
  .settings-card { padding: 16px; border-radius: 18px; gap: 16px; }
  .bg-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
