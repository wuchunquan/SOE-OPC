<template>
  <div class="config-card">
    <!-- 卡片头部 -->
    <div class="card-header">
      <div class="header-left">
        <ArtSvgIcon v-if="definition.icon" :icon="definition.icon" class="config-icon" />
        <div class="header-info">
          <div class="config-title">{{ definition.label }}</div>
          <div v-if="definition.description" class="config-desc">{{ definition.description }}</div>
        </div>
      </div>
      <div class="header-right">
        <el-button
          v-if="!editing"
          type="primary"
          size="small"
          @click="handleEdit"
        >
          <ArtSvgIcon icon="ri:edit-line" style="margin-right: 4px" />
          编辑
        </el-button>
        <template v-else>
          <el-button size="small" @click="handleCancel">取消</el-button>
          <el-button
            v-if="definition.key === 'ai_service'"
            size="small"
            :loading="testing"
            @click="handleTest"
          >
            测试连接
          </el-button>
          <el-button
            type="primary"
            size="small"
            :loading="saving"
            @click="handleSave"
          >
            保存
          </el-button>
        </template>
      </div>
    </div>

    <!-- 卡片内容 -->
    <div class="card-body">
      <ConfigForm
        v-if="editing"
        ref="formRef"
        :definition="definition"
        v-model:value="editValue"
      />
      <div v-else class="config-display">
        <div
          v-for="field in definition.fields"
          :key="field.key"
          class="display-item"
        >
          <span class="item-label">{{ field.label }}:</span>
          <span class="item-value">{{ formatValue(field, value[field.key]) }}</span>
        </div>
      </div>
    </div>

    <!-- 更新时间 -->
    <div v-if="updatedAt" class="card-footer">
      <span class="update-time">最后更新: {{ formatDateTime(updatedAt) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { ConfigDefinition, ConfigValue, ConfigFieldDefinition } from '@/api/sys/config'
import { updateConfig, testConfig } from '@/api/sys/config'
import ConfigForm from './ConfigForm.vue'

const props = defineProps<{
  definition: ConfigDefinition
  value: ConfigValue
  updatedAt?: string
}>()

const emit = defineEmits<{
  saved: []
}>()

const editing = ref(false)
const editValue = ref<ConfigValue>({})
const formRef = ref()
const saving = ref(false)
const testing = ref(false)

const handleEdit = () => {
  editValue.value = { ...props.value }
  editing.value = true
}

const handleCancel = () => {
  editing.value = false
  editValue.value = {}
}

const handleSave = async () => {
  // 验证表单
  const valid = await formRef.value?.validate()
  if (!valid) {
    return
  }

  saving.value = true
  try {
    await updateConfig(props.definition.key, editValue.value)
    ElMessage.success('配置保存成功')
    editing.value = false
    emit('saved')
  } catch (error: any) {
    console.error('保存配置失败:', error)
    ElMessage.error(error.message || '保存配置失败')
  } finally {
    saving.value = false
  }
}

const handleTest = async () => {
  // 先验证表单
  const valid = await formRef.value?.validate()
  if (!valid) {
    return
  }

  testing.value = true
  try {
    const result = await testConfig(props.definition.key, editValue.value)
    if (result.success) {
      ElMessage.success(result.message)
    } else {
      ElMessage.error(result.message)
    }
  } catch (error: any) {
    console.error('测试配置失败:', error)
    ElMessage.error(error.message || '测试配置失败')
  } finally {
    testing.value = false
  }
}

const formatValue = (field: ConfigFieldDefinition, value: any) => {
  if (value === null || value === undefined) {
    return '-'
  }

  // 敏感信息显示为星号
  if (field.sensitive && value === '********') {
    return '********'
  }

  // 开关类型
  if (field.type === 'switch') {
    return value ? '开启' : '关闭'
  }

  // 选择类型
  if (field.type === 'select' && field.options) {
    const option = field.options.find(opt => opt.value === value)
    return option ? option.label : value
  }

  return value
}

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}
</script>

<style scoped>
.config-card {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  gap: 16px;
}

.header-left {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex: 1;
}

.config-icon {
  font-size: 32px;
  color: var(--el-color-primary);
  flex-shrink: 0;
  margin-top: 2px;
}

.header-info {
  flex: 1;
}

.config-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 4px;
}

.config-desc {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.header-right {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.card-body {
  padding: 20px;
}

.config-display {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.display-item {
  display: flex;
  gap: 8px;
}

.item-label {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

.item-value {
  font-size: 14px;
  color: var(--el-text-color-primary);
  font-weight: 500;
  word-break: break-all;
}

.card-footer {
  padding: 12px 20px;
  background: var(--el-fill-color-lighter);
  border-top: 1px solid var(--el-border-color-lighter);
}

.update-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
