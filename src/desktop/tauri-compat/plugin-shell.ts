import { callDesktopBridge } from '@/desktop/bridge'
import { isPywebviewRuntime } from '@/desktop/runtime'

export async function open(url: string): Promise<void> {
  if (isPywebviewRuntime()) {
    await callDesktopBridge('open_external', url)
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}

