/**
 * Agent 组件 provide/inject keys
 */
import type { InjectionKey, Component } from 'vue'

/** Agent Store 实例 (由顶层页面 provide) */
export const AgentStoreKey: InjectionKey<any> = Symbol('agentStore')

/** API 模块 (由顶层页面 provide) */
export const AgentApiKey: InjectionKey<any> = Symbol('agentApi')

/** API 基础 URL: '' 或 getLocalApiBaseUrl() */
export const BaseUrlKey: InjectionKey<string> = Symbol('baseUrl')

/** 是否本地模式 */
export const IsLocalKey: InjectionKey<boolean> = Symbol('isLocal')

/** FileManager 组件 (agent 和 agentLocal 版本差异大，通过 inject 提供) */
export const FileManagerKey: InjectionKey<Component> = Symbol('fileManager')
