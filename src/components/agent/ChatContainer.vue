<template>
  <div class="chat-container">
    <!-- 顶部工具栏 -->
    <div class="chat-header" data-tauri-drag-region>
      <div class="header-content" data-tauri-drag-region>
        <div class="header-left" data-tauri-drag-region>
          <!-- 内部聊天：显示对方用户头像和名称 -->
          <template v-if="isCurrentSessionChat && agentStore.currentSession">
            <div class="ai-avatar">
              <img
                v-if="chatWithUser?.user_avatar"
                :src="baseUrl + chatWithUser.user_avatar"
                :alt="chatWithUser.user_name"
                class="avatar-img"
              />
              <div v-else class="avatar-placeholder">
                {{ (chatWithUser?.user_name || '用户')[0] }}
              </div>
            </div>
            <span class="ai-title opacity-90">
              {{ chatWithUser?.user_name || '未知用户' }}
            </span>
          </template>

          <!-- 内部聊天空状态：只显示标题 -->
          <template v-else-if="!agentStore.currentSession && agentStore.sessionTypeFilter === 'chat'">
            <span class="ai-title opacity-90">内部沟通</span>
          </template>

          <!-- AI 会话：显示角色头像和名称（有无会话都显示） -->
          <template v-else>
            <div class="ai-avatar">
              <img
                v-if="currentRoleAvatar"
                :src="baseUrl + currentRoleAvatar"
                :alt="currentRoleName"
                class="avatar-img"
              />
              <img v-else src="/logo.png" alt="AI助手" class="avatar-img" />
            </div>
            <span class="ai-title opacity-90">
              {{ currentRoleName || 'AI 助手' }}
            </span>
          </template>
        </div>

        <!-- 操作按钮 -->
        <div class="header-actions">
          <!-- 邀请获额度按钮（仅 AI 会话，桌面端显示） -->
          <div
            v-if="!selfUseMode && !isCurrentSessionChat && !isMobile"
            class="invite-btn"
            @click="showInviteDialog = true"
            title="邀请好友获额度"
          >
            <i class="pi pi-gift"></i>
            <span>邀请获额度</span>
          </div>

          <!-- 额度显示（仅 AI 会话，桌面端显示） -->
          <div
            v-if="!selfUseMode && !isCurrentSessionChat && quotaStore.state.remainQuota !== null && !isMobile"
            class="quota-display"
            :title="`已用: ${quotaStore.state.usedQuota?.toFixed(2)}元`"
          >
            <i class="pi pi-wallet"></i>
            <span>{{ quotaStore.state.remainQuota?.toFixed(2) }}元</span>
          </div>

          <!-- 有会话时显示完整操作按钮 -->
          <template v-if="agentStore.currentSession">

            <!-- 权限模式切换（仅 AI 会话显示） -->
            <div v-if="!isCurrentSessionChat">
              <el-dropdown trigger="click" @command="handlePermissionModeChange">
                <el-button text class="action-btn model-btn" :title="permissionLabel">
                  <i :class="permissionModeIcon"></i>
                  <span class="model-label">{{ permissionLabel }}</span>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="bypassPermissions" :class="{ active: permissionMode === 'bypassPermissions' }">
                      <i class="pi pi-bolt"></i>
                      <span>自动</span>
                      <span class="model-desc">自动执行</span>
                    </el-dropdown-item>
                    <el-dropdown-item command="default" :class="{ active: permissionMode === 'default' }">
                      <i class="pi pi-shield"></i>
                      <span>确认</span>
                      <span class="model-desc">需审批</span>
                    </el-dropdown-item>
                    <el-dropdown-item command="plan" :class="{ active: permissionMode === 'plan' }">
                      <i class="pi pi-list-check"></i>
                      <span>计划</span>
                      <span class="model-desc">先规划</span>
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>

            <!-- 会话配置（模型+供应商+Skills，仅 AI 会话显示） -->
            <div v-if="!isCurrentSessionChat">
              <el-button text class="action-btn model-btn" @click="showSessionConfigDialog = true" title="会话配置">
                <i class="pi pi-cog"></i>
                <span class="model-label">配置</span>
              </el-button>
            </div>

            <!-- 角色选择（仅 AI 会话显示） -->
            <!-- <div v-if="!isCurrentSessionChat">
              <el-button text class="action-btn" @click="showRoleDialog = true" title="选择角色">
                <i class="pi pi-user"></i>
              </el-button>
            </div> -->

            <!-- 自动继续配置（仅 AI 会话显示，实验性功能） -->
            <div v-if="!isCurrentSessionChat && enableExperimental">
              <el-button
                text
                class="action-btn"
                :class="{ active: agentStore.autoContinueConfig.enabled }"
                @click="showAutoContinueDialog = true"
                title="自动继续配置"
              >
                <i class="pi pi-sync"></i>
              </el-button>
            </div>

            <!-- 提醒列表（仅 AI 会话显示） -->
            <div v-if="!isCurrentSessionChat">
              <el-button text class="action-btn" @click="showReminderDialog = true" title="提醒列表">
                <i class="pi pi-bell"></i>
              </el-button>
            </div>

            <!-- 文件管理 -->
            <div>
              <el-button text class="action-btn" @click="toggleFileManager" title="文件管理">
                <i class="pi pi-folder"></i>
              </el-button>
            </div>

            <!-- 清空会话 -->
            <div>
              <el-button text class="action-btn" @click="confirmClearChat" title="清空会话">
                <i class="pi pi-trash"></i>
              </el-button>
            </div>
          </template>

          <!-- 切换会话列表（独立会话模式下隐藏） -->
          <div v-if="!isStandaloneSessionMode">
            <el-button text class="action-btn" @click="toggleSessionSidebar" title="切换会话列表">
              <i class="pi pi-bars"></i>
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 聊天内容 -->
    <div class="chat-content-wrapper">
      <!-- 空状态 - 仅在内部沟通且没有选中会话时显示 -->
      <div v-if="!agentStore.currentSession && agentStore.sessionTypeFilter === 'chat'" class="empty-state-container">
        <el-empty description="请选择或创建聊天会话">
        </el-empty>
      </div>

      <!-- 正常显示聊天内容 -->
      <template v-else>
        <div class="chat-content">
          <AgentChat />
        </div>

        <!-- 文件管理面板 - 桌面端：侧边栏 -->
        <template v-if="showFilePanel && !isMobile">
          <ResizableSplitter
            :current-width="filePanelWidth"
            :min-width="280"
            :max-width="800"
            direction="right"
            @resize="onFilePanelResize"
          />
          <div class="file-panel" :style="{ width: filePanelWidth + 'px' }">
            <FileManager :session-id="agentStore.currentSession" />
          </div>
        </template>
      </template>
    </div>

    <!-- 文件管理面板 - 移动端：抽屉 -->
    <el-drawer
    class="file-manager-drawer"
      v-model="showFilePanel"
      v-if="isMobile"
      title="文件管理"
      direction="rtl"
      size="85%"
      :modal="true"
    >
      <FileManager :session-id="agentStore.currentSession" />
    </el-drawer>

    <!-- 角色选择对话框 -->
    <RoleDialog
      v-model:visible="showRoleDialog"
      :session-id="agentStore.currentSession"
      @role-applied="handleRoleApplied"
    />

    <!-- 会话配置弹窗（模型+供应商+Skills） -->
    <SessionConfigDialog
      v-model="showSessionConfigDialog"
      :session-id="agentStore.currentSession"
      @model-change="handleModelChange"
    />

    <!-- 自动继续配置对话框 -->
    <AutoContinueDialog v-model:visible="showAutoContinueDialog" />

    <!-- 提醒列表对话框 -->
    <ReminderDialog
      v-model="showReminderDialog"
      :session-id="agentStore.currentSession"
    />

    <!-- 邀请获额度弹窗 -->
    <el-dialog
      v-if="!selfUseMode"
      v-model="showInviteDialog"
      title="邀请好友获额度"
      width="400px"
      :close-on-click-modal="true"
    >
      <div class="invite-dialog-content">
        <p class="invite-tip">分享邀请码或链接给好友，对方注册成功后双方均可获得额外额度！</p>
        <div class="invite-code-row">
          <span class="invite-code-label">我的邀请码</span>
          <span class="invite-code-value">{{ userStore.info.inviteCode || '—' }}</span>
        </div>
        <div class="invite-actions">
          <el-button type="primary" @click="copyInviteLink">
            <i class="pi pi-link"></i> 复制邀请链接
          </el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, inject } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useWindowSize } from '@vueuse/core'
