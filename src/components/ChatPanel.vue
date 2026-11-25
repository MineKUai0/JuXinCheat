<template>
  <div class="chat">
    <aside class="list" :class="{ 'mobile-hide': !!current }">
      <div class="list-search">
        <input v-model="q" class="field" :placeholder="t('searchPlaceholder')" @keyup.enter="doSearch" />
        <button class="btn search-btn press" @click="doSearch">{{ t('search') }}</button>
        <button class="tool-btn new-group-btn" @click="openGroupCreate">建群</button>
      </div>
      <div class="list-body">
        <TransitionGroup name="list" tag="div">
          <div v-if="searchResults.length" key="__title__" class="group-title">{{ t('search') }}</div>
          <div v-for="u in searchResults" :key="'s-' + u._id" class="item">
            <div class="avatar sq" @click="$router.push('/profile/' + u._id)">
              <img v-if="u.avatar" :src="u.avatar" />
              <span v-else>{{ (u.username || '?')[0] }}</span>
              <i v-if="isOnlineId(u._id)" class="dot"></i>
            </div>
            <div class="item-info" @click="$router.push('/profile/' + u._id)">
              <div class="item-name">{{ displayName(u) }}</div>
              <div class="muted">
                {{ u.number }}
                <span v-if="isOnlineId(u._id)" class="online-text"> · {{ t('onlineStatus') }}</span>
                <span v-else-if="onlineReady"> · {{ t('offlineStatus') }}</span>
              </div>
            </div>
            <button v-if="!u.relation || u.relation === 'none'" class="add-btn press" @click.stop="addFriend(u)">{{ t('addFriend') }}</button>
            <span v-else-if="u.relation === 'friend'" class="relation-tag">{{ t('alreadyFriend') }}</span>
            <span v-else-if="u.relation === 'pending_out'" class="relation-tag">{{ t('requestSent') }}</span>
            <span v-else-if="u.relation === 'pending_in'" class="relation-tag">{{ t('pendingIn') }}</span>
            <span v-else-if="u.relation === 'blocked'" class="relation-tag">{{ t('blocked') }}</span>
            <span v-else-if="u.relation === 'blocked_by'" class="relation-tag">{{ t('blockedByOther') }}</span>
          </div>

          <div key="__chat_title__" class="group-title">{{ t('chat') }}</div>
          <div v-if="!mergedList.length" key="__empty__" class="empty">{{ t('noChats') }}</div>
          <div v-for="c in mergedList" :key="'c-' + c.user._id"
               :class="['item', { active: current && String(current._id) === String(c.user._id) }]"
               @click="openChat(c.user)"
               @contextmenu.prevent="showCtxMenu($event, c)">
            <div :class="['avatar', 'sq', { 'group-avatar': c.isGroup }]">
              <img v-if="c.user.avatar" :src="c.user.avatar" />
              <span v-else>{{ c.isGroup ? '群' : (c.user.username || '?')[0] }}</span>
              <i v-if="!c.isGroup && isOnlineId(c.user._id)" class="dot"></i>
            </div>
            <div class="item-info">
              <div class="item-name">
                {{ displayName(c.user) }}
                <span v-if="c.isGroup" class="member-count-inline">{{ c.user.memberCount }}人</span>
                <span v-if="c.pinned" class="conv-tag pin">顶</span>
                <span v-if="c.muted" class="conv-tag mute">静</span>
              </div>
              <div class="muted one-line">{{ c.last || (c.isGroup ? '群聊已创建' : '（好友，未聊过）') }}</div>
            </div>
            <div class="item-right">
              <div v-if="c.time" class="item-time">{{ shortTime(c.time) }}</div>
              <Transition name="pop">
                <span v-if="unread[c.user._id]" class="badge">{{ unread[c.user._id] }}</span>
              </Transition>
            </div>
          </div>
        </TransitionGroup>
      </div>
    </aside>

    <section class="pane" :class="{ 'mobile-hide': !current }">
      <Transition name="fade" mode="out-in">
        <div v-if="!current" key="empty" class="empty-pane">{{ t('noChats') }}</div>
        <div v-else key="pane" class="pane-inner">
          <div class="pane-head">
            <span class="back-btn" @click="closeChat">‹</span>
            <span class="pane-name">{{ displayName(current) }}</span>
            <span v-if="!current.isGroup && userBadges(current).length" class="badge-row inline">
              <span v-for="(b, i) in userBadges(current)" :key="'ph-' + i"
                    :class="['title-badge', 'title-' + (b.style || 'vip')]">
                <span class="title-badge-text">{{ b.name }}</span>
              </span>
            </span>
            <span v-if="current.isGroup" class="muted group-count">{{ current.memberCount }} 人</span>
            <span v-else-if="typing" class="typing">{{ t('typing') }}</span>
            <span v-else-if="isOnlineId(current._id)" class="online-text">{{ t('onlineStatus') }}</span>
            <span v-else-if="onlineReady" class="muted">{{ t('offlineStatus') }}</span>
            <span v-else class="muted">{{ t('loading') }}</span>
            <span class="head-more" @click.stop="headMenu = !headMenu">
              ⋯
              <Transition name="drop">
                <div v-if="headMenu" class="head-menu" @click.stop>
                  <div v-if="current.isGroup" class="head-menu-item normal" @click="openGroupPanel(current)">群信息</div>
                  <div class="head-menu-item normal" @click="openSearch">搜索聊天记录</div>
                  <div v-if="!current.isGroup" class="head-menu-item" @click="blockCurrent">{{ t('block') }}</div>
                </div>
              </Transition>
            </span>
          </div>

          <div v-if="current.isGroup && current.announcement" class="group-notice" @click="openGroupPanel(current)">
            <span class="notice-tag">群公告</span>
            <span class="notice-text">{{ current.announcement }}</span>
            <span class="notice-more">›</span>
          </div>

          <div v-if="searchOpen" class="chat-search">
            <input ref="searchInput" v-model="searchQuery" class="field" placeholder="搜索聊天记录"
                   @keydown.enter="onSearchEnter" />
            <button class="btn-ghost btn search-go" :disabled="searching" @click="searchMessages">
              {{ searching ? '搜索中' : '搜索' }}
            </button>
            <button class="tool-btn" @click="closeSearch">关闭</button>
          </div>
          <div v-if="searchOpen && searchResultsChat.length" class="search-results">
            <div v-for="m in searchResultsChat" :key="'sr-' + m._id" class="search-result" @click="jumpToMessage(m)">
              <div class="search-result-text">
                <span v-if="current && current.isGroup && m.fromUser" class="search-result-from">{{ m.fromUser.nickname || m.fromUser.username }}：</span>{{ m.content }}
              </div>
              <div class="muted">{{ fmtTime(m.createdAt) }}</div>
            </div>
          </div>
          <div v-if="searchOpen && searchDone && !searchResultsChat.length" class="search-empty">没有找到相关消息</div>

          <div ref="msgBox" class="messages" :style="activeChatBgStyle" @click="headMenu = false" @scroll="onMessagesScroll">
            <div v-if="hasMoreHistory" class="load-more" @click="loadMoreHistory">
              {{ loadingMore ? t('loading') : '加载更早的消息' }}
            </div>
            <TransitionGroup name="list" tag="div" class="msg-list">
              <div v-for="m in renderMessages" :key="m._id" class="msg-block" :data-mid="m._id">
                <div v-if="m.showTime" class="time-divider">{{ m.timeLabel }}</div>

                <div v-if="m.recalled" class="recall-line">
                  {{ String(m.from) === myId ? t('recalledByMe') : t('recalledByOther') }}
                </div>

                <div v-else :class="['msg-row', { mine: String(m.from) === myId }]"
                     @contextmenu.prevent="openMsgMenu($event, m)">
                  <div class="avatar sq msg-avatar" title="单击看资料，双击拍一拍" @click="onAvatarClick(m)">
                    <img v-if="avatarOf(m)" :src="avatarOf(m)" />
                    <span v-else>{{ (nameOf(m) || '?')[0] }}</span>
                  </div>
                  <div class="msg-body">
                    <div v-if="current.isGroup && String(m.from) !== myId" class="msg-sender-line">
                      <span class="msg-sender">{{ nameOf(m) }}</span>
                      <span v-if="messageBadges(m).length" class="badge-row inline">
                        <span v-for="(b, i) in messageBadges(m)" :key="'sm-' + i"
                              :class="['title-badge', 'title-' + (b.style || 'vip')]">
                          <span class="title-badge-text">{{ b.name }}</span>
                        </span>
                      </span>
                    </div>
                    <div :class="['bubble', { mine: String(m.from) === myId, failed: m.failed, 'sticker-bubble': m.type === 'sticker' && !m.replyTo && !m.forwarded }]"
                         @touchstart="startPress($event, m)"
                         @touchend="cancelPress"
                         @touchmove="onPressMove">
                      <div v-if="bubbleBadges(m).length" class="bubble-badges">
                        <span v-for="(b, i) in bubbleBadges(m)" :key="'bb-' + i"
                              :class="['title-badge', 'title-' + (b.style || 'vip')]">
                          <span class="title-badge-text">{{ b.name }}</span>
                        </span>
                      </div>
                      <div v-if="m.forwarded" class="forward-mark">转发</div>
                      <div v-if="m.replyTo && m.replyTo.messageId" class="reply-quote"
                           @click.stop="jumpToMessage({ _id: m.replyTo.messageId })">
                        <span class="reply-quote-name">{{ m.replyTo.fromName || '原消息' }}：</span>
                        <span class="reply-quote-text">{{ replyPreview(m.replyTo) }}</span>
                      </div>
                      <template v-if="m.type === 'image'">
                        <img class="msg-img" :src="m.image" @click="previewImg = m.image" />
                      </template>
                      <template v-else-if="m.type === 'sticker'">
                        <img class="msg-sticker" :src="m.sticker" @click="previewImg = m.sticker" />
                      </template>
                      <template v-else-if="m.type === 'voice'">
                        <span v-if="m.expired" class="expired">{{ t('voiceExpired') }}</span>
                        <span v-else class="voice-line" @click="playVoice(m)">
                          <span class="voice-play">{{ playingId === m._id ? '❚❚' : '▶' }}</span>
                          <span class="voice-bars"><i></i><i></i><i></i></span>
                          <span class="voice-dur">{{ m.duration }}″</span>
                        </span>
                      </template>
                      <template v-else-if="m.type === 'file'">
                        <button type="button" class="vip-file-card"
                                :class="{ expired: !m.file || m.file.expired }"
                                @click.stop="downloadVipFile(m)">
                          <span class="vip-file-type">{{ fileExt(m.file && m.file.name) }}</span>
                          <span class="vip-file-info">
                            <span class="vip-file-name">{{ (m.file && m.file.name) || '文件' }}</span>
                            <span class="vip-file-meta">
                              {{ formatFileSize(m.file && m.file.size) }}
                              · {{ !m.file ? '文件不可用' : (m.file.expired ? '已过期' : '有效至 ' + formatFileDate(m.file.expiresAt)) }}
                            </span>
                          </span>
                          <span class="vip-file-action">{{ downloadingFileId === (m.file && m.file.id) ? '下载中' : (m.file && !m.file.expired ? '下载' : '') }}</span>
                        </button>
                      </template>
                      <span v-else class="msg-text">{{ m.content }}</span>
                    </div>
                    <div v-if="String(m.from) === myId && (m.failed || (isLastMine(m) && !m.pending))" class="msg-status">
                      <span v-if="m.failed" class="failed-text" @click="resend(m)">发送失败，点击重发</span>
                      <span v-else-if="m.read">{{ t('read') }}</span>
                      <span v-else>{{ t('delivered') }}</span>
                    </div>
                  </div>
                  <span v-if="!m.pending && !m.failed" class="msg-more"
                        @click.stop="openMsgMenuFromButton($event, m)">⋯</span>
                </div>
              </div>
            </TransitionGroup>
            <Transition name="fade">
              <div v-if="patLine.text" :key="patLine.id" class="pat-line">{{ patLine.text }}</div>
            </Transition>
            <div v-if="hasNewer" class="load-latest" @click="backToLatest">回到最新消息</div>
          </div>

          <div v-if="replyTarget" class="reply-compose">
            <div class="reply-compose-body">
              <span class="reply-compose-title">回复 {{ replyTarget.fromName || '这条消息' }}</span>
              <span class="reply-compose-preview">{{ replyPreview(replyTarget) }}</span>
            </div>
            <button class="reply-cancel" aria-label="取消回复" @click="replyTarget = null">×</button>
          </div>

          <div v-if="emojiPanel" class="emoji-panel">
            <div class="sticker-library">
              <div class="sticker-library-head">
                <span>我的表情</span>
                <button class="sticker-upload-btn" @click="pickSticker">上传表情</button>
              </div>
              <div class="sticker-grid">
                <div v-for="(item, index) in customStickers" :key="'sticker-' + index" class="sticker-item">
                  <img :src="item" alt="自定义表情" @click="sendSticker(item)" />
                  <button class="sticker-remove" title="删除表情" @click.stop="removeSticker(index)">×</button>
                </div>
                <button class="sticker-add" @click="pickSticker">＋<span>添加</span></button>
              </div>
            </div>
            <div class="emoji-title">Emoji</div>
            <span v-for="e in emojis" :key="e" class="emoji-item" @click="addEmoji(e)">{{ e }}</span>
          </div>

          <div v-if="uploadingFile" class="vip-upload-status">
            <span class="vip-upload-name">{{ uploadingFileName }}</span>
            <span class="vip-upload-track"><i :style="{ width: uploadPct + '%' }"></i></span>
            <span>{{ uploadPct }}%</span>
          </div>

          <div class="pane-foot">
            <button class="tool-btn press" @click="toggleVoiceMode">{{ voiceMode ? '键盘' : t('voice') }}</button>

            <button v-if="voiceMode" class="hold-btn press"
                    :class="{ recording: recording, cancel: recCancelled }"
                    @mousedown.prevent="startRecording"
                    @touchstart.prevent="startRecording">
              {{ recording ? (recCancelled ? '松开取消' : t('recording')) + ' ' + recSeconds + '″' : t('holdToTalk') }}
            </button>
            <input v-else ref="inputEl" v-model="draft" class="field" :placeholder="t('chatPlaceholder')"
                   :disabled="chatLoading"
                   @keydown.enter="onEnter" @input="onDraftInput" @blur="stopTyping" />

            <button class="tool-btn press" @click="emojiPanel = !emojiPanel">{{ t('emoji') }}</button>
            <button class="tool-btn press" @click="pickImage">＋</button>
            <button v-if="canSendFiles" class="tool-btn press vip-file-btn" :disabled="uploadingFile" @click="pickVipFile">文件</button>
            <button class="btn press send-btn" :disabled="chatLoading" @click="sendText">{{ t('send') }}</button>
          </div>

          <input ref="fileInput" type="file" accept="image/*" style="display:none" @change="onPickImage" />
          <input ref="stickerInput" type="file" accept="image/*" style="display:none" @change="onPickSticker" />
          <input ref="vipFileInput" type="file" style="display:none" @change="onPickVipFile" />
        </div>
      </Transition>
    </section>

    <!-- 聊天列表右键：拉黑 / 封禁 -->
    <Teleport to="body">
      <Transition name="drop">
        <div v-if="ctx.show" class="ctx-menu"
             :style="{ left: ctx.x + 'px', top: ctx.y + 'px' }"
             @click.stop>
          <template v-if="ctx.group">
            <div class="ctx-item" @click="togglePin">{{ ctx.group.pinned ? '取消置顶' : '置顶会话' }}</div>
            <div class="ctx-item" @click="toggleMute">{{ ctx.group.muted ? '取消免打扰' : '免打扰' }}</div>
            <div class="ctx-item" @click="openCtxGroup">群成员</div>
            <div class="ctx-item danger" @click="leaveOrDisbandFromCtx">
              {{ ctx.group.role === 'owner' ? '解散群聊' : '退出群聊' }}
            </div>
          </template>
          <template v-else>
            <div class="ctx-item" @click="togglePin">{{ isPinned(ctx.user) ? '取消置顶' : '置顶会话' }}</div>
            <div class="ctx-item" @click="toggleMute">{{ isMuted(ctx.user) ? '取消免打扰' : '免打扰' }}</div>
            <div class="ctx-item" @click="clearChat">清空聊天</div>
            <div v-if="isFriendUser(ctx.user)" class="ctx-item danger" @click="deleteFriend">删除好友</div>
            <div class="ctx-item danger" @click="doBlock">{{ t('rightClickBlock') }}</div>
            <div v-if="isAdmin" class="ctx-item ban-parent"
                 @mouseenter="openBanSub"
                 @mouseleave="closeBanSubDelay">
              <span>封禁</span>
              <span class="arrow">▶</span>
              <Transition name="slide">
                <div v-if="showBanSub" class="ban-sub"
                     @mouseenter="cancelCloseBanSub"
                     @mouseleave="closeBanSubDelay"
                     @click.stop>
                  <div v-for="opt in banOptions" :key="opt.label" class="ban-item"
                       @click="banPick = opt.hours">
                    <span :class="['circle', { on: banPick === opt.hours }]"></span>
                    <span>{{ opt.label }}</span>
                  </div>
                  <div class="ban-confirm" @click="confirmBan">确定封禁</div>
                </div>
              </Transition>
            </div>
          </template>
        </div>
      </Transition>
    </Teleport>

    <!-- 消息右键 / 长按菜单 -->
    <Teleport to="body">
      <Transition name="pop">
        <div v-if="msgCtx.show" class="ctx-menu"
             :style="{ left: msgCtx.x + 'px', top: msgCtx.y + 'px' }"
             @click.stop>
          <div v-if="canReply(msgCtx.msg)" class="ctx-item" @click="replyFromMenu">回复</div>
          <div v-if="canForward(msgCtx.msg)" class="ctx-item" @click="forwardFromMenu">转发</div>
          <div v-if="canFavorite(msgCtx.msg)" class="ctx-item" @click="favoriteFromMenu">收藏</div>
          <div v-if="canPatMsg(msgCtx.msg)" class="ctx-item" @click="patFromMenu">拍一拍</div>
          <div v-if="canCopy(msgCtx.msg)" class="ctx-item" @click="copyMsg">{{ t('copy') }}</div>
          <div v-if="canViewImage(msgCtx.msg)" class="ctx-item" @click="viewImage">{{ t('viewImage') }}</div>
          <div v-if="canSaveImage(msgCtx.msg)" class="ctx-item" @click="saveImage">{{ t('saveImage') }}</div>
          <div v-if="canPlayVoice(msgCtx.msg)" class="ctx-item" @click="playVoiceFromMenu">{{ t('playVoice') }}</div>
          <div v-if="canSaveVoice(msgCtx.msg)" class="ctx-item" @click="saveVoice">{{ t('saveVoice') }}</div>
          <div v-if="canRecall(msgCtx.msg)" class="ctx-item danger" @click="recallMsg">{{ t('recall') }}</div>
        </div>
      </Transition>
    </Teleport>

    <!-- 发起群聊 -->
    <Teleport to="body">
      <Transition name="pop">
        <div v-if="groupCreateOpen" class="modal-mask" @click.self="closeGroupCreate">
          <div class="modal-card">
            <div class="modal-title">发起群聊</div>
            <input v-model="groupName" class="field" placeholder="群名称（最多 30 字）" maxlength="30" />
            <div class="modal-sub muted">选择好友，至少 2 人</div>
            <div class="pick-list">
              <label v-for="f in friends" :key="'gp-' + f._id" class="pick-row">
                <input type="checkbox" :value="String(f._id)" v-model="groupPick" />
                <span class="avatar sq pick-avatar">
                  <img v-if="f.avatar" :src="f.avatar" />
                  <span v-else>{{ (f.username || '?')[0] }}</span>
                </span>
                <span class="pick-name">{{ displayName(f) }}</span>
              </label>
              <div v-if="!friends.length" class="empty">还没有好友</div>
            </div>
            <div class="muted">已选 {{ groupPick.length }} 人</div>
            <div class="modal-actions">
              <button class="btn-ghost btn" @click="closeGroupCreate">取消</button>
              <button class="btn" :disabled="groupCreating || groupPick.length < 2" @click="createGroup">
                {{ groupCreating ? '创建中' : '创建群聊' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 转发消息 -->
    <Teleport to="body">
      <Transition name="pop">
        <div v-if="forwardOpen" class="modal-mask" @click.self="closeForward(false)">
          <div class="modal-card forward-card">
            <div class="modal-title">转发消息</div>
            <div v-if="forwardMsg" class="forward-preview">{{ replyPreview(forwardMsg) }}</div>
            <input v-model="forwardQuery" class="field" placeholder="搜索好友或群聊" />
            <div class="forward-list">
              <button v-for="target in forwardTargets" :key="target.key"
                      class="forward-row press" :disabled="forwarding" @click="forwardTo(target)">
                <span :class="['avatar', 'sq', 'pick-avatar', { 'group-avatar': target.isGroup }]">
                  <img v-if="target.avatar" :src="target.avatar" />
                  <span v-else>{{ target.isGroup ? '群' : (target.name || '?')[0] }}</span>
                </span>
                <span class="forward-row-main">
                  <span class="forward-row-name">{{ target.name }}</span>
                  <span class="forward-row-sub">{{ target.sub }}</span>
                </span>
                <span class="forward-row-go">{{ forwarding ? '…' : '转发' }}</span>
              </button>
              <div v-if="!forwardTargets.length" class="muted forward-empty">没有可转发的好友或群聊</div>
            </div>
            <div class="modal-actions">
              <button class="btn-ghost btn" @click="closeForward(false)">取消</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 群聊信息 -->
    <Teleport to="body">
      <Transition name="pop">
        <div v-if="groupPanelOpen" class="modal-mask" @click.self="closeGroupPanel">
          <div class="modal-card">
            <div class="modal-title">群聊信息</div>
            <div v-if="groupDetail" class="group-detail">
              <div v-if="groupDetail.group.myRole === 'owner'" class="name-edit">
                <input v-model="groupNameEdit" class="field" maxlength="30" placeholder="群名称" />
                <button class="btn-ghost btn small-btn" :disabled="groupBusy" @click="saveGroupName">保存</button>
              </div>
              <div v-else class="panel-group-name">{{ groupDetail.group.name }}</div>
              <div class="muted">{{ groupDetail.members.length }} 位成员</div>

              <div class="nickname-card">
                <label class="nickname-label" for="group-nickname">我在本群的昵称</label>
                <div class="nickname-row">
                  <input id="group-nickname" v-model="groupNickname" class="field" maxlength="20"
                         placeholder="留空则使用原昵称" @keydown.enter="saveGroupNickname" />
                  <button class="btn-ghost btn small-btn" :disabled="groupBusy" @click="saveGroupNickname">保存</button>
                </div>
                <div class="nickname-hint">群成员会看到这个昵称，最多 20 字</div>
              </div>

              <div class="announce-card">
                <div class="announce-title">群公告</div>
                <template v-if="groupDetail.group.myRole === 'owner'">
                  <textarea v-model="groupAnnouncement" class="field announce-input" maxlength="500"
                            placeholder="发布群公告，所有成员都能看到…"></textarea>
                  <div class="announce-actions">
                    <button class="btn small-btn" :disabled="groupBusy || !groupAnnouncement.trim()"
                            @click="saveGroupAnnouncement">发布</button>
                    <button v-if="groupDetail.group.announcement" class="btn-ghost btn small-btn"
                            :disabled="groupBusy" @click="clearGroupAnnouncement">清除</button>
                  </div>
                </template>
                <div v-else-if="groupDetail.group.announcement" class="announce-view">{{ groupDetail.group.announcement }}</div>
                <div v-else class="muted">暂无公告</div>
                <div v-if="groupDetail.group.announcementAt" class="announce-time">
                  更新于 {{ fmtTime(groupDetail.group.announcementAt) }}
                </div>
              </div>

              <div class="member-list">
                <div v-for="mem in groupDetail.members" :key="'gm-' + mem._id" class="member-row">
                  <span class="avatar sq pick-avatar">
                    <img v-if="mem.avatar" :src="mem.avatar" />
                    <span v-else>{{ (mem.username || '?')[0] }}</span>
                  </span>
                  <span class="member-name">
                    {{ mem.nickname || mem.username }}
                    <span v-if="mem.nickname" class="member-real-name">{{ mem.username }}</span>
                    <span v-if="mem.role === 'owner'" class="owner-tag">群主</span>
                  </span>
                  <button v-if="groupDetail.group.myRole === 'owner' && mem.role !== 'owner'"
                          class="btn-ghost btn small-btn danger-ghost" @click="removeGroupMember(mem)">移出</button>
                </div>
              </div>

              <template v-if="groupDetail.group.myRole === 'owner'">
                <div class="modal-sub muted">添加好友进群</div>
                <div class="pick-list small">
                  <label v-for="f in groupAddCandidates" :key="'ga-' + f._id" class="pick-row">
                    <input type="checkbox" :value="String(f._id)" v-model="groupAddPick" />
                    <span class="avatar sq pick-avatar">
                      <img v-if="f.avatar" :src="f.avatar" />
                      <span v-else>{{ (f.username || '?')[0] }}</span>
                    </span>
                    <span class="pick-name">{{ displayName(f) }}</span>
                  </label>
                  <div v-if="!groupAddCandidates.length" class="muted">没有可添加的好友</div>
                </div>
                <button class="btn-ghost btn small-btn" :disabled="groupBusy || !groupAddPick.length" @click="addGroupMembers">
                  添加选中成员
                </button>
              </template>

              <div class="modal-actions">
                <button class="btn-ghost btn" @click="closeGroupPanel">关闭</button>
                <button class="btn danger-btn" :disabled="groupBusy" @click="leaveOrDisbandFromPanel">
                  {{ groupDetail.group.myRole === 'owner' ? '解散群聊' : '退出群聊' }}
                </button>
              </div>
            </div>
            <div v-else class="muted">加载中</div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Transition name="fade">
      <div v-if="previewImg" class="preview-mask" @click="previewImg = ''">
        <img :src="previewImg" />
      </div>
    </Transition>

    <Transition name="pop">
      <div v-if="groupEntryNotice" class="group-entry-pop">
        <span class="avatar sq group-entry-avatar">
          <img v-if="groupEntryNotice.user && groupEntryNotice.user.avatar" :src="groupEntryNotice.user.avatar" />
          <span v-else>{{ ((groupEntryNotice.user && groupEntryNotice.user.username) || '群')[0] }}</span>
        </span>
        <span class="group-entry-copy">
          <span class="badge-row group-entry-badges">
            <span v-for="(b, i) in entryBadges" :key="'ge-' + i"
                  :class="['title-badge', 'title-' + (b.style || 'vip')]">
              <span class="title-badge-text">{{ b.name }}</span>
            </span>
          </span>
          <span class="group-entry-text">{{ (groupEntryNotice.user && groupEntryNotice.user.username) || '群成员' }} 来聊天了</span>
        </span>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api';
import { t } from '../i18n';
import { useUserStore } from '../store/user';
import { getSocket, connectSocket } from '../socket';
import { readImageFile } from '../utils/image';
import { stopTitleFlash } from '../utils/notify';
import { uiState } from '../store/uiState';
import { prefs, chatBackgroundStyle } from '../utils/prefs';

const router = useRouter();
const store = useUserStore();
const myId = store.myId;
const isAdmin = computed(() => store.user && store.user.isAdmin);
const canSendFiles = computed(() => !!(store.user && store.user.vipActive));

const q = ref('');
const searchResults = ref([]);
const conversations = ref([]);
const friends = ref([]);
const groups = ref([]);
const groupCreateOpen = ref(false);
const groupName = ref('');
const groupPick = ref([]);
const groupCreating = ref(false);
const groupPanelOpen = ref(false);
const groupDetail = ref(null);
const groupNameEdit = ref('');
const groupAnnouncement = ref('');
const groupAddPick = ref([]);
const groupBusy = ref(false);
const settings = ref({});
const current = ref(null);
const messages = ref([]);
const hasMoreHistory = ref(false);
const loadingMore = ref(false);
const hasNewer = ref(false);
const searchOpen = ref(false);
const searchQuery = ref('');
const searchResultsChat = ref([]);
const searching = ref(false);
const searchDone = ref(false);
const searchInput = ref(null);
const draft = ref('');
const chatLoading = ref(false);
let chatSeq = 0;
let searchSeq = 0;
// 打开会话、跳转搜索结果时布局还在变化，期间禁止滚动触发自动分页
let suppressScrollLoad = false;
const onlineIds = ref([]);
const onlineReady = ref(false);
let onlineFromSocket = false;
const unread = ref({});
const typingMap = ref({});
const msgBox = ref(null);
const inputEl = ref(null);
const fileInput = ref(null);
const vipFileInput = ref(null);
const uploadingFile = ref(false);
const uploadingFileName = ref('');
const uploadPct = ref(0);
const downloadingFileId = ref('');
const emojiPanel = ref(false);
const voiceMode = ref(false);
const recording = ref(false);
const recSeconds = ref(0);
const recCancelled = ref(false);
const playingId = ref('');
const previewImg = ref('');
const replyTarget = ref(null);
const forwardOpen = ref(false);
const forwardMsg = ref(null);
const forwardQuery = ref('');
const forwarding = ref(false);
const groupNickname = ref('');
const patLine = ref({ id: '', text: '' });
const groupEntryNotice = ref(null);
let groupEntryTimer = null;
const entryBadges = computed(function () {
  const entry = groupEntryNotice.value;
  return entry && entry.user && Array.isArray(entry.user.badges) ? entry.user.badges : [];
});
const headMenu = ref(false);
let currentAudio = null;
let patLineTimer = null;
let avatarClickTimer = null;
let lastPatAt = 0;

const ctx = ref({ show: false, x: 0, y: 0, user: null, group: null });
const msgCtx = ref({ show: false, x: 0, y: 0, msg: null });
const showBanSub = ref(false);
const banPick = ref(24 * 7);
let banTimer = null;

const emojis = ['😀','😄','😁','😆','😅','😂','🙂','😉','😊','😍','😘','😜','🤔','😐','😴','😭','😡','👍','👎','👏','🙏','💪','🎉','❤️','💔','🌹','🍀','☀️','🌙','⭐'];
const stickerInput = ref(null);
const stickerStorageKey = 'jx_custom_stickers_' + myId;

function readStickerLibrary() {
  try {
    const list = JSON.parse(localStorage.getItem(stickerStorageKey) || '[]');
    return Array.isArray(list)
      ? list.filter(function (item) { return typeof item === 'string' && item.startsWith('data:image/'); }).slice(0, 24)
      : [];
  } catch (e) {
    return [];
  }
}

const customStickers = ref(readStickerLibrary());

function persistStickers() {
  try {
    localStorage.setItem(stickerStorageKey, JSON.stringify(customStickers.value));
    return true;
  } catch (e) {
    alert('表情库已满，请先删除几个表情');
    return false;
  }
}

const banOptions = [
  { label: '1 天', hours: 24 },
  { label: '7 天', hours: 24 * 7 },
  { label: '1 个月', hours: 24 * 30 },
  { label: '3 个月', hours: 24 * 90 },
  { label: '6 个月', hours: 24 * 180 },
  { label: '1 年', hours: 24 * 365 },
  { label: '永久', hours: 0 }
];

const mergedList = computed(() => {
  const map = new Map();
  const s = settings.value || {};
  friends.value.forEach(function (f) {
    const id = String(f._id);
    const st = s[id] || {};
    map.set(id, {
      isGroup: false,
      user: f, last: '', time: null,
      pinned: !!st.pinned, muted: !!st.muted
    });
  });
  conversations.value.forEach(function (c) {
    const k = String(c.user._id);
    const st = s[k] || {};
    if (map.has(k)) {
      map.get(k).last = c.last;
      map.get(k).time = c.time;
      map.get(k).pinned = !!st.pinned;
      map.get(k).muted = !!st.muted;
    } else {
      map.set(k, {
        isGroup: false,
        user: c.user, last: c.last, time: c.time,
        pinned: !!st.pinned, muted: !!st.muted
      });
    }
  });
  groups.value.forEach(function (g) {
    map.set('g-' + String(g._id), {
      isGroup: true,
      group: g,
      user: {
        _id: String(g._id),
        username: g.name,
        avatar: '',
        isGroup: true,
        memberCount: g.memberCount,
        role: g.role,
        announcement: g.announcement || ''
      },
      last: g.last || '',
      time: g.time,
      pinned: !!g.pinned,
      muted: !!g.muted
    });
  });
  return Array.from(map.values()).sort(function (a, b) {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    const ta = a.time ? new Date(a.time).getTime() : 0;
    const tb = b.time ? new Date(b.time).getTime() : 0;
    if (ta !== tb) return tb - ta; // 最近聊过的排前面
    return String(a.user.username || '').localeCompare(String(b.user.username || ''));
  });
});

const groupAddCandidates = computed(() => {
  if (!groupDetail.value) return [];
  const inGroup = new Set(groupDetail.value.members.map(function (m) { return String(m._id); }));
  return friends.value.filter(function (f) { return !inGroup.has(String(f._id)); });
});

const typing = computed(() => {
  if (!current.value) return false;
  return !!typingMap.value[String(current.value._id)];
});

const activeChatBgStyle = computed(() => chatBackgroundStyle(prefs.chatBg));

const forwardTargets = computed(() => {
  const keyword = forwardQuery.value.trim().toLowerCase();
  const list = [];
  friends.value.forEach(function (f) {
    list.push({
      key: 'f-' + f._id,
      id: String(f._id),
      isGroup: false,
      name: displayName(f),
      avatar: f.avatar || '',
      sub: f.number || ''
    });
  });
  groups.value.forEach(function (g) {
    list.push({
      key: 'g-' + g._id,
      id: String(g._id),
      isGroup: true,
      name: g.name,
      avatar: '',
      sub: (g.memberCount || 0) + ' 人'
    });
  });
  return list.filter(function (item) {
    return !keyword || String(item.name || '').toLowerCase().includes(keyword) ||
      String(item.sub || '').toLowerCase().includes(keyword);
  });
});

const renderMessages = computed(() => {
  let prev = 0;
  return messages.value.map(m => {
    const ts = new Date(m.createdAt).getTime();
    const showTime = !prev || ts - prev > 5 * 60 * 1000;
    prev = ts;
    return Object.assign({}, m, { showTime: showTime, timeLabel: fmtTime(m.createdAt) });
  });
});

function pad(n) { return n < 10 ? '0' + n : '' + n; }
function fmtTime(v) {
  const d = new Date(v);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const hm = pad(d.getHours()) + ':' + pad(d.getMinutes());
  if (d.toDateString() === now.toDateString()) return hm;
  return (d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + hm;
}
function shortTime(v) {
  const d = new Date(v);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return pad(d.getHours()) + ':' + pad(d.getMinutes());
  return (d.getMonth() + 1) + '/' + pad(d.getDate());
}

function cacheKey(name) { return 'jx_' + name + '_' + myId; }
function draftKey(peerId) { return 'jx_draft_' + myId + '_' + peerId; }
function saveDraft(peerId) {
  if (!peerId) return;
  try {
    if (draft.value) localStorage.setItem(draftKey(peerId), draft.value);
    else localStorage.removeItem(draftKey(peerId));
  } catch (e) {}
}
function readCache(name) {
  try { return JSON.parse(localStorage.getItem(cacheKey(name)) || 'null'); } catch (e) { return null; }
}
function writeCache(name, data) {
  try { localStorage.setItem(cacheKey(name), JSON.stringify(data)); } catch (e) {}
}

async function loadConversations() {
  try {
    const { data } = await api.get('/api/message/conversations');
    conversations.value = data.conversations;
    data.conversations.forEach(c => {
      const id = String(c.user._id);
      const active = current.value && !current.value.isGroup &&
        String(current.value._id) === id && !hasNewer.value;
      unread.value[id] = active ? 0 : (c.unread || 0);
    });
    writeCache('convs', data.conversations);
  } catch (e) {
    const cached = readCache('convs');
    if (cached) conversations.value = cached;
  }
}

// 当前会话收发消息后也要刷新左侧最后一条和时间；
// 连续发多条时合并成一次请求
let convReloadTimer = null;
function refreshConversationsSoon() {
  if (convReloadTimer) return;
  convReloadTimer = setTimeout(function () {
    convReloadTimer = null;
    loadConversations();
  }, 500);
}
async function loadFriends() {
  try {
    const { data } = await api.get('/api/friend/list');
    friends.value = data.friends;
    writeCache('friends', data.friends);
  } catch (e) {
    const cached = readCache('friends');
    if (cached) friends.value = cached;
  }
}

function updateMutedGroups() {
  uiState.mutedGroupIds = groups.value
    .filter(function (g) { return g.muted; })
    .map(function (g) { return String(g._id); });
}

let groupReloadTimer = null;
function refreshGroupsSoon() {
  if (groupReloadTimer) return;
  groupReloadTimer = setTimeout(function () {
    groupReloadTimer = null;
    loadGroups();
  }, 500);
}

async function loadGroups() {
  try {
    const { data } = await api.get('/api/group/list');
    groups.value = data.groups || [];
    groups.value.forEach(function (g) {
      const gid = String(g._id);
      const active = current.value && current.value.isGroup &&
        String(current.value._id) === gid && !hasNewer.value;
      unread.value[gid] = active ? 0 : (g.unread || 0);
    });
    writeCache('groups', groups.value);
    updateMutedGroups();
    if (current.value && current.value.isGroup) {
      const g = groups.value.find(function (x) { return String(x._id) === String(current.value._id); });
      if (g) {
        current.value = Object.assign({}, current.value, {
          username: g.name, memberCount: g.memberCount, role: g.role,
          announcement: g.announcement || ''
        });
      }
    }
  } catch (e) {
    const cached = readCache('groups');
    if (cached) {
      groups.value = cached;
      updateMutedGroups();
    }
  }
}

async function loadSettings() {
  try {
    const { data } = await api.get('/api/message/settings');
    const map = {};
    (data.settings || []).forEach(function (s) {
      map[s.peer] = { pinned: !!s.pinned, muted: !!s.muted };
    });
    settings.value = map;
    writeCache('settings', map);
    uiState.mutedPeerIds = Object.keys(map).filter(function (id) { return map[id].muted; });
  } catch (e) {
    const cached = readCache('settings');
    if (cached) {
      settings.value = cached;
      uiState.mutedPeerIds = Object.keys(cached).filter(function (id) { return cached[id].muted; });
    }
  }
}

function isPinned(u) {
  return !!(u && settings.value[String(u._id)] && settings.value[String(u._id)].pinned);
}
function isMuted(u) {
  return !!(u && settings.value[String(u._id)] && settings.value[String(u._id)].muted);
}
function isFriendUser(u) {
  if (!u) return false;
  const id = String(u._id);
  return friends.value.some(function (f) { return String(f._id) === id; });
}

async function saveSetting(peer, patch) {
  const id = String(peer && peer._id ? peer._id : peer);
  const prev = settings.value[id] || { pinned: false, muted: false };
  const next = Object.assign({}, prev, patch);
  settings.value = Object.assign({}, settings.value, { [id]: next });
  uiState.mutedPeerIds = Object.keys(settings.value)
    .filter(function (k) { return settings.value[k].muted; });
  writeCache('settings', settings.value);
  try {
    await api.post('/api/message/settings', Object.assign({ peer: id }, patch));
  } catch (e) {
    // 失败时恢复原状态
    settings.value = Object.assign({}, settings.value, { [id]: prev });
    uiState.mutedPeerIds = Object.keys(settings.value)
      .filter(function (k) { return settings.value[k].muted; });
    alert((e.response && e.response.data && e.response.data.message) || '设置失败');
  }
}
async function saveGroupSetting(groupId, patch) {
  const id = String(groupId);
  const prev = groups.value.find(function (g) { return String(g._id) === id; });
  if (!prev) return;
  const prevVals = { pinned: !!prev.pinned, muted: !!prev.muted };
  groups.value = groups.value.map(function (g) {
    return String(g._id) === id ? Object.assign({}, g, patch) : g;
  });
  updateMutedGroups();
  try {
    await api.post('/api/group/' + id + '/settings', patch);
  } catch (e) {
    groups.value = groups.value.map(function (g) {
      return String(g._id) === id ? Object.assign({}, g, prevVals) : g;
    });
    updateMutedGroups();
    alert((e.response && e.response.data && e.response.data.message) || '设置失败');
  }
}
function togglePin() {
  if (ctx.value.group) {
    const g = ctx.value.group;
    ctx.value.show = false;
    saveGroupSetting(g._id, { pinned: !g.pinned });
    return;
  }
  const u = ctx.value.user;
  ctx.value.show = false;
  if (!u) return;
  saveSetting(u._id, { pinned: !isPinned(u) });
}
function toggleMute() {
  if (ctx.value.group) {
    const g = ctx.value.group;
    ctx.value.show = false;
    saveGroupSetting(g._id, { muted: !g.muted });
    return;
  }
  const u = ctx.value.user;
  ctx.value.show = false;
  if (!u) return;
  saveSetting(u._id, { muted: !isMuted(u) });
}
function openGroupCreate() {
  groupCreateOpen.value = true;
  groupName.value = '';
  groupPick.value = [];
}
function closeGroupCreate() {
  groupCreateOpen.value = false;
  groupCreating.value = false;
}
async function createGroup() {
  const name = groupName.value.trim();
  if (!name) { alert('请输入群名称'); return; }
  if (groupPick.value.length < 2) { alert('至少选择 2 位好友'); return; }
  groupCreating.value = true;
  try {
    const { data } = await api.post('/api/group/create', {
      name: name,
      members: groupPick.value
    });
    groupCreateOpen.value = false;
    await loadGroups();
    openChat(Object.assign({ isGroup: true }, data.group, {
      username: data.group.name,
      memberCount: data.group.memberCount
    }));
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '创建群聊失败');
  } finally {
    groupCreating.value = false;
  }
}

async function fetchGroupDetail(gid, keepAnnouncementDraft) {
  const { data } = await api.get('/api/group/' + gid);
  const sameGroup = groupDetail.value && String(groupDetail.value.group._id) === String(gid);
  const previousAnnouncement = sameGroup ? (groupDetail.value.group.announcement || '') : '';
  const preserveDraft = keepAnnouncementDraft && sameGroup &&
    groupAnnouncement.value !== previousAnnouncement;
  groupDetail.value = {
    group: data.group,
    members: data.group.members || []
  };
  groupNameEdit.value = data.group.name;
  if (!preserveDraft) groupAnnouncement.value = data.group.announcement || '';
  groupNickname.value = data.group.myNickname || '';
  groupAddPick.value = [];
  if (current.value && current.value.isGroup && String(current.value._id) === String(gid)) {
    current.value = Object.assign({}, current.value, {
      username: data.group.name,
      memberCount: data.group.memberCount,
      role: data.group.myRole,
      announcement: data.group.announcement || ''
    });
  }
  return data.group;
}
async function openGroupPanel(g) {
  headMenu.value = false;
  const gid = String(g && g._id ? g._id : (current.value && current.value.isGroup ? current.value._id : ''));
  if (!gid) return;
  groupPanelOpen.value = true;
  groupDetail.value = null;
  groupBusy.value = true;
  try {
    await fetchGroupDetail(gid);
  } catch (e) {
    groupPanelOpen.value = false;
    alert((e.response && e.response.data && e.response.data.message) || '加载群信息失败');
  } finally {
    groupBusy.value = false;
  }
}
function closeGroupPanel() {
  groupPanelOpen.value = false;
  groupDetail.value = null;
  groupAddPick.value = [];
}
function openCtxGroup() {
  const g = ctx.value.group;
  ctx.value.show = false;
  if (g) openGroupPanel(g);
}
async function saveGroupName() {
  if (!groupDetail.value) return;
  const name = groupNameEdit.value.trim();
  if (!name) { alert('请输入群名称'); return; }
  groupBusy.value = true;
  try {
    await api.post('/api/group/' + groupDetail.value.group._id + '/rename', { name: name });
    await fetchGroupDetail(groupDetail.value.group._id, true);
    await loadGroups();
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '修改失败');
  } finally {
    groupBusy.value = false;
  }
}

async function saveGroupNickname() {
  if (!groupDetail.value || groupBusy.value) return;
  groupBusy.value = true;
  try {
    const nickname = groupNickname.value.trim();
    await api.post('/api/group/' + groupDetail.value.group._id + '/nickname', { nickname: nickname });
    await fetchGroupDetail(groupDetail.value.group._id, true);
    await loadGroups();
    showPatLine(nickname ? '群昵称已更新' : '已恢复原昵称');
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '修改群昵称失败');
  } finally {
    groupBusy.value = false;
  }
}

