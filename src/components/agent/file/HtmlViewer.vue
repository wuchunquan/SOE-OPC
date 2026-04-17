<template>
  <div
    ref="viewerRef"
    class="html-viewer"
    :class="{ 'is-dark': isDark, 'is-fullscreen': isFullscreen }"
  >
    <!-- 澶撮儴 -->
    <div class="viewer-header">
      <div class="header-left">
        <el-button text @click="handleClose" title="返回文件列表">
          <i class="pi pi-arrow-left"></i>
        </el-button>
        <div class="file-info">
          <span class="file-name">{{ fileName }}</span>
          <!-- <span class="file-size">{{ fileSize }}</span> -->
        </div>
      </div>
      <div class="header-actions">
        <!-- 视图切换 -->
        <el-button-group size="small">
          
          <el-button
            text
            :class="{ active: viewType === 'preview' }"
            @click="viewType = 'preview'"
            title="预览"
          >
            <i class="pi pi-eye"></i>
          </el-button>
          <el-button
            text
            :class="{ active: viewType === 'source' }"
            @click="viewType = 'source'"
            title="源代码"
          >
            <i class="pi pi-code"></i>
          </el-button>
          <el-button text @click="saveFile" :loading="saving" title="保存 (Ctrl+S)">
            <i class="pi pi-save"></i>
          </el-button>
          <el-button text @click="reloadFile" :loading="loading" title="重新加载">
            <i class="pi pi-refresh"></i>
          </el-button>
          <el-button text @click="downloadFile" title="下载文件">
            <i class="pi pi-download"></i>
          </el-button>
          <!-- 复制按钮 -->
          <div class="copy-btn-wrapper">
            <el-button text @click="toggleCopyMenu" title="复制">
              <i class="pi pi-copy"></i>
            </el-button>
            <div v-if="showCopyMenu" class="copy-menu">
              <div class="copy-menu-item" @click="copyAsPlainText">
                <i class="pi pi-file-edit"></i>
                复制为纯文本
              </div>
              <div class="copy-menu-item" @click="copyAsHtml">
                <i class="pi pi-file"></i>
                微信公众号格式
              </div>
            </div>
          </div>
          <el-button
            text
            :disabled="!supportsFullscreen"
            @click="toggleFullscreen"
            :title="isFullscreen ? '退出全屏' : '全屏预览'"
          >
           <ArtSvgIcon :icon="isFullscreen ? 'ri:fullscreen-exit-line' : 'ri:fullscreen-line'" />
          </el-button>
        </el-button-group>
   
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="viewer-content">
      <div v-if="loading && !content" class="loading-state">
        <i class="pi pi-spin pi-spinner"></i>
        <span>加载中...</span>
      </div>

      <!-- 错误状态-->
      <div v-else-if="error" class="error-state">
        <i class="pi pi-exclamation-circle"></i>
        <span>{{ error }}</span>
        <el-button size="small" @click="loadFile">重试</el-button>
      </div>

      <!-- 预览视图 -->
      <div v-else-if="viewType === 'preview'" class="preview-container">
        <iframe
          v-if="hasChanges"
          ref="iframeRef"
          :srcdoc="content"
          class="html-iframe"
          sandbox="allow-scripts allow-same-origin"
        ></iframe>
        <iframe
          v-else
          ref="iframeRef"
          :src="previewUrl"
          :key="previewKey"
          class="html-iframe"
          sandbox="allow-scripts allow-same-origin"
        ></iframe>
      </div>

      <!-- 源代码视图 -->
      <div v-else class="source-container">
        <CodeEditor
          ref="editorRef"
          v-model="content"
          language="html"
          :file-name="fileName"
          @change="onContentChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, inject } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage, ElMessageBox } from 'element-plus'
import http from '@/utils/http'
import { useSettingStore } from '@/store/modules/setting'
import { useUserStore } from '@/store/modules/user'
import CodeEditor from '../common/CodeEditor.vue'
import { BaseUrlKey } from '../injection'
import { getRuntimeLocalApiBaseUrl } from '@/utils/runtime-mode'

