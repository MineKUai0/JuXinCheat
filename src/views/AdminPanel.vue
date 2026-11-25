<template>
  <div class="admin">
    <div class="topbar">
      <span class="back" @click="$router.push('/home')">返回主页</span>
      <span class="title">管理端</span>
      <span style="width:60px"></span>
    </div>

    <div class="tabs">
      <div :class="['tab', { active: tab === 'users' }]" @click="tab = 'users'; loadUsers()">用户</div>
      <div :class="['tab', { active: tab === 'devices' }]" @click="tab = 'devices'; loadDeviceBans()">设备封禁</div>
      <div :class="['tab', { active: tab === 'posts' }]" @click="tab = 'posts'; loadPosts('pending')">内容审核 ({{ postPending }})</div>
      <div :class="['tab', { active: tab === 'announce' }]" @click="tab = 'announce'; loadAnns()">公告</div>
      <div :class="['tab', { active: tab === 'deletes' }]" @click="tab = 'deletes'; loadDeleteReqs()">注销审核 ({{ delReqs.length }})</div>
      <div :class="['tab', { active: tab === 'reports' }]" @click="tab = 'reports'; loadReports()">举报审核 ({{ reportPending }})</div>
      <div :class="['tab', { active: tab === 'vip' }]" @click="tab = 'vip'; loadVipCodes()">VIP激活码</div>
      <div :class="['tab', { active: tab === 'audit' }]" @click="tab = 'audit'; loadAudits()">操作日志</div>
      <div :class="['tab', { active: tab === 'security' }]" @click="tab = 'security'; load2fa()">安全设置</div>
    </div>

    <div class="content">
      <!-- 用户 -->
      <div v-if="tab === 'users'">
        <div class="user-tools">
          <input v-model="userQuery" class="field" placeholder="搜索用户名、编号或邮箱"
                 @keyup.enter="searchUsers" />
          <button class="btn" @click="searchUsers">搜索</button>
        </div>
        <div v-for="u in users" :key="u._id" class="row user-row">
          <div class="avatar">
            <img v-if="u.avatar" :src="u.avatar" />
            <span v-else>{{ (u.username || '?')[0] }}</span>
          </div>
          <div class="info">
            <div class="name">
              {{ u.username }}
              <span v-if="u.number" class="tag-num">巨信号 {{ u.number }}</span>
              <span v-if="u.isAdmin" class="tag-adm">管理员</span>
              <span v-for="(b, i) in userBadges(u)" :key="'ub-' + i"
                    :class="['title-badge', 'title-' + (b.style || 'vip')]">
                <span class="title-badge-text">{{ b.name }}</span>
              </span>
            </div>
            <div class="muted admin-fields">邮箱：{{ u.email }} · 密码：已加密，不能查看原文</div>
            <div v-if="isBanned(u)" class="banned-text">已封禁至 {{ fmt(u.bannedUntil) }}</div>
          </div>
          <div class="ops user-ops">
            <button v-if="String(u._id) !== String(store.myId)" class="btn-ghost btn" @click="adminAddFriend(u)">加好友</button>
            <button class="btn-ghost btn" :class="{ 'vip-granted': u.vipActive }" @click="toggleVip(u)">{{ u.vipActive ? '取消VIP' : '开通VIP' }}</button>
            <button class="btn-ghost btn" @click="openTitleDialog(u)">称号</button>
            <button v-if="!u.isAdmin" class="btn-ghost btn" @click="resetUserPassword(u)">重置密码</button>
            <button v-if="!u.isAdmin && !isBanned(u)" class="btn-danger" @click="banUser(u)">封禁</button>
            <button v-if="!u.isAdmin && isBanned(u)" class="btn-ghost btn" @click="unbanUser(u)">解封</button>
            <button v-if="!u.isAdmin" class="btn-ghost btn" @click="delUser(u)">删除</button>
          </div>
        </div>
        <div class="pager">
          <button class="btn-ghost btn small" :disabled="userPage <= 1" @click="userPage--; loadUsers()">上一页</button>
          <span class="muted">第 {{ userPage }} / {{ userPages }} 页，共 {{ userTotal }} 人</span>
          <button class="btn-ghost btn small" :disabled="userPage >= userPages" @click="userPage++; loadUsers()">下一页</button>
        </div>
      </div>

      <!-- HWID 设备封禁 -->
      <div v-if="tab === 'devices'">
        <div class="user-tools">
          <input v-model="deviceHwid" class="field" placeholder="设备指纹 HWID" />
          <input v-model="deviceReason" class="field" placeholder="封禁原因（可选）" />
          <input v-model="deviceDays" class="field" style="max-width:110px" placeholder="天数，0=永久" />
          <button class="btn-danger btn" @click="banDevice">封禁设备</button>
          <button class="btn-ghost btn" @click="loadDeviceBans">刷新</button>
        </div>
        <div class="muted" style="margin:8px 0 14px">
          设备被封禁后，客户端启动会显示“账号已被封禁”，5 秒后自动退出，不能退出账号或使用其他功能。解除后立即恢复。
        </div>
        <div v-if="!deviceBans.length" class="empty">没有设备封禁记录</div>
        <div v-for="b in deviceBans" :key="b._id || b.hwid" class="row">
          <div class="info">
            <div class="name">
              <span :class="['status-pill', b.active ? 'rejected' : 'approved']">{{ b.active ? '生效中' : '已过期' }}</span>
              <span class="tag-num">{{ b.hwid }}</span>
            </div>
            <div class="muted">
              {{ b.reason || '无原因' }}
              <span v-if="b.permanent !== false"> · 永久</span>
              <span v-else-if="b.until"> · 到期 {{ fmt(b.until) }}</span>
              <span v-if="b.bannedBy"> · 操作人 {{ b.bannedBy.username || b.bannedBy.number || '管理员' }}</span>
            </div>
            <div class="muted">{{ fmt(b.createdAt) }}</div>
          </div>
          <button class="btn-ghost btn" @click="resetDevice(b.hwid)">重置密钥</button>
          <button class="btn-ghost btn" @click="unbanDevice(b.hwid)">解除</button>
        </div>
      </div>

      <!-- 黑金 VIP 激活码 -->
      <div v-if="tab === 'vip'">
        <div class="vip-admin-card">
          <div class="vip-admin-head">
            <div>
              <div class="vip-admin-title vip-two-tone">黑金 VIP 激活码</div>
              <div class="muted">激活码只在生成时显示一次，数据库不保存明文。每个激活码只能使用一次。</div>
            </div>
            <span class="vip-code-count">可用 {{ availableVipCodeCount }}</span>
          </div>
          <div class="vip-generate-row">
            <input v-model="vipNote" class="field" maxlength="50" placeholder="备注（可选）" />
            <select v-model.number="vipCount" class="field vip-count-select">
              <option :value="1">1 个</option>
              <option :value="5">5 个</option>
              <option :value="10">10 个</option>
              <option :value="20">20 个</option>
            </select>
            <button class="btn vip-generate-btn" :disabled="vipBusy" @click="generateVipCodes">{{ vipBusy ? '生成中' : '一键生成激活码' }}</button>
          </div>
          <div v-if="newVipCodes.length" class="vip-new-codes">
            <div class="vip-new-title">新激活码（离开后不再显示明文，请立即复制）</div>
            <div v-for="c in newVipCodes" :key="c._id" class="vip-new-code-row">
              <code>{{ c.code }}</code>
              <button class="btn-ghost btn small" @click="copyVipCode(c.code)">复制</button>
            </div>
          </div>
        </div>

        <div v-if="!vipCodes.length" class="empty">还没有生成过激活码</div>
        <div v-for="c in vipCodes" :key="c._id" class="row vip-code-row">
          <div class="info">
            <div class="name vip-code-hint">JXVIP-****-{{ c.hint }}</div>
            <div class="muted">
              {{ c.usedAt ? '已使用' : (c.revokedAt ? '已撤销' : '未使用') }}
              <span v-if="c.usedBy"> · {{ c.usedBy.username }}（{{ c.usedBy.number || '无编号' }}）</span>
              <span v-if="c.note"> · {{ c.note }}</span>
            </div>
            <div class="muted">{{ fmt(c.createdAt) }} · 创建人 {{ c.createdBy ? c.createdBy.username : '已删除' }}</div>
          </div>
          <button v-if="!c.usedAt && !c.revokedAt" class="btn-ghost btn small" @click="revokeVipCode(c)">撤销</button>
        </div>
      </div>

      <!-- 内容审核 -->
      <div v-if="tab === 'posts'">
        <div class="audit-filters">
          <button v-for="f in postFilters" :key="f.value" :class="['filter-pill', { on: postStatus === f.value }]"
                  @click="loadPosts(f.value)">{{ f.label }} {{ postCounts[f.value] || 0 }}</button>
        </div>
        <div v-if="!posts.length" class="empty">这个分类下暂无动态</div>
        <div v-for="p in posts" :key="p._id" class="row post-row moderation-row">
          <div class="post-body">
            <div class="name">
              {{ p.author?.username || '?' }}
              <span class="muted">巨信号：{{ p.author?.number || '未设置' }}</span>
              <span :class="['status-pill', p.moderationStatus || 'approved']">{{ moderationLabel(p) }}</span>
            </div>
            <div class="post-text">{{ p.content }}</div>
            <div v-if="p.images && p.images.length" class="admin-post-images">
              <img v-for="(img, i) in p.images.slice(0, 9)" :key="i" :src="img" class="thumb-img" @click="previewImg = img" />
            </div>
            <div v-if="p.moderationReason" class="muted">原因：{{ p.moderationReason }}</div>
            <div class="muted">
              {{ fmt(p.createdAt) }}
              <span v-if="p.moderatedAt"> · 审核人 {{ p.moderatedBy?.username || '管理员' }} · {{ fmt(p.moderatedAt) }}</span>
            </div>
          </div>
          <div class="ops moderation-ops">
            <button v-if="(p.moderationStatus || 'approved') !== 'approved'" class="btn small" @click="moderatePost(p, 'approve')">通过</button>
            <button v-if="(p.moderationStatus || 'approved') !== 'rejected'" class="btn-ghost btn small" @click="moderatePost(p, 'reject')">不通过</button>
            <button class="btn-danger" @click="delPost(p)">删除</button>
          </div>
        </div>
      </div>

      <!-- 公告 -->
      <div v-if="tab === 'announce'">
        <div class="ann-editor">
          <input v-model="annTitle" class="field" maxlength="80" placeholder="公告标题（可选）" />
          <textarea v-model="annText" class="field area long-area" maxlength="20000" placeholder="输入公告内容，支持长文本和图片…"></textarea>
          <div class="editor-foot">
            <span class="muted">{{ annText.length }}/20000 · 图片 {{ annImages.length }}/9</span>
            <label class="btn-ghost btn image-add">
              添加图片
              <input type="file" accept="image/*" multiple hidden @change="addAnnImages" />
            </label>
            <button class="btn" :disabled="(!annText.trim() && !annImages.length) || annPublishing" @click="publishAnn">
              {{ annPublishing ? '发布中' : '发布公告' }}
            </button>
          </div>
          <div v-if="annImages.length" class="ann-image-editor">
            <div v-for="(img, i) in annImages" :key="i" class="ann-edit-thumb">
              <img :src="img" />
              <button aria-label="移除图片" @click="annImages.splice(i, 1)">×</button>
            </div>
          </div>
        </div>

        <div class="ann-list">
          <div v-for="a in anns" :key="a._id" class="ann-row">
            <div class="ann-title">{{ a.title || '系统公告' }}</div>
            <div class="ann-content">{{ a.content }}</div>
            <div v-if="a.images && a.images.length" class="ann-images">
              <img v-for="(img, i) in a.images" :key="i" :src="img" @click="previewImg = img" />
            </div>
            <div class="muted">{{ fmt(a.createdAt) }}</div>
            <button class="btn-ghost btn small" @click="delAnn(a)">删除</button>
          </div>
        </div>
      </div>

      <!-- 举报审核 -->
      <div v-if="tab === 'reports'">
        <div class="audit-filters">
          <button v-for="f in reportFilters" :key="f.value" :class="['filter-pill', { on: reportStatus === f.value }]"
                  @click="loadReports(f.value)">{{ f.label }} {{ reportCounts[f.value] || 0 }}</button>
        </div>
        <div v-if="!reports.length" class="empty">
          {{ reportStatus === 'pending' ? '暂无待处理举报' : (reportStatus === 'resolved' ? '暂无已处理举报' : '暂无已忽略举报') }}
        </div>
        <div v-for="r in reports" :key="r._id" class="row report-row">
          <div class="info">
            <div class="name">
              {{ r.reporter ? r.reporter.username : '已注销用户' }} 举报
              <span class="tag-report">{{ r.type === 'user' ? '用户' : '帖子' }}</span>
              <span :class="['status-pill', r.status]">{{ reportStatusLabel(r.status) }}</span>
            </div>
            <div class="muted">原因：{{ r.reason }}<span v-if="r.detail"> · {{ r.detail }}</span></div>
            <div v-if="r.type === 'user' && r.targetUser" class="muted">
              对象：{{ r.targetUser.username }}（{{ r.targetUser.number }}）
            </div>
            <div v-if="r.type === 'post' && r.targetPost" class="muted report-post">
              帖子：{{ r.targetPost.author ? r.targetPost.author.username + '：' : '' }}{{ r.targetPost.content || '[图片]' }}
            </div>
            <div class="muted">{{ fmt(r.createdAt) }}</div>
            <div v-if="r.status !== 'pending'" class="report-history">
              处理人：{{ r.reviewedBy?.username || '管理员' }} · {{ fmt(r.reviewedAt) }} · {{ reportActionLabel(r.action) }}
            </div>
          </div>
          <div class="ops report-ops">
            <template v-if="r.status === 'pending'">
              <button class="btn-ghost btn small" @click="handleReport(r, 'reject')">忽略</button>
              <button v-if="r.type === 'user' && r.targetUser" class="btn-danger" @click="handleReport(r, 'ban')">封禁</button>
              <button v-if="r.type === 'post' && r.targetPost" class="btn-danger" @click="handleReport(r, 'deletePost')">删除帖子</button>
            </template>
            <button v-else class="btn-ghost btn small" @click="reopenReport(r)">重新打开</button>
          </div>
        </div>
      </div>

      <!-- 安全设置 -->
      <div v-if="tab === 'security'">
        <div class="row security-row">
          <div class="info security-info">
            <div class="name">管理员二次验证：{{ twoFactor.enabled ? '已开启' : '未开启' }}</div>
            <div class="muted">
              开启后，登录管理端时除了密码，还要输入验证器上的 6 位动态码。
              可以使用 Google Authenticator、Microsoft Authenticator 等应用。
            </div>
            <div class="muted">开启后请保管好验证器和密钥，丢失将无法登录管理端。</div>

            <div v-if="twoFactorSecret" class="secret-box">
              <div class="muted">把下面密钥添加到验证器（或手动输入）：</div>
              <div class="secret-text">{{ twoFactorSecret }}</div>
              <div class="muted secret-url">{{ twoFactorOtp }}</div>
              <div class="twofa-row">
                <input v-model="twoFactorCode" class="field" maxlength="6" placeholder="6 位动态码" />
                <button class="btn" :disabled="twofaBusy" @click="enable2fa">启用二次验证</button>
              </div>
            </div>

            <div v-else-if="!twoFactor.enabled" class="twofa-row">
              <input v-model="adminPassword" type="password" class="field" placeholder="管理员密码" />
              <button class="btn" :disabled="twofaBusy" @click="setup2fa">生成密钥</button>
            </div>

            <div v-else class="twofa-row">
              <input v-model="adminPassword" type="password" class="field" placeholder="管理员密码" />
              <input v-model="twoFactorCode" class="field" maxlength="6" placeholder="6 位动态码" />
              <button class="btn btn-danger" :disabled="twofaBusy" @click="disable2fa">关闭二次验证</button>
            </div>

            <div v-if="twofaMsg" class="twofa-msg">{{ twofaMsg }}</div>
          </div>
        </div>
      </div>

      <!-- 操作日志 -->
      <div v-if="tab === 'audit'">
        <div v-if="!audits.length" class="empty">暂无操作日志</div>
        <div v-for="l in audits" :key="l._id" class="row audit-row">
          <div class="info">
            <div class="name">
              {{ auditActor(l) }}
              <span class="audit-action">{{ auditAction(l) }}</span>
            </div>
            <div v-if="l.detail" class="muted audit-detail">{{ l.detail }}</div>
            <div class="muted">{{ fmt(l.createdAt) }}</div>
          </div>
        </div>
      </div>

      <!-- 注销审核 -->
      <div v-if="tab === 'deletes'">
        <div v-if="!delReqs.length" class="empty">暂无注销申请</div>
        <div v-for="r in delReqs" :key="r._id" class="row delete-row">
          <div class="info">
            <div class="name">{{ r.username }} <span class="muted">{{ r.number }}</span></div>
            <div class="muted">原因：{{ r.reason }}</div>
            <div class="muted">{{ fmt(r.createdAt) }}</div>
          </div>
          <div class="ops">
            <button class="btn-danger" @click="approveDelete(r)">通过并注销</button>
            <button class="btn-ghost btn" @click="rejectDelete(r)">拒绝</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="previewImg" class="admin-preview-mask" @click="previewImg = ''">
      <img :src="previewImg" />
    </div>

    <div v-if="titleUser" class="title-admin-mask" @click.self="closeTitleDialog">
      <div class="title-admin-card">
        <div class="title-admin-head">
          <div>
            <div class="title-admin-name">称号管理 · {{ titleUser.username }}</div>
            <div class="muted">最多 4 个自定义称号，VIP 会按获得时间自动排序，先获得的在左。</div>
          </div>
          <button class="title-admin-close" @click="closeTitleDialog">×</button>
        </div>

        <div class="title-admin-section">
          <div class="title-admin-label">当前显示顺序</div>
          <div v-if="userBadges(titleUser).length" class="badge-row">
            <span v-for="(b, i) in userBadges(titleUser)" :key="'tb-' + i"
                  :class="['title-badge', 'title-' + (b.style || 'vip')]">
              <span class="title-badge-text">{{ b.name }}</span>
            </span>
          </div>
          <div v-else class="muted">还没有称号</div>
        </div>

        <div class="title-admin-section">
          <div class="title-admin-label">已授予的自定义称号（{{ customTitles.length }}/4）</div>
          <div v-if="customTitles.length" class="title-manage-list">
            <div v-for="t in customTitles" :key="t.id" class="title-manage-row">
              <span :class="['title-badge', 'title-' + (t.style || 'green')]">
                <span class="title-badge-text">{{ t.name }}</span>
              </span>
              <button class="title-remove-btn" :disabled="titleBusy" @click="removeTitle(t)">删除</button>
            </div>
          </div>
          <div v-else class="muted">暂未授予自定义称号</div>
        </div>

        <div class="title-admin-section">
          <div class="title-admin-label">新增称号</div>
          <input v-model="titleName" class="field" maxlength="20" placeholder="输入自由命名的称号，最多 20 字" />
          <div class="title-style-grid">
            <button v-for="s in titleStyles" :key="s.key"
                    :class="['title-style-option', { active: titleStyle === s.key }]"
                    @click="titleStyle = s.key">
              <span :class="['title-badge', 'title-' + s.key]">
                <span class="title-badge-text">{{ titleName.trim() || s.label }}</span>
              </span>
            </button>
          </div>
          <div class="title-preview-line">
            <span class="muted">预览：</span>
            <span :class="['title-badge', 'title-' + titleStyle]">
              <span class="title-badge-text">{{ titleName.trim() || '称号预览' }}</span>
            </span>
          </div>
          <button class="btn title-grant-btn" :disabled="titleBusy || !titleName.trim() || customTitles.length >= 4"
                  @click="grantTitle">
            {{ titleBusy ? '处理中…' : customTitles.length >= 4 ? '已达到 4 个上限' : '授予称号' }}
          </button>
        </div>

        <div class="title-admin-section title-entry-setting">
          <div>
            <div class="title-admin-label">群聊入场特效</div>
            <div class="muted">开启后，进入群聊会向其他成员弹出“称号和名字，来聊天了”。私聊不会触发。</div>
          </div>
          <button :class="['title-entry-toggle', { on: !!titleUser.groupEntryEffect }]"
                  :disabled="titleBusy" @click="toggleTitleEntry">
            {{ titleUser.groupEntryEffect ? '已开启' : '已关闭' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api';
import { useUserStore } from '../store/user';
import { readImageFile } from '../utils/image';

const router = useRouter();
const store = useUserStore();
const tab = ref('users');
const deviceBans = ref([]);
const deviceHwid = ref('');
const deviceReason = ref('');
const deviceDays = ref('0');
const users = ref([]);
const posts = ref([]);
const anns = ref([]);
const annText = ref('');
const annTitle = ref('');
const annImages = ref([]);
const annPublishing = ref(false);
const delReqs = ref([]);
const audits = ref([]);
const userQuery = ref('');
const userPage = ref(1);
const userPages = ref(1);
const userTotal = ref(0);
const reports = ref([]);
const reportPending = ref(0);
const reportStatus = ref('pending');
const reportCounts = ref({ pending: 0, resolved: 0, rejected: 0 });
const postStatus = ref('pending');
const postPending = ref(0);
const postCounts = ref({ pending: 0, approved: 0, rejected: 0 });
const previewImg = ref('');
const twoFactor = ref({ enabled: false });
const twoFactorSecret = ref('');
const twoFactorOtp = ref('');
const twoFactorCode = ref('');
const adminPassword = ref('');
const twofaBusy = ref(false);
const twofaMsg = ref('');
const vipCodes = ref([]);
const newVipCodes = ref([]);
const vipNote = ref('');
const vipCount = ref(1);
const vipBusy = ref(false);
const titleUser = ref(null);
const titleName = ref('');
const titleStyle = ref('rainbow');
const titleBusy = ref(false);
const titleStyles = [
  { key: 'rainbow', label: '彩虹渐变' },
  { key: 'lightning', label: '红色闪电' },
  { key: 'green', label: '绿色' },
  { key: 'blue', label: '蓝色' }
];

const customTitles = computed(() => {
  return titleUser.value && Array.isArray(titleUser.value.titles) ? titleUser.value.titles : [];
});

const availableVipCodeCount = computed(() => {
  return vipCodes.value.filter(function (c) { return !c.usedAt && !c.revokedAt; }).length;
});

const postFilters = [
  { value: 'pending', label: '待审核' },
  { value: 'approved', label: '已通过' },
  { value: 'rejected', label: '未通过' },
  { value: 'all', label: '全部' }
];
const reportFilters = [
  { value: 'pending', label: '待处理' },
  { value: 'resolved', label: '已处理' },
  { value: 'rejected', label: '已忽略' }
];

function moderationLabel(p) {
  const s = p.moderationStatus || 'approved';
  if (s === 'pending') return '待审核';
  if (s === 'rejected') return '未通过';
  return '已通过';
}
function reportStatusLabel(s) {
  if (s === 'pending') return '待处理';
  if (s === 'resolved') return '已处理';
  return '已忽略';
}
function reportActionLabel(a) {
  if (a === 'ban') return '已封禁用户';
  if (a === 'deletePost') return '已删除帖子';
  if (a === 'reject') return '已忽略';
  return '已处理';
}

async function loadDeviceBans() {
  try {
    const { data } = await api.get('/api/admin/device-bans');
    deviceBans.value = Array.isArray(data.bans) ? data.bans : [];
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '加载设备封禁失败');
  }
}
async function banDevice() {
  const hwid = deviceHwid.value.trim();
  if (!hwid) { alert('请填写设备指纹'); return; }
  const days = Number(deviceDays.value || 0);
  if (!Number.isFinite(days) || days < 0) { alert('封禁天数不能小于 0'); return; }
  try {
    await api.post('/api/admin/device-ban', {
      hwid: hwid,
      reason: deviceReason.value.trim(),
      days: days,
      permanent: days <= 0
    });
    deviceHwid.value = '';
    deviceReason.value = '';
    deviceDays.value = '0';
    await loadDeviceBans();
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '封禁设备失败');
  }
}
async function resetDevice(hwid) {
  if (!confirm('重置该设备的客户端密钥？\n\n只用于用户删除客户端数据或更换系统导致密钥丢失，封禁记录不会解除。')) return;
  try {
    await api.post('/api/admin/device-reset', { hwid: hwid });
    alert('设备密钥已重置，用户重新打开客户端即可重新登记');
    await loadDeviceBans();
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '重置设备密钥失败');
  }
}
async function unbanDevice(hwid) {
  if (!confirm('解除该设备的封禁？')) return;
  try {
    await api.post('/api/admin/device-unban', { hwid: hwid });
    await loadDeviceBans();
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '解除设备封禁失败');
  }
}
function fmt(t) {
  if (!t) return '';
  try { return new Date(t).toLocaleString(); } catch (e) { return t; }
}
function isBanned(u) {
  return u.bannedUntil && new Date(u.bannedUntil) > new Date();
}
function userBadges(u) {
  if (!u) return [];
  if (Array.isArray(u.badges) && u.badges.length) return u.badges;
  return u.vipActive ? [{ kind: 'vip', name: '黑金VIP', style: 'vip' }] : [];
}
function mergeAdminUser(updated) {
  if (!updated) return;
  const id = String(updated.id || updated._id || '');
  if (!id) return;
  users.value = users.value.map(function (row) {
    return String(row._id) === id ? Object.assign({}, row, updated) : row;
  });
  if (titleUser.value && String(titleUser.value._id) === id) {
    titleUser.value = Object.assign({}, titleUser.value, updated);
  }
  if (id === String(store.myId)) {
    store.setUser(Object.assign({}, store.user, updated));
  }
}
function openTitleDialog(u) {
  if (!u) return;
  titleUser.value = Object.assign({}, u);
  titleName.value = '';
  titleStyle.value = 'rainbow';
}
function closeTitleDialog() {
  if (titleBusy.value) return;
  titleUser.value = null;
  titleName.value = '';
}
async function grantTitle() {
  const target = titleUser.value;
  if (!target || titleBusy.value) return;
  const name = titleName.value.trim();
  if (!name) return;
  titleBusy.value = true;
  try {
    const { data } = await api.post('/api/admin/titles/grant', {
      id: target._id,
      name: name,
      style: titleStyle.value
    });
    mergeAdminUser(data.user);
    titleName.value = '';
    const ask = confirm('称号已授予。是否为 ' + target.username + ' 设置特殊特效入场？');
    if (ask) await setTitleEntry(true);
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '称号授予失败');
  } finally {
    titleBusy.value = false;
  }
}
async function removeTitle(t) {
  const target = titleUser.value;
  if (!target || !t || titleBusy.value) return;
  if (!confirm('删除称号“' + t.name + '”？')) return;
  titleBusy.value = true;
  try {
    const { data } = await api.post('/api/admin/titles/remove', {
      id: target._id,
      titleId: t.id
    });
    mergeAdminUser(data.user);
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '删除称号失败');
  } finally {
    titleBusy.value = false;
  }
}
async function setTitleEntry(active) {
  const target = titleUser.value;
  if (!target) return;
  const { data } = await api.post('/api/admin/titles/entry-effect', {
    id: target._id,
    active: !!active
  });
  mergeAdminUser(data.user);
  if (data.user) titleUser.value = Object.assign({}, titleUser.value, data.user);
}
async function toggleTitleEntry() {
  const target = titleUser.value;
  if (!target || titleBusy.value) return;
  titleBusy.value = true;
  try {
    await setTitleEntry(!target.groupEntryEffect);
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '入场特效设置失败');
  } finally {
    titleBusy.value = false;
  }
}
function auditActor(l) {
  if (l && l.admin) return l.admin.username;
  if (l && String(l.action || '').indexOf('[本机]') === 0) return '本机工具';
  return '已删除管理员';
}
function auditAction(l) {
  return String((l && l.action) || '').replace(/^\[本机\]\s*/, '');
}

