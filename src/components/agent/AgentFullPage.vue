<template>
  <div class="agent-full-page">
    <!-- 左侧工具栏（独立会话模式下隐藏） -->
    <AgentToolBar v-if="!isStandaloneSessionMode" @tool-click="handleToolClick" />

    <!-- 主要内容区域 -->
    <div class="main-content">
      <!-- 顶部标题栏 -->
      <AgentTitleBar />

      <!-- 内容区域 -->
      <div class="content-area">
        <!-- AI 聊天/内部聊天页面 -->
        <template v-if="currentPage === 'ai-chat' || currentPage === 'internal-chat'">
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

        <!-- 本地AI页面 -->
        <template v-else-if="currentPage === 'local-ai'">
          <LocalAIPage :standalone-session-id="isStandaloneSessionMode ? (route.params.sessionId as string) : undefined" />
        </template>

        <!-- Skills 管理页面 -->
        <template v-else-if="currentPage === 'skills'">
          <div class="full-page-area">
            <SkillsPage />
          </div>
        </template>

        <!-- 知识库页面 -->
        <template v-else-if="currentPage === 'knowledge-base'">
          <div class="full-page-area">
            <KnowledgeBasePage />
          </div>
        </template>

        <!-- 帮助文档页面 -->
        <template v-else-if="currentPage === 'help'">
          <div class="full-page-area">
            <HelpDocsPage />
          </div>
        </template>

        <!-- 应用中心页面 -->
        <template v-else-if="currentPage === 'app-center'">
          <div class="full-page-area">
            <AppCenter />
          </div>
        </template>
      </div>
    </div>

    <!-- 移动端：抽屉 -->
    <el-drawer
    class="session-list-drawer"
      v-model="showDrawer"
      size="85%"
      direction="ltr"
      :with-header="false"
    >
      <SessionList
        @session-selected="handleMobileSessionSelected"
        @session-created="handleMobileSessionCreated"
        @session-deleted="handleSessionDeleted"
      />
    </el-drawer>

    <!-- 头像上传对话框 -->
    <AvatarUploadDialog v-model="showAvatarDialog" @success="handleAvatarUploadSuccess" />

    <!-- 设置对话框 -->
    <SettingsDialog v-model="showSettingsDialog" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, provide } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import AgentToolBar from './AgentToolBar.vue'
import AgentTitleBar from './AgentTitleBar.vue'
import SessionList from './SessionList.vue'
import ChatContainer from './ChatContainer.vue'
import SkillsPage from './SkillsPage.vue'
import KnowledgeBasePage from './KnowledgeBasePage.vue'
import HelpDocsPage from './HelpDocsPage.vue'
import LocalAIPage from '../agentLocal/LocalAIPage.vue'
import ResizableSplitter from './common/ResizableSplitter.vue'
import AppCenter from '../externalApp/AppCenter.vue'
import AvatarUploadDialog from '@/components/user/AvatarUploadDialog.vue'
import SettingsDialog from './SettingsDialog.vue'
import { useAgentStore } from './store'
import * as agentApi from './api'
import AgentFileManager from './file/FileManager.vue'
import { useAgentStore as useLocalAgentStore } from '../agentLocal/store'
import { isTauriEnv } from '@/utils/env'
import { AgentStoreKey, AgentApiKey, BaseUrlKey, IsLocalKey, FileManagerKey } from './injection'

const route = useRoute()
const agentStore = useAgentStore()
const localAgentStore = useLocalAgentStore()

// provide agent store 给子组件
provide(AgentStoreKey, agentStore)
provide(AgentApiKey, agentApi)
provide(BaseUrlKey, '')
provide(IsLocalKey, false)
provide(FileManagerKey, AgentFileManager)

// 判断是否为独立会话窗口模式（有 sessionId 路由参数）
const isStandaloneSessionMode = computed(() => {
  return !!route.params.sessionId
})

// 判断是否为本地AI模式
const isLocalMode = computed(() => {
  return route.query.local === 'true'
})
const isTauri = computed(() => isTauriEnv())
const currentPage = ref('ai-chat')
// 独立窗口模式下初始就不显示侧边栏，避免隐藏动画
const showSessionSidebar = ref(!route.params.sessionId)
const sessionSidebarWidth = ref(288)
const isMobile = ref(false)
const showDrawer = ref(false)
const showAvatarDialog = ref(false)
const showSettingsDialog = ref(false)

