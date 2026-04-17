<template>
  <div class="agent-message" :class="messageClasses">
    <!-- 消息头部 -->
    <div class="message-header">
      <div class="header-left">
        <!-- 角色头像 -->
        <div class="role-avatar" :style="avatarStyle">
          <!-- 用户头像 -->
          <template v-if="message.role === 'user'">
            <!-- 内部聊天消息：使用 sender_id 对应的用户头像 -->
            <template v-if="message.sender_id && message.sender_name">
              <img
                v-if="message.sender_avatar"
                :src="message.sender_avatar"
                :alt="message.sender_name"
                class="avatar-image"
              />
              <div v-else class="avatar-placeholder">
                {{ message.sender_name[0] }}
              </div>
            </template>
            <!-- 公开模式或当前用户的消息 -->
            <template v-else>
              <div class="avatar-placeholder">
                访
              </div>
            </template>
          </template>
          <!-- AI助手头像 -->
          <template v-else>
            <img
              v-if="currentSessionInfo?.role_avatar_url"
              :src="currentSessionInfo.role_avatar_url"
              :alt="currentSessionInfo.role_name || 'AI助手'"
              class="avatar-image"
            />
            <img v-else src="/logo.png" alt="AI助手" class="avatar-image" />
          </template>
        </div>
        <!-- 角色名称 -->
        <span class="role-name">{{ roleName }}</span>
        <!-- 状态指示器 -->
        <span v-if="message.status === 'streaming'" class="streaming-indicator" title="AI 正在回复...">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </span>
      </div>
      <!-- 时间戳和操作按钮 -->
      <div class="header-right">
        <!-- 撤回按钮：内部聊天时，自己的消息且10分钟内 -->
        <button
          v-if="canRecallMessage"
          class="recall-btn"
          @click="handleRecall"
          title="撤回消息"
        >
          <i class="pi pi-replay"></i>
        </button>
        <!-- 删除按钮：内部聊天时只有自己的消息才显示 -->
        <button
          v-if="canDeleteMessage"
          class="delete-btn"
          @click="handleDelete"
          title="删除消息"
        >
          <i class="pi pi-trash"></i>
        </button>
        <span class="timestamp">{{ formatTime(message.timestamp) }}</span>
      </div>
    </div>

    <!-- 消息内容 -->
    <div class="message-content">
      <div v-for="(block, index) in message.content" :key="index" class="content-block">
        <!-- 文本内容 -->
        <div v-if="block.type === 'text'" class="text-block">
          <!-- 解析文件引用 -->
          <div v-if="hasFileReferences(block.text || '')" class="text-with-files">
            <div v-for="(part, partIndex) in parseTextWithFiles(block.text || '')" :key="partIndex">
              <!-- 文件引用 -->
              <div v-if="part.type === 'file'" class="file-reference">
                <!-- 图片文件 -->
                <img
                  v-if="isImageFile(part.path)"
                  :src="getFileUrl(part.path)"
                  :alt="part.path"
                  class="file-reference-image"
                  loading="lazy"
                />
                <!-- 其他文件 -->
                <div v-else class="file-reference-item" @click="downloadFile(part.path)">
                  <div class="file-info">
                    <ArtSvgIcon :icon="getFileIconByPath(part.path)" style="width: 40px;height: 40px;" class="file-ref-icon" />
                    <span class="file-ref-name">{{ getFileName(part.path) }}</span>
                  </div>
                  <button
                    v-if="isHtmlFile(part.path)"
                    class="file-btn"
                    title="预览"
                    @click.stop="openHtmlPreview(part.path)"
                  >
                    <i class="pi pi-eye"></i>
                  </button>
                  <button
                    v-if="isHtmlFile(part.path)"
                    class="file-btn"
                    title="分享"
                    @click.stop="shareFile(part.path)"
                  >
                    <i class="pi pi-share-alt"></i>
                  </button>
                  <button
                    v-if="isPdfFile(part.path)"
                    class="file-btn"
                    title="预览"
                    @click.stop="openPdfPreview(part.path)"
                  >
                    <i class="pi pi-eye"></i>
                  </button>
                  <button class="file-btn" @click.stop="downloadFile(part.path)">
                    <i class="pi pi-download"></i>
                  </button>
                </div>
              </div>
              <!-- 普通文本 -->
              <div
                v-else-if="part.type === 'text' && part.text.trim()"
                class="text-content"
                :ref="el => setTextContentRef(el, `${index}-${partIndex}`, part.text)"
              ></div>
            </div>
          </div>
          <!-- 无文件引用的普通文本 -->
          <div
            v-else
            class="text-content"
            :ref="el => setTextContentRef(el, index, block.text || '')"
          ></div>
        </div>

        <!-- 工具使用 -->
        <div v-else-if="block.type === 'tool_use'" class="tool-use-block">
          <ToolCallDisplay
            :tool-name="block.tool_name"
            :tool-input="block.tool_input"
          />
        </div>

        <!-- 工具结果 -->
        <div v-else-if="block.type === 'tool_result'" class="tool-result-block">
          <ToolResultDisplay :content="block.tool_result || block.content" />
        </div>

        <!-- 思考过程 -->
        <div v-else-if="block.type === 'thinking'" class="thinking-block">
          <div class="thinking-card">
            <div class="thinking-header" @click="toggleThinking(index)">
              <div class="thinking-header-left">
                <i class="pi pi-sparkles thinking-icon"></i>
                <span class="thinking-title">思考过程</span>
                <span class="thinking-length">({{ block.thinking?.length || 0 }} 字符)</span>
              </div>
              <i
                class="pi thinking-chevron"
                :class="expandedThinking.has(index) ? 'pi-chevron-up' : 'pi-chevron-down'"
              ></i>
            </div>
            <div v-show="expandedThinking.has(index)" class="thinking-content">
              <div class="thinking-text" v-html="formatText(block.thinking || '')"></div>
            </div>
          </div>
        </div>

        <!-- 错误信息 -->
        <div v-else-if="block.type === 'error'" class="error-block">
          <div class="error-card">
            <div class="error-header">
              <ArtSvgIcon icon="ri:error-warning-line" :size="14" class="error-icon" />
              <span class="error-title">错误</span>
            </div>
            <div class="error-content">
              {{ block.text }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <HtmlPreviewDialog
      v-model="htmlPreviewVisible"
      :url="htmlPreviewUrl"
      :file-name="htmlPreviewFileName"
      title="HTML 预览"
    />

    <PdfPreviewDialog
      v-model="pdfPreviewVisible"
      :url="pdfPreviewUrl"
      :file-name="pdfPreviewFileName"
      title="PDF 预览"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import { ElMessage } from 'element-plus'
import ToolCallDisplay from '../agent/common/ToolCallDisplay.vue'
import ToolResultDisplay from '../agent/common/ToolResultDisplay.vue'
import HtmlPreviewDialog from '../agent/common/HtmlPreviewDialog.vue'
import PdfPreviewDialog from '../agent/common/PdfPreviewDialog.vue'
import type { AgentMessage } from './types'
import { useSettingStore } from '@/store/modules/setting'
import { isTauriEnv } from '@/utils/env'
import { copyToClipboard } from '@/utils/clipboard'
import http from '@/utils/http'

interface Props {
  message: AgentMessage
  sessionInfo?: any // 当前会话信息（用于显示 AI 头像和名称）
  sessionId?: string // 当前会话 ID
  visitorId?: string // 访客 ID（公开模式需要）
  isPublicMode?: boolean // 是否为公开模式
}

const props = withDefaults(defineProps<Props>(), {
  isPublicMode: true
})

const emit = defineEmits<{
  'preview-image': [{ src: string; allImages: string[] }]
  'delete-message': []
  'recall-message': []
}>()

// 获取主题设置
const settingStore = useSettingStore()

const htmlPreviewVisible = ref(false)
const htmlPreviewUrl = ref('')
const htmlPreviewFileName = ref('')

const pdfPreviewVisible = ref(false)
const pdfPreviewUrl = ref('')
const pdfPreviewFileName = ref('')

// Markdown 配置
const md = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
  typographer: true
})

