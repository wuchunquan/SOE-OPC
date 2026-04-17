<template>
  <div class="agent-input">
    <div class="input-container">
      <!-- 已上传文件预览区 -->
      <div v-if="uploadedFiles.length > 0" class="uploaded-files">
        <div
          v-for="file in uploadedFiles"
          :key="file.id"
          class="file-item"
          @mouseenter="hoveredFileId = file.id"
          @mouseleave="hoveredFileId = null"
        >
          <img
            v-if="isImageFile(file.type)"
            :src="file.preview"
            alt="预览"
            class="file-preview-image"
          />
          <ArtSvgIcon
            v-else
            :icon="getFileIcon(file.type)"
            :size="20"
            class="file-icon"
          />
          <span class="file-name">{{ file.name }}</span>
          <button
            v-show="hoveredFileId === file.id"
            class="remove-file-btn"
            @click="removeFile(file.id)"
          >
            <ArtSvgIcon icon="ri:close-line" :size="14" />
          </button>
        </div>
      </div>

      <!-- 文本输入区域 -->
      <div
        class="input-wrapper"
        :class="{ 'drag-over': isDragOver }"
        @drop="handleWorkspaceFileDrop"
        @dragover.prevent="handleDragOver"
        @dragleave="handleDragLeave"
      >
        <el-input
          ref="textareaRef"
          v-model="inputMessage"
          type="textarea"
          :rows="1"
          :placeholder="placeholder"
          @keydown.enter.exact.prevent="handleSend"
          @keydown.enter.shift.exact="handleNewLine"
          @paste="handlePaste"
          resize="none"
          class="message-input"
        />

        <!-- 底部工具栏 -->
        <div class="input-toolbar">
          <!-- 左侧：文件上传按钮 -->
          <div class="toolbar-left">
            <button
              class="toolbar-button upload-button opacity-60 hover:opacity-90"
              @click="triggerFileUpload"
              title="上传文件"
            >
              <ArtSvgIcon icon="ri:attachment-2" class="w-5 h-5" />
            </button>
          </div>

          <!-- 右侧：发送/停止按钮 -->
          <div class="toolbar-right">
            <button
              v-if="!disabled"
              :disabled="!canSend"
              @click="handleSend"
              class="toolbar-button send-button"
            >
              <ArtSvgIcon icon="ri:send-plane-fill" :size="16" />
            </button>
            <button
              v-else
              @click="handleStop"
              class="toolbar-button stop-button"
            >
              <i class="pi pi-stop"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 隐藏的文件输入框 -->
    <input
      ref="fileInputRef"
      type="file"
      multiple
      style="display: none"
      @change="handleFileSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed, inject } from 'vue'
import { useAgentStore as useDefaultStore } from './store'
import { AgentStoreKey, BaseUrlKey } from './injection'

const agentStore = inject(AgentStoreKey, null) || useDefaultStore()
const baseUrl = inject(BaseUrlKey, '')

interface UploadedFile {
  id: string
  name: string
  type: string
  size: number
  path: string // 服务器上的文件路径（如 uploaded/xxx.png）
  preview?: string // 预览 URL（图片用 Base64，文件用路径）
  uploading?: boolean // 是否正在上传
}

const props = withDefaults(
  defineProps<{
    disabled?: boolean
    placeholder?: string
  }>(),
  {
    disabled: false,
    placeholder: '输入您的问题...'
  }
)

const emit = defineEmits<{
  send: [message: string, files: UploadedFile[]]
  stop: []
}>()

const inputMessage = ref('')
const textareaRef = ref()
const fileInputRef = ref<HTMLInputElement>()
const uploadedFiles = ref<UploadedFile[]>([])
const hoveredFileId = ref<string | null>(null)
const isDragOver = ref(false)

// 切换会话时清空输入框
watch(() => agentStore.currentSession, () => {
  inputMessage.value = ''
  uploadedFiles.value = []
})

// 是否可以发送
const canSend = computed(() => {
  return (inputMessage.value.trim() || uploadedFiles.value.length > 0) && !props.disabled
})

// 触发文件选择
const triggerFileUpload = () => {
  fileInputRef.value?.click()
}

// 处理文件选择
const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (!files || files.length === 0) return

  for (const file of Array.from(files)) {
    await addFile(file)
  }

  // 清空输入框，允许重复选择同一文件
  target.value = ''
}

