<template>
  <el-dialog
    v-model="dialogVisible"
    title="更换头像"
    width="500px"
    :close-on-click-modal="false"
  >
    <div class="avatar-upload-container">
      <div class="avatar-preview">
        <img
          :src="previewUrl || userStore.info.avatar || defaultAvatar"
          alt="头像预览"
          class="avatar-img"
        />
      </div>

      <el-upload
        ref="uploadRef"
        :action="uploadUrl"
        :headers="uploadHeaders"
        :show-file-list="false"
        :before-upload="beforeUpload"
        :on-success="handleUploadSuccess"
        :on-error="handleUploadError"
        accept="image/*"
      >
        <el-button type="primary" :loading="uploading">
          <ArtSvgIcon icon="ri:upload-2-line" class="mr-1" />
          选择图片
        </el-button>
      </el-upload>

      <div class="upload-tip">
        支持 JPG、PNG、GIF 格式，文件不超过 5MB
      </div>
    </div>

    <template #footer>
      <el-button @click="handleCancel">取消</el-button>
      <el-button
        type="primary"
        :disabled="!currentAvatarUrl || uploading"
        :loading="saving"
        @click="handleSave"
      >
        保存
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { UploadInstance } from 'element-plus'
import { useUserStore } from '@/store/modules/user'
import defaultAvatarImg from '@/assets/images/user/avatar.png'

defineOptions({ name: 'AvatarUploadDialog' })

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'success'): void
}>()

const userStore = useUserStore()
const uploadRef = ref<UploadInstance>()
const uploading = ref(false)
const saving = ref(false)
const previewUrl = ref('')
const currentAvatarUrl = ref('')

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => {
    emit('update:modelValue', val)
    // 打开弹窗时，初始化为当前用户头像
    if (val && userStore.info.avatar) {
      console.log(userStore.info.avatar,'xxxxxxx')
      previewUrl.value = userStore.info.avatar
    }
  }
})

const defaultAvatar = defaultAvatarImg
const uploadUrl = '/api/file/upload'  // 使用新的文件上传接口
const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${userStore.accessToken}`
}))

const beforeUpload = (file: File) => {
  const isImage = file.type.startsWith('image/')
  const isLt5M = file.size / 1024 / 1024 < 5

  if (!isImage) {
    ElMessage.error('只能上传图片文件！')
    return false
  }
  if (!isLt5M) {
    ElMessage.error('图片大小不能超过 5MB！')
    return false
  }

  uploading.value = true
  return true
}

const handleUploadSuccess = (response: any) => {
  uploading.value = false
  if (response.url) {
    currentAvatarUrl.value = response.url
    // 使用相对路径即可，浏览器会自动拼接当前域名
    previewUrl.value = response.url
    ElMessage.success('图片上传成功')
  } else {
    ElMessage.error('上传失败，请重试')
  }
}

const handleUploadError = () => {
  uploading.value = false
  ElMessage.error('上传失败，请重试')
}

const handleSave = async () => {
  if (!currentAvatarUrl.value) {
    ElMessage.warning('请先上传图片')
    return
  }

  try {
    saving.value = true
    await userStore.updateAvatar(currentAvatarUrl.value)
    ElMessage.success('头像更新成功')
    emit('success')
    handleCancel()
  } catch (error: any) {
    ElMessage.error(error.message || '头像更新失败')
  } finally {
    saving.value = false
  }
}

const handleCancel = () => {
  dialogVisible.value = false
  previewUrl.value = ''
  currentAvatarUrl.value = ''
  uploading.value = false
  saving.value = false
}
</script>

<style scoped lang="scss">
.avatar-upload-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
}

.avatar-preview {
  width: 150px;
  height: 150px;
  margin-bottom: 30px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid var(--el-border-color);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.upload-tip {
  margin-top: 15px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-align: center;
}
</style>