async function loadUsers() {
  const { data } = await api.get('/api/admin/users', {
    params: { q: userQuery.value.trim(), page: userPage.value, limit: 50 }
  });
  users.value = data.users || [];
  userTotal.value = data.total || 0;
  userPages.value = data.pages || 1;
  userPage.value = data.page || 1;
  if (!users.value.length && userPage.value > 1 && userPage.value > userPages.value) {
    userPage.value = userPages.value;
    return loadUsers();
  }
}
function searchUsers() {
  userPage.value = 1;
  loadUsers();
}

async function loadVipCodes() {
  try {
    const { data } = await api.get('/api/admin/vip/codes');
    vipCodes.value = data.codes || [];
  } catch (e) {
    vipCodes.value = [];
    alert((e.response && e.response.data && e.response.data.message) || '加载激活码失败');
  }
}

async function generateVipCodes() {
  if (vipBusy.value) return;
  vipBusy.value = true;
  try {
    const { data } = await api.post('/api/admin/vip/codes', {
      count: vipCount.value,
      note: vipNote.value.trim()
    });
    newVipCodes.value = data.codes || [];
    vipNote.value = '';
    await loadVipCodes();
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '生成失败');
  } finally {
    vipBusy.value = false;
  }
}

async function copyVipCode(code) {
  try {
    await navigator.clipboard.writeText(code);
    alert('激活码已复制');
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = code;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); alert('激活码已复制'); }
    catch (err) { alert('复制失败，请手动选中激活码'); }
    ta.remove();
  }
}

