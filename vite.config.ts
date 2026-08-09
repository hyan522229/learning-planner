import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  base: '/learning-planner/',
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  build: {
    // 兼容旧移动浏览器：Vite 默认输出 ES2022（含 class 私有字段 #），
    // 旧 Android WebView / iOS Safari 解析失败 → 白屏。降到 ES2017 覆盖更广。
    target: 'es2017',
  },
  server: {
    port: 5173,
    strictPort: true, // never fall back to another port
  },
})
