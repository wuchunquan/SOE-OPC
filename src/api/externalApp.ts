import type { ExternalApp, ExternalAppCreate, ExternalAppUpdate } from './types/externalApp'
import request from '@/utils/http'

/**
 * 获取外部应用列表
 */
export function getExternalApps(enabledOnly = false) {
  return request.get<ExternalApp[]>({
    url: '/api/external-apps',
    params: { enabled_only: enabledOnly }
  })
}

/**
 * 获取单个外部应用
 */
export function getExternalApp(id: number) {
  return request.get<ExternalApp>({
    url: `/api/external-apps/${id}`
  })
}

/**
 * 创建外部应用
 */
export function createExternalApp(data: ExternalAppCreate) {
  return request.post<ExternalApp>({
    url: '/api/external-apps',
    data
  })
}

/**
 * 更新外部应用
 */
export function updateExternalApp(id: number, data: ExternalAppUpdate) {
  return request.put<ExternalApp>({
    url: `/api/external-apps/${id}`,
    data
  })
}

/**
 * 删除外部应用
 */
export function deleteExternalApp(id: number) {
  return request.delete({
    url: `/api/external-apps/${id}`
  })
}
