<template>
  <div class="art-page-container">
    <!-- 系统配置列表 -->
    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="card-header">
          <el-icon :size="18" style="margin-right: 8px;">
            <Setting />
          </el-icon>
          <span class="card-title">系统配置列表</span>
        </div>
      </template>
      <div class="table-wrapper">
        <el-table v-loading="loading" :data="configs" height="100%" stripe>
          <el-table-column type="index" label="序号" width="70" align="center" />
          <el-table-column prop="definition.label" label="配置名称" width="180" >
            <template #default="{ row }">
              <div class="config-name-cell">
                <ArtSvgIcon :icon="row.definition.icon || 'ri:settings-line'" :size="16" color="#409eff" />
                <span>{{ row.definition.label }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="definition.description" label="配置说明" align="left" show-overflow-tooltip />
          <el-table-column prop="definition.group" label="配置分组" width="120" align="center">
            <template #default="{ row }">
              <el-tag :type="getGroupType(row.definition.group)" size="small">
                {{ getGroupLabel(row.definition.group) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150" align="center" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" size="small" :icon="Edit" @click="handleEdit(row)">
                编辑配置
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <!-- 配置编辑对话框 -->
    <el-dialog
      v-model="showEditDialog"
      :title="currentConfig?.definition.label"
      width="600px"
      destroy-on-close
    >
      <ConfigForm
        v-if="currentConfig"
        ref="configFormRef"
        :definition="currentConfig.definition"
        :value="currentConfig.value"
      />

      <!-- NewAPI 模型列表 -->
      <div v-if="currentConfig?.definition.key === 'newapi_service'" class="model-list-section">
        <div class="model-list-header">
          <!-- <span class="model-list-title">已同步模型 ({{ syncedModels.length }})</span> -->
          <el-button size="small" :loading="syncing" @click="handleSyncModels">
            同步模型
          </el-button>
        </div>
        <!-- <el-table
          v-if="syncedModels.length > 0"
          :data="syncedModels"
          size="small"
          max-height="240"
          stripe
        >
          <el-table-column prop="model_name" label="模型名称" show-overflow-tooltip />
          <el-table-column prop="vendor_name" label="厂商" width="120" show-overflow-tooltip />
        </el-table>
        <div v-else class="model-list-empty">暂无模型，请点击"同步模型"从 NewAPI 拉取</div> -->
      </div>

      <template #footer>
        <div class="dialog-footer">
          <div class="footer-left">
            <el-button
              v-if="currentConfig?.definition.key === 'ai_service'"
              :loading="testing"
              @click="handleTest"
            >
              测试连接
            </el-button>
          </div>
          <div class="footer-right">
            <el-button @click="showEditDialog = false">取消</el-button>
            <el-button type="primary" :loading="saving" @click="handleSave">
              保存
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Edit, Setting } from '@element-plus/icons-vue'
import { getAllDefinitions, getAllValues, updateConfig, testConfig } from '@/api/sys/config'
import type { ConfigDefinition, ConfigValue, ConfigWithDefinition } from '@/api/sys/config'
import http from '@/utils/http'
import ConfigForm from './components/ConfigForm.vue'

defineOptions({ name: 'SystemConfig' })

const loading = ref(false)
const definitions = ref<Record<string, ConfigDefinition>>({})
const values = ref<Record<string, ConfigValue>>({})

// 合并定义和值
const configs = computed<ConfigWithDefinition[]>(() => {
  return Object.keys(definitions.value).map(key => ({
    definition: definitions.value[key],
    value: values.value[key] || {},
    updated_at: undefined
  })).sort((a, b) => a.definition.order - b.definition.order)
})

// 获取分组标签
const getGroupLabel = (group: string) => {
  const labelMap: Record<string, string> = {
    basic: '基础配置',
    integration: '集成配置',
    notification: '通知配置',
    advanced: '高级配置'
  }
  return labelMap[group] || group
}

// 获取分组标签类型
const getGroupType = (group: string) => {
  const typeMap: Record<string, any> = {
    basic: 'primary',
    integration: 'success',
    notification: 'warning',
    advanced: 'info'
  }
  return typeMap[group] || 'info'
}

// 加载配置
const loadConfigs = async () => {
  loading.value = true
  try {
    const [defsRes, valsRes] = await Promise.all([
      getAllDefinitions(),
      getAllValues()
    ])
    definitions.value = defsRes
    values.value = valsRes
  } catch (error: any) {
    console.error('加载配置失败:', error)
    ElMessage.error(error.message || '加载配置失败')
  } finally {
    loading.value = false
  }
}

// 编辑配置
const showEditDialog = ref(false)
const currentConfig = ref<ConfigWithDefinition | null>(null)
const configFormRef = ref()

const handleEdit = (config: ConfigWithDefinition) => {
  currentConfig.value = config
  showEditDialog.value = true
  // 如果是 NewAPI 配置，加载已同步模型
  if (config.definition.key === 'newapi_service') {
    loadSyncedModels()
  }
}

// NewAPI 已同步模型
const syncedModels = ref<{ model_name: string; vendor_name: string }[]>([])

// 保存配置
const saving = ref(false)
const handleSave = async () => {
  if (!configFormRef.value || !currentConfig.value) return

  const valid = await configFormRef.value.validate()
  if (!valid) return

  const formValue = configFormRef.value.getFormValue()

  saving.value = true
  try {
    await updateConfig(currentConfig.value.definition.key, formValue)
    ElMessage.success('配置保存成功')
    showEditDialog.value = false
    await loadConfigs()
  } catch (error: any) {
    console.error('保存配置失败:', error)
    ElMessage.error(error.message || '保存配置失败')
  } finally {
    saving.value = false
  }
}

// 测试配置
const testing = ref(false)
const handleTest = async () => {
  if (!configFormRef.value || !currentConfig.value) return

  const valid = await configFormRef.value.validate()
  if (!valid) return

  const formValue = configFormRef.value.getFormValue()

  testing.value = true
  try {
    const result = await testConfig(currentConfig.value.definition.key, formValue)
    if (result.success) {
      ElMessage.success(result.message || '测试成功')
    } else {
      ElMessage.error(result.message || '测试失败')
    }
  } catch (error: any) {
    console.error('测试失败:', error)
    ElMessage.error(error.message || '测试失败')
  } finally {
    testing.value = false
  }
}

// 同步 NewAPI 模型
const syncing = ref(false)

const loadSyncedModels = async () => {
  try {
    const result = await http.get({ url: '/api/agent/newapi/models' })
    syncedModels.value = result.data || []
  } catch {
    syncedModels.value = []
  }
}

const handleSyncModels = async () => {
  syncing.value = true
  try {
    const result = await http.post({ url: '/api/agent/newapi/admin/sync-models' })
    if (result.success) {
      ElMessage.success(result.message || '同步成功')
      await loadSyncedModels()
    } else {
      ElMessage.error(result.message || '同步失败')
    }
  } catch (error: any) {
    console.error('同步失败:', error)
    ElMessage.error(error.message || '同步失败')
  } finally {
    syncing.value = false
  }
}

onMounted(() => {
  loadConfigs()
})
</script>

<style scoped lang="scss">
.art-page-container {
  height: calc(100vh - 119px);
  overflow: auto;
  display: flex;
  flex-direction: column;
  padding: 16px;
  padding-bottom: 8px;
  box-sizing: border-box;
}

.table-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .card-header {
    display: flex;
    align-items: center;
    font-weight: 500;
    font-size: 16px;
  }

  :deep(.el-card__body) {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 16px;
  }

  .table-wrapper {
    flex: 1;
    overflow: hidden;
  }
}

.config-name-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;

  .footer-left {
    flex: 0 0 auto;
  }

  .footer-right {
    flex: 0 0 auto;
    display: flex;
    gap: 8px;
  }
}

.model-list-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.model-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.model-list-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.model-list-empty {
  text-align: center;
  padding: 24px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
</style>