async function revokeVipCode(c) {
  if (!c || !confirm('撤销这个未使用的激活码？撤销后不能再次使用。')) return;
  try {
    await api.post('/api/admin/vip/codes/' + c._id + '/revoke');
    await loadVipCodes();
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '撤销失败');
  }
}

async function toggleVip(u) {
  if (!u) return;
  const next = !u.vipActive;
  if (!confirm((next ? '为 ' : '取消 ') + u.username + (next ? ' 开通黑金 VIP？' : ' 的黑金 VIP？'))) return;
  try {
    const { data } = await api.post('/api/admin/vip/grant', { id: u._id, active: next });
    u.vipActive = !!data.vipActive;
    u.vipSince = data.user && data.user.vipSince ? data.user.vipSince : u.vipSince;
    if (data.user && Array.isArray(data.user.badges)) u.badges = data.user.badges;
    if (data.user && Array.isArray(data.user.titles)) u.titles = data.user.titles;
    if (String(u._id) === String(store.myId)) {
      store.setUser(Object.assign({}, store.user, {
        vipActive: u.vipActive,
        vipSince: u.vipSince || null,
        badges: u.badges || store.user.badges
      }));
    }
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || 'VIP 操作失败');
  }
}

async function adminAddFriend(u) {
  if (!u || String(u._id) === String(store.myId)) return;
  if (!confirm('直接添加 ' + u.username + ' 为好友？对方不需要同意。')) return;
  try {
    const { data } = await api.post('/api/admin/friend', { id: u._id });
    alert(data && data.already ? '你们已经是好友了' : '已添加为好友');
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '加好友失败');
  }
}

