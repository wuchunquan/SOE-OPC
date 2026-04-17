export type OpcRuntimeMode = 'service' | 'desktop_client' | 'self_use' | 'browser'

function getQueryParam(name: string): string {
  if (typeof window === 'undefined') return ''
  try {
    return new URLSearchParams(window.location.search).get(name) || ''
  } catch {
    return ''
  }
}

export function getOpcRuntimeMode(): OpcRuntimeMode {
  const explicitMode =
    String((window as any).__OPC_RUNTIME_MODE__ || '').trim().toLowerCase() ||
    getQueryParam('runtime_mode').trim().toLowerCase()

  if (explicitMode === 'self_use') return 'self_use'
  if (explicitMode === 'desktop_client') return 'desktop_client'
  if (explicitMode === 'service') return 'service'
  return 'browser'
}

export function isSelfUseMode(): boolean {
  return getOpcRuntimeMode() === 'self_use'
}

export function getRuntimeLocalApiBaseUrl(): string {
  if (isSelfUseMode() && typeof window !== 'undefined') {
    return window.location.origin
  }
  return String(import.meta.env.VITE_LOCAL_API_BASE_URL || '').trim()
}