async function saveGroupAnnouncement() {
  if (!groupDetail.value) return;
  const content = groupAnnouncement.value.trim();
  if (!content) return;
  groupBusy.value = true;
  try {
    await api.post('/api/group/' + groupDetail.value.group._id + '/announcement', { content: content });
    await fetchGroupDetail(groupDetail.value.group._id);
    await loadGroups();
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '发布公告失败');
  } finally {
    groupBusy.value = false;
  }
}

async function clearGroupAnnouncement() {
  if (!groupDetail.value || !groupDetail.value.group.announcement) return;
  if (!confirm('清除这条群公告？')) return;
  groupBusy.value = true;
  try {
    await api.post('/api/group/' + groupDetail.value.group._id + '/announcement', { content: '' });
    await fetchGroupDetail(groupDetail.value.group._id);
    await loadGroups();
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '清除公告失败');
  } finally {
    groupBusy.value = false;
  }
}
async function addGroupMembers() {
  if (!groupDetail.value || !groupAddPick.value.length) return;
  groupBusy.value = true;
  try {
    await api.post('/api/group/' + groupDetail.value.group._id + '/members', {
      members: groupAddPick.value
    });
    await fetchGroupDetail(groupDetail.value.group._id, true);
    await loadGroups();
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '添加失败');
  } finally {
    groupBusy.value = false;
  }
}
async function removeGroupMember(mem) {
  if (!groupDetail.value || !mem) return;
  if (!confirm('把 ' + mem.username + ' 移出群聊？')) return;
  groupBusy.value = true;
  try {
    await api.delete('/api/group/' + groupDetail.value.group._id + '/members/' + mem._id);
    await fetchGroupDetail(groupDetail.value.group._id, true);
    await loadGroups();
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '移出失败');
  } finally {
    groupBusy.value = false;
  }
}
async function leaveOrDisbandGroup(g, role) {
  if (!g) return;
  const owner = role === 'owner';
  if (!confirm(owner
    ? '解散群聊「' + g.name + '」？群消息会一起删除。'
    : '退出群聊「' + g.name + '」？')) return;
  groupBusy.value = true;
  try {
    await api.post('/api/group/' + g._id + (owner ? '/disband' : '/leave'));
    closeGroupPanel();
    ctx.value.show = false;
    if (current.value && current.value.isGroup && String(current.value._id) === String(g._id)) {
      closeChat();
    }
    await loadGroups();
    alert(owner ? '群聊已解散' : '已退出群聊');
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '操作失败');
  } finally {
    groupBusy.value = false;
  }
}
function leaveOrDisbandFromPanel() {
  if (!groupDetail.value) return;
  leaveOrDisbandGroup(groupDetail.value.group, groupDetail.value.group.myRole);
}
function leaveOrDisbandFromCtx() {
  const g = ctx.value.group;
  if (!g) return;
  leaveOrDisbandGroup(g, g.role);
}

