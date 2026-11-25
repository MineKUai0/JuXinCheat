import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: ['jxcheat.us.ci', '.us.ci', 'localhost'],
    // 前端和后端共用同一个域名：API 与 Socket 都由 Vite 代理到本机 3000，
    // 这样公网用户不需要再解析 api.jxcheat.us.ci，也不会碰到跨域/证书问题
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://127.0.0.1:3000',
        ws: true,
        changeOrigin: true
      }
    }
  }
});
