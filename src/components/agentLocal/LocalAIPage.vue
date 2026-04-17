<template>
  <div class="-ai-container">
    <!-- 后端加载中状态 -->
    <div v-if="backendLoading" class="backend-loading">
      <el-icon class="loading-icon" :size="48"><Loading /></el-icon>
      <div class="loading-text">正在启动本地 AI 服务...</div>
      <div class="loading-subtext">{{ loadingMessage }}</div>
    </div>

    <!-- 后端加载失败状态 -->
    <div v-else-if="backendError" class="backend-error">
      <el-icon class="error-icon" :size="48"><CircleClose /></el-icon>
      <div class="error-text">无法连接到本地 AI 服务</div>
      <div class="error-subtext">{{ backendError }}</div>
      <el-button type="primary" @click="retryBackendConnection">重试</el-button>
    </div>

    <!-- 正常内容 -->
    <template v-else>
      <!-- 桌面端：会话侧边栏 -->
      <Transition name="sidebar">
        <div v-if="showSessionSidebar && !isMobile" class="session-sidebar" :style="{ width: sessionSidebarWidth + 'px' }">
          <SessionList
            @session-selected="handleSessionSelected"
            @session-created="handleSessionCreated"
            @session-deleted="handleSessionDeleted"
          />
        </div>
      </Transition>

      <!-- 桌面端：会话侧边栏分隔器 -->
      <ResizableSplitter
        v-if="showSessionSidebar && !isMobile"
        :min-width="200"
        :max-width="500"
        :current-width="sessionSidebarWidth"
        direction="left"
        @resize="handleSessionSidebarResize"
      />

      <!-- 聊天区域 -->
      <div class="chat-area">
        <ChatContainer @session-sidebar-toggle="toggleSessionSidebar" />
      </div>
    </template>

    <!-- 移动端：抽屉 -->
    <el-drawer
      v-model="showDrawer"
      :size="280"
      direction="ltr"
      :with-header="false"
    >
      <SessionList
        @session-selected="handleMobileSessionSelected"
        @session-created="handleMobileSessionCreated"
        @session-deleted="handleSessionDeleted"
      />
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, provide } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading, CircleClose } from '@element-plus/icons-vue'
import SessionList from '../agent/SessionList.vue'
import ChatContainer from '../agent/ChatContainer.vue'
import ResizableSplitter from '../agent/common/ResizableSplitter.vue'
import LocalFileManager from '../agent/file/LocalFileManager.vue'
import { useAgentStore } from './store'
import * as localApi from './api'
import { useUserStore } from '@/store/modules/user'
import { AgentStoreKey, AgentApiKey, BaseUrlKey, IsLocalKey, FileManagerKey } from '../agent/injection'
import { getLocalApiBaseUrl } from '@/utils/env'
import { isSelfUseMode } from '@/utils/runtime-mode'

const props = defineProps<{
  standaloneSessionId?: string // 独立窗口模式下的会话ID
}>()

const Store = useAgentStore()
const userStore = useUserStore()
const selfUseMode = isSelfUseMode()

// provide 给子组件使用
provide(AgentStoreKey, Store)
provide(AgentApiKey, localApi)
provide(BaseUrlKey, getLocalApiBaseUrl())
provide(IsLocalKey, true)
provide(FileManagerKey, LocalFileManager)

// 独立窗口模式下初始就不显示侧边栏
const showSessionSidebar = ref(!props.standaloneSessionId)
const sessionSidebarWidth = ref(288)
const isMobile = ref(false)
const showDrawer = ref(false)
const backendLoading = ref(true)
const backendError = ref('')
const loadingMessage = ref('正在检查服务状态...')
let healthCheckTimer: number | null = null
let healthCheckAttempts = 0
const MAX_HEALTH_CHECK_ATTEMPTS = 100

// 检查后端健康状态
const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${getLocalApiBaseUrl()}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    })
    return response.ok
  } catch (error) {
    return false
  }
}

// 等待后端启动
const waitForBackend = async () => {
  backendLoading.value = true
  backendError.value = ''
  healthCheckAttempts = 0

  const checkHealth = async () => {
    healthCheckAttempts++
    loadingMessage.value = `正在检查服务状态... (${healthCheckAttempts}/${MAX_HEALTH_CHECK_ATTEMPTS})`

    const isHealthy = await checkBackendHealth()

    if (isHealthy) {
      backendLoading.value = false
      if (healthCheckTimer) {
        clearInterval(healthCheckTimer)
        healthCheckTimer = null
      }
      // 后端启动成功，继续初始化
      await initializeApp()
    } else if (healthCheckAttempts >= MAX_HEALTH_CHECK_ATTEMPTS) {
      backendLoading.value = false
      backendError.value = '服务启动超时，请检查后端是否正常运行'
      if (healthCheckTimer) {
        clearInterval(healthCheckTimer)
        healthCheckTimer = null
      }
    }
  }

  // 立即检查一次
  await checkHealth()

  // 如果还在加载中，启动定时检查
  if (backendLoading.value) {
    healthCheckTimer = window.setInterval(checkHealth, 1000)
  }
}

// 重试连接
const retryBackendConnection = () => {
  waitForBackend()
}

