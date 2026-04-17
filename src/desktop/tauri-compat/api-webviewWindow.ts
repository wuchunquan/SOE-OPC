import { callDesktopBridge, withDesktopQuery } from '@/desktop/bridge'

type WindowEventName = 'tauri://created' | 'tauri://error'

export class WebviewWindow {
  label: string
  private listeners = new Map<WindowEventName, Array<(payload?: any) => void>>()

  constructor(label: string, options?: Record<string, any>, skipCreate = false) {
    this.label = label
    if (!skipCreate && options) {
      void this.create(options)
    }
  }

  private async create(options: Record<string, any>) {
    try {
      await callDesktopBridge('create_window', {
        label: this.label,
        ...options,
        url: withDesktopQuery(options.url)
      })
      queueMicrotask(() => this.emit('tauri://created'))
    } catch (error) {
      queueMicrotask(() => this.emit('tauri://error', error))
      throw error
    }
  }

  once(event: WindowEventName, callback: (payload?: any) => void) {
    const wrapped = (payload?: any) => {
      callback(payload)
      const list = this.listeners.get(event) || []
      this.listeners.set(event, list.filter((item) => item !== wrapped))
    }
    const list = this.listeners.get(event) || []
    list.push(wrapped)
    this.listeners.set(event, list)
  }

  private emit(event: WindowEventName, payload?: any) {
    for (const listener of this.listeners.get(event) || []) {
      listener(payload)
    }
  }

  async close() {
    return await callDesktopBridge('close_window', this.label)
  }

  async destroy() {
    return await callDesktopBridge('close_window', this.label)
  }

  async isVisible(): Promise<boolean> {
    return await callDesktopBridge('window_is_visible', this.label)
  }

  async setFocus() {
    return await callDesktopBridge('focus_window', this.label)
  }

  static async getByLabel(label: string): Promise<WebviewWindow | null> {
    const exists = await callDesktopBridge<boolean>('window_exists', label)
    return exists ? new WebviewWindow(label, undefined, true) : null
  }
}

