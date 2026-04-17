<template>
  <Teleport to="body">
    <!-- 浮窗 -->
    <Transition name="slide-up">
      <div v-if="isVisible" class="agent-float-window" :class="{ maximized: isMaximized }">
        <!-- 头部 -->
        <div class="float-header">
          <div class="header-left">
            <ArtSvgIcon icon="ri:sparkling-2-fill" :size="20" class="header-icon" />
            <span class="header-title">AI 助手</span>
          </div>
          <div class="header-actions">
            <el-button
              text
              @click="toggleMaximize"
            >
              <ArtSvgIcon :icon="isMaximized ? 'ri:fullscreen-exit-line' : 'ri:fullscreen-line'" :size="16" />
            </el-button>
            <el-button
              text
              @click="close"
            >
              <ArtSvgIcon icon="ri:close-line" :size="16" />
            </el-button>
          </div>
        </div>

        <!-- 聊天内容 -->
        <div class="float-content">
          <AgentChat is-floating :session-id="agentStore.currentAiSession" />
        </div>
      </div>
    </Transition>

    <!-- 触发按钮 -->
    <Transition name="fade">
      <div v-if="!isVisible && !isMobile" class="agent-trigger-button" @click="open">
        <div class="button-bg"></div>
        <div class="button-border"></div>
        <div class="glow-effect"></div>
        <div class="button-content">
          <img src="/logo.png" alt="AI助手" class="ai-logo" />
          <el-badge :value="unreadCount" :hidden="unreadCount === 0" class="badge-wrapper" />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, provide } from 'vue'
import AgentChat from './AgentChat.vue'
import { useAgentStore } from './store'
import * as agentApi from './api'
import AgentFileManager from './file/FileManager.vue'
import { AgentStoreKey, AgentApiKey, BaseUrlKey, IsLocalKey, FileManagerKey } from './injection'

const isVisible = ref(false)
const isMaximized = ref(false)
const isMobile = ref(false)
const agentStore = useAgentStore()

// provide agent store 给子组件
provide(AgentStoreKey, agentStore)
provide(AgentApiKey, agentApi)
provide(BaseUrlKey, '')
provide(IsLocalKey, false)
provide(FileManagerKey, AgentFileManager)

// 检测是否是移动设备
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

// 未读消息数（简化版，可以后续完善）
const unreadCount = computed(() => 0)

const open = () => {
  isVisible.value = true
}

const close = () => {
  isVisible.value = false
  isMaximized.value = false
}

const toggleMaximize = () => {
  isMaximized.value = !isMaximized.value
}

// 暴露方法给外部调用
defineExpose({
  open,
  close,
  toggle: () => {
    isVisible.value = !isVisible.value
  }
})
</script>

<style scoped lang="scss">
.agent-float-window {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 420px;
  height: 600px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);

  &.maximized {
    width: 80vw;
    height: 80vh;
    top: 50%;
    left: 50%;
    right: auto;
    bottom: auto;
    transform: translate(-50%, -50%);
  }
}

.float-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--el-border-color-light);
  background: var(--el-bg-color);
  user-select: none;
  flex-shrink: 0;

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .header-icon {
    color: var(--el-color-primary);
  }

  .header-title {
    font-size: 15px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  .header-actions {
    display: flex;
    gap: 4px;
  }
}

.float-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color-page);
}

.agent-trigger-button {
  position: fixed;
  bottom: 24px;
  left: 24px;
  width: 52px;
  height: 52px;
  cursor: pointer;
  z-index: 9998;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    transform: translateY(-4px);

    .button-border {
      opacity: 1;
      transform: rotate(180deg);
    }

    .glow-effect {
      opacity: 0.6;
      transform: scale(1.2);
    }
  }

  &:active {
    transform: translateY(-2px) scale(0.96);
  }

  // 背景层
  .button-bg {
    position: absolute;
    inset: 0;
    border-radius: 14px;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    transition: all 0.3s ease;
  }

  // 旋转边框
  .button-border {
    position: absolute;
    inset: -2px;
    border-radius: 16px;
    background: linear-gradient(135deg, #60a5fa, #3b82f6, #2563eb, #1d4ed8);
    opacity: 0.6;
    transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    animation: rotate-border 8s linear infinite;
    z-index: -1;
  }

  // 发光效果
  .glow-effect {
    position: absolute;
    inset: -6px;
    border-radius: 18px;
    background: radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 70%);
    filter: blur(10px);
    opacity: 0.4;
    transition: all 0.3s ease;
    animation: glow-pulse 3s ease-in-out infinite;
  }

  // 内容层
  .button-content {
    position: relative;
    width: 100%;
    height: 100%;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.3);

    .ai-logo {
      width: 30px;
      height: 30px;
      object-fit: contain;
      filter: brightness(0) invert(1) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
      position: relative;
      z-index: 1;
    }

    .badge-wrapper {
      position: absolute;
      top: -4px;
      right: -4px;
      z-index: 2;
    }
  }
}

// 边框旋转动画
@keyframes rotate-border {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

// 发光脉动
@keyframes glow-pulse {
  0%, 100% {
    opacity: 0.3;
  }
  50% {
    opacity: 0.5;
  }
}

// 深色模式适配
html.dark .agent-trigger-button {
  .button-bg {
    background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
  }

  .button-content {
    box-shadow: 0 8px 24px rgba(37, 99, 235, 0.4);
  }

  .glow-effect {
    background: radial-gradient(circle, rgba(37, 99, 235, 0.5) 0%, transparent 70%);
  }
}

// 浅色模式适配
html:not(.dark) .agent-trigger-button {
  .button-bg {
    background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
  }

  .button-content {
    box-shadow: 0 8px 24px rgba(96, 165, 250, 0.35);
  }
}

// 动画
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.9);
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scale(0.8);
}
</style>