// 自定义图片渲染器（流式时不渲染图片，避免闪烁）
md.renderer.rules.image = (tokens, idx, options, env) => {
  const token = tokens[idx]
  const srcIndex = token.attrIndex('src')
  const src = srcIndex >= 0 ? token.attrs![srcIndex][1] : ''
  const alt = token.content || ''
  const title = token.attrGet('title') || ''

  // 如果是流式状态，显示占位符，不渲染图片
  if (env?.isStreaming) {
    return `<div class="image-placeholder">
              <i class="pi pi-image" style="font-size: 24px; color: #9ca3af;"></i>
              <span style="margin-left: 8px; color: #6b7280;">图片加载中...</span>
            </div>`
  }

  // 完成状态，正常渲染图片（添加点击事件）
  return `<img src="${md.utils.escapeHtml(src)}"
               alt="${md.utils.escapeHtml(alt)}"
               ${title ? `title="${md.utils.escapeHtml(title)}"` : ''}
               loading="eager"
               class="md-image"
               onclick="handleImageClick(this)"
               style="cursor: pointer;" />`
}

// 自定义fence渲染器（代码块）
md.renderer.rules.fence = (tokens, idx) => {
  const token = tokens[idx]
  const lang = token.info.trim() || 'text'
  const code = token.content.trim()

  let highlighted = ''
  if (lang && hljs.getLanguage(lang)) {
    try {
      highlighted = hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
    } catch (__) {
      highlighted = md.utils.escapeHtml(code)
    }
  } else {
    highlighted = md.utils.escapeHtml(code)
  }

  return `<div class="code-block-wrapper">
    <div class="code-header">
      <span class="code-language">${lang}</span>
      <button class="code-copy-btn" onclick="copyCodeToClipboard(this)" data-code="${encodeURIComponent(code)}">
        <svg class="code-copy-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        <span>复制</span>
      </button>
    </div>
    <pre class="hljs"><code>${highlighted}</code></pre>
  </div>`
}

// 全局复制函数
declare global {
  interface Window {
    copyCodeToClipboard: (button: HTMLElement) => void
  }
}

if (typeof window !== 'undefined') {
  window.copyCodeToClipboard = async (button: HTMLElement) => {
    const code = decodeURIComponent(button.dataset.code || '')
    try {
      await navigator.clipboard.writeText(code)
      const span = button.querySelector('span')
      const originalText = span?.textContent
      if (span) {
        span.textContent = '已复制'
        setTimeout(() => {
          if (span) span.textContent = originalText
        }, 2000)
      }
    } catch (error) {
      console.error('复制失败:', error)
    }
  }
}

// 展开状态
const expandedThinking = ref<Set<number>>(new Set())

const toggleThinking = (index: number) => {
  if (expandedThinking.value.has(index)) {
    expandedThinking.value.delete(index)
  } else {
    expandedThinking.value.add(index)
  }
  expandedThinking.value = new Set(expandedThinking.value)
}

