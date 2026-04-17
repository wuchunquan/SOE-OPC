<template>
  <Transition name="approval-slide">
    <div v-if="visible" class="tool-approval-bar">
      <!-- AskUserQuestion -->
      <div v-if="isAskUserQuestion" class="ask-panel">
        <!-- 顶部：Tab 切换（多问题时） + 操作按钮 -->
        <div class="ask-header">
          <div class="ask-header-left">
            <i class="pi pi-question-circle ask-icon"></i>
            <!-- 单个问题时只显示标题 -->
            <span v-if="questions.length === 1" class="ask-title">{{ questions[0].header }}</span>
            <!-- 多问题时显示 Tab -->
            <template v-else>
              <button
                v-for="(q, idx) in questions"
                :key="idx"
                class="ask-tab"
                :class="{ active: activeTab === idx, done: hasAnswer(idx) && activeTab !== idx }"
                @click="activeTab = idx"
              >
                {{ q.header }}
                <i v-if="hasAnswer(idx)" class="pi pi-check ask-tab-check"></i>
              </button>
            </template>
          </div>
          <div class="ask-header-right">
            <span v-if="questions.length > 1" class="ask-progress">{{ answeredCount }}/{{ questions.length }}</span>
            <button class="ask-skip" @click="handleDeny">跳过</button>
          </div>
        </div>

        <!-- 问题文本 -->
        <div class="ask-question">{{ currentQuestion?.question }}</div>

        <!-- Chip 选项 + 提交 -->
        <div class="ask-bottom">
          <div class="ask-chips">
            <template v-if="!currentQuestion?.multiSelect">
              <el-tooltip
                v-for="(opt, oIdx) in currentQuestion?.options"
                :key="oIdx"
                :content="opt.description"
                :disabled="!opt.description"
                placement="top"
                :show-after="400"
              >
                <button
                  class="ask-chip"
                  :class="{ selected: selectedAnswers[activeTab] === opt.label }"
                  @click="selectOption(activeTab, opt.label, false)"
                >{{ opt.label }}</button>
              </el-tooltip>
            </template>
            <template v-else>
              <el-tooltip
                v-for="(opt, oIdx) in currentQuestion?.options"
                :key="oIdx"
                :content="opt.description"
                :disabled="!opt.description"
                placement="top"
                :show-after="400"
              >
                <button
                  class="ask-chip"
                  :class="{ selected: (selectedAnswers[activeTab] || []).includes(opt.label) }"
                  @click="selectOption(activeTab, opt.label, true)"
                >{{ opt.label }}</button>
              </el-tooltip>
            </template>
          </div>
          <button
            v-if="questions.length > 1 && activeTab < questions.length - 1"
            class="ask-next"
            :disabled="!hasAnswer(activeTab)"
            @click="goNextTab"
          >下一项 <i class="pi pi-angle-right"></i></button>
          <button
            class="ask-submit"
            :disabled="!allQuestionsAnswered"
            @click="handleSubmitAnswers"
          >提交</button>
        </div>
      </div>

      <!-- 普通工具审批 -->
      <div v-else class="approval-content">
        <div class="approval-info">
          <i class="pi pi-shield"></i>
          <span class="tool-name">{{ approval?.tool_name }}</span>
          <span class="approval-hint">请求</span>
          <el-popover
            v-if="approval?.input_data"
            placement="top"
            :width="360"
            trigger="hover"
          >
            <template #reference>
              <span class="params-peek">
                <i class="pi pi-eye"></i>
                参数
              </span>
            </template>
            <pre class="params-detail">{{ formatParams }}</pre>
          </el-popover>
        </div>
        <div class="approval-actions">
          <div>
          <el-button size="small" @click="handleDeny" plain>拒绝</el-button>
          </div>
          <div>
          <el-button size="small" @click="showReasonInput = !showReasonInput" plain>回复</el-button>
          </div>
          <div>
          <el-button size="small" type="primary" @click="handleAllow">允许</el-button>
          </div>
        </div>
      </div>
      <!-- 拒绝原因输入 -->
      <div v-if="showReasonInput && !isAskUserQuestion" class="deny-reason-row">
        <input
          v-model="denyReason"
          class="deny-reason-input"
          placeholder="请输入拒绝原因..."
          @keyup.enter="handleDenyWithReason"
        />
        <button class="deny-reason-send" :disabled="!denyReason.trim()" @click="handleDenyWithReason">发送</button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref, watch, inject, onMounted, onUnmounted } from 'vue'