// 主题
const settingStore = useSettingStore()
const { isDark } = storeToRefs(settingStore)

// 用户信息（用于知识库预览URL）
const userStore = useUserStore()
const currentUserId = computed(() => userStore.getUserInfo?.userId)

interface Props {
  fileName: string
  filePath: string
  fileSize: string
  mode?: 'workspace' | 'knowledge-base'
  sessionId?: string
  isPublicMode?: boolean
  visitorId?: string
  isLocal?: boolean
  roleId?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'workspace',
  isPublicMode: false,
  isLocal: false,
  roleId: null
})
const emit = defineEmits<{
  close: []
}>()

const baseUrl = inject(BaseUrlKey, '')

const loading = ref(false)
const saving = ref(false)
const error = ref('')
const content = ref('')
const originalContent = ref('')
const viewType = ref<'preview' | 'source'>('preview')
const editorRef = ref()
const iframeRef = ref<HTMLIFrameElement>()
const viewerRef = ref<HTMLElement>()
const isFullscreen = ref(false)
const showCopyMenu = ref(false)
const LOCAL_API_URL = getRuntimeLocalApiBaseUrl()
const supportsFullscreen = computed(() => {
  const el = viewerRef.value as any
  return !!(
    document.fullscreenEnabled ||
    (document as any).webkitFullscreenEnabled ||
    (el && (el.requestFullscreen || el.webkitRequestFullscreen))
  )
})

// 获取API基础URL
const getBaseUrl = () => props.isLocal ? LOCAL_API_URL : baseUrl

// API 基础路径
const apiBase = computed(() => {
  if (props.mode === 'knowledge-base') {
    return `${getBaseUrl()}/api/agent/knowledge-base`
  }
  return props.isPublicMode
    ? `${baseUrl}/api/agent/public/sessions/${props.sessionId}/workspace`
    : `${baseUrl}/api/agent/sessions/${props.sessionId}/workspace`
})

// 预览 URL（直接指向原始文件，使相对路径能正确解析）
// 统一使用非公开端点，该端点不需要JWT，只验证session存在
const previewKey = ref(0)
const previewUrl = computed(() => {
  if (props.mode === 'knowledge-base') {
    const params: string[] = []
    if (props.roleId) {
      params.push(`role_id=${props.roleId}`)
    } else if (currentUserId.value) {
      params.push(`user_id=${currentUserId.value}`)
    }
    const qs = params.length ? `?${params.join('&')}` : ''
    return `${getBaseUrl()}/api/agent/knowledge-base/files/${props.filePath}${qs}`
  }
  return `${getBaseUrl()}/api/agent/sessions/${props.sessionId}/workspace/files/${props.filePath}`
})

const syncFullscreenState = () => {
  const fullscreenElement = document.fullscreenElement || (document as any).webkitFullscreenElement
  isFullscreen.value = fullscreenElement === viewerRef.value
}

const exitFullscreen = async () => {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
      return
    }
    if ((document as any).webkitFullscreenElement && (document as any).webkitExitFullscreen) {
      ;(document as any).webkitExitFullscreen()
    }
  } finally {
    syncFullscreenState()
  }
}

const enterFullscreen = async () => {
  const el = viewerRef.value as any
  if (!el) return

  try {
    if (el.requestFullscreen) {
      await el.requestFullscreen()
      return
    }
    if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen()
      return
    }
  } finally {
    syncFullscreenState()
  }
}

const toggleFullscreen = async () => {
  if (!supportsFullscreen.value) {
    return
  }
  if (isFullscreen.value) await exitFullscreen()
  else await enterFullscreen()
}

// 检测是否有未保存的更改
const hasChanges = computed(() => content.value !== originalContent.value)

