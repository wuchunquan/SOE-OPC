import { AppRouteRecord } from '@/types/router'
import { APP_NAME } from '@/config/appInfo'

// 检查是否启用 AI Agent 功能
const isAgentEnabled = import.meta.env.VITE_ENABLE_AGENT === 'true'

export const agentRoutes: AppRouteRecord | null = isAgentEnabled
  ? {
      name: 'AIAgent',
      path: '/sys/agent',
      component: '/agent/index',
      meta: {
        title: APP_NAME,
        icon: 'ri:sparkling-2-fill',
        roles: ['admin', 'manager','user','debt_admin']
      }
    }
  : null
