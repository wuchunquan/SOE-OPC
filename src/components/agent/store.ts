/**
 * AI Agent Pinia Store
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AgentMessage, AgentSession, ContentBlock } from './types'
import * as defaultAgentApi from './api'
import { ElMessage } from 'element-plus'
import { notifyChatMessage } from '@/utils/notification'
import { useUserStore } from '@/store/modules/user'

type AgentApiModule = typeof defaultAgentApi

/**
 * 创建 Agent Store 工厂函数
 * @param storeId Pinia store ID
 * @param agentApi API 模块实例
 */
export function createAgentStore(storeId: string, agentApi: AgentApiModule) {
  return defineStore(storeId, () => {
  // ==================== 状态 ====================

  // AI 会话列表和状态
  const aiSessions = ref<AgentSession[]>([])
  const currentAiSession = ref<string | null>(null)
  const aiMessages = ref<AgentMessage[]>([])
  const aiStreamingMessage = ref<AgentMessage | null>(null)
  const aiHasMoreMessages = ref(false)

  // 内部聊天会话列表和状态
  const chatSessions = ref<AgentSession[]>([])
  const currentChatSession = ref<string | null>(null)
  const chatMessages = ref<AgentMessage[]>([])
  const chatStreamingMessage = ref<AgentMessage | null>(null)
  const chatHasMoreMessages = ref(false)

  // 会话类型过滤器：'ai' 或 'chat'
  const sessionTypeFilter = ref<'ai' | 'chat'>('ai')

  // 共享状态
  const isStreaming = ref(false)
  const systemStatus = ref<{ status: string; message: string } | null>(null)

  // 模型选择：'fast'=sonnet, 'deep'=opus
  const currentModelType = ref<'fast' | 'deep'>('fast')

  // 自动继续配置
  const autoContinueConfig = ref({
    enabled: false,
    interval: 5, // 秒
    message: '继续'
  })
  const autoContinueStatus = ref<{ waiting: boolean; message: string } | null>(null)
  let autoContinueTimer: number | null = null

  // 工具审批状态
  const pendingApproval = ref<{ tool_name: string; input_data: Record<string, any> } | null>(null)

  // 计划审批状态
  const pendingPlan = ref<{ plan: string } | null>(null)

  // 输入锁定状态：生成中或等待用户处理审批/计划
  const inputLocked = computed(() => {
    return isStreaming.value || !!pendingApproval.value || !!pendingPlan.value
  })

  // 字符队列（逐字显示）
  const charQueue = ref<string[]>([])
  let typingTimer: number | null = null

  // thinking 字符队列（逐字显示）
  const thinkingCharQueue = ref<string[]>([])
  let thinkingTypingTimer: number | null = null

  // 流式请求控制器
  let abortController: AbortController | null = null

  // 流式工具调用追踪
  let currentStreamingToolIndex = -1  // 当前流式工具在 content 数组中的索引
  let streamingToolRawJson = ''       // 累积的原始 JSON 字符串
  let toolDeltaThrottleTimer: number | null = null  // 节流定时器

  /**
   * 尝试解析部分 JSON（用于流式工具调用）
   */
  const tryParsePartialJson = (raw: string): Record<string, any> | null => {
    // 直接解析
    try { return JSON.parse(raw) } catch {}
    // 尝试常见的闭合方式
    const closers = ['"}', '}', '"}}', '}}']
    for (const closer of closers) {
      try { return JSON.parse(raw + closer) } catch {}
    }
    return null
  }

  // ==================== 计算属性 ====================

  // 当前会话列表（根据过滤器类型返回对应的会话列表）
  const sessions = computed(() => {
    return sessionTypeFilter.value === 'ai' ? aiSessions.value : chatSessions.value
  })

  // 当前会话 ID（根据过滤器类型返回对应的当前会话）
  const currentSession = computed(() => {
    return sessionTypeFilter.value === 'ai' ? currentAiSession.value : currentChatSession.value
  })

  // 当前会话信息
  const currentSessionInfo = computed(() => {
    if (!currentSession.value) return null
    return sessions.value.find((s) => s.session_id === currentSession.value)
  })

  // AI 会话专用的当前会话信息（浮窗使用）
  const currentAiSessionInfo = computed(() => {
    if (!currentAiSession.value) return null
    return aiSessions.value.find((s) => s.session_id === currentAiSession.value)
  })

  // 聊天会话专用的当前会话信息
  const currentChatSessionInfo = computed(() => {
    if (!currentChatSession.value) return null
    return chatSessions.value.find((s) => s.session_id === currentChatSession.value)
  })

  // 消息列表（根据过滤器类型返回对应的消息列表）
  const messages = computed(() => {
    return sessionTypeFilter.value === 'ai' ? aiMessages.value : chatMessages.value
  })

  // 流式消息（根据过滤器类型返回对应的流式消息）
  const streamingMessage = computed(() => {
    return sessionTypeFilter.value === 'ai' ? aiStreamingMessage.value : chatStreamingMessage.value
  })

  // 是否有更多消息（根据过滤器类型返回对应的标志）
  const hasMoreMessages = computed(() => {
    return sessionTypeFilter.value === 'ai' ? aiHasMoreMessages.value : chatHasMoreMessages.value
  })

  // 过滤后的会话列表（已经通过 sessions 计算属性过滤）
  const filteredSessions = computed(() => {
    return sessions.value
  })

  // 设置会话类型过滤器
  const setSessionTypeFilter = async (type: 'ai' | 'chat') => {
    sessionTypeFilter.value = type
    // 切换类型时自动加载对应的会话列表
    await loadSessions()
  }

  // 当前模型名称
  const currentModel = computed(() => {
    return currentModelType.value === 'fast' ? 'sonnet' : 'opus'
  })

  // 设置模型类型
  const setModelType = (type: 'fast' | 'deep') => {
    currentModelType.value = type
  }

  // ==================== 会话管理 ====================

  /**
   * 创建新会话（AI 会话）
   */
  const createNewSession = async (name?: string) => {
    try {
      const session = await agentApi.createSession({ name })
      currentAiSession.value = session.session_id
      aiMessages.value = []
      aiStreamingMessage.value = null

      // 刷新会话列表
      await loadSessions()

      return session
    } catch (error: any) {
      ElMessage.error('创建会话失败: ' + error.message)
      throw error
    }
  }

  /**
   * 创建新会话并应用角色（AI 会话）
   */
  const createSessionWithRole = async (roleId: string, name?: string) => {
    try {
      // 创建会话
      const session = await agentApi.createSession({ name })

      // 应用角色
      await agentApi.applyRole(session.session_id, roleId)

      // 切换到新会话
      currentAiSession.value = session.session_id
      aiMessages.value = []
      aiStreamingMessage.value = null

      // 刷新会话列表
      await loadSessions()

      // ElMessage.success('会话创建成功')
      return session
    } catch (error: any) {
      ElMessage.error('创建会话失败: ' + error.message)
      throw error
    }
  }

  /**
   * 加载 AI 会话列表
   */
  const loadAiSessions = async () => {
    try {
      aiSessions.value = await agentApi.getSessions(100, 'ai')
    } catch (error: any) {
      ElMessage.error('加载AI会话列表失败: ' + error.message)
    }
  }

  /**
   * 加载内部聊天会话列表
   */
  const loadChatSessions = async () => {
    try {
      chatSessions.value = await agentApi.getSessions(100, 'chat')
    } catch (error: any) {
      ElMessage.error('加载聊天会话列表失败: ' + error.message)
    }
  }

  /**
   * 加载会话列表（根据当前类型）
   */
  const loadSessions = async () => {
    if (sessionTypeFilter.value === 'ai') {
      await loadAiSessions()
    } else {
      await loadChatSessions()
    }
  }

  /**
   * 切换会话
   */
  const switchSession = async (sessionId: string) => {
    // 通过搜索两个列表来判断会话类型
    let session = aiSessions.value.find(s => s.session_id === sessionId)
    let isAiSession = true

    if (!session) {
      session = chatSessions.value.find(s => s.session_id === sessionId)
      isAiSession = false
    }

    if (!session) return

    // 检查是否已经是当前会话
    if (isAiSession && currentAiSession.value === sessionId) return
    if (!isAiSession && currentChatSession.value === sessionId) return

    // 根据会话类型设置到对应的状态
    if (isAiSession) {
      currentAiSession.value = sessionId
      aiMessages.value = []
      aiStreamingMessage.value = null
      aiHasMoreMessages.value = false
    } else {
      currentChatSession.value = sessionId
      chatMessages.value = []
      chatStreamingMessage.value = null
      chatHasMoreMessages.value = false
    }

    // 加载消息
    await loadMessages(sessionId, isAiSession)

    // 标记会话已读（仅对内部聊天会话）
    if (!isAiSession && (session.unread_count || 0) > 0) {
      await markSessionAsRead(sessionId)
    }
  }

  /**
   * 加载单个会话并切换（用于独立会话窗口模式，避免加载全部会话列表）
   */
  const loadAndSwitchToSession = async (sessionId: string, sessionType: 'ai' | 'chat') => {
    try {
      // 从 API 获取单个会话详情
      const session = await agentApi.getSession(sessionId)
      if (!session) {
        throw new Error('会话不存在')
      }

      const isAiSession = sessionType === 'ai'

      // 将会话添加到对应的列表中
      if (isAiSession) {
        aiSessions.value = [session]
        currentAiSession.value = sessionId
        aiMessages.value = []
        aiStreamingMessage.value = null
        aiHasMoreMessages.value = false
      } else {
        chatSessions.value = [session]
        currentChatSession.value = sessionId
        chatMessages.value = []
        chatStreamingMessage.value = null
        chatHasMoreMessages.value = false
      }

      // 加载消息
      await loadMessages(sessionId, isAiSession)

      // 标记会话已读（仅对内部聊天会话）
      if (!isAiSession && (session.unread_count || 0) > 0) {
        await markSessionAsRead(sessionId)
      }
    } catch (error: any) {
      console.error('加载会话失败:', error)
      throw error
    }
  }

  /**
   * 删除会话
   */
  const deleteSession = async (sessionId: string) => {
    try {
      // 通过搜索两个列表来判断会话类型
      let session = aiSessions.value.find(s => s.session_id === sessionId)
      let isAi = true

      if (!session) {
        session = chatSessions.value.find(s => s.session_id === sessionId)
        isAi = false
      }

      await agentApi.deleteSession(sessionId)

      // 如果删除的是当前会话，清空对应的状态
      if (isAi && currentAiSession.value === sessionId) {
        currentAiSession.value = null
        aiMessages.value = []
      } else if (!isAi && currentChatSession.value === sessionId) {
        currentChatSession.value = null
        chatMessages.value = []
      }

      // 重新加载会话列表
      await loadSessions()

      // 如果删除的是当前会话，尝试切换到同类型的第一个会话
      if ((isAi && !currentAiSession.value) || (!isAi && !currentChatSession.value)) {
        const sameTypeSessions = isAi ? aiSessions.value : chatSessions.value
        if (sameTypeSessions.length > 0) {
          await switchSession(sameTypeSessions[0].session_id)
        }
      }

      ElMessage.success('会话已删除')
    } catch (error: any) {
      ElMessage.error('删除会话失败: ' + error.message)
    }
  }

  /**
   * 更新会话配置
   */
  const updateSessionConfig = async (sessionId: string, config: Record<string, any>) => {
    try {
      await agentApi.updateSession(sessionId, { config })
      // 更新本地会话数据
      const session = aiSessions.value.find(s => s.session_id === sessionId)
        || chatSessions.value.find(s => s.session_id === sessionId)
      if (session) {
        session.config = { ...session.config, ...config }
      }
    } catch (error: any) {
      ElMessage.error('更新配置失败: ' + error.message)
    }
  }

  /**
   * 响应工具审批
   */
  const respondToolApproval = async (approved: boolean, answers?: Record<string, any>, reason?: string) => {
    const sessionId = currentAiSession.value
    if (!sessionId) return
    try {
      await agentApi.respondToolApproval(sessionId, approved, answers, reason)
      pendingApproval.value = null
      pendingPlan.value = null
    } catch (error: any) {
      ElMessage.error('审批响应失败: ' + error.message)
    }
  }

  /**
   * 检查是否有待审批的工具请求（页面加载时调用）
   */
  const checkPendingApproval = async (sessionId?: string) => {
    const targetId = sessionId || currentAiSession.value
    if (!targetId) return
    try {
      const result = await agentApi.getPendingApproval(targetId)
      if (result.pending && result.approval) {
        pendingApproval.value = result.approval
      } else {
        pendingApproval.value = null
      }
    } catch {
      // 忽略错误
    }
  }

  /**
   * 检查会话是否正在生成中，如果是则通过 SSE 重连恢复流式输出
   */
  let reconnectAbortController: AbortController | null = null

  const checkAndPollGeneration = async (sessionId?: string) => {
    const targetId = sessionId || currentAiSession.value
    if (!targetId) return

    try {
      const result = await agentApi.getGenerationStatus(targetId)
      if (result.generating) {
        // 后端正在生成，通过 SSE 重连恢复流式输出
        isStreaming.value = true

        // 创建流式消息容器
        aiStreamingMessage.value = {
          id: Date.now() + 1,
          message_id: `reconnect-${Date.now()}`,
          session_id: targetId,
          role: 'assistant',
          type: 'assistant',
          content: [],
          timestamp: new Date(),
          status: 'streaming'
        }

        reconnectAbortController = new AbortController()

        try {
          await agentApi.reconnectStream(
            targetId,
            0, // 从头开始重放（重建完整状态）
            handleStreamEvent,
            reconnectAbortController.signal
          )
        } catch (error: any) {
          if (error.name !== 'AbortError') {
            console.error('SSE 重连失败:', error)
          }
        } finally {
          reconnectAbortController = null
        }
      }
    } catch {
      // 忽略错误
    }
  }

  const stopGenerationPolling = () => {
    if (reconnectAbortController) {
      reconnectAbortController.abort()
      reconnectAbortController = null
    }
  }

  // ==================== 消息管理 ====================

  /**
   * 加载消息
   */
  const loadMessages = async (sessionId?: string, isAiSession?: boolean, limit = 50, offset = 0) => {
    const targetSessionId = sessionId || currentSession.value
    if (!targetSessionId) return

    // 如果未指定会话类型，自动判断
    let targetIsAi = isAiSession
    if (targetIsAi === undefined) {
      const session = sessions.value.find(s => s.session_id === targetSessionId)
      targetIsAi = session?.type === 'ai'
    }

    try {
      const response = await agentApi.getMessages(targetSessionId, limit, offset)

      // 根据会话类型更新对应的消息列表
      if (targetIsAi) {
        if (offset === 0) {
          aiMessages.value = response.messages
        } else {
          aiMessages.value.unshift(...response.messages)
        }
        aiHasMoreMessages.value = response.has_more
      } else {
        if (offset === 0) {
          chatMessages.value = response.messages
        } else {
          chatMessages.value.unshift(...response.messages)
        }
        chatHasMoreMessages.value = response.has_more
      }
    } catch (error: any) {
      ElMessage.error('加载消息失败: ' + error.message)
    }
  }

  /**
   * 加载更多消息
   */
  const loadMoreMessages = async () => {
    if (!currentSession.value || !hasMoreMessages.value) return

    const isAi = sessionTypeFilter.value === 'ai'
    const currentOffset = messages.value.length
    await loadMessages(currentSession.value, isAi, 50, currentOffset)
  }

  /**
   * 从消息列表中移除指定消息
   */
  const removeMessage = (messageId: string) => {
    const isAi = sessionTypeFilter.value === 'ai'

    if (isAi) {
      // 从 AI 消息列表中移除
      const index = aiMessages.value.findIndex(m => m.message_id === messageId)
      if (index !== -1) {
        aiMessages.value.splice(index, 1)
      }
    } else {
      // 从内部聊天消息列表中移除
      const index = chatMessages.value.findIndex(m => m.message_id === messageId)
      if (index !== -1) {
        chatMessages.value.splice(index, 1)
      }
    }
  }

  /**
   * 撤回消息（内部聊天，10分钟内）
   */
  const recallMessage = async (messageId: string) => {
    try {
      await agentApi.recallMessage(messageId)
      // 从本地消息列表中移除
      removeMessage(messageId)
      ElMessage.success('消息已撤回')
    } catch (error: any) {
      ElMessage.error('撤回失败: ' + error.message)
      throw error
    }
  }

  /**
   * 发送消息
   */
  const sendMessage = async (content: string, files: any[] = []) => {
    // 取消自动继续定时器（用户手动发送时）
    cancelAutoContinue()

    if (inputLocked.value) {
      ElMessage.warning('请先处理当前审批或等待当前任务完成')
      return
    }

    if (!currentSession.value) {
      // 如果没有当前会话，创建一个新会话
      await createNewSession()
    }

    if (!currentSession.value) return

    // 获取当前会话信息
    const session = sessions.value.find(s => s.session_id === currentSession.value)

    // 根据会话类型路由消息发送
    if (session && session.type === 'chat') {
      // 内部聊天：通过 WebSocket 发送
      await sendChatMessageInternal(content)
    } else {
      // AI 会话：通过 HTTP 流式发送
      await sendAIMessage(content, files)
    }
  }

  /**
   * 发送 AI 消息（原逻辑）
   */
  const sendAIMessage = async (content: string, files: any[] = []) => {
    if (!currentSession.value) return

    // 构建用户消息内容块（现在content已经包含@文件路径引用了）
    const userContentBlocks: any[] = [{ type: 'text', text: content }]

    // 添加用户消息到 UI
    const userMessage: AgentMessage = {
      id: Date.now(),
      message_id: `user-${Date.now()}`,
      session_id: currentSession.value,
      role: 'user',
      type: 'text',
      content: userContentBlocks,
      timestamp: new Date(),
      status: 'completed'
    }
    aiMessages.value.push(userMessage)

    // 更新会话列表中的最新消息预览
    const session = aiSessions.value.find(s => s.session_id === currentSession.value)
    if (session) {
      session.last_message = content
      session.last_activity = new Date()
    }

    // 创建流式消息容器
    aiStreamingMessage.value = {
      id: Date.now() + 1,
      message_id: `streaming-${Date.now()}`,
      session_id: currentSession.value,
      role: 'assistant',
      type: 'assistant',
      content: [],
      timestamp: new Date(),
      status: 'streaming'
    }

    isStreaming.value = true

    // 创建新的 AbortController
    abortController = new AbortController()

    try {
      // 发送请求并处理流式响应（content已包含@文件引用）
      await agentApi.sendMessageStream(currentSession.value, content, currentModel.value, handleStreamEvent, abortController.signal)
    } catch (error: any) {
      // 如果是用户主动中止，不显示错误
      if (error.name !== 'AbortError') {
        aiMessages.value = aiMessages.value.filter(m => m.message_id !== userMessage.message_id)
        console.log('发送消息失败:', error)
        ElMessage.error('发送消息失败: ' + error.message)
      }
      isStreaming.value = false
      aiStreamingMessage.value = null
    } finally {
      abortController = null
    }
  }

  /**
   * 发送内部聊天消息（通过 WebSocket）
   */
  const sendChatMessageInternal = async (content: string) => {
    if (!currentSession.value) return

    const { websocketClient } = await import('./websocket')
    const { useUserStore } = await import('@/store/modules/user')
    const userStore = useUserStore()

    // 添加用户消息到 UI（乐观更新）
    // 注意：不填充 sender_id 和 sender_name，让前端显示当前用户信息
    const userMessage: AgentMessage = {
      id: Date.now(),
      message_id: `user-${Date.now()}`,
      session_id: currentSession.value,
      role: 'user',
      type: 'text',
      content: [{ type: 'text', text: content }],
      timestamp: new Date(),
      status: 'completed'
    }
    chatMessages.value.push(userMessage)

    // 更新会话列表中的最新消息预览
    const session = chatSessions.value.find(s => s.session_id === currentSession.value)
    if (session) {
      session.last_message = content
      session.last_activity = new Date()
    }

    // 通过 WebSocket 发送
    const success = await websocketClient.sendChatMessage(currentSession.value, content)
    if (!success) {
      ElMessage.error('发送消息失败，请检查网络连接')
      // 可以考虑移除刚添加的消息
      chatMessages.value = chatMessages.value.filter(m => m.message_id !== userMessage.message_id)
    }
  }

  /**
   * 停止生成
   */
  const stopGeneration = async () => {
    if (!currentSession.value) return

    // 取消自动继续定时器
    cancelAutoContinue()

    try {
      // 1. 调用后端停止接口，使用 client.interrupt() 真正中断生成
      await agentApi.stopGeneration(currentSession.value)
    } catch (error) {
      console.error('调用停止接口失败:', error)
    }

    // 2. 中止前端的 fetch 请求
    if (abortController) {
      abortController.abort()
      abortController = null
    }

    // 3. 清除字符队列和定时器
    charQueue.value = []
    currentStreamingToolIndex = -1
    streamingToolRawJson = ''
    if (toolDeltaThrottleTimer !== null) {
      clearTimeout(toolDeltaThrottleTimer)
      toolDeltaThrottleTimer = null
    }
    if (typingTimer !== null) {
      clearTimeout(typingTimer)
      typingTimer = null
    }

    // 4. 清除工具审批状态和计划审批状态
    pendingApproval.value = null
    pendingPlan.value = null

    // 5. 完成当前流式消息
    if (aiStreamingMessage.value) {
      finalizeStreamingMessage()
    }

    isStreaming.value = false
  }

  /**
   * 处理流式事件（AI 会话）
   */
  const handleStreamEvent = (event: any) => {
    if (!aiStreamingMessage.value) return

    switch (event.type) {
      case 'text_token':
        // 添加字符到队列
        if (event.token || event.text) {
          addCharsToQueue(event.token || event.text)
        }
        break

      case 'tool_use':
        // 工具调用（兜底：未经流式发送的完整工具调用）
        flushCharQueue()
        aiStreamingMessage.value.content.push({
          type: 'tool_use',
          tool_name: event.tool_name,
          tool_input: event.tool_input
        })
        // 触发响应式更新
        aiStreamingMessage.value = { ...aiStreamingMessage.value }
        break

      case 'tool_use_start':
        // 流式工具调用开始 - 先清空字符队列再插入工具块
        flushCharQueue()
        aiStreamingMessage.value.content.push({
          type: 'tool_use',
          tool_name: event.tool_name,
          tool_input: {}
        })
        currentStreamingToolIndex = aiStreamingMessage.value.content.length - 1
        streamingToolRawJson = ''
        aiStreamingMessage.value = { ...aiStreamingMessage.value }
        break

      case 'tool_use_delta':
        // 流式工具调用增量 - 累积 JSON 并节流解析
        if (currentStreamingToolIndex >= 0 && aiStreamingMessage.value) {
          streamingToolRawJson += (event.partial_json || '')
          // 节流：每 100ms 最多解析一次，避免频繁重渲染
          if (toolDeltaThrottleTimer === null) {
            toolDeltaThrottleTimer = window.setTimeout(() => {
              toolDeltaThrottleTimer = null
              if (currentStreamingToolIndex >= 0 && aiStreamingMessage.value) {
                const parsed = tryParsePartialJson(streamingToolRawJson)
                if (parsed) {
                  aiStreamingMessage.value.content[currentStreamingToolIndex].tool_input = parsed
                  aiStreamingMessage.value = { ...aiStreamingMessage.value }
                }
              }
            }, 100)
          }
        }
        break

      case 'tool_use_done':
        // 流式工具调用完成 - 设置最终的 tool_input
        if (toolDeltaThrottleTimer !== null) {
          clearTimeout(toolDeltaThrottleTimer)
          toolDeltaThrottleTimer = null
        }
        if (currentStreamingToolIndex >= 0 && aiStreamingMessage.value) {
          aiStreamingMessage.value.content[currentStreamingToolIndex].tool_input = event.tool_input
          aiStreamingMessage.value = { ...aiStreamingMessage.value }
        }
        currentStreamingToolIndex = -1
        streamingToolRawJson = ''
        break

      case 'tool_result':
        // 工具结果
        flushCharQueue()
        aiStreamingMessage.value.content.push({
          type: 'tool_result',
          tool_result: event.content
        })
        aiStreamingMessage.value = { ...aiStreamingMessage.value }
        break

      case 'thinking_start':
        // thinking 块开始
        break

      case 'thinking_token':
        // 处理 thinking 流式输出 - 使用字符队列实现逐字符显示
        if (aiStreamingMessage.value && event.token) {
          addThinkingCharsToQueue(event.token)
        }
        break

      case 'thinking':
        // 思考过程（完整的 thinking，如果流式没发送过）
        if (aiStreamingMessage.value) {
          const existingThinkingBlock = aiStreamingMessage.value.content.find(block => block.type === 'thinking')
          if (!existingThinkingBlock) {
            // 在 content 开头插入新的 thinking 块
            aiStreamingMessage.value.content.unshift({
              type: 'thinking',
              thinking: event.text || event.thinking
            })
            aiStreamingMessage.value = { ...aiStreamingMessage.value }
          }
        }
        break

      case 'end':
        // 完成
        finalizeStreamingMessage()
        break

      case 'system_status':
        // 系统状态（如 compacting 上下文压缩）
        systemStatus.value = {
          status: event.status,
          message: event.message
        }
        break

      case 'system_status_clear':
        // 清除系统状态
        systemStatus.value = null
        break

      case 'tool_approval_request':
        // 工具审批请求
        pendingApproval.value = {
          tool_name: event.tool_name,
          input_data: event.input_data
        }
        break

      case 'plan_ready':
        // 计划模式：Claude 输出计划等待用户审批
        pendingPlan.value = { plan: event.plan }
        break

      case 'error':
        // 错误 - 显示错误消息
        console.error('Stream error:', event.error)

        // 将错误消息添加到流式消息中
        if (aiStreamingMessage.value) {
          // 清空字符队列
          charQueue.value = []
          thinkingCharQueue.value = []
          if (typingTimer !== null) {
            clearTimeout(typingTimer)
            typingTimer = null
          }
          if (thinkingTypingTimer !== null) {
            clearTimeout(thinkingTypingTimer)
            thinkingTypingTimer = null
          }

          // 如果还没有文本内容，添加错误文本
          const hasText = aiStreamingMessage.value.content.some(block => block.type === 'text')
          if (!hasText) {
            aiStreamingMessage.value.content.push({
              type: 'text',
              text: event.error
            })
          }

          // 完成流式消息，显示错误
          finalizeStreamingMessage()
        } else {
          isStreaming.value = false
        }
        break
    }
  }

  /**
   * 添加字符到队列
   */
  const addCharsToQueue = (text: string) => {
    charQueue.value.push(...text.split(''))
    if (typingTimer === null) {
      processCharQueue()
    }
  }

  /**
   * 立即清空字符队列（在插入工具块前调用，避免工具穿插到文本中间）
   */
  const flushCharQueue = () => {
    if (charQueue.value.length > 0 && aiStreamingMessage.value) {
      if (typingTimer !== null) {
        clearTimeout(typingTimer)
        typingTimer = null
      }
      const remaining = charQueue.value.splice(0).join('')
      const lastBlock = aiStreamingMessage.value.content[aiStreamingMessage.value.content.length - 1]
      if (lastBlock && lastBlock.type === 'text') {
        lastBlock.text = (lastBlock.text || '') + remaining
      } else {
        aiStreamingMessage.value.content.push({ type: 'text', text: remaining })
      }
    }
  }

  /**
   * 添加 thinking 字符到队列
   */
  const addThinkingCharsToQueue = (text: string) => {
    thinkingCharQueue.value.push(...text.split(''))
    if (thinkingTypingTimer === null) {
      processThinkingCharQueue()
    }
  }

  /**
   * 处理字符队列（AI 流式消息）
   */
  const processCharQueue = () => {
    if (charQueue.value.length > 0 && aiStreamingMessage.value) {
      const char = charQueue.value.shift()!

      const lastBlock = aiStreamingMessage.value.content[aiStreamingMessage.value.content.length - 1]
      if (lastBlock && lastBlock.type === 'text') {
        lastBlock.text = (lastBlock.text || '') + char
      } else {
        aiStreamingMessage.value.content.push({
          type: 'text',
          text: char
        })
      }

      // 触发响应式更新
      aiStreamingMessage.value = { ...aiStreamingMessage.value }
    }

    if (charQueue.value.length > 0) {
      typingTimer = window.setTimeout(processCharQueue, 10)
    } else {
      typingTimer = null
    }
  }

  /**
   * 处理 thinking 字符队列（AI 流式消息）
   */
  const processThinkingCharQueue = () => {
    if (thinkingCharQueue.value.length > 0 && aiStreamingMessage.value) {
      const char = thinkingCharQueue.value.shift()!

      // 查找第一个 thinking 块（thinking 应该总是在开头）
      const firstThinkingBlock = aiStreamingMessage.value.content.find(block => block.type === 'thinking')
      if (firstThinkingBlock) {
        firstThinkingBlock.thinking = (firstThinkingBlock.thinking || '') + char
      } else {
        // 在 content 开头插入新的 thinking 块
        aiStreamingMessage.value.content.unshift({
          type: 'thinking',
          thinking: char
        })
      }

      // 触发响应式更新
      aiStreamingMessage.value = { ...aiStreamingMessage.value }
    }

    if (thinkingCharQueue.value.length > 0) {
      thinkingTypingTimer = window.setTimeout(processThinkingCharQueue, 2)
    } else {
      thinkingTypingTimer = null
    }
  }

  /**
   * 完成流式消息（AI 会话）
   */
  const finalizeStreamingMessage = () => {
    if (aiStreamingMessage.value) {
      // 等待字符队列和 thinking 队列处理完成
      const waitForQueue = () => {
        if (charQueue.value.length > 0 || thinkingCharQueue.value.length > 0) {
          setTimeout(waitForQueue, 5)
          return
        }

        // 添加到 AI 消息列表
        const finalMessage = { ...aiStreamingMessage.value! }
        finalMessage.status = 'completed'
        aiMessages.value.push(finalMessage)

        // 更新会话列表中的最新消息预览（AI 回复内容）
        const session = aiSessions.value.find(s => s.session_id === finalMessage.session_id)
        if (session) {
          // 从 AI 回复中提取文本内容
          const textBlock = finalMessage.content.find(block => block.type === 'text')
          if (textBlock && textBlock.text) {
            session.last_message = textBlock.text
          }
          session.last_activity = new Date()
        }

        aiStreamingMessage.value = null
        isStreaming.value = false

        // 触发自动继续（如果启用）
        startAutoContinue()
      }

      waitForQueue()
    }
  }

  // ==================== 初始化 ====================

  /**
   * 初始化 store
   */
  const initialize = async () => {
    // 加载 AI 会话列表（浮窗需要）
    await loadAiSessions()

    // 如果有 AI 会话，加载第一个 AI 会话（浮窗场景）
    if (aiSessions.value.length > 0) {
      await switchSession(aiSessions.value[0].session_id)
    }
  }

  // ==================== 内部聊天相关 ====================

  /**
   * 创建内部聊天会话
   */
  const createChatSession = async (chatWithUserId: number, name?: string) => {
    console.log('[Store] createChatSession called with userId:', chatWithUserId, 'name:', name)
    try {
      console.log('[Store] calling API createChatSession')
      const session = await agentApi.createChatSession(chatWithUserId, name)
      console.log('[Store] API createChatSession returned session:', session)

      // 切换到该会话并加载消息（使用 switchSession 确保正确处理）
      console.log('[Store] switching to session:', session.session_id)
      await switchSession(session.session_id)

      // 刷新会话列表
      console.log('[Store] loading sessions')
      await loadSessions()

      console.log('[Store] createChatSession completed successfully')
      return session
    } catch (error: any) {
      console.error('[Store] createChatSession error:', error)
      ElMessage.error('创建聊天会话失败: ' + error.message)
      throw error
    }
  }

  /**
   * 发送内部聊天消息（通过 WebSocket）
   */
  const sendChatMessage = async (sessionId: string, content: string) => {
    // 这个方法将由外部（通过 WebSocket）调用
    // Store 只负责状态更新，实际发送由 WebSocket 客户端处理
    const { websocketClient } = await import('./websocket')
    return websocketClient.sendChatMessage(sessionId, content)
  }

  /**
   * 添加消息到会话（WebSocket 推送时调用）
   */
  const addMessage = (sessionId: string, message: AgentMessage) => {
    // 获取会话信息（搜索两个列表）
    let session = aiSessions.value.find(s => s.session_id === sessionId)
    let isAiSession = true

    if (!session) {
      session = chatSessions.value.find(s => s.session_id === sessionId)
      isAiSession = false
    }

    if (!session) return

    // 获取当前用户 ID
    const userStore = useUserStore()
    const currentUserId = userStore.info?.userId

    // 根据会话类型添加到对应的消息列表
    if (isAiSession && currentAiSession.value === sessionId) {
      aiMessages.value.push(message)
    } else if (!isAiSession && currentChatSession.value === sessionId) {
      // 内部聊天：检查是否是自己发送的消息（需要替换临时消息）
      // 如果消息没有 sender_id 或 sender_id 等于当前用户，说明是自己发的
      const isSelfMessage = !message.sender_id || message.sender_id === currentUserId

      if (isSelfMessage) {
        // 查找临时消息（以 user- 开头的 message_id）
        const tempIndex = chatMessages.value.findIndex(m =>
          m.message_id.startsWith('user-') &&
          m.role === 'user'
        )

        if (tempIndex !== -1) {
          // 替换临时消息为真实消息
          chatMessages.value.splice(tempIndex, 1, message)
        } else {
          // 没有找到临时消息，直接添加
          chatMessages.value.push(message)
        }
      } else {
        // 别人发的消息，直接添加
        chatMessages.value.push(message)
      }
    }

    // 更新会话的最后活动时间和消息计数
    session.last_activity = new Date()
    session.message_count += 1

    // 更新会话的最新消息预览
    if (message.content && Array.isArray(message.content) && message.content.length > 0) {
      const firstBlock = message.content[0]
      if (firstBlock && typeof firstBlock === 'object' && 'text' in firstBlock) {
        session.last_message = firstBlock.text as string
      }
    } else if (typeof message.content === 'string') {
      session.last_message = message.content
    }
  }

  /**
   * 增加会话未读数
   */
  const incrementUnreadCount = (sessionId: string) => {
    // 搜索两个列表
    let session = aiSessions.value.find(s => s.session_id === sessionId)
    if (!session) {
      session = chatSessions.value.find(s => s.session_id === sessionId)
    }

    if (session) {
      session.unread_count = (session.unread_count || 0) + 1
    }
  }

  /**
   * 标记会话已读
   */
  const markSessionAsRead = async (sessionId: string) => {
    try {
      await agentApi.markSessionRead(sessionId)

      // 更新本地状态（搜索两个列表）
      let session = aiSessions.value.find(s => s.session_id === sessionId)
      if (!session) {
        session = chatSessions.value.find(s => s.session_id === sessionId)
      }

      if (session) {
        session.unread_count = 0
      }
    } catch (error: any) {
      console.error('标记已读失败:', error)
    }
  }

  /**
   * 初始化 WebSocket 连接
   * @param enableNotifications 是否启用桌面通知（独立窗口模式应禁用）
   */
  const initWebSocket = async (enableNotifications = true) => {
    const { websocketClient } = await import('./websocket')

    // 连接 WebSocket
    websocketClient.connect()

    // 监听消息
    websocketClient.onMessage(async (message) => {
      // 处理消息撤回事件
      if (message.type === 'message_recalled' && message.data) {
        const { session_id, message_id } = message.data
        // 从消息列表中移除被撤回的消息
        if (currentChatSession.value === session_id) {
          const index = chatMessages.value.findIndex(m => m.message_id === message_id)
          if (index !== -1) {
            chatMessages.value.splice(index, 1)
            console.log('[Store] 消息已被撤回:', message_id)
          }
        }
        return
      }

      // 处理发送确认消息（替换临时消息为真实消息）
      if (message.type === 'message_sent' && message.data) {
        const { session_id, message: msg } = message.data

        // 查找并替换临时消息
        if (currentChatSession.value === session_id) {
          const tempIndex = chatMessages.value.findIndex(m =>
            m.message_id.startsWith('user-') && m.role === 'user'
          )
          if (tempIndex !== -1) {
            chatMessages.value.splice(tempIndex, 1, msg)
            console.log('[Store] 临时消息已替换为真实消息:', msg.message_id)
          }
        }
        return
      }

      if (message.type === 'new_message' && message.data) {
        const { session_id, message: msg } = message.data

        // 检查会话是否存在于本地列表中（搜索两个列表）
        let session = aiSessions.value.find(s => s.session_id === session_id)
        if (!session) {
          session = chatSessions.value.find(s => s.session_id === session_id)
        }
        const isNewSession = !session

        if (isNewSession) {
          // 如果是新会话，重新加载对应类型的会话列表
          console.log('[Store] 收到新会话的消息，刷新会话列表')
          // 加载两个列表以确保新会话被加载
          await loadAiSessions()
          await loadChatSessions()
          // 重新获取会话信息
          session = chatSessions.value.find(s => s.session_id === session_id)
        }

        addMessage(session_id, msg)

        // 判断是否是当前正在查看的内部聊天会话
        const isCurrentChatSession = sessionTypeFilter.value === 'chat' && currentChatSession.value === session_id

        // 如果是当前会话，立即标记为已读（清空后端的未读数）
        if (currentAiSession.value === session_id || currentChatSession.value === session_id) {
          // 重新获取会话信息（搜索两个列表）
          let currentSessionInfo = aiSessions.value.find(s => s.session_id === session_id)
          if (!currentSessionInfo) {
            currentSessionInfo = chatSessions.value.find(s => s.session_id === session_id)
          }
          if (currentSessionInfo && currentSessionInfo.type === 'chat') {
            markSessionAsRead(session_id)
          }
        } else if (!isNewSession) {
          // 只有在不是新会话的情况下才增加未读数
          // 新会话的未读数已经在 loadSessions 时从后端获取了
          incrementUnreadCount(session_id)
        }

        // 发送桌面通知（内部聊天消息）
        // 条件：启用通知 && 是内部聊天 && 是别人发的消息
        if (enableNotifications && session && session.type === 'chat' && msg.role === 'user') {
          const senderName = session.chat_with?.user_name || '新消息'
          const content = typeof msg.content === 'string' ? msg.content : '发送了一条消息'
          // notifyChatMessage 内部会检查窗口焦点，如果窗口隐藏会发送通知
          // 如果窗口有焦点但不是当前会话，也发送通知
          notifyChatMessage(senderName, content.substring(0, 100), isCurrentChatSession)
        }
      }
    })
  }

  /**
   * 断开 WebSocket 连接
   */
  const disconnectWebSocket = async () => {
    const { websocketClient } = await import('./websocket')
    websocketClient.disconnect()
  }

  /**
   * 清空会话消息
   */
  const clearSessionMessages = async (sessionId: string) => {
    try {
      await agentApi.clearSessionMessages(sessionId)

      // 获取会话信息，判断类型（搜索两个列表）
      let session = aiSessions.value.find(s => s.session_id === sessionId)
      let isAiSession = true

      if (!session) {
        session = chatSessions.value.find(s => s.session_id === sessionId)
        isAiSession = false
      }

      // 清空对应的消息列表
      if (isAiSession && currentAiSession.value === sessionId) {
        aiMessages.value = []
        aiStreamingMessage.value = null
      } else if (!isAiSession && currentChatSession.value === sessionId) {
        chatMessages.value = []
        chatStreamingMessage.value = null
      }

      // 重新加载对应类型的会话列表（更新消息计数）
      if (isAiSession) {
        await loadAiSessions()
      } else {
        await loadChatSessions()
      }
    } catch (error: any) {
      console.error('清空会话失败:', error)
      ElMessage.error('清空会话失败: ' + error.message)
      throw error
    }
  }

  /**
   * 设置自动继续配置
   */
  const setAutoContinueConfig = (config: { enabled: boolean; interval: number; message: string }) => {
    autoContinueConfig.value = config

    // 如果关闭了自动继续，清除定时器
    if (!config.enabled) {
      cancelAutoContinue()
    }
  }

  /**
   * 启动自动继续定时器
   */
  const startAutoContinue = () => {
    if (!autoContinueConfig.value.enabled) return
    if (!currentAiSession.value) return
    if (isStreaming.value) return

    // 清除之前的定时器
    cancelAutoContinue()

    const interval = autoContinueConfig.value.interval * 1000
    let countdown = autoContinueConfig.value.interval

    // 更新状态
    autoContinueStatus.value = {
      waiting: true,
      message: `${countdown} 秒后自动发送...`
    }

    // 倒计时更新
    const countdownTimer = window.setInterval(() => {
      countdown--
      if (countdown > 0) {
        autoContinueStatus.value = {
          waiting: true,
          message: `${countdown} 秒后自动发送...`
        }
      }
    }, 1000)

    // 设置发送定时器
    autoContinueTimer = window.setTimeout(async () => {
      clearInterval(countdownTimer)
      autoContinueStatus.value = null

      // 检查条件是否仍然满足
      if (!autoContinueConfig.value.enabled || !currentAiSession.value || isStreaming.value) {
        return
      }

      // 自动发送消息
      const message = autoContinueConfig.value.message
      if (message) {
        console.log('[AutoContinue] 自动发送消息:', message)
        await sendMessage(message, [])
      }
    }, interval)
  }

  /**
   * 取消自动继续
   */
  const cancelAutoContinue = () => {
    if (autoContinueTimer) {
      clearTimeout(autoContinueTimer)
      autoContinueTimer = null
    }
    autoContinueStatus.value = null
  }

  return {
    // 状态（根据过滤器）
    currentSession,
    currentSessionInfo,
    sessions,
    sessionTypeFilter,
    filteredSessions,
    messages,
    streamingMessage,
    isStreaming,
    inputLocked,
    hasMoreMessages,
    systemStatus,

    // AI 会话专用状态（浮窗使用）
    currentAiSession,
    currentAiSessionInfo,
    aiMessages,
    aiStreamingMessage,
    aiHasMoreMessages,

    // 内部聊天专用状态
    currentChatSession,
    currentChatSessionInfo,
    chatMessages,
    chatStreamingMessage,
    chatHasMoreMessages,

    // 方法
    createNewSession,
    createSessionWithRole,
    loadSessions,
    switchSession,
    deleteSession,
    loadMessages,
    loadMoreMessages,
    removeMessage,
    recallMessage,
    sendMessage,
    stopGeneration,
    initialize,

    // 内部聊天相关
    createChatSession,
    sendChatMessage,
    addMessage,
    incrementUnreadCount,
    markSessionAsRead,
    initWebSocket,
    disconnectWebSocket,
    setSessionTypeFilter,
    clearSessionMessages,
    loadAndSwitchToSession,

    // 模型切换
    currentModelType,
    currentModel,
    setModelType,

    // 自动继续
    autoContinueConfig,
    autoContinueStatus,
    setAutoContinueConfig,
    startAutoContinue,
    cancelAutoContinue,

    // 会话配置
    updateSessionConfig,

    // 工具审批
    pendingApproval,
    respondToolApproval,
    checkPendingApproval,
    checkAndPollGeneration,
    stopGenerationPolling,

    // 计划审批
    pendingPlan,

    // 计算属性别名（方便访问）
    currentSessionId: currentSession
  }
  })
}

// agent 默认实例
export const useAgentStore = createAgentStore('agent', defaultAgentApi)