// 初始化应用
const initializeApp = async () => {
  try {
    // 自用模式直接使用本地账号体系，不再依赖 NewAPI 同步链。
    if (!selfUseMode) {
      await syncUserTo()
    }

    // 如果是独立窗口模式（由父组件传入 standaloneSessionId），已经在父组件加载过会话了
    // 否则加载会话列表
    if (!props.standaloneSessionId) {
      await Store.loadSessions()
    }
  } catch (error) {
    console.error('初始化失败:', error)
  }
}

// 同步用户到本地数据库
const syncUserTo = async () => {
  try {
    // 始终从远程 API 获取最新的同步数据
    let syncData: Record<string, any> = {
      user_id: userStore.info.userId,
    }

    try {
      const resp = await fetch('/api/agent/newapi/syncdata', {
        headers: { 'Authorization': `Bearer ${userStore.accessToken}` }
      })
      if (resp.ok) {
        const result = await resp.json()
        if (result.success && result.data) {
          const d = result.data
          if (d.newapi_token_key) syncData.newapi_token_key = d.newapi_token_key
          if (d.newapi_base_url) syncData.newapi_base_url = d.newapi_base_url
          if (d.newapi_models?.length) syncData.newapi_models = d.newapi_models
          if (d.newapi_default_model) syncData.newapi_default_model = d.newapi_default_model
        }
      }
    } catch (e) {
      console.warn('从远程获取同步数据失败，使用 sessionStorage 兜底:', e)
      // 兜底：用 sessionStorage
      syncData.newapi_token_key = sessionStorage.getItem('newapi_token_key') || undefined
      syncData.newapi_base_url = sessionStorage.getItem('newapi_base_url') || undefined
      syncData.newapi_models = JSON.parse(sessionStorage.getItem('newapi_models') || 'null') || undefined
      syncData.newapi_default_model = sessionStorage.getItem('newapi_default_model') || undefined
    }

    const response = await fetch(`${getLocalApiBaseUrl()}/api/users/sync-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(syncData)
    })
    const result = await response.json()
    if (!result.success) {
      ElMessage.warning('用户同步失败')
    }
  } catch (error) {
    console.error('用户同步失败:', error)
  }
}

// 检测是否是移动设备
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

onMounted(async () => {
  checkMobile()
  window.addEventListener('resize', checkMobile)

  // 等待后端启动
  await waitForBackend()
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer)
    healthCheckTimer = null
  }
})

const handleSessionSidebarResize = (width: number) => {
  sessionSidebarWidth.value = width
}

const toggleSessionSidebar = () => {
  if (isMobile.value) {
    showDrawer.value = true
  } else {
    showSessionSidebar.value = !showSessionSidebar.value
  }
}

const handleSessionSelected = async (sessionId: string) => {
  try {
    await Store.switchSession(sessionId)
  } catch (error) {
    console.error('切换会话失败:', error)
  }
}

const handleSessionCreated = async (sessionInfo: any) => {
  try {
    await Store.switchSession(sessionInfo.session_id)
  } catch (error) {
    console.error('创建会话失败:', error)
  }
}

const handleMobileSessionSelected = async (sessionId: string) => {
  await handleSessionSelected(sessionId)
  showDrawer.value = false
}

const handleMobileSessionCreated = async (sessionInfo: any) => {
  await handleSessionCreated(sessionInfo)
  showDrawer.value = false
}

const handleSessionDeleted = (sessionId: string) => {
  if (Store.currentAiSession === sessionId) {
    Store.currentAiSession = null
    Store.aiMessages = []
  }
}
</script>

<style scoped lang="scss">
.-ai-container {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
  min-height: 0;
}

.backend-loading,
.backend-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  gap: 16px;
}

.backend-loading {
  .loading-icon {
    color: var(--el-color-primary);
    animation: rotate 1s linear infinite;
  }

  .loading-text {
    font-size: 18px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  .loading-subtext {
    font-size: 14px;
    color: var(--el-text-color-secondary);
  }
}

.backend-error {
  .error-icon {
    color: var(--el-color-danger);
  }

  .error-text {
    font-size: 18px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  .error-subtext {
    font-size: 14px;
    color: var(--el-text-color-secondary);
    margin-bottom: 8px;
  }
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.session-sidebar {
  flex-shrink: 0;
  height: 100%;
  overflow: hidden;
  background: #101010;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  min-width: 200px;
  max-width: 500px;
  transition: margin-left 0.3s ease, opacity 0.3s ease;
}

.chat-area {
  flex: 1;
  overflow: hidden;
  background: #111111;
  min-width: 0;
}

// 侧边栏过渡动画
.sidebar-enter-active,
.sidebar-leave-active {
  transition: margin-left 0.3s ease, opacity 0.3s ease;
}

.sidebar-enter-from,
.sidebar-leave-to {
  margin-left: -288px;
  opacity: 0;
}

.sidebar-enter-to,
.sidebar-leave-from {
  margin-left: 0;
  opacity: 1;
}

// 移动端适配
@media (max-width: 768px) {
  .-ai-container {
    :deep(.agent-toolbar) {
      display: none;
    }
  }
}

// 浅色模式
html:not(.dark) {
  .session-sidebar {
    background: #ffffff;
    border-right-color: #e5e7eb;
  }

  .chat-area {
    background: #f9fafb;
  }
}
</style>
