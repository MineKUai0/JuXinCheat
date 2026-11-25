import { reactive } from 'vue';

// 全局界面状态：用来判断“用户此刻是不是正在看这条消息”
export const uiState = reactive({
  // Home 当前标签：chat / posts / mail / online
  homeTab: '',
  // ChatPanel 当前打开的私聊 id，没有打开时为空
  activeChatId: '',
  // 当前打开的群聊 id，没有打开时为空
  activeGroupId: '',
  pendingChat: null,
  // 正在看搜索定位出来的旧消息上下文（后面还有没加载的新消息）
  oldContext: false,
  // 当前用户设为免打扰的 peer id 列表
  mutedPeerIds: [],
  // 当前用户设为免打扰的群 id 列表
  mutedGroupIds: []
});
