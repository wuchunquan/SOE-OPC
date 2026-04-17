<template>
  <div class="agent-toolbar" >
    <!-- 用户头像 -->
    <div class="user-avatar-section">
      <div class="user-avatar" @click="handleUserClick" :title="userStore.info.nickname || userStore.info.username || '用户设置'">
        <img
          v-if="userStore.info.avatar"
          :src="userStore.info.avatar"
          alt="用户头像"
          class="avatar-image"
        />
        <i v-else class="pi pi-user"></i>
      </div>
    </div>

    <!-- 顶部工具按钮 -->
    <div class="toolbar-buttons">
      <div v-for="tool in topTools">
      <el-button
        :key="tool.key"
        :class="{ active: tool.isActive }"
        :title="tool.tooltip"
        text
        @click="handleTool(tool)"
      >
        <i :class="tool.icon"></i>
      </el-button>
      </div>
    </div>

    <div class="flex-1 w-full agent-space" data-tauri-drag-region></div>

    <!-- 底部工具按钮 -->
    <div class="toolbar-buttons">
      <el-button
        v-for="tool in bottomTools"
        :key="tool.key"
        :class="{ active: tool.isActive }"
        :title="tool.tooltip"
        text
        @click="handleTool(tool)"
      >
        <i :class="tool.icon"></i>
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useUserStore } from '@/store/modules/user'
import { useSettingStore } from '@/store/modules/setting'
import { useTheme } from '@/hooks/core/useTheme'
import { isTauriEnv } from '@/utils/env'
import { storeToRefs } from 'pinia'
import { SystemThemeEnum } from '@/enums/appEnum'
import { isSelfUseMode } from '@/utils/runtime-mode'

const userStore = useUserStore()
const settingStore = useSettingStore()
const { isDark } = storeToRefs(settingStore)
const { switchThemeStyles } = useTheme()
const isTauri = isTauriEnv()
const selfUseMode = isSelfUseMode()

// 检测是否为移动端网页（非 Tauri 且窗口宽度小于 768px）
const isMobileWeb = ref(false)

const checkMobileWeb = () => {
  isMobileWeb.value = !isTauri && window.innerWidth < 768
}

onMounted(() => {
  checkMobileWeb()
  window.addEventListener('resize', checkMobileWeb)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', checkMobileWeb)
})

const emit = defineEmits<{
  toolClick: [key: string]
}>()

const activeToolKey = ref(isTauri ? 'local-ai' : 'ai-chat')

const topTools = computed(() => {
  const tools: Array<{ key: string; icon: string; tooltip: string; isActive: boolean }> = []

  if (isTauri) {
    tools.push({
      key: 'local-ai',
      icon: 'pi pi-desktop',
      tooltip: selfUseMode ? 'AI 助手' : '本地AI',
      isActive: activeToolKey.value === 'local-ai'
    })
  }

  if (!selfUseMode) {
    tools.push({
      key: 'ai-chat',
      icon: isTauri ? 'pi pi-cloud' : 'pi pi-sparkles',
      tooltip: isTauri ? '云端AI' : 'AI 助手',
      isActive: activeToolKey.value === 'ai-chat'
    })
  }

  tools.push({
    key: 'knowledge-base',
    icon: 'pi pi-book',
    tooltip: '知识库',
    isActive: activeToolKey.value === 'knowledge-base'
  })

  tools.push({
    key: 'skills',
    icon: 'pi pi-bolt',
    tooltip: 'Skills 管理',
    isActive: activeToolKey.value === 'skills'
  })

  tools.push({
    key: 'app-center',
    icon: 'pi pi-th-large',
    tooltip: '应用中心',
    isActive: activeToolKey.value === 'app-center'
  })

  return tools
})

const bottomTools = computed(() => {
  const tools = [
    {
      key: 'help',
      icon: 'pi pi-question-circle',
      tooltip: '帮助文档',
      isActive: activeToolKey.value === 'help'
    }
  ]

  // 移动端网页添加主题切换按钮
  if (isMobileWeb.value) {
    tools.push({
      key: 'theme-toggle',
      icon: isDark.value ? 'pi pi-sun' : 'pi pi-moon',
      tooltip: isDark.value ? '切换到浅色模式' : '切换到深色模式',
      isActive: false
    })
  }

  tools.push({
    key: 'settings',
    icon: 'pi pi-cog',
    tooltip: '设置'
  })

  return tools
})

const handleTool = (tool: any) => {
  // 主题切换
  if (tool.key === 'theme-toggle') {
    const newTheme = isDark.value ? SystemThemeEnum.LIGHT : SystemThemeEnum.DARK
    switchThemeStyles(newTheme)
    return
  }

  // 更新激活状态
  if (tool.key === 'ai-chat' || tool.key === 'internal-chat' || tool.key === 'local-ai' || tool.key === 'skills' || tool.key === 'knowledge-base' || tool.key === 'help' || tool.key === 'app-center') {
    activeToolKey.value = tool.key
  }
  emit('toolClick', tool.key)
}

const handleUserClick = () => {
  emit('toolClick', 'user-settings')
}

</script>

<style scoped lang="scss">
.toolbar-buttons{
  .el-button + .el-button {
    margin-left: 0!important;
  }
}
.agent-toolbar {
  width: 56px;
  min-width: 56px;
  background: #0a0a0a;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0;
  flex-shrink: 0;
}

.user-avatar-section {
  margin-bottom: 16px;

  .user-avatar {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    transition: all 0.3s;

    .avatar-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    }
  }
}

.toolbar-buttons {
  display: flex;
  flex-direction: column;
  gap: 5px;

  :deep(.el-button) {
    width: 40px;
    height: 40px!important;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    color: #71717a;
    transition: all 0.2s;

    &:hover {
      background: #18181b;
      color: white;
    }

    &.active {
      background: #27272a;
      color: rgba(255, 255, 255, 0.777)!important;
    }
  }
}

// 深色模式
html.dark .agent-toolbar {
  background:#18181b;
  border-right-color: rgba(255, 255, 255, 0.08);
}

// 浅色模式
html:not(.dark) .agent-toolbar {
  background:linear-gradient(135deg, rgb(99 136 241 / 3%) 0%, rgb(255 255 255 / 3%) 100%), linear-gradient(180deg, #fafafa 0%, #f5f5f5 100%);
  border-right: 1px solid transparent;
  border-image: linear-gradient(
    180deg,
    rgba(99, 102, 241, 0.1) 0%,
    rgba(168, 85, 247, 0.1) 50%,
    rgba(99, 102, 241, 0.1) 100%
  ) 1;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 100px;
    background: radial-gradient(
      ellipse at top,
      rgba(99, 102, 241, 0.08) 0%,
      transparent 70%
    );
    pointer-events: none;
  }

  > * {
    position: relative;
  }

  .user-avatar {

  }

  .toolbar-buttons :deep(.el-button) {
    color: #6b7280;

    &:hover {
      background: rgba(99, 102, 241, 0.08);
      color: #111827;
    }

    &.active {
      background: rgba(99, 102, 241, 0.12);
      color: #6366f1!important;
      box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.2) inset;
    }
  }
}

.pi{
  font-size: 16px;
}
</style>
