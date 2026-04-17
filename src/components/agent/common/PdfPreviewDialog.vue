<template>
  <el-dialog
    class="pdf-prv-dialog"
    :model-value="modelValue"
    :title="title || fileName || 'PDF 预览'"
    width="80%"
    top="5vh"
    append-to-body
    destroy-on-close
    @close="emit('update:modelValue', false)"
  >
    <div class="pdf-preview-body">
      <div v-if="loading" class="state">
        <i class="pi pi-spin pi-spinner"></i>
        <span>加载中...</span>
      </div>

      <div v-else-if="error" class="state error">
        <i class="pi pi-exclamation-triangle"></i>
        <span>{{ error }}</span>
        <el-button size="small" @click="handleOpen">重试</el-button>
      </div>

      <iframe
        v-else
        class="pdf-iframe"
        :src="url"
      ></iframe>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  modelValue: boolean
  url?: string
  fileName?: string
  title?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const loading = ref(false)
const error = ref('')

const handleOpen = () => {
  if (!props.url) {
    error.value = '缺少预览链接'
    return
  }
  loading.value = true
  error.value = ''
  setTimeout(() => {
    loading.value = false
  }, 300)
}

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      handleOpen()
    }
  }
)
</script>

<style scoped lang="scss">
.pdf-preview-body {
  height: 75vh;
}

.state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-secondary);

  > i {
    font-size: 24px;
    margin-bottom: 12px;
  }

  span {
    margin-bottom: 12px;
  }
}

.state.error > i {
  color: #ef4444;
}

.pdf-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: #fff;
}
</style>