const messageClasses = computed(() => ({
  'user-message': props.message.role === 'user',
  'assistant-message': props.message.role === 'assistant',
  'streaming': props.message.status === 'streaming',
  'error': props.message.status === 'error'
}))

const avatarStyle = computed(() => {
  if (props.message.role === 'user') {
    return {
      backgroundColor: 'var(--el-color-primary-light-9)',
      border: '1px solid var(--el-color-primary-light-7)',
      color: 'var(--el-color-primary)'
    }
  } else {
    return {
      // backgroundColor: 'var(--el-color-success-light-9)',
      // border: '1px solid var(--el-color-success-light-7)',
      // color: 'var(--el-color-success)'
    }
  }
})

// 当前会话信息（优先使用 prop，否则从 store 获取）
const currentSessionInfo = computed(() => {
  return props.sessionInfo
})

const roleName = computed(() => {
  if (props.message.role === 'user') {
    // 内部聊天消息：使用 sender_name
    if (props.message.sender_name) {
      return props.message.sender_name
    }
    // 公开模式：显示"访客"
    return '访客'
  } else {
    return currentSessionInfo.value?.role_name || 'AI 助手'
  }
})

// 判断是否可以删除消息（公开模式下禁用）
const canDeleteMessage = computed(() => {
  if (props.isPublicMode) {
    return false
  }
  // 获取会话类型
  const sessionType = currentSessionInfo.value?.type

  // AI 会话：所有消息都可以删除
  if (sessionType === 'ai' || !sessionType) {
    return true
  }

  // 内部聊天会话：只有自己发送的消息才能删除
  // 公开模式下不支持此功能
  if (sessionType === 'chat') {
    // 如果消息没有 sender_id，说明是当前用户发送的
    if (!props.message.sender_id) {
      return true
    }
    // 公开模式下无法判断用户身份，禁用删除
    return false
  }

  return true
})

// 判断是否可以撤回消息（公开模式下禁用）
const canRecallMessage = computed(() => {
  // 公开模式下禁用撤回功能
  if (props.isPublicMode) {
    return false
  }

  // 只有内部聊天会话才能撤回
  const sessionType = currentSessionInfo.value?.type
  if (sessionType !== 'chat') {
    return false
  }

  // 只能撤回自己发送的消息（公开模式下无法判断）
  const isOwnMessage = !props.message.sender_id
  if (!isOwnMessage) {
    return false
  }

  // 检查时间限制（10分钟内）
  const messageTime = new Date(props.message.timestamp)
  const now = new Date()
  const diffMinutes = (now.getTime() - messageTime.getTime()) / (1000 * 60)

  return diffMinutes <= 10
})

const formatTime = (date: string | Date) => {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diff = now.getTime() - d.getTime()

  if (diff < 86400000) {
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } else {
    return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
  }
}

const formatText = (text: string, isStreaming: boolean = false) => {
  // 传递流式状态给 Markdown 渲染器
  const env = { isStreaming }
  return md.render(text, env)
}

// 检测文本中是否有文件引用
const hasFileReferences = (text: string): boolean => {
  return /@[^@\n]+?\.(png|jpg|jpeg|gif|webp|svg|pdf|txt|json|md|zip|rar|7z|xlsx|xls|docx|doc|pptx|ppt|csv|html)/i.test(text)
}

// 解析文本和文件引用
const parseTextWithFiles = (text: string): Array<{ type: 'text' | 'file'; text?: string; path?: string }> => {
  const parts: Array<{ type: 'text' | 'file'; text?: string; path?: string }> = []

  // 匹配 @文件路径 模式（支持空格和中文等 Unicode 字符）
  // [^@\n]+? 匹配除 @ 和换行符外的任意字符（非贪婪），直到遇到文件扩展名
  // 注意：长扩展名必须在短扩展名前面（xlsx在xls前，docx在doc前），避免部分匹配
  const filePattern = /@([^@\n]+?\.(png|jpg|jpeg|gif|webp|svg|pdf|txt|json|md|zip|rar|7z|xlsx|xls|docx|doc|pptx|ppt|csv|html))/gi

  let lastIndex = 0
  let match

  while ((match = filePattern.exec(text)) !== null) {
    // 添加文件之前的文本
    if (match.index > lastIndex) {
      const beforeText = text.substring(lastIndex, match.index)
      if (beforeText.trim()) {
        parts.push({ type: 'text', text: beforeText })
      }
    }

    // 添加文件引用
    parts.push({ type: 'file', path: match[1] })

    lastIndex = filePattern.lastIndex
  }

  // 添加剩余文本
  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex)
    if (remainingText.trim()) {
      parts.push({ type: 'text', text: remainingText })
    }
  }

  return parts
}

// 判断是否为图片文件
const isImageFile = (path: string): boolean => {
  return /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(path)
}

const isHtmlFile = (path: string): boolean => {
  return /\.(html|htm)$/i.test(path)
}

const isPdfFile = (path: string): boolean => {
  return /\.pdf$/i.test(path)
}

const openHtmlPreview = (filePath: string) => {
  const sessionId = props.sessionId
  htmlPreviewUrl.value = `/api/agent/sessions/${sessionId}/workspace/files/${filePath}`
  htmlPreviewFileName.value = getFileName(filePath)
  htmlPreviewVisible.value = true
}

const openPdfPreview = (filePath: string) => {
  const sessionId = props.sessionId
  const visitorId = props.visitorId
  pdfPreviewUrl.value = `/api/agent/public/sessions/${sessionId}/workspace/files/${filePath}?visitor_id=${visitorId}`
  pdfPreviewFileName.value = getFileName(filePath)
  pdfPreviewVisible.value = true
}

