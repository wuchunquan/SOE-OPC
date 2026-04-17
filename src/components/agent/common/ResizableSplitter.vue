<template>
  <div class="resizable-splitter" @mousedown="startDrag" @mouseenter="showCursor" @mouseleave="hideCursor">
    <div class="splitter-line"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

interface Props {
  minWidth?: number
  maxWidth?: number
  currentWidth: number
  direction?: 'left' | 'right'
}

const props = withDefaults(defineProps<Props>(), {
  minWidth: 200,
  maxWidth: 1600,
  currentWidth: 300,
  direction: 'left'
})

const emit = defineEmits<{
  resize: [width: number]
}>()

const isDragging = ref(false)
const startX = ref(0)
const startWidth = ref(0)

// 检测是否为深色模式
const isDarkMode = computed(() => document.documentElement.classList.contains('dark'))

// 浅色模式使用深色光标，深色模式使用浅色光标
const darkCursor = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%23333' d='M8 5v14l-4-4h-1v-6h1l4-4zm8 0l4 4h1v6h-1l-4 4v-14z'/%3E%3C/svg%3E") 12 12, col-resize`
const lightCursor = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%23fff' d='M8 5v14l-4-4h-1v-6h1l4-4zm8 0l4 4h1v6h-1l-4 4v-14z'/%3E%3C/svg%3E") 12 12, col-resize`

const getCursor = () => isDarkMode.value ? lightCursor : darkCursor

const startDrag = (event: MouseEvent) => {
  isDragging.value = true
  startX.value = event.clientX
  startWidth.value = props.currentWidth

  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  document.body.style.cursor = getCursor()
  document.body.style.userSelect = 'none'

  event.preventDefault()
}

const onDrag = (event: MouseEvent) => {
  if (!isDragging.value) return

  const deltaX = event.clientX - startX.value
  let newWidth

  if (props.direction === 'left') {
    newWidth = startWidth.value + deltaX
  } else {
    newWidth = startWidth.value - deltaX
  }

  newWidth = Math.max(props.minWidth, Math.min(props.maxWidth, newWidth))
  emit('resize', newWidth)
}

const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

const showCursor = () => {
  if (!isDragging.value) {
    document.body.style.cursor = getCursor()
  }
}

const hideCursor = () => {
  if (!isDragging.value) {
    document.body.style.cursor = ''
  }
}

onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
})
</script>

<style scoped lang="scss">
// 自定义光标 SVG
$dark-cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%23333' d='M8 5v14l-4-4h-1v-6h1l4-4zm8 0l4 4h1v6h-1l-4 4v-14z'/%3E%3C/svg%3E") 12 12, col-resize;
$light-cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%23fff' d='M8 5v14l-4-4h-1v-6h1l4-4zm8 0l4 4h1v6h-1l-4 4v-14z'/%3E%3C/svg%3E") 12 12, col-resize;

.resizable-splitter {
  position: relative;
  width: 1px;
  min-width: 1px;
  background: transparent;
  cursor: $light-cursor;
  flex-shrink: 0;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: -2px;
    right: -2px;
    cursor: $light-cursor;
  }
}

.splitter-line {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  background: rgba(255, 255, 255, 0.08);
  opacity: 0;
  transform: translateX(-50%);
}

.resizable-splitter:hover .splitter-line {
  opacity: 1;
}

// 浅色模式 - 使用深色光标
html:not(.dark) {
  .resizable-splitter {
    cursor: $dark-cursor;

    &::before {
      cursor: $dark-cursor;
    }
  }

  .splitter-line {
    background: #e5e7eb;
  }
}
</style>
