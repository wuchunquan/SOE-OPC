<template>
  <div class="file-manager" :class="{ 'is-dark': isDark }">
    <!-- 后端加载中状态（仅 Tauri 本地模式） -->
    <div v-if="backendLoading" class="backend-loading">
      <el-icon class="loading-icon" :size="48"><Loading /></el-icon>
      <div class="loading-text">正在启动本地 AI 服务...</div>
      <div class="loading-subtext">{{ loadingMessage }}</div>
    </div>

    <!-- 后端加载失败状态 -->
    <div v-else-if="backendError" class="backend-error">
      <el-icon class="error-icon" :size="48"><CircleClose /></el-icon>
      <div class="error-text">无法连接到本地服务</div>
      <div class="error-subtext">{{ backendError }}</div>
      <el-button type="primary" @click="retryBackendConnection">重试</el-button>
    </div>

    <!-- 正常内容 -->
    <template v-else>
    <!-- 文件列表视图 -->
    <div v-if="viewMode === 'list'" class="file-list-view">
      <!-- 头部 -->
      <div class="file-manager-header">
        <div class="header-row">
          <div class="header-left">
            <i class="pi pi-book header-icon"></i>
            <h1 class="header-title hidden md:block">知识库</h1>
            <!-- 角色选择按钮（仅远程模式显示） -->
            <el-button
              v-if="!isLocalMode"
              text
              class="role-select-btn"
              @click="emit('role-select')"
            >
              <img
                v-if="roleInfo?.avatar_url"
                :src="roleInfo.avatar_url"
                class="role-avatar-small"
              />
              <span class="role-label">{{ currentRoleName }}</span>
              <i class="pi pi-angle-down"></i>
            </el-button>
          </div>
          <div class="header-right">
            <!-- Tauri 环境下显示本地/远程切换 -->
            <div v-if="showModeSwitch" class="mode-switch">
              <span class="mode-label">{{ isLocalMode ? '本地' : '远程' }}</span>
              <el-switch v-model="isLocalMode" size="small" @change="handleModeChange" />
            </div>
            <div v-if="canOpenCurrentFolder">
            <el-button text @click="openCurrentFolder" title="打开当前目录">
              <i class="pi pi-folder-open"></i>
            </el-button>
             </div>
            <div>
            <el-button text  @click="refreshFiles" :loading="loading" title="刷新">
              <i class="pi pi-refresh"></i>
            </el-button>
             </div>
              <div>
            <el-button text  @click="showCreateDialog = true" title="新建">
              <i class="pi pi-plus"></i>
            </el-button>
             </div>
            <div>
            <el-button text  @click="triggerFileUpload" :loading="uploading" title="上传文件">
              <i class="pi pi-upload"></i>
            </el-button>
            </div>
            <input
              ref="fileInputRef"
              type="file"
              multiple
              style="display: none"
              @change="handleFileInputChange"
            />
          </div>
        </div>

        <!-- 路径导航 -->
        <div v-if="currentPath" class="path-nav">
          <el-button text size="small" @click="goBack" title="返回上级">
            <i class="pi pi-arrow-left"></i>
          </el-button>
          <div class="path-breadcrumb">
            <span class="path-item" @click="goToRoot">根目录</span>
            <template v-for="(part, index) in pathParts" :key="index">
              <i class="pi pi-angle-right"></i>
              <span class="path-item" @click="goToPath(index)">{{ part }}</span>
            </template>
          </div>
        </div>
      </div>

      <!-- 文件列表 -->
      <div
        class="file-list"
        v-if="!loading && files.length > 0"
        @drop="handleFileDrop"
        @dragover.prevent
        @dragenter.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        :class="{ 'drag-over': isDragging }"
      >
        <div
          v-for="file in files"
          :key="file.path"
          class="file-item"
          :draggable="file.type === 'file'"
          @click="handleFileClick(file)"
          @dragstart="handleFileDragStart($event, file)"
        >
          <i :class="getFileIcon(file)" :style="{ color: getFileColor(file) }"></i>
          <div class="file-info">
            <div class="file-name">{{ file.name }}</div>
            <div v-if="file.type === 'file'" class="file-meta">
              {{ formatFileSize(file.size) }} · {{ formatDate(file.modified) }}
            </div>
          </div>
          <div class="file-actions" @click.stop>
            <el-dropdown trigger="click" @command="handleFileCommand($event, file)">
              <el-button text size="small">
                <i class="pi pi-ellipsis-v"></i>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item v-if="file.type === 'file'" command="preview">
                    <i class="pi pi-eye"></i> 预览
                  </el-dropdown-item>
                  <el-dropdown-item v-if="file.type === 'file'" command="download">
                    <i class="pi pi-download"></i> 下载
                  </el-dropdown-item>
                  <el-dropdown-item v-if="file.type === 'file' && !isLocalMode" command="share">
                    <i class="pi pi-share-alt"></i> 分享
                  </el-dropdown-item>
                  <el-dropdown-item command="rename">
                    <i class="pi pi-pencil"></i> 重命名
                  </el-dropdown-item>
                  <el-dropdown-item command="delete" divided>
                    <i class="pi pi-trash"></i> 删除
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div
        v-else-if="!loading && files.length === 0"
        class="empty-state"
        @drop="handleFileDrop"
        @dragover.prevent
        @dragenter.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        :class="{ 'drag-over': isDragging }"
      >
        <i class="pi pi-folder-open"></i>
        <p>暂无文件</p>
        <p class="hint">拖拽文件到此处上传</p>
        <el-button size="small" @click="showCreateDialog = true">创建文件</el-button>
      </div>

      <!-- 加载状态 -->
      <div v-else-if="loading" class="loading-state">
        <i class="pi pi-spin pi-spinner"></i>
        <span>加载中...</span>
      </div>

      <!-- 上传中遮罩 -->
      <div v-if="uploading" class="uploading-overlay">
        <i class="pi pi-spin pi-spinner"></i>
        <span>上传中...</span>
      </div>
    </div>

    <!-- 文件查看器视图 -->
    <div v-else-if="viewMode === 'viewer' && currentViewFile" class="file-viewer-view">
      <!-- 图片查看器 -->
      <ImageViewer
        v-if="getViewerType(currentViewFile) === 'image'"
        :file-name="currentViewFile.name"
        :url="currentFileUrl"
        :file-size="formatFileSize(currentViewFile.size)"
        @close="closeViewer"
      />

      <!-- 代码查看器 -->
      <CodeViewer
        v-else-if="getViewerType(currentViewFile) === 'code'"
        :file-name="currentViewFile.name"
        :file-path="currentViewFile.path"
        :file-size="formatFileSize(currentViewFile.size)"
        mode="knowledge-base"
        :is-local="isLocalMode"
        :role-id="effectiveRoleId"
        @close="closeViewer"
      />

      <!-- Markdown 查看器 -->
      <MdViewer
        v-else-if="getViewerType(currentViewFile) === 'markdown'"
        :file-name="currentViewFile.name"
        :file-path="currentViewFile.path"
        :file-size="formatFileSize(currentViewFile.size)"
        mode="knowledge-base"
        :is-local="isLocalMode"
        :role-id="effectiveRoleId"
        @close="closeViewer"
      />

      <!-- HTML 查看器 -->
      <HtmlViewer
        v-else-if="getViewerType(currentViewFile) === 'html'"
        :file-name="currentViewFile.name"
        :file-path="currentViewFile.path"
        :file-size="formatFileSize(currentViewFile.size)"
        mode="knowledge-base"
        :is-local="isLocalMode"
        :role-id="effectiveRoleId"
        @close="closeViewer"
      />

      <!-- PDF 查看器 -->
      <PdfViewer
        v-else-if="getViewerType(currentViewFile) === 'pdf'"
        :file-name="currentViewFile.name"
        :file-path="currentViewFile.path"
        :file-size="formatFileSize(currentViewFile.size)"
        mode="knowledge-base"
        :is-local="isLocalMode"
        :role-id="effectiveRoleId"
        @close="closeViewer"
      />

      <!-- 默认查看器 -->
      <div v-else class="default-viewer">
        <div class="viewer-header">
          <el-button text @click="closeViewer" title="返回">
            <i class="pi pi-arrow-left"></i>
          </el-button>
          <div class="viewer-title">
            <span>{{ currentViewFile.name }}</span>
            <span class="hint">暂不支持此文件类型的预览</span>
          </div>
        </div>
        <div class="viewer-content">
          <i class="pi pi-file"></i>
          <p>暂不支持此文件类型的预览</p>
          <el-button @click="downloadFile(currentViewFile)">下载文件</el-button>
        </div>
      </div>
    </div>

    <!-- 新建文件对话框 -->
    <el-dialog v-model="showCreateDialog" title="新建文件/文件夹" width="400px">
      <el-form label-position="top">
        <el-form-item label="类型">
          <el-radio-group v-model="createType">
            <el-radio value="file">文件</el-radio>
            <el-radio value="directory">文件夹</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="名称">
          <div v-if="currentPath" class="path-hint">将创建在: {{ currentPath }}/</div>
          <el-input
            v-model="createName"
            :placeholder="createType === 'file' ? '例如: index.js' : '例如: src'"
          />
        </el-form-item>
        <el-form-item v-if="createType === 'file'" label="初始内容 (可选)">
          <el-input
            v-model="createContent"
            type="textarea"
            :rows="4"
            placeholder="文件的初始内容..."
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="createFile" :disabled="!createName.trim()">创建</el-button>
      </template>
    </el-dialog>

    <!-- 重命名对话框 -->
    <el-dialog v-model="showRenameDialog" title="重命名" width="400px">
      <el-form label-position="top">
        <el-form-item label="新名称">
          <el-input v-model="renameName" :placeholder="renameFile?.name" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRenameDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmRename" :disabled="!renameName.trim()">确认</el-button>
      </template>
    </el-dialog>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Loading, CircleClose } from '@element-plus/icons-vue'
