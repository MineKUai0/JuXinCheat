import { prefs } from './prefs';

const NORMAL_FAVICON = '/logo.png';
const VIP_FAVICON = '/logo-vip.png';
const NORMAL_THEME_COLOR = '#07c160';
const VIP_THEME_COLOR = '#080704';

function applyFavicon(active) {
  const href = active ? VIP_FAVICON : NORMAL_FAVICON;
  const mode = active ? 'vip' : 'normal';
  const current = document.querySelector('link[data-jx-favicon]');
  if (current && current.getAttribute('href') === href && current.dataset.jxFavicon === mode) return;
  const icons = Array.from(document.querySelectorAll('link[rel~="icon"]'));
  const next = document.createElement('link');
  next.rel = 'icon';
  next.type = 'image/png';
  next.href = href;
  next.dataset.jxFavicon = mode;
  document.head.appendChild(next);
  icons.forEach(function (icon) {
    if (icon !== next) icon.remove();
  });
}

function applyTouchIcon(active) {
  const href = active ? VIP_FAVICON : NORMAL_FAVICON;
  const mode = active ? 'vip' : 'normal';
  let current = document.querySelector('link[data-jx-touch-icon]');
  if (!current) {
    current = document.createElement('link');
    current.rel = 'apple-touch-icon';
    current.dataset.jxTouchIcon = mode;
    document.head.appendChild(current);
  }
  current.href = href;
  current.dataset.jxTouchIcon = mode;
}

function applyThemeColor(active) {
  const color = active ? VIP_THEME_COLOR : NORMAL_THEME_COLOR;
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', color);
}

export function applyVipTheme(user) {
  if (typeof document === 'undefined') return;
  const active = !!(user && user.vipActive && !prefs.vipClassicUi);
  if (active) document.documentElement.setAttribute('data-vip', '1');
  else document.documentElement.removeAttribute('data-vip');
  applyFavicon(active);
  applyTouchIcon(active);
  applyThemeColor(active);
}
