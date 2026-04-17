/**
 * 环境检测工具
 */
import { getDesktopRuntime, isDesktopRuntime } from '@/desktop/runtime'
import { getRuntimeLocalApiBaseUrl } from '@/utils/runtime-mode'

/**
 * 检测是否运行在桌面运行时中。
 * 为兼容旧代码，函数名保持 isTauriEnv，但现在同时覆盖 pywebview。
 */
export function isTauriEnv(): boolean {
  const hasDesktopRuntime = isDesktopRuntime()
  console.log('检测桌面运行时:', {
    value: getDesktopRuntime(),
    result: hasDesktopRuntime,
  })
  return hasDesktopRuntime
}

/**
 * 获取桌面运行时兼容 API（仅在桌面环境中可用）
 * @returns {any} Tauri API 对象或 null
 */
export function getTauriAPI(): any {
  if (isTauriEnv()) {
    return (window as any).__TAURI__
  }
  return null
}

/**
 * 安全地调用桌面运行时命令
 * @param callback 桌面环境下的回调函数
 * @param fallback 浏览器环境下的回退函数
 */
export async function runInTauri<T>(
  callback: () => Promise<T>,
  fallback?: () => Promise<T>
): Promise<T | null> {
  if (isTauriEnv()) {
    try {
      return await callback()
    } catch (error) {
      console.error('Desktop runtime command error:', error)
      throw error
    }
  } else if (fallback) {
    return await fallback()
  }
  return null
}

/**
 * 判断是否是桌面客户端环境
 */
export function isDesktopApp(): boolean {
  return isTauriEnv()
}

/**
 * 获取本地 API 基础 URL
 * 桌面端使用本地地址，浏览器端使用空字符串（走代理）
 */
export function getLocalApiBaseUrl(): string {
  return isTauriEnv() ? getRuntimeLocalApiBaseUrl() : ''
}

/**
 * 获取 public 静态资源的完整 URL
 * 生产环境从 OSS 加载，开发环境使用本地路径
 * @param path 资源路径，如 "logo.png"、"宣传图2.jpg"（不需要前导斜杠）
 */
export function getPublicUrl(path: string): string {
  const base = import.meta.env.VITE_BASE_URL || '/'
  // 生产环境 base 是 OSS URL，拼接 public/ 子路径
  if (base.startsWith('http')) {
    return `${base}public/${path}`
  }
  // 开发环境直接用本地路径
  return `/${path}`
}