// 检测是否是移动设备
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

onMounted(async () => {
  checkMobile()
  window.addEventListener('resize', checkMobile)

  // 如果是独立会话窗口模式
  if (isStandaloneSessionMode.value) {
    const sessionId = route.params.sessionId as string
    const sessionType = (route.query.type as string) === 'chat' ? 'chat' : 'ai'

    // 根据是否为本地模式选择不同的 store
    if (isLocalMode.value) {
      // 本地AI模式：设置页面为 local-ai，使用本地 store
      currentPage.value = 'local-ai'
      try {
        await localAgentStore.loadAndSwitchToSession(sessionId)
      } catch (error) {
        console.error('切换到本地会话失败:', error)
        ElMessage.error('加载会话失败')
      }
    } else {
      // 远程AI模式：初始化 WebSocket，使用远程 store
      // 独立窗口模式禁用桌面通知，避免多窗口重复通知
      try {
        await agentStore.initWebSocket(false)
      } catch (error) {
        console.error('WebSocket 初始化失败:', error)
      }

      agentStore.setSessionTypeFilter(sessionType)

      try {
        await agentStore.loadAndSwitchToSession(sessionId, sessionType)
      } catch (error) {
        console.error('切换到指定会话失败:', error)
        ElMessage.error('加载会话失败')
      }
    }
  } else {
    // 非独立窗口模式
    try {
      await agentStore.initWebSocket()
    } catch (error) {
      console.error('WebSocket 初始化失败:', error)
    }
    // Tauri 桌面端默认进入本地AI页面
    if (isTauri.value) {
      currentPage.value = 'local-ai'
    } else {
      agentStore.setSessionTypeFilter('ai')
    }
  }
})

onUnmounted(async () => {
  window.removeEventListener('resize', checkMobile)

  // 断开 WebSocket 连接
  try {
    await agentStore.disconnectWebSocket()
  } catch (error) {
    console.error('WebSocket 断开失败:', error)
  }
})

const handleSessionSidebarResize = (width: number) => {
  sessionSidebarWidth.value = width
}

const toggleSessionSidebar = () => {
  if (isMobile.value) {
    // 移动端：打开抽屉
    showDrawer.value = true
  } else {
    // 桌面端：切换侧边栏
    showSessionSidebar.value = !showSessionSidebar.value
  }
}

const handleSessionSelected = async (sessionId: string) => {
  try {
    await agentStore.switchSession(sessionId)
  } catch (error) {
    console.error('切换会话失败:', error)
  }
}

const handleSessionCreated = async (sessionInfo: any) => {
  try {
    await agentStore.switchSession(sessionInfo.session_id)
  } catch (error) {
    console.error('创建会话失败:', error)
  }
}

// 移动端会话选择（选择后关闭抽屉）
const handleMobileSessionSelected = async (sessionId: string) => {
  await handleSessionSelected(sessionId)
  showDrawer.value = false
}

// 移动端会话创建（创建后关闭抽屉）
const handleMobileSessionCreated = async (sessionInfo: any) => {
  await handleSessionCreated(sessionInfo)
  showDrawer.value = false
}

const handleSessionDeleted = (sessionId: string) => {
  if (agentStore.currentSession === sessionId) {
    // agentStore.clearChat()
  }
}

const handleToolClick = async (key: string) => {
  console.log('Tool clicked:', key)

  // 处理页面切换
  if (key === 'ai-chat') {
    currentPage.value = 'ai-chat'
    agentStore.setSessionTypeFilter('ai')
    // 切换到 AI 聊天后，如果当前会话不是 AI 类型，自动选择第一个 AI 会话
    await ensureValidSession('ai')
  } else if (key === 'internal-chat') {
    currentPage.value = 'internal-chat'
    agentStore.setSessionTypeFilter('chat')
    // 切换到内部沟通后，如果当前会话不是聊天类型，自动选择第一个聊天会话或清空
    await ensureValidSession('chat')
  } else if (key === 'local-ai') {
    currentPage.value = 'local-ai'
  } else if (key === 'skills') {
    currentPage.value = 'skills'
  } else if (key === 'knowledge-base') {
    currentPage.value = 'knowledge-base'
  } else if (key === 'app-center') {
    currentPage.value = 'app-center'
  } else if (key === 'help') {
    currentPage.value = 'help'
  } else if (key === 'user-settings') {
    // 打开头像上传对话框
    showAvatarDialog.value = true
  } else if (key === 'settings') {
    // 打开设置对话框
    showSettingsDialog.value = true
  }
}

