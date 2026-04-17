/**
 * MCP 服务器配置 API
 * 支持远程模式（默认，走代理）和本地模式（指定 baseUrl）
 */
import http from '@/utils/http'
import { getLocalApiBaseUrl } from '@/utils/env'

export interface McpServer {
  id: number
  name: string
  description: string | null
  server_type: 'stdio' | 'sse'
  command: string | null
  args: string[] | null
  env: Record<string, string> | null
  url: string | null
  is_enabled: boolean
}

export interface McpServerCreate {
  name: string
  description?: string
  server_type: 'stdio' | 'sse'
  command?: string
  args?: string[]
  env?: Record<string, string>
  url?: string
  is_enabled?: boolean
}

export interface McpServerUpdate {
  name?: string
  description?: string
  server_type?: 'stdio' | 'sse'
  command?: string
  args?: string[]
  env?: Record<string, string>
  url?: string
  is_enabled?: boolean
}

export function createMcpApi(baseUrl: string = '') {
  const PREFIX = `${baseUrl}/api/agent/mcp-servers`

  function getMcpServers(): Promise<McpServer[]> {
    return http.get({ url: PREFIX })
  }

  function createMcpServer(data: McpServerCreate): Promise<McpServer> {
    return http.post({ url: PREFIX, data })
  }

  function updateMcpServer(id: number, data: McpServerUpdate): Promise<McpServer> {
    return http.put({ url: `${PREFIX}/${id}`, data })
  }

  function deleteMcpServer(id: number): Promise<void> {
    return http.del({ url: `${PREFIX}/${id}` })
  }

  return {
    getMcpServers,
    createMcpServer,
    updateMcpServer,
    deleteMcpServer,
  }
}

// 本地模式实例
export const localMcpApi = createMcpApi(getLocalApiBaseUrl())
