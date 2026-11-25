<template>
  <main class="page">
    <div class="orb orb-a"></div><div class="orb orb-b"></div>
    <div class="wrap">
      <header class="top">
        <RouterLink class="brand" to="/"><img src="/logo.png" alt="" /><b>巨信 Cheat</b></RouterLink>
        <div class="lang-switch">
          <button :class="{on: lang === 'zh'}" @click="chooseLanguage('zh')">中文</button>
          <button :class="{on: lang === 'zh-TW'}" @click="chooseLanguage('zh-TW')">繁體中文</button>
          <button :class="{on: lang === 'en'}" @click="chooseLanguage('en')">English</button>
        </div>
        <span class="cloud"><i></i> {{ c.cloud }}</span>
      </header>
      <section class="hero">
        <div>
          <p class="eyebrow">JU XIN · NATIVE CLIENT</p>
          <h1>{{ c.heroA }}<em>{{ c.heroB }}</em></h1>
          <p class="lead">{{ c.lead }}</p>
          <div class="actions">
            <a class="primary" href="#downloads">{{ c.downloadNow }} <span>↓</span></a>
            <small><b>{{ c.secure }}</b><br />{{ c.channel }}</small>
          </div>
        </div>
        <div class="art" aria-hidden="true">
          <div class="glow"></div>
          <div class="back-card"><span>{{ c.instant }}</span><strong>99.9%</strong><small>{{ c.stable }}</small></div>
          <div class="main-card">
            <div class="art-head"><i></i>巨信 Cheat <b>•••</b></div>
            <div class="msg"><span class="avatar green">J</span><div><b>{{ c.friendMsg }}</b><small>{{ c.nowDelivered }}</small></div><em>✓</em></div>
            <div class="msg"><span class="avatar blue">群</span><div><b>{{ c.groupChat }}</b><small>{{ c.newConversation }}</small></div><em>3</em></div>
            <label>{{ c.nativeSmooth }}</label>
          </div>
          <div class="ball"></div>
        </div>
      </section>
      <section class="features">
        <div><strong>✦</strong><b>{{ c.realtime }}</b><small>{{ c.realtimeHint }}</small></div>
        <div><strong>◈</strong><b>{{ c.vip }}</b><small>{{ c.vipHint }}</small></div>
        <div><strong>⌁</strong><b>{{ c.native }}</b><small>{{ c.nativeHint }}</small></div>
      </section>
      <section id="downloads" class="downloads">
        <div class="heading"><div><p class="eyebrow">DOWNLOAD</p><h2>{{ c.chooseDevice }}</h2></div><span>{{ c.officialPackage }}</span></div>
        <div class="cards">
          <article class="card windows">
            <div class="card-top"><div class="win-icon"><i></i><i></i><i></i><i></i></div><span>{{ c.desktop }}</span></div>
            <h3>Windows</h3><p>{{ c.windowsRequirement }}</p>
            <ul><li>{{ c.windowsFeature1 }}</li><li>{{ c.windowsFeature2 }}</li></ul>
            <div class="download-links">
              <a href="/api/app/windows">{{ c.downloadWindows }} <b>↗</b></a>
              <a href="/api/app/windows-installer">{{ c.downloadInstaller }} <b>↗</b></a>
            </div>
          </article>
          <article class="card android">
            <div class="card-top"><div class="and-icon"><img src="/android-robot.svg" :alt="c.androidRobot" /></div><span>{{ c.mobile }}</span></div>
            <h3>Android™</h3><p>{{ c.androidRequirement }}</p>
            <ul><li>{{ c.androidFeature1 }}</li><li>{{ c.androidFeature2 }}</li></ul>
            <a href="/api/app/download">{{ c.downloadAndroid }} <b>↗</b></a>
          </article>
        </div>
      </section>
      <footer>
        <span>{{ c.footer }}</span>
        <details><summary>{{ c.more }}</summary><RouterLink to="/emergency">{{ c.emergency }}</RouterLink></details>
        <small>Android robot reproduced or modified from work created and shared by Google, used under CC BY 3.0.</small>
      </footer>
    </div>
  </main>
</template>


