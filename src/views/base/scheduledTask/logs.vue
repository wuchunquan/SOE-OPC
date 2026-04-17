<template>
  <div class="art-page-container">
    <!-- 搜索和筛选 -->
    <el-card shadow="never" class="search-card">
      <el-form :inline="true" :model="searchForm" class="flex">
        <el-form-item label="任务ID">
          <el-input
            v-model="searchForm.task_id"
            placeholder="任务ID"
            clearable
            style="width: 150px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="任务名称">
          <el-input
            v-model="searchForm.task_name"
            placeholder="任务名称"
            clearable
            style="width: 150px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="执行状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width: 100px">
            <el-option label="成功" value="success" />
            <el-option label="失败" value="failed" />
          </el-select>
        </el-form-item>
        <div>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </div>
        <div style="margin-left: auto;">
          <el-button type="danger" :disabled="!selectedIds.length" @click="handleBatchDelete">
            批量删除
          </el-button>
          <el-button type="danger" @click="handleClearLogs">清空</el-button>
          <el-button @click="goBack">返回</el-button>
        </div>
      </el-form>
    </el-card>

    <!-- 日志列表 -->
    <el-card shadow="never" class="table-card">
      <div class="table-wrapper" v-loading="loading">
        <el-table
          :data="logs"
          style="width: 100%"
          border
          height="100%"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="55" align="center" />
          <el-table-column prop="id" label="日志ID" width="80" align="center" />
          <el-table-column prop="task_id" label="任务ID" width="80" align="center" />
          <el-table-column label="任务名称" min-width="150" align="center">
            <template #default="{ row }">
              {{ row.task?.name || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.status === 'success'" type="success" size="small">成功</el-tag>
              <el-tag v-else-if="row.status === 'failed'" type="danger" size="small">失败</el-tag>
              <el-tag v-else type="warning" size="small">未完成</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="开始时间" align="center">
            <template #default="{ row }">
              {{ formatDateTime(row.start_time) }}
            </template>
          </el-table-column>
          <el-table-column label="结束时间" align="center">
            <template #default="{ row }">
              {{ row.end_time ? formatDateTime(row.end_time) : '-' }}
            </template>
          </el-table-column>
          <el-table-column label="耗时(秒)" width="100" align="center">
            <template #default="{ row }">
              {{ row.duration !== null && row.duration !== undefined ? row.duration : '-' }}
            </template>
          </el-table-column>
          <el-table-column label="执行结果" min-width="200" align="center">
            <template #default="{ row }">
              <div v-if="row.status === 'success' && row.result">
                <span v-if="row.result.message" class="success-message">
                  {{ row.result.message }}
                </span>
                <el-button v-if="row.result.data" link type="primary" size="small" @click="viewResult(row)">
                  查看详情
                </el-button>
              </div>
              <div v-else-if="row.status === 'failed'" class="error-message">
                {{ row.error_message || '执行失败' }}
                <el-button v-if="row.traceback" link type="danger" size="small" @click="viewError(row)">
                  查看堆栈
                </el-button>
              </div>
              <span v-else>-</span>
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
          @size-change="loadLogs"
          @current-change="loadLogs"
        />
      </div>
    </el-card>

    <!-- 执行结果详情对话框 -->
    <el-dialog v-model="showResultDialog" title="执行结果详情" width="600px">
      <pre class="result-content">{{ resultContent }}</pre>
      <template #footer>
        <el-button @click="showResultDialog = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 错误堆栈对话框 -->
    <el-dialog v-model="showErrorDialog" title="错误堆栈信息" width="800px">
      <div class="error-content">
        <div class="error-message">{{ errorMessage }}</div>
        <pre class="error-traceback">{{ errorTraceback }}</pre>
      </div>
      <template #footer>
        <el-button @click="showErrorDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getAllTaskLogsApi,
  batchDeleteTaskLogsApi,
  clearTaskLogsApi,
  type TaskExecutionLog
} from '@/api/base/scheduledTask'
import { useRouter, useRoute } from 'vue-router'

defineOptions({ name: 'ScheduledTaskLogs' })

const router = useRouter()
const route = useRoute()

// 响应式数据
const loading = ref(false)
const logs = ref<TaskExecutionLog[]>([])
const selectedIds = ref<number[]>([])
const showResultDialog = ref(false)
const showErrorDialog = ref(false)
const resultContent = ref('')
const errorMessage = ref('')
const errorTraceback = ref('')

// 搜索表单
const searchForm = reactive({
  task_id: route.query.task_id ? route.query.task_id : '',
  task_name: '',
  status: ''
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 格式化日期时间
const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '-'
  return dateStr.replace('T', ' ').split('.')[0]
}

// 加载日志列表
const loadLogs = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      page_size: pagination.pageSize,
      task_id: searchForm.task_id ? Number(searchForm.task_id) : undefined,
      task_name: searchForm.task_name || undefined,
      status: searchForm.status || undefined
    }

    const response = await getAllTaskLogsApi(params)
    logs.value = response.items || []
    pagination.total = response.total || 0
  } catch (error) {
    console.error('加载日志列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  loadLogs()
}

// 重置搜索
const resetSearch = () => {
  searchForm.task_id = ''
  searchForm.task_name = ''
  searchForm.status = ''
  pagination.page = 1
  loadLogs()
}

// 查看执行结果
const viewResult = (log: TaskExecutionLog) => {
  resultContent.value = JSON.stringify(log.result, null, 2)
  showResultDialog.value = true
}

// 查看错误信息
const viewError = (log: TaskExecutionLog) => {
  errorMessage.value = log.error_message || ''
  errorTraceback.value = log.traceback || ''
  showErrorDialog.value = true
}

// 返回任务列表
const goBack = () => {
  router.back()
}

// 多选变化
const handleSelectionChange = (selection: TaskExecutionLog[]) => {
  selectedIds.value = selection.map((item) => item.id)
}

// 批量删除
const handleBatchDelete = async () => {
  if (!selectedIds.value.length) {
    ElMessage.warning('请选择要删除的日志')
    return
  }

  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${selectedIds.value.length} 条日志吗？`, '批量删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const result = await batchDeleteTaskLogsApi(selectedIds.value)
    ElMessage.success(result.message || '批量删除成功')
    selectedIds.value = []
    loadLogs()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error)
    }
  }
}

// 清空日志
const handleClearLogs = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清空所有日志吗？此操作不可恢复！',
      '清空日志确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )

    const taskId = searchForm.task_id ? Number(searchForm.task_id) : undefined
    const result = await clearTaskLogsApi(taskId)
    ElMessage.success(result.message || '日志清空成功')
    loadLogs()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('清空日志失败:', error)
    }
  }
}

// 初始化
onMounted(() => {
  loadLogs()
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

.task-name {
  font-weight: 500;
  color: #409eff;
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

.success-message {
  color: #67c23a;
  margin-right: 8px;
}

.error-message {
  color: #f56c6c;
}

.result-content {
  background: var(--el-fill-color-light);
  padding: 16px;
  border-radius: 4px;
  max-height: 400px;
  overflow: auto;
  margin: 0;
  color: var(--el-text-color-primary);
}

.error-content {
  max-height: 500px;
  overflow: auto;
}

.error-content .error-message {
  padding: 12px;
  background: var(--el-color-danger-light-9);
  border-left: 4px solid var(--el-color-danger);
  margin-bottom: 16px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.error-traceback {
  background: var(--el-fill-color-light);
  padding: 16px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.5;
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  color: var(--el-text-color-primary);
}
</style>
