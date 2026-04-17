<!-- 布局容器 -->
<template>
  <div class="app-layout">
    <aside id="app-sidebar">
      <ArtSidebarMenu />
    </aside>

    <main id="app-main">
      <div id="app-header">
        <ArtHeaderBar />
      </div>
      <div id="app-content">
        <ArtPageContent />
      </div>
    </main>

    <div id="app-global">
      <ArtGlobalComponent />
    </div>

    <!-- AI Agent 悬浮窗（仅在启用时显示） -->
    <AgentFloatWindow v-if="isAgentEnabled" />
  </div>
</template>

<script setup lang="ts">
  import AgentFloatWindow from '@/components/agent/AgentFloatWindow.vue'

  defineOptions({ name: 'AppLayout' })

  // 检查是否启用 AI Agent 功能
  const isAgentEnabled = import.meta.env.VITE_ENABLE_AGENT === 'true'
</script>

<style lang="scss" scoped>
  @use './style';
</style>