import AgentChat from './AgentChat.vue'
import RoleDialog from './RoleDialog.vue'
import SessionConfigDialog from './SessionConfigDialog.vue'
import DefaultFileManager from './file/FileManager.vue'
import ResizableSplitter from './common/ResizableSplitter.vue'
import AutoContinueDialog from './AutoContinueDialog.vue'
import ReminderDialog from './ReminderDialog.vue'
import { useAgentStore as useDefaultStore } from './store'
import { AgentStoreKey, BaseUrlKey, IsLocalKey, FileManagerKey } from './injection'
import { useQuotaStore } from './quotaStore'
import { useUserStore } from '@/store/modules/user'
import { isSelfUseMode } from '@/utils/runtime-mode'
import http from '@/utils/http'

const route = useRoute()
const agentStore = inject(AgentStoreKey, null) || useDefaultStore()
const baseUrl = inject(BaseUrlKey, '')
const isLocal = inject(IsLocalKey, false)
const FileManager = inject(FileManagerKey, DefaultFileManager)
const showRoleDialog = ref(false)
const showSessionConfigDialog = ref(false)
const showAutoContinueDialog = ref(false)
const showReminderDialog = ref(false)
const showFilePanel = ref(false)
const filePanelWidth = ref(400)

// 响应式窗口尺寸
const { width } = useWindowSize()
const isMobile = computed(() => width.value < 768)

