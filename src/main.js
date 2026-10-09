import { createApp } from 'vue'

import App from './App.vue'

import './styles/index.css'
import { applyDirection } from './utils/locale'
import { isAndroid } from './utils/platform'

// Android 的 webview 会把状态栏 / 挖孔高度算进 env(safe-area-inset-top)，
// 而 App 本身已经把 webview 放在状态栏下面了，会重复留白（切换栏上面多出一块），
// 这里打个标记，由 CSS 把 Android 上的顶部安全区归零。
if (isAndroid) {
  document.documentElement.classList.add('is-android')
}

// 按语言设置 html 的 lang / dir（RTL 语言整体镜像）
applyDirection()

const app = createApp(App)

app.mount('#app')
