<template>
  <div class="session-list">
    <!-- 头部 -->
    <div class="session-header" data-tauri-drag-region>
      <div class="header-content" data-tauri-drag-region>
        <h3 class="header-title" data-tauri-drag-region>{{ sessionTitle }}</h3>
        <el-button
          circle
          size="small"
          class="new-session-btn"
          @click="handleCreateSession"
          title="新建会话"
        >
          <i class="pi pi-plus"></i>
        </el-button>
      </div>
    </div>

    <!-- 会话列表 -->
    <div class="sessions-container">
      <!-- 空状态 -->
      <div v-if="agentStore.filteredSessions.length === 0" class="empty-state">
        <i class="pi pi-comments empty-icon"></i>
        <div class="empty-text">暂无会话</div>
      </div>

      <!-- 会话项 -->
      <div
        v-for="session in agentStore.filteredSessions"
        :key="session.session_id"
        class="session-item"
        :class="{ active: session.session_id === agentStore.currentSession }"
        @click="handleSwitchSession(session.session_id)"
      >
        <div class="session-wrapper">
          <!-- 会话头像 -->
          <div class="session-avatar-wrapper">
            <div class="session-avatar">
              <!-- 内部聊天：显示对方头像 -->
              <template v-if="session.type === 'chat'">
                <img
                  v-if="session.chat_with?.user_avatar"
                  :src="baseUrl + session.chat_with.user_avatar"
                  :alt="session.chat_with.user_name || '用户'"
                  class="avatar-logo"
                />
                <div v-else class="avatar-placeholder">
                  {{ (session.chat_with?.user_name || '用户')[0] }}
                </div>
              </template>
              <!-- AI 会话：显示角色头像 -->
              <template v-else>
                <img
                  v-if="session.role_avatar_url"
                  :src="baseUrl + session.role_avatar_url"
                  :alt="session.role_name || 'AI助手'"
                  class="avatar-logo"
                />
                <img v-else src="/logo.png" alt="AI助手" class="avatar-logo" />
              </template>
            </div>
            <!-- 未读数标记 -->
            <div v-if="session.unread_count && session.unread_count > 0" class="unread-badge">
              {{ session.unread_count > 99 ? '99+' : session.unread_count }}
            </div>
          </div>

          <!-- 会话信息 -->
          <div class="session-info">
            <div class="session-header-row">
              <div class="session-name-group">
                <!-- 显示名称：内部聊天显示对方用户名，AI 会话显示角色名 -->
                <span class="role-name">
                  {{ session.type === 'chat' ? (session.chat_with?.user_name || '未知用户') : (session.role_name || 'AI助手') }}
                </span>
                <!-- 在线状态标签（仅内部聊天） -->
                <span v-if="session.type === 'chat' && session.is_online" class="online-tag">在线</span>
                <!-- 会话类型标签 -->
                <span class="session-tag">{{ session.type === 'chat' ? '内部沟通' : (session.name || '新会话') }}</span>
                <!-- 流式状态指示器 -->
                <span
                  v-if="session.type === 'ai' && session.session_id === agentStore.currentSession && agentStore.isStreaming"
                  class="streaming-indicator"
                  title="AI 正在回复..."
                >
                  <span class="dot"></span>
                  <span class="dot"></span>
                  <span class="dot"></span>
                </span>
              </div>
              <span class="session-time">{{ formatDate(session.last_activity) }}</span>
            </div>

            <!-- 消息预览行 -->
            <div class="session-preview-row">
              <p class="message-preview">{{ formatLastMessage(session.last_message) }}</p>
              <!-- 操作按钮 -->
              <div class="action-buttons">
              <div>

                <el-button
                  v-if="isTauriEnv()"
                  text
                  size="small"
                  class="open-window-btn"
                  @click.stop="handleOpenInNewWindow(session)"
                  title="在新窗口打开"
                >
                  <i class="pi pi-window-maximize"></i>
                </el-button>
                                
              </div>
                <!-- 内部沟通时不显示编辑和删除按钮 -->
                <template v-if="session.type !== 'chat'">
                    <div>
                  <el-button
                    text
                    size="small"
                    class="edit-btn"
                    @click.stop="handleEditSession(session)"
                    title="编辑会话名称"
                  >
                    <i class="pi pi-pencil"></i>
                  </el-button>
                  </div>
                  <div>
                  <el-button
                    text
                    size="small"
                    class="delete-btn"
                    @click.stop="handleDeleteSession(session.session_id)"
                    title="删除会话"
                  >
                    <i class="pi pi-trash"></i>
                  </el-button>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

   

    <!-- 角色选择对话框（创建会话时选择角色） -->
    <RoleDialog
      v-model:visible="showRoleDialog"
      :session-id="null"
      @role-applied="handleRoleApplied"
    />

    <!-- 编辑会话名称对话框 -->
    <el-dialog
      v-model="showEditDialog"
      title="编辑会话名称"
      width="400px"
      destroy-on-close
    >
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="会话名称">
          <el-input
            v-model="editForm.name"
            placeholder="请输入会话名称"
            maxlength="50"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmEditSession">确定</el-button>
      </template>
    </el-dialog>

    <!-- 人员选择对话框（创建内部聊天） -->
    <el-dialog
      v-model="showChatDialog"
      title="选择聊天对象"
      width="800px"
      destroy-on-close
      @close="handleChatDialogClose"
    >
      <!-- 搜索栏 -->
      <el-form :inline="true" class="mb-4">
        <el-form-item label="搜索">
          <el-input
            v-model="searchKeyword"
            placeholder="用户名/姓名/邮箱"
            clearable
            style="width: 200px"
            @keyup.enter="searchUsers"
          />
        </el-form-item>
        <el-form-item label="部门">
          <el-tree-select
            v-model="searchDepartmentId"
            :data="departmentTree"
            :props="{ children: 'children', label: 'name', value: 'id' }"
            node-key="id"
            check-strictly
            clearable
            placeholder="选择部门"
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="searchUsers">搜索</el-button>
          <el-button @click="resetUserSearch">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 员工表格 -->
      <el-table
        v-loading="userListLoading"
        :data="userList"
        highlight-current-row
        border
        style="width: 100%"
        max-height="400px"
        @current-change="handleUserTableChange"
      >
        <el-table-column type="index" label="#" width="50" />
        <el-table-column prop="username" label="用户名" width="120" />
        <el-table-column prop="real_name" label="真实姓名" width="120">
          <template #default="{ row }">
            {{ row.real_name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="部门" width="150">
          <template #default="{ row }">
            {{ row.department?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="email" label="邮箱">
          <template #default="{ row }">
            {{ row.email || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="手机号" width="120">
          <template #default="{ row }">
            {{ row.phone || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right" align="center">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click.stop="selectUser(row)">
              选择
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="mt-4 flex justify-center">
        <el-pagination
          v-model:current-page="userPagination.page"
          v-model:page-size="userPagination.pageSize"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          :total="userPagination.total"
          @size-change="loadUserList"
          @current-change="loadUserList"
        />
      </div>

      <template #footer>
        <el-button @click="showChatDialog = false">取消</el-button>
        <el-button type="primary" :disabled="!selectedUser" @click="confirmChatUser">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, inject, computed } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import RoleDialog from './RoleDialog.vue'
import type { User } from '@/api/sys/users'
import { getUsersApi } from '@/api/sys/users'
import { getDepartmentTreeApi, type Department } from '@/api/sys/departments'
import { useAgentStore as useDefaultStore } from './store'
import { AgentStoreKey, BaseUrlKey, AgentApiKey, IsLocalKey } from './injection'
import { useUserStore } from '@/store/modules/user'
import * as defaultApi from './api'
import type { AgentSession } from './types'
import { isTauriEnv } from '@/utils/env'
import { isSelfUseMode } from '@/utils/runtime-mode'

const agentStore = inject(AgentStoreKey, null) || useDefaultStore()
const baseUrl = inject(BaseUrlKey, '')
const agentApi = inject(AgentApiKey, null) || defaultApi
const isLocal = inject(IsLocalKey, false)
const selfUseMode = isSelfUseMode()
const userStore = useUserStore()
const showRoleDialog = ref(false)
const showChatDialog = ref(false)
const showEditDialog = ref(false)
const selectedRoleId = ref<string | null>(null)

// 编辑会话相关状态
const editForm = reactive({
  sessionId: '',
  name: ''
})

// 用户选择相关状态
const userListLoading = ref(false)
const userList = ref<User[]>([])
const selectedUser = ref<User | null>(null)
const searchKeyword = ref('')
const searchDepartmentId = ref<number | null>(null)
const departmentTree = ref<Department[]>([])

const userPagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const emit = defineEmits<{
  'session-selected': [sessionId: string]
  'session-created': [sessionInfo: any]
  'session-deleted': [sessionId: string]
}>()

const sessionTitle = computed(() => {
  if (!isTauriEnv()) {
    return '会话列表'
  }
  if (selfUseMode) {
    return '会话列表'
  }
  return isLocal ? '本地会话' : '云端会话'
})

const handleCreateSession = async () => {
  // 根据当前过滤器类型直接创建对应的会话
  if (agentStore.sessionTypeFilter === 'ai') {
    // 当前显示 AI 会话，直接弹出角色选择对话框
    showRoleDialog.value = true
  } else {
    // 当前显示内部聊天，直接弹出用户选择对话框
    showChatDialog.value = true
  }
}

const handleRoleApplied = async (roleId: string) => {
  try {
    // 角色选择后，创建会话并应用角色
    selectedRoleId.value = roleId
    const sessionInfo = await agentStore.createSessionWithRole(roleId)
    emit('session-created', sessionInfo)
    showRoleDialog.value = false
    selectedRoleId.value = null
  } catch (error) {
    console.error('创建会话失败:', error)
  }
}

// 加载部门树
const loadDepartmentTree = async () => {
  try {
    departmentTree.value = await getDepartmentTreeApi()
  } catch (error) {
    console.error('加载部门树失败:', error)
  }
}

// 加载用户列表
const loadUserList = async () => {
  userListLoading.value = true
  try {
    const params: Record<string, any> = {
      page: userPagination.page,
      page_size: userPagination.pageSize,
      search: searchKeyword.value || undefined,
      department_id: searchDepartmentId.value || undefined
    }

    const response = await getUsersApi(params)

    // 过滤掉当前登录用户（不能与自己聊天）
    const currentUserId = userStore.info.userId
    userList.value = (response.items || []).filter(user => user.id !== currentUserId)

    // 如果过滤后当前页没有数据，调整总数
    userPagination.total = response.total ? response.total - 1 : 0
  } catch (error) {
    console.error('加载用户列表失败:', error)
    ElMessage.error('加载用户列表失败')
  } finally {
    userListLoading.value = false
  }
}

// 搜索用户
const searchUsers = () => {
  userPagination.page = 1
  loadUserList()
}

// 重置搜索
const resetUserSearch = () => {
  searchKeyword.value = ''
  searchDepartmentId.value = null
  userPagination.page = 1
  loadUserList()
}

// 表格行选中
const handleUserTableChange = (row: User | null) => {
  selectedUser.value = row
}

// 快速选择（点击选择按钮）
const selectUser = (user: User) => {
  console.log('[SessionList] selectUser called with:', user)
  selectedUser.value = user
  confirmChatUser()
}

// 确认选择用户
const confirmChatUser = async () => {
  console.log('[SessionList] confirmChatUser called, selectedUser:', selectedUser.value)
  if (!selectedUser.value) {
    console.log('[SessionList] selectedUser is null, returning')
    return
  }

  try {
    console.log('[SessionList] calling createChatSession with userId:', selectedUser.value.id)
    // 用户选择后，创建内部聊天会话（名称由后端自动设置为"内部沟通"）
    const sessionInfo = await agentStore.createChatSession(selectedUser.value.id)
    console.log('[SessionList] createChatSession success, sessionInfo:', sessionInfo)
    emit('session-created', sessionInfo)
    showChatDialog.value = false
  } catch (error) {
    console.error('[SessionList] 创建聊天会话失败:', error)
    ElMessage.error('创建聊天会话失败，请重试')
  }
}

// 关闭对话框时重置
const handleChatDialogClose = () => {
  selectedUser.value = null
  searchKeyword.value = ''
  searchDepartmentId.value = null
  userPagination.page = 1
}

// 监听聊天对话框打开
watch(showChatDialog, (visible) => {
  if (visible) {
    loadDepartmentTree()
    loadUserList()
  }
})

const handleSwitchSession = async (sessionId: string) => {
  try {
    emit('session-selected', sessionId)
  } catch (error) {
    console.error('切换会话失败:', error)
  }
}

// 编辑会话
const handleEditSession = (session: AgentSession) => {
  editForm.sessionId = session.session_id
  editForm.name = session.name || ''
  showEditDialog.value = true
}

// 确认编辑会话
const confirmEditSession = async () => {
  if (!editForm.name.trim()) {
    ElMessage.warning('请输入会话名称')
    return
  }

  try {
    await agentApi.updateSession(editForm.sessionId, { name: editForm.name.trim() })
    await agentStore.loadSessions()
    ElMessage.success('会话名称已更新')
    showEditDialog.value = false
  } catch (error) {
    console.error('更新会话失败:', error)
    ElMessage.error('更新会话失败，请重试')
  }
}

const handleDeleteSession = async (sessionId: string) => {
  try {
    await ElMessageBox.confirm('确定要删除这个会话吗？删除后无法恢复。', '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })

    // 如果在 Tauri 环境下，先关闭对应的独立窗口
    if (isTauriEnv()) {
      try {
        const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow')
        const windowLabel = `session-${sessionId}`
        const existingWindow = await WebviewWindow.getByLabel(windowLabel)
        if (existingWindow) {
          await existingWindow.close()
        }
      } catch (error) {
        console.error('关闭独立窗口失败:', error)
      }
    }

    await agentStore.deleteSession(sessionId)
    emit('session-deleted', sessionId)
  } catch (error) {
    console.error('删除会话失败:', error)
    // 用户取消或其他错误
  }
}

// 在新窗口打开会话
const handleOpenInNewWindow = async (session: AgentSession) => {
  if (!isTauriEnv()) {
    ElMessage.warning('此功能仅在桌面应用中可用')
    return
  }

  try {
    const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow')
    const { getCurrentWindow } = await import('@tauri-apps/api/window')

    // 生成唯一的窗口标签
    const windowLabel = `session-${session.session_id}`

    // 检查窗口是否已存在
    const existingWindow = await WebviewWindow.getByLabel(windowLabel)
    if (existingWindow) {
      try {
        // 尝试检查窗口是否仍然可见
        const isVisible = await existingWindow.isVisible()
        if (isVisible) {
          await existingWindow.setFocus()
          ElMessage.info('会话窗口已打开')
          return
        }
      } catch {
        // 窗口可能已关闭但标签仍存在
      }

      // 窗口已关闭或不可见，先销毁旧的窗口对象
      try {
        await existingWindow.destroy()
        // 等待一小段时间让 Tauri 完成清理
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (e) {
        console.error('销毁窗口失败:', e)
      }
    }

    // 获取当前窗口位置，用于计算新窗口的位置
    const currentWindow = getCurrentWindow()
    const position = await currentWindow.outerPosition()

    // 创建新窗口（使用 hash 路由模式，带上会话类型参数）
    const sessionType = session.type || 'ai'
    const windowUrl = window.location.origin + `/#/agent-desktop/${session.session_id}?type=${sessionType}${isLocal ? '&local=true' : ''}`
    console.log('创建新窗口, URL:', windowUrl, 'Label:', windowLabel)

    const webview = new WebviewWindow(windowLabel, {
      url: windowUrl,
      title: session.type === 'chat'
        ? `与 ${session.chat_with?.user_name || '用户'} 的对话`
        : (session.name || session.role_name || 'AI 助手'),
      width: 1000,
      height: 700,
      minWidth: 500,
      minHeight: 600,
      x: position.x + 50,
      y: position.y + 50,
      resizable: true,
      decorations: false, // 无边框窗口
      focus: true,
    })

    webview.once('tauri://created', () => {
      console.log('会话窗口已创建:', windowLabel)
    })

    webview.once('tauri://error', (e) => {
      console.error('窗口创建失败:', e, JSON.stringify(e))
      ElMessage.error('打开窗口失败，请重试')
    })

  } catch (error) {
    console.error('打开新窗口失败:', error)
    ElMessage.error('打开窗口失败，请重试')
  }
}

const formatDate = (date: string | Date) => {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diff = now.getTime() - d.getTime()

  if (diff < 86400000) {
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } else if (diff < 604800000) {
    const days = Math.floor(diff / 86400000)
    return `${days}天前`
  } else {
    return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
  }
}

// 格式化最新消息预览（去除特殊符号，截取前10个字）
const formatLastMessage = (message: string | undefined) => {
  if (!message) {
    return '暂无消息'
  }
  // 去除各种特殊符号（保留中英文、数字和基本标点）
  const cleaned = message
    .replace(/[\n\r\t]/g, ' ')  // 换行符转空格
    .replace(/\s+/g, ' ')  // 多个空格合并
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9，。！？、；：""''（）\s]/g, '')  // 只保留中英文、数字和常用中文标点
    .trim()

  if (!cleaned) {
    return '暂无消息'
  }

  // 截取前10个字符
  if (cleaned.length > 10) {
    return cleaned.substring(0, 10) + '...'
  }
  return cleaned
}

</script>

<style scoped lang="scss">
.session-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.session-header {
  flex-shrink: 0;
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  app-region: drag;
  -webkit-app-region: drag;
  -webkit-user-select: none;
  user-select: none;

  .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .header-title {
    font-size: 15px;
    font-weight: 500;
    color: white;
    opacity: 0.6;
    margin: 0;
  }

  .new-session-btn {
    width: 32px;
    height: 32px;
    padding: 0;
    background: transparent;
    border: none;
    color: #71717a;
    transition: all 0.2s;
    app-region: no-drag;
    -webkit-app-region: no-drag;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
      color: white;
    }
  }
}

.sessions-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;

  &::-webkit-scrollbar {
    width: 4px!important;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;

    &:hover {
      background: rgba(255, 255, 255, 0.15);
    }
  }
}


.session-item {
  border-left: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;

  .session-name {
    opacity: 0.6;
    transition: opacity 0.2s;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.03);

    .session-name {
      opacity: 0.8;
    }

    .action-buttons {
      opacity: 1;
    }
  }

  &.active {
    background: rgba(255, 255, 255, 0.05);
    border-left-color: #3b82f6;

    .session-name {
      opacity: 1;
    }
  }
}

.session-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
}

.session-avatar-wrapper {
  position: relative;
  flex-shrink: 0;
  margin: auto 0;
}

.session-avatar {
  width: 48px;
  height: 48px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: rgba(59, 130, 246, 0.2);

  .avatar-logo {
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
    font-size: 20px;
    font-weight: 600;
    color: #3b82f6;
    text-transform: uppercase;
  }
}

.unread-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background: #ff4d4f;
  color: white;
  font-size: 11px;
  font-weight: 600;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  //box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.session-info {
  flex: 1;
  min-width: 0;
}

.session-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.session-name-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.role-name {
  font-size: 13px;
  font-weight: 500;
  // color: #3b82f6;
  opacity: 0.9;
  flex-shrink: 0;
}

.online-tag {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background: #10b98194;
  color: white;
  flex-shrink: 0;
}

.session-tag {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background: #27272a;
  color: #a1a1aa;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100px;
}

.streaming-indicator {
  display: inline-flex;
  gap: 3px;
  margin-left: 6px;
  align-items: center;

  .dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background-color: #3b82f6;
    animation: dot-pulse 1.4s infinite ease-in-out;

    &:nth-child(1) {
      animation-delay: 0s;
    }
    &:nth-child(2) {
      animation-delay: 0.2s;
    }
    &:nth-child(3) {
      animation-delay: 0.4s;
    }
  }
}

@keyframes dot-pulse {
  0%, 80%, 100% {
    opacity: 0.3;
    transform: scale(1);
  }
  40% {
    opacity: 1;
    transform: scale(1.3);
  }
}

.session-time {
  font-size: 11px;
  flex-shrink: 0;
  margin-left: 8px;
  color: #71717a;
}

.session-preview-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.message-preview {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 190px;
  margin: 0;
  color: #a1a1aa;
}

.action-buttons {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.open-window-btn,
.edit-btn,
.delete-btn {
  padding: 4px;
  color: #a1a1aa;
  transition: color 0.2s;
}

.open-window-btn:hover {
  color: #10b981;
}

.edit-btn:hover {
  color: #3b82f6;
}

.delete-btn:hover {
  color: #ef4444;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;

  .empty-icon {
    font-size: 64px;
    color: #3f3f46;
    margin-bottom: 14px;
  }

  .empty-text {
    font-size: 13px;
    color: #71717a;
  }
}

// 浅色模式
html:not(.dark) {
  .unread-badge {
    // border-color: #fafafa;
  }

  .session-list {
    background:radial-gradient(circle at 25% 25%, rgb(255 255 255 / 3%) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(59, 130, 246, 0.03) 0%, transparent 50%), radial-gradient(circle at 2px 2px, rgba(0, 0, 0, 0.03) 1px, transparent 1px), linear-gradient(135deg, #fafafa 0%, #f5f5f5 50%, #fafafa 100%);
    background-size: 100% 100%, 100% 100%, 30px 30px, 100% 100%;
    position: relative;

    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background:
        linear-gradient(90deg, transparent 0%, rgba(147, 51, 234, 0.01) 50%, transparent 100%),
        linear-gradient(0deg, transparent 0%, rgba(59, 130, 246, 0.01) 50%, transparent 100%);
      pointer-events: none;
      animation: shimmer 8s ease-in-out infinite;
    }

    > * {
      z-index: 1;
    }
  }

  @keyframes shimmer {
    0%, 100% {
      opacity: 0.3;
    }
    50% {
      opacity: 0.7;
    }
  }

  .session-header {
    border-bottom: 1px solid rgba(147, 51, 234, 0.1);
   
    backdrop-filter: blur(16px) saturate(180%);
    box-shadow:
      0 1px 3px rgba(0, 0, 0, 0.02),
      0 0 0 1px rgba(255, 255, 255, 0.6) inset;

    .header-title {
      color: #111827;
      font-weight: 600;
    }

    .new-session-btn {
      color: #6b7280;
      transition: all 0.2s;

      &:hover {
        background: rgba(147, 51, 234, 0.06);
        color: #9333ea;
      }
    }
  }

  .sessions-container {
    &::-webkit-scrollbar-thumb {
      background: #d1d5db;

      &:hover {
        background: #9ca3af;
      }
    }
  }

  .session-item {
    &:hover {
      background: rgb(212 212 212 / 25%);
    }

    &.active {
      background: #eeeeee;
     
    }

    .role-name {
      color: #374151;
    }

    .session-tag {
      background: #e5e7eb;
      color: #6b7280;
    }

    .session-time {
      color: #6b7280;
    }

    .streaming-indicator .dot {
      background-color: #3b82f6;
    }
  }

  .message-preview {
    color: #6b7280;
  }

  .delete-btn {
    color: #6b7280;
  }

  .empty-state {
    .empty-icon {
      color: #d1d5db;
    }

    .empty-text {
      color: #9ca3af;
    }
  }
}
</style>
