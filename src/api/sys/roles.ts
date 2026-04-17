import request from '@/utils/http'

// ==================== 类型定义 ====================

/** 角色 */
export interface Role {
  id: number
  name: string
  code: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

/** 角色创建参数 */
export interface RoleCreateParams {
  name: string
  code: string
  description?: string
  permission_ids?: number[]
  is_active?: boolean
}

/** 角色更新参数 */
export interface RoleUpdateParams {
  name?: string
  description?: string
  permission_ids?: number[]
  is_active?: boolean
}

/** 角色查询参数 */
export interface RoleQueryParams {
  page?: number
  page_size?: number
  search?: string
  is_active?: boolean
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

/** 获取角色列表 */
export function getRolesApi(params?: RoleQueryParams) {
  return request.get<PaginatedResponse<Role>>({
    url: '/api/roles/',
    params
  })
}

/** 获取角色详情 */
export function getRoleApi(roleId: number) {
  return request.get<Role>({
    url: `/api/roles/${roleId}`
  })
}

/** 创建角色 */
export function createRoleApi(data: RoleCreateParams) {
  return request.post<Role>({
    url: '/api/roles/',
    data
  })
}

/** 更新角色 */
export function updateRoleApi(roleId: number, data: RoleUpdateParams) {
  return request.put<Role>({
    url: `/api/roles/${roleId}`,
    data
  })
}

/** 删除角色 */
export function deleteRoleApi(roleId: number) {
  return request.del({
    url: `/api/roles/${roleId}`
  })
}

/** 获取角色的权限ID列表 */
export function getRolePermissionsApi(roleId: number) {
  return request.get<number[]>({
    url: `/api/roles/${roleId}/permissions`
  })
}

/** 设置角色权限 */
export function setRolePermissionsApi(roleId: number, permissionIds: number[]) {
  return request.post({
    url: `/api/roles/${roleId}/permissions`,
    data: { permission_ids: permissionIds }
  })
}
