import { callDesktopBridge } from '@/desktop/bridge'

class CompatWindow {
  async minimize() {
    return await callDesktopBridge('current_window_minimize')
  }

  async maximize() {
    return await callDesktopBridge('current_window_maximize')
  }

  async unmaximize() {
    return await callDesktopBridge('current_window_restore')
  }

  async close() {
    return await callDesktopBridge('current_window_close')
  }

  async hide() {
    return await callDesktopBridge('current_window_hide')
  }

  async show() {
    return await callDesktopBridge('current_window_show')
  }

  async isMaximized(): Promise<boolean> {
    const state = await callDesktopBridge<{ maximized: boolean }>('current_window_state')
    return !!state?.maximized
  }

  async isAlwaysOnTop(): Promise<boolean> {
    const state = await callDesktopBridge<{ on_top: boolean }>('current_window_state')
    return !!state?.on_top
  }

  async setAlwaysOnTop(value: boolean) {
    return await callDesktopBridge('current_window_set_on_top', value)
  }

  async isFocused(): Promise<boolean> {
    return document.hasFocus()
  }

  async outerPosition(): Promise<{ x: number; y: number }> {
    const state = await callDesktopBridge<{ x: number; y: number }>('current_window_state')
    return { x: state?.x ?? 0, y: state?.y ?? 0 }
  }

  async setFocus() {
    return await callDesktopBridge('current_window_focus')
  }
}

const currentWindow = new CompatWindow()

export function getCurrentWindow() {
  return currentWindow
}