async function clearChat() {
  const u = ctx.value.user;
  ctx.value.show = false;
  if (!u) return;
  if (!confirm('清空和 ' + u.username + ' 的聊天记录？只影响你自己。')) return;
  try {
    await api.post('/api/message/clear/' + u._id);
    const id = String(u._id);
    conversations.value = conversations.value.filter(function (c) { return String(c.user._id) !== id; });
    unread.value[id] = 0;
    if (current.value && String(current.value._id) === id) messages.value = [];
    try { localStorage.removeItem(draftKey(id)); } catch (e) {}
    await loadConversations();
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '清空失败');
  }
}
async function deleteFriend() {
  const u = ctx.value.user;
  ctx.value.show = false;
  if (!u) return;
  if (!confirm('删除好友 ' + u.username + '？删除后双方都不能再发消息，聊天记录会保留。')) return;
  try {
    await api.delete('/api/friend/' + u._id);
    const id = String(u._id);
    friends.value = friends.value.filter(function (f) { return String(f._id) !== id; });
    writeCache('friends', friends.value);
    if (current.value && String(current.value._id) === id) closeChat();
    await loadConversations();
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '删除失败');
  }
}

async function doSearch() {
  if (!q.value.trim()) { searchResults.value = []; return; }
  try {
    const { data } = await api.get('/api/user/search', { params: { q: q.value } });
    searchResults.value = data.users.filter(u => String(u._id) !== myId);
  } catch (e) { searchResults.value = []; }
}

