<template>
  <div
    ref="viewerRef"
    class="md-viewer"
    :class="{ 'is-dark': isDark, 'is-fullscreen': isFullscreen }"
  >
    <!-- 顶部导航栏 -->
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
        <el-button text @click="reloadFile" :loading="loading" title="重新加载">
          <i class="pi pi-refresh"></i>
        </el-button>
        <el-button text @click="downloadFile" title="下载文件">
          <i class="pi pi-download"></i>
        </el-button>
        <el-button
          text
          :disabled="!supportsFullscreen"
          @click="toggleFullscreen"
          :title="isFullscreen ? '退出全屏' : '全屏预览'"
        >
          <ArtSvgIcon :icon="isFullscreen ? 'ri:fullscreen-exit-line' : 'ri:fullscreen-line'" />
        </el-button>
      </div>
    </div>

    <!-- 内容显示区域 -->
    <div class="md-content">
      <!-- 加载状态 -->
      <div v-if="loading && !content" class="loading-overlay">
        <i class="pi pi-spin pi-spinner"></i>
        <span>加载文件中...</span>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error" class="error-overlay">
        <i class="pi pi-exclamation-triangle"></i>
        <span>{{ error }}</span>
        <el-button size="small" @click="loadFile">重试</el-button>
      </div>

      <!-- Markdown 编辑器 -->
      <div v-else class="md-editor-container">
        <MdEditor
          ref="editorRef"
          v-model="currentContent"
          :theme="isDark ? 'dark' : 'light'"
          :toolbars="toolbars"
          class="md-viewer-editor"
          @vue:mounted="initEditor"
          @save="handleSave"
          @change="onContentChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, inject } from 'vue'
import { storeToRefs } from 'pinia'
import { MdEditor } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import { ElMessage, ElMessageBox } from 'element-plus'
import http from '@/utils/http'
import { useSettingStore } from '@/store/modules/setting'
import { BaseUrlKey } from '../injection'
import { getRuntimeLocalApiBaseUrl } from '@/utils/runtime-mode'

// 主题
const settingStore = useSettingStore()
const { isDark } = storeToRefs(settingStore)

const toolbars = ['save', 'preview', 'previewOnly', 'catalog']

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
const LOCAL_API_URL = getRuntimeLocalApiBaseUrl()

// 响应式数据
const content = ref('')
const currentContent = ref('')
const loading = ref(false)
const error = ref('')
const editorRef = ref<InstanceType<typeof MdEditor> | null>(null)
const viewerRef = ref<HTMLElement>()
const isFullscreen = ref(false)
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
    ElMessage.warning('当前浏览器不支持全屏')
  } finally {
    syncFullscreenState()
  }
}

const toggleFullscreen = async () => {
  if (!supportsFullscreen.value) {
    ElMessage.warning('当前浏览器不支持全屏')
    return
  }
  if (isFullscreen.value) await exitFullscreen()
  else await enterFullscreen()
}

// 计算属性
const hasChanges = computed(() => {
  return currentContent.value !== content.value
})

// 初始化编辑器（设置为预览模式）
const initEditor = () => {
  if (editorRef.value) {
    editorRef.value.togglePreview(false)
    editorRef.value.togglePreviewOnly(true)
  }
}