async function resetUserPassword(u) {
  if (!u || u.isAdmin) return;
  if (!confirm('为 ' + u.username + ' 生成一次性临时密码？旧密码和当前登录会立即失效。')) return;
  try {
    const { data } = await api.post('/api/admin/users/' + u._id + '/reset-password');
    const password = data && data.password;
    if (!password) throw new Error('服务器没有返回临时密码');
    try {
      await navigator.clipboard.writeText(password);
      alert('临时密码已复制：\n' + password + '\n\n请尽快发给用户，并提醒对方登录后修改。');
    } catch (copyError) {
      alert('临时密码：\n' + password + '\n\n请尽快发给用户，并提醒对方登录后修改。');
    }
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || e.message || '重置密码失败');
  }
}

async function loadPosts(status) {
  const nextStatus = status || postStatus.value || 'pending';
  postStatus.value = nextStatus;
  posts.value = [];
  try {
    const { data } = await api.get('/api/admin/posts', { params: { status: nextStatus } });
    posts.value = data.posts || [];
    postCounts.value = data.counts || postCounts.value;
    postPending.value = Number((data.counts && data.counts.pending) || 0);
  } catch (e) {
    posts.value = [];
    alert((e.response && e.response.data && e.response.data.message) || '加载动态审核队列失败');
  }
}
async function loadAnns() {
  const { data } = await api.get('/api/admin/announcements');
  anns.value = data.announcements;
}
async function loadDeleteReqs() {
  const { data } = await api.get('/api/admin/delete-requests');
  delReqs.value = data.requests || [];
}
async function loadAudits() {
  try {
    const { data } = await api.get('/api/admin/audit', { params: { limit: 200 } });
    audits.value = data.logs || [];
  } catch (e) {
    audits.value = [];
    alert((e.response && e.response.data && e.response.data.message) || '加载日志失败');
  }
}

