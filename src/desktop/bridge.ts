import { isPywebviewRuntime } from './runtime'

declare global {
  interface Window {
    pywebview?: {
      api?: Record<string, (...args: any[]) => Promise<any>>
    }
    __PYWEBVIEW_READY__?: Promise<void>
  }
}

async function waitForPywebviewReady(): Promise<void> {
  if (!isPywebviewRuntime()) {
    throw new Error('当前不是 pywebview 桌面环境')
  }
  const api = window.pywebview?.api
  if (api) return

  if (!window.__PYWEBVIEW_READY__) {
    window.__PYWEBVIEW_READY__ = new Promise<void>((resolve) => {
      const handler = () => {
        window.removeEventListener('pywebviewready', handler as EventListener)
        resolve()
      }
      window.addEventListener('pywebviewready', handler as EventListener, { once: true })
    })
  }
  await window.__PYWEBVIEW_READY__
}

export async function callDesktopBridge<T = any>(method: string, ...args: any[]): Promise<T> {
  await waitForPywebviewReady()
  const api = window.pywebview?.api
  if (!api || typeof api[method] !== 'function') {
    throw new Error(`pywebview bridge 方法不存在: ${method}`)
  }
  return await api[method](...args)
}

export function withDesktopQuery(url: string): string {
  if (!isPywebviewRuntime()) return url
  if (url.includes('desktop=pywebview')) return url
  const hashIndex = url.indexOf('#')
  if (hashIndex >= 0) {
    const prefix = url.slice(0, hashIndex)
    const hash = url.slice(hashIndex)
    const separator = prefix.includes('?') ? '&' : '?'
    return `${prefix}${separator}desktop=pywebview${hash}`
  }
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}desktop=pywebview`
}

