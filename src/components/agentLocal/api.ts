/**
 * agentLocal API - 复用 agent 的工厂函数，使用本地直连地址
 */
import { createAgentApi } from '../agent/api'
import { getLocalApiBaseUrl } from '@/utils/env'

const localApi = createAgentApi(getLocalApiBaseUrl())

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
} = localApi

// 同时导出工厂函数，方便其他地方使用
export { createAgentApi } from '../agent/api'