async function addFriend(u) {
  try {
    await api.post('/api/friend/request', { to: u._id });
    u.relation = 'pending_out';
    alert(t('friendAdded'));
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '失败');
  }
}

async function openChat(u) {
  stopTitleFlash();
  closeSearch();
  const isGroup = !!u.isGroup;
  if (current.value && String(current.value._id) !== String(u._id)) {
    saveDraft(current.value._id);
  }
  const seq = ++chatSeq;
  current.value = u;
  replyTarget.value = null;
  patLine.value = { id: '', text: '' };
  groupEntryNotice.value = null;
  forwardOpen.value = false;
  forwardMsg.value = null;
  uiState.activeChatId = String(u._id);
  uiState.activeGroupId = isGroup ? String(u._id) : '';
  uiState.oldContext = false;
  try { draft.value = localStorage.getItem(draftKey(u._id)) || ''; } catch (e) { draft.value = ''; }
  chatLoading.value = true;
  messages.value = [];
  hasMoreHistory.value = false;
  loadingMore.value = false;
  hasNewer.value = false;
  suppressScrollLoad = true;
  unread.value[u._id] = 0;
  headMenu.value = false;
  emojiPanel.value = false;
  try {
    const url = isGroup ? '/api/group/' + u._id + '/messages' : '/api/message/history/' + u._id;
    const { data } = await api.get(url, { params: { limit: 50 } });
    if (seq !== chatSeq) return; // 已经切到别的会话，丢弃旧请求
    // 历史请求期间通过 Socket 收到的消息不能丢
    const incoming = messages.value.slice();
    const merged = (data.messages || []).slice();
    incoming.forEach(function (m) {
      const exists = merged.some(function (x) {
        return String(x._id) === String(m._id) || (m.msgId && x.msgId === m.msgId);
      });
      if (!exists) merged.push(m);
    });
    messages.value = merged;
    hasMoreHistory.value = !!data.hasMore;
  } catch (e) {
    if (seq !== chatSeq) return;
    messages.value = [];
    hasMoreHistory.value = false;
  } finally {
    if (seq === chatSeq) chatLoading.value = false;
  }
  if (seq !== chatSeq) return;
  if (isGroup) markGroupRead(u._id);
  else markRead(u._id);
  if (isGroup) {
    api.post('/api/group/' + u._id + '/enter').catch(function () {});
  }
  await nextTick();
  scrollBottomReady(seq);
}

async function openPendingChat() {
  const pending = uiState.pendingChat;
  if (!pending || !pending.id) return;
  uiState.pendingChat = null;
  const id = String(pending.id);
  if (pending.isGroup) {
    const group = groups.value.find(function (g) { return String(g._id) === id; });
    const target = group ? Object.assign({}, group, {
      isGroup: true,
      _id: id,
      username: group.name,
      memberCount: group.memberCount
    }) : {
      isGroup: true,
      _id: id,
      username: pending.name || '群聊',
      memberCount: 0
    };
    await openChat(target);
    return;
  }
  let target = friends.value.find(function (f) { return String(f._id) === id; });
  if (!target) {
    const conversation = conversations.value.find(function (c) { return String(c.user._id) === id; });
    if (conversation) target = conversation.user;
  }
  if (target) await openChat(target);
}

function closeChat() {
  chatSeq += 1;
  suppressScrollLoad = false;
  if (current.value) saveDraft(current.value._id);
  uiState.activeChatId = '';
  uiState.activeGroupId = '';
  uiState.oldContext = false;
  chatLoading.value = false;
  stopTyping();
  cleanupRecording();
  closeSearch();
  replyTarget.value = null;
  patLine.value = { id: '', text: '' };
  groupEntryNotice.value = null;
  if (groupEntryTimer) { clearTimeout(groupEntryTimer); groupEntryTimer = null; }
  current.value = null;
  messages.value = [];
  hasMoreHistory.value = false;
  loadingMore.value = false;
  hasNewer.value = false;
}

function scrollBottom() {
  if (msgBox.value) msgBox.value.scrollTop = msgBox.value.scrollHeight;
}

// 会话面板有 out-in 过渡，nextTick 时滚动容器可能还没挂载；等它出现再滚动
function scrollBottomReady(seq) {
  let tries = 0;
  const attempt = function () {
    if (seq !== chatSeq) return;
    if (!msgBox.value) {
      if (++tries <= 30) setTimeout(attempt, 50);
      else suppressScrollLoad = false;
      return;
    }
    scrollBottom();
    setTimeout(function () {
      if (seq !== chatSeq) return;
      scrollBottom();
      suppressScrollLoad = false;
    }, 60);
  };
  attempt();
}

async function loadMoreHistory() {
  if (!current.value || loadingMore.value || !hasMoreHistory.value || chatLoading.value || suppressScrollLoad) return;
  const peer = String(current.value._id);
  const seq = chatSeq;
  const oldest = messages.value.find(function (m) { return m && m.createdAt; });
  if (!oldest) { hasMoreHistory.value = false; return; }
  loadingMore.value = true;
  try {
    const url = current.value.isGroup
      ? '/api/group/' + peer + '/messages'
      : '/api/message/history/' + peer;
    const { data } = await api.get(url, {
      params: {
        before: new Date(oldest.createdAt).toISOString(),
        beforeId: oldest._id,
        limit: 50
      }
    });
    if (seq !== chatSeq) return;
    const existing = new Set(messages.value.map(function (x) { return String(x._id); }));
    const add = (data.messages || []).filter(function (x) { return !existing.has(String(x._id)); });
    const box = msgBox.value;
    const prevHeight = box ? box.scrollHeight : 0;
    const prevTop = box ? box.scrollTop : 0;
    if (add.length) messages.value = add.concat(messages.value);
    hasMoreHistory.value = !!data.hasMore && add.length > 0;
    await nextTick();
    if (box) box.scrollTop = box.scrollHeight - prevHeight + prevTop;
  } catch (e) {
    alert('加载更早消息失败');
  } finally {
    if (seq === chatSeq) loadingMore.value = false;
  }
}

function onMessagesScroll() {
  const box = msgBox.value;
  if (!box || suppressScrollLoad || chatLoading.value) return;
  if (box.scrollTop < 30 && hasMoreHistory.value && !loadingMore.value) {
    loadMoreHistory();
  }
}

async function backToLatest() {
  if (!current.value || chatLoading.value) return;
  const u = current.value;
  const seq = ++chatSeq;
  chatLoading.value = true;
  suppressScrollLoad = true;
  loadingMore.value = false;
  try {
    const url = u.isGroup ? '/api/group/' + u._id + '/messages' : '/api/message/history/' + u._id;
    const { data } = await api.get(url, { params: { limit: 50 } });
    if (seq !== chatSeq) return;
    messages.value = data.messages || [];
    hasMoreHistory.value = !!data.hasMore;
    hasNewer.value = false;
    uiState.oldContext = false;
    if (u.isGroup) markGroupRead(u._id);
    else markRead(u._id);
  } catch (e) {
    if (seq !== chatSeq) return;
    suppressScrollLoad = false;
    alert('加载最新消息失败');
    return;
  } finally {
    if (seq === chatSeq) chatLoading.value = false;
  }
  await nextTick();
  scrollBottomReady(seq);
}

function openSearch() {
  headMenu.value = false;
  if (!current.value) return;
  searchSeq += 1;
  searchOpen.value = true;
  searchQuery.value = '';
  searchResultsChat.value = [];
  searchDone.value = false;
  nextTick(function () { if (searchInput.value) searchInput.value.focus(); });
}
function closeSearch() {
  searchSeq += 1;
  searchOpen.value = false;
  searchQuery.value = '';
  searchResultsChat.value = [];
  searchDone.value = false;
  searching.value = false;
}
function onSearchEnter(e) {
  if (e && (e.isComposing || e.keyCode === 229)) return;
  searchMessages();
}
async function searchMessages() {
  const q = searchQuery.value.trim();
  if (!q || !current.value) return;
  const seq = ++searchSeq;
  searching.value = true;
  searchDone.value = false;
  try {
    const url = current.value.isGroup
      ? '/api/group/' + current.value._id + '/search'
      : '/api/message/search/' + current.value._id;
    const { data } = await api.get(url, { params: { q: q } });
    if (seq !== searchSeq) return;
    searchResultsChat.value = data.messages || [];
    searchDone.value = true;
  } catch (e) {
    if (seq !== searchSeq) return;
    searchResultsChat.value = [];
    searchDone.value = true;
    alert('搜索失败');
  } finally {
    if (seq === searchSeq) searching.value = false;
  }
}
async function jumpToMessage(m) {
  if (!current.value || !m) return;
  const peer = String(current.value._id);
  const targetId = String(m._id);
  const seq = chatSeq;
  const found = messages.value.some(function (x) { return String(x._id) === targetId; });
  // 关闭搜索栏会改变布局，先暂停滚动自动加载，避免跳转过程中把整段历史都拉下来
  suppressScrollLoad = true;
  closeSearch();
  if (found) {
    await scrollToMessage(targetId);
    setTimeout(function () {
      if (seq === chatSeq) suppressScrollLoad = false;
    }, 300);
    return;
  }
  try {
    const url = current.value.isGroup
      ? '/api/group/' + peer + '/messages'
      : '/api/message/history/' + peer;
    const { data } = await api.get(url, {
      params: { around: targetId, limit: 50 }
    });
    if (seq !== chatSeq) return;
    messages.value = data.messages || [];
    hasMoreHistory.value = !!data.hasMore;
    hasNewer.value = !!data.hasNewer;
    uiState.oldContext = !!data.hasNewer;
    await scrollToMessage(targetId);
    setTimeout(function () {
      if (seq === chatSeq) suppressScrollLoad = false;
    }, 300);
  } catch (e) {
    if (seq === chatSeq) suppressScrollLoad = false;
    alert((e.response && e.response.data && e.response.data.message) || '定位消息失败');
  }
}
async function scrollToMessage(id) {
  await nextTick();
  const box = msgBox.value;
  if (!box) return;
  const el = box.querySelector('[data-mid="' + String(id) + '"]');
  if (!el) return;
  const top = el.getBoundingClientRect().top - box.getBoundingClientRect().top +
    box.scrollTop - box.clientHeight / 2 + el.offsetHeight / 2;
  box.scrollTop = Math.max(0, top);
  el.classList.add('msg-hit');
  setTimeout(function () { el.classList.remove('msg-hit'); }, 2000);
}

function genId() {
  try { return crypto.randomUUID(); } catch (e) { return 'm' + Date.now() + Math.random().toString(16).slice(2); }
}

function sendPayload(payload) {
  if (!payload || (!payload.to && !payload.group)) return;
  const isGroup = !!payload.group;
  const targetId = isGroup ? String(payload.group) : String(payload.to);
  const visible = current.value &&
    String(current.value._id) === targetId &&
    !!current.value.isGroup === isGroup;
  if (visible && chatLoading.value) return;

  // 正在看搜索定位出来的旧上下文时发消息：先回到最新，再发送，
  // 否则新消息会接在旧上下文后面，中间缺一大段
  if (visible && hasNewer.value && !payload.__afterLatest) {
    const next = Object.assign({}, payload, { __afterLatest: true });
    backToLatest().then(function () {
      delete next.__afterLatest;
      sendPayload(next);
    });
    return;
  }

  const wire = Object.assign({}, payload);
  delete wire.__afterLatest;
  const msgId = wire.msgId;
  let optimisticReply = null;
  if (wire.replyToId) {
    const source = messages.value.find(function (x) { return String(x._id) === String(wire.replyToId); });
    if (source) optimisticReply = replySnapshot(source);
    else if (replyTarget.value && String(replyTarget.value.messageId) === String(wire.replyToId)) {
      optimisticReply = Object.assign({}, replyTarget.value);
    }
  }
  const optimistic = Object.assign({}, wire, {
    _id: 'tmp-' + msgId,
    from: myId,
    createdAt: new Date().toISOString(),
    read: false,
    recalled: false,
    expired: false,
    pending: true,
    replyTo: optimisticReply
  });
  if (isGroup) {
    optimistic.fromUser = {
      _id: myId,
      username: (store.user && store.user.username) || '',
      avatar: (store.user && store.user.avatar) || ''
    };
  }
  if (visible) {
    messages.value.push(optimistic);
    nextTick(scrollBottom);
  }

  const s = getSocket();
  const onFail = function () {
    const idx = messages.value.findIndex(x => x.msgId === msgId);
    if (idx >= 0) messages.value[idx] = Object.assign({}, messages.value[idx], { pending: false, failed: true });
  };
  if (s && s.connected) {
    s.emit(isGroup ? 'group-message' : 'message', wire);
  } else if (isGroup) {
    api.post('/api/group/' + targetId + '/send', wire)
      .then(({ data }) => replaceMessage(data.message))
      .catch(onFail);
  } else {
    api.post('/api/message/send', wire)
      .then(({ data }) => replaceMessage(data.message))
      .catch(onFail);
  }
}

function resend(m) {
  if (!m || !m.failed || !current.value) return;
  const isGroup = !!m.group;
  if (isGroup) {
    if (String(m.group) !== String(current.value._id) || !current.value.isGroup) return;
  } else if (String(m.to) !== String(current.value._id) || current.value.isGroup) {
    return;
  }
  const payload = isGroup ? {
    group: String(m.group),
    type: m.type || 'text',
    content: m.content || '',
    image: m.image || '',
    voice: m.voice || '',
    duration: Number(m.duration) || 0,
    replyToId: m.replyTo && m.replyTo.messageId ? String(m.replyTo.messageId) : '',
    forwarded: !!m.forwarded,
    msgId: m.msgId || genId()
  } : {
    to: String(m.to),
    type: m.type || 'text',
    content: m.content || '',
    image: m.image || '',
    voice: m.voice || '',
    duration: Number(m.duration) || 0,
    replyToId: m.replyTo && m.replyTo.messageId ? String(m.replyTo.messageId) : '',
    forwarded: !!m.forwarded,
    msgId: m.msgId || genId()
  };
  const idx = messages.value.findIndex(function (x) { return String(x._id) === String(m._id); });
  if (idx >= 0) messages.value.splice(idx, 1);
  sendPayload(payload);
}

function replaceMessage(m) {
  if (!m) return;
  const byId = messages.value.findIndex(x => String(x._id) === String(m._id));
  if (byId >= 0) { messages.value[byId] = m; return; }
  if (m.msgId) {
    const byMsg = messages.value.findIndex(x => x.msgId === m.msgId);
    if (byMsg >= 0) { messages.value[byMsg] = m; return; }
  }
  if (current.value) {
    const same = m.group
      ? current.value.isGroup && String(m.group) === String(current.value._id)
      : !current.value.isGroup &&
        (String(m.from) === String(current.value._id) || String(m.to) === String(current.value._id));
    if (same) messages.value.push(m);
  }
  if (m.group) refreshGroupsSoon();
  else refreshConversationsSoon();
}

function onEnter(e) {
  // 中文输入法选词时的回车不算发送；确认不是输入法后再阻止默认换行
  if (e && (e.isComposing || e.keyCode === 229)) return;
  if (e) e.preventDefault();
  sendText();
}

function sendText() {
  const text = draft.value.trim();
  if (!text || !current.value || chatLoading.value) return;
  const replyToId = replyTarget.value ? String(replyTarget.value.messageId) : '';
  draft.value = '';
  if (current.value) {
    try { localStorage.removeItem(draftKey(current.value._id)); } catch (e) {}
  }
  emojiPanel.value = false;
  stopTyping();
  if (current.value.isGroup) {
    const payload = { group: String(current.value._id), type: 'text', content: text, msgId: genId() };
    if (replyToId) payload.replyToId = replyToId;
    sendPayload(payload);
  } else {
    const payload = { to: current.value._id, type: 'text', content: text, msgId: genId() };
    if (replyToId) payload.replyToId = replyToId;
    sendPayload(payload);
  }
  replyTarget.value = null;
}