// 加载文件内容
const loadFile = async () => {
  if (props.mode === 'workspace' && (!props.sessionId || !props.filePath)) return
  if (props.mode === 'knowledge-base' && !props.filePath) return

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
    currentContent.value = response.content || ''
  } catch (err: any) {
    console.error('Failed to load markdown file:', err)
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

// 处理 MdEditor 的保存事件
const handleSave = async (value: string, _html: string) => {
  if (props.mode === 'workspace' && (!props.sessionId || !props.filePath)) return
  if (props.mode === 'knowledge-base' && !props.filePath) return
  // 公开模式下不允许保存
  if (props.isPublicMode) {
    ElMessage.warning('公开模式下不支持保存文件')
    return
  }

  try {
    const data: Record<string, any> = { content: value }
    const params: Record<string, string> = { path: props.filePath }

    if (props.mode === 'knowledge-base' && props.roleId) {
      data.role_id = props.roleId
    }

    await http.put({
      url: `${apiBase.value}/file-content`,
      params,
      data
    })

    content.value = value
    ElMessage.success(`文件 ${props.fileName} 保存成功`)
  } catch (err: any) {
    console.error('Failed to save file:', err)
    ElMessage.error(err.message || '保存文件失败')
  }
}

// 内容变化监听
const onContentChange = () => {
  // md-editor-v3 会自动更新 v-model
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
  const blob = new Blob([currentContent.value], { type: 'text/markdown;charset=utf-8' })
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

// 监听文件路径变化
watch(() => props.filePath, () => {
  if (props.filePath) {
    loadFile()
  }
})

// 监听 MdViewer 刷新事件
const handleRefresh = (event: CustomEvent) => {
  const { filePath } = event.detail
  if (filePath === props.filePath) {
    console.log('收到刷新指令，重新加载文件:', filePath)
    setTimeout(() => {
      loadFile()
    }, 3000)
  }
}

// 组件挂载时加载文件
onMounted(() => {
  if (props.filePath) {
    loadFile()
  }
  window.addEventListener('md-viewer-refresh', handleRefresh as EventListener)
  document.addEventListener('fullscreenchange', syncFullscreenState)
  document.addEventListener('webkitfullscreenchange', syncFullscreenState as any)
  syncFullscreenState()
})

// 组件卸载时移除事件监听
onUnmounted(() => {
  window.removeEventListener('md-viewer-refresh', handleRefresh as EventListener)
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

.md-viewer {
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
  gap: 4px;
  .el-button+.el-button{
    margin-left: 2px!important;
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
  }
}

.md-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.loading-overlay,
.error-overlay {
  flex: 1;
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

.error-overlay > i {
  color: #ef4444;
}

.md-editor-container {
  flex: 1;
  overflow: hidden;
}

.md-viewer-editor {
  height: 100%;
}

/* 自定义 md-editor-v3 样式以适配暗色主题 */
.md-editor{
  border:none!important;
}
.is-dark {
  :deep(.md-editor-dark) {
    --md-bk-color: #18181b;
    --md-border-color: #3f3f46;
    --md-text-color: #f4f4f5;
  }

  :deep(.md-editor-preview-wrapper) {
    background: #18181b;
  }

  :deep(.md-editor-preview) {
    color: #f4f4f5;
    background: #18181b;
    padding: 1rem;
  }

  /* Markdown 内容样式 - 深色 */
  :deep(.md-editor-preview h1),
  :deep(.md-editor-preview h2),
  :deep(.md-editor-preview h3),
  :deep(.md-editor-preview h4),
  :deep(.md-editor-preview h5),
  :deep(.md-editor-preview h6) {
    color: #f4f4f5;
    border-color: #3f3f46;
  }

  :deep(.md-editor-preview p) {
    color: #d4d4d8;
  }

  :deep(.md-editor-preview code) {
    background: #27272a;
    color: #e4e4e7;
    padding: 2px 4px;
    border-radius: 4px;
  }

  :deep(.md-editor-preview pre) {
    background: #27272a;
    border: 1px solid #3f3f46;
  }

  :deep(.md-editor-preview blockquote) {
    border-left-color: #71717a;
    background: #27272a;
    color: #d4d4d8;
  }

  :deep(.md-editor-preview table) {
    border-color: #3f3f46;
  }

  :deep(.md-editor-preview th),
  :deep(.md-editor-preview td) {
    border-color: #3f3f46;
    color: #d4d4d8;
  }

  :deep(.md-editor-preview th) {
    background: #27272a;
    color: #e4e4e7;
  }

  :deep(.md-editor-preview a) {
    color: #60a5fa;
  }

  :deep(.md-editor-preview a:hover) {
    color: #93c5fd;
  }
}
</style>
