/**
 * 桌面通知服务
 * 仅在 Tauri 环境下可用
 */

import { isTauriEnv } from './env'

// 通知设置的 localStorage key
const NOTIFICATION_SETTINGS_KEY = 'notification_settings'

// 默认设置
const defaultSettings = {
  enabled: true,           // 是否启用通知
  sound: true,             // 是否播放声音
  trayBlink: true,         // 托盘是否闪烁
}

/**
 * 获取通知设置
 */
export function getNotificationSettings() {
  try {
    const stored = localStorage.getItem(NOTIFICATION_SETTINGS_KEY)
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) }
    }
  } catch (e) {
    console.error('读取通知设置失败:', e)
  }
  return { ...defaultSettings }
}

/**
 * 保存通知设置
 */
export function saveNotificationSettings(settings: Partial<typeof defaultSettings>) {
  try {
    const current = getNotificationSettings()
    const newSettings = { ...current, ...settings }
    localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(newSettings))
    return newSettings
  } catch (e) {
    console.error('保存通知设置失败:', e)
    return getNotificationSettings()
  }
}

/**
 * 检查通知权限
 */
export async function checkNotificationPermission(): Promise<boolean> {
  if (!isTauriEnv()) return false

  try {
    const { isPermissionGranted } = await import('@tauri-apps/plugin-notification')
    return await isPermissionGranted()
  } catch (e) {
    console.error('检查通知权限失败:', e)
    return false
  }
}

/**
 * 请求通知权限
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isTauriEnv()) return false

  try {
    const { isPermissionGranted, requestPermission } = await import('@tauri-apps/plugin-notification')

    let granted = await isPermissionGranted()
    if (!granted) {
      const permission = await requestPermission()
      granted = permission === 'granted'
    }
    return granted
  } catch (e) {
    console.error('请求通知权限失败:', e)
    return false
  }
}

/**
 * 检查窗口是否可见（有焦点）
 */
export async function isWindowFocused(): Promise<boolean> {
  if (!isTauriEnv()) return true

  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    const window = getCurrentWindow()
    return await window.isFocused()
  } catch (e) {
    console.error('检查窗口焦点失败:', e)
    return true
  }
}

/**
 * 发送桌面通知
 * @param skipFocusCheck 跳过窗口焦点检查，强制检查是否发送
 */
export async function sendDesktopNotification(title: string, body: string, skipFocusCheck = false): Promise<boolean> {
  if (!isTauriEnv()) return false

  const settings = getNotificationSettings()
  if (!settings.enabled) return false

  try {
    // 如果不跳过焦点检查，则检查窗口是否有焦点
    if (!skipFocusCheck) {
      const focused = await isWindowFocused()
      if (focused) return false
    }

    const { sendNotification } = await import('@tauri-apps/plugin-notification')

    await sendNotification({
      title,
      body,
    })

    return true
  } catch (e) {
    console.error('发送通知失败:', e)
    return false
  }
}

/**
 * 触发托盘闪烁
 * @param skipFocusCheck 跳过窗口焦点检查
 */
export async function startTrayBlink(skipFocusCheck = false): Promise<boolean> {
  if (!isTauriEnv()) return false

  const settings = getNotificationSettings()
  if (!settings.enabled || !settings.trayBlink) return false

  try {
    // 如果不跳过焦点检查，则检查窗口是否有焦点
    if (!skipFocusCheck) {
      const focused = await isWindowFocused()
      if (focused) return false
    }

    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('start_tray_blink')
    return true
  } catch (e) {
    console.error('托盘闪烁失败:', e)
    return false
  }
}

/**
 * 停止托盘闪烁
 */
export async function stopTrayBlink(): Promise<void> {
  if (!isTauriEnv()) return

  try {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('stop_tray_blink')
  } catch (e) {
    console.error('停止托盘闪烁失败:', e)
  }
}

/**
 * 发送聊天消息通知
 * 综合处理：桌面通知 + 托盘闪烁
 * @param senderName 发送者名称
 * @param content 消息内容
 * @param isCurrentSession 是否是当前正在查看的会话
 */
export async function notifyChatMessage(senderName: string, content: string, isCurrentSession = false): Promise<void> {
  if (!isTauriEnv()) return

  const settings = getNotificationSettings()
  if (!settings.enabled) return

  // 检查窗口是否有焦点
  const focused = await isWindowFocused()

  // 如果窗口有焦点且是当前会话，不发送通知
  if (focused && isCurrentSession) {
    return
  }

  // 窗口隐藏（无焦点）时，所有消息都通知
  // 窗口有焦点但不是当前会话时，也通知
  console.log('[Notification] 发送通知:', { senderName, focused, isCurrentSession })

  // 发送桌面通知（跳过焦点检查，因为我们已经检查过了）
  await sendDesktopNotification(senderName, content, true)

  // 托盘闪烁（跳过焦点检查）
  await startTrayBlink(true)
}
