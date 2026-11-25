// 新消息提醒：提示音 + 页面标题闪烁
let audioCtx = null;
let titleTimer = null;
let titleOn = false;
let baseTitle = '巨信 cheat';
let installed = false;

function beep() {
  try {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1180, now + 0.12);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  } catch (e) {}
}

export function initNotifyAudio() {
  try {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(function () {});
  } catch (e) {}
}

export function startTitleFlash() {
  if (titleTimer) return;
  titleOn = true;
  document.title = '【新消息】' + baseTitle;
  titleTimer = setInterval(function () {
    titleOn = !titleOn;
    document.title = titleOn ? '【新消息】' + baseTitle : baseTitle;
  }, 1000);
}

export function stopTitleFlash() {
  if (titleTimer) {
    clearInterval(titleTimer);
    titleTimer = null;
  }
  titleOn = false;
  document.title = baseTitle;
}

export function installNotify() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  baseTitle = document.title || baseTitle;

  window.addEventListener('focus', stopTitleFlash);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) stopTitleFlash();
  });
  // 用户有任何操作时解锁声音，并停止标题闪烁
  document.addEventListener('pointerdown', function () {
    initNotifyAudio();
    stopTitleFlash();
  });
  document.addEventListener('keydown', function () {
    initNotifyAudio();
    stopTitleFlash();
  });
}

export function notifyNewMessage() {
  installNotify();
  initNotifyAudio();
  if (audioCtx) {
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().then(beep).catch(function () {});
    } else {
      beep();
    }
  }
  startTitleFlash();
}
