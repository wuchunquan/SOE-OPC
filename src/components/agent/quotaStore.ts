/**
 * 用户额度 Store（单例，跨组件共享）
 * 带 2 分钟查询缓存，避免切换会话时频繁请求
 * 始终走远程服务器查询
 */
import { reactive } from 'vue'
import http from '@/utils/http'

const CACHE_TTL = 2 * 60 * 1000 // 2 分钟

interface QuotaState {
  usedQuota: number | null
  remainQuota: number | null
  lastFetchedAt: number // timestamp
  loading: boolean
}

const state = reactive<QuotaState>({
  usedQuota: null,
  remainQuota: null,
  lastFetchedAt: 0,
  loading: false,
})

/**
 * 加载用户额度（始终走远程）
 * @param force 是否强制刷新（忽略缓存）
 */
async function fetchQuota(force: boolean = false) {
  // 2 分钟内不重复查询
  if (!force && state.lastFetchedAt && Date.now() - state.lastFetchedAt < CACHE_TTL) {
    return
  }

  if (state.loading) return
  state.loading = true

  try {
    const resp = await http.get({ url: '/api/agent/newapi/quota' })
    if (resp.success && resp.data) {
      state.usedQuota = resp.data.used_quota
      state.remainQuota = resp.data.remain_quota
      state.lastFetchedAt = Date.now()
    }
  } catch {
    // 静默失败
  } finally {
    state.loading = false
  }
}

export function useQuotaStore() {
  return {
    state,
    fetchQuota,
  }
}