import http from '@/utils/http'
import { useSettingStore } from '@/store/modules/setting'
import { useUserStore } from '@/store/modules/user'
import { isTauriEnv } from '@/utils/env'
import { copyToClipboard } from '@/utils/clipboard'
import { getRuntimeLocalApiBaseUrl, isSelfUseMode } from '@/utils/runtime-mode'
import ImageViewer from '../file/ImageViewer.vue'
import CodeViewer from '../file/CodeViewer.vue'
import MdViewer from '../file/MdViewer.vue'
import HtmlViewer from '../file/HtmlViewer.vue'
import PdfViewer from '../file/PdfViewer.vue'

// 角色信息接口
interface RoleInfo {
  role_id: string
  name: string
  avatar_url?: string
  color?: string
}

// Props
const props = defineProps<{
  roleId?: string | null
  roleInfo?: RoleInfo | null
}>()

// Emits
const emit = defineEmits<{
  'role-select': []
}>()

// 主题
const settingStore = useSettingStore()
const { isDark } = storeToRefs(settingStore)

// 用户信息
const userStore = useUserStore()
const currentUserId = computed(() => userStore.getUserInfo?.userId)

// Tauri 环境检测和本地模式
const isTauri = computed(() => isTauriEnv())
const isLocalMode = ref(isTauriEnv())
const selfUseMode = isSelfUseMode()
const showModeSwitch = computed(() => isTauri.value && !selfUseMode)
const canOpenCurrentFolder = computed(() => isLocalMode.value && (isTauri.value || selfUseMode))
const LOCAL_API_URL = getRuntimeLocalApiBaseUrl()

