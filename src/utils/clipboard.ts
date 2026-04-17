/**
 * 剪贴板工具
 * 兼容浏览器和 Tauri 环境
 */

import { isTauriEnv } from './env'

/**
 * 复制文本到剪贴板
 * @param text 要复制的文本
 * @returns 是否成功
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (isTauriEnv()) {
      // Tauri 环境使用 Tauri 的剪贴板 API
      const { writeText } = await import('@tauri-apps/plugin-clipboard-manager')
      await writeText(text)
      return true
    } else {
      // 浏览器环境使用 navigator.clipboard
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch (error) {
    console.error('复制到剪贴板失败:', error)
    // 降级方案：使用 execCommand
    try {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-9999px'
      textArea.style.top = '-9999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      const success = document.execCommand('copy')
      document.body.removeChild(textArea)
      return success
    } catch (fallbackError) {
      console.error('降级复制方案也失败:', fallbackError)
      return false
    }
  }
}

/**
 * 从剪贴板读取文本
 * @returns 剪贴板中的文本，失败返回 null
 */
export async function readFromClipboard(): Promise<string | null> {
  try {
    if (isTauriEnv()) {
      // Tauri 环境使用 Tauri 的剪贴板 API
      const { readText } = await import('@tauri-apps/plugin-clipboard-manager')
      return await readText()
    } else {
      // 浏览器环境使用 navigator.clipboard
      return await navigator.clipboard.readText()
    }
  } catch (error) {
    console.error('从剪贴板读取失败:', error)
    return null
  }
}
