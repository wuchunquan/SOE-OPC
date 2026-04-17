<template>
  <div class="art-page-container agent-page" :class="{ 'is-tauri': isTauri }">
    <AgentFullPage />
  </div>
</template>

<script setup lang="ts">
import AgentFullPage from '@/components/agent/AgentFullPage.vue'
import { isTauriEnv } from '@/utils/env'

defineOptions({ name: 'AIAgent' })

// 检测是否为Tauri环境
const isTauri = isTauriEnv()
</script>

<style scoped lang="scss">
.agent-page {
  height: calc(100vh - 119px);
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
  box-sizing: border-box;
  border-radius: 8px;
  border: 1px solid var(--el-border-color);

  // Tauri环境样式
  &.is-tauri {
    height: 100vh;
    border: none;
    border-radius: 0;
  }
}

// 暗色模式边框
html.dark .agent-page {
  border-color: rgba(255, 255, 255, 0.13);

  &.is-tauri {
    border: none;
  }
}
</style>