// 当前角色名称
const currentRoleName = computed(() => {
  if (props.roleInfo) {
    return `角色${props.roleInfo.name}的知识库`
  }
  return '我的知识库'
})

// 获取API基础URL
const getBaseUrl = () => isLocalMode.value ? LOCAL_API_URL : ''

// 本地模式下不使用角色知识库，始终使用用户自己的知识库
const effectiveRoleId = computed(() => isLocalMode.value ? undefined : props.roleId)

// 切换模式时重新加载文件列表
const handleModeChange = () => {
  currentPath.value = ''  // 重置路径
  fetchFiles()
}

const openCurrentFolder = async () => {
  try {
    const formData = new FormData()
    formData.append('path', currentPath.value)
    if (effectiveRoleId.value) {
      formData.append('role_id', effectiveRoleId.value)
    }
    await http.post({
      url: `${LOCAL_API_URL}/api/agent/knowledge-base/open-folder`,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  } catch (error) {
    console.error('Failed to open knowledge base folder:', error)
    ElMessage.error('无法打开当前目录')
  }
}

interface FileInfo {
  name: string
  path: string
  type: 'file' | 'directory'
  size?: number
  modified?: string
}

// 响应式数据
const files = ref<FileInfo[]>([])
const loading = ref(false)
const currentPath = ref('')

// 视图模式
const viewMode = ref<'list' | 'viewer'>('list')
const currentViewFile = ref<FileInfo | null>(null)
const currentFileUrl = ref('')

// 对话框状态
const showCreateDialog = ref(false)
const createType = ref<'file' | 'directory'>('file')
const createName = ref('')
const createContent = ref('')

// 重命名
const showRenameDialog = ref(false)
const renameFile = ref<FileInfo | null>(null)
const renameName = ref('')

// 后端健康检查相关
const backendLoading = ref(false)
const backendError = ref('')
const loadingMessage = ref('正在检查服务状态...')
let healthCheckTimer: number | null = null
let healthCheckAttempts = 0
const MAX_HEALTH_CHECK_ATTEMPTS = 100

// 拖拽状态
const isDragging = ref(false)
const uploading = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

// 文件大小限制
const MAX_FILE_SIZE = 10 * 1024 * 1024  // 10MB

// 路径相关计算属性
const pathParts = computed(() => {
  if (!currentPath.value) return []
  return currentPath.value.split('/').filter(part => part.length > 0)
})

// 检查后端健康状态
const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${LOCAL_API_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    })
    return response.ok
  } catch (error) {
    return false
  }
}