function pickImage() { if (fileInput.value) fileInput.value.click(); }
function pickSticker() { if (stickerInput.value) stickerInput.value.click(); }

async function onPickSticker(e) {
  const f = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!f) return;
  try {
    const data = await readImageFile(f, { maxSize: 512, quality: 0.86, maxBytes: 900 * 1024 });
    const next = customStickers.value.slice();
    next.unshift(data);
    customStickers.value = next.slice(0, 24);
    if (!persistStickers()) customStickers.value = next.slice(1, 25);
  } catch (err) {
    alert(err.message || '自定义表情读取失败');
  }
}

function sendSticker(data) {
  if (!data || !current.value || chatLoading.value) return;
  const replyToId = replyTarget.value ? String(replyTarget.value.messageId) : '';
  emojiPanel.value = false;
  const targetId = String(current.value._id);
  const payload = current.value.isGroup
    ? { group: targetId, type: 'sticker', sticker: data, msgId: genId() }
    : { to: targetId, type: 'sticker', sticker: data, msgId: genId() };
  if (replyToId) payload.replyToId = replyToId;
  sendPayload(payload);
  replyTarget.value = null;
}

function removeSticker(index) {
  if (!confirm('删除这个自定义表情？')) return;
  const next = customStickers.value.slice();
  next.splice(index, 1);
  const old = customStickers.value;
  customStickers.value = next;
  if (!persistStickers()) customStickers.value = old;
}

async function onPickImage(e) {
  const f = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!f || !current.value) return;
  const targetId = String(current.value._id); // 压缩期间可能切会话，先记住发给谁
  const isGroup = !!current.value.isGroup;
  const replyToId = replyTarget.value ? String(replyTarget.value.messageId) : '';
  try {
    const data = await readImageFile(f, { maxSize: 1600 });
    const payload = isGroup
      ? { group: targetId, type: 'image', image: data, msgId: genId() }
      : { to: targetId, type: 'image', image: data, msgId: genId() };
    if (replyToId) payload.replyToId = replyToId;
    sendPayload(payload);
    if (replyToId) replyTarget.value = null;
  } catch (err) {
    alert(err.message);
  }
}

function pickVipFile() {
  if (!canSendFiles.value) {
    alert('文件发送是黑金VIP专属功能，请联系管理员开通');
    return;
  }
  if (uploadingFile.value) return;
  if (vipFileInput.value) vipFileInput.value.click();
}

async function onPickVipFile(e) {
  const f = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!f || !current.value) return;
  if (!canSendFiles.value) {
    alert('文件发送是黑金VIP专属功能，请联系管理员开通');
    return;
  }
  if (f.size > 50 * 1024 * 1024) {
    alert('文件不能超过 50MB');
    return;
  }
  if (!f.size) {
    alert('不能发送空文件');
    return;
  }

  const targetId = String(current.value._id);
  const isGroup = !!current.value.isGroup;
  const replyToId = replyTarget.value ? String(replyTarget.value.messageId) : '';
  const msgId = genId();
  const form = new FormData();
  form.append('scope', isGroup ? 'group' : 'private');
  if (isGroup) form.append('group', targetId);
  else form.append('to', targetId);
  if (replyToId) form.append('replyToId', replyToId);
  form.append('msgId', msgId);
  form.append('file', f, f.name);

  uploadingFile.value = true;
  uploadingFileName.value = f.name;
  uploadPct.value = 0;
  try {
    const { data } = await api.post('/api/vip/files', form, {
      timeout: 120000,
      onUploadProgress: function (evt) {
        if (!evt || !evt.total) return;
        uploadPct.value = Math.min(99, Math.round((evt.loaded / evt.total) * 100));
      }
    });
    uploadPct.value = 100;
    if (data && data.message) {
      replaceMessage(data.message);
      nextTick(scrollBottom);
      showPatLine('文件已发送，VIP 存储有效期 7 天');
    }
    if (replyToId) replyTarget.value = null;
  } catch (err) {
    alert(await apiErrorMessage(err, '文件发送失败'));
  } finally {
    uploadingFile.value = false;
    uploadingFileName.value = '';
    uploadPct.value = 0;
  }
}

function formatFileSize(size) {
  const n = Number(size) || 0;
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(n < 10 * 1024 ? 1 : 0) + ' KB';
  return (n / 1024 / 1024).toFixed(n < 10 * 1024 * 1024 ? 1 : 0) + ' MB';
}

function formatFileDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
  } catch (e) { return ''; }
}

function fileExt(name) {
  const s = String(name || '');
  const idx = s.lastIndexOf('.');
  if (idx < 0 || idx === s.length - 1) return 'FILE';
  return s.slice(idx + 1).replace(/[^a-z0-9]/gi, '').slice(0, 5).toUpperCase() || 'FILE';
}

async function apiErrorMessage(err, fallback) {
  const data = err && err.response && err.response.data;
  if (data && typeof data.text === 'function') {
    try {
      const text = await data.text();
      const parsed = JSON.parse(text);
      if (parsed && parsed.message) return parsed.message;
    } catch (e) {}
  }
  return (data && data.message) || (err && err.message) || fallback;
}

async function downloadVipFile(m) {
  if (!m || !m.file || !m.file.id) {
    alert('文件不存在或已过期');
    return;
  }
  if (m.file.expired) {
    alert('文件已过期，已转入备份归档');
    return;
  }
  if (downloadingFileId.value) return;
  downloadingFileId.value = String(m.file.id);
  try {
    const res = await api.get('/api/vip/files/' + String(m.file.id) + '/download', {
      responseType: 'blob',
      timeout: 120000
    });
    const blob = res.data;
    if (!blob || !blob.size) throw new Error('文件下载失败');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = String(m.file.name || '文件').replace(/[\\/:*?"<>|]/g, '_');
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
  } catch (err) {
    alert(await apiErrorMessage(err, '文件下载失败'));
  } finally {
    downloadingFileId.value = '';
  }
}

function addEmoji(e) {
  draft.value += e;
  if (current.value) saveDraft(current.value._id);
  nextTick(() => { if (inputEl.value) inputEl.value.focus(); });
}

// ===== 正在输入 =====
let typingTimer = null;
let typingSentAt = 0;
let typingTarget = null;

function emitTyping(on) {
  const s = getSocket();
  if (!s || !s.connected || !current.value || current.value.isGroup) return;
  s.emit('typing', { to: current.value._id, typing: on });
}
function onDraftInput() {
  if (!current.value) return;
  saveDraft(current.value._id);
  if (current.value.isGroup) return;
  const now = Date.now();
  if (now - typingSentAt > 1200) {
    emitTyping(true);
    typingSentAt = now;
  }
  typingTarget = current.value._id;
  clearTimeout(typingTimer);
  typingTimer = setTimeout(stopTyping, 1500);
}
function stopTyping() {
  clearTimeout(typingTimer);
  typingTimer = null;
  typingSentAt = 0;
  if (typingTarget) {
    const s = getSocket();
    if (s && s.connected) s.emit('typing', { to: typingTarget, typing: false });
    typingTarget = null;
  }
}

// ===== 已读 =====
function markRead(userId) {
  const s = getSocket();
  if (s && s.connected) s.emit('read', { to: userId });
  else api.post('/api/message/read/' + userId).catch(() => {});
}
function markGroupRead(groupId) {
  const id = String(groupId);
  unread.value[id] = 0;
  const s = getSocket();
  if (s && s.connected) s.emit('group-read', { group: id });
  else api.post('/api/group/' + id + '/read').catch(() => {});
}

// ===== 撤回 =====
function canRecall(m) {
  // 不在前端用本机时间判断 2 分钟：手机时间有偏差时，刚发的消息也会被误判超时。
  // 这里始终提供撤回入口，是否超过 2 分钟由后端按服务器时间判断。
  return !!m && String(m.from) === myId && !m.recalled && !m.pending && !m.failed;
}
function canCopy(m) {
  return m && !m.recalled && m.type === 'text' && m.content;
}
function canViewImage(m) {
  return !!m && !m.recalled && m.type === 'image' && !!m.image;
}
function canSaveImage(m) {
  return canViewImage(m);
}
function canPlayVoice(m) {
  return !!m && !m.recalled && m.type === 'voice' && !!m.voice && !m.expired;
}
function canSaveVoice(m) {
  return canPlayVoice(m);
}
function canReply(m) {
  return !!m && !m.recalled && !m.pending && !m.failed;
}
function canForward(m) {
  return canReply(m) && ['text', 'image', 'sticker', 'voice'].includes(m.type || 'text') &&
    !(m.type === 'voice' && m.expired);
}
function canFavorite(m) {
  return canForward(m) && ['text', 'image', 'sticker', 'voice'].includes(m.type || 'text');
}
function canPatMsg(m) {
  return !!m && !m.recalled && !m.pending && String(m.from) !== String(myId);
}
function hasMenuAction(m) {
  return canReply(m) || canForward(m) || canFavorite(m) || canPatMsg(m) ||
    canCopy(m) || canRecall(m) || canViewImage(m) || canPlayVoice(m);
}
function startReply(m) {
  if (!canReply(m)) return;
  replyTarget.value = replySnapshot(m);
  emojiPanel.value = false;
  nextTick(function () { if (inputEl.value) inputEl.value.focus(); });
}
function replyFromMenu() {
  const m = msgCtx.value.msg;
  msgCtx.value.show = false;
  startReply(m);
}
function openForward(m) {
  if (!canForward(m)) return;
  forwardMsg.value = m;
  forwardQuery.value = '';
  forwardOpen.value = true;
}
function forwardFromMenu() {
  const m = msgCtx.value.msg;
  msgCtx.value.show = false;
  openForward(m);
}
function closeForward(force) {
  if (forwarding.value && !force) return;
  forwardOpen.value = false;
  forwardMsg.value = null;
  forwardQuery.value = '';
}
async function forwardTo(target) {
  if (!target || !forwardMsg.value || forwarding.value) return;
  const source = forwardMsg.value;
  if (!canForward(source)) { alert('这条消息不能转发'); return; }
  const body = {
    type: source.type || 'text',
    content: source.content || '',
    image: source.image || '',
    sticker: source.sticker || '',
    voice: source.voice || '',
    duration: Number(source.duration) || 0,
    forwarded: true,
    msgId: genId()
  };
  if (target.isGroup) body.group = String(target.id);
  else body.to = String(target.id);
  forwarding.value = true;
  try {
    const url = target.isGroup ? '/api/group/' + target.id + '/send' : '/api/message/send';
    const { data } = await api.post(url, body);
    if (data && data.message) replaceMessage(data.message);
    closeForward(true);
    showPatLine('已转发给 ' + target.name);
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '转发失败');
  } finally {
    forwarding.value = false;
  }
}
async function favoriteMessage(m) {
  if (!canFavorite(m)) { alert('这条消息不能收藏'); return; }
  try {
    const body = { messageId: String(m._id) };
    if (m.group) body.groupId = String(m.group);
    await api.post('/api/favorite', body);
    showPatLine('已收藏，可在“收藏”里查看');
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '收藏失败');
  }
}
function favoriteFromMenu() {
  const m = msgCtx.value.msg;
  msgCtx.value.show = false;
  favoriteMessage(m);
}
function patFromMenu() {
  const m = msgCtx.value.msg;
  msgCtx.value.show = false;
  patMessage(m);
}
function recallMsg() {
  const m = msgCtx.value.msg;
  msgCtx.value.show = false;
  if (!m || !current.value) return;
  // 撤回统一走 HTTP：手机端 Socket 可能断开或处于半连接状态，
  // 只发 Socket 会出现“服务器撤回了但界面没反应”
  const url = m.group
    ? '/api/group/' + String(m.group) + '/recall/' + String(m._id)
    : '/api/message/' + String(m._id) + '/recall';
  api.post(url).then(function () {
    applyRecall({ id: String(m._id) });
  }).catch(err => {
    alert((err.response && err.response.data && err.response.data.message) || '撤回失败');
  });
}
function applyRecall(evt) {
  const id = evt && evt.id ? String(evt.id) : '';
  if (!id) return;
  if (replyTarget.value && String(replyTarget.value.messageId) === id) replyTarget.value = null;
  const idx = messages.value.findIndex(x => String(x._id) === id);
  if (idx >= 0) {
    messages.value[idx] = Object.assign({}, messages.value[idx], {
      recalled: true, content: '', image: '', voice: '', duration: 0, file: null
    });
    if (messages.value[idx].group) refreshGroupsSoon();
    else refreshConversationsSoon();
  }
}
function copyMsg() {
  const text = msgCtx.value.msg && msgCtx.value.msg.content;
  msgCtx.value.show = false;
  if (!text) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
}
function viewImage() {
  const m = msgCtx.value.msg;
  msgCtx.value.show = false;
  if (m && m.image) previewImg.value = m.image;
}
function playVoiceFromMenu() {
  const m = msgCtx.value.msg;
  msgCtx.value.show = false;
  if (m) playVoice(m);
}
function downloadDataUrl(data, name) {
  try {
    const s = String(data);
    const mimeEnd = s.indexOf(';');
    const mime = mimeEnd > 5 ? s.slice(5, mimeEnd) : '';
    const extMap = {
      'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp',
      'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a',
      'audio/mpeg': 'mp3', 'audio/wav': 'wav'
    };
    const a = document.createElement('a');
    a.href = s;
    a.download = name + '.' + (extMap[mime] || 'bin');
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (e) {
    alert('保存失败');
  }
}
function saveImage() {
  const m = msgCtx.value.msg;
  msgCtx.value.show = false;
  if (m && m.image) downloadDataUrl(m.image, '巨信图片-' + Date.now());
}
function saveVoice() {
  const m = msgCtx.value.msg;
  msgCtx.value.show = false;
  if (m && m.voice) downloadDataUrl(m.voice, '巨信语音-' + Date.now());
}

// ===== 长按 / 右键 =====
let pressTimer = null;
let pressStartX = 0;
let pressStartY = 0;
function startPress(e, m) {
  cancelPress();
  const touch = e.touches && e.touches[0] ? e.touches[0] : e;
  pressStartX = touch.clientX;
  pressStartY = touch.clientY;
  pressTimer = setTimeout(function () {
    openMsgMenuAt(touch.clientX, touch.clientY, m);
  }, 500);
}
function onPressMove(e) {
  if (!pressTimer) return;
  const touch = e.touches && e.touches[0] ? e.touches[0] : e;
  if (Math.abs(touch.clientX - pressStartX) > 10 || Math.abs(touch.clientY - pressStartY) > 10) {
    cancelPress();
  }
}
function cancelPress() {
  if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
}
function openMsgMenu(e, m) {
  openMsgMenuAt(e.clientX, e.clientY, m);
}
function openMsgMenuFromButton(e, m) {
  // 右键被浏览器/插件拦截时的备用入口：点消息旁边的“⋯”打开同一菜单
  const r = e.currentTarget.getBoundingClientRect();
  openMsgMenuAt(r.left, r.bottom + 4, m);
}
let menuOpenedAt = 0;
function openMsgMenuAt(x, y, m) {
  if (!m || m.pending) return;
  // 文字给复制，图片给查看/保存，语音给播放/保存，自己的消息再加撤回；
  // 不再整体返回，否则右键图片/语音会完全没有反应
  if (!hasMenuAction(m)) return;
  const maxX = Math.max(8, window.innerWidth - 150);
  const maxY = Math.max(8, window.innerHeight - 360);
  msgCtx.value = { show: true, x: Math.min(x, maxX), y: Math.min(y, maxY), msg: m };
  menuOpenedAt = Date.now();
}

// ===== 语音录制 =====
let mediaRecorder = null;
let recStream = null;
let recChunks = [];
let recStartAt = 0;
let recTimer = null;
let recStartY = 0;
let recTarget = null;
let lastDuration = 0;
let recCancelledFlag = false;
let recAbort = false;
let recStarting = false;

async function startRecording(e) {
  if (!current.value || recording.value || recStarting) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert('当前浏览器不支持录音');
    return;
  }
  recStarting = true;
  recAbort = false;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (recAbort) {
      stream.getTracks().forEach(function (tr) { tr.stop(); });
      return;
    }
    recStream = stream;
    recChunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = function (ev) { if (ev.data && ev.data.size) recChunks.push(ev.data); };
    mediaRecorder.onstop = onRecStop;
    mediaRecorder.start();
    recording.value = true;
    recCancelled.value = false;
    recCancelledFlag = false;
    recSeconds.value = 0;
    recStartAt = Date.now();
    recTarget = {
      id: String(current.value._id),
      isGroup: !!current.value.isGroup,
      replyToId: replyTarget.value ? String(replyTarget.value.messageId) : ''
    };
    const pos = e.touches && e.touches[0] ? e.touches[0] : e;
    recStartY = pos.clientY;
    recTimer = setInterval(function () {
      recSeconds.value = Math.floor((Date.now() - recStartAt) / 1000);
      if (recSeconds.value >= 60) stopRecording();
    }, 200);
  } catch (err) {
    if (recStream) {
      recStream.getTracks().forEach(function (tr) { tr.stop(); });
      recStream = null;
    }
    alert('无法使用麦克风：' + err.message);
  } finally {
    recStarting = false;
  }
}

