import { AppRouteRecord } from '@/types/router'
import { sysRoutes } from './sys'
// import { exceptionRoutes } from './exception'
import { docsRoutes } from './docs'
import { agentRoutes } from './agent'

/**
 * 导出所有模块化路由
 */
export const routeModules: AppRouteRecord[] = [
  agentRoutes, // 如果为 null 会被过滤掉
  sysRoutes,
  ...docsRoutes
].filter(Boolean) as AppRouteRecord[] // 过滤掉 null 值
