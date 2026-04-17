/**
 * AI 模型提供商 API
 * 支持远程模式（默认，走代理）和本地模式（指定 baseUrl）
 */
import http from '@/utils/http'
import { getLocalApiBaseUrl } from '@/utils/env'

export interface ModelConfig {
  id: number
  name: string
  model_id: string
  is_default: boolean
}

export interface Provider {
  id: number
  name: string
  api_key: string
  base_url: string
  is_default: boolean
  models: ModelConfig[]
}

export interface ProviderCreate {
  name: string
  api_key: string
  base_url: string
  is_default?: boolean
  models?: { name: string; model_id: string; is_default?: boolean }[]
}

export interface ProviderUpdate {
  name?: string
  api_key?: string
  base_url?: string
  is_default?: boolean
}

export function createProviderApi(baseUrl: string = '') {
  const PREFIX = `${baseUrl}/api/agent/providers`

  function getProviders(): Promise<Provider[]> {
    return http.get({ url: PREFIX })
  }

  function createProvider(data: ProviderCreate): Promise<Provider> {
    return http.post({ url: PREFIX, data })
  }

  function updateProvider(id: number, data: ProviderUpdate): Promise<Provider> {
    return http.put({ url: `${PREFIX}/${id}`, data })
  }

  function deleteProvider(id: number): Promise<void> {
    return http.del({ url: `${PREFIX}/${id}` })
  }

  function setDefaultProvider(id: number): Promise<void> {
    return http.post({ url: `${PREFIX}/${id}/set-default` })
  }

  function addModel(providerId: number, data: { name: string; model_id: string; is_default?: boolean }): Promise<ModelConfig> {
    return http.post({ url: `${PREFIX}/${providerId}/models`, data })
  }

  function deleteModel(providerId: number, modelId: number): Promise<void> {
    return http.del({ url: `${PREFIX}/${providerId}/models/${modelId}` })
  }

  function setDefaultModel(providerId: number, modelId: number): Promise<void> {
    return http.post({ url: `${PREFIX}/${providerId}/models/${modelId}/set-default` })
  }

  return {
    getProviders,
    createProvider,
    updateProvider,
    deleteProvider,
    setDefaultProvider,
    addModel,
    deleteModel,
    setDefaultModel,
  }
}

// 远程模式默认实例
const defaultApi = createProviderApi('')
export const {
  getProviders,
  createProvider,
  updateProvider,
  deleteProvider,
  setDefaultProvider,
  addModel,
  deleteModel,
  setDefaultModel,
} = defaultApi

// 本地模式实例
export const localProviderApi = createProviderApi(getLocalApiBaseUrl())