// 等待后端启动
const waitForBackend = async () => {
  backendLoading.value = true
  backendError.value = ''
  healthCheckAttempts = 0

  const checkHealth = async () => {
    healthCheckAttempts++
    loadingMessage.value = `正在检查服务状态... (${healthCheckAttempts}/${MAX_HEALTH_CHECK_ATTEMPTS})`

    const isHealthy = await checkBackendHealth()

    if (isHealthy) {
      backendLoading.value = false
      if (healthCheckTimer) {
        clearInterval(healthCheckTimer)
        healthCheckTimer = null
      }
      await fetchFiles()
    } else if (healthCheckAttempts >= MAX_HEALTH_CHECK_ATTEMPTS) {
      backendLoading.value = false
      backendError.value = '服务启动超时，请检查后端是否正常运行'
      if (healthCheckTimer) {
        clearInterval(healthCheckTimer)
        healthCheckTimer = null
      }
    }
  }

  await checkHealth()

  if (backendLoading.value) {
    healthCheckTimer = window.setInterval(checkHealth, 1000)
  }
}

// 重试连接
const retryBackendConnection = () => {
  waitForBackend()
}

// 获取文件列表
const fetchFiles = async () => {
  loading.value = true
  try {
    const params: any = { path: currentPath.value }
    if (effectiveRoleId.value) {
      params.role_id = effectiveRoleId.value
    }
    const response = await http.get({
      url: `${getBaseUrl()}/api/agent/knowledge-base/file-list`,
      params
    })
    files.value = response || []
  } catch (error) {
    console.error('Failed to fetch files:', error)
    ElMessage.error('获取文件列表失败')
  } finally {
    loading.value = false
  }
}

// 创建文件
const createFile = async () => {
  if (!createName.value.trim()) return

  try {
    const fullPath = currentPath.value
      ? `${currentPath.value}/${createName.value.trim()}`
      : createName.value.trim()

    await http.post({
      url: `${getBaseUrl()}/api/agent/knowledge-base/file-create`,
      data: {
        path: fullPath,
        content: createContent.value,
        is_directory: createType.value === 'directory',
        role_id: effectiveRoleId.value || undefined
      }
    })

    showCreateDialog.value = false
    createName.value = ''
    createContent.value = ''
    await fetchFiles()
    ElMessage.success('创建成功')
  } catch (error) {
    console.error('Failed to create file:', error)
    ElMessage.error('创建失败')
  }
}