// 加载文件
const loadFile = async () => {
  if (props.mode === 'workspace' && !props.sessionId) return

  loading.value = true
  error.value = ''

  try {
    const params: Record<string, string> = { path: props.filePath }

    if (props.mode === 'knowledge-base') {
      if (props.roleId) {
        params.role_id = props.roleId
      }
    } else if (props.isPublicMode && props.visitorId) {
      params.visitor_id = props.visitorId
    }

    const response = await http.get({
      url: `${apiBase.value}/file-content`,
      params
    })

    content.value = response.content || ''
    originalContent.value = response.content || ''
  } catch (err: any) {
    console.error('Failed to load file:', err)
    error.value = err.message || '加载文件失败'
  } finally {
    loading.value = false
  }
}

// 重新加载文件
const reloadFile = async () => {
  if (hasChanges.value) {
    try {
      await ElMessageBox.confirm(
        '有未保存的更改，确定要重新加载吗？',
        '确认重新加载',
        {
          confirmButtonText: '重新加载',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
      await loadFile()
    } catch {
      // 用户取消
    }
  } else {
    await loadFile()
  }
}

// 保存文件
const saveFile = async () => {
  if (props.mode === 'workspace' && !props.sessionId) return
  // 公开模式下不允许保存
  if (props.isPublicMode) {
    ElMessage.warning('公开模式下不支持保存文件')
    return
  }

  saving.value = true
  try {
    const data: Record<string, any> = { content: content.value }
    const params: Record<string, string> = { path: props.filePath }

    if (props.mode === 'knowledge-base' && props.roleId) {
      data.role_id = props.roleId
    }

    await http.put({
      url: `${apiBase.value}/file-content`,
      params,
      data
    })

    originalContent.value = content.value
    previewKey.value++
    ElMessage.success(`文件 ${props.fileName} 保存成功`)
  } catch (err: any) {
    console.error('Failed to save file:', err)
    ElMessage.error(err.message || '保存文件失败')
  } finally {
    saving.value = false
  }
}

// 处理关闭
const handleClose = async () => {
  if (hasChanges.value) {
    try {
      await ElMessageBox.confirm(
        '有未保存的更改，确定要离开吗？',
        '确认离开',
        {
          confirmButtonText: '离开',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
      emit('close')
    } catch {
      // 用户取消
    }
  } else {
    emit('close')
  }
}

// 下载文件
const downloadFile = () => {
  const blob = new Blob([content.value], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = props.fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  ElMessage.success(`文件 ${props.fileName} 下载完成`)
}

// 切换复制菜单
const toggleCopyMenu = () => {
  showCopyMenu.value = !showCopyMenu.value
}

// 从 HTML 中提取纯文本
const extractPlainText = (html: string): string => {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body.textContent || ''
}

// 复制为纯文本
const copyAsPlainText = async () => {
  try {
    const plainText = extractPlainText(content.value)
    await navigator.clipboard.writeText(plainText)
    showCopyMenu.value = false
    ElMessage.success('已复制为纯文本')
  } catch (err) {
    console.error('Failed to copy as plain text:', err)
    ElMessage.error('复制失败')
  }
}

// 复制为 HTML 格式（微信公众号）
const copyAsHtml = async () => {
  try {
    const blob = new Blob([content.value], { type: 'text/html' })
    const clipboardItem = new ClipboardItem({
      'text/html': blob,
      'text/plain': new Blob([extractPlainText(content.value)], { type: 'text/plain' })
    })
    await navigator.clipboard.write([clipboardItem])
    showCopyMenu.value = false
    ElMessage.success('已复制为公众号格式')
  } catch (err) {
    console.error('Failed to copy as HTML:', err)
    ElMessage.error('复制失败')
  }
}

// 点击外部关闭复制菜单
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.copy-btn-wrapper')) {
    showCopyMenu.value = false
  }
}

// 内容变化时的回调
const onContentChange = () => {
  // 可用于自动保存等功能
}

// 键盘快捷键
const handleKeydown = (event: KeyboardEvent) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 's') {
    event.preventDefault()
    saveFile()
  }
}

onMounted(() => {
  loadFile()
  window.addEventListener('keydown', handleKeydown)
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('fullscreenchange', syncFullscreenState)
  document.addEventListener('webkitfullscreenchange', syncFullscreenState as any)
  syncFullscreenState()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('fullscreenchange', syncFullscreenState)
  document.removeEventListener('webkitfullscreenchange', syncFullscreenState as any)
  if (isFullscreen.value) exitFullscreen()
})
</script>

<style scoped lang="scss">
// 颜色变量 - 浅色模式
$light-bg: #ffffff;
$light-border: rgba(0, 0, 0, 0.08);
$light-text: #1f2937;
$light-text-secondary: #6b7280;

// 颜色变量 - 深色模式
$dark-bg: #18181b;
$dark-border: rgba(255, 255, 255, 0.08);
$dark-text: #f4f4f5;
$dark-text-secondary: #71717a;

.html-viewer {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: $light-bg;

  &.is-dark {
    background: $dark-bg;
  }

  &.is-fullscreen {
    width: 100vw;
    height: 100vh;
  }
}

.html-viewer:fullscreen,
.html-viewer:-webkit-full-screen {
  width: 100vw;
  height: 100vh;
}

.viewer-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid $light-border;

  .is-dark & {
    border-bottom-color: $dark-border;
  }
}

