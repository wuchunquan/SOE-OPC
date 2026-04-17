import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'

/**
 * 全屏功能 Composable
 * @param onFullscreenChange 全屏状态变化时的回调函数
 */
export function useFullscreen(onFullscreenChange?: () => void) {
  const containerRef = ref<HTMLElement>()
  const isFullscreen = ref(false)

  // 切换全屏
  const toggleFullscreen = async () => {
    if (!containerRef.value) return

    try {
      if (!document.fullscreenElement) {
        await containerRef.value.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (error) {
      console.error('全屏切换失败:', error)
    }
  }

  // 监听全屏状态变化
  const handleFullscreenChange = async () => {
    isFullscreen.value = !!document.fullscreenElement

    // 全屏切换后等待 DOM 更新
    await nextTick()

    // 执行回调
    if (onFullscreenChange) {
      // 延迟执行，确保全屏动画完成
      setTimeout(() => {
        onFullscreenChange()
      }, 100)
    }
  }

  onMounted(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('fullscreenchange', handleFullscreenChange)
  })

  return {
    containerRef,
    isFullscreen,
    toggleFullscreen
  }
}