// 删除文件
const deleteFile = async (file: FileInfo) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除 ${file.name} 吗？`,
      '确认删除',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const params: any = { path: file.path }
    if (effectiveRoleId.value) {
      params.role_id = effectiveRoleId.value
    }

    await http.del({
      url: `${getBaseUrl()}/api/agent/knowledge-base/file-delete`,
      params
    })

    await fetchFiles()
    ElMessage.success('删除成功')
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Failed to delete file:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 下载文件
const downloadFile = async (file: FileInfo) => {
  if (file.type === 'directory') return

  try {
    const params: any = { path: file.path }
    if (effectiveRoleId.value) {
      params.role_id = effectiveRoleId.value
    }

    const response = await http.get({
      url: `${getBaseUrl()}/api/agent/knowledge-base/file-content`,
      params
    })

    let blob: Blob
    if (response.encoding === 'base64') {
      const binaryString = atob(response.content)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      blob = new Blob([bytes])
    } else {
      blob = new Blob([response.content], { type: 'text/plain;charset=utf-8' })
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    ElMessage.success('下载完成')
  } catch (error) {
    console.error('Failed to download file:', error)
    ElMessage.error('下载失败')
  }
}

// 分享文件
const shareFile = async (file: FileInfo) => {
  if (file.type === 'directory') return

  // HTML 文件直接复制预览链接
  if (/\.(html|htm)$/i.test(file.name)) {
    const origin = window.location.origin
    const params: string[] = []
    if (effectiveRoleId.value) {
      params.push(`role_id=${effectiveRoleId.value}`)
    } else if (currentUserId.value) {
      params.push(`user_id=${currentUserId.value}`)
    }
    const qs = params.length ? `?${params.join('&')}` : ''
    const fullUrl = `${origin}${getBaseUrl()}/api/agent/knowledge-base/files/${file.path}${qs}`
    const success = await copyToClipboard(fullUrl)
    if (success) {
      ElMessage.success('预览链接已复制到剪贴板')
    } else {
      ElMessage.error('复制到剪贴板失败')
    }
    return
  }

  try {
    const response = await http.post({
      url: `${getBaseUrl()}/api/agent/file/share`,
      data: {
        file_path: file.path,
        mode: 'knowledge-base',
        role_id: effectiveRoleId.value || undefined
      }
    })

    const origin = window.location.origin
    const fullUrl = `${origin}${response.share_url}`

    // 直接复制到剪贴板
    const success = await copyToClipboard(fullUrl)
    if (success) {
      ElMessage.success('分享链接已复制到剪贴板')
    } else {
      ElMessage.error('复制到剪贴板失败')
    }
  } catch (error: any) {
    console.error('Share error:', error)
    ElMessage.error(error.message || '创建分享链接失败')
  }
}

// 重命名
const startRename = (file: FileInfo) => {
  renameFile.value = file
  renameName.value = file.name
  showRenameDialog.value = true
}

const confirmRename = async () => {
  if (!renameFile.value || !renameName.value.trim()) return

  try {
    const oldPath = renameFile.value.path
    const pathParts = oldPath.split('/')
    pathParts[pathParts.length - 1] = renameName.value.trim()
    const newPath = pathParts.join('/')

    await http.post({
      url: `${getBaseUrl()}/api/agent/knowledge-base/file-rename`,
      data: {
        old_path: oldPath,
        new_path: newPath,
        role_id: effectiveRoleId.value || undefined
      }
    })

    showRenameDialog.value = false
    renameFile.value = null
    renameName.value = ''
    await fetchFiles()
    ElMessage.success('重命名成功')
  } catch (error) {
    console.error('Failed to rename file:', error)
    ElMessage.error('重命名失败')
  }
}

// 文件点击处理
const handleFileClick = (file: FileInfo) => {
  if (file.type === 'directory') {
    currentPath.value = file.path
    fetchFiles()
  } else {
    openFileViewer(file)
  }
}

// 文件操作命令
const handleFileCommand = (command: string, file: FileInfo) => {
  switch (command) {
    case 'preview':
      openFileViewer(file)
      break
    case 'download':
      downloadFile(file)
      break
    case 'share':
      shareFile(file)
      break
    case 'rename':
      startRename(file)
      break
    case 'delete':
      deleteFile(file)
      break
  }
}

// 文件查看器
const openFileViewer = async (file: FileInfo) => {
  if (!file || file.type === 'directory') return

  currentViewFile.value = file

  // 如果是图片，需要先获取图片URL
  if (getViewerType(file) === 'image') {
    currentFileUrl.value = await getFileUrl(file)
  }

  viewMode.value = 'viewer'
}

// 获取文件URL（用于图片等需要URL的查看器）
const getFileUrl = async (file: FileInfo): Promise<string> => {
  try {
    const params: any = { path: file.path }
    if (effectiveRoleId.value) {
      params.role_id = effectiveRoleId.value
    }

    const response = await http.get({
      url: `${getBaseUrl()}/api/agent/knowledge-base/file-content`,
      params
    })

    // 如果是 base64 编码的图片
    if (response.encoding === 'base64') {
      const ext = file.name.split('.').pop()?.toLowerCase()
      const mimeMap: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        'bmp': 'image/bmp'
      }
      const mimeType = mimeMap[ext || ''] || 'image/jpeg'
      return `data:${mimeType};base64,${response.content}`
    } else {
      // 如果是文本格式的 SVG
      if (file.name.toLowerCase().endsWith('.svg')) {
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(response.content)}`
      }
    }
    return ''
  } catch (error) {
    console.error('Failed to get file URL:', error)
    return ''
  }
}

const closeViewer = () => {
  viewMode.value = 'list'
  currentViewFile.value = null
  currentFileUrl.value = ''
}

const getViewerType = (file: FileInfo): string => {
  if (!file) return 'default'

  const ext = file.name.split('.').pop()?.toLowerCase()
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp']
  const markdownExts = ['md', 'markdown']
  const htmlExts = ['html', 'htm']
  const pdfExts = ['pdf']
  const codeExts = ['js', 'ts', 'jsx', 'tsx', 'vue', 'py', 'json', 'css', 'scss', 'less', 'yaml', 'yml', 'xml', 'txt', 'sh', 'bash', 'sql', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'rb', 'php', 'swift', 'kt', 'lua', 'r', 'toml', 'ini', 'conf', 'env', 'gitignore', 'dockerfile']

  if (imageExts.includes(ext || '')) return 'image'
  if (markdownExts.includes(ext || '')) return 'markdown'
  if (htmlExts.includes(ext || '')) return 'html'
  if (pdfExts.includes(ext || '')) return 'pdf'
  if (codeExts.includes(ext || '')) return 'code'
  return 'default'
}

// 路径导航
const goBack = () => {
  if (!currentPath.value) return
  const parts = currentPath.value.split('/').filter(part => part.length > 0)
  if (parts.length > 0) {
    parts.pop()
    currentPath.value = parts.join('/')
    fetchFiles()
  }
}

const goToRoot = () => {
  currentPath.value = ''
  fetchFiles()
}

const goToPath = (index: number) => {
  const parts = currentPath.value.split('/').filter(part => part.length > 0)
  currentPath.value = parts.slice(0, index + 1).join('/')
  fetchFiles()
}

// 验证文件大小
const validateFileSize = (files: FileList): { valid: File[], invalid: string[] } => {
  const valid: File[] = []
  const invalid: string[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (file.size > MAX_FILE_SIZE) {
      invalid.push(file.name)
    } else {
      valid.push(file)
    }
  }

  return { valid, invalid }
}

