import axios from 'axios';

// 始终使用当前域名：/api 请求由 Vite 代理到本机后端。
// 公网、局域网、localhost 都只有同一个域名，不会再出现
// api.jxcheat.us.ci 解析失败、证书错误或跨域问题。
const api = axios.create({ baseURL: '', timeout: 15000 });

function getToken() {
  const token = sessionStorage.getItem('token');
  return token === sessionStorage.getItem('jxLegacyToken') ? token : '';
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (config.url?.startsWith('/api/')) {
    config.url = config.url.replace('/api/', '/api/legacy/');
    config.headers['X-JX-Web'] = 'emergency';
  }
  if (token) config.headers.Authorization = 'Bearer ' + token;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    // 管理员二次验证：第一次请求故意返回 401，让登录页显示动态码输入框，
    // 不能被下面的 401 拦截器直接踢回 /login
    if (err.response && err.response.data && err.response.data.twoFactorRequired) {
      return Promise.reject(err);
    }
    if (getToken() && err.response && (err.response.status === 401 ||
        (err.response.status === 403 && (err.response.data?.banned || err.response.data?.legacyAccessDenied)))) {
      if (err.response.status === 403 && typeof window !== 'undefined' && window.location.pathname !== '/login') {
        alert(err.response.data?.legacyAccessDenied ? '连续登录客户端满 30 天后才可使用网页版' : '你的账号已被封禁');
      }
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('jxLegacyToken');
      if (typeof window !== 'undefined' && window.location.pathname !== '/emergency') {
        window.location.href = '/emergency';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