// 是否启用实验性功能
const enableExperimental = computed(() => import.meta.env.VITE_ENABLE_EXPERIMENTAL === 'true')

// 判断是否为独立会话窗口模式
const isStandaloneSessionMode = computed(() => {
  return !!route.params.sessionId
})

// 当前会话的角色信息
const currentRoleName = computed(() => agentStore.currentSessionInfo?.role_name)
const currentRoleAvatar = computed(() => agentStore.currentSessionInfo?.role_avatar_url)
const currentRoleColor = computed(() => agentStore.currentSessionInfo?.role_color)

// 模型相关
const modelLabel = computed(() => agentStore.currentModelType === 'fast' ? '快速' : '深思')
const selfUseMode = isSelfUseMode()

// 用户额度（使用共享 store，2 分钟缓存）
const quotaStore = useQuotaStore()
if (!selfUseMode) {
  quotaStore.fetchQuota()
}

// 邀请获额度
const userStore = useUserStore()
const showInviteDialog = ref(false)
const copyInviteLink = async () => {
  const code = userStore.info.inviteCode
  if (!code) return
  try {
    await navigator.clipboard.writeText(`${window.location.origin}/#/auth/register?invite=${code}`)
    ElMessage.success('邀请链接已复制')
  } catch {
    ElMessage.error('复制失败')
  }
}

// 模型切换（运行时更新 session config）
const handleModelChange = async (modelName: string | undefined) => {
  const sessionId = agentStore.currentSession
  if (!sessionId) return
  await agentStore.updateSessionConfig(sessionId, { model_name: modelName || null })
}

// 权限模式相关
const permissionMode = computed(() => {
  return agentStore.currentSessionInfo?.config?.permission_mode || 'bypassPermissions'
})
const permissionLabel = computed(() => {
  switch (permissionMode.value) {
    case 'plan': return '计划'
    case 'default': return '确认'
    default: return '自动'
  }
})
const permissionModeIcon = computed(() => {
  switch (permissionMode.value) {
    case 'plan': return 'pi pi-list-check'
    case 'default': return 'pi pi-shield'
    default: return 'pi pi-bolt'
  }
})
const handlePermissionModeChange = async (mode: string) => {
  const sessionId = agentStore.currentSession
  if (!sessionId) return
  await agentStore.updateSessionConfig(sessionId, { permission_mode: mode })
}

// 判断当前会话是否是内部聊天
const isCurrentSessionChat = computed(() => agentStore.currentSessionInfo?.type === 'chat')

// 聊天对象信息
const chatWithUser = computed(() => agentStore.currentSessionInfo?.chat_with)

// 切换会话时关闭文件管理面板
watch(() => agentStore.currentSession, () => {
  showFilePanel.value = false
})

const emit = defineEmits<{
  'session-sidebar-toggle': []
}>()

const toggleSessionSidebar = () => {
  emit('session-sidebar-toggle')
}

const toggleFileManager = () => {
  showFilePanel.value = !showFilePanel.value
}

const onFilePanelResize = (width: number) => {
  filePanelWidth.value = width
}

const exportChat = () => {
  // TODO: 实现导出对话功能
  ElMessage.info('导出功能开发中')
}

