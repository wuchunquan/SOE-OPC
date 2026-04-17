<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '编辑应用' : '新建应用'"
    width="600px"
    @close="handleClose"
  >
    <el-form :model="formData" :rules="rules" ref="formRef" label-width="100px">
      <el-form-item label="应用名称" prop="name">
        <el-input
          v-model="formData.name"
          placeholder="请输入应用名称"
        />
      </el-form-item>

      <el-form-item label="应用地址" prop="url">
        <el-input
          v-model="formData.url"
          placeholder="https://example.com"
        />
      </el-form-item>

      <el-form-item label="应用描述">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="3"
          placeholder="请输入应用描述"
        />
      </el-form-item>

      <el-form-item label="应用图标">
        <el-upload
          :action="uploadUrl"
          :headers="uploadHeaders"
          :show-file-list="false"
          :before-upload="beforeIconUpload"
          :on-success="handleIconUpload"
          :on-error="handleIconError"
          accept="image/*"
        >
          <div class="icon-upload-box" :class="{ 'has-icon': formData.icon }">
            <img
              v-if="formData.icon"
              :src="formData.icon"
              alt="应用图标"
              class="icon-img"
            />
            <div v-else class="icon-placeholder">
              <el-icon :size="32"><Plus /></el-icon>
              <span>点击上传</span>
            </div>
            <div v-if="formData.icon" class="icon-overlay" @click.stop="handleRemoveIcon">
              <el-icon :size="24"><Delete /></el-icon>
            </div>
            <div v-if="uploading" class="icon-loading">
              <el-icon class="is-loading" :size="32"><Loading /></el-icon>
            </div>
          </div>
        </el-upload>
      </el-form-item>

      <el-form-item label="分类">
        <el-input
          v-model="formData.category"
          placeholder="如：办公、开发、数据"
        />
      </el-form-item>

      <el-form-item label="排序权重">
        <el-input-number
          v-model="formData.sort_order"
          :min="0"
          placeholder="数字越小越靠前"
        />
      </el-form-item>

      <el-form-item label="启用状态">
        <el-switch v-model="formData.is_enabled" />
      </el-form-item>

      <el-form-item label="打开方式">
        <el-switch
          v-model="formData.open_in_new_window"
          active-text="新窗口"
          inactive-text="iframe"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Delete, Loading } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import type { ExternalApp, ExternalAppCreate, ExternalAppUpdate } from '@/api/types/externalApp'
import { createExternalApp, updateExternalApp } from '@/api/externalApp'
import { useUserStore } from '@/store/modules/user'

const props = defineProps<{
  modelValue: boolean
  app?: ExternalApp
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'success': []
}>()

const userStore = useUserStore()

const visible = ref(props.modelValue)
const loading = ref(false)
const uploading = ref(false)
const isEdit = ref(false)
const formRef = ref<FormInstance>()

const uploadUrl = '/api/file/upload'
const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${userStore.accessToken}`
}))

const formData = ref<ExternalAppCreate>({
  name: '',
  url: '',
  description: '',
  icon: '',
  category: '',
  sort_order: 0,
  is_enabled: true,
  open_in_new_window: false
})

const rules: FormRules = {
  name: [
    { required: true, message: '请输入应用名称', trigger: 'blur' }
  ],
  url: [
    { required: true, message: '请输入应用地址', trigger: 'blur' },
    { type: 'url', message: '请输入有效的 URL 地址', trigger: 'blur' }
  ]
}

watch(
  () => props.modelValue,
  (val) => {
    visible.value = val
    if (val) {
      if (props.app) {
        isEdit.value = true
        formData.value = {
          name: props.app.name,
          url: props.app.url,
          description: props.app.description,
          icon: props.app.icon,
          category: props.app.category,
          sort_order: props.app.sort_order,
          is_enabled: props.app.is_enabled,
          open_in_new_window: props.app.open_in_new_window
        }
      } else {
        isEdit.value = false
        resetForm()
      }
    }
  }
)

watch(visible, (val) => {
  emit('update:modelValue', val)
})

function resetForm() {
  formData.value = {
    name: '',
    url: '',
    description: '',
    icon: '',
    category: '',
    sort_order: 0,
    is_enabled: true,
    open_in_new_window: false
  }
  formRef.value?.clearValidate()
}

function beforeIconUpload(file: File) {
  const isImage = file.type.startsWith('image/')
  const isLt1M = file.size / 1024 / 1024 < 1

  if (!isImage) {
    ElMessage.error('只能上传图片文件!')
    return false
  }
  if (!isLt1M) {
    ElMessage.error('图片大小不能超过 1MB!')
    return false
  }

  uploading.value = true
  return true
}

function handleIconUpload(response: any) {
  uploading.value = false
  if (response.url) {
    formData.value.icon = response.url
    ElMessage.success('图标上传成功')
  } else {
    ElMessage.error('图标上传失败：未返回文件地址')
  }
}

function handleIconError() {
  uploading.value = false
  ElMessage.error('图标上传失败，请重试')
}

function handleRemoveIcon() {
  formData.value.icon = ''
  ElMessage.success('图标已移除')
}

async function handleSubmit() {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true
    try {
      if (isEdit.value && props.app) {
        await updateExternalApp(props.app.id, formData.value as ExternalAppUpdate)
        ElMessage.success('应用更新成功')
      } else {
        await createExternalApp(formData.value)
        ElMessage.success('应用创建成功')
      }
      emit('success')
      handleClose()
    } catch (error: any) {
      ElMessage.error(error.message || '操作失败')
    } finally {
      loading.value = false
    }
  })
}

function handleClose() {
  visible.value = false
  resetForm()
}
</script>

<style scoped lang="scss">
.icon-upload-box {
  width: 100px;
  height: 100px;
  border: 2px dashed var(--el-border-color);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.3s;

  &:hover {
    border-color: var(--el-color-primary);
  }

  &.has-icon:hover .icon-overlay {
    opacity: 1;
  }
}

.icon-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.icon-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--el-text-color-placeholder);
  font-size: 14px;
}

.icon-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
  color: #fff;

  &:hover {
    background: rgba(0, 0, 0, 0.7);
  }
}

.icon-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-color-primary);
}
</style>
