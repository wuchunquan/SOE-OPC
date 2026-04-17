<template>
  <div class="agent-chat" :class="{ 'is-floating': isFloating }">
    <!-- 消息列表 -->
    <AgentMessageList
      :messages="currentMessages"
      :streaming-message="currentStreamingMessage"
      :has-more="currentHasMore"
      :session-info="currentSessionInfo"
      @load-more="handleLoadMore"
      @scrolled-to-top="handleScrolledToTop"
      @delete-message="handleDeleteMessage"
      @recall-message="handleRecallMessage"
    />

    <!-- 系统状态提示（如 compacting 上下文压缩） -->
    <div v-if="agentStore.systemStatus" class="system-status-indicator">
      <div class="status-content">
        <i class="pi pi-spin pi-spinner"></i>
        <span>{{ agentStore.systemStatus.message }}</span>
      </div>
    </div>

    <!-- 工具审批栏 -->
    <ToolApprovalDialog />

    <!-- 计划审批面板 -->
    <Transition name="plan-slide">
      <div v-if="agentStore.pendingPlan" class="plan-approval-bar">
        <div class="plan-content">
          <div class="plan-header">
            <i class="pi pi-list-check"></i>
            <span class="plan-title">执行计划</span>
          </div>
          <div class="plan-text" v-html="renderPlanMarkdown(agentStore.pendingPlan.plan)"></div>
          <div class="plan-actions">
            <el-button size="small" @click="handlePlanApproval(false)" plain>重新规划</el-button>
            <el-button size="small" type="primary" @click="handlePlanApproval(true)">执行计划</el-button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 输入框 -->
    <AgentInput
      :disabled="agentStore.inputLocked"
      @send="handleSend"
      @stop="handleStop"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, computed, inject } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAgentStore as useDefaultStore } from './store'
import { AgentStoreKey, AgentApiKey } from './injection'
import * as defaultApi from './api'
import AgentMessageList from './AgentMessageList.vue'
import AgentInput from './AgentInput.vue'
import ToolApprovalDialog from './ToolApprovalDialog.vue'

const props = withDefaults(
  defineProps<{
    sessionId?: string
    isFloating?: boolean
  }>(),
  {
    isFloating: false
  }
)

const agentStore = inject(AgentStoreKey, null) || useDefaultStore()
const agentApi = inject(AgentApiKey, null) || defaultApi

// 浮窗模式下始终使用 AI 状态，全页面模式使用过滤器控制的状态
const currentMessages = computed(() => {
  return props.isFloating ? agentStore.aiMessages : agentStore.messages
})

const currentStreamingMessage = computed(() => {
  return props.isFloating ? agentStore.aiStreamingMessage : agentStore.streamingMessage
})

const currentHasMore = computed(() => {
  return props.isFloating ? agentStore.aiHasMoreMessages : agentStore.hasMoreMessages
})

const currentSessionInfo = computed(() => {
  return props.isFloating ? agentStore.currentAiSessionInfo : agentStore.currentSessionInfo
})

onMounted(async () => {
  console.log('AgentChat mounted with sessionId:', props.sessionId);
  if (props.sessionId) {
    // 加载指定会话
    await agentStore.switchSession(props.sessionId)
  } else {
    // 初始化（加载会话列表，选择第一个会话）
    await agentStore.initialize()
  }

  // 检查是否有待审批的工具请求（页面刷新恢复状态）
  if (agentStore.currentSession) {
    await agentStore.checkPendingApproval()
    // 检查是否有正在进行的生成（页面刷新恢复）
    await agentStore.checkAndPollGeneration()
  }
})

onUnmounted(() => {
  // 清理轮询定时器
  agentStore.stopGenerationPolling()
})

const handleSend = async (message: string, files: any[]) => {
  await agentStore.sendMessage(message, files)
}

const handleStop = () => {
  agentStore.stopGeneration()
}

// 简单的 markdown 渲染（用于计划文本）
function renderPlanMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
    .replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>')
    .replace(/\n/g, '<br>')
}