import { useAgentStore as useDefaultStore } from './store'
import { AgentStoreKey } from './injection'

interface QuestionOption {
  label: string
  description?: string
}

interface Question {
  question: string
  header: string
  options: QuestionOption[]
  multiSelect: boolean
}

const agentStore = inject(AgentStoreKey, null) || useDefaultStore()

const approval = computed(() => agentStore.pendingApproval)
const visible = computed(() => !!approval.value)
const isAskUserQuestion = computed(() => approval.value?.tool_name === 'AskUserQuestion')

const questions = computed<Question[]>(() => {
  if (!isAskUserQuestion.value) return []
  return approval.value?.input_data?.questions || []
})

const activeTab = ref(0)
const selectedAnswers = ref<Record<number, any>>({})
const currentQuestion = computed(() => questions.value[activeTab.value])
const showReasonInput = ref(false)
const denyReason = ref('')

watch(visible, (val) => {
  if (val) {
    selectedAnswers.value = {}
    activeTab.value = 0
    showReasonInput.value = false
    denyReason.value = ''
  }
})

const selectOption = (qIdx: number, label: string, multiSelect: boolean) => {
  if (multiSelect) {
    const current: string[] = selectedAnswers.value[qIdx] || []
    if (current.includes(label)) {
      selectedAnswers.value[qIdx] = current.filter(l => l !== label)
    } else {
      selectedAnswers.value[qIdx] = [...current, label]
    }
    selectedAnswers.value = { ...selectedAnswers.value }
  } else {
    selectedAnswers.value = { ...selectedAnswers.value, [qIdx]: label }
  }
}

const hasAnswer = (idx: number): boolean => {
  const answer = selectedAnswers.value[idx]
  const q = questions.value[idx]
  if (!q) return false
  if (q.multiSelect) return Array.isArray(answer) && answer.length > 0
  return !!answer
}

const answeredCount = computed(() =>
  questions.value.filter((_, idx) => hasAnswer(idx)).length
)

const allQuestionsAnswered = computed(() => {
  if (questions.value.length === 0) return false
  return questions.value.every((_, idx) => hasAnswer(idx))
})

const goNextTab = () => {
  if (activeTab.value < questions.value.length - 1) activeTab.value++
}

const handleSubmitAnswers = () => {
  const answers: Record<string, any> = {}
  questions.value.forEach((q, idx) => {
    answers[q.header || q.question] = selectedAnswers.value[idx]
  })
  agentStore.respondToolApproval(true, answers)
}

const formatParams = computed(() => {
  if (!approval.value?.input_data) return ''
  try { return JSON.stringify(approval.value.input_data, null, 2) }
  catch { return String(approval.value.input_data) }
})

const handleAllow = () => agentStore.respondToolApproval(true)
const handleDeny = () => agentStore.respondToolApproval(false)
const handleDenyWithReason = () => {
  const reason = denyReason.value.trim()
  if (!reason) return
  agentStore.respondToolApproval(false, undefined, reason)
}

const handleGlobalKeydown = (event: KeyboardEvent) => {
  if (!visible.value || !isAskUserQuestion.value || event.key !== 'Enter') return
  if (showReasonInput.value) return
  event.preventDefault()
  event.stopPropagation()
  if (questions.value.length > 1 && activeTab.value < questions.value.length - 1 && hasAnswer(activeTab.value)) {
    goNextTab()
    return
  }
  if (allQuestionsAnswered.value) {
    handleSubmitAnswers()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown, true)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown, true)
})
</script>

<style scoped lang="scss">
// === 容器 ===
.tool-approval-bar {
  padding: 8px 20px 10px;
  border-top: 1px solid var(--el-border-color-light);
  flex-shrink: 0;
}

// === AskUserQuestion 面板 ===
.ask-panel {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-7);
}

