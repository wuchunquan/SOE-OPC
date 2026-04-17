import request from '@/utils/http'

// ==================== 类型定义 ====================

/** 简化的用户信息 */
export interface UserSimple {
  id: number
  username: string
  real_name?: string
  email?: string
  phone?: string
}

/** 部门 */
export interface Department {
  id: number
  name: string
  code: string
  parent_id?: number
  manager_id?: number
  manager?: UserSimple
  description?: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  children?: Department[]
}

/** 部门创建参数 */
export interface DepartmentCreateParams {
  name: string
  code: string
  parent_id?: number
  manager_id?: number
  description?: string
  sort_order?: number
  is_active?: boolean
}

/** 部门更新参数 */
export interface DepartmentUpdateParams {
  name?: string
  parent_id?: number
  manager_id?: number
  description?: string
  sort_order?: number
  is_active?: boolean
}

/** 部门查询参数 */
export interface DepartmentQueryParams {
  page?: number
  page_size?: number
  search?: string
  parent_id?: number
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

/** 获取部门列表 */
export function getDepartmentsApi(params?: DepartmentQueryParams) {
  return request.get<PaginatedResponse<Department>>({
    url: '/api/departments/',
    params
  })
}

/** 获取部门树形结构 */
export function getDepartmentTreeApi() {
  return request.get<Department[]>({
    url: '/api/departments/tree'
  })
}

/** 获取部门详情 */
export function getDepartmentApi(departmentId: number) {
  return request.get<Department>({
    url: `/api/departments/${departmentId}`
  })
}

/** 创建部门 */
export function createDepartmentApi(data: DepartmentCreateParams) {
  return request.post<Department>({
    url: '/api/departments/',
    data
  })
}

/** 更新部门 */
export function updateDepartmentApi(departmentId: number, data: DepartmentUpdateParams) {
  return request.put<Department>({
    url: `/api/departments/${departmentId}`,
    data
  })
}

/** 删除部门 */
export function deleteDepartmentApi(departmentId: number) {
  return request.del({
    url: `/api/departments/${departmentId}`
  })
}

// ==================== 导入相关 ====================

/** 导入验证结果 */
export interface ImportValidationResult {
  row: number
  data: any
  errors: string[]
  is_valid: boolean
}

/** 导入验证响应 */
export interface ImportValidationResponse {
  total: number
  valid: number
  error: number
  results: ImportValidationResult[]
}

/** 导入执行响应 */
export interface ImportExecuteResponse {
  success: number
  failed: number
  failed_items: Array<{ row: number; error: string }>
  message: string
}

/** 下载导入模板 */
export function downloadDepartmentTemplateApi() {
  return request.get({
    url: '/api/departments/template/download',
    responseType: 'blob'
  })
}

/** 验证导入数据 */
export function validateDepartmentImportApi(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return request.post<ImportValidationResponse>({
    url: '/api/departments/import/validate',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/** 执行导入 */
export function executeDepartmentImportApi(validatedData: ImportValidationResponse) {
  return request.post<ImportExecuteResponse>({
    url: '/api/departments/import/execute',
    data: validatedData
  })
}
