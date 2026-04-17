<template>
  <div class="art-page-container">
    <!-- 搜索和操作 -->
    <el-card shadow="never" class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <div class="search-form-left">
          <el-form-item label="搜索">
            <el-input
              v-model="searchForm.search"
              placeholder="应用名称/地址"
              clearable
              style="width: 240px"
              @keyup.enter="handleSearch"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="resetSearch">重置</el-button>
          </el-form-item>
           <el-form-item>
            <el-button type="primary" @click="handleCreate">
              <el-icon class="mr-1">
                <Plus />
              </el-icon>
              新建应用
            </el-button>
          </el-form-item>
        </div>
      </el-form>
    </el-card>

    <!-- 应用列表 -->
    <el-card shadow="never" class="table-card flex w-full">
      <div class="table-wrapper" v-loading="loading">
        <el-table :data="apps" style="width: 100%" stripe border height="100%">
          <el-table-column prop="id" label="ID" width="70" align="center" />

          <el-table-column label="图标" width="80" align="center">
            <template #default="{ row }">
              <el-image
                v-if="row.icon"
                :src="row.icon"
                style="width: 40px; height: 40px; border-radius: 6px"
                fit="cover"
              />
              <el-icon v-else :size="32" class="text-gray-400">
                <Box />
              </el-icon>
            </template>
          </el-table-column>

          <el-table-column prop="name" label="应用名称" min-width="150" />

          <el-table-column prop="url" label="应用地址" min-width="200" show-overflow-tooltip />

          <el-table-column prop="category" label="分类" width="120">
            <template #default="{ row }">
              {{ row.category || '-' }}
            </template>
          </el-table-column>

          <el-table-column prop="sort_order" label="排序" width="80" align="center" />

          <el-table-column label="打开方式" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="row.open_in_new_window ? 'info' : 'success'" size="small">
                {{ row.open_in_new_window ? '新窗口' : 'iframe' }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="状态" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="row.is_enabled ? 'success' : 'danger'" size="small">
                {{ row.is_enabled ? '启用' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="200" fixed="right" align="center">
            <template #default="{ row }">
              <el-button
                type="primary"
                link
                size="small"
                @click="handleEdit(row)"
              >
                编辑
              </el-button>
              <el-button
                type="info"
                link
                size="small"
                @click="handleOpen(row)"
              >
                打开
              </el-button>
              <el-button
                type="danger"
                link
                size="small"
                @click="handleDelete(row)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadApps"
          @current-change="loadApps"
        />
      </div>
    </el-card>

    <ExternalAppDialog
      v-model="dialogVisible"
      :app="currentApp"
      @success="handleSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Plus, Box } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { ExternalApp } from '@/api/types/externalApp'
import { getExternalApps, deleteExternalApp } from '@/api/externalApp'
import ExternalAppDialog from './ExternalAppDialog.vue'

const emit = defineEmits<{
  'success': []
}>()

const loading = ref(false)
const allApps = ref<ExternalApp[]>([])
const apps = ref<ExternalApp[]>([])
const dialogVisible = ref(false)
const currentApp = ref<ExternalApp>()

const searchForm = reactive({
  search: '',
  category: '',
  is_enabled: undefined as boolean | undefined
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const categories = computed(() => {
  const cats = new Set<string>()
  allApps.value.forEach(app => {
    if (app.category) {
      cats.add(app.category)
    }
  })
  return Array.from(cats)
})

onMounted(() => {
  loadApps()
})

async function loadApps() {
  loading.value = true
  try {
    const data = await getExternalApps(false) // 获取所有应用（包括禁用的）
    allApps.value = data

    // 应用筛选
    let filtered = [...data]

    if (searchForm.search) {
      const query = searchForm.search.toLowerCase()
      filtered = filtered.filter(app =>
        app.name.toLowerCase().includes(query) ||
        app.url.toLowerCase().includes(query) ||
        app.description?.toLowerCase().includes(query)
      )
    }

    if (searchForm.category) {
      filtered = filtered.filter(app => app.category === searchForm.category)
    }

    if (searchForm.is_enabled !== undefined) {
      filtered = filtered.filter(app => app.is_enabled === searchForm.is_enabled)
    }

    // 更新总数
    pagination.total = filtered.length

    // 分页
    const start = (pagination.page - 1) * pagination.pageSize
    const end = start + pagination.pageSize
    apps.value = filtered.slice(start, end)
  } catch (error: any) {
    ElMessage.error(error.message || '加载应用列表失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  loadApps()
}

function resetSearch() {
  searchForm.search = ''
  searchForm.category = ''
  searchForm.is_enabled = undefined
  pagination.page = 1
  loadApps()
}

function handleCreate() {
  currentApp.value = undefined
  dialogVisible.value = true
}

function handleEdit(app: ExternalApp) {
  currentApp.value = app
  dialogVisible.value = true
}

function handleOpen(app: ExternalApp) {
  window.open(app.url, '_blank')
}

function handleDelete(app: ExternalApp) {
  ElMessageBox.confirm(
    `确定要删除应用"${app.name}"吗？`,
    '确认删除',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      await deleteExternalApp(app.id)
      ElMessage.success('应用删除成功')
      loadApps()
    } catch (error: any) {
      ElMessage.error(error.message || '删除失败')
    }
  }).catch(() => {
    // 用户取消
  })
}

function handleSuccess() {
  loadApps()
  emit('success')
}
</script>

<style scoped>
.art-page-container {
  padding: 0;
  height: 70vh;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.search-card {
  flex-shrink: 0;
  margin-bottom: 16px;
}

.search-form {
  flex-wrap: wrap;
  gap: 8px;
  align-items: flex-start;
}

.search-form-left {
  display: inline-block;
  flex-wrap: wrap;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.search-form-right {
  flex-shrink: 0;
}

.search-form :deep(.el-form-item) {
  margin-bottom: 0;
}

@media (max-width: 1200px) {
  .search-form {
    flex-direction: column;
  }

  .search-form-left {
    width: 100%;
  }

  .search-form-right {
    width: 100%;
    display: inline-block;
    justify-content: flex-end;
  }
}

.table-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.table-card :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.table-wrapper {
  flex: 1;
  overflow: hidden;
}

.pagination-wrapper {
  flex-shrink: 0;
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
