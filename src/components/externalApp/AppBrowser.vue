<template>
  <div class="app-browser">
    <div class="browser-toolbar">
      <div class="toolbar-left">
        <!-- <el-button
          :icon="ArrowLeft"
          circle
          size="small"
          :disabled="!canGoBack"
          @click="goBack"
        />
        <el-button
          :icon="ArrowRight"
          circle
          size="small"
          :disabled="!canGoForward"
          @click="goForward"
        /> -->
        <el-button
          :icon="Refresh"
          circle
          size="small"
          @click="refresh"
        />
      </div>

      <div class="toolbar-center">
        <div class="url-bar">
          <el-icon><Link /></el-icon>
          <span class="url-text">{{ currentUrl }}</span>
        </div>
      </div>

      <div class="toolbar-right">
        <el-tooltip content="在新窗口打开" placement="bottom">
          <el-button
            :icon="TopRight"
            circle
            size="small"
            @click="openInNewWindow"
          />
        </el-tooltip>
        <el-tooltip content="关闭" placement="bottom">
          <el-button
          size="small"
            :icon="Close"
            circle
            @click="handleClose"
          />
        </el-tooltip>
      </div>
    </div>

    <div class="browser-content">
      <div v-if="loading" class="loading-overlay">
        <el-icon class="is-loading" :size="48">
          <Loading />
        </el-icon>
        <div class="loading-text">加载中...</div>
      </div>

      <div v-if="error" class="error-overlay">
        <el-icon :size="64" class="text-orange-500 mb-3">
          <WarningFilled />
        </el-icon>
        <div class="error-title">无法加载应用</div>
        <div class="error-message">{{ error }}</div>
        <el-button
          type="primary"
          :icon="TopRight"
          @click="openInNewWindow"
        >
          在新窗口打开
        </el-button>
      </div>

      <iframe
        v-show="!loading && !error"
        ref="iframeRef"
        :src="currentUrl"
        frameborder="0"
        @load="handleLoad"
        @error="handleError"
      ></iframe>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import {
  ArrowLeft,
  ArrowRight,
  Refresh,
  Link,
  TopRight,
  Close,
  Loading,
  WarningFilled
} from '@element-plus/icons-vue'
import type { ExternalApp } from '@/api/types/externalApp'
import { open as openUrl } from '@tauri-apps/plugin-shell'

const props = defineProps<{
  app: ExternalApp
}>()

const emit = defineEmits<{
  'close': []
}>()

const iframeRef = ref<HTMLIFrameElement>()
const loading = ref(true)
const error = ref('')
const currentUrl = ref(props.app.url)
const canGoBack = ref(false)
const canGoForward = ref(false)

let loadTimeout: number | null = null

onMounted(() => {
  // 设置加载超时
  loadTimeout = window.setTimeout(() => {
    if (loading.value) {
      error.value = '加载超时，该应用可能不支持在 iframe 中打开'
      loading.value = false
    }
  }, 15000) // 15秒超时
})

onUnmounted(() => {
  if (loadTimeout) {
    clearTimeout(loadTimeout)
  }
})

function handleLoad() {
  if (loadTimeout) {
    clearTimeout(loadTimeout)
  }
  loading.value = false
  error.value = ''

  // 尝试检测 iframe 是否真的加载成功
  try {
    const iframe = iframeRef.value
    if (iframe?.contentWindow) {
      // 如果能访问 contentWindow，说明同源或允许访问
      canGoBack.value = false
      canGoForward.value = false
    }
  } catch (e) {
    // 跨域情况下无法访问，这是正常的
  }
}

function handleError() {
  if (loadTimeout) {
    clearTimeout(loadTimeout)
  }
  loading.value = false
  error.value = '该应用不支持在 iframe 中打开，请在新窗口中访问'
}

function goBack() {
  try {
    iframeRef.value?.contentWindow?.history.back()
  } catch (e) {
    console.error('无法后退:', e)
  }
}

function goForward() {
  try {
    iframeRef.value?.contentWindow?.history.forward()
  } catch (e) {
    console.error('无法前进:', e)
  }
}

function refresh() {
  loading.value = true
  error.value = ''
  if (iframeRef.value) {
    iframeRef.value.src = currentUrl.value
  }
}

async function openInNewWindow() {
  try {
    // 在 Tauri 中使用 shell 插件在外部浏览器打开
    await openUrl(currentUrl.value)
  } catch (e) {
    console.error('打开外部链接失败:', e)
    // 降级到 window.open（Web 环境）
    window.open(currentUrl.value, '_blank')
  }
}

function handleClose() {
  emit('close')
}
</script>

<style scoped>
.app-browser {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--el-bg-color);
}

.browser-toolbar {
  display: flex;
  align-items: center;
  padding: 4px 1rem;
  background-color: var(--el-bg-color-page);
  border-bottom: 1px solid var(--el-border-color);
  gap: 1rem;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  gap: 0.5rem;
}

.toolbar-center {
  flex: 1;
}

.url-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.2rem 0.5rem;
  background-color: var(--el-fill-color-light);
  border-radius: 6px;
  border: 1px solid var(--el-border-color);
}

.url-text {
  flex: 1;
  font-size: 0.9rem;
  color: var(--el-text-color-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.browser-content {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.browser-content iframe {
  width: 100%;
  height: 100%;
}

.loading-overlay,
.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: var(--el-bg-color);
  z-index: 10;
}

.loading-text {
  margin-top: 1rem;
  color: var(--el-text-color-secondary);
}

.error-title {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.error-message {
  color: var(--el-text-color-secondary);
  margin-bottom: 1.5rem;
  text-align: center;
  max-width: 400px;
}
</style>
