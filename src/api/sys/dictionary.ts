import request from '@/utils/http'

// ==================== 字典类型 ====================

/** 字典类型 */
export interface DictionaryType {
  id: number
  code: string
  name: string
  module?: string
  description?: string
  sort_order: number
  is_system: boolean
  is_enabled: boolean
  default_item_id?: number
  items_count?: number
  created_at: string
  updated_at: string
}

/** 字典类型创建参数 */
export interface DictionaryTypeCreateParams {
  code: string
  name: string
  module?: string
  description?: string
  sort_order?: number
  is_system?: boolean
  is_enabled?: boolean
  default_item_id?: number
}

/** 字典类型更新参数 */
export interface DictionaryTypeUpdateParams {
  code?: string
  name?: string
  module?: string
  description?: string
  sort_order?: number
  is_enabled?: boolean
  default_item_id?: number
}

/** 字典类型查询参数 */
export interface DictionaryTypeQueryParams {
  page?: number
  page_size?: number
  search?: string
  module?: string
  is_enabled?: boolean
}

// ==================== 字典项 ====================

/** 字典项 */
export interface DictionaryItem {
  id: number
  dictionary_type_id: number
  label: string
  value: string
  sort_order: number
  is_enabled: boolean
  description?: string
  extra_data?: string
  parent_id?: number
  created_at: string
  updated_at: string
  dictionary_type?: {
    id: number
    code: string
    name: string
  }
}

/** 字典项简单格式（用于下拉选择） */
export interface DictionaryItemSimple {
  label: string
  value: string
}

/** 字典项创建参数 */
export interface DictionaryItemCreateParams {
  dictionary_type_id: number
  label: string
  value: string
  sort_order?: number
  is_enabled?: boolean
  description?: string
  extra_data?: string
  parent_id?: number
}

/** 字典项更新参数 */
export interface DictionaryItemUpdateParams {
  dictionary_type_id?: number
  label?: string
  value?: string
  sort_order?: number
  is_enabled?: boolean
  description?: string
  extra_data?: string
  parent_id?: number
}

/** 字典项查询参数 */
export interface DictionaryItemQueryParams {
  page?: number
  page_size?: number
  dictionary_type_id?: number
  search?: string
  is_enabled?: boolean
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  pages: number
}

// ==================== 字典类型 API ====================

/** 获取所有模块列表 */
export function getDictionaryModulesApi() {
  return request.get<string[]>({
    url: '/api/dictionary/modules'
  })
}

/** 获取字典类型列表 */
export function getDictionaryTypesApi(params?: DictionaryTypeQueryParams) {
  return request.get<PaginatedResponse<DictionaryType>>({
    url: '/api/dictionary/types',
    params
  })
}

/** 获取字典类型详情 */
export function getDictionaryTypeApi(id: number) {
  return request.get<DictionaryType>({
    url: `/api/dictionary/types/${id}`
  })
}

/** 创建字典类型 */
export function createDictionaryTypeApi(data: DictionaryTypeCreateParams) {
  return request.post<DictionaryType>({
    url: '/api/dictionary/types',
    data
  })
}

/** 更新字典类型 */
export function updateDictionaryTypeApi(id: number, data: DictionaryTypeUpdateParams) {
  return request.put<DictionaryType>({
    url: `/api/dictionary/types/${id}`,
    data
  })
}

/** 删除字典类型 */
export function deleteDictionaryTypeApi(id: number) {
  return request.del({
    url: `/api/dictionary/types/${id}`
  })
}

// ==================== 字典项 API ====================

/** 获取字典项列表 */
export function getDictionaryItemsApi(params?: DictionaryItemQueryParams) {
  return request.get<PaginatedResponse<DictionaryItem>>({
    url: '/api/dictionary/items',
    params
  })
}

/** 根据类型编码获取字典项（用于下拉选择） */
export function getDictionaryItemsByTypeApi(typeCode: string) {
  return request.get<DictionaryItemSimple[]>({
    url: `/api/dictionary/items/by-type/${typeCode}`
  })
}

/** 获取字典项详情 */
export function getDictionaryItemApi(id: number) {
  return request.get<DictionaryItem>({
    url: `/api/dictionary/items/${id}`
  })
}

/** 创建字典项 */
export function createDictionaryItemApi(data: DictionaryItemCreateParams) {
  return request.post<DictionaryItem>({
    url: '/api/dictionary/items',
    data
  })
}

/** 更新字典项 */
export function updateDictionaryItemApi(id: number, data: DictionaryItemUpdateParams) {
  return request.put<DictionaryItem>({
    url: `/api/dictionary/items/${id}`,
    data
  })
}

/** 删除字典项 */
export function deleteDictionaryItemApi(id: number) {
  return request.del({
    url: `/api/dictionary/items/${id}`
  })
}

/** 启用/禁用字典项 */
export function toggleDictionaryItemApi(id: number) {
  return request.request({
    url: `/api/dictionary/items/${id}/toggle`,
    method: 'PATCH'
  })
}