// 获取文件URL（使用公开 API）
const getFileUrl = (path: string): string => {
  const sessionId = props.sessionId
  const visitorId = props.visitorId
  // 构建公开文件访问URL
  return `/api/agent/public/sessions/${sessionId}/workspace/files/${path}?visitor_id=${visitorId}`
}

// 获取文件名
const getFileName = (path: string): string => {
  return path.split('/').pop() || path
}

// 根据文件路径获取图标
const getFileIconByPath = (path: string): string => {
  const lowerPath = path.toLowerCase()

  // Excel 相关文件（统一使用 Excel 图标）
  if (/\.(xls|xlsx|csv)$/.test(lowerPath)) return 'vscode-icons:file-type-excel'

  // 文档类
  if (/\.(pdf)$/.test(lowerPath)) return 'vscode-icons:file-type-pdf2'
  if (/\.(doc|docx)$/.test(lowerPath)) return 'vscode-icons:file-type-word'
  if (/\.(ppt|pptx)$/.test(lowerPath)) return 'vscode-icons:file-type-powerpoint'
  if (/\.(txt)$/.test(lowerPath)) return 'vscode-icons:file-type-text'
  if (/\.(md)$/.test(lowerPath)) return 'vscode-icons:file-type-markdown'

  // 数据格式
  if (/\.(json)$/.test(lowerPath)) return 'vscode-icons:file-type-json'
  if (/\.(xml)$/.test(lowerPath)) return 'vscode-icons:file-type-xml'

  // 代码文件
  if (/\.(js)$/.test(lowerPath)) return 'vscode-icons:file-type-js-official'
  if (/\.(ts)$/.test(lowerPath)) return 'vscode-icons:file-type-typescript-official'
  if (/\.(py)$/.test(lowerPath)) return 'vscode-icons:file-type-python'
  if (/\.(java)$/.test(lowerPath)) return 'vscode-icons:file-type-java'
  if (/\.(cpp|cc|cxx)$/.test(lowerPath)) return 'vscode-icons:file-type-cpp3'
  if (/\.(c)$/.test(lowerPath)) return 'vscode-icons:file-type-c3'
  if (/\.(h|hpp)$/.test(lowerPath)) return 'vscode-icons:file-type-h'
  if (/\.(vue)$/.test(lowerPath)) return 'vscode-icons:file-type-vue'
  if (/\.(html)$/.test(lowerPath)) return 'vscode-icons:file-type-html'
  if (/\.(css)$/.test(lowerPath)) return 'vscode-icons:file-type-css'

  // 压缩包
  if (/\.(zip|rar|7z|tar|gz)$/.test(lowerPath)) return 'vscode-icons:file-type-zip'

  // 通用文件图标（默认）
  return 'mdi:file-document-outline'
}

// 下载文件（使用公开 API）
const downloadFile = async (filePath: string) => {
  try {
    const sessionId = props.sessionId
    const visitorId = props.visitorId
    if (!sessionId) {
      ElMessage.error('没有当前会话')
      return
    }
    if (!visitorId) {
      ElMessage.error('没有访客ID')
      return
    }

    const fileName = getFileName(filePath)
    // 使用公开 API 端点
    const downloadUrl = `/api/agent/public/sessions/${sessionId}/workspace/download?path=${encodeURIComponent(filePath)}&visitor_id=${visitorId}`

    // Tauri 环境：使用原生保存对话框
    if (isTauriEnv()) {
      const { save } = await import('@tauri-apps/plugin-dialog')
      const { writeFile, BaseDirectory } = await import('@tauri-apps/plugin-fs')

      // 弹出保存对话框
      const savePath = await save({
        defaultPath: fileName,
        filters: [{
          name: '所有文件',
          extensions: ['*']
        }]
      })

      if (!savePath) {
        // 用户取消了保存
        return
      }

      // 下载文件内容（公开模式不需要认证）
      const response = await fetch(downloadUrl)

      if (!response.ok) {
        throw new Error('下载失败')
      }

      const blob = await response.blob()
      const arrayBuffer = await blob.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)

      // 保存到用户选择的路径
      await writeFile(savePath, uint8Array)

      ElMessage.success(`文件已保存到: ${savePath}`)
    } else {
      // Web 环境：使用传统下载方式
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = fileName
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  } catch (error: any) {
    ElMessage.error('下载文件失败: ' + error.message)
  }
}


