<template>
  <el-dialog class="reminder-dialog" v-model="dialogVisible" title="定时任务" width="520px" :close-on-click-modal="false" destroy-on-close>
    <div class="scheduled-tasks">
      <!-- 顶部筛选 -->
      <div class="filter-bar">
        <div class="filter-tabs">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            class="filter-tab"
            :class="{ active: currentTab === tab.value }"
            @click="switchTab(tab.value)"
          >
            {{ tab.label }}
            <span v-if="tab.value === 'pending' && pendingCount > 0" class="tab-count">{{ pendingCount }}</span>
          </button>
        </div>
      </div>

      <!-- 列表容器：固定高度 -->
      <div class="task-scroll" ref="scrollRef">
        <!-- 加载中 -->
        <div v-if="loading && tasks.length === 0" class="state-box">
          <span class="loading-dot"></span>
          <span>加载中...</span>
        </div>

        <!-- 空状态 -->
        <div v-else-if="!loading && tasks.length === 0" class="state-box">
          <i class="pi pi-clock empty-icon"></i>
          <span>{{ currentTab === 'pending' ? '暂无待执行的任务' : '暂无任务记录' }}</span>
        </div>

        <!-- 任务列表 -->
        <template v-else>
          <div
            v-for="item in tasks"
            :key="item.id"
            class="task-card"
            :class="item.status"
          >
            <div class="card-left">
              <i class="status-icon" :class="statusIcon(item.status)"></i>
            </div>
            <div class="card-body">
              <div class="card-message">{{ item.trigger_message }}</div>
              <div class="card-info">
                <span class="status-tag" :class="item.status">{{ statusLabel(item.status) }}</span>
                <span v-if="item.trigger_type === 'cron'" class="info-tag type-tag">周期</span>
                <span v-else class="info-tag type-tag">一次</span>
                <span class="info-sep"></span>
                <span class="info-time">
                  <i class="pi pi-clock"></i>
                  {{ timeDescription(item) }}
                </span>
              </div>
              <div v-if="item.last_triggered_at" class="card-extra">
                最近触发: {{ formatTime(item.last_triggered_at) }}
              </div>
            </div>
            <div class="card-right">
              <el-button
                v-if="item.status === 'pending'"
                text
                size="small"
                class="cancel-btn"
                @click="cancelTask(item)"
                :loading="item._cancelling"
                title="取消任务"
              >
                <i class="pi pi-times"></i>
              </el-button>
              <el-button
                v-if="item.status !== 'pending'"
                text
                size="small"
                class="delete-btn"
                @click="deleteTask(item)"
                :loading="item._deleting"
                title="删除任务"
              >
                <i class="pi pi-trash"></i>
              </el-button>
            </div>
          </div>
        </template>

        <!-- 底部加载更多 -->
        <div v-if="loading && tasks.length > 0" class="loading-more">
          <span class="loading-dot"></span>
          <span>加载中...</span>
        </div>
      </div>

      <!-- 分页 -->
      <div v-if="total > pageSize" class="pagination-bar">
        <span class="page-info">共 {{ total }} 条</span>
        <div class="page-btns">
          <button class="page-btn" :disabled="currentPage <= 1" @click="goPage(currentPage - 1)">
            <i class="pi pi-chevron-left"></i>
          </button>
          <span class="page-num">{{ currentPage }} / {{ totalPages }}</span>
          <button class="page-btn" :disabled="currentPage >= totalPages" @click="goPage(currentPage + 1)">
            <i class="pi pi-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button type="primary" @click="showCreateForm = true">
          <i class="pi pi-plus" style="margin-right: 4px;" /> 添加任务
        </el-button>
        <el-button @click="dialogVisible = false">关闭</el-button>
      </div>
    </template>

    <!-- 创建任务弹窗 -->
    <el-dialog
      v-model="showCreateForm"
      title="添加定时任务"
      width="420px"
      :close-on-click-modal="false"
      append-to-body
      class="create-task-dialog"
    >
      <div class="create-form">
        <div class="form-row">
          <label class="form-label">触发消息</label>
          <el-input
            v-model="createForm.trigger_message"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 4 }"
            placeholder="到时间后发给 AI 的消息，AI 收到后会据此回复你"
            maxlength="500"
          />
        </div>
        <div class="form-row">
          <label class="form-label">类型</label>
          <div class="type-switch">
            <button
              class="type-btn"
              :class="{ active: createForm.trigger_type === 'date' }"
              @click="createForm.trigger_type = 'date'"
            >一次性</button>
            <button
              class="type-btn"
              :class="{ active: createForm.trigger_type === 'cron' }"
              @click="createForm.trigger_type = 'cron'"
            >周期性</button>
          </div>
        </div>
        <div class="form-row" v-if="createForm.trigger_type === 'date'">
          <label class="form-label">触发时间</label>
          <el-date-picker
            v-model="createForm.scheduled_time"
            type="datetime"
            placeholder="选择日期和时间"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </div>
        <div class="form-row" v-if="createForm.trigger_type === 'cron'">
          <label class="form-label">Cron 表达式</label>
          <el-input
            v-model="createForm.cron_expression"
            placeholder="如: 0 9 * * 1-5（工作日每天9点）"
          />
        </div>
      </div>
      <template #footer>
        <el-button @click="resetCreateForm">取消</el-button>
        <el-button type="primary" @click="submitCreate" :loading="createLoading">保存</el-button>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, inject, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import http from '@/utils/http'
