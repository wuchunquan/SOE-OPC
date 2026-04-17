<template>
  <el-dialog
    v-model="dialogVisible"
    title="自动继续配置"
    width="400px"
    :close-on-click-modal="false"
  >
    <div class="auto-continue-config">
      <!-- 开关 -->
      <div class="config-item">
        <div class="config-label">
          <span>启用自动继续</span>
          <span class="config-desc">AI 回复完成后自动发送消息继续对话</span>
        </div>
        <el-switch v-model="config.enabled" />
      </div>

      <!-- 间隔时间 -->
      <div class="config-item" :class="{ disabled: !config.enabled }">
        <div class="config-label">
          <span>间隔时间（秒）</span>
          <span class="config-desc">AI 回复完成后等待多少秒发送下一条</span>
        </div>
        <el-input-number
          v-model="config.interval"
          :min="1"
          :max="300"
          :step="1"
          :disabled="!config.enabled"
          style="width: 120px"
        />
      </div>

      <!-- 回复内容 -->
      <div class="config-item" :class="{ disabled: !config.enabled }">
        <div class="config-label">
          <span>自动发送内容</span>
          <span class="config-desc">自动发送的消息内容</span>
        </div>
        <el-input
          v-model="config.message"
          type="textarea"
          :rows="3"
          placeholder="请输入自动发送的内容"
          :disabled="!config.enabled"
        />
      </div>

      <!-- 状态显示 -->
      <div v-if="config.enabled && agentStore.autoContinueStatus" class="status-info">
        <i class="pi pi-spin pi-spinner" v-if="agentStore.autoContinueStatus.waiting"></i>
        <span>{{ agentStore.autoContinueStatus.message }}</span>
      </div>
    </div>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, reactive, inject } from 'vue'
import { ElMessage } from 'element-plus'
import { useAgentStore as useDefaultStore } from './store'
import { AgentStoreKey } from './injection'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const agentStore = inject(AgentStoreKey, null) || useDefaultStore()

const dialogVisible = ref(false)

// 配置
const config = reactive({
  enabled: false,
  interval: 5,
  message: '继续'
})

// 同步 visible prop
watch(
  () => props.visible,
  (val) => {
    dialogVisible.value = val
    if (val) {
      // 打开时从 store 加载配置
      config.enabled = agentStore.autoContinueConfig.enabled
      config.interval = agentStore.autoContinueConfig.interval
      config.message = agentStore.autoContinueConfig.message
    }
  }
)

watch(dialogVisible, (val) => {
  emit('update:visible', val)
})

// 保存配置
const handleSave = () => {
  if (config.enabled && !config.message.trim()) {
    ElMessage.warning('请输入自动发送的内容')
    return
  }

  agentStore.setAutoContinueConfig({
    enabled: config.enabled,
    interval: config.interval,
    message: config.message.trim()
  })

  ElMessage.success('配置已保存')
  dialogVisible.value = false
}
</script>

<style scoped lang="scss">
.auto-continue-config {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.config-item {
  display: flex;
  flex-direction: column;
  gap: 8px;

  &.disabled {
    opacity: 0.5;
  }

  .config-label {
    display: flex;
    flex-direction: column;
    gap: 2px;

    > span:first-child {
      font-size: 14px;
      font-weight: 500;
      color: var(--el-text-color-primary);
    }

    .config-desc {
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }
  }
}

.status-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--el-color-primary-light-9);
  border-radius: 6px;
  font-size: 13px;
  color: var(--el-color-primary);

  i {
    font-size: 14px;
  }
}
</style>