// 分享文件
const shareFile = async (filePath: string) => {
  try {
    const sessionId = props.sessionId
    if (!sessionId) {
      ElMessage.error('没有当前会话')
      return
    }

    // HTML 文件直接复制预览链接
    if (isHtmlFile(filePath)) {
      const origin = window.location.origin
      const fullUrl = `${origin}/api/agent/sessions/${sessionId}/workspace/files/${filePath}`
      const success = await copyToClipboard(fullUrl)
      if (success) {
        ElMessage.success('预览链接已复制到剪贴板')
      } else {
        ElMessage.error('复制到剪贴板失败')
      }
      return
    }

    const response = await http.post({
      url: '/api/agent/file/share',
      data: {
        session_id: sessionId,
        file_path: filePath
      }
    })

    const baseUrl = window.location.origin
    const fullUrl = `${baseUrl}${response.share_url}`

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

// 删除消息
const handleDelete = () => {
  emit('delete-message')
}

// 撤回消息
const handleRecall = () => {
  emit('recall-message')
}


// 使用 ref 手动更新 DOM，避免 v-html 的完全替换
const setTextContentRef = (el: Element | null, index: number, text: string) => {
  if (el && text) {
    const isStreaming = props.message.status === 'streaming'
    const html = formatText(text, isStreaming)
    // 只在内容变化时更新 DOM
    if (el.innerHTML !== html) {
      el.innerHTML = html
      // 添加图片点击事件
      addImageClickListeners(el)
    }
  }
}

// 添加图片点击事件监听
const addImageClickListeners = (container: Element) => {
  const images = container.querySelectorAll('.md-image')
  images.forEach((img) => {
    img.addEventListener('click', handleImageClick)
  })
}

// 处理图片点击
const handleImageClick = (e: Event) => {
  const img = e.target as HTMLImageElement
  const src = img.src

  // 获取同一消息内的所有图片
  const container = img.closest('.text-content')
  const allImages = container?.querySelectorAll('.md-image') || []
  const allImageSrcs = Array.from(allImages).map((img) => (img as HTMLImageElement).src)

  emit('preview-image', { src, allImages: allImageSrcs })
}

// 清理事件监听
onBeforeUnmount(() => {
  const containers = document.querySelectorAll('.text-content')
  containers.forEach((container) => {
    const images = container.querySelectorAll('.md-image')
    images.forEach((img) => {
      img.removeEventListener('click', handleImageClick)
    })
  })
})

</script>

<style scoped lang="scss">
.agent-message {
  margin-bottom: 28px;

  &:last-child {
    margin-bottom: 0;
  }

  &:hover {
    .delete-btn,
    .recall-btn {
      opacity: 1;
      visibility: visible;
    }
  }
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;

  .header-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .role-avatar {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    background: #f0f8ffe8;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    overflow: hidden;

    .avatar-image {
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
      font-size: 14px;
      font-weight: 600;
      color: #3b82f6;
      text-transform: uppercase;
      background: rgba(59, 130, 246, 0.1);
    }
  }

  .role-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--el-text-color-regular);
  }

  .streaming-indicator {
    display: inline-flex;
    gap: 3px;
    margin-left: 2px;
    align-items: center;

    .dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background-color: var(--el-color-primary);
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

  .header-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .timestamp {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    font-weight: 500;
  }

  .delete-btn,
  .recall-btn {
    opacity: 0;
    visibility: hidden;
    transition: all 0.2s;
    background: none;
    border: none;
    padding: 4px 6px;
    cursor: pointer;
    color: var(--el-text-color-secondary);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
      background: var(--el-fill-color-light);
    }

    i {
      font-size: 14px;
    }
  }

  .delete-btn:hover {
    color: var(--el-color-danger);
  }

  .recall-btn:hover {
    color: var(--el-color-warning);
  }
}

.message-content {
  padding-left: 42px;
}

@media (max-width: 768px) {
  .message-content {
    padding-left: 12px;
  }
}

.content-block {
  margin-bottom: 14px;

  &:last-child {
    margin-bottom: 0;
  }
}