function onRecMove(e) {
  if (!recording.value) return;
  const pos = e.touches && e.touches[0] ? e.touches[0] : e;
  if (recStartY - pos.clientY > 60) {
    recCancelledFlag = true;
    recCancelled.value = true;
  }
}

function stopRecording() {
  if (!recording.value) { recAbort = true; return; }
  recording.value = false;
  clearInterval(recTimer);
  recTimer = null;
  recSeconds.value = Math.floor((Date.now() - recStartAt) / 1000);
  lastDuration = Math.max(1, Math.round((Date.now() - recStartAt) / 1000));
  try { mediaRecorder.stop(); } catch (e) {}
  if (recStream) recStream.getTracks().forEach(function (tr) { tr.stop(); });
  recStream = null;
  mediaRecorder = null;
}

function onRecStop() {
  const cancelled = recCancelledFlag;
  const dur = lastDuration;
  const target = recTarget;
  const chunks = recChunks;
  recChunks = [];
  recCancelled.value = false;
  recCancelledFlag = false;
  recTarget = null;
  if (cancelled || !chunks.length || !target) return;
  const blob = new Blob(chunks, { type: chunks[0].type || 'audio/webm' });
  if (blob.size > 8 * 1024 * 1024) { alert('语音太大，请缩短录音'); return; }
  const reader = new FileReader();
  reader.onload = function () {
    const payload = target.isGroup
      ? { group: target.id, type: 'voice', voice: reader.result, duration: dur, msgId: genId() }
      : { to: target.id, type: 'voice', voice: reader.result, duration: dur, msgId: genId() };
    if (target.replyToId) payload.replyToId = target.replyToId;
    sendPayload(payload);
    if (target.replyToId) replyTarget.value = null;
  };
  reader.readAsDataURL(blob);
}

function cleanupRecording() {
  recAbort = true;
  recCancelledFlag = true;
  recording.value = false;
  recCancelled.value = false;
  if (recTimer) { clearInterval(recTimer); recTimer = null; }
  try {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
  } catch (e) {}
  if (recStream) {
    recStream.getTracks().forEach(function (tr) { tr.stop(); });
    recStream = null;
  }
  mediaRecorder = null;
  recChunks = [];
}

function playVoice(m) {
  if (!m.voice || m.expired) return;
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  if (playingId.value === m._id) { playingId.value = ''; return; }
  try {
    const audio = new Audio(m.voice);
    currentAudio = audio;
    audio.onended = function () {
      if (currentAudio === audio) { playingId.value = ''; currentAudio = null; }
    };
    audio.play().then(function () { playingId.value = m._id; }).catch(function () { alert('播放失败'); });
  } catch (e) { alert('播放失败'); }
}

// ===== 头像与名字 =====
function userOf(m) {
  // 群消息带着发送者资料；私聊自己没有 fromUser，退回本地用户
  if (m.fromUser) return m.fromUser;
  if (String(m.from) === myId) return store.user || {};
  const fromId = String(m.from);
  if (current.value && !current.value.isGroup && String(current.value._id) === fromId) return current.value;
  return {};
}
function avatarOf(m) { return userOf(m).avatar || ''; }
function displayName(user) {
  if (!user) return '';
  return user.remark || user.username || user.name || '';
}
function nameOf(m) {
  const user = userOf(m);
  return user.nickname || displayName(user);
}
function vipBadge() {
  return [{ kind: 'vip', name: '黑金VIP', style: 'vip' }];
}
function userBadges(user) {
  if (!user) return [];
  if (Array.isArray(user.badges) && user.badges.length) return user.badges;
  return user.vipActive ? vipBadge() : [];
}
function messageBadges(m) {
  if (!m) return [];
  if (Array.isArray(m.badges) && m.badges.length) return m.badges;
  if (m.fromUser && Array.isArray(m.fromUser.badges) && m.fromUser.badges.length) return m.fromUser.badges;
  return m.vip ? vipBadge() : [];
}
function bubbleBadges(m) {
  if (current.value && current.value.isGroup && String(m.from) !== myId) return [];
  return messageBadges(m);
}
function replyPreview(reply) {
  if (!reply) return '';
  if (reply.type === 'image') return reply.preview || '[图片]';
  if (reply.type === 'sticker') return reply.preview || '[表情]';
  if (reply.type === 'voice') return reply.preview || '[语音]';
  if (reply.type === 'file') return reply.preview || '[文件]';
  return String(reply.preview || reply.content || '').slice(0, 120);
}
function replySnapshot(m) {
  if (!m) return null;
  return {
    messageId: String(m._id),
    fromName: String(m.from) === myId ? '我' : (nameOf(m) || displayName(current.value)),
    type: m.type || 'text',
    preview: m.type === 'image' ? '[图片]' : m.type === 'sticker' ? '[表情]' : m.type === 'voice' ? '[语音]' :
      m.type === 'file' ? '[文件] ' + ((m.file && m.file.name) || '') : String(m.content || '').slice(0, 120)
  };
}
function isOnlineId(id) {
  return onlineReady.value && onlineIds.value.includes(String(id));
}
function isLastMine(m) {
  for (let i = messages.value.length - 1; i >= 0; i--) {
    if (String(messages.value[i].from) === myId) {
      return String(messages.value[i]._id) === String(m._id);
    }
  }
  return false;
}
function openProfile(m) {
  if (String(m.from) === myId) { router.push('/profile/' + myId); return; }
  router.push('/profile/' + String(m.from));
}
function onAvatarClick(m) {
  if (avatarClickTimer) {
    clearTimeout(avatarClickTimer);
    avatarClickTimer = null;
    patMessage(m);
    return;
  }
  avatarClickTimer = setTimeout(function () {
    avatarClickTimer = null;
    openProfile(m);
  }, 240);
}
function showPatLine(text) {
  if (!text) return;
  if (patLineTimer) clearTimeout(patLineTimer);
  patLine.value = { id: 'pat-' + Date.now(), text: text };
  patLineTimer = setTimeout(function () {
    patLine.value = { id: '', text: '' };
    patLineTimer = null;
  }, 3200);
}
function patMessage(m) {
  if (!m || String(m.from) === myId) return;
  patUser(m.from, !!m.group);
}
function patUser(userId, isGroup) {
  if (!current.value || !userId) return;
  if (String(userId) === String(myId)) { alert('不能拍自己'); return; }
  const now = Date.now();
  if (now - lastPatAt < 1200) return;
  const s = getSocket();
  if (!s || !s.connected) { alert('连接已断开，请稍后再试'); return; }
  lastPatAt = now;
  const data = { to: String(userId) };
  if (isGroup) data.group = String(current.value._id);
  s.emit('pat', data);
}
function onPatReceived(event) {
  if (!event || !current.value) return;
  if (event.group) {
    if (!current.value.isGroup || String(current.value._id) !== String(event.group)) return;
    showPatLine(event.text);
    return;
  }
  if (current.value.isGroup) return;
  const me = String(myId);
  const other = String(current.value._id);
  const fromMe = String(event.from) === me && String(event.to) === other;
  const toMe = String(event.from) === other && String(event.to) === me;
  if (!fromMe && !toMe) return;
  showPatLine(fromMe ? '你拍了拍 ' + displayName(current.value) : displayName(current.value) + ' 拍了拍你');
}
function onPatError(err) {
  alert((err && err.message) || '拍一拍失败');
}

// ===== 列表右键菜单（拉黑/封禁） =====
function showCtxMenu(e, item) {
  const maxX = Math.max(8, window.innerWidth - 160);
  const maxY = Math.max(8, window.innerHeight - 260);
  const u = item && item.user ? item.user : item;
  const group = item && item.isGroup ? item.group : null;
  ctx.value = { show: true, x: Math.min(e.clientX, maxX), y: Math.min(e.clientY, maxY), user: u, group: group };
  showBanSub.value = false;
  banPick.value = 24 * 7;
}
async function doBlock() {
  const u = ctx.value.user;
  ctx.value.show = false;
  if (!u) return;
  if (!confirm(t('block') + ' ' + u.username + ' ?')) return;
  try {
    await api.post('/api/friend/block', { id: u._id });
    const blockedId = String(u._id);
    friends.value = friends.value.filter(function (f) { return String(f._id) !== blockedId; });
    conversations.value = conversations.value.filter(function (c) { return String(c.user._id) !== blockedId; });
    if (current.value && String(current.value._id) === blockedId) closeChat();
    alert(t('blocked'));
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '拉黑失败');
  }
}
function blockCurrent() {
  headMenu.value = false;
  if (!current.value) return;
  if (!confirm(t('block') + ' ' + current.value.username + ' ?')) return;
  const blockedId = String(current.value._id);
  api.post('/api/friend/block', { id: current.value._id }).then(function () {
    alert(t('blocked'));
    friends.value = friends.value.filter(function (f) { return String(f._id) !== blockedId; });
    conversations.value = conversations.value.filter(function (c) { return String(c.user._id) !== blockedId; });
    closeChat();
  }).catch(function (e) {
    alert((e.response && e.response.data && e.response.data.message) || '拉黑失败');
  });
}
function openBanSub() {
  if (banTimer) { clearTimeout(banTimer); banTimer = null; }
  showBanSub.value = true;
}
function closeBanSubDelay() {
  if (banTimer) clearTimeout(banTimer);
  banTimer = setTimeout(function () { showBanSub.value = false; }, 250);
}
function cancelCloseBanSub() {
  if (banTimer) { clearTimeout(banTimer); banTimer = null; }
}
async function confirmBan() {
  const u = ctx.value.user;
  const hours = banPick.value;
  ctx.value.show = false;
  showBanSub.value = false;
  if (!u) return;
  const found = banOptions.find(o => o.hours === hours);
  const label = found ? found.label : (hours + ' 小时');
  if (!confirm('封禁 ' + u.username + ' ' + label + '？')) return;
  try {
    await api.post('/api/admin/ban', { id: u._id, hours });
    alert('已封禁');
  } catch (e) {
    alert((e.response && e.response.data && e.response.data.message) || '封禁失败');
  }
}

// ===== Socket 事件 =====
function onSocketMessage(m) {
  const fromMe = String(m.from) === myId;
  const otherId = fromMe ? String(m.to) : String(m.from);

  if (current.value && String(current.value._id) === otherId) {
    let shown = false;
    const idxById = messages.value.findIndex(x => String(x._id) === String(m._id));
    if (idxById >= 0) {
      messages.value[idxById] = m;
      shown = true;
    } else if (m.msgId) {
      const idx = messages.value.findIndex(x => x.msgId === m.msgId);
      if (idx >= 0) {
        messages.value[idx] = m;
        shown = true;
      }
    }
    // 正在看搜索定位出来的旧消息时，不把新消息插到旧上下文后面，
    // 也不标已读；用户点“回到最新消息”后再一起看到
    if (!shown && !hasNewer.value) {
      messages.value.push(m);
      shown = true;
      nextTick(scrollBottom);
    }
    if (shown && !fromMe) markRead(otherId);
  } else if (!fromMe) {
    unread.value[otherId] = (unread.value[otherId] || 0) + 1;
  }
  // 无论在哪个会话，都刷新左侧最后一条和时间（当前会话之前不会更新）
  refreshConversationsSoon();
}

function onGroupMessage(m) {
  if (!m || !m.group || !m.from) return;
  const gid = String(m.group);
  const fromMe = String(m.from) === myId;
  const viewing = current.value && current.value.isGroup && String(current.value._id) === gid;
  if (viewing) {
    let shown = false;
    let added = false;
    const idxById = messages.value.findIndex(x => String(x._id) === String(m._id));
    if (idxById >= 0) {
      messages.value[idxById] = m;
      shown = true;
    } else if (m.msgId) {
      const idx = messages.value.findIndex(x => x.msgId === m.msgId);
      if (idx >= 0) {
        messages.value[idx] = m;
        shown = true;
      }
    }
    if (!shown && !hasNewer.value) {
      messages.value.push(m);
      shown = true;
      added = true;
    }
    if (shown && !fromMe) markGroupRead(gid);
    if (added && !fromMe) nextTick(scrollBottom);
  } else if (!fromMe) {
    unread.value[gid] = (unread.value[gid] || 0) + 1;
  }
  refreshGroupsSoon();
}

function onGroupEntry(e) {
  if (!e || !e.groupId || !e.user) return;
  if (!current.value || !current.value.isGroup || String(current.value._id) !== String(e.groupId)) return;
  groupEntryNotice.value = e;
  if (groupEntryTimer) clearTimeout(groupEntryTimer);
  groupEntryTimer = setTimeout(function () {
    groupEntryNotice.value = null;
    groupEntryTimer = null;
  }, 6000);
}

function onGroupCreated() {
  loadGroups();
}
function onGroupUpdated(d) {
  loadGroups();
  if (groupPanelOpen.value && groupDetail.value &&
      (!d || !d.groupId || String(d.groupId) === String(groupDetail.value.group._id))) {
    fetchGroupDetail(groupDetail.value.group._id, true).catch(function () {});
  }
}
function onGroupRemoved(d) {
  const gid = d && d.groupId ? String(d.groupId) : '';
  if (gid && current.value && current.value.isGroup && String(current.value._id) === gid) closeChat();
  if (gid && groupPanelOpen.value && groupDetail.value && String(groupDetail.value.group._id) === gid) {
    closeGroupPanel();
  }
  loadGroups();
  alert('你已被移出群聊' + (d && d.name ? '「' + d.name + '」' : ''));
}
function onGroupDisbanded(d) {
  const gid = d && d.groupId ? String(d.groupId) : '';
  if (gid && current.value && current.value.isGroup && String(current.value._id) === gid) closeChat();
  if (gid && groupPanelOpen.value && groupDetail.value && String(groupDetail.value.group._id) === gid) {
    closeGroupPanel();
  }
  loadGroups();
  alert('群聊已解散' + (d && d.name ? '「' + d.name + '」' : ''));
}
function onGroupRecall(d) {
  applyRecall(d);
}

function onSocketError(err) {
  const msgId = err && err.msgId;
  if (msgId) {
    const idx = messages.value.findIndex(x => x.msgId === msgId);
    if (idx >= 0) messages.value[idx] = Object.assign({}, messages.value[idx], { pending: false, failed: true });
    // 发送失败直接显示“点击重发”，不再额外弹窗
    return;
  }
  alert((err && err.message) || '消息发送失败');
}

