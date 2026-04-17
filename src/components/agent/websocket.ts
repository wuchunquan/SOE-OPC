/**
 * WebSocket 客户端服务
 */
import type { WebSocketMessage, AgentMessage } from './types'
import { useAgentStore } from './store'
import { useUserStore } from '@/store/modules/user'

class WebSocketClient {
  private ws: WebSocket | null = null
  private url: string = ''
  private reconnectTimer: number | null = null
  private heartbeatTimer: number | null = null
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 5
  private messageHandlers: Set<(message: WebSocketMessage) => void> = new Set()
  private connectPromise: Promise<void> | null = null

  /**
   * 连接 WebSocket
   */
  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] 已经连接')
      return
    }

    const userStore = useUserStore()
    const userId = userStore.info?.userId

    if (!userId) {
      console.error('[WebSocket] 用户未登录，无法连接')
      return
    }

    // 构造 WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    this.url = `${protocol}//${host}/api/agent/ws/chat?user_id=${userId}`

    console.log('[WebSocket] 正在连接:', this.url)

    // 创建连接 Promise
    this.connectPromise = new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url)

        this.ws.onopen = () => {
          console.log('[WebSocket] 连接成功')
          this.reconnectAttempts = 0
          this.startHeartbeat()
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data)
            this.handleMessage(message)
          } catch (error) {
            console.error('[WebSocket] 解析消息失败:', error)
          }
        }

        this.ws.onerror = (error) => {
          console.error('[WebSocket] 错误:', error)
          reject(error)
        }

        this.ws.onclose = () => {
          console.log('[WebSocket] 连接关闭')
          this.stopHeartbeat()
          this.connectPromise = null
          this.attemptReconnect()
        }
      } catch (error) {
        console.error('[WebSocket] 创建连接失败:', error)
        reject(error)
        this.attemptReconnect()
      }
    })
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    this.stopHeartbeat()

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    console.log('[WebSocket] 已断开连接')
  }

  /**
   * 等待连接建立
   */
  private async waitForConnection(): Promise<boolean> {
    // 如果已经连接，直接返回
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return true
    }

    // 如果正在连接中，等待连接完成
    if (this.connectPromise) {
      try {
        await this.connectPromise
        return true
      } catch (error) {
        console.error('[WebSocket] 等待连接失败:', error)
        return false
      }
    }

    // 如果没有连接，尝试连接
    this.connect()
    if (this.connectPromise) {
      try {
        await this.connectPromise
        return true
      } catch (error) {
        console.error('[WebSocket] 连接失败:', error)
        return false
      }
    }

    return false
  }

  /**
   * 发送消息
   */
  async send(message: WebSocketMessage) {
    // 等待连接建立
    const connected = await this.waitForConnection()
    if (!connected) {
      console.error('[WebSocket] 未连接，无法发送消息')
      return false
    }

    try {
      this.ws!.send(JSON.stringify(message))
      return true
    } catch (error) {
      console.error('[WebSocket] 发送消息失败:', error)
      return false
    }
  }

  /**
   * 发送聊天消息
   */
  async sendChatMessage(sessionId: string, content: string) {
    return await this.send({
      type: 'send_message',
      session_id: sessionId,
      content
    })
  }

  /**
   * 添加消息处理器
   */
  onMessage(handler: (message: WebSocketMessage) => void) {
    this.messageHandlers.add(handler)
    return () => {
      this.messageHandlers.delete(handler)
    }
  }

  /**
   * 处理收到的消息
   */
  private handleMessage(message: WebSocketMessage) {
    console.log('[WebSocket] 收到消息:', message.type)

    // 调用所有注册的处理器
    this.messageHandlers.forEach(handler => {
      try {
        handler(message)
      } catch (error) {
        console.error('[WebSocket] 消息处理器错误:', error)
      }
    })
  }


  /**
   * 尝试重连
   */
  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] 达到最大重连次数，停止重连')
      return
    }

    this.reconnectAttempts++
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)

    console.log(`[WebSocket] ${delay}ms 后进行第 ${this.reconnectAttempts} 次重连...`)

    this.reconnectTimer = window.setTimeout(() => {
      this.connect()
    }, delay)
  }

  /**
   * 启动心跳
   */
  private startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeatTimer = window.setInterval(() => {
      this.send({ type: 'ping' })
    }, 30000) // 每30秒发送一次心跳
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }
}

// 导出单例
export const websocketClient = new WebSocketClient()