// 文本块样式
.text-block {
  // 文件引用容器
  .text-with-files {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  // 文件引用
  .file-reference {
    margin: 8px 0;
  }

  // 图片文件引用
  .file-reference-image {
    max-width: 100%;
    max-height: 400px;
    border-radius: 8px;
    display: block;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  // 其他文件引用
  .file-reference-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 14px;
    color: var(--el-text-color-primary);
    max-width: 400px;
    transition: all 0.2s;
    cursor: pointer;

    .file-info {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
      min-width: 0;
    }

    .file-ref-icon {
      flex-shrink: 0;
    }

    .file-ref-name {
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .file-btn {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border: none;
      background: transparent;
      color: var(--el-text-color-secondary);
      cursor: pointer;
      transition: color 0.2s;

      i {
        font-size: 16px;
      }

      &:hover {
        color: var(--el-text-color-primary);
      }
    }
  }

  .text-content {
    font-size: 15px;
    line-height: 1.75;
    color: var(--el-text-color-primary);

    // 图片样式
    :deep(.md-image) {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin: 12px 0;
      display: block;
      cursor: pointer;
    }

    // 图片占位符样式（流式时显示）
    :deep(.image-placeholder) {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      margin: 12px 0;
      border: 2px dashed #d1d5db;
      border-radius: 8px;
      background: #f9fafb;
    }

    // 段落样式
    :deep(p) {
      margin-bottom: 12px;
      line-height: 1.75;

      &:last-child {
        margin-bottom: 0;
      }

      &:has(.code-block-wrapper) {
        margin-bottom: 0;
      }
    }

    // 列表样式
    :deep(ul),
    :deep(ol) {
      margin-bottom: 12px;
      padding-left: 28px;
    }

    :deep(ul) {
      list-style-type: disc;
    }

    :deep(ol) {
      list-style-type: decimal;
    }

    :deep(li) {
      margin-bottom: 6px;
      line-height: 1.65;
    }

    :deep(pre) {
      margin: 14px 0;
    }

    // 代码块内的code标签不应用行内代码样式
    :deep(pre code) {
      padding: 0;
      background: transparent !important;
      color: inherit;
    }
  }
}

// 浅色模式下的文件卡片
html:not(.dark) .text-block .file-reference-item {
  background: #f7f7f7;
  border: 1px solid #d1d3d6;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

// 深色模式下的文件卡片
html.dark .text-block .file-reference-item {
  background: #2a2a2e;
  border: 1px solid #3a3a3e;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

// 暗色模式样式
html.dark .text-block .text-content {
  // 标题样式
  :deep(h1) {
    font-size: 22px;
    font-weight: 700;
    margin-bottom: 18px;
    margin-top: 28px;
    color: #fafafa;
    border-bottom: 2px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 10px;
    letter-spacing: 0.3px;

    &:first-child {
      margin-top: 0;
    }
  }

  :deep(h2) {
    font-size: 19px;
    font-weight: 700;
    margin-bottom: 14px;
    margin-top: 24px;
    color: #f5f5f5;
    letter-spacing: 0.2px;

    &:first-child {
      margin-top: 0;
    }
  }

  :deep(h3) {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 12px;
    margin-top: 20px;
    color: #e5e5e5;

    &:first-child {
      margin-top: 0;
    }
  }

  :deep(h4),
  :deep(h5),
  :deep(h6) {
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 10px;
    margin-top: 16px;
    color: #d4d4d4;

    &:first-child {
      margin-top: 0;
    }
  }

  // 引用块样式
  :deep(blockquote) {
    margin: 16px 0;
    padding: 14px 20px;
    border-left: 3px solid rgba(96, 165, 250, 0.5);
    background: rgba(59, 130, 246, 0.08);
    border-radius: 0 6px 6px 0;
    color: #d4d4d8;
    line-height: 1.7;

    p {
      margin: 0;
    }
  }

  // 链接样式
  :deep(a) {
    color: #60a5fa;
    text-decoration: none;
    font-weight: 500;
    transition: color 0.2s;

    &:hover {
      color: #93c5fd;
      text-decoration: underline;
    }
  }

  // 表格样式
  :deep(table) {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid rgba(255, 255, 255, 0.1);
    margin: 16px 0;
    border-radius: 6px;
    overflow: hidden;
  }

  :deep(th),
  :deep(td) {
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 12px 16px;
    text-align: left;
  }

  :deep(th) {
    background: rgba(255, 255, 255, 0.05);
    font-weight: 600;
    color: #fafafa;
    font-size: 13px;
  }

  :deep(td) {
    background: rgba(255, 255, 255, 0.02);
  }

  // 分隔线样式
  :deep(hr) {
    border: 0;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    margin: 20px 0;
  }

  // 强调文本
  :deep(strong) {
    font-weight: 600;
    color: #fafafa;
  }

  :deep(em) {
    font-style: italic;
    color: #d4d4d8;
  }

  // 图片占位符 - 暗色模式
  :deep(.image-placeholder) {
    border-color: rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.05);

    i {
      color: #71717a;
    }

    span {
      color: #a1a1aa;
    }
  }
}

// 浅色模式样式
html:not(.dark) .text-block .text-content {
  // 标题样式
  :deep(h1) {
    font-size: 22px;
    font-weight: 700;
    margin-bottom: 18px;
    margin-top: 28px;
    color: #1f2937;
    border-bottom: 2px solid #e5e7eb;
    padding-bottom: 10px;
    letter-spacing: 0.3px;

    &:first-child {
      margin-top: 0;
    }
  }

  :deep(h2) {
    font-size: 19px;
    font-weight: 700;
    margin-bottom: 14px;
    margin-top: 24px;
    color: #374151;
    letter-spacing: 0.2px;

    &:first-child {
      margin-top: 0;
    }
  }

  :deep(h3) {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 12px;
    margin-top: 20px;
    color: #4b5563;

    &:first-child {
      margin-top: 0;
    }
  }

  :deep(h4),
  :deep(h5),
  :deep(h6) {
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 10px;
    margin-top: 16px;
    color: #6b7280;

    &:first-child {
      margin-top: 0;
    }
  }

  // 引用块样式
  :deep(blockquote) {
    margin: 16px 0;
    padding: 14px 20px;
    border-left: 3px solid #3b82f6;
    background: #eff6ff;
    border-radius: 0 6px 6px 0;
    color: #1e40af;
    line-height: 1.7;

    p {
      margin: 0;
    }
  }

  // 链接样式
  :deep(a) {
    color: #2563eb;
    text-decoration: none;
    font-weight: 500;
    transition: color 0.2s;

    &:hover {
      color: #1d4ed8;
      text-decoration: underline;
    }
  }

  // 表格样式
  :deep(table) {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid #272727;
    margin: 16px 0;
    border-radius: 6px;
    overflow: hidden;
    box-shadow: 0px 0px 0px 1px #0000001a
  }

  :deep(th),
  :deep(td) {
    border: 1px solid #e5e7eb;
    padding: 12px 16px;
    text-align: left;
  }

  :deep(th) {
    background: #f9fafb;
    font-weight: 600;
    color: #1f2937;
    font-size: 13px;
  }

  :deep(td) {
    background: #ffffff;
  }

  // 分隔线样式
  :deep(hr) {
    border: 0;
    border-top: 1px solid #e5e7eb;
    margin: 20px 0;
  }

  // 强调文本
  :deep(strong) {
    font-weight: 600;
    color: #1f2937;
  }

  :deep(em) {
    font-style: italic;
    color: #4b5563;
  }
}

// 思考过程卡片 - 暗色模式
html.dark .thinking-block {
  .thinking-card {
    border: 1px solid rgba(168, 85, 247, 0.2);
    border-radius: 8px;
    overflow: hidden;
    background: rgba(168, 85, 247, 0.05);
    margin: 8px 0;

    .thinking-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 14px;
      background: rgba(168, 85, 247, 0.1);
      cursor: pointer;
      user-select: none;
      transition: background 0.2s;

      &:hover {
        background: rgba(168, 85, 247, 0.15);
      }

      .thinking-header-left {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .thinking-icon {
        color: #c084fc;
        font-size: 14px;
      }

      .thinking-chevron {
        color: #c084fc;
        font-size: 12px;
        transition: transform 0.2s;
      }

      .thinking-title {
        font-size: 14px;
        font-weight: 500;
        color: #c084fc;
      }

      .thinking-length {
        font-size: 12px;
        color: #71717a;
      }
    }

    .thinking-content {
      padding: 12px;
      border-top: 1px solid rgba(168, 85, 247, 0.2);
      background: rgba(168, 85, 247, 0.05);

      .thinking-text {
        font-size: 13px;
        line-height: 1.65;
        color: #d4d4d8;

        :deep(h1),
        :deep(h2),
        :deep(h3) {
          color: #fde68a;
          font-weight: 600;
          margin-top: 14px;
          margin-bottom: 8px;
        }

        :deep(h1) {
          font-size: 17px;
        }

        :deep(h2) {
          font-size: 15px;
        }

        :deep(h3) {
          font-size: 14px;
        }

        :deep(p) {
          margin-bottom: 10px;
          line-height: 1.65;

          &:last-child {
            margin-bottom: 0;
          }
        }

        :deep(ul),
        :deep(ol) {
          margin-bottom: 10px;
          padding-left: 24px;
        }

        :deep(ul) {
          list-style-type: disc;
        }

        :deep(ol) {
          list-style-type: decimal;
        }

        :deep(li) {
          margin-bottom: 5px;
          line-height: 1.6;
        }

        :deep(code) {
          background: rgba(251, 191, 36, 0.2);
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
          color: #fef3c7;
        }

        :deep(pre) {
          background: rgba(251, 191, 36, 0.1);
          padding: 12px;
          border-radius: 6px;
          margin: 10px 0;
          overflow-x: auto;

          code {
            background: transparent;
            padding: 0;
          }
        }

        :deep(blockquote) {
          border-left: 3px solid rgba(251, 191, 36, 0.4);
          padding-left: 14px;
          padding-top: 6px;
          padding-bottom: 6px;
          margin: 10px 0;
          color: #d4d4d8;
        }

        :deep(a) {
          color: #fcd34d;
          text-decoration: none;

          &:hover {
            color: #fde68a;
            text-decoration: underline;
          }
        }
      }
    }
  }
}

// 思考过程卡片 - 浅色模式
html:not(.dark) .thinking-block {
  .thinking-card {
    border: 1px solid rgba(168, 85, 247, 0.3);
    border-radius: 8px;
    overflow: hidden;
    background: rgba(168, 85, 247, 0.05);
    margin: 8px 0;

    .thinking-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 14px;
      background: rgba(168, 85, 247, 0.1);
      cursor: pointer;
      user-select: none;
      transition: background 0.2s;

      &:hover {
        background: rgba(168, 85, 247, 0.15);
      }

      .thinking-header-left {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .thinking-icon {
        color: #a855f7;
        font-size: 14px;
      }

      .thinking-chevron {
        color: #a855f7;
        font-size: 12px;
        transition: transform 0.2s;
      }

      .thinking-title {
        font-size: 14px;
        font-weight: 500;
        color: #7c3aed;
      }

      .thinking-length {
        font-size: 12px;
        color: #71717a;
      }
    }

    .thinking-content {
      padding: 12px;
      border-top: 1px solid rgba(168, 85, 247, 0.2);
      background: rgba(168, 85, 247, 0.05);

      .thinking-text {
        font-size: 13px;
        line-height: 1.65;
        color: #3f3f46;

        :deep(h1),
        :deep(h2),
        :deep(h3) {
          color: #92400e;
          font-weight: 600;
          margin-top: 14px;
          margin-bottom: 8px;
        }

        :deep(h1) {
          font-size: 17px;
        }

        :deep(h2) {
          font-size: 15px;
        }

        :deep(h3) {
          font-size: 14px;
        }

        :deep(p) {
          margin-bottom: 10px;
          line-height: 1.65;

          &:last-child {
            margin-bottom: 0;
          }
        }

        :deep(ul),
        :deep(ol) {
          margin-bottom: 10px;
          padding-left: 24px;
        }

        :deep(ul) {
          list-style-type: disc;
        }

        :deep(ol) {
          list-style-type: decimal;
        }

        :deep(li) {
          margin-bottom: 5px;
          line-height: 1.6;
        }

        :deep(code) {
          background: #fde68a;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
          color: #78350f;
        }

        :deep(pre) {
          background: #fef3c7;
          padding: 12px;
          border-radius: 6px;
          margin: 10px 0;
          overflow-x: auto;

          code {
            background: transparent;
            padding: 0;
          }
        }

        :deep(blockquote) {
          border-left: 3px solid #fbbf24;
          padding-left: 14px;
          padding-top: 6px;
          padding-bottom: 6px;
          margin: 10px 0;
          color: #78350f;
        }

        :deep(a) {
          color: #d97706;
          text-decoration: none;

          &:hover {
            color: #b45309;
            text-decoration: underline;
          }
        }
      }
    }
  }
}

// 错误卡片 - 暗色模式
html.dark .error-block {
  .error-card {
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 8px;
    overflow: hidden;
    background: rgba(239, 68, 68, 0.08);

    .error-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 14px;
      background: rgba(239, 68, 68, 0.15);

      .error-icon {
        color: #f87171;
      }

      .error-title {
        font-size: 14px;
        font-weight: 600;
        color: #fafafa;
      }
    }

    .error-content {
      padding: 14px;
      font-size: 13px;
      color: #fca5a5;
      line-height: 1.65;
    }
  }
}

// 错误卡片 - 浅色模式
html:not(.dark) .error-block {
  .error-card {
    border: 1px solid #ef4444;
    border-radius: 8px;
    overflow: hidden;
    background: #fef2f2;

    .error-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 14px;
      background: #fee2e2;

      .error-icon {
        color: #dc2626;
      }

      .error-title {
        font-size: 14px;
        font-weight: 600;
        color: #7f1d1d;
      }
    }

    .error-content {
      padding: 14px;
      font-size: 13px;
      color: #991b1b;
      line-height: 1.65;
    }
  }
}

// 流式消息效果
.streaming {
  .text-content {
    position: relative;
  }
}
</style>

<style lang="scss">
/* 代码高亮样式 - 全局导入 */
@import 'highlight.js/styles/atom-one-dark.css';

/* 浅色模式覆盖 */
html:not(.dark) {
  .hljs {
    background: #f9fafb !important;
    color: #383a42;
  }

  .hljs-comment,
  .hljs-quote {
    color: #a0a1a7;
    font-style: italic;
  }

  .hljs-doctag,
  .hljs-keyword,
  .hljs-formula {
    color: #a626a4;
  }

  .hljs-section,
  .hljs-name,
  .hljs-selector-tag,
  .hljs-deletion,
  .hljs-subst {
    color: #e45649;
  }

  .hljs-literal {
    color: #0184bb;
  }

  .hljs-string,
  .hljs-regexp,
  .hljs-addition,
  .hljs-attribute,
  .hljs-meta-string {
    color: #50a14f;
  }

  .hljs-built_in,
  .hljs-class .hljs-title {
    color: #c18401;
  }

  .hljs-attr,
  .hljs-variable,
  .hljs-template-variable,
  .hljs-type,
  .hljs-selector-class,
  .hljs-selector-attr,
  .hljs-selector-pseudo,
  .hljs-number {
    color: #986801;
  }

  .hljs-symbol,
  .hljs-bullet,
  .hljs-link,
  .hljs-meta,
  .hljs-selector-id,
  .hljs-title {
    color: #4078f2;
  }

  .hljs-emphasis {
    font-style: italic;
  }

  .hljs-strong {
    font-weight: bold;
  }

  .hljs-link {
    text-decoration: underline;
  }
}

/* 代码块样式 - 暗色模式 */
html.dark .text-content .code-block-wrapper {
  margin: 14px 0;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: #0d1117 !important;
}

html.dark .text-content .code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin: 0;
}

