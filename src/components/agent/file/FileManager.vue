<template>
  <div class="file-manager" :class="{ 'is-dark': isDark }">
    <!-- 文件列表视图 -->
    <div v-if="viewMode === 'list'" class="file-list-view">
      <!-- 头部 -->
      <div class="file-manager-header">
        <div class="header-row">
          <div class="header-title">
            <span>文件管理</span>
          </div>
          <div class="header-actions">
            <el-button text size="small" @click="refreshFiles" :loading="loading" title="刷新">
              <i class="pi pi-refresh"></i>
            </el-button>
            <el-button text size="small" @click="showCreateDialog = true" title="新建">
              <i class="pi pi-plus"></i>
            </el-button>
            <el-button text size="small" @click="triggerFileUpload" :loading="uploading" title="上传文件">
              <i class="pi pi-upload"></i>
            </el-button>
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
                                    <el-dropdown-item v-if="file.type === 'file' && !isPublicMode" command="share">
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
        :session-id="sessionId"
        :is-public-mode="isPublicMode"
        :visitor-id="visitorId"
        @close="closeViewer"
      />

      <!-- Markdown 查看器 -->
      <MdViewer
        v-else-if="getViewerType(currentViewFile) === 'markdown'"
        :file-name="currentViewFile.name"
        :file-path="currentViewFile.path"
        :file-size="formatFileSize(currentViewFile.size)"
        :session-id="sessionId"
        :is-public-mode="isPublicMode"
        :visitor-id="visitorId"
        @close="closeViewer"
      />

      <!-- HTML 查看器 -->
      <HtmlViewer
        v-else-if="getViewerType(currentViewFile) === 'html'"
        :file-name="currentViewFile.name"
        :file-path="currentViewFile.path"
        :file-size="formatFileSize(currentViewFile.size)"
        :session-id="sessionId"
        :is-public-mode="isPublicMode"
        :visitor-id="visitorId"
        @close="closeViewer"
      />

      <!-- PDF 查看器 -->
      <PdfViewer
        v-else-if="getViewerType(currentViewFile) === 'pdf'"
        :file-name="currentViewFile.name"
        :file-path="currentViewFile.path"
        :file-size="formatFileSize(currentViewFile.size)"
        :session-id="sessionId"
        :is-public-mode="isPublicMode"
        :visitor-id="visitorId"
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

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, inject } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage, ElMessageBox } from 'element-plus'
import http from '@/utils/http'
import { copyToClipboard } from '@/utils/clipboard'
import { useSettingStore } from '@/store/modules/setting'
import { BaseUrlKey } from '../injection'
import ImageViewer from './ImageViewer.vue'
import CodeViewer from './CodeViewer.vue'
import MdViewer from './MdViewer.vue'
import HtmlViewer from './HtmlViewer.vue'
import PdfViewer from './PdfViewer.vue'

// 主题
const settingStore = useSettingStore()
const { isDark } = storeToRefs(settingStore)
const baseUrl = inject(BaseUrlKey, '')

interface FileInfo {
  name: string
  path: string
  type: 'file' | 'directory'
  size?: number
  modified?: string
}

interface Props {
  sessionId?: string
  isPublicMode?: boolean  // 是否为公开模式
  visitorId?: string      // 公开模式下的访客ID
}

const props = withDefaults(defineProps<Props>(), {
  isPublicMode: false
})

// API 基础路径
const apiBase = computed(() => {
  return props.isPublicMode
    ? `${baseUrl}/api/agent/public/sessions/${props.sessionId}/workspace`
    : `${baseUrl}/api/agent/sessions/${props.sessionId}/workspace`
})

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

