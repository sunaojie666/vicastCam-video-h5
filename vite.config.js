import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import pxToViewport from 'postcss-px-to-viewport-8-plugin'

// 端口可用环境变量覆盖：PORT=8080 npm run dev
const port = Number(process.env.PORT) || 5173

// https://vite.dev/config/
export default defineConfig({
  // 使用相对路径，打包结果可放到任意子目录
  base: './',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    // 0.0.0.0 = 监听所有网卡，手机 / 同局域网设备可通过 http://本机IP:端口 访问
    host: '0.0.0.0',
    port,
    strictPort: false,
    open: false,
    // 允许用 IP、自定义域名、内网穿透域名访问（否则 Vite 会拦掉 Host 不匹配的请求）
    allowedHosts: true,
    cors: true,
    proxy: {
      // 教程接口：前端请求 /api/strapi/xxx，由 Vite 转发到 https://www.vicastcam.com
      // 该域名没返回 CORS 头，开发时必须走代理；上线部署到同域名下则可直接用相对路径
      '/api/strapi': {
        target: 'https://www.vicastcam.com',
        changeOrigin: true
      },
      // 需要联调自己的后端时改这里：前端请求 /api，由 Vite 转发到后端
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true
  },
  css: {
    postcss: {
      plugins: [
        // 设计稿按 375px 宽写 px，构建时自动换算成 vw 做等比适配
        pxToViewport({
          unitToConvert: 'px',
          viewportWidth: 375,
          unitPrecision: 5,
          propList: ['*'],
          viewportUnit: 'vw',
          fontViewportUnit: 'vw',
          selectorBlackList: ['ignore-vw'],
          minPixelValue: 1,
          mediaQuery: false,
          replace: true,
          exclude: [/node_modules/]
        })
      ]
    }
  },
  build: {
    target: 'es2015',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    chunkSizeWarningLimit: 1500
  }
})