html.dark .text-content .code-language {
  font-size: 12px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  color: rgba(255, 255, 255, 0.9);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
}

html.dark .text-content .code-copy-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

html.dark .text-content .code-copy-btn:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.4);
}

html.dark .text-content pre.hljs {
  margin: 0 !important;
  padding: 16px;
  overflow-x: auto;
  background: #1e1e1e !important;
  border: 0;
  border-radius: 0;
  line-height: 1.65 !important;

  &::-webkit-scrollbar {
    height: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 4px;

    &:hover {
      background: rgba(255, 255, 255, 0.25);
    }
  }
}

html.dark .text-content pre.hljs code {
  padding: 0;
  background: transparent !important;
  color: #ffffff;
  font-size: 13.5px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  line-height: inherit;
  border: none !important;
  display: block;
}

/* 移除代码行的边框 */
html.dark .text-content pre.hljs code * {
  border: none !important;
}

/* 代码块样式 - 浅色模式 */
html:not(.dark) .text-content .code-block-wrapper {
  margin: 14px 0;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #d1d5db;
  background: #f9fafb !important;
}

html:not(.dark) .text-content .code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: #f3f4f6;
  border-bottom: 1px solid #d1d5db;
  margin: 0;
}

html:not(.dark) .text-content .code-language {
  font-size: 12px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
}

