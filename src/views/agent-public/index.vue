<template>
  <div class="agent-public-page">
    <PublicChatContainer />
  </div>
</template>

<script setup lang="ts">
import PublicChatContainer from '@/components/publicAgent/PublicChatContainer.vue'

defineOptions({ name: 'AIAgentPublic' })
</script>

<style scoped lang="scss">
.agent-public-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #111111;
}

html:not(.dark) .agent-public-page {
  background: #f9fafb;
}
</style>
