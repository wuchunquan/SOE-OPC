<template>
  <div class="agent-message-list" ref="messageListRef" @scroll="handleScroll" @wheel.capture="handleWheel" @touchmove.capture="handleWheel">
    <!-- 加载更多提示 -->
    <div v-if="hasMore && !isLoadingMore" class="load-more-hint">
      <el-button text type="primary" @click="emit('load-more')">
        <ArtSvgIcon icon="ri:history-line" :size="14" class="mr-1" />
        加载更多消息
      </el-button>
    </div>
    <div v-if="isLoadingMore" class="loading-hint">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>加载中...</span>
    </div>

    <!-- 空状态 -->
    <div v-if="messages.length === 0 && !streamingMessage" class="empty-state">
      <div class="empty-content">
        <PyramidLoader />
        <div class="empty-text">
          <div class="empty-title">开始新对话</div>
          <div class="empty-desc">还没有消息，开始沟通吧！</div>
        </div>
      </div>
    </div>

    <!-- 消息列表 -->
    <div class="messages-container" v-else>
      <AgentMessage
        v-for="message in messages"
        :key="message.message_id"
        :message="message"
        :session-info="sessionInfo"
        @preview-image="handlePreviewImage"
        @delete-message="handleDeleteMessage(message.message_id)"
        @recall-message="handleRecallMessage(message.message_id)"
      />

      <!-- 流式消息 -->
      <AgentMessage
        v-if="streamingMessage"
        :key="`streaming-${streamingMessage.message_id}`"
        :message="streamingMessage"
        :session-info="sessionInfo"
        @preview-image="handlePreviewImage"
      />
    </div>

  </div>

  <!-- 图片预览 -->
  <el-image-viewer
    v-if="showImageViewer"
    :url-list="previewImages"
    :initial-index="currentImageIndex"
    @close="showImageViewer = false"
    teleported
  />
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import AgentMessage from './AgentMessage.vue'
import PyramidLoader from './common/PyramidLoader.vue'
import type { AgentMessage as AgentMessageType } from './types'

const props = defineProps<{
  messages: AgentMessageType[]
  streamingMessage?: AgentMessageType | null
  hasMore?: boolean
  autoScroll?: boolean
  sessionInfo?: any // 当前会话信息（用于显示 AI 头像和名称）
}>()

const emit = defineEmits<{
  'load-more': []
  'scrolled-to-top': []
  'delete-message': [messageId: string]
  'recall-message': [messageId: string]
}>()

const messageListRef = ref<HTMLElement>()
const userScrollLocked = ref(false)
const isLoadingMore = ref(false)

// 图片预览
const showImageViewer = ref(false)
const previewImages = ref<string[]>([])
const currentImageIndex = ref(0)

const handlePreviewImage = (data: { src: string; allImages: string[] }) => {
  previewImages.value = data.allImages
  currentImageIndex.value = data.allImages.indexOf(data.src)
  showImageViewer.value = true
}

// 处理删除消息
const handleDeleteMessage = (messageId: string) => {
  emit('delete-message', messageId)
}

// 处理撤回消息
const handleRecallMessage = (messageId: string) => {
  emit('recall-message', messageId)
}

// 滚动到底部（无动画）
const scrollToBottom = () => {
  nextTick(() => {
    if (userScrollLocked.value) return
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight
    }
  })
}

// 强制滚动到底部（忽略锁定，用于用户发送消息时）
const forceScrollToBottom = () => {
  userScrollLocked.value = false
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight
    }
  })
}

// 用户滚轮操作：往上锁定，往下滚到底部附近解锁
const handleWheel = (e: WheelEvent | TouchEvent) => {
  if (e instanceof WheelEvent) {
    if (e.deltaY < 0) {
      // 往上滚 → 锁定
      userScrollLocked.value = true
    } else if (e.deltaY > 0 && userScrollLocked.value && messageListRef.value) {
      // 往下滚 → 检查是否接近底部，是则解锁
      requestAnimationFrame(() => {
        if (!messageListRef.value) return
        const { scrollTop, scrollHeight, clientHeight } = messageListRef.value
        if (scrollHeight - scrollTop - clientHeight < 200) {
          userScrollLocked.value = false
        }
      })
    }
  }
}

const handleScroll = () => {
  if (!messageListRef.value) return

  const { scrollTop } = messageListRef.value

  // 检测是否在顶部（加载更多）
  if (scrollTop === 0 && props.hasMore && !isLoadingMore.value) {
    isLoadingMore.value = true
    emit('scrolled-to-top')
    setTimeout(() => {
      isLoadingMore.value = false
    }, 1000)
  }
}

// 监听消息变化（用户发送消息时 messages.length 变化），解锁并滚动
watch(
  () => props.messages.length,
  () => {
    setTimeout(() => {
      forceScrollToBottom()
    }, 300)
  }
)

// 监听流式消息变化 - 尊重用户滚动锁定
watch(
  () => props.streamingMessage,
  (newVal, oldVal) => {
    // 流式消息首次出现（AI 开始回复），不解锁，只在未锁定时滚动
    if (newVal && !oldVal) {
      scrollToBottom()
      return
    }

    // 流式内容更新中：未锁定才跟随
    if (newVal) {
      scrollToBottom()
    }

    // 流式完成后，解锁并滚到底部
    if (oldVal && !newVal) {
      setTimeout(() => {
        forceScrollToBottom()
      }, 250)
    }
  },
  { deep: true }
)

// 组件挂载时滚动到底部
onMounted(() => {
  scrollToBottom()
})

// 暴露方法给父组件
defineExpose({
  scrollToBottom,
  forceScrollToBottom
})
</script>

<style scoped lang="scss">
.agent-message-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  position: relative;
  background: var(--el-bg-color-page);

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--el-border-color);
    border-radius: 3px;

    &:hover {
      background: var(--el-border-color-darker);
    }
  }
}

@media (max-width: 768px) {
  .agent-message-list {
    padding: 12px;
  }
}

// 暗色模式背景
html.dark .agent-message-list {
  background: #111111;
}

// 浅色模式背景
html:not(.dark) .agent-message-list {
  background: #ffffff;
}

.load-more-hint,
.loading-hint {
  text-align: center;
  padding: 12px 0;
  margin-bottom: 16px;
}

.loading-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 100%;
}

.empty-content {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.empty-text {
  .empty-title {
    font-size: 18px;
    font-weight: 500;
    color: var(--el-text-color-primary);
    margin-bottom: 8px;
  }

  .empty-desc {
    font-size: 14px;
    color: var(--el-text-color-secondary);
  }
}

.messages-container {
  min-height: 100%;
}

.mr-1 {
  margin-right: 4px;
}
</style>

<style lang="scss">
// 图片预览样式 - 限制最大宽度
html.dark .el-image-viewer__actions {
    background-color: rgb(80 80 80 / 85%);
}
  
html.dark .el-image-viewer__next, .el-image-viewer__prev {
    background-color: rgb(80 80 80 / 85%);;
}

html.dark  .el-image-viewer__close {
    background-color: rgb(80 80 80 / 85%);
}

.el-image-viewer__img {
  max-width: 85vw !important;
  max-height: 85vh !important;
}
</style>