// 响应计划审批
const handlePlanApproval = async (approved: boolean) => {
  agentStore.pendingPlan = null

  // 放行或拒绝 ExitPlanMode 工具调用
  await agentStore.respondToolApproval(approved)

  if (approved) {
    // 切换到自动模式执行计划
    const sessionId = agentStore.currentSession
    if (sessionId) {
      await agentStore.updateSessionConfig(sessionId, { permission_mode: 'bypassPermissions' })
    }
  }
}

const handleGlobalPlanKeydown = (event: KeyboardEvent) => {
  if (!agentStore.pendingPlan || event.key !== 'Enter') return
  event.preventDefault()
  event.stopPropagation()
  handlePlanApproval(true)
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalPlanKeydown, true)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalPlanKeydown, true)
})

const handleLoadMore = async () => {
  await agentStore.loadMoreMessages()
}

const handleScrolledToTop = () => {
  // 滚动到顶部时加载更多
  handleLoadMore()
}

// 删除消息
const handleDeleteMessage = async (messageId: string) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除这条消息吗？删除后无法恢复。',
      '删除消息',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )

    await agentApi.deleteMessage(messageId)

    // 从 store 中移除消息
    agentStore.removeMessage(messageId)

    ElMessage.success('消息已删除')
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除消息失败:', error)
      ElMessage.error(error.message || '删除消息失败')
    }
  }
}

// 撤回消息
const handleRecallMessage = async (messageId: string) => {
  try {
    await ElMessageBox.confirm(
      '确定要撤回这条消息吗？撤回后双方都将看不到该消息。',
      '撤回消息',
      {
        confirmButtonText: '撤回',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--warning'
      }
    )

    await agentStore.recallMessage(messageId)
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('撤回消息失败:', error)
    }
  }
}
</script>

<style scoped lang="scss">
.agent-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--el-bg-color);

  &.is-floating {
    overflow: hidden;
  }
}

// 系统状态提示
.system-status-indicator {
  padding: 12px 20px;
  background: var(--el-bg-color);
  border-top: 1px solid var(--el-border-color-light);
  flex-shrink: 0;

  .status-content {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 8px 16px;
    background: var(--el-color-warning-light-9);
    border: 1px solid var(--el-color-warning-light-7);
    border-radius: 8px;
    color: var(--el-color-warning);
    font-size: 14px;

    i {
      font-size: 16px;
      animation: rotate 1s linear infinite;
    }
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

// 深色模式
html.dark .system-status-indicator {
  .status-content {
    background: rgba(230, 162, 60, 0.1);
    border-color: rgba(230, 162, 60, 0.3);
    color: #e6a23c;
  }
}

// 计划审批面板
.plan-approval-bar {
  padding: 10px 20px;
  border-top: 1px solid var(--el-border-color-light);
  flex-shrink: 0;
  max-height: 40vh;
  overflow-y: auto;

  .plan-content {
    padding: 12px 16px;
    background: rgba(34, 197, 94, 0.08);
    border: 1px solid rgba(34, 197, 94, 0.25);
    border-radius: 8px;
  }

  .plan-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 600;
    color: #22c55e;
    margin-bottom: 10px;

    > i { font-size: 16px; }
  }

  .plan-text {
    font-size: 13px;
    line-height: 1.6;
    color: var(--el-text-color-primary);
    margin-bottom: 12px;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 6px;
    max-height: 20vh;
    overflow-y: auto;

    :deep(li) {
      margin-left: 16px;
      list-style: disc;
    }
    :deep(strong) {
      font-weight: 600;
    }
  }

  .plan-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
}

// 计划面板过渡动画
.plan-slide-enter-active,
.plan-slide-leave-active {
  transition: all 0.25s ease;
}
.plan-slide-enter-from,
.plan-slide-leave-to {
  opacity: 0;
  max-height: 0;
  padding: 0 20px;
  overflow: hidden;
}

html:not(.dark) .plan-approval-bar {
  .plan-content {
    background: rgba(34, 197, 94, 0.06);
    border-color: rgba(34, 197, 94, 0.2);
  }

  .plan-text {
    background: rgba(0, 0, 0, 0.02);
  }
}
</style>