// 顶部栏
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
  color: var(--el-color-primary);
  flex-shrink: 0;
}

.ask-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-color-primary);
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
  color: var(--el-text-color-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  flex-shrink: 0;

  &:hover { color: var(--el-text-color-primary); }

  &.active {
    background: var(--el-color-primary);
    color: #fff;
    font-weight: 500;
  }

  &.done {
    color: var(--el-color-success);
  }

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
  color: var(--el-text-color-secondary);
  font-variant-numeric: tabular-nums;
}

.ask-skip {
  padding: 2px 8px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    color: var(--el-text-color-primary);
    background: rgba(0, 0, 0, 0.04);
  }
}

// 问题文字
.ask-question {
  font-size: 13px;
  color: var(--el-text-color-primary);
  line-height: 1.5;
  padding: 0 2px;
}

// 底部：chips + 按钮
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
  border: 1px solid var(--el-border-color);
  background: var(--el-bg-color);
  color: var(--el-text-color-regular);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  line-height: 1.3;

  &:hover {
    border-color: var(--el-color-primary);
    color: var(--el-color-primary);
  }

  &.selected {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary);
    color: #fff;
    font-weight: 500;
  }
}

// 下一项 / 提交按钮
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

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.ask-next {
  background: transparent;
  color: var(--el-text-color-secondary);
  border: 1px solid var(--el-border-color-light);

  &:hover:not(:disabled) {
    color: var(--el-text-color-primary);
    border-color: var(--el-border-color);
  }

  i { font-size: 12px; }
}

.ask-submit {
  background: var(--el-color-primary);
  color: #fff;
  font-weight: 500;

  &:hover:not(:disabled) {
    filter: brightness(1.1);
  }
}

// === 普通审批 ===
.approval-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 14px;
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-7);
  border-radius: 10px;
}

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

.tool-name { font-weight: 600; font-family: monospace; white-space: nowrap; }

.approval-hint { color: var(--el-text-color-secondary); white-space: nowrap; }

.params-peek {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  cursor: pointer;
  white-space: nowrap;
  padding: 2px 6px;
  border-radius: 4px;
  transition: background 0.2s;
  &:hover { background: var(--el-fill-color); color: var(--el-color-primary); }
}

.params-detail {
  margin: 0; font-size: 12px; line-height: 1.5;
  max-height: 240px; overflow: auto;
  white-space: pre-wrap; word-break: break-all;
}

.approval-actions { display: flex; gap: 6px; flex-shrink: 0; }

// === 拒绝原因输入 ===
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

// === 动画 ===
.approval-slide-enter-active,
.approval-slide-leave-active {
  transition: all 0.25s ease;
}
.approval-slide-enter-from,
.approval-slide-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

// === 深色模式 ===
html.dark {
  .tool-approval-bar {
    border-top-color: rgba(255, 255, 255, 0.06);
  }

  .ask-panel {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.08);
  }

  .ask-tab {
    color: rgba(255, 255, 255, 0.45);
    &:hover { color: rgba(255, 255, 255, 0.8); }
    &.active { background: var(--el-color-primary); color: #fff; }
    &.done { color: #4ade80; }
  }

  .ask-skip:hover {
    background: rgba(255, 255, 255, 0.06);
  }

  .ask-chip {
    border-color: rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.04);
    color: rgba(255, 255, 255, 0.7);

    &:hover {
      border-color: var(--el-color-primary);
      color: #60a5fa;
      background: rgba(64, 158, 255, 0.08);
    }

    &.selected {
      border-color: var(--el-color-primary);
      background: var(--el-color-primary);
      color: #fff;
    }
  }

  .ask-next {
    border-color: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.5);
    &:hover:not(:disabled) {
      color: rgba(255, 255, 255, 0.8);
      border-color: rgba(255, 255, 255, 0.2);
    }
  }

  .approval-content {
    background: rgba(64, 158, 255, 0.08);
    border-color: rgba(64, 158, 255, 0.2);
  }

  .deny-reason-input {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.12);
    color: rgba(255, 255, 255, 0.85);

    &:focus {
      border-color: var(--el-color-primary);
    }
  }
}
</style>