.header-left {
  display: flex;
  align-items: center;

  .el-button {
    color: $light-text-secondary;
    margin-right: 12px;

    &:hover {
      color: $light-text;
    }
  }

  .file-info {
    .file-name {
      display: block;
      font-size: 14px;
      color: $light-text;
    }

    .file-size {
      font-size: 12px;
      color: $light-text-secondary;
    }
  }

  .is-dark & {
    .el-button {
      color: $dark-text-secondary;

      &:hover {
        color: #fff;
      }
    }

    .file-info .file-name {
      color: $dark-text;
    }

    .file-info .file-size {
      color: $dark-text-secondary;
    }
  }
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;

  .el-button-group {
    margin-right: 8px;

    .el-button {
      &.active {
        color: #3b82f6;
        background: rgba(59, 130, 246, 0.1);
      }
    }
  }

  .el-button {
    color: $light-text-secondary;

    &:hover:not(:disabled) {
      color: $light-text;
    }
  }

  .is-dark & .el-button {
    color: $dark-text-secondary;

    &:hover:not(:disabled) {
      color: #fff;
    }

    &.active {
      color: #60a5fa;
      background: rgba(96, 165, 250, 0.1);
    }
  }
}

.viewer-content {
  flex: 1;
  overflow: hidden;
}

.loading-state,
.error-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: $light-text-secondary;

  > i {
    font-size: 24px;
    margin-bottom: 12px;
  }

  span {
    margin-bottom: 16px;
  }

  .is-dark & {
    color: $dark-text-secondary;
  }
}

.error-state > i {
  color: #ef4444;
}

.preview-container {
  height: 100%;
  overflow: hidden;
}

.html-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: #fff;
}

.source-container {
  height: 100%;
  overflow: hidden;
}

// 复制按钮容器
.copy-btn-wrapper {
  position: relative;
  display: inline-flex;
}

// 复制菜单
.copy-menu {
  position: absolute;
  right: 0;
  top: 100%;
  margin-top: 4px;
  background: $light-bg;
  border: 1px solid $light-border;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
  min-width: 160px;
  padding: 4px 0;

  .is-dark & {
    background: #27272a;
    border-color: $dark-border;
  }
}

.copy-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 13px;
  color: $light-text-secondary;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(59, 130, 246, 0.1);
    color: $light-text;
  }

  i {
    font-size: 14px;
  }

  .is-dark & {
    color: $dark-text-secondary;

    &:hover {
      background: rgba(59, 130, 246, 0.15);
      color: #fff;
    }
  }
}
</style>
