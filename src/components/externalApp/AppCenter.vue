<template>
  <div class="app-center-page">
    <!-- 头部 -->
    <div class="app-center-header">
      <div class="header-content">
        <div class="header-left">
          <i class="pi pi-th-large header-icon"></i>
          <div>
            <h1 class="header-title">应用中心</h1>
            <p class="header-subtitle">快速访问常用应用和系统</p>
          </div>
        </div>
        <div class="header-right">
          <el-button
            v-if="isAdmin"
            plain
            @click="showManagement = true"
          >
         配置
          </el-button>
          <!-- <el-input
            v-model="searchQuery"
            placeholder="搜索应用..."
            :prefix-icon="Search"
            class="search-input"
            clearable
          /> -->
        </div>
      </div>
    </div>

    <!-- 分类标签 -->
    <div v-if="categories.length > 1" class="category-tabs">
      <div
        v-for="cat in categories"
        :key="cat"
        class="category-tab"
        :class="{ active: selectedCategory === cat }"
        @click="selectedCategory = cat"
      >
        {{ cat || '全部' }}
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="app-center-content">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <i class="pi pi-spin pi-spinner"></i>
        <span>加载中...</span>
      </div>

      <!-- 应用浏览器 -->
      <div v-else-if="selectedApp" class="app-browser-container">
        <AppBrowser :app="selectedApp" @close="selectedApp = null" />
      </div>

      <!-- 应用列表 -->
      <div v-else-if="filteredApps.length > 0" class="apps-grid">
        <div
          v-for="app in filteredApps"
          :key="app.id"
          class="app-card"
          @click="handleAppClick(app)"
        >
          <div class="app-card-header">
            <div class="app-icon">
              <img v-if="app.icon" :src="app.icon" :alt="app.name" />
              <i v-else class="pi pi-box"></i>
            </div>
            <div class="app-meta">
              <div class="app-title-row">
                <h3 class="app-name">{{ app.name }}</h3>
                <span v-if="app.category" class="app-tag category">
                  {{ app.category }}
                </span>
              </div>
              <p v-if="app.description" class="app-description">{{ app.description }}</p>
              <p v-else class="app-description empty">暂无描述</p>
              <div v-if="app.open_in_new_window" class="app-tags">
                <span class="app-tag">
                  <i class="pi pi-external-link"></i>
                  新窗口
                </span>
              </div>
            </div>
          </div>

          <div class="app-card-footer">
            <div class="app-url">
              <i class="pi pi-link"></i>
              <span>{{ formatUrl(app.url) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-state">
        <i class="pi pi-inbox"></i>
        <h3>{{ searchQuery ? '未找到匹配的应用' : '还没有应用' }}</h3>
        <p v-if="!searchQuery">请联系管理员添加应用</p>
        <p v-else>尝试使用其他关键词搜索</p>
      </div>
    </div>

    <!-- 应用配置弹窗 -->
    <el-dialog
      v-model="showManagement"
      title="应用配置"
      width="90%"
      top="5vh"
      :close-on-click-modal="false"
    >
      <AppManagement @success="handleManagementSuccess" />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Search, Setting } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { ExternalApp } from '@/api/types/externalApp'
import { getExternalApps } from '@/api/externalApp'
import { useUserStore } from '@/store/modules/user'
import AppBrowser from './AppBrowser.vue'
import AppManagement from './AppManagement.vue'

const userStore = useUserStore()
const loading = ref(false)
const allApps = ref<ExternalApp[]>([])
const selectedApp = ref<ExternalApp | null>(null)
const searchQuery = ref('')
const selectedCategory = ref('')
const showManagement = ref(false)

// 判断是否是管理员
const isAdmin = computed(() => {
  const roles = userStore.info.roles || []
  return roles.some(role => role.code === 'admin' || role.code === 'super_admin')
})

const categories = computed(() => {
  const cats = new Set<string>([''])
  allApps.value.forEach(app => {
    if (app.category) {
      cats.add(app.category)
    }
  })
  return Array.from(cats)
})

const filteredApps = computed(() => {
  let apps = allApps.value

  // 分类筛选
  if (selectedCategory.value) {
    apps = apps.filter(app => app.category === selectedCategory.value)
  }

  // 搜索筛选
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    apps = apps.filter(app =>
      app.name.toLowerCase().includes(query) ||
      app.description?.toLowerCase().includes(query) ||
      app.url.toLowerCase().includes(query)
    )
  }

  return apps
})

onMounted(async () => {
  await loadApps()
})

async function loadApps() {
  loading.value = true
  try {
    allApps.value = await getExternalApps(true)
  } catch (error: any) {
    ElMessage.error(error.message || '加载应用列表失败')
  } finally {
    loading.value = false
  }
}

