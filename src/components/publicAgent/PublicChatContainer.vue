<template>
  <div class="chat-container public-mode">
    <!-- 加载中 -->
    <div v-if="loading" class="loading-container">
      <el-icon class="loading-icon"><Loading /></el-icon>
      <span>加载中...</span>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-container">
      <el-icon class="error-icon"><WarningFilled /></el-icon>
      <span>{{ error }}</span>
      <el-button type="primary" @click="initPage">重试</el-button>
    </div>

    <!-- 聊天界面 -->
    <template v-else>
      <!-- 顶部工具栏 -->
      <div class="chat-header">
        <div class="header-content">
          <div class="header-left">
            <div class="ai-avatar">
              <img
                v-if="roleInfo?.avatar_url"
                :src="roleInfo.avatar_url"
                :alt="roleInfo.name"
                class="avatar-img"
              />
              <img v-else src="/logo.png" alt="AI助手" class="avatar-img" />
            </div>
            <span class="ai-title opacity-90">
              {{ roleInfo?.name || 'AI 助手' }}
            </span>
          </div>

          <!-- 操作按钮 -->
          <div class="header-actions">
            <div>
            <!-- 权限模式切换（三种模式循环） -->
            <el-tooltip :content="permissionModeLabel" placement="bottom">
              <el-button
                text
                class="action-btn"
                :class="{ active: permissionMode !== 'bypassPermissions' }"
                @click="togglePermissionMode"
              >
                <i :class="permissionModeIcon"></i>
              </el-button>
            </el-tooltip>
</div><div v-if="enableExperimental">
            <!-- 自动继续配置 -->
            <el-button
              text
              class="action-btn"
              :class="{ active: autoContinueConfig.enabled }"
              @click="showAutoContinueDialog = true"
              title="自动继续配置"
            >
              <i class="pi pi-sync"></i>
            </el-button>
</div><div>
            <!-- 分享会话 -->
            <el-button
              text
              class="action-btn"
              @click="shareSession"
              title="分享会话"
            >
              <i class="pi pi-share-alt"></i>
            </el-button>
</div><div>
            <!-- 文件管理 -->
            <el-button
              text
              class="action-btn"
              :class="{ active: showFilePanel }"
              @click="toggleFileManager"
              title="文件管理"
            >
              <i class="pi pi-folder"></i>
            </el-button>
</div><div>
            <!-- 切换主题 -->
            <el-button text class="action-btn" @click="toggleTheme" :title="isDark ? '切换到浅色模式' : '切换到深色模式'">
              <i :class="isDark ? 'pi pi-sun' : 'pi pi-moon'"></i>
            </el-button>