// 处理粘贴事件（支持粘贴图片）
const handlePaste = (event: ClipboardEvent) => {
  const items = event.clipboardData?.items
  if (!items) return

  // 收集图片项
  const imageFiles: File[] = []
  for (const item of Array.from(items)) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) {
        imageFiles.push(file)
      }
    }
  }

  // 没有图片时，手动处理文本粘贴以避免换行问题
  if (imageFiles.length === 0) {
    const text = event.clipboardData?.getData('text/plain')
    if (text) {
      // 始终阻止默认行为，手动插入文本
      event.preventDefault()
      // 移除末尾的换行符（包括 \r\n 和 \n）
      const cleanText = text.replace(/[\r\n]+$/, '')
      const textarea = textareaRef.value?.$el?.querySelector('textarea')
      if (textarea) {
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const before = inputMessage.value.substring(0, start)
        const after = inputMessage.value.substring(end)
        inputMessage.value = before + cleanText + after
        // 设置光标到粘贴内容末尾
        nextTick(() => {
          const newPos = start + cleanText.length
          textarea.setSelectionRange(newPos, newPos)
          textarea.focus()
        })
      }
    }
    return
  }

  // 有图片时阻止默认行为
  event.preventDefault()

  // 异步处理图片上传
  const processImages = async () => {
    for (const file of imageFiles) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      const ext = file.type.split('/')[1] || 'png'
      const newFile = new File([file], `pasted-image-${timestamp}.${ext}`, { type: file.type })
      await addFile(newFile)
    }
  }
  processImages()
}

// 处理工作区文件拖拽
const handleDragOver = (e: DragEvent) => {
  // 检查是否是工作区文件拖拽
  if (e.dataTransfer?.types.includes('application/x-workspace-file')) {
    isDragOver.value = true
    e.dataTransfer.dropEffect = 'copy'
  }
}

const handleDragLeave = () => {
  isDragOver.value = false
}

const handleWorkspaceFileDrop = (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = false

  // 检查是否是工作区文件
  const workspaceFileData = e.dataTransfer?.getData('application/x-workspace-file')
  if (workspaceFileData) {
    try {
      const fileInfo = JSON.parse(workspaceFileData)
      // 插入 @文件路径 到输入框
      const fileRef = `@${fileInfo.path} `

      // 在光标位置插入文本
      const textarea = textareaRef.value?.$el?.querySelector('textarea')
      if (textarea) {
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const before = inputMessage.value.substring(0, start)
        const after = inputMessage.value.substring(end)
        inputMessage.value = before + fileRef + after

        // 设置光标位置到插入文本之后
        nextTick(() => {
          const newPos = start + fileRef.length
          textarea.setSelectionRange(newPos, newPos)
          textarea.focus()
        })
      } else {
        // 如果无法获取光标位置，追加到末尾
        inputMessage.value += fileRef
      }
    } catch (err) {
      console.error('Failed to parse workspace file data:', err)
    }
  }
}

// 添加文件（立即上传到服务器）
const addFile = async (file: File) => {
  const fileId = generateId()

  // 读取文件为 Base64（用于预览和上传）
  const fileData = await readFileAsDataURL(file)

  // 先添加到列表，标记为上传中
  const uploadedFile: UploadedFile = {
    id: fileId,
    name: file.name,
    type: file.type,
    size: file.size,
    path: '',
    preview: isImageFile(file.type) ? fileData : undefined,
    uploading: true
  }
  uploadedFiles.value.push(uploadedFile)

  try {
    // 立即上传到服务器
    const response = await uploadFileToWorkspace(file.name, file.type, fileData)

    // 更新文件路径
    const index = uploadedFiles.value.findIndex(f => f.id === fileId)
    if (index !== -1) {
      uploadedFiles.value[index].path = response.path
      uploadedFiles.value[index].uploading = false
    }
  } catch (error) {
    console.error('文件上传失败:', error)
    // 移除上传失败的文件
    uploadedFiles.value = uploadedFiles.value.filter(f => f.id !== fileId)
    // 可以添加错误提示
  }
}

// 上传文件到工作区
const uploadFileToWorkspace = async (name: string, type: string, data: string) => {
  const { default: http } = await import('@/utils/http')

  const response = await http.post({
    url: `${baseUrl}/api/agent/sessions/${agentStore.currentSession}/workspace/upload`,
    data: {
      name,
      type,
      data
    }
  })

  return response as { message: string; path: string; filename: string; size: number }
}

// 读取文件为 Base64
const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// 生成唯一 ID
const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

// 判断是否为图片文件
const isImageFile = (type: string) => {
  return type.startsWith('image/')
}

// 获取文件图标
const getFileIcon = (type: string) => {
  if (type.includes('pdf')) return 'ri:file-pdf-line'
  if (type.includes('text')) return 'ri:file-text-line'
  if (type.includes('json')) return 'ri:file-code-line'
  if (type.includes('zip') || type.includes('rar') || type.includes('7z')) return 'ri:file-zip-line'
  return 'ri:file-line'
}

// 移除文件
const removeFile = (fileId: string) => {
  uploadedFiles.value = uploadedFiles.value.filter(f => f.id !== fileId)
}

const handleSend = () => {
  const message = inputMessage.value.trim()
  if ((message || uploadedFiles.value.length > 0) && !props.disabled) {
    // 构建完整消息：在消息前添加文件引用
    let fullMessage = ''

    // 添加文件引用（使用 @ 前缀）
    const fileReferences = uploadedFiles.value
      .filter(f => !f.uploading && f.path) // 只包含上传完成的文件
      .map(f => `@${f.path}`)
      .join(' ')

    if (fileReferences) {
      fullMessage = fileReferences
      if (message) {
        fullMessage += '\n' + message
      }
    } else {
      fullMessage = message
    }

    emit('send', fullMessage, [...uploadedFiles.value])
    inputMessage.value = ''
    uploadedFiles.value = []
    // 重置高度
    nextTick(() => {
      const textarea = textareaRef.value?.$refs?.textarea
      if (textarea) {
        textarea.style.height = 'auto'
      }
    })
  }
}

