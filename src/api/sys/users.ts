import request from '@/utils/http'

// ==================== 类型定义 ====================

/** 角色信息 */
export interface RoleInfo {
  id: number
  name: string
  code: string
}

/** 部门信息 */
export interface DepartmentInfo {
  id: number
  name: string
}

/** 用户 */
export interface User {
  id: number
  username: string
  real_name?: string
  email?: string
  phone?: string
  avatar?: string
  department_id?: number
  department?: DepartmentInfo
  roles?: RoleInfo[]
  is_active: boolean
  last_login?: string
  newapi_user_id?: number
  created_at: string
  updated_at: string
}

/** 用户创建参数 */
export interface UserCreateParams {
  username: string
  password: string
  real_name?: string
  email?: string
  phone?: string
  department_id?: number
  role_ids?: number[]
  is_active?: boolean
}

/** 用户更新参数 */
export interface UserUpdateParams {
  real_name?: string
  email?: string
  phone?: string
  department_id?: number
  role_ids?: number[]
  is_active?: boolean
  avatar?: string
}

/** 用户查询参数 */
export interface UserQueryParams {
  page?: number
  page_size?: number
  search?: string
  department_id?: number
  role_id?: number
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

/** 获取用户列表 */
export function getUsersApi(params?: UserQueryParams) {
  return request.get<PaginatedResponse<User>>({
    url: '/api/users/',
    params
  })
}

/** 获取用户详情 */
export function getUserApi(userId: number) {
  return request.get<User>({
    url: `/api/users/${userId}`
  })
}

/** 创建用户 */
export function createUserApi(data: UserCreateParams) {
  return request.post<User>({
    url: '/api/users/',
    data
  })
}

/** 更新用户 */
export function updateUserApi(userId: number, data: UserUpdateParams) {
  return request.put<User>({
    url: `/api/users/${userId}`,
    data
  })
}

/** 删除用户 */
export function deleteUserApi(userId: number) {
  return request.del({
    url: `/api/users/${userId}`
  })
}

/** 重置用户密码 */
export function resetUserPasswordApi(userId: number, newPassword: string) {
  return request.post({
    url: `/api/users/${userId}/reset-password`,
    data: { new_password: newPassword }
  })
}

/** 获取用户权限 */
export function getUserPermissionsApi(userId: number) {
  return request.get<string[]>({
    url: `/api/users/${userId}/permissions`
  })
}

/** 设置用户角色 */
export function setUserRolesApi(userId: number, roleIds: number[]) {
  return request.post({
    url: `/api/users/${userId}/roles`,
    data: { role_ids: roleIds }
  })
}

// ==================== 导入相关 ====================

/** 员工导入验证结果 */
export interface UserImportValidationResult {
  row: number
  data: {
    employee_number: string
    real_name: string
    hire_date: string
    org_levels: string[]
    supervisor_name: string
    position: string
    position_category: string
    office_location: string
    gender: string
    birth_date: string
  }
  is_valid: boolean
  errors: string[]
  warnings: string[]
}

/** 员工导入验证响应 */
export interface UserImportValidationResponse {
  total: number
  valid: number
  error: number
  results: UserImportValidationResult[]
}

/** 员工导入执行响应 */
export interface UserImportExecuteResponse {
  success: number
  failed: number
  departments_created: number
  supervisor_failures: number
  message: string
  failed_items: Array<{
    row: number
    employee_number: string
    error: string
  }>
  supervisor_failure_details: Array<{
    employee_number: string
    supervisor_name: string
  }>
}

/** 下载员工导入模板 */
export function downloadUserImportTemplateApi() {
  return request.get({
    url: '/api/users/template/download',
    responseType: 'blob'
  })
}

/** 验证员工导入数据 */
export function validateUserImportApi(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return request.post<UserImportValidationResponse>({
    url: '/api/users/import/validate',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/** 执行员工导入 */
export function executeUserImportApi(validatedData: UserImportValidationResponse) {
  return request.post<UserImportExecuteResponse>({
    url: '/api/users/import/execute',
    data: validatedData
  })
}