const confirmClearChat = async () => {
  if (!agentStore.currentSession) return

  try {
    // 根据会话类型显示不同的提示
    const message = isCurrentSessionChat.value
      ? '确定要清空当前会话吗？'
      : '确定要清空当前会话吗？'

    await ElMessageBox.confirm(message, '确认清空', {
      confirmButtonText: '清空',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await agentStore.clearSessionMessages(agentStore.currentSession)
    ElMessage.success('会话已清空')
  } catch (error) {
    // 用户取消
  }
}

const handleRoleApplied = async () => {
  // 角色应用成功后，重新加载会话列表
  await agentStore.loadSessions()
}

// 关闭独立会话窗口
const handleCloseWindow = async () => {
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    await getCurrentWindow().close()
  } catch (error) {
    console.error('关闭窗口失败:', error)
  }
}

</script>
<style lang="scss">
.file-manager-drawer{
  .el-drawer__header {
    display: none;
  }
  .el-drawer__body{
    padding: 0!important;
  }
}
</style>

<style scoped lang="scss">


.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #111111;
}

.chat-header {
  flex-shrink: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding: 14px 20px;
  app-region: drag;
  -webkit-app-region: drag;
  -webkit-user-select: none;
  user-select: none;

  .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;

    .ai-avatar {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: rgba(59, 130, 246, 0.1);
      // border: 1.5px solid rgba(59, 130, 246, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;

      .avatar-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .avatar-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        font-weight: 600;
        color: #3b82f6;
        text-transform: uppercase;
        background: rgba(59, 130, 246, 0.1);
      }
    }

    .ai-title {
      font-size: 15px;
      font-weight: 500;
      color: white;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 200px;
    }
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    app-region: no-drag;
    -webkit-app-region: no-drag;

    .action-btn {
      width: 36px;
      height: 36px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      color: #71717a;
      transition: all 0.2s;

      &:hover {
        background: rgba(255, 255, 255, 0.05);
        color: white;
      }

      &.active {
        background: rgba(59, 130, 246, 0.15);
        color: #3b82f6;
      }

      &.model-btn {
        width: auto;
        padding: 0 12px;
        gap: 6px;

        .model-label {
          font-size: 13px;
          margin-left: 6px;
        }
      }
    }

    .invite-btn {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 14px;
      cursor: pointer;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      font-weight: 500;
      transition: all 0.3s ease;
      white-space: nowrap;
      user-select: none;

      &:hover {
        background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
        box-shadow: 0 2px 12px rgba(102, 126, 234, 0.4);
        transform: translateY(-1px);
      }

      &:active {
        transform: translateY(0);
      }

      i {
        font-size: 12px;
      }
    }

    .quota-display {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      color: var(--el-text-color-regular);
      padding: 0 8px;
      cursor: default;

      i { font-size: 13px; margin-right:6px}
    }

  }
}

.invite-dialog-content {
  padding: 0 8px;

  .invite-tip {
    color: var(--el-text-color-secondary);
    font-size: 14px;
    margin-bottom: 20px;
    line-height: 1.6;
  }

  .invite-code-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    background: var(--el-fill-color-light);
    border-radius: 8px;
    margin-bottom: 20px;

    .invite-code-label {
      font-size: 14px;
      color: var(--el-text-color-regular);
    }

    .invite-code-value {
      font-family: monospace;
      font-size: 16px;
      font-weight: 600;
      letter-spacing: 2px;
      color: var(--el-text-color-primary);
    }
  }

  .invite-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
  }
}

// 模型下拉菜单样式
:deep(.el-dropdown-menu__item) {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;

  i {
    font-size: 14px;
    color: #71717a;
  }

  .model-desc {
    margin-left: auto;
    font-size: 11px;
    color: #52525b;
  }

  &.active {
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;

    i {
      color: #3b82f6;
    }
  }
}

.chat-content-wrapper {
  flex: 1;
  overflow: hidden;
  display: flex;
  position: relative;
}

.empty-state-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
}

// 深色模式
html.dark .empty-state-container {
  background: #101010;
}

.chat-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.file-panel {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

// 让分隔线始终可见
:deep(.resizable-splitter) {
  .splitter-line {
    opacity: 1;
    background: rgba(255, 255, 255, 0.08);
  }
}

// 浅色模式
html:not(.dark) {
  .chat-container {
    background: #ffffff;
  }

  .chat-header {
    border-bottom-color: #e5e7eb;

    .header-left {
      .ai-title {
        color: #111827;
      }
    }

    .header-actions .action-btn {
      color: #6b7280;

      &:hover {
        background: #f3f4f6;
        color: #111827;
      }
    }
  }

  :deep(.resizable-splitter) {
    .splitter-line {
      background: #e5e7eb;
    }
  }
}

@media (max-width: 768px) {
  .ai-title {
    max-width: 50px!important;
  }
}
</style>