import { BaseUrlKey } from './injection'

interface ScheduledTask {
  id: number
  trigger_message: string
  trigger_type: string
  scheduled_time: string | null
  cron_expression: string | null
  next_run_time: string | null
  last_triggered_at: string | null
  status: 'pending' | 'executed' | 'cancelled'
  created_at: string | null
  _cancelling?: boolean
  _deleting?: boolean
}

const props = defineProps<{
  modelValue: boolean
  sessionId: string | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
}>()

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const baseUrl = inject(BaseUrlKey, '')
const scrollRef = ref<HTMLElement | null>(null)

// 状态
const tasks = ref<ScheduledTask[]>([])
const loading = ref(false)
const total = ref(0)
const currentPage = ref(1)
const pageSize = 10
const pendingCount = ref(0)

// 筛选
const tabs = [
  { label: '待执行', value: 'pending' },
  { label: '全部', value: 'all' },
]
const currentTab = ref<'pending' | 'all'>('pending')

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

// --- 状态映射 ---
const statusLabel = (status: string) => {
  switch (status) {
    case 'pending': return '待执行'
    case 'executed': return '已执行'
    case 'cancelled': return '已取消'
    default: return status
  }
}

const statusIcon = (status: string) => {
  switch (status) {
    case 'pending': return 'pi pi-clock'
    case 'executed': return 'pi pi-check-circle'
    case 'cancelled': return 'pi pi-times-circle'
    default: return 'pi pi-circle'
  }
}

// --- 时间 ---
const timeDescription = (item: ScheduledTask) => {
  if (item.trigger_type === 'cron' && item.cron_expression) {
    return item.cron_expression
  }
  if (item.scheduled_time) {
    return formatTime(item.scheduled_time)
  }
  if (item.next_run_time) {
    return formatTime(item.next_run_time)
  }
  return '未知'
}

