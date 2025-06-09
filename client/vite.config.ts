import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'url'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import { vuestic } from '@vuestic/compiler/vite'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    sourcemap: true,
  },
  server: {
    proxy: {
      '/product': {
          target: 'http://localhost:3000', // ✅ 백엔드 서버 주소
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/product/, '/product'), // 경로 그대로 유지
        },
        '/common-codes': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/common-codes/, '/common-codes'),
        },
        '/equipments': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/equipments/, '/equipments'),
        },
        '/material': {
          target: 'http://localhost:3000', // ✅ 백엔드 서버 주소
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/material/, '/material'), // 경로 그대로 유지
        },
        '/bom': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/bom/, '/bom'),
        },
        '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
    },
  },
  
  plugins: [
    vuestic({
      devtools: true,
      cssLayers: true,
    }),
    vue(),
    VueI18nPlugin({
      include: resolve(dirname(fileURLToPath(import.meta.url)), './src/i18n/locales/**'),
    }),
  ],
})
