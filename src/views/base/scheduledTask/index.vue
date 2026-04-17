<template>
  <div class="art-page-container">
    <!-- 搜索和筛选 -->
    <el-card shadow="never" class="search-card">
      <el-form :inline="true" :model="searchForm" class="flex">
        <el-form-item label="搜索">
          <el-input
            v-model="searchForm.search"
            placeholder="任务名称"
            clearable
            style="width: 200px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="任务类型">
          <el-select v-model="searchForm.task_type" placeholder="全部" clearable style="width: 150px">
            <el-option label="Cron" value="cron" />
            <el-option label="固定间隔" value="interval" />
            <el-option label="指定时间" value="date" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.is_enabled" placeholder="全部" clearable style="width: 120px">
            <el-option label="已启用" :value="true" />
            <el-option label="已禁用" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
        <el-form-item style="margin-left: auto; margin-right: 0">
          <el-button type="primary" @click="openCreateDialog">
            <el-icon class="mr-1">
              <Plus />
            </el-icon>
            新增任务
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 任务列表 -->
    <el-card shadow="never" class="table-card">
      <div class="table-wrapper" v-loading="loading">
        <el-table :data="tasks" style="width: 100%" border height="100%">
          <el-table-column prop="id" label="ID" width="80" align="center" />
          <el-table-column prop="name" label="任务名称" min-width="100" align="center" />
          <el-table-column label="任务类型" width="100" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.task_type === 'cron'" type="primary" size="small">Cron</el-tag>
              <el-tag v-else-if="row.task_type === 'interval'" type="success" size="small">固定间隔</el-tag>
              <el-tag v-else type="warning" size="small">指定时间</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="定时策略" min-width="60" align="center">
            <template #default="{ row }">
              <span v-if="row.task_type === 'cron'">{{ row.cron_expression }}</span>
              <span v-else-if="row.task_type === 'interval'">每 {{ row.interval_seconds }} 秒</span>
              <span v-else>{{ formatDateTime(row.scheduled_time) }}</span>
            </template>
          </el-table-column>
          <!-- <el-table-column prop="task_module" label="任务模块" min-width="150" align="center" /> -->
          <el-table-column label="状态" width="100" align="center">
            <template #default="{ row }">
              <el-switch
                v-model="row.is_enabled"
                @change="handleToggleEnable(row)"
                :disabled="row.switching"
              />
            </template>
          </el-table-column>
          <el-table-column label="最后执行"  align="center">
            <template #default="{ row }">
              {{ row.last_run_time ? formatDateTime(row.last_run_time) : '-' }}
            </template>
          </el-table-column>
          <el-table-column label="下次执行"  align="center">
            <template #default="{ row }">
              {{ row.next_run_time ? formatDateTime(row.next_run_time) : '-' }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="280" fixed="right" align="center">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="viewLogs(row)">日志</el-button>
              <el-button link type="success" size="small" @click="triggerTask(row)">执行</el-button>
              <el-button link type="primary" size="small" @click="editTask(row)">编辑</el-button>
              <el-button link type="danger" size="small" @click="deleteTask(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadTasks"
          @current-change="loadTasks"
        />
      </div>
    </el-card>

    <!-- 新增/编辑任务对话框 -->
    <el-dialog
      v-model="showTaskDialog"
      :title="editingTask ? '编辑任务' : '新增任务'"
      width="600px"
      destroy-on-close
      @closed="resetTaskForm"
    >
      <el-form ref="taskFormRef" :model="taskForm" :rules="taskFormRules" label-width="100px">
        <el-form-item label="任务名称" prop="name">
          <el-input v-model="taskForm.name" placeholder="请输入任务名称" />
        </el-form-item>
        <el-form-item label="任务描述" prop="description">
          <el-input
            v-model="taskForm.description"
            type="textarea"
            :rows="2"
            placeholder="请输入任务描述"
          />
        </el-form-item>
        <el-form-item label="任务类型" prop="task_type">
          <el-radio-group v-model="taskForm.task_type">
            <el-radio value="interval">固定间隔</el-radio>
            <el-radio value="cron">定时执行</el-radio>
            <el-radio value="date">一次性任务</el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- 固定间隔配置 -->
        <el-form-item v-if="taskForm.task_type === 'interval'" label="执行间隔" prop="interval_seconds">
          <div style="display: flex; gap: 10px; align-items: center">
            <span>每</span>
            <el-input-number v-model="intervalConfig.value" :min="1" style="width: 80px" :controls="false" />
            <el-select v-model="intervalConfig.unit" style="width: 80px">
              <el-option label="分钟" value="minutes" />
              <el-option label="小时" value="hours" />
              <el-option label="天" value="days" />
            </el-select>
            <span>执行一次</span>
          </div>
        </el-form-item>

        <!-- 定时执行配置 -->
        <template v-if="taskForm.task_type === 'cron'">
          <el-form-item label="执行模式" prop="cron_mode">
            <el-radio-group v-model="cronConfig.mode">
              <el-radio value="daily">每天</el-radio>
              <el-radio value="weekly">每周</el-radio>
              <el-radio value="monthly">每月</el-radio>
              <el-radio value="custom">自定义</el-radio>
            </el-radio-group>
          </el-form-item>

          <!-- 每天 -->
          <el-form-item v-if="cronConfig.mode === 'daily'" label="执行时间">
            <el-time-picker
              v-model="cronConfig.dailyTime"
              format="HH:mm"
              value-format="HH:mm"
              placeholder="选择时间"
            />
          </el-form-item>

          <!-- 每周 -->
          <template v-if="cronConfig.mode === 'weekly'">
            <el-form-item label="星期">
              <el-checkbox-group v-model="cronConfig.weeklyDays">
                <el-checkbox :value="1">周一</el-checkbox>
                <el-checkbox :value="2">周二</el-checkbox>
                <el-checkbox :value="3">周三</el-checkbox>
                <el-checkbox :value="4">周四</el-checkbox>
                <el-checkbox :value="5">周五</el-checkbox>
                <el-checkbox :value="6">周六</el-checkbox>
                <el-checkbox :value="0">周日</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
            <el-form-item label="执行时间">
              <el-time-picker
                v-model="cronConfig.weeklyTime"
                format="HH:mm"
                value-format="HH:mm"
                placeholder="选择时间"
              />
            </el-form-item>
          </template>

          <!-- 每月 -->
          <template v-if="cronConfig.mode === 'monthly'">
            <el-form-item label="日期">
              <div style="display: flex; gap: 10px; align-items: center">
                <span>每月</span>
                <el-input-number v-model="cronConfig.monthlyDay" :min="1" :max="31" />
                <span>号</span>
              </div>
            </el-form-item>
            <el-form-item label="执行时间">
              <el-time-picker
                v-model="cronConfig.monthlyTime"
                format="HH:mm"
                value-format="HH:mm"
                placeholder="选择时间"
              />
            </el-form-item>
          </template>

          <!-- 自定义Cron -->
          <el-form-item v-if="cronConfig.mode === 'custom'" label="Cron表达式">
            <el-input
              v-model="taskForm.cron_expression"
              placeholder="例如: 0 2 * * * (每天凌晨2点)"
            />
            <div class="form-tip">标准 Cron 格式：分 时 日 月 周</div>
          </el-form-item>
        </template>

        <!-- 一次性任务 -->
        <el-form-item v-if="taskForm.task_type === 'date'" label="执行时间" prop="scheduled_time">
          <el-date-picker
            v-model="taskForm.scheduled_time"
            type="datetime"
            placeholder="选择日期时间"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
        <el-form-item label="任务模块" prop="task_module">
          <el-input
            v-model="taskForm.task_module"
            placeholder="例如: timer.example_task"
          />
          <div class="form-tip">模块路径，例如：timer.example_task</div>
        </el-form-item>
        <el-form-item label="任务函数" prop="task_function">
          <el-input v-model="taskForm.task_function" placeholder="默认为 execute" />
        </el-form-item>
        <el-form-item label="任务参数" prop="task_params">
          <el-input
            v-model="taskParamsJson"
            type="textarea"
            :rows="3"
            placeholder='JSON格式，例如: {"name": "value"}'
          />
          <div class="form-tip">JSON 格式的参数</div>
        </el-form-item>
        <el-form-item label="是否启用" prop="is_enabled">
          <el-switch v-model="taskForm.is_enabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showTaskDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="saveTask">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import {
  getScheduledTasksApi,
  createScheduledTaskApi,
  updateScheduledTaskApi,
  deleteScheduledTaskApi,
  enableScheduledTaskApi,
  disableScheduledTaskApi,
  triggerScheduledTaskApi,
  type ScheduledTask,
  type ScheduledTaskCreateParams
} from '@/api/base/scheduledTask'
import { useRouter } from 'vue-router'

