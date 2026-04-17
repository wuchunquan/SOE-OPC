import { createApp } from 'vue'
import App from './App.vue'
import { initStore } from './store'                 // Store
import { initRouter } from './router'               // Router
import language from './locales'                    // 国际化
import '@styles/core/tailwind.css'                  // tailwind
import '@styles/index.scss'                         // 样式
import '@utils/sys/console.ts'                      // 控制台输出内容
import { setupGlobDirectives } from './directives'
import { setupErrorHandle } from './utils/sys/error-handle'
import 'primeicons/primeicons.css'                  // PrimeIcons
import { initDesktopRuntime } from './desktop/runtime'
import { getRuntimeLocalApiBaseUrl } from '@/utils/runtime-mode'

initDesktopRuntime()

document.addEventListener(
  'touchstart',
  function () {},
  { passive: false }
)

// 桌面运行时替换本地请求 fetch，绕过 Mixed Content 限制
async function initDesktopFetch() {
  if ((window as any).__TAURI_INTERNALS__) {
    const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http')
    const originalFetch = window.fetch
    const localApiUrl = getRuntimeLocalApiBaseUrl()
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      // 本地请求使用 Tauri fetch
      if (url.includes(localApiUrl)) {
        return tauriFetch(input, init)
      }
      return originalFetch(input, init)
    }
    console.log('Desktop fetch initialized for local requests')
  }
}

// 初始化应用
async function bootstrap() {
  await initDesktopFetch()

  const app = createApp(App)
  initStore(app)
  initRouter(app)
  setupGlobDirectives(app)
  setupErrorHandle(app)

  app.use(language)
  app.mount('#app')
}

bootstrap()