// 上传文件
const uploadFiles = async (files: File[]) => {
  if (files.length === 0) return

  uploading.value = true

  try {
    // 构建 FormData
    const formData = new FormData()
    for (const file of files) {
      formData.append('files', file)
    }
    formData.append('path', currentPath.value)
    if (effectiveRoleId.value) {
      formData.append('role_id', effectiveRoleId.value)
    }

    // 上传文件
    const response = await http.post({
      url: `${getBaseUrl()}/api/agent/knowledge-base/file-upload`,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    console.log('Upload response:', response)
    ElMessage.success(response.message || `成功上传 ${files.length} 个文件`)

    // 刷新文件列表
    await fetchFiles()
  } catch (error: any) {
    console.error('Upload error:', error)
    ElMessage.error(error.message || '上传失败')
  } finally {
    uploading.value = false
  }
}

// 文件拖拽上传
const handleFileDrop = async (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = false

  const droppedFiles = e.dataTransfer?.files
  if (!droppedFiles || droppedFiles.length === 0) return

  // 验证文件大小
  const { valid, invalid } = validateFileSize(droppedFiles)

  if (invalid.length > 0) {
    ElMessage.warning(`以下文件超过 10MB 限制，已跳过：${invalid.join(', ')}`)
  }

  if (valid.length > 0) {
    await uploadFiles(valid)
  }
}

// 触发文件选择
const triggerFileUpload = () => {
  fileInputRef.value?.click()
}

// 处理文件选择
const handleFileInputChange = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return

  // 验证文件大小
  const { valid, invalid } = validateFileSize(files)

  if (invalid.length > 0) {
    ElMessage.warning(`以下文件超过 10MB 限制，已跳过：${invalid.join(', ')}`)
  }

  if (valid.length > 0) {
    await uploadFiles(valid)
  }

  // 清空 input，允许重复选择相同文件
  input.value = ''
}

// 文件拖拽开始（用于拖拽到输入框）
const handleFileDragStart = (e: DragEvent, file: FileInfo) => {
  if (file.type !== 'file' || !e.dataTransfer) return

  // 设置拖拽数据
  e.dataTransfer.setData('text/plain', `@${file.path}`)
  e.dataTransfer.setData('application/x-workspace-file', JSON.stringify({
    path: file.path,
    name: file.name
  }))
  e.dataTransfer.effectAllowed = 'copy'
}

// 刷新
const refreshFiles = () => {
  fetchFiles()
}

// 工具函数
const getFileIcon = (file: FileInfo) => {
  if (file.type === 'directory') return 'pi pi-folder'

  const ext = file.name.split('.').pop()?.toLowerCase()
  const iconMap: Record<string, string> = {
    'js': 'pi pi-file',
    'ts': 'pi pi-file',
    'vue': 'pi pi-file',
    'html': 'pi pi-globe',
    'htm': 'pi pi-globe',
    'css': 'pi pi-file',
    'json': 'pi pi-file',
    'md': 'pi pi-file',
    'txt': 'pi pi-file',
    'py': 'pi pi-file',
    'pdf': 'pi pi-file-pdf',
    'jpg': 'pi pi-image',
    'jpeg': 'pi pi-image',
    'png': 'pi pi-image',
    'gif': 'pi pi-image',
    'svg': 'pi pi-image'
  }

  return iconMap[ext || ''] || 'pi pi-file'
}

const getFileColor = (file: FileInfo) => {
  if (file.type === 'directory') return '#3b82f6'

  const ext = file.name.split('.').pop()?.toLowerCase()
  const colorMap: Record<string, string> = {
    'js': '#f7df1e',
    'ts': '#3178c6',
    'vue': '#4fc08d',
    'html': '#e34f26',
    'htm': '#e34f26',
    'css': '#1572b6',
    'json': '#6b7280',
    'md': '#083fa1',
    'py': '#3776ab',
    'pdf': '#ef4444',
    'jpg': '#22c55e',
    'jpeg': '#22c55e',
    'png': '#22c55e',
    'gif': '#22c55e',
    'svg': '#22c55e'
  }

  return colorMap[ext || ''] || '#6b7280'
}

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 监听 roleId 变化，重新加载文件列表
watch(() => props.roleId, () => {
  currentPath.value = ''  // 重置路径
  fetchFiles()
})

// 生命周期
onMounted(async () => {
  // Tauri 本地模式下需要等待后端启动
  if (isTauri.value && isLocalMode.value) {
    await waitForBackend()
  } else {
    await fetchFiles()
  }

  // Tauri 环境下监听文件拖拽
  if (isTauri.value) {
    try {
      const { listen } = await import('@tauri-apps/api/event')
      const unlisten = await listen('tauri://file-drop', async (event: any) => {
        console.log('Tauri file drop:', event)
        const filePaths = event.payload as string[]
        if (filePaths && filePaths.length > 0) {
          await handleTauriFileDrop(filePaths)
        }
      })

      // 保存 unlisten 函数以便清理
      ;(window as any).__fileDropUnlisten = unlisten
    } catch (error) {
      console.error('Failed to setup Tauri file drop listener:', error)
    }
  }
})

onUnmounted(() => {
  // 清理 Tauri 文件拖拽监听
  if ((window as any).__fileDropUnlisten) {
    ;(window as any).__fileDropUnlisten()
  }
  // 清理健康检查定时器
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer)
    healthCheckTimer = null
  }
})
</script>