</div><div>
            <!-- 清空会话 -->
            <el-button text class="action-btn" @click="confirmClearChat" title="清空会话">
              <i class="pi pi-eraser"></i>
            </el-button></div>
          </div>
        </div>
      </div>

      <!-- 聊天内容 -->
      <div class="chat-content-wrapper">
        <div class="chat-content">
          <!-- 消息列表 -->
          <AgentMessageList
            :messages="messages"
            :streaming-message="streamingMessage"
            :has-more="false"
            :session-info="sessionInfo"
            :session-id="sessionId"
            :visitor-id="visitorId"
            :is-public-mode="true"
          />

          <!-- 工具审批栏 -->
          <Transition name="approval-slide">
            <div v-if="pendingApproval" class="tool-approval-bar">
              <!-- AskUserQuestion -->
              <div v-if="pendingApproval.tool_name === 'AskUserQuestion'" class="ask-panel">
                <div class="ask-header">
                  <div class="ask-header-left">
                    <i class="pi pi-question-circle ask-icon"></i>
                    <span v-if="publicQuestions.length === 1" class="ask-title">{{ publicQuestions[0].header }}</span>
                    <template v-else>
                      <button
                        v-for="(q, idx) in publicQuestions"
                        :key="idx"
                        class="ask-tab"
                        :class="{ active: publicActiveTab === idx, done: hasPublicAnswer(idx) && publicActiveTab !== idx }"
                        @click="publicActiveTab = idx"
                      >
                        {{ q.header }}
                        <i v-if="hasPublicAnswer(idx)" class="pi pi-check ask-tab-check"></i>
                      </button>
                    </template>
                  </div>
                  <div class="ask-header-right">
                    <span v-if="publicQuestions.length > 1" class="ask-progress">{{ publicAnsweredCount }}/{{ publicQuestions.length }}</span>
                    <button class="ask-skip" @click="handleApproval(false)">跳过</button>
                  </div>
                </div>
                <div class="ask-question">{{ publicQuestions[publicActiveTab]?.question }}</div>
                <div class="ask-bottom">
                  <div class="ask-chips">
                    <template v-if="!publicQuestions[publicActiveTab]?.multiSelect">
                      <el-tooltip
                        v-for="(opt, oIdx) in publicQuestions[publicActiveTab]?.options"
                        :key="oIdx"
                        :content="opt.description"
                        :disabled="!opt.description"
                        placement="top"
                        :show-after="400"
                      >
                        <button
                          class="ask-chip"
                          :class="{ selected: publicSelectedAnswers[publicActiveTab] === opt.label }"
                          @click="selectPublicOption(publicActiveTab, opt.label, false)"
                        >{{ opt.label }}</button>
                      </el-tooltip>
                    </template>
                    <template v-else>
                      <el-tooltip
                        v-for="(opt, oIdx) in publicQuestions[publicActiveTab]?.options"
                        :key="oIdx"
                        :content="opt.description"
                        :disabled="!opt.description"
                        placement="top"
                        :show-after="400"
                      >
                        <button
                          class="ask-chip"
                          :class="{ selected: (publicSelectedAnswers[publicActiveTab] || []).includes(opt.label) }"
                          @click="selectPublicOption(publicActiveTab, opt.label, true)"
                        >{{ opt.label }}</button>
                      </el-tooltip>
                    </template>
                  </div>
                  <button
                    v-if="publicQuestions.length > 1 && publicActiveTab < publicQuestions.length - 1"
                    class="ask-next"
                    :disabled="!hasPublicAnswer(publicActiveTab)"
                    @click="publicActiveTab++"
                  >下一项 <i class="pi pi-angle-right"></i></button>
                  <button
                    class="ask-submit"
                    :disabled="!allPublicQuestionsAnswered"
                    @click="handleSubmitPublicAnswers"
                  >提交</button>
                </div>
              </div>

              <!-- 普通工具审批 -->
              <div v-else class="approval-content">
                <div class="approval-info">
                  <i class="pi pi-shield"></i>
                  <span class="tool-name">{{ pendingApproval.tool_name }}</span>
                  <span class="approval-hint">请求</span>
                </div>
                <div class="approval-actions">
                  <div>
                  <el-button size="small" @click="handleApproval(false)" plain>拒绝</el-button>
                  </div>
                  <div>
                  <el-button size="small" @click="publicShowReasonInput = !publicShowReasonInput" plain>回复</el-button>
                  </div>
                  <div>
                  <el-button size="small" type="primary" @click="handleApproval(true)">允许</el-button>
                    </div>
                </div>
              </div>
              <!-- 拒绝原因输入 -->
              <div v-if="publicShowReasonInput && !isPublicAskUserQuestion" class="deny-reason-row">
                <input
                  v-model="publicDenyReason"
                  class="deny-reason-input"
                  placeholder="请输入拒绝原因..."
                  @keyup.enter="handleDenyWithReason"
                />
                <button class="deny-reason-send" :disabled="!publicDenyReason.trim()" @click="handleDenyWithReason">发送</button>
              </div>
            </div>
          </Transition>

          <!-- 计划审批面板 -->
          <Transition name="approval-slide">
            <div v-if="pendingPlan" class="plan-approval-bar">
              <div class="plan-content">
                <div class="plan-header">
                  <i class="pi pi-list-check"></i>
                  <span class="plan-title">执行计划</span>
                </div>
                <div class="plan-text" v-html="renderPlanMarkdown(pendingPlan.plan)"></div>
                <div class="plan-actions">
                  <el-button size="small" @click="handlePlanApproval(false)" plain>重新规划</el-button>
                  <el-button size="small" type="primary" @click="handlePlanApproval(true)">执行计划</el-button>
                </div>
              </div>
            </div>
          </Transition>

          <!-- 输入框 -->
          <AgentInput
            :disabled="isInputLocked"
            :placeholder="'输入消息...'"
            :session-id="sessionId"
            :visitor-id="visitorId"
            @send="handleSend"
            @stop="handleStop"
          />
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
            <FileManager
              :session-id="sessionId"
              :is-public-mode="true"
              :visitor-id="visitorId"
            />
          </div>
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
        <FileManager
          :session-id="sessionId"
          :is-public-mode="true"
          :visitor-id="visitorId"
        />
      </el-drawer>
      <!-- 自动继续配置对话框 -->
      <el-dialog
        v-model="showAutoContinueDialog"
        title="自动继续配置"
        width="400px"
        :close-on-click-modal="false"
      >
        <div class="auto-continue-config">
          <div class="config-item">
            <div class="config-label">
              <span>启用自动继续</span>
              <span class="config-desc">AI 回复完成后自动发送消息继续对话</span>
            </div>
            <el-switch v-model="autoContinueConfig.enabled" />
          </div>
          <div class="config-item" :class="{ disabled: !autoContinueConfig.enabled }">
            <div class="config-label">
              <span>间隔时间（秒）</span>
              <span class="config-desc">AI 回复完成后等待多少秒发送下一条</span>
            </div>
            <el-input-number v-model="autoContinueConfig.interval" :min="1" :max="300" :step="1" :disabled="!autoContinueConfig.enabled" style="width: 120px" />
          </div>
          <div class="config-item" :class="{ disabled: !autoContinueConfig.enabled }">
            <div class="config-label">
              <span>自动发送内容</span>
              <span class="config-desc">自动发送的消息内容</span>
            </div>
            <el-input v-model="autoContinueConfig.message" type="textarea" :rows="3" placeholder="请输入自动发送的内容" :disabled="!autoContinueConfig.enabled" />
          </div>
          <div v-if="autoContinueConfig.enabled && autoContinueStatus" class="status-info">
            <i class="pi pi-spin pi-spinner" v-if="autoContinueStatus.waiting"></i>
            <span>{{ autoContinueStatus.message }}</span>
          </div>
        </div>
        <template #footer>
          <el-button @click="showAutoContinueDialog = false">关闭</el-button>
        </template>
      </el-dialog>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, reactive, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { Loading, WarningFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useWindowSize } from '@vueuse/core'
