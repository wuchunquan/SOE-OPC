<template>
  <div class="code-viewer" :class="{ 'is-dark': isDark }">
    <!-- 头部 -->
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
        <div>
        <el-button text @click="saveFile" :loading="saving" title="保存 (Ctrl+S)">
          <i class="pi pi-save"></i>
        </el-button>
      </div>
       <div>

        <el-button text @click="reloadFile" :loading="loading" title="重新加载">
          <i class="pi pi-refresh"></i>
        </el-button>
        </div>
         <div>
  
        <el-button text @click="downloadFile" title="下载文件">
          <i class="pi pi-download"></i>
        </el-button>
        </div>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="viewer-content">
      <!-- 加载状态 -->
      <div v-if="loading && !content" class="loading-state">
        <i class="pi pi-spin pi-spinner"></i>
        <span>加载中...</span>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error" class="error-state">
        <i class="pi pi-exclamation-circle"></i>
        <span>{{ error }}</span>
        <el-button size="small" @click="loadFile">重试</el-button>
      </div>

      <!-- 代码编辑器 -->
      <div v-else class="editor-container">
        <CodeEditor
          ref="editorRef"
          v-model="content"
          :language="language"
          :file-name="fileName"
          @change="onContentChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, inject } from 'vue'
import axios from 'axios'
import { storeToRefs } from 'pinia'
import { ElMessage, ElMessageBox } from 'element-plus'
import http from '@/utils/http'
import { useSettingStore } from '@/store/modules/setting'
import CodeEditor from '../common/CodeEditor.vue'
import { BaseUrlKey } from '../injection'
import { getRuntimeLocalApiBaseUrl } from '@/utils/runtime-mode'

// 主题
const settingStore = useSettingStore()
const { isDark } = storeToRefs(settingStore)

interface Props {
  fileName: string
  filePath: string
  fileSize: string
  mode?: 'workspace' | 'knowledge-base'
  sessionId?: string
  language?: string
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

const loading = ref(false)
const saving = ref(false)
const error = ref('')
const content = ref('')
const originalContent = ref('')
const editorRef = ref()

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

// 检测是否有未保存的更改
const hasChanges = computed(() => content.value !== originalContent.value)

// 从文件名推断语言
const language = computed(() => {
  if (props.language) return props.language
  const ext = props.fileName.split('.').pop()?.toLowerCase() || ''
  const langMap: Record<string, string> = {
    'py': 'python',
    'js': 'javascript',
    'ts': 'typescript',
    'jsx': 'jsx',
    'tsx': 'tsx',
    'json': 'json',
    'css': 'css',
    'scss': 'css',
    'less': 'css',
    'html': 'html',
    'htm': 'html',
    'vue': 'html',
    'md': 'markdown',
    'markdown': 'markdown',
  }
  return langMap[ext] || 'text'
})

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
  const mimeTypes: Record<string, string> = {
    'python': 'text/x-python',
    'javascript': 'application/javascript',
    'typescript': 'application/typescript',
    'json': 'application/json',
    'css': 'text/css',
    'html': 'text/html',
    'markdown': 'text/markdown',
  }
  const mimeType = mimeTypes[language.value] || 'text/plain'

  const blob = new Blob([content.value], { type: `${mimeType};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = props.fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
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
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
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

.code-viewer {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: $light-bg;

  &.is-dark {
    background: $dark-bg;
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

.editor-container {
  height: 100%;
  overflow: hidden;
}
</style>
