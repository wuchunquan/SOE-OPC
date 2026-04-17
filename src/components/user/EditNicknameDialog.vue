<template>
  <el-dialog
    v-model="dialogVisible"
    title="修改姓名"
    width="400px"
    :close-on-click-modal="false"
  >
    <el-form :model="formData" :rules="rules" ref="formRef" label-width="80px">
      <el-form-item label="真实姓名" prop="realName">
        <el-input
          v-model="formData.realName"
          placeholder="请输入真实姓名"
          maxlength="20"
          show-word-limit
          clearable
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSave">
        保存
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useUserStore } from '@/store/modules/user'

defineOptions({ name: 'EditNicknameDialog' })

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'success'): void
}>()

const userStore = useUserStore()
const formRef = ref<FormInstance>()
const saving = ref(false)

const formData = ref({
  realName: ''
})

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => {
    emit('update:modelValue', val)
  }
})

// 监听对话框打开，初始化真实姓名
watch(dialogVisible, (val) => {
  if (val) {
    formData.value.realName = userStore.info.realName || ''
  }
})

const rules: FormRules = {
  realName: [
    { required: true, message: '请输入真实姓名', trigger: 'blur' },
    { min: 1, max: 20, message: '姓名长度为 1-20 个字符', trigger: 'blur' }
  ]
}

const handleSave = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()

    saving.value = true

    // 调用更新真实姓名接口
    await userStore.updateRealName(formData.value.realName)

    ElMessage.success('姓名修改成功')
    emit('success')
    handleCancel()
  } catch (error: any) {
    if (error !== false) {
      // false 表示表单验证失败，不需要显示错误消息
      ElMessage.error(error.message || '姓名修改失败')
    }
  } finally {
    saving.value = false
  }
}

const handleCancel = () => {
  dialogVisible.value = false
  formData.value.realName = ''
  formRef.value?.resetFields()
}
</script>

<style scoped lang="scss">
// 样式可以根据需要添加
</style>
