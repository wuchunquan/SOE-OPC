export {}

declare global {
  interface Window {
    __DESKTOP_RUNTIME__?: 'pywebview'
    pywebview?: {
      api?: Record<string, (...args: any[]) => Promise<any>>
    }
  }
}