async function loadReports(status) {
  const nextStatus = status || reportStatus.value || 'pending';
  reportStatus.value = nextStatus;
  reports.value = [];
  try {
    const { data } = await api.get('/api/admin/reports', { params: { status: nextStatus, limit: 100 } });
    reports.value = data.reports || [];
    reportPending.value = data.pending || 0;
    reportCounts.value = data.counts || reportCounts.value;
  } catch (e) {
    reports.value = [];
    reportPending.value = 0;
  }
}

async function moderatePost(p, action) {
  if (!p) return;
  let reason = '';
  if (action === 'reject') {
    reason = prompt('填写不通过原因（会通知作者）', '不符合内容规范');
    if (reason === null) return;
    if (!reason.trim()) { alert('请填写不通过原因'); return; }
  } else if (!confirm('通过这条动态并公开？文字和图片会立即进入朋友圈。')) {
    return;
  }
  try {
    await api.post('/api/admin/post/' + p._id + '/moderate', { action: action, reason: reason.trim() });
    await loadPosts(postStatus.value);
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '审核操作失败');
  }
}

async function reopenReport(r) {
  if (!r || !confirm('把这条举报重新放回待处理？')) return;
  try {
    await api.post('/api/admin/report/' + r._id + '/reopen');
    await loadReports('pending');
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '重新打开失败');
  }
}

