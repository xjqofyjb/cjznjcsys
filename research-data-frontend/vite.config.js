import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: [
      'app.cjznjcsys.xin',
      'api.cjznjcsys.xin',
      'minio.cjznjcsys.xin',
      'localhost',
      '.cjznjcsys.xin'  // 允许所有子域名
    ]
  }
})