defineOptions({ name: 'ScheduledTask' })

const router = useRouter()

// 响应式数据
const loading = ref(false)
const submitting = ref(false)
const tasks = ref<ScheduledTask[]>([])
const showTaskDialog = ref(false)
const editingTask = ref<ScheduledTask | null>(null)
const taskFormRef = ref<FormInstance>()

// 搜索表单
const searchForm = reactive({
  search: '',
  task_type: '',
  is_enabled: undefined as boolean | undefined
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 任务表单
const taskForm = reactive<ScheduledTaskCreateParams>({
  name: '',
  description: '',
  task_type: 'cron',
  cron_expression: '',
  interval_seconds: undefined,
  scheduled_time: '',
  task_module: '',
  task_function: 'execute',
  task_params: undefined,
  is_enabled: true
})

// 任务参数 JSON 字符串
const taskParamsJson = ref('')

// 固定间隔配置
const intervalConfig = reactive({
  value: 1,
  unit: 'minutes' as 'minutes' | 'hours' | 'days'
})

// Cron 配置
const cronConfig = reactive({
  mode: 'daily' as 'daily' | 'weekly' | 'monthly' | 'custom',
  dailyTime: '00:00',
  weeklyDays: [] as number[],
  weeklyTime: '00:00',
  monthlyDay: 1,
  monthlyTime: '00:00'
})

// 表单验证规则
const taskFormRules: FormRules = {
  name: [
    { required: true, message: '请输入任务名称', trigger: 'blur' },
    { min: 2, max: 100, message: '名称长度在 2 到 100 个字符', trigger: 'blur' }
  ],
  task_type: [{ required: true, message: '请选择任务类型', trigger: 'change' }],
  task_module: [{ required: true, message: '请输入任务模块路径', trigger: 'blur' }]
}

// 格式化日期时间
const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '-'
  return dateStr.replace('T', ' ').split('.')[0]
}

// 将间隔配置转换为秒数
const convertIntervalToSeconds = () => {
  const { value, unit } = intervalConfig
  switch (unit) {
    case 'minutes':
      return value * 60
    case 'hours':
      return value * 3600
    case 'days':
      return value * 86400
    default:
      return value * 60
  }
}

// 将秒数解析为间隔配置
const parseSecondsToInterval = (seconds: number) => {
  if (seconds % 86400 === 0) {
    intervalConfig.value = seconds / 86400
    intervalConfig.unit = 'days'
  } else if (seconds % 3600 === 0) {
    intervalConfig.value = seconds / 3600
    intervalConfig.unit = 'hours'
  } else {
    intervalConfig.value = seconds / 60
    intervalConfig.unit = 'minutes'
  }
}

// 将Cron配置转换为Cron表达式
const convertCronConfigToExpression = () => {
  const { mode } = cronConfig
  switch (mode) {
    case 'daily': {
      const [hour, minute] = cronConfig.dailyTime.split(':')
      return `${minute} ${hour} * * *`
    }
    case 'weekly': {
      const [hour, minute] = cronConfig.weeklyTime.split(':')
      const days = cronConfig.weeklyDays.sort().join(',')
      return `${minute} ${hour} * * ${days}`
    }
    case 'monthly': {
      const [hour, minute] = cronConfig.monthlyTime.split(':')
      return `${minute} ${hour} ${cronConfig.monthlyDay} * *`
    }
    case 'custom':
      return taskForm.cron_expression
    default:
      return ''
  }
}

// 解析Cron表达式到配置
const parseCronExpressionToConfig = (expression: string) => {
  if (!expression) return
  const parts = expression.split(' ')
  if (parts.length !== 5) return

  const [minute, hour, day, month, weekday] = parts

  // 判断是每天
  if (day === '*' && month === '*' && weekday === '*') {
    cronConfig.mode = 'daily'
    cronConfig.dailyTime = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
  }
  // 判断是每周
  else if (day === '*' && month === '*' && weekday !== '*') {
    cronConfig.mode = 'weekly'
    cronConfig.weeklyDays = weekday.split(',').map((d) => parseInt(d))
    cronConfig.weeklyTime = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
  }
  // 判断是每月
  else if (day !== '*' && month === '*' && weekday === '*') {
    cronConfig.mode = 'monthly'
    cronConfig.monthlyDay = parseInt(day)
    cronConfig.monthlyTime = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
  }
  // 自定义
  else {
    cronConfig.mode = 'custom'
  }
}

// 加载任务列表
const loadTasks = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      page_size: pagination.pageSize,
      search: searchForm.search || undefined,
      task_type: searchForm.task_type || undefined,
      is_enabled: searchForm.is_enabled
    }
    const response = await getScheduledTasksApi(params)
    tasks.value = response.items || []
    pagination.total = response.total || 0
  } catch (error) {
    console.error('加载任务列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  loadTasks()
}

// 重置搜索
const resetSearch = () => {
  searchForm.search = ''
  searchForm.task_type = ''
  searchForm.is_enabled = undefined
  pagination.page = 1
  loadTasks()
}

// 打开创建对话框
const openCreateDialog = () => {
  editingTask.value = null
  resetTaskForm()
  showTaskDialog.value = true
}

// 编辑任务
const editTask = (task: ScheduledTask) => {
  editingTask.value = task
  Object.assign(taskForm, {
    name: task.name,
    description: task.description || '',
    task_type: task.task_type,
    cron_expression: task.cron_expression || '',
    interval_seconds: task.interval_seconds,
    scheduled_time: task.scheduled_time || '',
    task_module: task.task_module,
    task_function: task.task_function || 'execute',
    is_enabled: task.is_enabled
  })

  // 解析interval配置
  if (task.task_type === 'interval' && task.interval_seconds) {
    parseSecondsToInterval(task.interval_seconds)
  }

  // 解析cron配置
  if (task.task_type === 'cron' && task.cron_expression) {
    parseCronExpressionToConfig(task.cron_expression)
  }

  taskParamsJson.value = task.task_params ? JSON.stringify(task.task_params, null, 2) : ''
  showTaskDialog.value = true
}

// 保存任务
const saveTask = async () => {
  try {
    await taskFormRef.value?.validate()
    submitting.value = true

    // 解析任务参数
    let params = undefined
    if (taskParamsJson.value.trim()) {
      try {
        params = JSON.parse(taskParamsJson.value)
      } catch (e) {
        ElMessage.error('任务参数格式错误，请输入有效的 JSON')
        submitting.value = false
        return
      }
    }

    // 根据类型转换配置
    let cronExpression = undefined
    let intervalSeconds = undefined
    let scheduledTime = undefined

    if (taskForm.task_type === 'interval') {
      intervalSeconds = convertIntervalToSeconds()
    } else if (taskForm.task_type === 'cron') {
      cronExpression = convertCronConfigToExpression()
      if (!cronExpression && cronConfig.mode !== 'custom') {
        ElMessage.error('请完善定时配置')
        submitting.value = false
        return
      }
    } else if (taskForm.task_type === 'date') {
      scheduledTime = taskForm.scheduled_time
    }

    const data = {
      name: taskForm.name,
      description: taskForm.description || undefined,
      task_type: taskForm.task_type,
      cron_expression: cronExpression,
      interval_seconds: intervalSeconds,
      scheduled_time: scheduledTime,
      task_module: taskForm.task_module,
      task_function: taskForm.task_function || 'execute',
      task_params: params,
      is_enabled: taskForm.is_enabled
    }

    if (editingTask.value) {
      await updateScheduledTaskApi(editingTask.value.id, data)
      ElMessage.success('任务更新成功')
    } else {
      await createScheduledTaskApi(data)
      ElMessage.success('任务创建成功')
    }

    showTaskDialog.value = false
    loadTasks()
  } catch (error: any) {
    if (error !== 'cancel' && error?.name !== 'Error') {
      console.error('保存任务失败:', error)
    }
  } finally {
    submitting.value = false
  }
}

// 重置任务表单
const resetTaskForm = () => {
  Object.assign(taskForm, {
    name: '',
    description: '',
    task_type: 'interval',
    cron_expression: '',
    interval_seconds: undefined,
    scheduled_time: '',
    task_module: '',
    task_function: 'execute',
    task_params: undefined,
    is_enabled: true
  })
  taskParamsJson.value = ''

  // 重置间隔配置
  intervalConfig.value = 1
  intervalConfig.unit = 'minutes'

  // 重置Cron配置
  cronConfig.mode = 'daily'
  cronConfig.dailyTime = '00:00'
  cronConfig.weeklyDays = []
  cronConfig.weeklyTime = '00:00'
  cronConfig.monthlyDay = 1
  cronConfig.monthlyTime = '00:00'

  taskFormRef.value?.resetFields()
}

// 切换启用状态
const handleToggleEnable = async (task: ScheduledTask) => {
  const originalState = !task.is_enabled
  try {
    task.switching = true
    if (task.is_enabled) {
      await enableScheduledTaskApi(task.id)
      ElMessage.success('任务已启用')
    } else {
      await disableScheduledTaskApi(task.id)
      ElMessage.success('任务已禁用')
    }
    loadTasks()
  } catch (error) {
    task.is_enabled = originalState
    console.error('切换任务状态失败:', error)
  } finally {
    task.switching = false
  }
}

// 手动触发任务
const triggerTask = async (task: ScheduledTask) => {
  try {
    await ElMessageBox.confirm(`确定要立即执行任务 "${task.name}" 吗？`, '执行确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await triggerScheduledTaskApi(task.id)
    ElMessage.success('任务已提交执行')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('触发任务失败:', error)
    }
  }
}

// 删除任务
const deleteTask = async (task: ScheduledTask) => {
  try {
    await ElMessageBox.confirm(`确定要删除任务 "${task.name}" 吗？`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await deleteScheduledTaskApi(task.id)
    ElMessage.success('任务删除成功')
    loadTasks()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除任务失败:', error)
    }
  }
}

// 查看日志
const viewLogs = (task: ScheduledTask) => {
  router.push({ name: 'ScheduledTaskLogs', query: { task_id: task.id, task_name: task.name } })
}

// 监听搜索条件变化
watch(
  () => [searchForm.search, searchForm.task_type, searchForm.is_enabled],
  () => {
    pagination.page = 1
    loadTasks()
  }
)

// 初始化
onMounted(() => {
  loadTasks()
})
</script>

<style scoped>
.art-page-container {
  height: calc(100vh - 119px);
  overflow: auto;
  display: flex;
  flex-direction: column;
  padding: 16px;
  padding-bottom: 8px;
  box-sizing: border-box;
}

.search-card {
  flex-shrink: 0;
  margin-bottom: 16px;
}

.table-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.table-card :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.table-wrapper {
  flex: 1;
  overflow: hidden;
}

.pagination-wrapper {
  flex-shrink: 0;
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.form-tip {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}
</style>