<style scoped lang="scss">
// 颜色变量 - 浅色模式
$light-bg: #ffffff;
$light-bg-secondary: #f5f5f5;
$light-border: rgba(0, 0, 0, 0.08);
$light-text: #1f2937;
$light-text-secondary: #6b7280;
$light-hover-bg: rgba(0, 0, 0, 0.04);

// 颜色变量 - 深色模式
$dark-bg: #111111;
$dark-bg-secondary: #27272a;
$dark-border: rgba(255, 255, 255, 0.08);
$dark-text: #f4f4f5;
$dark-text-secondary: #71717a;
$dark-hover-bg: rgba(255, 255, 255, 0.05);

.file-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: $light-bg;
  color: $light-text;

  &.is-dark {
    background: $dark-bg;
    color: #fff;
  }
}

.backend-loading,
.backend-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  gap: 16px;
}

.backend-loading {
  .loading-icon {
    color: var(--el-color-primary);
    animation: rotate 1s linear infinite;
  }

  .loading-text {
    font-size: 18px;
    font-weight: 500;
    color: $dark-text;
  }

  .loading-subtext {
    font-size: 14px;
    color: $dark-text-secondary;
  }

  .is-dark & {
    .loading-text {
      color: white;
    }
  }
}

.backend-error {
  .error-icon {
    color: var(--el-color-danger);
  }

  .error-text {
    font-size: 18px;
    font-weight: 500;
    color: $dark-text;
  }

  .error-subtext {
    font-size: 14px;
    color: $dark-text-secondary;
    margin-bottom: 8px;
  }

  .is-dark & {
    .error-text {
      color: white;
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

.file-list-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.file-manager-header {
  flex-shrink: 0;
  border-bottom: 1px solid $light-border;

  .is-dark & {
    border-bottom-color: $dark-border;
  }
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  font-size: 20px;
  color: #3b82f6;

  .is-dark & {
    color: #60a5fa;
  }
}

.header-title {
  font-size: 20px;
  font-weight: 600;
  color: $light-text;
  margin: 0;

  .is-dark & {
    color: #fff;
  }
}

.role-select-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 6px;
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  font-size: 13px;
  margin-left: 8px;

  .role-avatar-small {
    width: 16px;
    height: 20px;
    border-radius: 4px;
    object-fit: cover;
    margin-right: 6px;
  }

  .role-label {
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &:hover {
    background: rgba(59, 130, 246, 0.15);
  }

  .is-dark & {
    background: rgba(96, 165, 250, 0.15);
    color: #60a5fa;

    &:hover {
      background: rgba(96, 165, 250, 0.2);
    }
  }
}

.header-right {
  display: flex;
  align-items: center;

  .el-button {
    color: $light-text-secondary;

    &:hover {
      color: $light-text;
      background: $light-hover-bg;
    }
  }

  .is-dark & .el-button {
    color: $dark-text-secondary;

    &:hover {
      color: #fff;
      background: $dark-hover-bg;
    }
  }
}

.mode-switch {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.04);
  margin-right: 8px;

  .mode-label {
    font-size: 12px;
    color: $light-text-secondary;
  }

  .is-dark & {
    background: rgba(255, 255, 255, 0.05);

    .mode-label {
      color: $dark-text-secondary;
    }
  }
}

.path-nav {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background: $light-bg-secondary;
  border-top: 1px solid $light-border;

  .el-button {
    color: $light-text-secondary;
    margin-right: 8px;

    &:hover {
      color: $light-text;
    }
  }

  .is-dark & {
    background: rgba(255, 255, 255, 0.02);
    border-top-color: rgba(255, 255, 255, 0.05);

    .el-button {
      color: $dark-text-secondary;

      &:hover {
        color: #fff;
      }
    }
  }
}

.path-breadcrumb {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: $light-text-secondary;

  .path-item {
    cursor: pointer;
    padding: 2px 6px;
    border-radius: 4px;

    &:hover {
      color: $light-text;
      background: $light-hover-bg;
    }
  }

  i {
    font-size: 10px;
  }

  .is-dark & {
    color: $dark-text-secondary;

    .path-item:hover {
      color: #fff;
      background: $dark-hover-bg;
    }
  }
}

.file-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;

  &.drag-over {
    background: rgba(59, 130, 246, 0.1);
    border: 2px dashed #3b82f6;
  }
}

.file-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;

  // 文件可拖拽样式
  &[draggable="true"] {
    cursor: grab;

    &:active {
      cursor: grabbing;
    }
  }

  &:hover {
    background: $light-hover-bg;

    .file-actions {
      opacity: 1;
    }
  }

  > i {
    font-size: 16px;
    margin-right: 10px;
    flex-shrink: 0;
  }

  .is-dark & {
    &:hover {
      background: $dark-hover-bg;
    }
  }
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 13px;
  color: $light-text;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  .is-dark & {
    color: $dark-text;
  }
}