const handleStop = () => {
  emit('stop')
}

const handleNewLine = (event: KeyboardEvent) => {
  // Shift + Enter 换行，由默认行为处理
}

// 监听输入变化，动态调整高度
watch(inputMessage, () => {
  nextTick(() => {
    const textarea = textareaRef.value?.$refs?.textarea
    if (textarea) {
      // 重置高度为auto以获取正确的scrollHeight
      textarea.style.height = 'auto'

      // 计算所需高度
      const scrollHeight = textarea.scrollHeight
      const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 24
      const minHeight = lineHeight * 1 // 1行的高度
      const maxHeight = lineHeight * 6 // 6行的高度

      // 设置实际高度
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight)
      textarea.style.height = newHeight + 'px'
    }
  })
})

// 暴露方法给父组件
defineExpose({
  focus: () => {
    textareaRef.value?.focus()
  },
  clear: () => {
    inputMessage.value = ''
  }
})
</script>

<style scoped lang="scss">
  html.dark .agent-input {
    background: #111111;
    border-top: 1px solid #27272a;
  }

.agent-input {
  border-top: 1px solid var(--el-border-color-light);
  background: var(--el-bg-color);
  padding: 16px 20px;
  flex-shrink: 0;
}

.input-container {
  border-radius: 12px;
  padding: 6px 8px;
  transition: all 0.3s;
}

// 浅色模式 - 边框和阴影
html:not(.dark) .input-container {
  border: 1px solid var(--el-border-color-light);
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04);

  &:hover {
    border-color: var(--el-color-primary-light-5);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1), 0 2px 6px rgba(0, 0, 0, 0.06);
  }

  &:focus-within {
    border-color: var(--el-color-primary);
    box-shadow: 0 4px 16px rgba(64, 158, 255, 0.2), 0 2px 8px rgba(0, 0, 0, 0.08), 0 0 0 3px rgba(64, 158, 255, 0.1);
  }
}

// 深色模式 - 背景颜色区分，无边框无阴影
html.dark .input-container {
  border: 1px solid #2b2b31;
  background: #18181b;

  &:hover {
  }

  &:focus-within {
  }
}

// 上传文件预览区
.uploaded-files {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.file-item {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 6px;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  font-size: 13px;
  max-width: 200px;

  &:hover {
    background: var(--el-fill-color);
  }
}

.file-preview-image {
  width: 20px;
  height: 20px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
}

.file-icon {
  flex-shrink: 0;
  color: var(--el-text-color-secondary);
}

.file-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--el-text-color-regular);
}

.remove-file-btn {
  border: none;
  background: transparent;
  padding: 2px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
  color: var(--el-text-color-secondary);

  &:hover {
    background: var(--el-fill-color-dark);
    color: var(--el-color-danger);
  }
}

.input-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  transition: all 0.2s;

  &.drag-over {
    background: rgba(59, 130, 246, 0.1);
    border-radius: 8px;
    outline: 2px dashed #3b82f6;
    outline-offset: -2px;
  }
}

.message-input {
  flex: 1;

  :deep(.el-textarea__inner) {
    padding: 8px 12px;
    padding-bottom: 40px; // 为底部工具栏留出空间
    border: none;
    background: transparent;
    box-shadow: none;
    line-height: 1.6;
    font-family: inherit;
    font-size: 14px;
    min-height: 24px;
    max-height: 120px;
    overflow-y: hidden;
    resize: none;

    &:focus {
      border: none;
      box-shadow: none;
      outline: none;
    }

    &::placeholder {
      color: var(--el-text-color-placeholder);
    }

    // 自定义滚动条
    &::-webkit-scrollbar {
      width: 4px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: var(--el-border-color);
      border-radius: 2px;

      &:hover {
        background: var(--el-border-color-darker);
      }
    }
  }
}

// 底部工具栏
.input-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  min-height: 40px;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

// 工具栏按钮基础样式
.toolbar-button {
  border: none;
  border-radius: 8px;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;

  &:hover {
    // transform: scale(1.05);
  }

  &:active {
    // transform: scale(0.95);
  }
}

// 上传按钮
.upload-button {
  background: transparent;
  color: var(--el-text-color-regular);

  &:hover {
    background: var(--el-fill-color-light);
  }
}

// 发送按钮
.send-button {
  background: transparent;
  color: var(--el-text-color-regular);

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;

    &:hover {
      transform: none;
      background: transparent;
    }
  }

  &:hover:not(:disabled) {
    background: var(--el-fill-color-light);
  }
}

// 停止按钮
.stop-button {
  background: var(--el-color-danger);
  color: white;
  font-size: 14px;

  &:hover {
    background: var(--el-color-danger-light-3);
  }
}

</style>