import AgentMessageList from './AgentMessageList.vue'
import AgentInput from './AgentInput.vue'
import FileManager from '@/components/agent/file/FileManager.vue'
import ResizableSplitter from '@/components/agent/common/ResizableSplitter.vue'
import { useTheme } from '@/hooks/core/useTheme'
import { useSettingStore } from '@/store/modules/setting'
import { SystemThemeEnum } from '@/enums/appEnum'
import type { AgentMessage, ContentBlock } from './types'

const route = useRoute()
const settingStore = useSettingStore()
const { switchThemeStyles } = useTheme()

// 状态
const loading = ref(true)
const error = ref('')
const roleInfo = ref<any>(null)
const sessionId = ref('')
const visitorId = ref('')
const messages = ref<AgentMessage[]>([])
const streamingMessage = ref<AgentMessage | null>(null)
const isStreaming = ref(false)
const showFilePanel = ref(false)
const filePanelWidth = ref(400)
const isSharedSession = ref(false) // 是否是通过分享链接进入的
const pendingApproval = ref<{ tool_name: string; input_data: any } | null>(null)
const pendingPlan = ref<{ plan: string } | null>(null)
const permissionMode = ref('bypassPermissions') // 默认自动模式
const isInputLocked = computed(() => isStreaming.value || !!pendingApproval.value || !!pendingPlan.value)

// 实验性功能开关
const enableExperimental = computed(() => import.meta.env.VITE_ENABLE_EXPERIMENTAL === 'true')

// 自动继续
const showAutoContinueDialog = ref(false)
const autoContinueConfig = reactive({ enabled: false, interval: 5, message: '继续' })
const autoContinueStatus = ref<{ waiting: boolean; message: string } | null>(null)
let autoContinueTimer: number | null = null
let autoContinueCountdownTimer: number | null = null

// 权限模式显示信息
const permissionModeIcon = computed(() => {
  switch (permissionMode.value) {
    case 'plan': return 'pi pi-list-check'
    case 'default': return 'pi pi-shield'
    default: return 'pi pi-bolt'
  }
})
const permissionModeLabel = computed(() => {
  switch (permissionMode.value) {
    case 'plan': return '计划模式（点击切换为自动模式）'
    case 'default': return '审批模式（点击切换为计划模式）'
    default: return '自动模式（点击切换为审批模式）'
  }
})

// 响应式窗口尺寸
const { width } = useWindowSize()
const isMobile = computed(() => width.value < 768)

// 主题相关
const isDark = computed(() => settingStore.systemThemeType === SystemThemeEnum.DARK)

// 切换主题
function toggleTheme() {
  const newTheme = isDark.value ? SystemThemeEnum.LIGHT : SystemThemeEnum.DARK
  switchThemeStyles(newTheme)
}

// 会话信息（用于显示头像）
const sessionInfo = computed(() => ({
  role_name: roleInfo.value?.name,
  role_avatar_url: roleInfo.value?.avatar_url,
  role_color: roleInfo.value?.color
}))

// 公开 API 基础路径
const PUBLIC_API_BASE = '/api/agent/public'

// 切换会话时关闭文件管理面板
watch(() => sessionId.value, () => {
  showFilePanel.value = false
})

// 切换文件管理面板
const toggleFileManager = () => {
  showFilePanel.value = !showFilePanel.value
}

// 文件面板宽度调整
const onFilePanelResize = (width: number) => {
  filePanelWidth.value = width
}

