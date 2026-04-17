import { callDesktopBridge } from '@/desktop/bridge'
import { isPywebviewRuntime } from '@/desktop/runtime'

interface DialogOptions {
  directory?: boolean
  multiple?: boolean
  title?: string
  defaultPath?: string
  filters?: Array<{ name: string; extensions: string[] }>
}

export async function open(options: DialogOptions = {}): Promise<string | string[] | null> {
  if (isPywebviewRuntime()) {
    return await callDesktopBridge<string | string[] | null>('open_dialog', options)
  }
  return null
}

export async function save(options: DialogOptions = {}): Promise<string | null> {
  if (isPywebviewRuntime()) {
    return await callDesktopBridge<string | null>('save_dialog', options)
  }
  return null
}

