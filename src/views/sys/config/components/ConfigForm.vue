<template>
  <el-form
    ref="formRef"
    :model="formData"
    :rules="formRules"
    label-width="120px"
    label-position="left"
  >
    <FieldRenderer
      v-for="field in definition.fields"
      :key="field.key"
      :field="field"
      v-model="formData[field.key]"
    />
  </el-form>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import type { ConfigDefinition, ConfigValue } from '@/api/sys/config'
import FieldRenderer from './FieldRenderer.vue'

const props = defineProps<{
  definition: ConfigDefinition
  value: ConfigValue
}>()

const emit = defineEmits<{
  'update:value': [value: ConfigValue]
}>()

const formRef = ref<FormInstance>()
const formData = ref<ConfigValue>({})

// 初始化表单数据（用字段默认值填充缺失的 key）
const initFormData = (value: ConfigValue) => {
  const data: ConfigValue = { ...value }
  props.definition.fields.forEach(field => {
    if (data[field.key] === undefined || data[field.key] === null) {
      data[field.key] = field.default ?? (field.type === 'number' ? 0 : field.type === 'switch' ? false : '')
    }
  })
  return data
}

watch(() => props.value, (newVal) => {
  formData.value = initFormData(newVal)
}, { immediate: true })

// 监听表单数据变化，向上传递
watch(formData, (newVal) => {
  emit('update:value', newVal)
}, { deep: true })

// 动态生成表单验证规则
const formRules = computed<FormRules>(() => {
  const rules: FormRules = {}

  props.definition.fields.forEach(field => {
    const fieldRules: any[] = []

    // 必填验证
    if (field.required) {
      fieldRules.push({
        required: true,
        message: `请输入${field.label}`,
        trigger: ['blur', 'change']
      })
    }

    // 自定义规则
    if (field.rules) {
      field.rules.forEach(rule => {
        if (rule.pattern) {
          fieldRules.push({
            pattern: new RegExp(rule.pattern),
            message: rule.message,
            trigger: 'blur'
          })
        }
      })
    }

    if (fieldRules.length > 0) {
      rules[field.key] = fieldRules
    }
  })

  return rules
})

// 暴露验证方法
const validate = async () => {
  if (!formRef.value) return false
  try {
    await formRef.value.validate()
    return true
  } catch {
    return false
  }
}

// 暴露重置方法
const resetFields = () => {
  formRef.value?.resetFields()
}

// 暴露获取表单值的方法
const getFormValue = () => {
  return formData.value
}

defineExpose({
  validate,
  resetFields,
  getFormValue
})
</script>