// 分享会话
const shareSession = async () => {
  if (!sessionId.value || !visitorId.value) {
    ElMessage.warning('会话尚未创建')
    return
  }

  // 构建分享链接（适配 hash 模式路由）
  const baseUrl = window.location.origin + window.location.pathname
  const hashPath = route.path
  const shareUrl = `${baseUrl}#${hashPath}?visitor_id=${visitorId.value}`

  try {
    await navigator.clipboard.writeText(shareUrl)
    ElMessage.success('分享链接已复制到剪贴板')
  } catch (err) {
    // 降级方案：使用 textarea
    const textarea = document.createElement('textarea')
    textarea.value = shareUrl
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    ElMessage.success('分享链接已复制到剪贴板')
  }
}

// 切换权限模式（三种模式循环：bypassPermissions → default → plan → bypassPermissions）
async function togglePermissionMode() {
  if (!sessionId.value || !visitorId.value) return
  const modeOrder = ['bypassPermissions', 'default', 'plan'] as const
  const currentIndex = modeOrder.indexOf(permissionMode.value as any)
  const newMode = modeOrder[(currentIndex + 1) % modeOrder.length]
  try {
    await fetch(`${PUBLIC_API_BASE}/sessions/${sessionId.value}/permission-mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitor_id: visitorId.value, permission_mode: newMode })
    })
    permissionMode.value = newMode
    const labels: Record<string, string> = {
      bypassPermissions: '已切换为自动模式',
      default: '已切换为审批模式',
      plan: '已切换为计划模式'
    }
    ElMessage.success(labels[newMode])
  } catch {
    ElMessage.error('切换失败')
  }
}

// 响应工具审批
async function handleApproval(approved: boolean, answers?: Record<string, any>, reason?: string) {
  if (!sessionId.value || !visitorId.value) return
  try {
    await fetch(`${PUBLIC_API_BASE}/sessions/${sessionId.value}/tool-approval`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitor_id: visitorId.value, approved, answers, reason })
    })
    pendingApproval.value = null
    publicSelectedAnswers.value = {}
  } catch {
    ElMessage.error('审批响应失败')
  }
}

function handleDenyWithReason() {
  const reason = publicDenyReason.value.trim()
  if (!reason) return
  handleApproval(false, undefined, reason)
}

// AskUserQuestion 选项管理
const publicSelectedAnswers = ref<Record<number, any>>({})
const publicActiveTab = ref(0)
const publicShowReasonInput = ref(false)
const publicDenyReason = ref('')
const isPublicAskUserQuestion = computed(() => pendingApproval.value?.tool_name === 'AskUserQuestion')

const publicQuestions = computed(() => {
  if (pendingApproval.value?.tool_name !== 'AskUserQuestion') return []
  return pendingApproval.value.input_data?.questions || []
})

// 监听 pendingApproval 变化重置选择
watch(pendingApproval, (val) => {
  if (val) {
    publicSelectedAnswers.value = {}
    publicActiveTab.value = 0
    publicShowReasonInput.value = false
    publicDenyReason.value = ''
  }
})

function selectPublicOption(qIdx: number, label: string, multiSelect: boolean) {
  if (multiSelect) {
    const current: string[] = publicSelectedAnswers.value[qIdx] || []
    if (current.includes(label)) {
      publicSelectedAnswers.value[qIdx] = current.filter(l => l !== label)
    } else {
      publicSelectedAnswers.value[qIdx] = [...current, label]
    }
    publicSelectedAnswers.value = { ...publicSelectedAnswers.value }
  } else {
    publicSelectedAnswers.value = { ...publicSelectedAnswers.value, [qIdx]: label }
  }
}

function hasPublicAnswer(idx: number): boolean {
  const answer = publicSelectedAnswers.value[idx]
  const q = publicQuestions.value[idx]
  if (!q) return false
  if (q.multiSelect) return Array.isArray(answer) && answer.length > 0
  return !!answer
}

const publicAnsweredCount = computed(() => {
  return publicQuestions.value.filter((_: any, idx: number) => hasPublicAnswer(idx)).length
})

const allPublicQuestionsAnswered = computed(() => {
  if (publicQuestions.value.length === 0) return false
  return publicQuestions.value.every((_: any, idx: number) => hasPublicAnswer(idx))
})

function handleSubmitPublicAnswers() {
  if (!pendingApproval.value) return
  const questions = pendingApproval.value.input_data?.questions || []
  const answers: Record<string, any> = {}
  questions.forEach((q: any, idx: number) => {
    const key = q.header || q.question
    answers[key] = publicSelectedAnswers.value[idx]
  })
  handleApproval(true, answers)
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
async function handlePlanApproval(approved: boolean) {
  if (!sessionId.value || !visitorId.value) return
  pendingPlan.value = null

  // 放行或拒绝 ExitPlanMode 工具调用
  await handleApproval(approved)

  if (approved) {
    // 切换到自动模式执行计划
    try {
      await fetch(`${PUBLIC_API_BASE}/sessions/${sessionId.value}/permission-mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitor_id: visitorId.value, permission_mode: 'bypassPermissions' })
      })
      permissionMode.value = 'bypassPermissions'
    } catch {
      ElMessage.error('切换执行模式失败')
    }
  }
}

