/**
 * 系统配置 API
 */
import request from '@/utils/http'

// ==================== 类型定义 ====================

export interface ConfigFieldOption {
  label: string
  value: string | number | boolean
}

export interface ConfigFieldRule {
  pattern?: string
  message: string
}

export interface ConfigFieldDefinition {
  key: string
  label: string
  type: string
  component: string
  required: boolean
  default?: any
  placeholder?: string
  help?: string
  encrypted?: boolean
  sensitive?: boolean
  min?: number
  max?: number
  step?: number
  options?: ConfigFieldOption[]
  rows?: number
  rules?: ConfigFieldRule[]
}

export interface ConfigDefinition {
  key: string
  label: string
  description?: string
  icon?: string
  group: string
  order: number
  fields: ConfigFieldDefinition[]
}

export interface ConfigValue {
  [key: string]: any
}

export interface ConfigWithDefinition {
  definition: ConfigDefinition
  value: ConfigValue
  updated_at?: string
}

export interface ConfigTestRequest {
  value: ConfigValue
}

export interface ConfigTestResponse {
  success: boolean
  message: string
  details?: Record<string, any>
}

// ==================== API 方法 ====================

/**
 * 获取所有配置定义
 */
export function getAllDefinitions() {
  return request.get<Record<string, ConfigDefinition>>({
    url: '/api/config/definitions'
  })
}

/**
 * 获取单个配置定义
 */
export function getDefinition(key: string) {
  return request.get<ConfigDefinition>({
    url: `/api/config/definitions/${key}`
  })
}

/**
 * 获取所有配置值
 */
export function getAllValues() {
  return request.get<Record<string, ConfigValue>>({
    url: '/api/config/values'
  })
}

/**
 * 获取单个配置值
 */
export function getValue(key: string) {
  return request.get<ConfigValue>({
    url: `/api/config/values/${key}`
  })
}

/**
 * 获取配置（包含定义和值）
 */
export function getConfig(key: string) {
  return request.get<ConfigWithDefinition>({
    url: `/api/config/${key}`
  })
}

/**
 * 更新配置
 */
export function updateConfig(key: string, value: ConfigValue) {
  return request.put({
    url: `/api/config/${key}`,
    data: { value }
  })
}

/**
 * 删除配置（重置为默认值）
 */
export function deleteConfig(key: string) {
  return request.del({
    url: `/api/config/${key}`
  })
}

/**
 * 测试配置
 */
export function testConfig(key: string, value: ConfigValue) {
  return request.post<ConfigTestResponse>({
    url: `/api/config/${key}/test`,
    data: { value }
  })
}
