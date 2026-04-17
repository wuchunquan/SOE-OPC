export type DesktopRuntime = 'browser' | 'tauri' | 'pywebview'

function getSearchParam(name: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return new URLSearchParams(window.location.search).get(name)
  } catch {
    return null
  }
}

export function getDesktopRuntime(): DesktopRuntime {
  if (typeof window === 'undefined') return 'browser'
  if ((window as any).__DESKTOP_RUNTIME__ === 'pywebview') return 'pywebview'
  if ((window as any).__TAURI_INTERNALS__?.runtime === 'pywebview') return 'pywebview'
  if ((window as any).pywebview?.api) return 'pywebview'
  if (getSearchParam('desktop') === 'pywebview') return 'pywebview'
  if ((window as any).__TAURI_INTERNALS__) return 'tauri'
  return 'browser'
}

export function isPywebviewRuntime(): boolean {
  return getDesktopRuntime() === 'pywebview'
}

export function isDesktopRuntime(): boolean {
  return getDesktopRuntime() !== 'browser'
}

function tagPywebviewDragRegions() {
  if (typeof document === 'undefined') return
  const applyClass = () => {
    document.querySelectorAll<HTMLElement>('[data-tauri-drag-region]').forEach((element) => {
      element.classList.add('pywebview-drag-region')
    })
  }
  applyClass()
  const observer = new MutationObserver(() => applyClass())
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-tauri-drag-region']
  })
}

export function initDesktopRuntime() {
  if (!isPywebviewRuntime()) return
  ;(window as any).__DESKTOP_RUNTIME__ = 'pywebview'
  ;(window as any).__TAURI_INTERNALS__ = {
    runtime: 'pywebview',
    shim: true
  }
  tagPywebviewDragRegions()
}