// 自动继续 - 启动定时器
function startAutoContinue() {
  if (!autoContinueConfig.enabled || !sessionId.value || isStreaming.value) return
  cancelAutoContinue()

  let countdown = autoContinueConfig.interval
  autoContinueStatus.value = { waiting: true, message: `${countdown} 秒后自动发送...` }

  autoContinueCountdownTimer = window.setInterval(() => {
    countdown--
    if (countdown > 0) {
      autoContinueStatus.value = { waiting: true, message: `${countdown} 秒后自动发送...` }
    }
  }, 1000)

  autoContinueTimer = window.setTimeout(async () => {
    if (autoContinueCountdownTimer) clearInterval(autoContinueCountdownTimer)
    autoContinueStatus.value = null
    if (!autoContinueConfig.enabled || !sessionId.value || isStreaming.value) return
    const msg = autoContinueConfig.message
    if (msg) {
      console.log('[AutoContinue] 自动发送消息:', msg)
      await handleSend(msg, [])
    }
  }, autoContinueConfig.interval * 1000)
}

// 自动继续 - 取消定时器
function cancelAutoContinue() {
  if (autoContinueTimer) { clearTimeout(autoContinueTimer); autoContinueTimer = null }
  if (autoContinueCountdownTimer) { clearInterval(autoContinueCountdownTimer); autoContinueCountdownTimer = null }
  autoContinueStatus.value = null
}

// 关闭自动继续时清除定时器
watch(() => autoContinueConfig.enabled, (val) => { if (!val) cancelAutoContinue() })

onUnmounted(() => cancelAutoContinue())

// 获取或生成访客ID
// 优先从 URL 参数获取（分享链接），如果有则使用但不存储
function getVisitorId(): string {
  // 检查 URL 参数（适配 hash 模式路由，使用 route.query）
  const urlVisitorId = route.query.visitor_id as string | undefined

  if (urlVisitorId) {
    // 从分享链接进入，使用 URL 中的 visitor_id，但不存储
    isSharedSession.value = true
    return urlVisitorId
  }

  // 正常访问，从 localStorage 获取或生成新的
  const key = 'agent_visitor_id'
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id
}