function handleAppClick(app: ExternalApp) {
  if (app.open_in_new_window) {
    window.open(app.url, '_blank')
  } else {
    selectedApp.value = app
  }
}

function formatUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname
  } catch {
    return url
  }
}

function handleManagementSuccess() {
  // 配置更新后重新加载应用列表
  loadApps()
}
</script>

<style scoped lang="scss">
.app-center-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #18181b;
  overflow: hidden;
}

.app-center-header {
  padding: 8px 12px;
  border-bottom: 1px solid #27272a;
  background: #18181b;
  flex-shrink: 0;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  font-size: 20px;
  color: #60a5fa;
}

.header-title {
  font-size: 20px;
  font-weight: 600;
  color: #f4f4f5;
  margin: 0;
}

.header-subtitle {
  display: none;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-input {
  width: 240px;
}

.category-tabs {
  display: flex;
  gap: 8px;
  padding: 4px;
  border-bottom: 1px solid #27272a;
  background: #18181b;
  overflow-x: auto;
  flex-shrink: 0;
}

.category-tab {
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 14px;
  color: #a1a1aa;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  user-select: none;

  &:hover {
    background: #27272a;
    color: #e4e4e7;
  }

  &.active {
    background: rgba(59, 130, 246, 0.15);
    color: #60a5fa;
    font-weight: 500;
  }
}

.app-center-content {
  flex: 1;
  overflow-y: auto;
  padding: 6px 6px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: #71717a;
  gap: 12px;

  i {
    font-size: 32px;
  }
}

.app-browser-container {
  height: 100%;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #27272a;
}

.apps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 6px;
}

.app-card {
  background: #1f1f23;
  border: 1px solid #27272a;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #3f3f46;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  }
}

.app-card-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.app-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: rgba(59, 130, 246, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  i {
    font-size: 28px;
    color: #60a5fa;
  }
}

.app-meta {
  flex: 1;
  min-width: 0;
}

.app-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.app-name {
  font-size: 16px;
  font-weight: 600;
  color: #f4f4f5;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.app-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.app-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  background: #27272a;
  color: #a1a1aa;
  flex-shrink: 0;

  &.category {
    background: rgba(59, 130, 246, 0.15);
    color: #60a5fa;
  }

  i {
    font-size: 11px;
  }
}

.app-description {
  font-size: 14px;
  line-height: 1.6;
  color: #a1a1aa;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;

  &.empty {
    color: #52525b;
    font-style: italic;
  }
}

.app-card-footer {
  padding-top: 12px;
  border-top: 1px solid #27272a;
}

.app-url {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #71717a;
  font-family: 'Courier New', monospace;

  i {
    font-size: 14px;
  }

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;

  i {
    font-size: 64px;
    color: #3f3f46;
    margin-bottom: 24px;
  }

  h3 {
    font-size: 20px;
    font-weight: 600;
    color: #d4d4d8;
    margin: 0 0 12px 0;
  }

  p {
    font-size: 14px;
    color: #71717a;
    margin: 0;
  }
}

// 浅色模式
html:not(.dark) {
  .app-center-page {
    background: #f9fafb;
  }

  .app-center-header {
    border-bottom-color: #e5e7eb;
    background: #ffffff;

    .header-icon {
      color: #3b82f6;
    }

    .header-title {
      color: #111827;
    }

    .header-subtitle {
      color: #6b7280;
    }
  }

  .category-tabs {
    border-bottom-color: #e5e7eb;
    background: #ffffff;
  }

  .category-tab {
    color: #6b7280;

    &:hover {
      background: #f3f4f6;
      color: #111827;
    }

    &.active {
      background: rgba(59, 130, 246, 0.1);
      color: #3b82f6;
    }
  }

  .app-browser-container {
    border-color: #e5e7eb;
  }

  .app-card {
    background: #ffffff;
    border-color: #e5e7eb;

    &:hover {
      border-color: #d1d5db;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
  }

  .app-icon {
    background: rgba(59, 130, 246, 0.1);

    i {
      color: #3b82f6;
    }
  }

  .app-name {
    color: #111827;
  }

  .app-tag {
    background: #f3f4f6;
    color: #6b7280;

    &.category {
      background: rgba(59, 130, 246, 0.1);
      color: #3b82f6;
    }
  }

  .app-description {
    color: #374151;

    &.empty {
      color: #9ca3af;
    }
  }

  .app-card-footer {
    border-top-color: #e5e7eb;
  }

  .app-url {
    color: #6b7280;
  }

  .empty-state {
    i {
      color: #d1d5db;
    }

    h3 {
      color: #111827;
    }

    p {
      color: #6b7280;
    }
  }

  .loading-state {
    color: #6b7280;
  }
}
</style>
