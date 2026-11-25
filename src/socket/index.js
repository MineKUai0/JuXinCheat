import { io } from 'socket.io-client';

let socket = null;
let socketToken = '';

export function connectSocket(token) {
  // 同一个 token 复用同一个实例（socket.io 自己负责重连），token 变了才重建
  if (socket && socketToken === token) return socket;
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  socketToken = token;
  // 不写服务器地址，直接连当前域名；/socket.io 由 Vite 代理到后端
  socket = io({
    auth: { token },
    transports: ['websocket', 'polling']
  });
  // 强制下线必须全局生效：在帖子详情/个人主页时 Home 已卸载，不能只靠 Home 监听
  socket.on('force-logout', function (data) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('jx-force-logout', { detail: data || {} }));
    }
  });
  return socket;
}

export function getSocket() { return socket; }

export function closeSocket() {
  if (socket) { socket.disconnect(); socket = null; }
  socketToken = '';
}