// 初始化页面
async function initPage() {
  loading.value = true
  error.value = ''

  try {
    const roleId = route.params.roleId as string
    if (!roleId) {
      throw new Error('缺少角色ID')
    }

    // 获取访客ID
    visitorId.value = getVisitorId()

    // 获取角色信息
    const roleRes = await fetch(`${PUBLIC_API_BASE}/roles/${roleId}`)
    if (!roleRes.ok) {
      const errData = await roleRes.json().catch(() => ({}))
      throw new Error(errData.detail || '角色不存在或未开放公开访问')
    }
    roleInfo.value = await roleRes.json()

    // 创建会话
    const sessionRes = await fetch(`${PUBLIC_API_BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role_id: roleId,
        visitor_id: visitorId.value
      })
    })
    if (!sessionRes.ok) {
      throw new Error('创建会话失败')
    }
    const sessionData = await sessionRes.json()
    sessionId.value = sessionData.session_id
    permissionMode.value = sessionData.permission_mode || 'bypassPermissions'

    // 加载历史消息
    const messagesRes = await fetch(
      `${PUBLIC_API_BASE}/sessions/${sessionId.value}/messages?visitor_id=${visitorId.value}`
    )
    if (messagesRes.ok) {
      const messagesData = await messagesRes.json()
      messages.value = (messagesData.messages || []).map(transformMessage)
    }
  } catch (err: any) {
    console.error('初始化失败:', err)
    error.value = err.message || '加载失败'
  } finally {
    loading.value = false
  }
}

// 转换消息格式
function transformMessage(msg: any): AgentMessage {
  return {
    id: msg.id || 0,
    message_id: msg.message_id,
    session_id: msg.session_id || sessionId.value,
    role: msg.role,
    type: msg.type || 'message',
    content: Array.isArray(msg.content) ? msg.content : [{ type: 'text', text: msg.content }],
    timestamp: msg.timestamp || msg.created_at || new Date().toISOString(),
    status: 'completed'
  }
}

// 清空会话
async function confirmClearChat() {
  if (!sessionId.value) return

  try {
    await ElMessageBox.confirm('确定要清空当前会话吗？', '确认清空', {
      confirmButtonText: '清空',
      cancelButtonText: '取消',
      type: 'warning'
    })

    // 调用后端清空消息 API
    const response = await fetch(
      `${PUBLIC_API_BASE}/sessions/${sessionId.value}/messages?visitor_id=${visitorId.value}`,
      { method: 'DELETE' }
    )

    if (response.ok) {
      messages.value = []
      ElMessage.success('会话已清空')
    } else {
      // 如果后端不支持删除，至少清空前端显示
      messages.value = []
      ElMessage.success('会话已清空')
    }
  } catch (error) {
    // 用户取消
  }
}

// 发送消息
async function handleSend(message: string, files: any[]) {
  if (!message.trim() || isInputLocked.value) return

  // 用户手动发送时取消自动继续
  cancelAutoContinue()

  // 添加用户消息到列表
  const userMessage: AgentMessage = {
    id: 0,
    message_id: `user-${Date.now()}`,
    session_id: sessionId.value,
    role: 'user',
    type: 'message',
    content: [{ type: 'text', text: message }],
    timestamp: new Date().toISOString(),
    status: 'completed'
  }
  messages.value.push(userMessage)

  isStreaming.value = true
  streamingMessage.value = {
    id: 0,
    message_id: `assistant-${Date.now()}`,
    session_id: sessionId.value,
    role: 'assistant',
    type: 'message',
    content: [],
    timestamp: new Date().toISOString(),
    status: 'streaming'
  }

  try {
    const response = await fetch(
      `${PUBLIC_API_BASE}/sessions/${sessionId.value}/messages/stream`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          visitor_id: visitorId.value
        })
      }
    )

    if (!response.ok) {
      throw new Error('发送消息失败')
    }

    await readSSEStream(response)
  } catch (err: any) {
    console.error('发送消息失败:', err)
    messages.value = messages.value.filter(m => m.message_id !== userMessage.message_id)
    // 如果有流式消息，将其添加到消息列表
    if (streamingMessage.value) {
      // 检查是否有任何有效内容
      const hasContent = streamingMessage.value.content.some(c =>
        (c.type === 'text' && c.text) ||
        c.type === 'tool_use' ||
        c.type === 'tool_result' ||
        c.type === 'thinking'
      )
      if (hasContent) {
        messages.value.push({
          ...streamingMessage.value,
          status: 'completed'
        })
      }
    }
  } finally {
    isStreaming.value = false
    streamingMessage.value = null
  }
}

// 停止生成
async function handleStop() {
  // 取消自动继续
  cancelAutoContinue()
  // 调用后端停止接口
  if (sessionId.value && visitorId.value) {
    try {
      await fetch(`${PUBLIC_API_BASE}/sessions/${sessionId.value}/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitor_id: visitorId.value, approved: false })
      })
    } catch (err) {
      console.error('调用停止接口失败:', err)
    }
  }

  // 清除审批状态
  pendingApproval.value = null
  pendingPlan.value = null

  isStreaming.value = false
  if (streamingMessage.value) {
    // 检查是否有任何有效内容
    const hasContent = streamingMessage.value.content.some(c =>
      (c.type === 'text' && c.text) ||
      c.type === 'tool_use' ||
      c.type === 'tool_result' ||
      c.type === 'thinking'
    )
    if (hasContent) {
      messages.value.push({
        ...streamingMessage.value,
        status: 'completed'
      })
    }
    streamingMessage.value = null
  }
}

// 处理 SSE 流事件（handleSend 和 reconnect 共用）
function processSSEEvent(data: any) {
  if (!streamingMessage.value) return

  if (data.type === 'text_token') {
    const lastBlock = streamingMessage.value.content[streamingMessage.value.content.length - 1]
    if (lastBlock && lastBlock.type === 'text') {
      lastBlock.text = (lastBlock.text || '') + (data.token || data.text || '')
    } else {
      streamingMessage.value.content.push({ type: 'text', text: data.token || data.text || '' })
    }
    streamingMessage.value = { ...streamingMessage.value }
  } else if (data.type === 'tool_use') {
    streamingMessage.value.content.push({ type: 'tool_use', tool_name: data.tool_name, tool_input: data.tool_input })
    streamingMessage.value = { ...streamingMessage.value }
  } else if (data.type === 'tool_use_start') {
    streamingMessage.value.content.push({ type: 'tool_use', tool_name: data.tool_name, tool_input: {} })
    streamingMessage.value = { ...streamingMessage.value }
  } else if (data.type === 'tool_use_done') {
    const toolBlock = [...streamingMessage.value.content].reverse().find(
      (b: ContentBlock) => b.type === 'tool_use' && b.tool_name === data.tool_name
    )
    if (toolBlock) toolBlock.tool_input = data.tool_input
    streamingMessage.value = { ...streamingMessage.value }
  } else if (data.type === 'tool_result') {
    streamingMessage.value.content.push({ type: 'tool_result', tool_result: data.content })
    streamingMessage.value = { ...streamingMessage.value }
  } else if (data.type === 'thinking_token') {
    if (data.token) {
      const thinkingBlock = streamingMessage.value.content.find(block => block.type === 'thinking')
      if (thinkingBlock) {
        thinkingBlock.thinking = (thinkingBlock.thinking || '') + data.token
      } else {
        streamingMessage.value.content.unshift({ type: 'thinking', thinking: data.token })
      }
      streamingMessage.value = { ...streamingMessage.value }
    }
  } else if (data.type === 'thinking') {
    const existing = streamingMessage.value.content.find(block => block.type === 'thinking')
    if (!existing) {
      streamingMessage.value.content.unshift({ type: 'thinking', thinking: data.text || data.thinking })
      streamingMessage.value = { ...streamingMessage.value }
    }
  } else if (data.type === 'tool_approval_request') {
    pendingApproval.value = { tool_name: data.tool_name, input_data: data.input_data }
  } else if (data.type === 'plan_ready') {
    pendingPlan.value = { plan: data.plan }
  } else if (data.type === 'end') {
    const finalMessage: AgentMessage = { ...streamingMessage.value, status: 'completed' }
    messages.value.push(finalMessage)
    streamingMessage.value = null
    isStreaming.value = false
    // 触发自动继续
    startAutoContinue()
  } else if (data.type === 'error') {
    console.error('流式错误:', data.error)
    streamingMessage.value.content.push({ type: 'error', text: data.error })
    streamingMessage.value = { ...streamingMessage.value }
  }
}