async function handleReport(r, action) {
  if (!r) return;
  let body = { action: action };
  if (action === 'reject') {
    if (!confirm('忽略这条举报？')) return;
  } else if (action === 'ban') {
    const days = prompt('封禁天数（0=永久）', '7');
    if (days === null) return;
    const n = Number(days);
    if (!Number.isFinite(n) || n < 0) { alert('请输入正确的天数，0 表示永久'); return; }
    body.hours = n * 24;
    body.reason = '举报处理：' + (r.reason || '');
  } else if (action === 'deletePost') {
    if (!confirm('删除被举报的帖子？')) return;
  }
  try {
    await api.post('/api/admin/report/' + r._id + '/action', body);
    await loadReports();
    await loadUsers();
    if (action === 'deletePost') await loadPosts();
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '处理失败');
  }
}

async function load2fa() {
  twofaMsg.value = '';
  try {
    const { data } = await api.get('/api/admin/2fa');
    twoFactor.value = { enabled: !!data.enabled };
    if (data.enabled) {
      // 已开启时不需要继续显示待启用的密钥
      twoFactorSecret.value = '';
      twoFactorOtp.value = '';
      twoFactorCode.value = '';
      adminPassword.value = '';
    }
  } catch (e) {
    twofaMsg.value = (e.response && e.response.data && e.response.data.message) || '加载失败';
  }
}
async function setup2fa() {
  if (!adminPassword.value) { twofaMsg.value = '请输入管理员密码'; return; }
  twofaBusy.value = true;
  twofaMsg.value = '';
  try {
    const { data } = await api.post('/api/admin/2fa/setup', { password: adminPassword.value });
    twoFactorSecret.value = data.secret;
    twoFactorOtp.value = data.otpauth;
    twofaMsg.value = '把密钥添加到验证器后，输入 6 位动态码启用。';
  } catch (e) {
    twofaMsg.value = (e.response && e.response.data && e.response.data.message) || '生成失败';
  } finally { twofaBusy.value = false; }
}
async function enable2fa() {
  if (!/^\d{6}$/.test(twoFactorCode.value)) { twofaMsg.value = '请输入 6 位动态码'; return; }
  twofaBusy.value = true;
  twofaMsg.value = '';
  try {
    await api.post('/api/admin/2fa/enable', { code: twoFactorCode.value });
    twoFactor.value = { enabled: true };
    twoFactorSecret.value = '';
    twoFactorOtp.value = '';
    twoFactorCode.value = '';
    adminPassword.value = '';
    twofaMsg.value = '二次验证已开启，下次登录管理端需要动态码。';
  } catch (e) {
    twofaMsg.value = (e.response && e.response.data && e.response.data.message) || '启用失败';
  } finally { twofaBusy.value = false; }
}
async function disable2fa() {
  if (!adminPassword.value || !twoFactorCode.value) {
    twofaMsg.value = '请输入管理员密码和当前动态码';
    return;
  }
  if (!confirm('关闭二次验证？之后登录只需要密码。')) return;
  twofaBusy.value = true;
  twofaMsg.value = '';
  try {
    await api.post('/api/admin/2fa/disable', {
      password: adminPassword.value,
      code: twoFactorCode.value
    });
    twoFactor.value = { enabled: false };
    adminPassword.value = '';
    twoFactorCode.value = '';
    twofaMsg.value = '二次验证已关闭。';
  } catch (e) {
    twofaMsg.value = (e.response && e.response.data && e.response.data.message) || '关闭失败';
  } finally { twofaBusy.value = false; }
}
async function approveDelete(r) {
  if (!confirm('确定通过 ' + r.username + ' 的注销申请？该账号和所有内容将被永久删除。')) return;
  try {
    await api.post('/api/admin/delete-request/' + r._id + '/approve');
    await loadDeleteReqs();
    await loadUsers();
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '操作失败');
  }
}
async function rejectDelete(r) {
  if (!confirm('确定拒绝 ' + r.username + ' 的注销申请？')) return;
  try {
    await api.post('/api/admin/delete-request/' + r._id + '/reject');
    await loadDeleteReqs();
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '操作失败');
  }
}

async function banUser(u) {
  const days = prompt('封禁天数（0=永久）', '7');
  if (days === null) return;
  const n = Number(days);
  if (!Number.isFinite(n) || n < 0) { alert('请输入正确的天数，0 表示永久'); return; }
  try {
    await api.post('/api/admin/ban', { id: u._id, hours: n * 24 });
    await loadUsers();
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '封禁失败');
  }
}
async function unbanUser(u) {
  await api.post('/api/admin/unban', { id: u._id });
  await loadUsers();
}
async function delUser(u) {
  if (!confirm('确定删除用户 ' + u.username + ' ？')) return;
  await api.delete('/api/admin/user/' + u._id);
  await loadUsers();
}
async function delPost(p) {
  if (!confirm('删除这条帖子？')) return;
  await api.delete('/api/admin/post/' + p._id);
  await loadPosts(postStatus.value);
}

async function addAnnImages(e) {
  const files = Array.from(e.target.files || []);
  e.target.value = '';
  for (const file of files) {
    if (annImages.value.length >= 9) { alert('最多 9 张公告图片'); break; }
    try {
      const image = await readImageFile(file, { maxSize: 1400, quality: 0.8 });
      annImages.value.push(image);
    } catch (err) {
      alert(err.message || '图片读取失败');
    }
  }
}
async function publishAnn() {
  if ((!annText.value.trim() && !annImages.value.length) || annPublishing.value) return;
  annPublishing.value = true;
  try {
    await api.post('/api/admin/announcement', {
      title: annTitle.value.trim(),
      content: annText.value,
      images: annImages.value
    });
    annTitle.value = '';
    annText.value = '';
    annImages.value = [];
    await loadAnns();
    alert('公告已发布');
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '公告发布失败');
  } finally {
    annPublishing.value = false;
  }
}
async function delAnn(a) {
  if (!confirm('删除此公告？')) return;
  await api.delete('/api/admin/announcement/' + a._id);
  await loadAnns();
}

onMounted(() => {
  loadUsers(); loadPosts('pending'); loadAnns(); loadDeleteReqs(); loadReports('pending');
});
</script>

