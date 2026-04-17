/**
 * AI Agent API 服务
 *
 * 使用工厂模式，agent 和 agentLocal 各自创建独立实例，互不影响。
 */
import http from '@/utils/http'
import { useUserStore } from '@/store/modules/user'
import type {
  AgentSession,
  CreateSessionRequest,
  UpdateSessionRequest,
  MessagesListResponse,
  StreamEvent,
  ChatUser
} from './types'

/**
 * 创建 Agent API 实例
 * @param baseUrl API 基础地址，默认空字符串（走代理），agentLocal 传 'http://127.0.0.1:8766'
 */
export function createAgentApi(baseUrl: string = '') {
  /** 拼接 base URL */
  const u = (path: string) => `${baseUrl}${path}`

  function createSession(data?: CreateSessionRequest): Promise<AgentSession> {
    return http.post({ url: u('/api/agent/sessions'), data: data || {} })
  }

  function getSessions(limit = 100, type?: 'ai' | 'chat'): Promise<AgentSession[]> {
    return http.get({ url: u('/api/agent/sessions'), params: { limit, type } })
  }

  function getSession(sessionId: string): Promise<AgentSession> {
    return http.get({ url: u(`/api/agent/sessions/${sessionId}`) })
  }

  function updateSession(sessionId: string, data: UpdateSessionRequest): Promise<AgentSession> {
    return http.request({ url: u(`/api/agent/sessions/${sessionId}`), method: 'PATCH', data })
  }

  function deleteSession(sessionId: string): Promise<void> {
    return http.del({ url: u(`/api/agent/sessions/${sessionId}`) })
  }

  function getMessages(sessionId: string, limit = 50, offset = 0): Promise<MessagesListResponse> {
    return http.get({ url: u(`/api/agent/sessions/${sessionId}/messages`), params: { limit, offset } })
  }

  async function sendMessageStream(
    sessionId: string,
    message: string,
    model: string,
    onEvent: (event: StreamEvent) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const { accessToken } = useUserStore()

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }

    const response = await fetch(u(`/api/agent/sessions/${sessionId}/messages/stream`), {
      method: 'POST',
      headers,
      body: JSON.stringify({ message, model }),
      signal
    })

    if (!response.ok) {
      let errorText = ""
      try {
        const errorData = await response.json()
        errorText = errorData?.detail || response.statusText
      } catch (e) {
        console.log('Failed to parse error response as JSON:', e)
      }
      throw new Error(`${response.status} ${errorText}`)
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) {
      throw new Error('Response body is null')
    }

    try {
      let buffer = ''
      let sawTerminalEvent = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            try {
              const event: StreamEvent = JSON.parse(data)
              onEvent(event)
              if (event.type === 'end' || event.type === 'error') {
                sawTerminalEvent = true
                return
              }
            } catch (e) {
              console.error('Failed to parse SSE event:', e, data.substring(0, 200))
            }
          }
        }
      }
      if (!sawTerminalEvent) {
        onEvent({ type: 'end' } as StreamEvent)
      }
    } finally {
      reader.releaseLock()
    }
  }

  function deleteMessage(messageId: string): Promise<void> {
    return http.del({ url: u(`/api/agent/messages/${messageId}`) })
  }

  function recallMessage(messageId: string): Promise<void> {
    return http.post({ url: u(`/api/agent/messages/${messageId}/recall`) })
  }

  function stopGeneration(sessionId: string): Promise<void> {
    return http.post({ url: u(`/api/agent/sessions/${sessionId}/stop`) })
  }

  function applyRole(sessionId: string, roleId: string): Promise<void> {
    return http.post({ url: u(`/api/agent/sessions/${sessionId}/role`), data: { role_id: roleId } })
  }

  function createChatSession(chatWithUserId: number, name?: string): Promise<AgentSession> {
    return http.post({ url: u('/api/agent/chat/sessions'), data: { chat_with_user_id: chatWithUserId, name } })
  }

  function getChatUsers(): Promise<ChatUser[]> {
    return http.get({ url: u('/api/agent/chat/users') })
  }

  function markSessionRead(sessionId: string): Promise<void> {
    return http.post({ url: u(`/api/agent/chat/sessions/${sessionId}/mark-read`) })
  }

  function clearSessionMessages(sessionId: string): Promise<void> {
    return http.post({ url: u(`/api/agent/sessions/${sessionId}/clear`) })
  }

  function getPendingApproval(sessionId: string): Promise<{ pending: boolean; approval: any }> {
    return http.get({ url: u(`/api/agent/sessions/${sessionId}/pending-approval`) })
  }

  function respondToolApproval(sessionId: string, approved: boolean, answers?: Record<string, any>, reason?: string): Promise<{ success: boolean }> {
    return http.post({ url: u(`/api/agent/sessions/${sessionId}/tool-approval`), data: { approved, answers, reason } })
  }

  function getGenerationStatus(sessionId: string): Promise<{ generating: boolean }> {
    return http.get({ url: u(`/api/agent/sessions/${sessionId}/generation-status`) })
  }

  async function reconnectStream(
    sessionId: string,
    lastEventId: number,
    onEvent: (event: StreamEvent) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const { accessToken } = useUserStore()

    const headers: Record<string, string> = {}
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }

    const response = await fetch(u(`/api/agent/sessions/${sessionId}/reconnect-stream?last_event_id=${lastEventId}`), {
      method: 'GET',
      headers,
      signal
    })

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`)
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) {
      throw new Error('Response body is null')
    }

    try {
      let buffer = ''
      let sawTerminalEvent = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            try {
              const event: StreamEvent = JSON.parse(data)
              onEvent(event)
              if (event.type === 'end' || event.type === 'error') {
                sawTerminalEvent = true
                return
              }
            } catch (e) {
              // ignore parse errors
            }
          }
        }
      }
      if (!sawTerminalEvent) {
        onEvent({ type: 'end' } as StreamEvent)
      }
    } finally {
      reader.releaseLock()
    }
  }

  return {
    createSession,
    getSessions,
    getSession,
    updateSession,
    deleteSession,
    getMessages,
    sendMessageStream,
    deleteMessage,
    recallMessage,
    stopGeneration,
    applyRole,
    createChatSession,
    getChatUsers,
    markSessionRead,
    clearSessionMessages,
    getPendingApproval,
    respondToolApproval,
    getGenerationStatus,
    reconnectStream
  }
}

// agent 默认实例（走代理，baseUrl 为空）
const defaultApi = createAgentApi('')

export const {
  createSession,
  getSessions,
  getSession,
  updateSession,
  deleteSession,
  getMessages,
  sendMessageStream,
  deleteMessage,
  recallMessage,
  stopGeneration,
  applyRole,
  createChatSession,
  getChatUsers,
  markSessionRead,
  clearSessionMessages,
  getPendingApproval,
  respondToolApproval,
  getGenerationStatus,
  reconnectStream
} = defaultApi