// 读取 SSE 流
async function readSSEStream(response: Response) {
  const reader = response.body?.getReader()
  if (!reader) throw new Error('无法读取响应')

  const decoder = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    for (const line of chunk.split('\n')) {
      if (line.startsWith('data: ')) {
        try {
          processSSEEvent(JSON.parse(line.slice(6)))
        } catch { /* 忽略解析错误 */ }
      }
    }
  }
}

// 检查并重连正在进行的生成
async function checkAndReconnect() {
  if (!sessionId.value || !visitorId.value) return
  try {
    const res = await fetch(
      `${PUBLIC_API_BASE}/sessions/${sessionId.value}/generation-status?visitor_id=${visitorId.value}`
    )
    if (!res.ok) return
    const { generating } = await res.json()
    if (!generating) return

    // 后端正在生成，重连 SSE
    isStreaming.value = true
    streamingMessage.value = {
      id: 0,
      message_id: `reconnect-${Date.now()}`,
      session_id: sessionId.value,
      role: 'assistant',
      type: 'message',
      content: [],
      timestamp: new Date().toISOString(),
      status: 'streaming'
    }

    const sseRes = await fetch(
      `${PUBLIC_API_BASE}/sessions/${sessionId.value}/reconnect-stream?visitor_id=${visitorId.value}&last_event_id=0`
    )
    if (sseRes.ok) {
      await readSSEStream(sseRes)
    }
  } catch (err) {
    console.error('重连检查失败:', err)
  } finally {
    if (isStreaming.value && !streamingMessage.value) {
      isStreaming.value = false
    }
  }
}

onMounted(async () => {
  await initPage()
  // 页面加载后检查是否有正在进行的生成（断线重连）
  await checkAndReconnect()
})
</script>

<style lang="scss">
.file-manager-drawer {
  .el-drawer__header {
    display: none;
  }
  .el-drawer__body {
    padding: 0 !important;
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

.loading-container,
.error-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #71717a;

  .loading-icon {
    font-size: 32px;
    animation: rotate 1s linear infinite;
  }

  .error-icon {
    font-size: 48px;
    color: #ef4444;
  }
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.chat-header {
  flex-shrink: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding: 14px 20px;

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
        color: #60a5fa;
      }
    }
  }
}