.file-meta {
  font-size: 11px;
  color: $light-text-secondary;
  margin-top: 2px;

  .is-dark & {
    color: $dark-text-secondary;
  }
}

.file-actions {
  opacity: 0;
  transition: opacity 0.2s;

  .el-button {
    color: $light-text-secondary;

    &:hover {
      color: $light-text;
    }
  }

  .is-dark & .el-button {
    color: $dark-text-secondary;

    &:hover {
      color: #fff;
    }
  }
}

.empty-state,
.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: $light-text-secondary;
  padding: 32px;

  &.drag-over {
    background: rgba(59, 130, 246, 0.1);
    border: 2px dashed #3b82f6;
  }

  > i {
    font-size: 32px;
    margin-bottom: 12px;
  }

  p {
    margin: 4px 0;
  }

  .hint {
    font-size: 12px;
    color: #9ca3af;
  }

  .el-button {
    margin-top: 16px;
  }

  .is-dark & {
    color: $dark-text-secondary;

    .hint {
      color: #52525b;
    }
  }
}

.uploading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  color: #3b82f6;
  z-index: 10;

  > i {
    font-size: 32px;
    margin-bottom: 12px;
  }

  .is-dark & {
    background: rgba(24, 24, 27, 0.9);
    color: #60a5fa;
  }
}

.file-viewer-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.default-viewer {
  height: 100%;
  display: flex;
  flex-direction: column;

  .viewer-header {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid $light-border;

    .el-button {
      color: $light-text-secondary;
      margin-right: 12px;

      &:hover {
        color: $light-text;
      }
    }

    .viewer-title {
      span {
        display: block;

        &:first-child {
          font-size: 14px;
          color: $light-text;
        }

        &.hint {
          font-size: 12px;
          color: $light-text-secondary;
          margin-top: 2px;
        }
      }
    }
  }

  .viewer-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: $light-text-secondary;

    > i {
      font-size: 48px;
      margin-bottom: 16px;
    }

    p {
      margin-bottom: 16px;
    }
  }

  .is-dark & {
    .viewer-header {
      border-bottom-color: $dark-border;

      .el-button {
        color: $dark-text-secondary;

        &:hover {
          color: #fff;
        }
      }

      .viewer-title span:first-child {
        color: $dark-text;
      }

      .viewer-title .hint {
        color: $dark-text-secondary;
      }
    }

    .viewer-content {
      color: $dark-text-secondary;
    }
  }
}

.path-hint {
  font-size: 12px;
  color: $light-text-secondary;
  margin-bottom: 8px;

  .is-dark & {
    color: $dark-text-secondary;
  }
}

// 滚动条样式
.file-list::-webkit-scrollbar {
  width: 6px;
}

.file-list::-webkit-scrollbar-track {
  background: transparent;
}

.file-list::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;

  &:hover {
    background: rgba(0, 0, 0, 0.2);
  }

  .is-dark & {
    background: rgba(255, 255, 255, 0.1);

    &:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  }
}

// Element Plus 对话框样式覆盖 - 深色模式
.is-dark {
  :deep(.el-dialog) {
    background: $dark-bg-secondary;
    border: 1px solid rgba(255, 255, 255, 0.1);

    .el-dialog__header {
      border-bottom: 1px solid $dark-border;
      padding: 16px 20px;
    }

    .el-dialog__title {
      color: $dark-text;
    }

    .el-dialog__body {
      padding: 20px;
    }

    .el-form-item__label {
      color: #a1a1aa;
    }

    .el-input__wrapper,
    .el-textarea__inner {
      background: $dark-bg;
      border-color: rgba(255, 255, 255, 0.1);
      color: $dark-text;

      &:hover {
        border-color: rgba(255, 255, 255, 0.2);
      }
    }

    .el-radio__label {
      color: $dark-text;
    }
  }

  // 下拉菜单样式 - 深色模式
  :deep(.el-dropdown-menu) {
    background: $dark-bg-secondary;
    border: 1px solid rgba(255, 255, 255, 0.1);

    .el-dropdown-menu__item {
      color: $dark-text;

      i {
        margin-right: 8px;
      }

      &:hover {
        background: $dark-hover-bg;
      }

      &.is-disabled {
        color: #52525b;
      }
    }
  }
}
</style>