html:not(.dark) .text-content .code-copy-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  font-size: 12px;
  color: #4b5563;
  // background: #ffffff;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

html:not(.dark) .text-content .code-copy-btn:hover {
  color: #1f2937;
  background: #f9fafb;
  border-color: #9ca3af;
}

html:not(.dark) .text-content pre.hljs {
  margin: 0 !important;
  padding: 16px;
  overflow-x: auto;
  background: #f9fafb !important;
  border: 0;
  border-radius: 0;
  line-height: 1.65 !important;

  &::-webkit-scrollbar {
    height: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #e5e7eb;
  }

  &::-webkit-scrollbar-thumb {
    background: #9ca3af;
    border-radius: 4px;

    &:hover {
      background: #6b7280;
    }
  }
}

html:not(.dark) .text-content pre.hljs code {
  padding: 0;
  background: transparent !important;
  color: #1f2937;
  font-size: 13.5px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  line-height: inherit;
  border: none !important;
  display: block;
}

/* 移除代码行的边框 */
html:not(.dark) .text-content pre.hljs code * {
  border: none !important;
}

/* 代码复制图标 - 通用样式 */
.text-content .code-copy-icon {
  width: 14px;
  height: 14px;
  cursor: pointer;
}

/* 行内代码样式 - 暗色模式 */
html.dark .text-content code {
  padding: 3px 8px;
  background: rgba(96, 165, 250, 0.15);
  border: 1px solid rgba(96, 165, 250, 0.25);
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  color: #93c5fd;
  font-weight: 500;
}

/* 行内代码样式 - 浅色模式 */
html:not(.dark) .text-content code {
  padding: 3px 8px;
  background: #dbeafe;
  border: 1px solid #bfdbfe;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  color: #1e40af;
  font-weight: 500;
}

/* 代码块内的code不应用行内代码样式 - 通用 */
.text-content pre code {
  padding: 0 !important;
  background: transparent !important;
}
</style>