const formatTime = (isoStr: string) => {
  try {
    const d = new Date(isoStr)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    const hour = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    if (isToday) return `今天 ${hour}:${min}`
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${month}-${day} ${hour}:${min}`
  } catch {
    return isoStr
  }
}

// --- 请求 ---
const loadTasks = async (page = 1) => {
  if (!props.sessionId) return
  loading.value = true
  try {
    const resp = await http.get({
      url: `${baseUrl}/api/agent/sessions/${props.sessionId}/scheduled-tasks`,
      params: {
        include_finished: currentTab.value === 'all',
        page,
        page_size: pageSize,
      }
    })
    tasks.value = (resp.tasks || []).map((t: any) => ({ ...t, _cancelling: false, _deleting: false }))
    total.value = resp.total || 0
    currentPage.value = resp.page || 1

    // 首次加载时同时拿一下 pending 数量（用于 badge）
    if (currentTab.value === 'pending') {
      pendingCount.value = total.value
    }
  } catch {
    ElMessage.error('加载定时任务失败')
  } finally {
    loading.value = false
  }
}

const loadPendingCount = async () => {
  if (!props.sessionId) return
  try {
    const resp = await http.get({
      url: `${baseUrl}/api/agent/sessions/${props.sessionId}/scheduled-tasks`,
      params: { include_finished: false, page: 1, page_size: 1 }
    })
    pendingCount.value = resp.total || 0
  } catch { /* ignore */ }
}

const switchTab = (tab: 'pending' | 'all') => {
  if (tab === currentTab.value) return
  currentTab.value = tab
  currentPage.value = 1
  loadTasks(1)
}

const goPage = (page: number) => {
  if (page < 1 || page > totalPages.value) return
  loadTasks(page)
  // 滚到顶部
  nextTick(() => {
    scrollRef.value?.scrollTo({ top: 0, behavior: 'smooth' })
  })
}

const cancelTask = async (item: ScheduledTask) => {
  if (!props.sessionId) return
  item._cancelling = true
  try {
    await http.del({
      url: `${baseUrl}/api/agent/sessions/${props.sessionId}/scheduled-tasks/${item.id}`
    })
    item.status = 'cancelled'
    if (pendingCount.value > 0) pendingCount.value--
    ElMessage.success('任务已取消')
  } catch {
    ElMessage.error('取消失败')
  } finally {
    item._cancelling = false
  }
}

const deleteTask = async (item: ScheduledTask) => {
  if (!props.sessionId) return
  item._deleting = true
  try {
    await http.del({
      url: `${baseUrl}/api/agent/sessions/${props.sessionId}/scheduled-tasks/${item.id}/delete`
    })
    tasks.value = tasks.value.filter(t => t.id !== item.id)
    total.value = Math.max(0, total.value - 1)
    ElMessage.success('任务已删除')
  } catch {
    ElMessage.error('删除失败')
  } finally {
    item._deleting = false
  }
}

// --- 创建任务 ---
const showCreateForm = ref(false)
const createLoading = ref(false)
const createForm = reactive({
  trigger_message: '',
  trigger_type: 'date' as 'date' | 'cron',
  scheduled_time: '',
  cron_expression: '',
})

const resetCreateForm = () => {
  showCreateForm.value = false
  createForm.trigger_message = ''
  createForm.trigger_type = 'date'
  createForm.scheduled_time = ''
  createForm.cron_expression = ''
}

const submitCreate = async () => {
  if (!props.sessionId) return
  if (!createForm.trigger_message.trim()) {
    ElMessage.warning('请输入触发消息')
    return
  }
  if (createForm.trigger_type === 'date' && !createForm.scheduled_time) {
    ElMessage.warning('请选择触发时间')
    return
  }
  if (createForm.trigger_type === 'cron' && !createForm.cron_expression.trim()) {
    ElMessage.warning('请输入 Cron 表达式')
    return
  }

  createLoading.value = true
  try {
    const body: any = {
      trigger_message: createForm.trigger_message.trim(),
      trigger_type: createForm.trigger_type,
    }
    if (createForm.trigger_type === 'date') {
      body.scheduled_time = createForm.scheduled_time
    } else {
      body.cron_expression = createForm.cron_expression.trim()
    }

    await http.post({
      url: `${baseUrl}/api/agent/sessions/${props.sessionId}/scheduled-tasks`,
      data: body,
    })
    ElMessage.success('任务已创建')
    resetCreateForm()
    // 刷新列表
    currentPage.value = 1
    await loadTasks(1)
    await loadPendingCount()
  } catch {
    ElMessage.error('创建任务失败')
  } finally {
    createLoading.value = false
  }
}

// --- 打开时加载 ---
watch(() => props.modelValue, (visible) => {
  if (visible) {
    currentTab.value = 'pending'
    currentPage.value = 1
    tasks.value = []
    resetCreateForm()
    loadTasks(1)
    loadPendingCount()
  }
})
</script>
<style>
.reminder-dialog .el-dialog__body{
  padding: 0!important;
}
</style>
<style scoped lang="scss">
.scheduled-tasks {
  display: flex;
  flex-direction: column;
  // 固定整体高度
  height: 460px;
}

// ---- 顶部筛选 ----
.filter-bar {
  flex-shrink: 0;
  margin-bottom: 12px;
}

.filter-tabs {
  display: flex;
  gap: 4px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
  padding: 3px;
}

// ---- 创建表单（弹窗内） ----
.create-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 13px;
  color: var(--el-text-color-regular);
  font-weight: 500;
}

.type-switch {
  display: flex;
  gap: 4px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
  padding: 2px;
  width: fit-content;
}

.type-btn {
  padding: 4px 14px;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    color: var(--el-text-color-primary);
  }

  &.active {
    background: var(--el-bg-color);
    color: var(--el-color-primary);
    font-weight: 500;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  }
}

// ---- 底部按钮 ----
.dialog-footer {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.filter-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 6px 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    color: var(--el-text-color-primary);
  }

  &.active {
    background: var(--el-bg-color);
    color: var(--el-text-color-primary);
    font-weight: 500;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  }

  .tab-count {
    font-size: 11px;
    min-width: 18px;
    height: 18px;
    line-height: 18px;
    text-align: center;
    border-radius: 9px;
    background: var(--el-color-primary);
    color: #fff;
    font-weight: 500;
  }
}

// ---- 列表滚动区 ----
.task-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 4px;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--el-border-color);
    border-radius: 2px;
    &:hover { background: var(--el-border-color-darker); }
  }
}

// ---- 状态占位 ----
.state-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--el-text-color-placeholder);
  font-size: 13px;

  .empty-icon {
    font-size: 36px;
    opacity: 0.3;
  }

  .loading-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--el-color-primary);
    animation: dot-pulse 1.2s ease-in-out infinite;
  }
}

.loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 0 4px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  flex-shrink: 0;

  .loading-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--el-color-primary);
    animation: dot-pulse 1.2s ease-in-out infinite;
  }
}

@keyframes dot-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.75); }
}

// ---- 任务卡片 ----
.task-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
  transition: all 0.15s;

  &:hover {
    border-color: var(--el-border-color);
  }

  &.cancelled {
    opacity: 0.45;
  }
  &.executed {
    opacity: 0.6;
  }
}

.card-left {
  flex-shrink: 0;
  padding-top: 1px;

  .status-icon {
    font-size: 16px;
    color: var(--el-text-color-placeholder);
  }

  .task-card.pending & .status-icon {
    color: var(--el-color-primary);
  }
  .task-card.executed & .status-icon {
    color: var(--el-color-success);
  }
  .task-card.cancelled & .status-icon {
    color: var(--el-text-color-disabled);
  }
}

.card-body {
  flex: 1;
  min-width: 0;
}

.card-message {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  line-height: 1.4;
  word-break: break-word;
}

.card-info {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  flex-wrap: wrap;
}

.status-tag {
  display: inline-block;
  font-size: 11px;
  padding: 1px 7px;
  border-radius: 8px;
  font-weight: 500;
  line-height: 1.6;

  &.pending {
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
  }
  &.executed {
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
  }
  &.cancelled {
    background: rgba(107, 114, 128, 0.1);
    color: #6b7280;
  }
}

.info-tag {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 8px;
  line-height: 1.6;
}

.type-tag {
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
}

.info-sep {
  width: 1px;
  height: 10px;
  background: var(--el-border-color-lighter);
}

.info-time {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  display: flex;
  align-items: center;
  gap: 3px;

  i { font-size: 11px; }
}

.card-extra {
  font-size: 11px;
  color: var(--el-text-color-disabled);
  margin-top: 4px;
}

.card-right {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.cancel-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  border-radius: 6px;
  color: var(--el-text-color-placeholder);

  &:hover {
    color: var(--el-color-danger);
    background: rgba(239, 68, 68, 0.08);
  }

  i { font-size: 13px; }
}

.delete-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  border-radius: 6px;
  color: var(--el-text-color-placeholder);

  &:hover {
    color: var(--el-color-danger);
    background: rgba(239, 68, 68, 0.08);
  }

  i { font-size: 12px; }
}

// ---- 分页 ----
.pagination-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  margin-top: 4px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.page-info {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.page-btns {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  background: transparent;
  color: var(--el-text-color-regular);
  cursor: pointer;
  transition: all 0.15s;

  i { font-size: 12px; }

  &:hover:not(:disabled) {
    border-color: var(--el-color-primary);
    color: var(--el-color-primary);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
}

.page-num {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  min-width: 40px;
  text-align: center;
}
</style>
