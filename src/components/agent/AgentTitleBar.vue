<template>
  <!-- 仅在 Tauri 桌面环境下显示 -->
  <div v-if="isDesktopApp" class="agent-titlebar" ref="titlebarRef">
    <!-- 左侧 - 应用信息 -->
    <div class="titlebar-left">
      <div class="app-logo">
        <img src="/logo.png" alt="Logo" class="logo-image" />
      </div>
      <div class="app-title">{{ APP_NAME }}</div>
    </div>
    <div data-tauri-drag-region class="flex-1 w-full h-full"></div>
    <!-- 右侧 - 主题切换和窗口控制按钮 -->
    <div class="window-controls">
      <!-- 主题切换按钮 -->
      <el-button text class="control-btn theme-btn" @click="toggleTheme" :title="isDark ? '切换到浅色模式' : '切换到深色模式'">
        <i v-if="isDark" class="pi pi-sun"></i>
        <i v-else class="pi pi-moon"></i>
      </el-button>

      <!-- 窗口控制 -->
      <el-button text class="control-btn pin-btn" @click="toggleAlwaysOnTop" :title="isAlwaysOnTop ? '取消置顶' : '窗口置顶'" :class="{ active: isAlwaysOnTop }">
        <i class="pi pi-thumbtack"></i>
      </el-button>
      <el-button text class="control-btn" @click="minimizeWindow" title="最小化">
        <i class="pi pi-minus"></i>
      </el-button>
      <el-button text class="control-btn" @click="maximizeWindow" title="最大化/还原">
        <i class="pi pi-window-maximize"></i>
      </el-button>
      <el-button text class="control-btn close-btn" @click="closeWindow" title="关闭">
        <i class="pi pi-times"></i>
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { isTauriEnv } from '@/utils/env'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useSettingStore } from '@/store/modules/setting'
import { useTheme } from '@/hooks/core/useTheme'
import { APP_NAME } from '@/config/appInfo'
import { storeToRefs } from 'pinia'
import { SystemThemeEnum } from '@/enums/appEnum'
import { ref, onMounted } from 'vue'

// 检测是否为 Tauri 桌面应用环境
const isDesktopApp = isTauriEnv()

// 主题状态
const settingStore = useSettingStore()
const { isDark } = storeToRefs(settingStore)
const { switchThemeStyles } = useTheme()

// 获取当前窗口实例（仅在Tauri环境下）
let appWindow: any = null
if (isDesktopApp) {
  appWindow = getCurrentWindow()
}

// 置顶状态
const isAlwaysOnTop = ref(false)

// 初始化置顶状态
onMounted(async () => {
  if (appWindow) {
    isAlwaysOnTop.value = await appWindow.isAlwaysOnTop()
  }
})

// 切换主题
const toggleTheme = () => {
  const newTheme = isDark.value ? SystemThemeEnum.LIGHT : SystemThemeEnum.DARK
  switchThemeStyles(newTheme)
}

const minimizeWindow = async () => {
  if (appWindow) {
    await appWindow.minimize()
  }
}

const maximizeWindow = async () => {
  if (appWindow) {
    const isMaximized = await appWindow.isMaximized()
    if (isMaximized) {
      await appWindow.unmaximize()
    } else {
      await appWindow.maximize()
    }
  }
}

const closeWindow = async () => {
  if (appWindow) {
    // 隐藏窗口到托盘，而不是关闭应用
    await appWindow.hide()
  }
}

// 切换置顶
const toggleAlwaysOnTop = async () => {
  if (appWindow) {
    isAlwaysOnTop.value = !isAlwaysOnTop.value
    await appWindow.setAlwaysOnTop(isAlwaysOnTop.value)
  }
}
</script>

<style scoped lang="scss">
.agent-titlebar {
  height: 48px;
  background: #18181b;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  flex-shrink: 0;
  app-region: drag;
  -webkit-app-region: drag;
  -webkit-user-select: none;
  user-select: none;
}

.titlebar-left {
  display: flex;
  align-items: center;
  gap: 12px;

  .app-logo {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;

    .logo-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  }

  .app-title {
    font-size: 14px;
    font-weight: 600;
    color: white;
    opacity: 0.7;
  }
}

.window-controls {
  display: flex;
  align-items: center;
  gap: 0px;
  app-region: no-drag;
  -webkit-app-region: no-drag;

  .control-btn {
    width: 32px;
    height: 32px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    color: #a1a1aa;
    transition: all 0.2s;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
      color: white;
    }

    &.theme-btn {

      &:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fbbf24;
      }
    }

    &.pin-btn.active {
      color: #3b82f6;
    }

    &.close-btn:hover {
      background: #ef4444;
      color: white;
    }
  }
}

// 浅色模式
html:not(.dark) .agent-titlebar {
  background: #ffffff;
  border-bottom-color: #e5e7eb;

  .titlebar-left .app-title {
    color: #111827;
  }

  .window-controls .control-btn {
    color: #6b7280;

    &:hover {
      background: #f3f4f6;
      color: #111827;
    }

    &.theme-btn:hover {
      background: #f3f4f6;
      color: #f59e0b;
    }

    &.pin-btn.active {
      color: #3b82f6;
    }

    &.close-btn:hover {
      background: #ef4444;
      color: white;
    }
  }
}
</style>
