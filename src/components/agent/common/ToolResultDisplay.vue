<template>
  <div class="tool-result-display" :class="{ 'is-compact': compact }">
    <div class="result-card">
      <div class="result-header">
        <div class="header-left">
          <div class="result-icon">
            <i class="pi pi-check-circle"></i>
          </div>
          <span class="result-title">工具执行完成</span>
        </div>

        <!-- 操作按钮组 -->
        <div class="header-actions">
          <el-button
            v-if="hasTextContent"
            text
            size="small"
            class="action-btn"
            @click="copyResult"
            title="复制结果"
          >
            <i class="pi pi-copy"></i>
          </el-button>
          <el-button
            v-if="hasContent"
            text
            size="small"
            class="action-btn"
            @click="toggleDetails"
            :title="showDetails ? '收起详情' : '展开详情'"
          >
            <i :class="showDetails ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"></i>
          </el-button>
        </div>
      </div>

      <!-- 内容区域（可折叠） -->
      <transition name="expand">
        <div v-if="showDetails && hasContent" class="result-details">
          <div class="result-items">
            <div v-for="(item, index) in contentItems" :key="index" class="result-item">
              <!-- 文本内容 -->
              <div v-if="item.type === 'text'" class="result-text">
                <pre>{{ item.text }}</pre>
              </div>

              <!-- JSON 内容 -->
              <div v-else-if="item.type === 'json'" class="result-json">
                <pre>{{ formatJson(item.data) }}</pre>
              </div>

              <!-- 未知类型 -->
              <div v-else class="result-unknown">
                <pre>{{ JSON.stringify(item, null, 2) }}</pre>
              </div>
            </div>

            <!-- 空结果提示 -->
            <div v-if="contentItems.length === 0" class="result-empty">无输出</div>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'

interface ToolResultContent {
  type: string
  text?: string
  source?: any
  data?: any
}

interface Props {
  toolUseId?: string
  content: any[] | any
  compact?: boolean
}

const props = defineProps<Props>()

// 折叠状态 - 默认折叠
const showDetails = ref(false)

// 解析内容项
const contentItems = computed<ToolResultContent[]>(() => {
  const content = Array.isArray(props.content) ? props.content : [props.content]

  return content.map(item => {
    if (typeof item === 'string') {
      return { type: 'text', text: item }
    } else if (typeof item === 'object' && item !== null) {
      // 检查是否是文本
      if (item.type === 'text' && item.text) {
        return { type: 'text', text: item.text }
      }
      // 其他对象作为 JSON 展示
      else {
        return { type: 'json', data: item }
      }
    }
    return { type: 'unknown', data: item }
  })
})

// 是否有内容
const hasContent = computed(() => {
  return contentItems.value.length > 0
})

// 是否包含文本内容（用于显示复制按钮）
const hasTextContent = computed(() => {
  return contentItems.value.some(item => item.type === 'text')
})

// 切换展开/收起
const toggleDetails = () => {
  showDetails.value = !showDetails.value
}

// 格式化 JSON
const formatJson = (data: any) => {
  try {
    return JSON.stringify(data, null, 2)
  } catch (e) {
    return String(data)
  }
}

// 复制结果
const copyResult = async () => {
  const textContent = contentItems.value
    .filter(item => item.type === 'text')
    .map(item => item.text)
    .join('\n\n')

  if (textContent) {
    try {
      await navigator.clipboard.writeText(textContent)
      ElMessage.success('结果已复制到剪贴板')
    } catch (err) {
      console.error('Failed to copy:', err)
      ElMessage.error('复制失败')
    }
  }
}
</script>

<style scoped lang="scss">
.tool-result-display {
  margin-bottom: 10px;
}

// 紧凑模式（时间轴内）
.tool-result-display.is-compact {
  margin-bottom: 0;

  .result-card {
    padding: 0;
    border-left: none;
    background: transparent;
    border-radius: 0;
  }

  .result-icon {
    width: 20px;
    height: 20px;

    i { font-size: 13px; }
  }

  .header-left {
    gap: 8px;
  }

  .result-title {
    font-size: 13px;
  }
}

.result-card {
  padding: 10px 14px;
  border-radius: 0 6px 6px 0;
  transition: all 0.2s;
  border-left: 2px solid;
}

// 暗色模式
html.dark .result-card {
  background: rgba(16, 185, 129, 0.05);
  border-left-color: rgba(16, 185, 129, 0.3);

  .result-icon {
    color: #10b981;
  }
}

// 浅色模式
html:not(.dark) .result-card {
  background: rgba(16, 185, 129, 0.06);
  border-left-color: rgba(16, 185, 129, 0.4);

  .result-icon {
    color: #059669;
  }
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    min-width: 0;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }
}

.result-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.result-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  line-height: 1.4;
}

.action-btn {
  color: var(--el-text-color-secondary);

  &:hover {
    color: var(--el-text-color-primary);
  }
}

.result-details {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.result-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.result-item {
  pre {
    margin: 0;
    padding: 12px;
    // background: var(--el-fill-color);
    border-radius: 6px;
    font-size: 12px;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    color: var(--el-text-color-regular);
    line-height: 1.6;
    max-height: 400px;
    overflow: auto;
    white-space: pre-wrap;
    word-break: break-all;

    &::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }

    &::-webkit-scrollbar-track {
      // background: var(--el-fill-color-light);
      border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb {
      background: var(--el-border-color);
      border-radius: 3px;

      &:hover {
        background: var(--el-border-color-darker);
      }
    }
  }
}

.result-empty {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  font-style: italic;
  padding: 12px;
  text-align: center;
}

/* 展开动画 */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  max-height: 600px;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
  transform: translateY(-10px);
}

.expand-enter-to,
.expand-leave-from {
  max-height: 600px;
  opacity: 1;
  transform: translateY(0);
}
</style>