// 确保当前会话类型正确
const ensureValidSession = async (type: 'ai' | 'chat') => {
  // 等待会话列表加载完成
  await new Promise(resolve => setTimeout(resolve, 100))

  const currentSessionInfo = agentStore.currentSessionInfo
  const filteredSessions = agentStore.filteredSessions

  // 如果当前会话类型不匹配，或没有当前会话
  if (!currentSessionInfo || currentSessionInfo.type !== type) {
    if (filteredSessions.length > 0) {
      // 自动选择第一个会话
      await agentStore.switchSession(filteredSessions[0].session_id)
    } else {
      // 没有会话，清空当前会话
      // agentStore.clearChat()
    }
  }
}

// 头像上传成功回调
const handleAvatarUploadSuccess = () => {
  ElMessage.success('头像更新成功')
}
</script>

<style scoped lang="scss">
  

.agent-full-page {
  height: 100vh;
  display: flex;
  overflow: hidden;
  background: #111111;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.content-area {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
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

.full-page-area {
  flex: 1;
  overflow: hidden;
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
  .agent-full-page {
    // 隐藏左侧工具栏
    :deep(.agent-toolbar) {

    }
  }
}

// 浅色模式
html:not(.dark) {
  .agent-full-page {
    background: #f9fafb;
  }

  .session-sidebar {
    background: #ffffff;
    border-right-color: #e5e7eb;
  }

  .chat-area {
    background: #f9fafb;
  }
}
</style>
<style lang="scss">
@media (max-width: 768px) {
  html:not(.dark) .not-tauri-class {
    .toolbar-buttons .el-button.active{
        box-shadow: none!important;
    }
  }
  html.dark .not-tauri-class {
    .agent-toolbar{
      background:#111111 !important;
    }
    .toolbar-buttons .el-button{
      &:hover {
        color:#71717a;
      }
    }
  }
  .docs-page .header-title{
    display: none!important;
  }
  .docs-header{
      gap:12px!important;
  }
  .el-dialog{
    margin-top: 8vh!important;
  }
  .role-grid{
    gap:8px!important;
    grid-template-columns: repeat(1, 1fr)!important;

    .role-card{
      padding: 6px!important;
      margin-right: 5px!important;
    }
  }
  .skills-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))!important;
    gap: 20px;
  }
  .session-list-drawer{
      .el-drawer__body{
        padding:0!important;
      }
    }
  .not-tauri-class{
    .agent-page{
      border:0px!important;
      border-radius: 0!important;
    }
    .header-actions{
      gap:0!important;
    }
    .chat-header{
      padding: 4px 10px !important;
    }
    .toolbar-buttons .el-button{
      background: none!important;
    }
    .tabs-nav {
      display: none!important;
    }
    #app-header{
      display: none!important;
    }
    .layout-content{
      width: 100%!important;
    }
    .agent-page{
      min-height: 100vh!important;
    }
    .agent-full-page{
      flex-direction: column!important;
      flex-flow: column-reverse!important;
    }
    .agent-space{
      display: none!important;
    }
    .agent-toolbar{
      border-top: 1px solid rgba(255, 255, 255, 0.08)!important ;
      justify-content: center!important;
      width: 100%!important;
      flex-direction: row!important;
      padding: 0px 0!important;
      gap: 8px!important;
    
    }
    .toolbar-buttons{
      flex-direction: row!important;
      margin-left:0!important;
    }
    .user-avatar-section{
      margin-right: 16px;
      display: none!important;
      margin-left: 16px;
      margin-bottom: 0!important;
    }
    .model-label{
      display: none!important;
    }
    .chat-header .header-left .ai-avatar{
      width: 24px!important;
      height: 24px!important;
      border-radius: 4px!important;
    }
    .agent-input{
      padding: 4px 4px!important;
      padding-bottom: 4px!important;
      border-top:0px!important;
      .input-container{
        border-radius: 8px!important;
      }
    }
  }
}

</style>