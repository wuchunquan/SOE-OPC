<template>
  <el-form-item
    :label="field.label"
    :required="field.required"
    :prop="field.key"
  >
    <!-- 输入框 -->
    <el-input
      v-if="field.type === 'input'"
      v-model="proxyValue"
      :placeholder="field.placeholder"
      clearable
    />

    <!-- 密码输入框 -->
    <el-input
      v-else-if="field.type === 'password'"
      v-model="proxyValue"
      :type="showPassword ? 'text' : 'password'"
      :placeholder="field.placeholder"
      clearable
    >
      <template #suffix>
        <el-icon class="cursor-pointer" @click="showPassword = !showPassword">
          <component :is="showPassword ? 'View' : 'Hide'" />
        </el-icon>
      </template>
    </el-input>

    <!-- 数字输入 -->
    <el-input
      v-else-if="field.type === 'number'"
      v-model.number="proxyValue"
      type="number"
      :placeholder="field.placeholder || String(field.default ?? '')"
      :min="field.min"
      :max="field.max"
      style="width: 100%"
    />

    <!-- 下拉选择 -->
    <el-select
      v-else-if="field.type === 'select'"
      v-model="proxyValue"
      :placeholder="field.placeholder"
      clearable
      style="width: 100%"
    >
      <el-option
        v-for="opt in field.options"
        :key="opt.value"
        :label="opt.label"
        :value="opt.value"
      />
    </el-select>

    <!-- 开关 -->
    <el-switch
      v-else-if="field.type === 'switch'"
      v-model="proxyValue"
    />

    <!-- 模型选择（从已同步模型中选） -->
    <el-select
      v-else-if="field.type === 'model_select'"
      v-model="proxyValue"
      :placeholder="field.placeholder"
      clearable
      filterable
      :loading="modelOptionsLoading"
      style="width: 100%"
    >
      <el-option
        v-for="m in modelOptions"
        :key="m.model_name"
        :label="m.vendor_name ? `${m.model_name} (${m.vendor_name})` : m.model_name"
        :value="m.model_name"
      />
    </el-select>

    <!-- 多行文本 -->
    <el-input
      v-else-if="field.type === 'textarea'"
      v-model="proxyValue"
      type="textarea"
      :rows="field.rows || 3"
      :placeholder="field.placeholder"
    />

    <!-- 帮助文本 -->
    <div v-if="field.help" class="field-help">
      <ArtSvgIcon icon="ri:information-line" class="help-icon" />
      {{ field.help }}
    </div>
  </el-form-item>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { ConfigFieldDefinition } from '@/api/sys/config'
import { View, Hide } from '@element-plus/icons-vue'
import http from '@/utils/http'

const props = defineProps<{
  field: ConfigFieldDefinition
  modelValue: any
}>()

const emit = defineEmits<{
  'update:modelValue': [value: any]
}>()

const showPassword = ref(false)

// 模型选择下拉数据
const modelOptions = ref<{ model_name: string; vendor_name: string }[]>([])
const modelOptionsLoading = ref(false)

onMounted(async () => {
  if (props.field.type === 'model_select') {
    modelOptionsLoading.value = true
    try {
      const result = await http.get({ url: '/api/agent/newapi/models' })
      modelOptions.value = result.data || []
    } catch { /* ignore */ }
    finally {
      modelOptionsLoading.value = false
    }
  }
})

// 直接用 computed 做 v-model 代理，不再用中间 ref
const proxyValue = computed({
  get: () => {
    const val = props.modelValue
    if (props.field.type === 'number') {
      return typeof val === 'number' ? val : (val !== undefined && val !== null && val !== '' ? Number(val) : props.field.default ?? 0)
    }
    return val
  },
  set: (val) => {
    emit('update:modelValue', val)
  }
})
</script>

<style scoped>
.field-help {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.help-icon {
  font-size: 14px;
  color: var(--el-color-info);
  flex-shrink: 0;
}

.cursor-pointer {
  cursor: pointer;
}

/* 隐藏 number input 的默认上下箭头 */
:deep(input[type="number"]::-webkit-outer-spin-button),
:deep(input[type="number"]::-webkit-inner-spin-button) {
  -webkit-appearance: none;
  margin: 0;
}
:deep(input[type="number"]) {
  -moz-appearance: textfield;
}
</style>
