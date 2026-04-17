/**
 * AgentLocal Store - 复用 agent 工厂
 */
import { createAgentStore } from '../agent/store'
import * as localApi from './api'

export const useAgentStore = createAgentStore('agentLocal', localApi)
