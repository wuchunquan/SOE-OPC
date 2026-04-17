/**
 * AI Agent 类型定义
 */

// ==================== 内容块 ====================

export interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result' | 'thinking' | 'code' | 'error'
  text?: string
  tool_name?: string
  tool_input?: Record<string, any>
  tool_result?: any
  thinking?: string
}

// ==================== 消息 ====================

export interface AgentMessage {
  id: number
  message_id: string
  session_id: string
  role: 'user' | 'assistant' | 'system'
  type: string
  content: ContentBlock[]
  sender_id?: number  // 发送者用户ID（内部聊天）
  sender_name?: string  // 发送者名称（内部聊天）
  sender_avatar?: string  // 发送者头像（内部聊天）
  timestamp: string | Date
  status: 'streaming' | 'completed' | 'error'
  total_cost_usd?: number
  duration_ms?: number
}

// ==================== 会话 ====================

export interface ParticipantInfo {
  user_id: number
  user_name?: string
  user_avatar?: string
}

export interface AgentSession {
  id: number
  session_id: string
  user_id?: number
  type: 'ai' | 'chat'  // 会话类型
  name?: string
  system_prompt?: string
  created_at: string | Date
  last_activity: string | Date
  message_count: number
  total_cost: number
  max_turns: number
  allowed_tools?: string[]
  config?: Record<string, any>  // 会话配置（permission_mode等）
  role_id?: string
  role_name?: string
  role_avatar_url?: string
  role_color?: string
  unread_count?: number  // 未读消息数
  chat_with?: ParticipantInfo  // 内部聊天对象信息
  is_online?: boolean  // 对方用户是否在线（仅聊天会话）
  last_message?: string  // 最新消息内容
}

// ==================== 请求/响应 ====================

export interface CreateSessionRequest {
  type?: 'ai' | 'chat'  // 会话类型
  name?: string
  system_prompt?: string
  max_turns?: number
  allowed_tools?: string[]
  config?: Record<string, any>  // 会话配置
  chat_with_user_id?: number  // 内部聊天对象用户ID
}

export interface UpdateSessionRequest {
  name?: string
  system_prompt?: string
  max_turns?: number
  allowed_tools?: string[]
  config?: Record<string, any>  // 会话配置
}

export interface SendMessageRequest {
  message: string
  files?: string[]
}

export interface MessagesListResponse {
  session_id: string
  messages: AgentMessage[]
  has_more: boolean
  total: number
}

// ==================== 流式事件 ====================

export interface StreamEvent {
  type: 'text_token' | 'tool_use' | 'tool_use_start' | 'tool_use_delta' | 'tool_use_done' | 'tool_result' | 'thinking' | 'end' | 'error' | 'text_start' | 'thinking_start' | 'thinking_token' | 'system_status' | 'system_status_clear' | 'tool_approval_request' | 'plan_ready'
  token?: string
  text?: string
  tool_name?: string
  tool_input?: Record<string, any>
  partial_json?: string
  index?: number
  content?: any
  error?: string
  status?: string
  message?: string
  input_data?: Record<string, any>
  plan?: string
}

// ==================== 内部聊天 ====================

export interface ChatUser {
  user_id: number
  username: string
  real_name?: string
  avatar?: string
  department?: string
}

export interface ChatMessageSend {
  session_id: string
  content: string
  files?: any[]
}

export interface WebSocketMessage {
  type: 'send_message' | 'new_message' | 'message_sent' | 'error' | 'ping' | 'pong'
  session_id?: string
  content?: string
  data?: any
  message?: string
}