.chat-content-wrapper {
  flex: 1;
  overflow: hidden;
  display: flex;
  position: relative;
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

// 工具审批栏
.tool-approval-bar {
  padding: 8px 20px 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

// AskUserQuestion 面板
.ask-panel {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.ask-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 28px;
}

.ask-header-left {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
}

.ask-icon {
  font-size: 14px;
  color: var(--el-color-primary, #409eff);
  flex-shrink: 0;
}

.ask-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-color-primary, #409eff);
  white-space: nowrap;
}

.ask-tab {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 10px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: transparent;
  color: rgba(255, 255, 255, 0.45);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  flex-shrink: 0;

  &:hover { color: rgba(255, 255, 255, 0.8); }
  &.active { background: var(--el-color-primary, #409eff); color: #fff; font-weight: 500; }
  &.done { color: #4ade80; }

  .ask-tab-check { font-size: 9px; }
}

.ask-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.ask-progress {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  font-variant-numeric: tabular-nums;
}

.ask-skip {
  padding: 2px 8px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    color: rgba(255, 255, 255, 0.8);
    background: rgba(255, 255, 255, 0.06);
  }
}

.ask-question {
  font-size: 13px;
  color: var(--el-text-color-primary, #fff);
  line-height: 1.5;
  padding: 0 2px;
}

.ask-bottom {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.ask-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1;
}

.ask-chip {
  padding: 5px 14px;
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  line-height: 1.3;

  &:hover {
    border-color: var(--el-color-primary, #409eff);
    color: #60a5fa;
    background: rgba(64, 158, 255, 0.08);
  }

  &.selected {
    border-color: var(--el-color-primary, #409eff);
    background: var(--el-color-primary, #409eff);
    color: #fff;
    font-weight: 500;
  }
}

.ask-next,
.ask-submit {
  padding: 5px 14px;
  border-radius: 15px;
  border: none;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  line-height: 1.3;
  flex-shrink: 0;

  &:disabled { opacity: 0.4; cursor: not-allowed; }
}

.ask-next {
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);

  &:hover:not(:disabled) {
    color: rgba(255, 255, 255, 0.8);
    border-color: rgba(255, 255, 255, 0.2);
  }

  i { font-size: 12px; }
}

.ask-submit {
  background: var(--el-color-primary, #409eff);
  color: #fff;
  font-weight: 500;

  &:hover:not(:disabled) { filter: brightness(1.1); }
}

// 普通审批
.approval-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 14px;
  background: rgba(64, 158, 255, 0.08);
  border: 1px solid rgba(64, 158, 255, 0.2);
  border-radius: 10px;

  .approval-info {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--el-color-primary);
    min-width: 0;
    overflow: hidden;

    > i { font-size: 15px; flex-shrink: 0; }
  }

  .tool-name {
    font-weight: 600;
    font-family: monospace;
    white-space: nowrap;
  }

  .approval-hint {
    color: var(--el-text-color-secondary);
    white-space: nowrap;
  }

  .approval-actions {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }
}

.deny-reason-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.deny-reason-input {
  flex: 1;
  padding: 6px 12px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  font-size: 13px;
  outline: none;
  background: var(--el-bg-color);
  color: var(--el-text-color-primary);
  transition: border-color 0.2s;

  &:focus {
    border-color: var(--el-color-primary);
  }
}

.deny-reason-send {
  padding: 6px 16px;
  border: none;
  border-radius: 8px;
  background: var(--el-color-danger);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;

  &:hover:not(:disabled) {
    filter: brightness(1.1);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

// 计划审批面板
.plan-approval-bar {
  padding: 10px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
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

// 审批栏过渡动画
.approval-slide-enter-active,
.approval-slide-leave-active {
  transition: all 0.25s ease;
}
.approval-slide-enter-from,
.approval-slide-leave-to {
  opacity: 0;
  max-height: 0;
  padding: 0 20px;
  overflow: hidden;
}

// 让分隔线始终可见
:deep(.resizable-splitter) {
  .splitter-line {
    opacity: 1;
    background: rgba(255, 255, 255, 0.08);
  }
}

// 自动继续配置对话框
.auto-continue-config {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.config-item {
  display: flex;
  flex-direction: column;
  gap: 8px;

  &.disabled {
    opacity: 0.5;
  }

  .config-label {
    display: flex;
    flex-direction: column;
    gap: 2px;

    > span:first-child {
      font-size: 14px;
      font-weight: 500;
      color: var(--el-text-color-primary);
    }

    .config-desc {
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }
  }
}

.status-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--el-color-primary-light-9);
  border-radius: 6px;
  font-size: 13px;
  color: var(--el-color-primary);

  i {
    font-size: 14px;
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

      &.active {
        background: rgba(59, 130, 246, 0.1);
        color: #3b82f6;
      }
    }
  }

  .loading-container,
  .error-container {
    color: #6b7280;
  }

  .tool-approval-bar {
    border-top-color: #e5e7eb;
  }

  .ask-panel {
    background: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary-light-7);
  }

  .ask-tab {
    color: #6b7280;
    &:hover { color: #111827; }
    &.active { background: var(--el-color-primary); color: #fff; }
    &.done { color: var(--el-color-success); }
  }

  .ask-skip {
    color: #6b7280;
    &:hover { color: #111827; background: rgba(0, 0, 0, 0.04); }
  }

  .ask-progress { color: #9ca3af; }

  .ask-chip {
    border-color: #d1d5db;
    background: #fff;
    color: #374151;

    &:hover {
      border-color: var(--el-color-primary);
      color: var(--el-color-primary);
      background: var(--el-color-primary-light-9);
    }

    &.selected {
      border-color: var(--el-color-primary);
      background: var(--el-color-primary);
      color: #fff;
    }
  }

  .ask-next {
    border-color: #e5e7eb;
    color: #6b7280;
    &:hover:not(:disabled) { color: #111827; border-color: #d1d5db; }
  }

  .approval-content {
    background: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary-light-7);
  }

  .plan-approval-bar {
    border-top-color: #e5e7eb;

    .plan-content {
      background: rgba(34, 197, 94, 0.06);
      border-color: rgba(34, 197, 94, 0.2);
    }

    .plan-text {
      background: rgba(0, 0, 0, 0.02);
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