<style scoped>
.admin { height: 100%; display: flex; flex-direction: column; background: var(--bg); }
.topbar { background: rgba(255,255,255,.2); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--glass-border); }
.back { color: var(--green); cursor: pointer; font-size: 14px; }
.title { font-weight: 600; }
.tabs { display: flex; gap: 10px; padding: 12px 16px; overflow-x: auto; scrollbar-width: none; }
.tabs::-webkit-scrollbar { display: none; }
.tab { flex-shrink: 0; padding: 8px 20px; border-radius: 20px; background: rgba(255,255,255,.24); border: 1px solid rgba(255,255,255,.55); color: var(--text-soft); cursor: pointer; font-size: 13.5px; font-weight: var(--fw-medium); letter-spacing: var(--tracking); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); box-shadow: inset 0 1px 0 rgba(255,255,255,.65); }
.tab.active { background: linear-gradient(180deg, #16d27a, #07c160); border-color: rgba(255,255,255,.4); color: #fff; font-weight: var(--fw-semibold); box-shadow: 0 6px 16px rgba(7,193,96,.28), inset 0 1px 0 rgba(255,255,255,.45); }
.content { flex: 1; overflow: auto; padding: 0 16px 16px; }
.row { display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--glass-bg-strong); border: 1px solid var(--glass-border); border-radius: 16px; margin-bottom: 8px; box-shadow: var(--glass-shadow), var(--glass-highlight); backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur); }
.avatar { width: 44px; height: 44px; font-size: 18px; }
.info { flex: 1; min-width: 0; }
.name { font-weight: var(--fw-semibold); font-size: var(--fs-base); letter-spacing: var(--tracking); }
.muted { font-size: 12px; color: var(--text-soft); }
.tag-adm { background: #d97706; color: #fff; font-size: 11px; padding: 1px 6px; border-radius: 8px; margin-left: 4px; }
.tag-num { display: inline-block; margin-left: 4px; padding: 1px 6px; border-radius: 8px; background: rgba(7,193,96,.12); color: #07924a; font-size: 10px; font-weight: 500; vertical-align: 1px; }
.tag-vip { display: inline-block; margin-left: 4px; padding: 1px 7px; border: 1px solid #a77b20; border-radius: 999px; font-size: 10px; letter-spacing: .05em; vertical-align: 1px; }
.banned-text { color: var(--danger); font-size: 12px; margin-top: 2px; }
.ops { display: flex; gap: 6px; }
.user-ops { max-width: 56%; flex-wrap: wrap; justify-content: flex-end; }
.user-ops .btn { padding: 6px 9px; font-size: 12px; white-space: nowrap; }
.vip-granted { border-color: #b58a2d; background: rgba(181, 138, 45, .15); color: #8a6514; }
.btn-danger { background: var(--danger); color: #fff; border: none; border-radius: 8px; padding: 6px 12px; font-size: 13px; cursor: pointer; }
.btn.small { padding: 6px 12px; font-size: 13px; }
.post-row { align-items: flex-start; }
.post-body { flex: 1; min-width: 0; }
.post-text { font-size: 14px; margin-top: 4px; word-break: break-word; }
.thumb-img { max-width: 100px; margin-top: 6px; border-radius: 6px; }
.admin-fields { margin-top: 3px; line-height: 1.6; word-break: break-word; }
.audit-filters { display: flex; flex-wrap: wrap; gap: 7px; margin: 4px 0 12px; }
.filter-pill { padding: 7px 13px; border-radius: 999px; border: 1px solid var(--glass-border); background: var(--glass-bg); color: var(--text-soft); font-size: 12px; cursor: pointer; }
.filter-pill.on { background: var(--green); border-color: var(--green); color: #fff; }
.status-pill { display: inline-block; margin-left: 6px; padding: 1px 7px; border-radius: 999px; font-size: 10px; font-weight: 600; vertical-align: 1px; }
.status-pill.pending { color: #a96507; background: rgba(230,155,54,.15); }
.status-pill.approved, .status-pill.resolved { color: #15894d; background: rgba(53,184,107,.14); }
.status-pill.rejected { color: var(--danger); background: rgba(217,58,63,.11); }
.moderation-row { align-items: flex-start; }
.moderation-row .post-body { display: flex; flex-direction: column; gap: 4px; }
.moderation-ops { flex-shrink: 0; flex-direction: column; }
.admin-post-images { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0; }
.admin-post-images .thumb-img { max-width: 84px; max-height: 84px; object-fit: cover; cursor: pointer; margin: 0; }
.report-history { margin-top: 5px; padding: 5px 8px; border-radius: 8px; background: var(--glass-bg); color: var(--text-soft); font-size: 11px; }
.ann-editor { padding: 13px; border: 1px solid var(--glass-border); border-radius: 16px; background: var(--glass-bg-strong); display: flex; flex-direction: column; gap: 8px; }
.long-area { min-height: 180px; max-height: 46vh; margin-bottom: 0; }
.editor-foot { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.editor-foot .muted { flex: 1; min-width: 160px; }
.image-add { cursor: pointer; }
.ann-image-editor { display: flex; flex-wrap: wrap; gap: 7px; }
.ann-edit-thumb { position: relative; width: 76px; height: 76px; }
.ann-edit-thumb img { width: 100%; height: 100%; object-fit: cover; border-radius: 10px; }
.ann-edit-thumb button { position: absolute; top: -6px; right: -6px; width: 22px; height: 22px; border: 0; border-radius: 50%; background: var(--danger); color: #fff; line-height: 1; cursor: pointer; }
.ann-title { font-weight: 600; margin-bottom: 4px; }
.ann-images { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
.ann-images img { width: 80px; height: 80px; object-fit: cover; border-radius: 8px; cursor: pointer; }
.admin-preview-mask { position: fixed; inset: 0; z-index: 900; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(0,0,0,.82); }
.admin-preview-mask img { max-width: 96vw; max-height: 92vh; object-fit: contain; border-radius: 12px; }
.title-admin-mask { position: fixed; inset: 0; z-index: 960; display: flex; align-items: center; justify-content: center; padding: 14px; background: rgba(8, 12, 9, .58); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
.title-admin-card { width: min(520px, 100%); max-height: 92vh; overflow: auto; padding: 16px; border: 1px solid var(--glass-border); border-radius: 22px; background: var(--glass-bg-strong); box-shadow: 0 20px 60px rgba(0,0,0,.2); }
.title-admin-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.title-admin-name { font-size: 17px; font-weight: var(--fw-semibold); }
.title-admin-close { flex-shrink: 0; width: 30px; height: 30px; border: 0; border-radius: 50%; background: rgba(0,0,0,.06); color: var(--text-soft); font-size: 20px; line-height: 1; cursor: pointer; }
.title-admin-section { margin-top: 13px; padding-top: 13px; border-top: 1px solid var(--glass-border); }
.title-admin-label { margin-bottom: 7px; font-size: 12px; color: var(--text-soft); font-weight: var(--fw-semibold); }
.title-manage-list { display: flex; flex-direction: column; gap: 6px; }
.title-manage-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 7px 9px; border-radius: 13px; background: rgba(0,0,0,.035); }
.title-remove-btn { flex-shrink: 0; border: 0; border-radius: 999px; padding: 4px 9px; background: rgba(217,58,63,.1); color: var(--danger); font-size: 11px; cursor: pointer; }
.title-style-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; margin-top: 9px; }
.title-style-option { display: flex; align-items: center; justify-content: center; min-height: 38px; padding: 6px 8px; border: 1px solid var(--glass-border); border-radius: 13px; background: rgba(255,255,255,.18); cursor: pointer; }
.title-style-option.active { border-color: var(--green); background: var(--green-light); box-shadow: inset 0 0 0 1px var(--green); }
.title-preview-line { display: flex; align-items: center; gap: 4px; margin-top: 10px; min-height: 25px; }
.title-grant-btn { width: 100%; margin-top: 10px; border-radius: 14px; }
.title-entry-setting { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.title-entry-toggle { flex-shrink: 0; min-width: 76px; padding: 7px 11px; border: 1px solid var(--glass-border); border-radius: 999px; background: rgba(0,0,0,.04); color: var(--text-soft); font-size: 12px; font-weight: 600; cursor: pointer; }
.title-entry-toggle.on { border-color: var(--green); background: var(--green); color: #fff; }
html[data-vip='1'] .title-admin-card { background: #0b0803 !important; border-color: #6f551b; box-shadow: 0 24px 70px rgba(0,0,0,.62); }
html[data-vip='1'] .title-manage-row { background: #120e07; }
html[data-vip='1'] .title-admin-close { background: #171107; color: #cbb273; }
html[data-vip='1'] .title-style-option { background: #0d0a05; border-color: #4f3c16; }
html[data-vip='1'] .title-style-option.active { background: #211706; border-color: #d4af37; box-shadow: inset 0 0 0 1px #d4af37; }
html[data-vip='1'] .title-entry-toggle { background: #0d0a05; border-color: #4f3c16; color: #cbb273; }
html[data-vip='1'] .title-entry-toggle.on { background: #b28a2e; border-color: #e1c269; color: #0b0803; }
.area { min-height: 100px; resize: vertical; margin-bottom: 10px; }
.ann-list { margin-top: 16px; display: flex; flex-direction: column; gap: 8px; }
.ann-row { background: var(--glass-bg-strong); border: 1px solid var(--glass-border); padding: 12px; border-radius: 16px; box-shadow: var(--glass-shadow), var(--glass-highlight); backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur); }
.ann-content { font-size: 14px; margin-bottom: 6px; white-space: pre-wrap; }
.empty { text-align: center; color: var(--text-soft); font-size: 14px; padding: 40px 0; }
.vip-admin-card { margin-bottom: 14px; padding: 16px; border: 1px solid #96701f; border-radius: 18px; background: #0c0904; color: #ead8a8; }
.vip-admin-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.vip-admin-title { display: inline-block; font-size: 18px; font-weight: 700; letter-spacing: .05em; }
.vip-admin-card .muted { margin-top: 4px; color: #bfa86f; line-height: 1.6; }
.vip-code-count { flex-shrink: 0; padding: 4px 9px; border: 1px solid #8d6a21; border-radius: 999px; font-size: 11px; color: #dfc274; }
.vip-generate-row { display: flex; gap: 8px; margin-top: 14px; }
.vip-generate-row .field { flex: 1; min-width: 0; background: #171107; border-color: #70551a; color: #f2dfac; }
.vip-count-select { max-width: 92px; }
.vip-generate-btn { flex-shrink: 0; padding: 9px 14px; border-radius: 14px; background: #b28a2e; border-color: #e1c269; box-shadow: none; color: #120e06; text-shadow: none; }
.vip-new-codes { margin-top: 14px; padding: 12px; border: 1px dashed #84651f; border-radius: 14px; background: rgba(255, 217, 103, .055); }
.vip-new-title { margin-bottom: 8px; font-size: 12px; color: #e1c979; }
.vip-new-code-row { display: flex; align-items: center; gap: 8px; margin-top: 6px; flex-wrap: wrap; }
.vip-new-code-row code { flex: 1; min-width: 210px; padding: 7px 9px; border: 1px solid #6f551c; border-radius: 10px; background: #090704; color: #f1d889; font-size: 13px; letter-spacing: .08em; user-select: all; word-break: break-all; }
.vip-new-code-row .btn { flex-shrink: 0; }
.vip-code-row { border-radius: 18px; }
.vip-code-hint { font-family: ui-monospace, Consolas, monospace; letter-spacing: .07em; }
.user-tools { display: flex; gap: 8px; margin-bottom: 12px; }
.user-tools .field { flex: 1; min-width: 0; }
.user-tools .btn { padding: 9px 16px; flex-shrink: 0; }
.pager { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 10px 0; flex-wrap: wrap; }
.report-row { align-items: flex-start; }
.report-ops { flex-direction: column; flex-shrink: 0; }
.report-post { word-break: break-word; }
.tag-report { display: inline-block; margin-left: 6px; padding: 1px 7px; border-radius: 7px; background: rgba(217,58,63,.12); color: var(--danger); font-size: 11px; }
.security-row { align-items: flex-start; }
.security-info { display: flex; flex-direction: column; gap: 8px; }
.secret-box { display: flex; flex-direction: column; gap: 6px; padding: 10px; border-radius: 12px; background: rgba(255,255,255,.26); border: 1px solid rgba(255,255,255,.55); }
.secret-text { font-family: ui-monospace, Consolas, monospace; font-size: 15px; font-weight: 600; letter-spacing: .08em; color: var(--green-dark); word-break: break-all; user-select: all; }
.secret-url { font-size: 10px; word-break: break-all; }
.twofa-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.twofa-row .field { flex: 1; min-width: 130px; }
.twofa-msg { font-size: 13px; color: var(--green-dark); background: var(--green-light); border-radius: 8px; padding: 7px 10px; }
.audit-row { align-items: flex-start; }
.audit-action { display: inline-block; margin-left: 6px; padding: 1px 7px; border-radius: 7px; background: var(--green-light); color: var(--green-dark); font-size: 11px; }
.audit-detail { margin-top: 2px; word-break: break-word; }
.delete-row { align-items: flex-start; }
.delete-row .ops { flex-direction: column; flex-shrink: 0; }
.delete-row .muted { margin-top: 2px; word-break: break-word; }
@media (max-width: 480px) {
  .tabs { padding: 10px 12px; gap: 8px; }
  .tab { padding: 7px 14px; font-size: 13px; }
  .row { padding: 10px; gap: 8px; }
  .delete-row .ops { flex-direction: row; flex-wrap: wrap; }
  .report-ops { flex-direction: row; flex-wrap: wrap; }
  .btn-danger { padding: 6px 10px; font-size: 12px; }
  .btn.small { padding: 6px 10px; font-size: 12px; }
  .user-tools { flex-wrap: wrap; }
  .twofa-row .field { min-width: 100%; }
  .user-row { flex-wrap: wrap; align-items: flex-start; }
  .user-row .info { min-width: calc(100% - 60px); }
  .user-row .ops { width: 100%; max-width: none; justify-content: flex-end; }
  .vip-admin-head { flex-direction: column; }
  .vip-generate-row { flex-wrap: wrap; }
  .vip-generate-row .field { min-width: 100%; }
  .vip-count-select { max-width: none; flex: 1; }
  .vip-generate-btn { flex: 1; }
  .title-admin-card { max-height: 94vh; padding: 14px; }
  .title-style-grid { grid-template-columns: 1fr; }
  .title-entry-setting { align-items: flex-start; }
}
</style>
