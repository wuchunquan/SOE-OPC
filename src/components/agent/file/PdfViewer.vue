<template>
  <div class="pdf-viewer" :class="{ 'is-dark': isDark }">
    <!-- 头部 -->
    <div class="viewer-header">
      <div class="header-left">
        <el-button text @click="$emit('close')" title="返回文件列表">
          <i class="pi pi-arrow-left"></i>
        </el-button>
        <div class="file-info">
          <span class="file-name">{{ fileName }}</span>
          <!-- <span class="file-size">{{ fileSize }}</span> -->
        </div>
      </div>
      <div class="header-actions">
        <el-button text @click="zoomOut" :disabled="scale <= 0.5" title="缩小">
          <i class="pi pi-search-minus"></i>
        </el-button>
        <span class="zoom-level">{{ Math.round(scale * 100) }}%</span>
        <el-button text @click="zoomIn" :disabled="scale >= 3" title="放大">
          <i class="pi pi-search-plus"></i>
        </el-button>
        <el-button text @click="resetZoom" title="重置">
          <i class="pi pi-refresh"></i>
        </el-button>
        <el-button text @click="downloadFile" title="下载文件">
          <i class="pi pi-download"></i>
        </el-button>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="viewer-content">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <i class="pi pi-spin pi-spinner"></i>
        <span>加载中...</span>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error" class="error-state">
        <i class="pi pi-exclamation-circle"></i>
        <span>{{ error }}</span>
        <el-button size="small" @click="loadFile">重试</el-button>
      </div>

      <!-- PDF 显示 -->
      <div v-else-if="pdfUrl" class="pdf-container" :style="{ transform: `scale(${scale})` }">
        <iframe
          ref="pdfFrame"
          :src="pdfUrl"
          class="pdf-iframe"
          type="application/pdf"
        ></iframe>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, inject } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import http from '@/utils/http'
import { useSettingStore } from '@/store/modules/setting'
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

defineEmits<{
  close: []
}>()

const baseUrl = inject(BaseUrlKey, '')
const LOCAL_API_URL = getRuntimeLocalApiBaseUrl()

const loading = ref(true)
const error = ref('')
const pdfUrl = ref('')
const pdfData = ref<string>('')  // 保存原始 base64 数据用于下载
const scale = ref(1)
const pdfFrame = ref<HTMLIFrameElement>()

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

// 加载 PDF 文件
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

    if (response.encoding === 'base64') {
      pdfData.value = response.content
      // 将 base64 转换为 Blob URL
      const binaryString = atob(response.content)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: 'application/pdf' })
      pdfUrl.value = URL.createObjectURL(blob)
    } else {
      throw new Error('Invalid PDF format')
    }
  } catch (err: any) {
    console.error('Failed to load PDF:', err)
    error.value = err.message || '加载 PDF 失败'
  } finally {
    loading.value = false
  }
}

// 缩放操作
const zoomIn = () => {
  if (scale.value < 3) {
    scale.value = Math.min(scale.value + 0.25, 3)
  }
}

const zoomOut = () => {
  if (scale.value > 0.5) {
    scale.value = Math.max(scale.value - 0.25, 0.5)
  }
}

const resetZoom = () => {
  scale.value = 1
}

// 下载文件
const downloadFile = () => {
  if (!pdfData.value) {
    ElMessage.warning('文件尚未加载完成')
    return
  }

  const binaryString = atob(pdfData.value)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  const blob = new Blob([bytes], { type: 'application/pdf' })
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

// 清理 blob URL
onMounted(() => {
  loadFile()
})

onUnmounted(() => {
  if (pdfUrl.value) {
    URL.revokeObjectURL(pdfUrl.value)
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

// 颜色变量 - 深色模式
$dark-bg: #18181b;
$dark-bg-secondary: #0f0f0f;
$dark-border: rgba(255, 255, 255, 0.08);
$dark-text: #f4f4f5;
$dark-text-secondary: #71717a;

.pdf-viewer {
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
  align-items: center;
  gap: 4px;

  .el-button {
    color: $light-text-secondary;

    &:hover:not(:disabled) {
      color: $light-text;
    }

    &:disabled {
      opacity: 0.3;
    }
  }

  .zoom-level {
    font-size: 12px;
    color: $light-text-secondary;
    min-width: 40px;
    text-align: center;
  }

  .is-dark & {
    .el-button {
      color: $dark-text-secondary;

      &:hover:not(:disabled) {
        color: #fff;
      }
    }

    .zoom-level {
      color: $dark-text-secondary;
    }
  }
}

.viewer-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $light-bg-secondary;

  .is-dark & {
    background: $dark-bg-secondary;
  }
}

.loading-state,
.error-state {
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

.pdf-container {
  width: 100%;
  height: 100%;
  transform-origin: center center;
  transition: transform 0.2s ease;
}

.pdf-iframe {
  width: 100%;
  height: 100%;
  border: none;
}
</style>