<script setup>
import { computed, onMounted, ref } from 'vue';

const copy = {
  zh: {
    cloud: '腾讯云稳定运行', heroA: '把聊天，', heroB: '装进你的设备。',
    lead: '更快的消息响应，更沉浸的聊天体验。下载官方原生客户端，连接好友、群聊和每一条重要消息。',
    downloadNow: '立即下载', secure: '端到端连接', channel: '官方客户端专属通道',
    instant: '即时消息', stable: '在线稳定连接', friendMsg: '好友消息', nowDelivered: '现在 · 即时送达',
    groupChat: '群聊', newConversation: '新的对话正在发生', nativeSmooth: '原生客户端 · 更流畅',
    realtime: '实时消息', realtimeHint: '好友与群聊即时同步', vip: '黑金 VIP', vipHint: '专属身份与主题体验',
    native: '原生体验', nativeHint: '独立客户端更稳定', chooseDevice: '选择你的设备',
    officialPackage: '官方安装包 · 持续更新', desktop: '桌面端', windowsRequirement: '适用于 Windows 10 / 11 · 64 位',
    windowsFeature1: '窗口化聊天与群聊', windowsFeature2: '实时消息与文件传输', downloadWindows: '下载 Windows EXE', downloadInstaller: '下载安装版（可选路径）',
    mobile: '移动端', androidRequirement: '适用于安卓手机与平板设备', androidFeature1: '随时随地保持联系',
    androidFeature2: '语音、图片与自定义表情', downloadAndroid: '下载 Android APK', androidRobot: 'Android 机器人',
    footer: '巨信 Cheat · 和好友即刻相连', more: '更多选项', emergency: '应急登录'
  },
  'zh-TW': {
    cloud: '騰訊雲穩定運行', heroA: '把聊天，', heroB: '裝進你的裝置。',
    lead: '更快的訊息回應，更沉浸的聊天體驗。下載官方原生客戶端，連接好友、群聊和每一條重要訊息。',
    downloadNow: '立即下載', secure: '端到端連接', channel: '官方客戶端專屬通道',
    instant: '即時訊息', stable: '在線穩定連接', friendMsg: '好友訊息', nowDelivered: '現在 · 即時送達',
    groupChat: '群聊', newConversation: '新的對話正在發生', nativeSmooth: '原生客戶端 · 更流暢',
    realtime: '即時訊息', realtimeHint: '好友與群聊即時同步', vip: '黑金 VIP', vipHint: '專屬身份與主題體驗',
    native: '原生體驗', nativeHint: '獨立客戶端更穩定', chooseDevice: '選擇你的裝置',
    officialPackage: '官方安裝包 · 持續更新', desktop: '桌面端', windowsRequirement: '適用於 Windows 10 / 11 · 64 位',
    windowsFeature1: '視窗化聊天與群聊', windowsFeature2: '即時訊息與檔案傳輸', downloadWindows: '下載 Windows EXE', downloadInstaller: '下載安裝版（可選路徑）',
    mobile: '移動端', androidRequirement: '適用於安卓手機與平板裝置', androidFeature1: '隨時隨地保持聯繫',
    androidFeature2: '語音、圖片與自訂表情', downloadAndroid: '下載 Android APK', androidRobot: 'Android 機器人',
    footer: '巨信 Cheat · 和好友即刻相連', more: '更多選項', emergency: '應急登入'
  },
  en: {
    cloud: 'Tencent Cloud · stable', heroA: 'Put your chats,', heroB: 'on every device.',
    lead: 'Faster messages and a more immersive chat experience. Download the native client and stay connected with friends, groups and every important message.',
    downloadNow: 'Download now', secure: 'End-to-end connection', channel: 'Official client channel',
    instant: 'Instant messages', stable: 'Stable online connection', friendMsg: 'Friend message', nowDelivered: 'Now · delivered instantly',
    groupChat: 'Group chat', newConversation: 'A new conversation is happening', nativeSmooth: 'Native client · smoother',
    realtime: 'Real-time messages', realtimeHint: 'Friends and groups sync instantly', vip: 'Black-gold VIP', vipHint: 'Exclusive identity and themes',
    native: 'Native experience', nativeHint: 'A standalone client is more stable', chooseDevice: 'Choose your device',
    officialPackage: 'Official installers · always updated', desktop: 'Desktop', windowsRequirement: 'For Windows 10 / 11 · 64-bit',
    windowsFeature1: 'Windowed chats and groups', windowsFeature2: 'Real-time messages and file transfer', downloadWindows: 'Download Windows EXE', downloadInstaller: 'Download installer (choose path)',
    mobile: 'Mobile', androidRequirement: 'For Android phones and tablets', androidFeature1: 'Stay connected anywhere',
    androidFeature2: 'Voice, images and custom stickers', downloadAndroid: 'Download Android APK', androidRobot: 'Android robot',
    footer: 'JuXin Cheat · connect with friends instantly', more: 'More options', emergency: 'Emergency login'
  }
};
const saved = localStorage.getItem('lang');
const lang = ref(saved === 'en' || saved === 'zh-TW' || saved === 'zh' ? saved : 'zh');
const c = computed(() => copy[lang.value] || copy.zh);