const typingClearTimers = {};
function onTyping(d) {
  if (!d || !d.from) return;
  const id = String(d.from);
  if (typingClearTimers[id]) { clearTimeout(typingClearTimers[id]); typingClearTimers[id] = null; }
  typingMap.value = Object.assign({}, typingMap.value, { [id]: !!d.typing });
  if (d.typing) {
    typingClearTimers[id] = setTimeout(function () {
      typingMap.value = Object.assign({}, typingMap.value, { [id]: false });
    }, 3000);
  }
}
function onRead(d) {
  if (!d || !d.by || !current.value || String(d.by) !== String(current.value._id)) return;
  // 只把对方“已读”之前发出的消息标成已读，避免把刚发出去的新消息误标
  const cutoff = d.at ? Number(d.at) : Date.now();
  messages.value = messages.value.map(function (m) {
    if (String(m.from) !== myId) return m;
    const ts = new Date(m.createdAt).getTime();
    if (!isNaN(ts) && ts > cutoff) return m;
    return Object.assign({}, m, { read: true });
  });
}
function onRecall(d) { applyRecall(d); }
function onFriendAccepted() {
  // 对方同意好友申请后，自己的聊天列表要立刻出现这个人
  loadFriends();
}
function onFriendDeleted(d) {
  loadFriends();
  loadConversations();
  if (d && d.by && current.value && String(current.value._id) === String(d.by)) {
    alert('对方已经把你删除，聊天记录仍保留，但不能再发消息');
  }
}
function onOnline(ids) {
  onlineIds.value = ids;
  onlineReady.value = true;
  onlineFromSocket = true;
}


function onGlobalClick() {
  if (Date.now() - menuOpenedAt < 300) return;
  ctx.value.show = false;
  msgCtx.value.show = false;
  showBanSub.value = false;
}

let disposed = false;
onMounted(() => {
  const cachedFriends = readCache('friends');
  const cachedConvs = readCache('convs');
  const cachedGroups = readCache('groups');
  const cachedSettings = readCache('settings');
  if (cachedFriends) friends.value = cachedFriends;
  if (cachedConvs) conversations.value = cachedConvs;
  if (cachedGroups) {
    groups.value = cachedGroups;
    updateMutedGroups();
  }
  if (cachedSettings) {
    settings.value = cachedSettings;
    uiState.mutedPeerIds = Object.keys(cachedSettings)
      .filter(function (id) { return cachedSettings[id].muted; });
  }

  // 先同步把 Socket 和监听器接好，再异步拉数据；避免这个窗口期丢消息
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const s = getSocket() || (token ? connectSocket(token) : null);
  if (s) {
    s.on('message', onSocketMessage);
    s.on('online', onOnline);
    s.on('message-error', onSocketError);
    s.on('typing', onTyping);
    s.on('message-read', onRead);
    s.on('message-recall', onRecall);
    s.on('pat-received', onPatReceived);
    s.on('pat-error', onPatError);
    s.on('friend-accepted', onFriendAccepted);
    s.on('friend-deleted', onFriendDeleted);
    s.on('group-message', onGroupMessage);
    s.on('group-error', onSocketError);
    s.on('group-created', onGroupCreated);
    s.on('group-updated', onGroupUpdated);
    s.on('group-removed', onGroupRemoved);
    s.on('group-disbanded', onGroupDisbanded);
    s.on('group-recall', onGroupRecall);
    s.on('group-entry', onGroupEntry);
  }
  window.addEventListener('click', onGlobalClick);
  document.addEventListener('mouseup', stopRecording);
  document.addEventListener('touchend', stopRecording);
  document.addEventListener('mousemove', onRecMove);
  document.addEventListener('touchmove', onRecMove, { passive: true });

  Promise.all([
    loadConversations().catch(function () { return null; }),
    loadFriends().catch(function () { return null; }),
    loadGroups().catch(function () { return null; }),
    loadSettings().catch(function () { return null; })
  ]).then(function () { openPendingChat(); });
  api.get('/api/user/online').then(function (res) {
    if (disposed) return;
    // Socket 已经推过在线列表时，不再用可能更旧的 HTTP 结果覆盖
    if (!onlineFromSocket) {
      onlineIds.value = (res.data.users || []).map(function (u) { return String(u._id); });
    }
    onlineReady.value = true;
  }).catch(function () {
    if (!disposed) onlineReady.value = true;
  });
});

onBeforeUnmount(() => {
  disposed = true;
  uiState.activeChatId = '';
  uiState.activeGroupId = '';
  uiState.oldContext = false;
  stopTitleFlash();
  const s = getSocket();
  if (s) {
    s.off('message', onSocketMessage);
    s.off('online', onOnline);
    s.off('message-error', onSocketError);
    s.off('typing', onTyping);
    s.off('message-read', onRead);
    s.off('message-recall', onRecall);
    s.off('pat-received', onPatReceived);
    s.off('pat-error', onPatError);
    s.off('friend-accepted', onFriendAccepted);
    s.off('friend-deleted', onFriendDeleted);
    s.off('group-message', onGroupMessage);
    s.off('group-error', onSocketError);
    s.off('group-created', onGroupCreated);
    s.off('group-updated', onGroupUpdated);
    s.off('group-removed', onGroupRemoved);
    s.off('group-disbanded', onGroupDisbanded);
    s.off('group-recall', onGroupRecall);
    s.off('group-entry', onGroupEntry);
  }
  window.removeEventListener('click', onGlobalClick);
  document.removeEventListener('mouseup', stopRecording);
  document.removeEventListener('touchend', stopRecording);
  document.removeEventListener('mousemove', onRecMove);
  document.removeEventListener('touchmove', onRecMove);
  if (banTimer) clearTimeout(banTimer);
  if (groupEntryTimer) { clearTimeout(groupEntryTimer); groupEntryTimer = null; }
  if (patLineTimer) clearTimeout(patLineTimer);
  if (avatarClickTimer) clearTimeout(avatarClickTimer);
  clearTimeout(typingTimer);
  clearTimeout(pressTimer);
  if (convReloadTimer) { clearTimeout(convReloadTimer); convReloadTimer = null; }
  if (groupReloadTimer) { clearTimeout(groupReloadTimer); groupReloadTimer = null; }
  cleanupRecording();
  Object.keys(typingClearTimers).forEach(function (id) { clearTimeout(typingClearTimers[id]); });
});

function toggleVoiceMode() {
  voiceMode.value = !voiceMode.value;
  emojiPanel.value = false;
  if (!voiceMode.value) nextTick(() => { if (inputEl.value) inputEl.value.focus(); });
}
</script>

