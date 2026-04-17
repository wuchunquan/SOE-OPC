import request from '@/utils/http'

// ==================== 类型定义 ====================

/** 权限 */
export interface Permission {
  id: number
  name: string
  code: string
  description?: string
  module?: string
  action?: string
  created_at: string
  updated_at: string
}

/** 权限创建参数 */
export interface PermissionCreateParams {
  name: string
  code: string
  description?: string
  module?: string
  action?: string
}

/** 权限更新参数 */
export interface PermissionUpdateParams {
  name?: string
  description?: string
  module?: string
  action?: string
}

/** 权限查询参数 */
export interface PermissionQueryParams {
  page?: number
  page_size?: number
  search?: string
  module?: string
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  pages: number
}

// ==================== API 接口 ====================

/** 获取权限列表 */
export function getPermissionsApi(params?: PermissionQueryParams) {
  return request.get<PaginatedResponse<Permission>>({
    url: '/api/permissions/',
    params
  })
}

/** 获取权限详情 */
export function getPermissionApi(permissionId: number) {
  return request.get<Permission>({
    url: `/api/permissions/${permissionId}`
  })
}

/** 创建权限 */
export function createPermissionApi(data: PermissionCreateParams) {
  return request.post<Permission>({
    url: '/api/permissions/',
    data
  })
}

/** 更新权限 */
export function updatePermissionApi(permissionId: number, data: PermissionUpdateParams) {
  return request.put<Permission>({
    url: `/api/permissions/${permissionId}`,
    data
  })
}

/** 删除权限 */
export function deletePermissionApi(permissionId: number) {
  return request.del({
    url: `/api/permissions/${permissionId}`
  })
}