function chooseLanguage(value) {
  lang.value = value;
  localStorage.setItem('lang', value);
}

onMounted(async () => {
  if (saved) return;
  try {
    const response = await fetch('/api/app/region', { headers: { Accept: 'application/json' } });
    if (!response.ok) return;
    const data = await response.json();
    if (data.locale === 'en') chooseLanguage('en');
    else if (data.locale === 'zh-TW') chooseLanguage('zh-TW');
    else chooseLanguage('zh');
  } catch (e) {}
});
</script>

<style scoped>
.page{position:relative;min-height:100%;overflow:auto;background:#07100d;color:#f5faf7;font-family:var(--font-sans,"Microsoft YaHei",system-ui,sans-serif);isolation:isolate}.wrap{width:min(calc(100% - 36px),1120px);margin:auto;min-height:100%}.orb{position:absolute;z-index:-1;border-radius:50%;pointer-events:none}.orb-a{width:550px;height:550px;top:-260px;right:-130px;background:radial-gradient(circle,rgba(13,207,118,.27),transparent 68%)}.orb-b{width:480px;height:480px;left:-250px;top:700px;background:radial-gradient(circle,rgba(48,118,255,.18),transparent 70%)}.top{display:flex;align-items:center;justify-content:space-between;padding:24px 0}.brand{display:flex;align-items:center;gap:11px;color:#f8fffb;text-decoration:none}.brand img{width:42px;height:42px;border-radius:13px}.cloud{padding:8px 12px;color:#a8bcb2;border:1px solid #ffffff1f;border-radius:999px;font-size:11px}.cloud i{display:inline-block;width:6px;height:6px;margin-right:6px;border-radius:50%;background:#2ee88a;box-shadow:0 0 10px #2ee88a}.hero{display:grid;grid-template-columns:1.02fr .98fr;gap:50px;align-items:center;padding:clamp(55px,9vw,112px) 0 74px}.eyebrow{margin:0 0 17px;color:#54dc9a;font-size:11px;font-weight:750;letter-spacing:.18em}h1{margin:0;font-size:clamp(43px,6.4vw,84px);line-height:1.03;letter-spacing:-.065em}h1 em{display:block;color:#5be09c;font-style:normal}.lead{max-width:500px;margin:24px 0 0;color:#9caea5;font-size:clamp(15px,1.8vw,18px);line-height:1.75}.actions{display:flex;align-items:center;gap:22px;margin-top:34px}.primary{display:inline-flex;gap:22px;align-items:center;padding:14px 19px 14px 22px;color:#06150d;background:#59e59b;border-radius:10px;text-decoration:none;font-size:14px;font-weight:800}.primary span{font-size:20px}.actions small{color:#8b9c93;line-height:1.5}.actions small b{color:#dbeee3}.art{position:relative;min-height:375px}.glow{position:absolute;inset:19% 12% 4%;border-radius:50%;background:radial-gradient(circle,#40e09233,transparent 65%);filter:blur(10px)}.back-card,.main-card{position:absolute;border:1px solid #ffffff22;box-shadow:0 25px 70px #00000057;backdrop-filter:blur(18px)}.back-card{right:3%;top:9%;width:210px;padding:17px;border-radius:18px;color:#a5b9ad;background:#1d3d308c;transform:rotate(8deg)}.back-card span,.back-card small{display:block;font-size:11px}.back-card strong{display:block;color:#65e3a1;font-size:31px;margin:13px 0 2px}.main-card{z-index:1;left:6%;top:13%;width:min(77%,360px);padding:20px;border-radius:25px;background:linear-gradient(145deg,#183a2be6,#0d1a16e0);transform:rotate(-4deg)}.art-head{display:flex;align-items:center;gap:8px;padding-bottom:30px;color:#d8efe0;font-size:12px;font-weight:700}.art-head i{width:8px;height:8px;border-radius:50%;background:#5be09c;box-shadow:0 0 10px #5be09c}.art-head b{margin-left:auto;color:#839a8b}.msg{display:flex;align-items:center;gap:10px;padding:12px 0;border-top:1px solid #ffffff17}.avatar{display:grid;place-items:center;width:34px;height:34px;border-radius:12px;color:#06150d;font-size:11px;font-weight:800}.green{background:#58dfa0}.blue{background:#7bb6ff}.msg div{display:grid;gap:2px}.msg b{font-size:12px}.msg small{color:#7d9888;font-size:10px}.msg em{margin-left:auto;color:#5be09c;font-style:normal}.main-card label{display:inline-block;margin-top:17px;padding:8px 10px;color:#75e8ab;background:#50e0971a;border:1px solid #50e09729;border-radius:999px;font-size:10px}.ball{position:absolute;right:15%;bottom:6%;width:90px;height:90px;border-radius:50%;background:linear-gradient(145deg,#56e59d,#1c8860);box-shadow:0 0 0 12px #53e29d14,0 20px 50px #11815066}.features{display:grid;grid-template-columns:repeat(3,1fr);margin-bottom:88px;border-top:1px solid #ffffff1a;border-bottom:1px solid #ffffff1a}.features>div{display:grid;grid-template-columns:30px 1fr;column-gap:9px;padding:20px 0}.features strong{grid-row:span 2;color:#5be09c;font-size:18px}.features small{color:#7d9185;font-size:11px}.downloads{padding-bottom:70px}.heading{display:flex;align-items:end;justify-content:space-between;margin-bottom:23px}.heading h2{margin:0;font-size:clamp(27px,4vw,43px);letter-spacing:-.05em}.heading>span{color:#7d9486;font-size:12px}.heading .eyebrow{margin-bottom:8px}.cards{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}.card{position:relative;min-height:330px;padding:26px;overflow:hidden;border:1px solid #ffffff22;border-radius:22px}.card:after{content:"";position:absolute;right:-55px;bottom:-70px;width:220px;height:220px;border-radius:50%;background:#ffffff0a}.windows{background:linear-gradient(140deg,#0e1c2b,#102018)}.android{background:linear-gradient(140deg,#0d241d,#112019)}.card-top{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between}.card-top>span{color:#90a79a;font-size:11px}.win-icon{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:3px;width:51px;height:51px;padding:10px;background:#1f8cff;box-shadow:0 9px 25px #1f8cff45;transform:skewY(-7deg)}.win-icon i{background:#d9edff}.and-icon{position:relative;width:51px;height:51px;border-radius:15px;background:#3ddc84;box-shadow:0 9px 25px #3ddc8440}.and-icon .head{position:absolute;top:14px;left:11px;width:29px;height:20px;border-radius:15px 15px 5px 5px;background:#092016}.and-icon .head:before,.and-icon .head:after{content:"";position:absolute;top:7px;width:3px;height:3px;border-radius:50%;background:#3ddc84}.and-icon .head:before{left:8px}.and-icon .head:after{right:8px}.and-icon .body{position:absolute;top:35px;left:12px;width:27px;height:13px;border-radius:3px 3px 7px 7px;background:#092016}.antenna,.arm,.leg{position:absolute;background:#092016;border-radius:4px}.antenna{top:8px;width:1px;height:9px}.antenna.l{left:18px;transform:rotate(-28deg)}.antenna.r{right:18px;transform:rotate(28deg)}.arm{top:35px;width:4px;height:14px}.arm.l{left:7px}.arm.r{right:7px}.leg{top:46px;width:4px;height:8px}.leg.l{left:18px}.leg.r{right:18px}.card h3{position:relative;z-index:1;margin:24px 0 4px;font-size:25px}.card p{position:relative;z-index:1;color:#94a99c;font-size:12px}.card ul{position:relative;z-index:1;display:grid;gap:6px;margin:22px 0 24px;padding:0;color:#b9c9bf;list-style:none;font-size:12px}.card li:before{content:"✓";margin-right:8px;color:#5be09c}.download-links{position:relative;z-index:1;display:flex;gap:8px;flex-wrap:wrap}.card a{position:relative;z-index:1;display:inline-flex;gap:24px;align-items:center;padding:11px 14px;border:1px solid #ffffff2b;border-radius:9px;color:#edfaf1;text-decoration:none;font-size:12px;font-weight:700;background:#ffffff0f}.card a b{color:#5be09c;font-size:17px}footer{display:flex;justify-content:space-between;align-items:center;padding:22px 0 25px;color:#687d70;font-size:11px;border-top:1px solid #ffffff1a}footer details{position:relative}footer summary{color:#82968a;cursor:pointer;list-style:none}footer summary::-webkit-details-marker{display:none}footer details a{position:absolute;right:0;bottom:24px;width:max-content;padding:8px 10px;color:#b1c5b7;background:#13251c;border:1px solid #ffffff24;border-radius:8px;text-decoration:none}@media(max-width:760px){.wrap{width:min(calc(100% - 28px),560px)}.cloud{display:none}.hero{grid-template-columns:1fr;gap:15px;padding-top:45px}.art{min-height:310px}.main-card{left:2%;width:82%}.features{margin-bottom:60px}.heading{align-items:start;flex-direction:column;gap:4px}.cards{grid-template-columns:1fr}.card{min-height:300px}}@media(max-width:420px){h1{font-size:42px}.actions{align-items:start;flex-direction:column;gap:14px}.art{min-height:280px;transform:scale(.94);transform-origin:top left;width:106%}.features>div{display:block;padding:17px 5px}.features strong{display:block;margin-bottom:7px}.features b,.features small{display:block}footer{align-items:start;gap:14px;flex-direction:column}}

/* 首屏标题可读性与移动端画布不溢出 */
h1 { color: #f5faf7; font-size: clamp(43px, 5.2vw, 72px); }
h1 em { white-space: nowrap; }
@media (max-width: 760px) {
  .hero { overflow: hidden; }
  .art { width: 100%; transform: none; }
  .features { grid-template-columns: 1fr; }
  .main-card { width: 72%; left: 5%; transform: rotate(-2deg); }
  .back-card { right: 0; width: 180px; }
}
@media (max-width: 420px) {
  h1 { font-size: 40px; }
  .features { grid-template-columns: 1fr; }
  .features > div { padding: 15px 4px; }
  .main-card { width: 76%; left: 6%; transform: rotate(-2deg); }
  .back-card { right: -2%; width: 180px; }
}
h2 { color: #f5faf7; }
.and-icon { display:grid; place-items:center; overflow:hidden; }
.and-icon img { width:48px; height:48px; object-fit:contain; }
footer small { display:block; flex-basis:100%; margin-top:10px; color:#6d8377; font-size:9px; line-height:1.4; }
.lang-switch{display:flex;gap:5px;align-items:center;margin-left:auto;margin-right:12px}.lang-switch button{border:1px solid #ffffff24;background:#ffffff0d;color:#9caea5;border-radius:999px;padding:5px 8px;font-size:10px;cursor:pointer}.lang-switch button.on{color:#06150d;background:#59e59b;border-color:#59e59b}@media(max-width:760px){.lang-switch{margin-left:0;order:3;width:100%;justify-content:flex-end;margin-top:8px}.top{flex-wrap:wrap}.cloud{display:none}}
</style>
