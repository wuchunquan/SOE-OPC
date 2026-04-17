import request from '@/utils/http'

export interface ScheduledTask {
  id: number
  name: string
  description?: string
  task_type: string  // cron, interval, date
  cron_expression?: string
  interval_seconds?: number
  scheduled_time?: string
  task_module: string
  task_function: string
  task_params?: Record<string, any>
  is_enabled: boolean
  last_run_time?: string
  next_run_time?: string
  created_at: string
  updated_at: string
}

export interface TaskExecutionLog {
  id: number
  task_id: number
  status: string  // pending, running, success, failed
  start_time: string
  end_time?: string
  duration?: number
  result?: Record<string, any>
  error_message?: string
  traceback?: string
  task?: ScheduledTask
}

export interface ScheduledTaskQueryParams {
  page?: number
  page_size?: number
  search?: string
  task_type?: string
  is_enabled?: boolean
}

export interface ScheduledTaskCreateParams {
  name: string
  description?: string
  task_type: string
  cron_expression?: string
  interval_seconds?: number
  scheduled_time?: string
  task_module: string
  task_function?: string
  task_params?: Record<string, any>
  is_enabled?: boolean
}

export interface ScheduledTaskUpdateParams {
  name?: string
  description?: string
  task_type?: string
  cron_expression?: string
  interval_seconds?: number
  scheduled_time?: string
  task_module?: string
  task_function?: string
  task_params?: Record<string, any>
  is_enabled?: boolean
}

export interface TaskLogQueryParams {
  page?: number
  page_size?: number
  task_id?: number
  task_name?: string
  status?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  pages: number
}

// 获取定时任务列表
export function getScheduledTasksApi(params?: ScheduledTaskQueryParams) {
  return request.get<PaginatedResponse<ScheduledTask>>({
    url: '/api/base/scheduled-tasks/',
    params
  })
}

// 获取定时任务详情
export function getScheduledTaskApi(id: number) {
  return request.get<ScheduledTask>({
    url: `/api/base/scheduled-tasks/${id}`
  })
}

// 创建定时任务
export function createScheduledTaskApi(data: ScheduledTaskCreateParams) {
  return request.post<ScheduledTask>({
    url: '/api/base/scheduled-tasks/',
    data
  })
}

// 更新定时任务
export function updateScheduledTaskApi(id: number, data: ScheduledTaskUpdateParams) {
  return request.put<ScheduledTask>({
    url: `/api/base/scheduled-tasks/${id}`,
    data
  })
}

// 删除定时任务
export function deleteScheduledTaskApi(id: number) {
  return request.delete({
    url: `/api/base/scheduled-tasks/${id}`
  })
}

// 启用定时任务
export function enableScheduledTaskApi(id: number) {
  return request.post<ScheduledTask>({
    url: `/api/base/scheduled-tasks/${id}/enable`
  })
}

// 禁用定时任务
export function disableScheduledTaskApi(id: number) {
  return request.post<ScheduledTask>({
    url: `/api/base/scheduled-tasks/${id}/disable`
  })
}

// 手动触发任务
export function triggerScheduledTaskApi(id: number) {
  return request.post({
    url: `/api/base/scheduled-tasks/${id}/trigger`
  })
}

// 获取任务执行日志
export function getTaskLogsApi(taskId: number, params?: TaskLogQueryParams) {
  return request.get<PaginatedResponse<TaskExecutionLog>>({
    url: `/api/base/scheduled-tasks/${taskId}/logs`,
    params
  })
}

// 获取所有任务执行日志
export function getAllTaskLogsApi(params?: TaskLogQueryParams) {
  return request.get<PaginatedResponse<TaskExecutionLog>>({
    url: '/api/base/scheduled-tasks/logs/all',
    params
  })
}

// 删除单个日志
export function deleteTaskLogApi(logId: number) {
  return request.delete({
    url: `/api/base/scheduled-tasks/logs/${logId}`
  })
}

// 批量删除日志
export function batchDeleteTaskLogsApi(logIds: number[]) {
  return request.post({
    url: '/api/base/scheduled-tasks/logs/batch-delete',
    data: logIds
  })
}

// 清空日志
export function clearTaskLogsApi(taskId?: number) {
  return request.post({
    url: '/api/base/scheduled-tasks/logs/clear',
    params: { task_id: taskId }
  })
}
