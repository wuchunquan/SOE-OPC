<template>
  <div class="app-list">
    <div v-if="loading" class="flex justify-center p-4">
      <el-icon class="is-loading" :size="32">
        <Loading />
      </el-icon>
    </div>

    <div v-else-if="apps.length === 0" class="text-center p-4 text-gray-500">
      暂无应用
    </div>

    <div v-else class="app-grid">
      <div
        v-for="app in apps"
        :key="app.id"
        class="app-item"
        @click="handleAppClick(app)"
      >
        <div class="app-icon">
          <img v-if="app.icon" :src="app.icon" :alt="app.name" />
          <el-icon v-else :size="48" class="text-gray-400">
            <Box />
          </el-icon>
        </div>
        <div class="app-name">{{ app.name }}</div>
        <div v-if="app.description" class="app-desc">{{ app.description }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Loading, Box } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { ExternalApp } from '@/api/types/externalApp'
import { getExternalApps } from '@/api/externalApp'

const emit = defineEmits<{
  'app-click': [app: ExternalApp]
}>()

const loading = ref(false)
const apps = ref<ExternalApp[]>([])

onMounted(() => {
  loadApps()
})

async function loadApps() {
  loading.value = true
  try {
    const data = await getExternalApps(true) // 只获取启用的应用
    apps.value = data
  } catch (error: any) {
    ElMessage.error(error.message || '加载应用列表失败')
  } finally {
    loading.value = false
  }
}

defineExpose({
  loadApps
})
</script>

<style scoped>
.app-list {
  padding: 1rem;
}

.app-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 1.5rem;
}

.app-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.app-item:hover {
  background-color: var(--el-fill-color-light);
  transform: translateY(-2px);
}

.app-icon {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
  border-radius: 12px;
  overflow: hidden;
  background-color: var(--el-fill-color);
}

.app-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.app-name {
  font-weight: 600;
  text-align: center;
  margin-bottom: 0.25rem;
  font-size: 0.9rem;
}

.app-desc {
  font-size: 0.75rem;
  color: var(--el-text-color-secondary);
  text-align: center;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
