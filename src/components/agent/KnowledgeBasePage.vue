<template>
  <div class="knowledge-base-page" :class="{ 'is-dark': isDark }">
    <FileManager
      :role-id="selectedRoleId"
      :role-info="selectedRole"
      @role-select="showRoleSelector = true"
    />

    <!-- 角色选择对话框 -->
    <el-dialog
      v-model="showRoleSelector"
      title="选择角色知识库"
      width="500px"
      :close-on-click-modal="true"
    >
      <div class="role-selector">
        <!-- 我的知识库选项 -->
        <div
          class="role-option"
          :class="{ active: !selectedRoleId }"
          @click="selectRole(null)"
        >
          <div class="role-avatar">
            <i class="pi pi-user"></i>
          </div>
          <div class="role-info">
            <div class="role-name">我的知识库</div>
            <div class="role-desc">个人文件存储</div>
          </div>
          <i v-if="!selectedRoleId" class="pi pi-check check-icon"></i>
        </div>

        <!-- 系统预设（仅管理员可见） -->
        <div v-if="isAdmin && systemRoles.length > 0" class="role-divider">
          <span>系统预设</span>
        </div>
        <template v-if="isAdmin">
          <div
            v-for="role in systemRoles"
            :key="role.role_id"
            class="role-option"
            :class="{ active: selectedRoleId === role.role_id }"
            @click="selectRole(role)"
          >
            <div class="role-avatar" :style="{ background: 'rgba(0,0,0,0.0)' }">
              <img v-if="role.avatar_url" :src="role.avatar_url" :alt="role.name" />
              <i v-else class="pi pi-android"></i>
            </div>
            <div class="role-info">
              <div class="role-name">{{ role.name }}</div>
              <div class="role-desc">{{ role.description || '系统预设角色' }}</div>
            </div>
            <i v-if="selectedRoleId === role.role_id" class="pi pi-check check-icon"></i>
          </div>
        </template>

        <!-- 分隔线 -->
        <div v-if="userRoles.length > 0" class="role-divider">
          <span>自定义角色</span>
        </div>

        <!-- 角色列表 -->
        <div
          v-for="role in userRoles"
          :key="role.role_id"
          class="role-option"
          :class="{ active: selectedRoleId === role.role_id }"
          @click="selectRole(role)"
        >
          <div class="role-avatar" :style="{ background:  'rgba(0,0,0,0.0)' }">
            <img v-if="role.avatar_url" :src="role.avatar_url" :alt="role.name" />
            <i v-else class="pi pi-android"></i>
          </div>
          <div class="role-info">
            <div class="role-name">{{ role.name }}</div>
            <div class="role-desc">{{ role.description || '自定义角色' }}</div>
          </div>
          <i v-if="selectedRoleId === role.role_id" class="pi pi-check check-icon"></i>
        </div>

        <!-- 空状态 -->
        <div v-if="userRoles.length === 0 && !loadingRoles" class="empty-roles">
          <i class="pi pi-info-circle"></i>
          <span>暂无自定义角色</span>
        </div>

        <!-- 加载中 -->
        <div v-if="loadingRoles" class="loading-roles">
          <i class="pi pi-spin pi-spinner"></i>
          <span>加载中...</span>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useSettingStore } from '@/store/modules/setting'
import { useUserStore } from '@/store/modules/user'
import { ElMessage } from 'element-plus'
import http from '@/utils/http'
import FileManager from './file/KnowledgeBaseFileManager.vue'

const settingStore = useSettingStore()
const { isDark } = storeToRefs(settingStore)

const userStore = useUserStore()
const isAdmin = computed(() => {
  const userInfo = userStore.getUserInfo
  if (!userInfo?.roles) return false
  return userInfo.roles.some((r: any) => r.code === 'admin')
})

// 角色信息接口
interface RoleInfo {
  role_id: string
  name: string
  avatar_url?: string
  color?: string
}

// 角色选择相关
const showRoleSelector = ref(false)
const selectedRoleId = ref<string | null>(null)
const selectedRole = ref<RoleInfo | null>(null)
const allRoles = ref<any[]>([])
const systemRoles = computed(() => allRoles.value.filter((r: any) => r.is_system))
const userRoles = computed(() => allRoles.value.filter((r: any) => !r.is_system))
const loadingRoles = ref(false)

// 获取用户自定义角色列表
const fetchUserRoles = async () => {
  loadingRoles.value = true
  try {
    const response = await http.get({
      url: '/api/agent/roles/'
    })
    const rolesArray = Array.isArray(response) ? response : []
    allRoles.value = rolesArray
  } catch (error) {
    console.error('Failed to fetch roles:', error)
    ElMessage.error('获取角色列表失败')
  } finally {
    loadingRoles.value = false
  }
}

// 选择角色
const selectRole = (role: any | null) => {
  if (role) {
    selectedRoleId.value = role.role_id
    selectedRole.value = {
      role_id: role.role_id,
      name: role.name,
      avatar_url: role.avatar_url,
      color: role.color
    }
  } else {
    selectedRoleId.value = null
    selectedRole.value = null
  }
  showRoleSelector.value = false
}

onMounted(() => {
  fetchUserRoles()
})
</script>

<style scoped lang="scss">
.knowledge-base-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #111111;
}

html:not(.dark) .knowledge-base-page {
  background: #f9fafb;
}

.role-selector {
  max-height: 400px;
  overflow-y: auto;
}

.role-option {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  margin-bottom: 4px;

  &:hover {
    background: rgba(0, 0, 0, 0.04);
  }

  &.active {
    background: rgba(59, 130, 246, 0.1);
  }

  .is-dark & {
    &:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    &.active {
      background: rgba(59, 130, 246, 0.2);
    }
  }
}

.role-avatar {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: #3b82f6;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  flex-shrink: 0;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  i {
    font-size: 18px;
    color: white;
  }
}

.role-info {
  flex: 1;
  min-width: 0;
}

.role-name {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 2px;

  .is-dark & {
    color: #f4f4f5;
  }
}

.role-desc {
  font-size: 12px;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  .is-dark & {
    color: #71717a;
  }
}

.check-icon {
  color: #3b82f6;
  font-size: 16px;
  margin-left: 8px;
}

.role-divider {
  display: flex;
  align-items: center;
  margin: 12px 0;
  color: #9ca3af;
  font-size: 12px;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(0, 0, 0, 0.08);
  }

  span {
    padding: 0 12px;
  }

  .is-dark & {
    color: #71717a;

    &::before,
    &::after {
      background: rgba(255, 255, 255, 0.08);
    }
  }
}

.empty-roles,
.loading-roles {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: #9ca3af;
  font-size: 14px;
  gap: 8px;

  .is-dark & {
    color: #71717a;
  }
}
</style>
