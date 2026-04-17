<template>
  <div class="image-viewer" :class="{ 'is-dark': isDark }">
    <!-- 顶部导航栏 -->
    <div class="viewer-header">
      <div class="header-left">
        <el-button text @click="$emit('close')" title="返回文件列表">
          <i class="pi pi-arrow-left"></i>
        </el-button>
        <div class="file-info">
          <span class="file-name">{{ fileName }}</span>
        </div>
      </div>
      <div class="header-actions">
        <el-button text @click="zoomOut" :disabled="zoomLevel <= 25" title="缩小">
          <i class="pi pi-search-minus"></i>
        </el-button>
        <span class="zoom-level" @click="resetZoom" title="点击重置">{{ zoomLevel }}%</span>
        <el-button text @click="zoomIn" :disabled="zoomLevel >= 500" title="放大">
          <i class="pi pi-search-plus"></i>
        </el-button>
        <el-button text @click="resetZoom" title="重置">
          <i class="pi pi-refresh"></i>
        </el-button>
      </div>
    </div>

    <!-- 图片显示区域 -->
    <div
      class="image-container"
      ref="containerRef"
      @wheel.prevent="handleWheel"
      @mousedown="startDrag"
      @mousemove="onDrag"
      @mouseup="endDrag"
      @mouseleave="endDrag"
    >
      <!-- 错误状态 -->
      <div v-if="error" class="error-overlay">
        <i class="pi pi-exclamation-triangle"></i>
        <span>图片加载失败</span>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-overlay">
        <i class="pi pi-spin pi-spinner"></i>
        <span>加载中...</span>
      </div>

      <!-- 图片 -->
      <img
        v-show="!loading && !error"
        ref="imageRef"
        :src="url"
        :alt="fileName"
        class="viewer-image"
        :style="imageStyle"
        @load="onImageLoad"
        @error="onImageError"
        draggable="false"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSettingStore } from '@/store/modules/setting'

const settingStore = useSettingStore()
const { isDark } = storeToRefs(settingStore)

interface Props {
  fileName: string
  url: string
  fileSize?: string
}

defineProps<Props>()

defineEmits<{
  close: []
}>()

const imageRef = ref<HTMLImageElement>()
const containerRef = ref<HTMLElement>()
const loading = ref(true)
const error = ref(false)

// 缩放百分比（100 = 图片宽度填满容器）
const zoomLevel = ref(100)
// 拖拽偏移（像素）
const panX = ref(0)
const panY = ref(0)
const isDragging = ref(false)
const lastMouseX = ref(0)
const lastMouseY = ref(0)

// 图片初始就是 width:100% 填满容器，缩放用 transform scale 基于此放大/缩小
// 平移用 translate，容器 overflow:hidden 不出滚动条
const imageStyle = computed(() => {
  const s = zoomLevel.value / 100
  return {
    transform: `translate(${panX.value}px, ${panY.value}px) scale(${s})`,
    transformOrigin: 'center center',
    cursor: isDragging.value ? 'grabbing' : (zoomLevel.value > 100 ? 'grab' : 'default'),
    transition: isDragging.value ? 'none' : 'transform 0.15s ease'
  }
})

const onImageLoad = () => {
  loading.value = false
  error.value = false
}

const onImageError = () => {
  error.value = true
  loading.value = false
}

const zoomIn = () => {
  if (zoomLevel.value < 500) {
    zoomLevel.value = Math.min(Math.round(zoomLevel.value * 1.25), 500)
  }
}

const zoomOut = () => {
  if (zoomLevel.value > 25) {
    zoomLevel.value = Math.max(Math.round(zoomLevel.value / 1.25), 25)
    if (zoomLevel.value <= 100) {
      panX.value = 0
      panY.value = 0
    }
  }
}

const resetZoom = () => {
  zoomLevel.value = 100
  panX.value = 0
  panY.value = 0
}

const handleWheel = (event: WheelEvent) => {
  if (event.deltaY < 0) {
    zoomIn()
  } else {
    zoomOut()
  }
}

const startDrag = (event: MouseEvent) => {
  if (zoomLevel.value <= 100) return
  isDragging.value = true
  lastMouseX.value = event.clientX
  lastMouseY.value = event.clientY
  event.preventDefault()
}

const onDrag = (event: MouseEvent) => {
  if (!isDragging.value) return
  panX.value += event.clientX - lastMouseX.value
  panY.value += event.clientY - lastMouseY.value
  lastMouseX.value = event.clientX
  lastMouseY.value = event.clientY
}

const endDrag = () => {
  isDragging.value = false
}
</script>

<style scoped lang="scss">
$light-bg: #ffffff;
$light-bg-secondary: #f5f5f5;
$light-border: rgba(0, 0, 0, 0.08);
$light-text: #1f2937;
$light-text-secondary: #6b7280;

$dark-bg: #18181b;
$dark-bg-secondary: #0f0f0f;
$dark-border: rgba(255, 255, 255, 0.08);
$dark-text: #f4f4f5;
$dark-text-secondary: #71717a;

.image-viewer {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: $light-bg;

  &.is-dark {
    background: $dark-bg;
  }
}

.viewer-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid $light-border;

  .is-dark & {
    border-bottom-color: $dark-border;
  }
}

.header-left {
  display: flex;
  align-items: center;

  .el-button {
    color: $light-text-secondary;
    margin-right: 12px;

    &:hover {
      color: $light-text;
    }
  }

  .file-info {
    .file-name {
      display: block;
      font-size: 14px;
      color: $light-text;
    }
  }

  .is-dark & {
    .el-button {
      color: $dark-text-secondary;

      &:hover {
        color: #fff;
      }
    }

    .file-info .file-name {
      color: $dark-text;
    }
  }
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;

  .el-button {
    color: $light-text-secondary;

    &:hover:not(:disabled) {
      color: $light-text;
    }

    &:disabled {
      opacity: 0.3;
    }
  }

  .zoom-level {
    font-size: 12px;
    color: $light-text-secondary;
    min-width: 40px;
    text-align: center;
    cursor: pointer;
    user-select: none;

    &:hover {
      color: $light-text;
    }
  }

  .is-dark & {
    .el-button {
      color: $dark-text-secondary;

      &:hover:not(:disabled) {
        color: #fff;
      }
    }

    .zoom-level {
      color: $dark-text-secondary;

      &:hover {
        color: #fff;
      }
    }
  }
}

.image-container {
  flex: 1;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: $light-bg-secondary;
  position: relative;

  .is-dark & {
    background: $dark-bg-secondary;
  }
}

.viewer-image {
  width: 100%;
  height: auto;
  user-select: none;
  display: block;
}

.loading-overlay,
.error-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: $light-bg-secondary;
  color: $light-text-secondary;

  > i {
    font-size: 24px;
    margin-bottom: 12px;
  }

  span {
    margin-bottom: 16px;
  }

  .is-dark & {
    background: $dark-bg-secondary;
    color: $dark-text-secondary;
  }
}

.error-overlay > i {
  color: #ef4444;
}
</style>
