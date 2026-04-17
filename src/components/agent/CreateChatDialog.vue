<template>
  <el-dialog
    v-model="dialogVisible"
    title="选择聊天对象"
    width="500px"
    :before-close="handleClose"
  >
    <div class="create-chat-dialog">
      <!-- 搜索框 -->
      <el-input
        v-model="searchKeyword"
        placeholder="搜索用户..."
        clearable
        class="search-input"
      >
        <template #prefix>
          <i class="pi pi-search"></i>
        </template>
      </el-input>

      <!-- 用户列表 -->
      <div class="user-list">
        <div
          v-for="user in filteredUsers"
          :key="user.user_id"
          class="user-item"
          @click="handleSelectUser(user)"
        >
          <div class="user-info">
            <div class="user-avatar">
              <i class="pi pi-user"></i>
            </div>
            <div class="user-details">
              <div class="user-name">{{ user.real_name || user.username }}</div>
              <div class="user-meta">{{ user.department || user.username }}</div>
            </div>
          </div>
          <i class="pi pi-angle-right"></i>
        </div>

        <!-- 空状态 -->
        <div v-if="filteredUsers.length === 0" class="empty-state">
          <i class="pi pi-users"></i>
          <div>{{ loading ? '加载中...' : '暂无可聊天用户' }}</div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { ChatUser } from './types'
import * as agentApi from './api'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'user-selected': [userId: number, userName: string]
}>()

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const searchKeyword = ref('')
const users = ref<ChatUser[]>([])
const loading = ref(false)

// 过滤用户列表
const filteredUsers = computed(() => {
  if (!searchKeyword.value) {
    return users.value
  }

  const keyword = searchKeyword.value.toLowerCase()
  return users.value.filter(user => {
    return (
      user.username.toLowerCase().includes(keyword) ||
      user.real_name?.toLowerCase().includes(keyword) ||
      user.department?.toLowerCase().includes(keyword)
    )
  })
})

// 加载用户列表
const loadUsers = async () => {
  loading.value = true
  try {
    users.value = await agentApi.getChatUsers()
  } catch (error: any) {
    ElMessage.error('加载用户列表失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

// 选择用户
const handleSelectUser = (user: ChatUser) => {
  emit('user-selected', user.user_id, user.real_name || user.username)
  handleClose()
}

// 关闭对话框
const handleClose = () => {
  searchKeyword.value = ''
  dialogVisible.value = false
}

// 监听对话框打开
watch(() => props.visible, (visible) => {
  if (visible) {
    loadUsers()
  }
})
</script>

<style scoped lang="scss">
.create-chat-dialog {
  .search-input {
    margin-bottom: 16px;
  }

  .user-list {
    max-height: 400px;
    overflow-y: auto;

    .user-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        background-color: var(--el-fill-color-light);
      }

      .user-info {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;

        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--el-color-primary-light-9);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--el-color-primary);
          font-size: 20px;
        }

        .user-details {
          flex: 1;

          .user-name {
            font-size: 14px;
            font-weight: 500;
            color: var(--el-text-color-primary);
            margin-bottom: 4px;
          }

          .user-meta {
            font-size: 12px;
            color: var(--el-text-color-secondary);
          }
        }
      }

      i.pi-angle-right {
        color: var(--el-text-color-placeholder);
        font-size: 16px;
      }
    }

    .empty-state {
      padding: 40px 20px;
      text-align: center;
      color: var(--el-text-color-secondary);

      i {
        font-size: 48px;
        margin-bottom: 12px;
        opacity: 0.5;
      }

      div {
        font-size: 14px;
      }
    }
  }
}
</style>