<style scoped>
.chat { display: flex; height: 100%; background: rgba(255,255,255,.1); border: 1px solid var(--glass-border); border-radius: 18px; overflow: hidden; position: relative; backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur); box-shadow: var(--glass-shadow), var(--glass-highlight); }
.list { width: 280px; border-right: 1px solid var(--glass-border); display: flex; flex-direction: column; background: rgba(255,255,255,.12); backdrop-filter: blur(22px); -webkit-backdrop-filter: blur(22px); }
.list-search { padding: 10px; border-bottom: 1px solid var(--glass-border); display: flex; gap: 6px; }
.list-search .field { flex: 1; min-width: 0; }
.search-btn { padding: 8px 12px; font-size: 13px; flex-shrink: 0; }
.new-group-btn { flex-shrink: 0; padding: 8px 10px; font-size: 12px; border-radius: 10px; }
.list-body { flex: 1; overflow: auto; position: relative; }
.group-title { font-size: var(--fs-xs); font-weight: var(--fw-semibold); letter-spacing: var(--tracking-wide); color: var(--text-soft); padding: 10px 14px 4px; }
.item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; cursor: pointer; transition: background .18s ease, transform .18s ease; }
.item:hover { background: var(--green-light); transform: translateX(3px); }
.item.active { background: var(--green-light); }
.avatar { width: 40px; height: 40px; font-size: 16px; position: relative; flex-shrink: 0; }
.avatar.sq { border-radius: 8px; }
.avatar.sq img { border-radius: 8px; }
.avatar .dot { position: absolute; right: -1px; bottom: -1px; width: 10px; height: 10px; border-radius: 50%; background: var(--green); border: 2px solid #fff; animation: pulse 2s infinite; }
@keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(7,193,96,.5); } 50% { box-shadow: 0 0 0 4px rgba(7,193,96,0); } }
.item-info { flex: 1; min-width: 0; }
.item-name { font-size: var(--fs-base); font-weight: var(--fw-semibold); letter-spacing: var(--tracking); }
.group-avatar { background: linear-gradient(135deg, rgba(7,193,96,.22), rgba(64,156,255,.24)); color: var(--green-dark); font-size: 15px; border: 1px solid rgba(255,255,255,.7); }
.member-count-inline { font-size: 10px; color: var(--text-faint); font-weight: var(--fw-regular); margin-left: 4px; vertical-align: 1px; }
.conv-tag { display: inline-block; margin-left: 4px; padding: 0 5px; height: 16px; line-height: 16px; border-radius: 6px; font-size: 10px; font-weight: var(--fw-semibold); vertical-align: 1px; }
.conv-tag.pin { color: var(--green-dark); background: rgba(7, 193, 96, .14); }
.conv-tag.mute { color: var(--text-soft); background: rgba(255, 255, 255, .35); }
.one-line { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.item-time { font-size: 11px; color: var(--text-soft); }
.online-text { color: var(--green); font-size: 12px; }
.add-btn { background: var(--green); color: #fff; border: none; border-radius: 8px; padding: 6px 10px; font-size: 12px; cursor: pointer; }
.relation-tag { font-size: 12px; font-weight: var(--fw-medium); color: var(--text-soft); padding: 5px 9px; border-radius: 8px; background: rgba(255,255,255,.24); border: 1px solid rgba(255,255,255,.6); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); white-space: nowrap; }
.badge { background: var(--danger); color: #fff; font-size: 11px; padding: 1px 6px; border-radius: 10px; }
.empty { padding: 16px; text-align: center; color: var(--text-soft); font-size: 13px; }
.pane { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.pane-inner { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.empty-pane { flex: 1; display: flex; align-items: center; justify-content: center; color: var(--text-soft); }
.pane-head { padding: 12px 16px; border-bottom: 1px solid var(--glass-border); display: flex; gap: 10px; align-items: center; position: relative; background: rgba(255,255,255,.18); backdrop-filter: blur(22px); -webkit-backdrop-filter: blur(22px); }
.group-notice { display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: rgba(250, 235, 190, .55); border-bottom: 1px solid rgba(214, 178, 89, .3); color: #6f5210; font-size: 13px; cursor: pointer; }
.notice-tag { flex-shrink: 0; padding: 2px 7px; border-radius: 7px; background: #f0c96a; color: #5b430c; font-size: 11px; font-weight: var(--fw-semibold); }
.notice-text { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.notice-more { flex-shrink: 0; font-size: 17px; line-height: 1; }
.back-btn { font-size: 26px; line-height: 1; color: var(--green); cursor: pointer; margin-right: 2px; }
.pane-name { font-size: var(--fs-md); font-weight: var(--fw-semibold); letter-spacing: var(--tracking); }
.group-count { font-size: var(--fs-xs); }
.typing { font-size: 12px; color: var(--green); animation: blink 1.2s infinite; }
@keyframes blink { 0%,100% { opacity: .45; } 50% { opacity: 1; } }
.head-more { margin-left: auto; font-size: 22px; color: var(--text-soft); cursor: pointer; position: relative; padding: 0 6px; }
.head-menu { position: absolute; right: 0; top: 26px; background: var(--glass-bg-strong); border: 1px solid var(--glass-border); border-radius: 12px; box-shadow: var(--glass-shadow); backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur); min-width: 100px; z-index: 50; }
.head-menu-item { padding: 9px 14px; font-size: 13px; cursor: pointer; color: var(--danger); }
.head-menu-item:hover { background: #fdf0ef; }
.head-menu-item.normal { color: var(--text); }
.head-menu-item.normal:hover { background: var(--green-light); }
.chat-search { display: flex; gap: 6px; padding: 8px 12px; border-bottom: 1px solid var(--glass-border); background: rgba(255,255,255,.16); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); align-items: center; }
.chat-search .field { flex: 1; min-width: 0; padding: 7px 12px; font-size: 13px; }
.search-go { padding: 7px 12px; font-size: 13px; white-space: nowrap; }
.search-results { max-height: 220px; overflow: auto; border-bottom: 1px solid var(--glass-border); background: rgba(255,255,255,.2); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); }
.search-result { padding: 8px 14px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,.35); transition: background .15s ease; }
.search-result:last-child { border-bottom: none; }
.search-result:hover { background: var(--green-light); }
.search-result-text { font-size: var(--fs-sm); font-weight: var(--fw-reading); color: var(--text); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; word-break: break-word; }
.search-result-from { color: var(--text-soft); font-weight: var(--fw-regular); }
.search-result .muted { font-size: var(--fs-2xs); margin-top: 2px; }
.search-empty { padding: 10px 14px; text-align: center; font-size: var(--fs-xs); color: var(--text-faint); border-bottom: 1px solid var(--glass-border); }
.load-more { text-align: center; padding: 6px 0 12px; font-size: var(--fs-xs); color: var(--green-dark); cursor: pointer; user-select: none; }
.load-more:hover { text-decoration: underline; text-underline-offset: 2px; }
.load-latest { width: fit-content; margin: 12px auto 4px; padding: 7px 16px; border-radius: 999px; font-size: var(--fs-xs); font-weight: var(--fw-semibold); color: #fff; background: linear-gradient(180deg, #16d27a, #07c160 60%, #05a94f); box-shadow: 0 6px 16px rgba(7,193,96,.28), inset 0 1px 0 rgba(255,255,255,.45); cursor: pointer; }
.load-latest:active { transform: scale(.97); }
.messages { flex: 1; overflow: auto; padding: 16px; background: var(--bg); }
.msg-block.msg-hit { animation: hitPulse 2s ease; border-radius: 12px; }
@keyframes hitPulse { 0%, 60% { background: rgba(7,193,96,.18); } 100% { background: transparent; } }
.msg-list { display: flex; flex-direction: column; gap: 10px; }
.msg-block { display: flex; flex-direction: column; }
.time-divider { text-align: center; font-size: var(--fs-xs); color: var(--text-faint); letter-spacing: .02em; margin: 6px 0 10px; }
.recall-line { text-align: center; font-size: var(--fs-xs); color: var(--text-faint); padding: 4px 0; }
.msg-row { display: flex; align-items: flex-start; gap: 8px; }
.msg-row.mine { flex-direction: row-reverse; }
.msg-more { align-self: center; flex-shrink: 0; width: 22px; text-align: center; font-size: 18px; line-height: 1; color: var(--text-soft); cursor: pointer; opacity: 0; transition: opacity .15s ease; user-select: none; -webkit-user-select: none; }
.msg-row:hover .msg-more { opacity: .65; }
@media (hover: none) { .msg-more { opacity: .5; } }
.msg-avatar { width: 36px; height: 36px; font-size: 14px; cursor: pointer; }
.msg-body { max-width: 64%; display: flex; flex-direction: column; }
.msg-sender { font-size: var(--fs-2xs); color: var(--text-soft); margin: 0 4px 2px; line-height: 1.3; }
.msg-row.mine .msg-body { align-items: flex-end; }
.bubble { padding: 9px 13px; border-radius: 16px; background: rgba(255,255,255,.3); border: 1px solid rgba(255,255,255,.8); box-shadow: 0 6px 20px rgba(18,48,31,.1), inset 0 1px 0 rgba(255,255,255,.85), inset 0 -1px 0 rgba(255,255,255,.18); backdrop-filter: blur(22px); -webkit-backdrop-filter: blur(22px); font-size: var(--fs-base); font-weight: var(--fw-reading); line-height: 1.62; letter-spacing: var(--tracking); word-break: break-word; position: relative; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
.bubble.mine { background: linear-gradient(135deg, rgba(7,193,96,.9), rgba(5,169,79,.88)); border-color: rgba(255,255,255,.35); color: #fff; font-weight: var(--fw-reading); text-shadow: 0 1px 2px rgba(0, 55, 28, .18); box-shadow: 0 6px 18px rgba(7,193,96,.24), inset 0 1px 0 rgba(255,255,255,.35); }
.bubble.failed { opacity: .6; }
.bubble .msg-img { max-width: 200px; max-height: 200px; border-radius: 8px; display: block; cursor: zoom-in; }
.bubble .msg-sticker { width: 132px; height: 132px; object-fit: contain; display: block; cursor: zoom-in; background: transparent; }
.bubble.sticker-bubble { padding: 0; background: transparent; border-color: transparent; box-shadow: none; backdrop-filter: none; -webkit-backdrop-filter: none; }
.forward-mark { display: inline-block; margin-bottom: 5px; padding: 1px 6px; border-radius: 5px; background: rgba(7,193,96,.13); color: var(--green-dark); font-size: 10px; font-weight: var(--fw-semibold); }
.bubble.mine .forward-mark { background: rgba(255,255,255,.2); color: #fff; }
.reply-quote { margin-bottom: 6px; padding: 6px 8px; border-left: 3px solid rgba(7,193,96,.5); border-radius: 6px; background: rgba(255,255,255,.42); color: var(--text-soft); font-size: var(--fs-xs); line-height: 1.45; cursor: pointer; }
.bubble.mine .reply-quote { border-left-color: rgba(255,255,255,.72); background: rgba(255,255,255,.16); color: rgba(255,255,255,.9); text-shadow: none; }
.reply-quote-name { font-weight: var(--fw-semibold); color: var(--green-dark); }
.bubble.mine .reply-quote-name { color: #fff; }
.reply-quote-text { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; word-break: break-all; }
.bubble-vip-mark { display: inline-flex; margin-bottom: 5px; padding: 1px 7px; border: 1px solid rgba(177, 137, 43, .52); border-radius: 999px; font-size: 10px; line-height: 1.5; letter-spacing: .08em; }
.bubble.mine .bubble-vip-mark { border-color: rgba(255, 224, 135, .46); }
.group-entry-pop {
  position: fixed;
  z-index: 760;
  top: 76px;
  left: 50%;
  width: min(380px, calc(100vw - 28px));
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px 10px 10px;
  border: 1px solid rgba(116, 92, 44, .42);
  border-radius: 22px;
  background: rgba(255, 255, 255, .94);
  box-shadow: 0 12px 34px rgba(20, 15, 4, .18);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}
.group-entry-avatar { flex-shrink: 0; width: 38px; height: 38px; font-size: 15px; }
.group-entry-copy { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.group-entry-badges { gap: 3px; }
.group-entry-text { color: var(--text); font-size: var(--fs-sm); font-weight: var(--fw-semibold); line-height: 1.45; overflow-wrap: anywhere; }
html[data-vip='1'] .group-entry-pop { background: #0d0a05; border-color: #6f551b; box-shadow: 0 14px 34px rgba(0, 0, 0, .55); }
html[data-vip='1'] .group-entry-text { color: #ead8a8; }
.vip-file-card { width: min(290px, 52vw); min-width: 190px; display: flex; align-items: center; gap: 9px; padding: 4px 2px; border: 0; background: transparent; color: inherit; text-align: left; cursor: pointer; }
.vip-file-type { flex-shrink: 0; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(171, 132, 39, .6); border-radius: 12px; background: rgba(171, 132, 39, .12); color: #9b7420; font-size: 10px; font-weight: 700; letter-spacing: .03em; }
.bubble.mine .vip-file-type { border-color: rgba(255, 232, 164, .45); background: rgba(0, 0, 0, .18); color: #ffe3a0; }
.vip-file-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.vip-file-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; font-weight: 600; }
.vip-file-meta { font-size: 10px; opacity: .72; white-space: nowrap; }
.vip-file-action { flex-shrink: 0; font-size: 11px; font-weight: 600; color: var(--green-dark); }
.bubble.mine .vip-file-action { color: #fff; }
.vip-file-card.expired { opacity: .58; cursor: not-allowed; }
.msg-status { font-size: var(--fs-2xs); color: var(--text-faint); margin-top: 3px; }
.vip-upload-status { display: flex; align-items: center; gap: 8px; padding: 6px 12px; border-top: 1px solid var(--glass-border); background: var(--glass-bg); font-size: 11px; color: var(--text-soft); }
.vip-upload-name { max-width: 42%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vip-upload-track { flex: 1; height: 4px; border-radius: 999px; background: rgba(0, 0, 0, .16); overflow: hidden; }
.vip-upload-track i { display: block; height: 100%; background: #b28a2e; transition: width .15s ease; }
.vip-file-btn { border-color: rgba(172, 132, 38, .48); color: #8a6514; }
.msg-status { font-size: var(--fs-2xs); color: var(--text-faint); margin-top: 3px; }
.failed-text { color: var(--danger); font-weight: var(--fw-semibold); cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
.voice-line { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; min-width: 70px; }
.voice-play { font-size: 12px; }
.voice-bars { display: inline-flex; align-items: center; gap: 2px; }
.voice-bars i { display: block; width: 3px; background: currentColor; border-radius: 2px; opacity: .7; }
.voice-bars i:nth-child(1) { height: 6px; }
.voice-bars i:nth-child(2) { height: 12px; }
.voice-bars i:nth-child(3) { height: 8px; }
.voice-dur { font-size: 12px; opacity: .85; }
.expired { font-size: 13px; opacity: .75; }
.emoji-panel { padding: 10px 12px; border-top: 1px solid var(--glass-border); max-height: 310px; overflow: auto; background: rgba(255,255,255,.22); backdrop-filter: blur(22px); -webkit-backdrop-filter: blur(22px); }
.sticker-library { padding: 9px 10px 11px; margin-bottom: 8px; border: 1px solid var(--glass-border); border-radius: 14px; background: rgba(255,255,255,.24); }
.sticker-library-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 8px; color: var(--text-soft); font-size: var(--fs-xs); font-weight: var(--fw-semibold); }
.sticker-upload-btn { border: 1px solid var(--glass-border); border-radius: 9px; padding: 4px 9px; background: var(--green-light); color: var(--green-dark); font-size: var(--fs-xs); }
.sticker-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(54px, 1fr)); gap: 6px; }
.sticker-item { position: relative; aspect-ratio: 1; border-radius: 10px; background: var(--field-bg); border: 1px solid var(--glass-border); overflow: hidden; }
.sticker-item img { width: 100%; height: 100%; object-fit: contain; padding: 4px; cursor: pointer; }
.sticker-remove { position: absolute; top: 2px; right: 2px; width: 17px; height: 17px; padding: 0; border: 0; border-radius: 50%; background: rgba(22,28,24,.7); color: #fff; font-size: 12px; line-height: 17px; opacity: .78; }
.sticker-add { aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; border: 1px dashed var(--glass-border); border-radius: 10px; background: rgba(255,255,255,.2); color: var(--green-dark); font-size: 20px; }
.sticker-add span { font-size: 10px; }
.emoji-title { margin: 3px 0 6px; color: var(--text-faint); font-size: 10px; letter-spacing: .08em; text-transform: uppercase; }
.reply-compose { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-top: 1px solid var(--glass-border); background: var(--glass-bg); }
.reply-compose-body { flex: 1; min-width: 0; display: flex; align-items: baseline; gap: 6px; font-size: var(--fs-xs); color: var(--text-soft); overflow: hidden; }
.reply-compose-title { flex-shrink: 0; color: var(--green-dark); font-weight: var(--fw-semibold); }
.reply-compose-preview { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.reply-cancel { flex-shrink: 0; width: 26px; height: 26px; border: 1px solid var(--glass-border); border-radius: 50%; background: var(--glass-bg); color: var(--text-soft); font-size: 18px; line-height: 1; }
.pat-line { width: fit-content; max-width: 92%; margin: 8px auto; padding: 5px 12px; border-radius: 999px; background: rgba(30,44,35,.46); color: #fff; text-align: center; font-size: var(--fs-xs); line-height: 1.45; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
.emoji-item { display: inline-flex; align-items: center; justify-content: center; font-size: 20px; cursor: pointer; padding: 3px; border-radius: 6px; }
.emoji-item:hover { background: var(--green-light); }
.pane-foot { display: flex; gap: 8px; padding: 10px 12px; border-top: 1px solid var(--glass-border); align-items: center; background: rgba(255,255,255,.18); backdrop-filter: blur(22px); -webkit-backdrop-filter: blur(22px); }
.pane-foot .field { flex: 1; min-width: 0; }
.tool-btn { border: 1px solid rgba(255,255,255,.55); background: rgba(255,255,255,.22); color: var(--text-soft); border-radius: 10px; padding: 8px 10px; font-size: 13px; font-weight: var(--fw-medium); white-space: nowrap; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
.tool-btn:hover { background: var(--green-light); color: var(--green); }
.send-btn { padding: 9px 16px; font-size: 14px; }
.hold-btn { flex: 1; border: 1px solid var(--glass-border); background: rgba(255,255,255,.3); border-radius: 12px; padding: 10px; font-size: 14px; font-weight: var(--fw-medium); user-select: none; backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); }
.hold-btn.recording { background: var(--green-light); border-color: var(--green); color: var(--green); }
.hold-btn.cancel { background: #fdf0ef; border-color: var(--danger); color: var(--danger); }
.ctx-menu { position: fixed; background: var(--glass-bg-strong); border: 1px solid var(--glass-border); border-radius: 12px; box-shadow: var(--glass-shadow); backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur); z-index: 100; min-width: 120px; padding: 4px 0; }
.ctx-item { padding: 8px 16px; font-size: var(--fs-sm); font-weight: var(--fw-medium); cursor: pointer; transition: background .12s ease; }
.ctx-item:hover { background: var(--green-light); color: var(--green); }
.ctx-item.danger { color: var(--danger); }
.ctx-item.danger:hover { background: #fdf0ef; color: var(--danger); }
.ban-parent { display: flex; justify-content: space-between; align-items: center; position: relative; }
.ban-parent .arrow { font-size: 10px; margin-left: 8px; }
.ban-sub { position: absolute; left: calc(100% + 4px); top: -4px; background: var(--glass-bg-strong); border: 1px solid var(--glass-border); border-radius: 12px; box-shadow: var(--glass-shadow); backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur); padding: 6px 0; min-width: 140px; z-index: 101; }
.ban-item { padding: 6px 14px; font-size: 13px; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: background .12s ease; }
.ban-item:hover { background: var(--green-light); }
.circle { width: 14px; height: 14px; border-radius: 50%; border: 2px solid #ccc; background: #fff; display: inline-block; transition: all .15s ease; }
.circle.on { border-color: var(--green); background: var(--green); transform: scale(1.1); }
.ban-confirm { margin-top: 4px; padding: 8px 14px; font-size: 13px; color: #fff; background: var(--danger); cursor: pointer; text-align: center; border-radius: 0 0 8px 8px; transition: opacity .15s ease; }
.ban-confirm:hover { opacity: .9; }
.modal-mask { position: fixed; inset: 0; z-index: 300; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(18,32,24,.3); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
.modal-card { width: min(420px, 100%); max-height: 84vh; overflow: auto; display: flex; flex-direction: column; gap: 10px; padding: 18px; border-radius: 18px; border: 1px solid var(--glass-border); background: var(--glass-bg-strong); box-shadow: var(--glass-shadow), var(--glass-highlight); backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur); }
.modal-title { font-size: 17px; font-weight: var(--fw-semibold); letter-spacing: var(--tracking); }
.modal-sub { font-size: var(--fs-xs); }
.forward-card { width: min(450px, 100%); }
.forward-preview { padding: 9px 11px; border-radius: 10px; background: rgba(7,193,96,.08); border: 1px solid rgba(7,193,96,.16); color: var(--text-soft); font-size: var(--fs-xs); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; word-break: break-word; }
.forward-list { max-height: 44vh; overflow: auto; display: flex; flex-direction: column; gap: 3px; padding: 5px; border-radius: 13px; border: 1px solid var(--glass-border); background: var(--glass-bg); }
.forward-row { width: 100%; display: flex; align-items: center; gap: 9px; padding: 7px; border: 0; border-radius: 9px; background: transparent; color: var(--text); text-align: left; }
.forward-row:hover { background: var(--green-light); }
.forward-row:disabled { opacity: .55; }
.forward-row-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.forward-row-name { font-size: var(--fs-sm); font-weight: var(--fw-medium); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.forward-row-sub { font-size: var(--fs-2xs); color: var(--text-soft); }
.forward-row-go { flex-shrink: 0; font-size: var(--fs-2xs); color: var(--green-dark); font-weight: var(--fw-semibold); }
.forward-empty { padding: 23px 12px; text-align: center; font-size: var(--fs-sm); }
.pick-list { max-height: 220px; overflow: auto; display: flex; flex-direction: column; gap: 2px; padding: 6px; border-radius: 12px; border: 1px solid rgba(255,255,255,.5); background: rgba(255,255,255,.18); }
.pick-list.small { max-height: 150px; }
.pick-row { display: flex; align-items: center; gap: 8px; padding: 6px; border-radius: 8px; cursor: pointer; }
.pick-row:hover { background: var(--green-light); }
.pick-row input { width: 16px; height: 16px; accent-color: var(--green); flex-shrink: 0; }
.pick-avatar { width: 30px; height: 30px; font-size: 13px; }
.pick-name { font-size: 14px; font-weight: var(--fw-medium); }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; flex-wrap: wrap; }
.small-btn { padding: 6px 11px; font-size: 12px; border-radius: 10px; }
.danger-btn { background: linear-gradient(180deg, #e35b60, #d93a3f 60%, #c22f34); border-color: rgba(255,255,255,.35); box-shadow: 0 6px 18px rgba(217,58,63,.24), inset 0 1px 0 rgba(255,255,255,.35); }
.group-detail { display: flex; flex-direction: column; gap: 10px; }
.name-edit { display: flex; gap: 6px; align-items: center; }
.name-edit .field { flex: 1; min-width: 0; }
.nickname-card { display: flex; flex-direction: column; gap: 6px; padding: 10px; border-radius: 12px; background: var(--glass-bg); border: 1px solid var(--glass-border); }
.nickname-label { font-size: 12px; font-weight: var(--fw-semibold); color: var(--text-soft); }
.nickname-row { display: flex; align-items: center; gap: 6px; }
.nickname-row .field { flex: 1; min-width: 0; }
.nickname-hint { font-size: 10px; color: var(--text-faint); }
.member-real-name { margin-left: 5px; font-size: 10px; font-weight: var(--fw-regular); color: var(--text-faint); }
.announce-card { display: flex; flex-direction: column; gap: 7px; padding: 10px; border-radius: 12px; background: rgba(250, 235, 190, .42); border: 1px solid rgba(214, 178, 89, .3); }
.announce-title { font-size: 13px; font-weight: var(--fw-semibold); color: #6f5210; }
.announce-input { min-height: 76px; resize: vertical; font-size: 13px; line-height: 1.55; }
.announce-actions { display: flex; gap: 8px; }
.announce-view { white-space: pre-wrap; word-break: break-word; font-size: 13px; line-height: 1.6; color: var(--text); }
.announce-time { font-size: 11px; color: var(--text-soft); }
.panel-group-name { font-size: 18px; font-weight: var(--fw-semibold); }
.member-list { display: flex; flex-direction: column; gap: 2px; max-height: 220px; overflow: auto; }
.member-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; }
.member-name { flex: 1; min-width: 0; font-size: 14px; font-weight: var(--fw-medium); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.owner-tag { font-size: 10px; margin-left: 4px; padding: 1px 5px; border-radius: 6px; background: var(--green-light); color: var(--green-dark); font-weight: var(--fw-semibold); }
.preview-mask { position: fixed; inset: 0; background: rgba(0,0,0,.85); display: flex; align-items: center; justify-content: center; z-index: 200; cursor: zoom-out; }
.preview-mask img { max-width: 92%; max-height: 92%; border-radius: 8px; animation: zoomIn .28s cubic-bezier(.34,1.56,.64,1); }
@keyframes zoomIn { from { opacity: 0; transform: scale(.85); } to { opacity: 1; transform: scale(1); } }

@media (max-width: 720px) {
  .chat { border-radius: 10px; }
  .list { width: 100%; border-right: none; }
  .pane { width: 100%; }
  .list.mobile-hide { display: none; }
  .pane.mobile-hide { display: none; }
  .pane-head { padding: 10px 12px; }
  .messages { padding: 10px; }
  .pane-foot { gap: 4px; padding: 6px; }
  .tool-btn { padding: 7px; font-size: 12px; }
  .send-btn { padding: 8px 10px; font-size: 13px; }
  .msg-body { max-width: 70%; }
  .msg-avatar { width: 32px; height: 32px; }
  .bubble .msg-img { max-width: 160px; max-height: 160px; }
  .bubble .msg-sticker { width: 110px; height: 110px; }
  .emoji-panel { max-height: 280px; }
  .reply-compose { padding: 7px 9px; }
  .forward-list { max-height: 48vh; }
  .modal-card { padding: 15px; }
}
</style>
