<template>
  <el-dialog
  class="html-prv-dialog"
    :model-value="modelValue"
    :title="title || fileName || 'HTML 预览'"
    width="80%"
    top="5vh"
    append-to-body
    destroy-on-close
    @close="emit('update:modelValue', false)"
  >
    <div class="html-preview-body">
      <iframe
        v-if="url"
        class="html-iframe"
        :src="url"
        sandbox="allow-scripts allow-same-origin"
      ></iframe>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
interface Props {
  modelValue: boolean
  url?: string
  fileName?: string
  title?: string
}

defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>
<style>
.el-dialog__body{
  padding: 0;
}

</style>
<style scoped lang="scss">
.html-preview-body {
  height: 75vh;
}

.html-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: #fff;
}
</style>
