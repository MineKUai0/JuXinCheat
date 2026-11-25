import { reactive } from 'vue';

const STORAGE_KEY = 'jx_prefs_v1';
const FONT_SIZES = [11, 12, 13, 15, 16, 20, 26];
const FONT_SCALES = {
  small: 0.9,
  normal: 1,
  large: 1.12,
  xlarge: 1.25
};

function readSaved() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {};
  } catch (e) {
    return {};
  }
}

const saved = readSaved();

export const prefs = reactive({
  theme: ['light', 'dark', 'system'].includes(saved.theme) ? saved.theme : 'light',
  fontScale: Object.prototype.hasOwnProperty.call(FONT_SCALES, saved.fontScale)
    ? saved.fontScale : 'normal',
  chatBg: saved.chatBg && typeof saved.chatBg === 'object'
    ? saved.chatBg : { type: 'default', value: '' },
  vipClassicUi: saved.vipClassicUi === true
});

let mediaQuery = null;

function resolvedTheme() {
  if (prefs.theme === 'system') {
    return mediaQuery && mediaQuery.matches ? 'dark' : 'light';
  }
  return prefs.theme;
}

export function applyPreferences() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.theme = resolvedTheme();
  root.dataset.font = prefs.fontScale;
  const scale = FONT_SCALES[prefs.fontScale] || 1;
  FONT_SIZES.forEach(function (size) {
    const name = size === 11 ? '--fs-2xs' : size === 12 ? '--fs-xs' :
      size === 13 ? '--fs-sm' : size === 15 ? '--fs-base' :
      size === 16 ? '--fs-md' : size === 20 ? '--fs-lg' : '--fs-xl';
    root.style.setProperty(name, Math.round(size * scale) + 'px');
  });
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      theme: prefs.theme,
      fontScale: prefs.fontScale,
      chatBg: prefs.chatBg,
      vipClassicUi: prefs.vipClassicUi
    }));
  } catch (e) {}
}

export function setTheme(theme) {
  if (!['light', 'dark', 'system'].includes(theme)) return;
  prefs.theme = theme;
  save();
  applyPreferences();
}

export function setFontScale(fontScale) {
  if (!Object.prototype.hasOwnProperty.call(FONT_SCALES, fontScale)) return;
  prefs.fontScale = fontScale;
  save();
  applyPreferences();
}

export function setVipClassicUi(enabled) {
  prefs.vipClassicUi = enabled === true;
  save();
}

export function setChatBackground(background) {
  const next = background && typeof background === 'object'
    ? { type: background.type || 'default', value: background.value || '' }
    : { type: 'default', value: '' };
  if (next.type === 'image' && next.value.length > 4 * 1024 * 1024) return false;
  prefs.chatBg = next;
  save();
  return true;
}

export function chatBackgroundStyle(background) {
  const bg = background || prefs.chatBg;
  if (!bg || bg.type === 'default' || !bg.value) return {};
  if (bg.type === 'image') {
    return {
      backgroundImage: 'linear-gradient(var(--chat-bg-overlay), var(--chat-bg-overlay)), url(' + bg.value + ')',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'local'
    };
  }
  return {
    backgroundImage: bg.value,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'local'
  };
}

export function initPreferences() {
  mediaQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  if (mediaQuery) {
    const onChange = function () {
      if (prefs.theme === 'system') applyPreferences();
    };
    if (mediaQuery.addEventListener) mediaQuery.addEventListener('change', onChange);
    else if (mediaQuery.addListener) mediaQuery.addListener(onChange);
  }
  applyPreferences();
}