// 获取文件列表
const fetchFiles = async () => {
  if (!props.sessionId) return

  loading.value = true
  try {
    const params: Record<string, string> = { path: currentPath.value }
    if (props.isPublicMode && props.visitorId) {
      params.visitor_id = props.visitorId
    }

    const response = await http.get({
      url: `${apiBase.value}/file-list`,
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
  if (!props.sessionId || !createName.value.trim()) return

  try {
    const fullPath = currentPath.value
      ? `${currentPath.value}/${createName.value.trim()}`
      : createName.value.trim()

    const data: Record<string, any> = {
      path: fullPath,
      content: createContent.value,
      is_directory: createType.value === 'directory'
    }
    if (props.isPublicMode && props.visitorId) {
      data.visitor_id = props.visitorId
    }

    await http.post({
      url: `${apiBase.value}/file-create`,
      data
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
  if (!props.sessionId) return

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

    const params: Record<string, string> = { path: file.path }
    if (props.isPublicMode && props.visitorId) {
      params.visitor_id = props.visitorId
    }

    await http.del({
      url: `${apiBase.value}/file-delete`,
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
  if (!props.sessionId || file.type === 'directory') return

  try {
    const params: Record<string, string> = { path: file.path }
    if (props.isPublicMode && props.visitorId) {
      params.visitor_id = props.visitorId
    }

    const response = await http.get({
      url: `${apiBase.value}/file-content`,
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
const shareLoading = ref(false)

const shareFile = async (file: FileInfo) => {
  if (!props.sessionId || file.type === 'directory') return

  // HTML 文件直接复制预览链接
  if (/\.(html|htm)$/i.test(file.name)) {
    const origin = window.location.origin
    const previewPath = props.isPublicMode
      ? `/api/agent/public/sessions/${props.sessionId}/workspace/files/${file.path}${props.visitorId ? `?visitor_id=${props.visitorId}` : ''}`
      : `${baseUrl}/api/agent/sessions/${props.sessionId}/workspace/files/${file.path}`
    const fullUrl = `${origin}${previewPath}`
    const success = await copyToClipboard(fullUrl)
    if (success) {
      ElMessage.success('预览链接已复制到剪贴板')
    } else {
      ElMessage.error('复制到剪贴板失败')
    }
    return
  }

  shareLoading.value = true
  try {
    const response = await http.post({
      url: `${baseUrl}/api/agent/file/share`,
      data: {
        session_id: props.sessionId,
        file_path: file.path
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
  } finally {
    shareLoading.value = false
  }
}


// 重命名
const startRename = (file: FileInfo) => {
  renameFile.value = file
  renameName.value = file.name
  showRenameDialog.value = true
}

const confirmRename = async () => {
  if (!props.sessionId || !renameFile.value || !renameName.value.trim()) return

  try {
    const oldPath = renameFile.value.path
    const pathParts = oldPath.split('/')
    pathParts[pathParts.length - 1] = renameName.value.trim()
    const newPath = pathParts.join('/')

    const data: Record<string, any> = { old_path: oldPath, new_path: newPath }
    if (props.isPublicMode && props.visitorId) {
      data.visitor_id = props.visitorId
    }

    await http.post({
      url: `${apiBase.value}/file-rename`,
      data
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
  if (!props.sessionId) return ''

  try {
    const params: Record<string, string> = { path: file.path }
    if (props.isPublicMode && props.visitorId) {
      params.visitor_id = props.visitorId
    }

    const response = await http.get({
      url: `${apiBase.value}/file-content`,
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
  if (!props.sessionId || files.length === 0) return

  uploading.value = true

  try {
    if (props.isPublicMode && props.visitorId) {
      // 公开模式：使用 Base64 上传
      for (const file of files) {
        const reader = new FileReader()
        const base64Data = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })

        await http.post({
          url: `${apiBase.value}/upload`,
          data: {
            name: currentPath.value ? `${currentPath.value}/${file.name}` : file.name,
            type: file.type,
            data: base64Data,
            visitor_id: props.visitorId
          }
        })
      }
      ElMessage.success(`成功上传 ${files.length} 个文件`)
    } else {
      // 内部模式：使用 FormData 上传
      const formData = new FormData()
      for (const file of files) {
        formData.append('files', file)
      }
      formData.append('path', currentPath.value)

      const response = await http.post({
        url: `${baseUrl}/api/agent/sessions/${props.sessionId}/workspace/file-upload`,
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      ElMessage.success(response.message || `成功上传 ${files.length} 个文件`)
    }

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

  if (!props.sessionId) {
    ElMessage.warning('请先选择会话')
    return
  }

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

  if (!props.sessionId) {
    ElMessage.warning('请先选择会话')
    return
  }

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

// 监听 sessionId 变化
watch(() => props.sessionId, (newSessionId) => {
  if (newSessionId) {
    currentPath.value = ''
    fetchFiles()
  } else {
    files.value = []
  }
})

// 生命周期
onMounted(() => {
  if (props.sessionId) {
    fetchFiles()
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
$dark-bg: #18181b;
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
  padding: 12px 16px;
}

.header-title {
  font-size: 14px;
  font-weight: 500;
  color: $light-text;

  .is-dark & {
    color: $dark-text;
  }
}

.header-actions {
  display: flex;
  gap: 4px;

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
