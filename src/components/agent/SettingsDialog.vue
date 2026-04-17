<template>
  <el-dialog
  class="settingsdialog"
    v-model="dialogVisible"
    title="设置"
    width="500px"
    :close-on-click-modal="false"
  >
    <div class="settings-container">
      <!-- 用户信息区域 -->
      <div class="user-info-section">
        <div class="user-avatar-large" @click="handleUserClick" title="设置头像">
          <img
            v-if="userStore.info.avatar"
            :src="userStore.info.avatar"
            alt="用户头像"
            class="avatar-img"
          />
          <i v-else class="pi pi-user"></i>
        </div>
        <div class="user-details">
          <div class="user-name-row">
            <div class="user-name">{{ displayName }}</div>
            <el-button
              text
              size="small"
              class="edit-btn"
              @click="showChangePasswordDialog = true"
              title="修改密码"
            >
              <i class="pi pi-key"></i>
            </el-button>
            <el-button
              text
              size="small"
              class="edit-btn"
              @click="handleEditNickname"
              title="编辑昵称"
            >
              <i class="pi pi-pencil"></i>
            </el-button>

          </div>
          <div class="user-email">{{ userStore.info.email || '' }}</div>
        </div>
      </div>

      <el-divider />

      <!-- 设置项列表 -->
      <div class="settings-list">
        <!-- 剩余额度 -->
        <div v-if="!selfUseMode && quotaStore.state.remainQuota !== null" class="setting-item setting-item-switch">
          <div class="setting-icon">
            <i class="pi pi-wallet"></i>
          </div>
          <div class="setting-content">
            <div class="setting-title">剩余额度</div>
            <div class="setting-desc">已用 {{ quotaStore.state.usedQuota?.toFixed(2) }} 元</div>
          </div>
          <div class="setting-action quota-value">
            {{ quotaStore.state.remainQuota?.toFixed(2) }} 元
          </div>
        </div>

        <!-- 邀请码 -->
        <div v-if="!selfUseMode && userStore.info.inviteCode" class="setting-item setting-item-switch">
          <div class="setting-icon">
            <i class="pi pi-gift"></i>
          </div>
          <div class="setting-content">
            <div class="setting-title">我的邀请码：<span class="invite-code">{{ userStore.info.inviteCode }}</span></div>
            <div class="setting-desc">分享好友注册，双方均可获得额外额度</div>
          </div>
          <div class="setting-action">
            <el-button text size="small" @click="copyInviteLink" title="分享邀请链接">
              <i class="pi pi-share-alt"></i>
            </el-button>
          </div>
        </div>

        <!-- 消息通知设置 - 仅在Tauri环境下显示 -->
        <div v-if="isTauri" class="setting-item setting-item-switch">
          <div class="setting-icon">
            <i class="pi pi-bell"></i>
          </div>
          <div class="setting-content">
            <div class="setting-title">消息通知</div>
            <div class="setting-desc">窗口隐藏时接收新消息通知</div>
          </div>
          <div class="setting-action">
            <el-switch v-model="notificationEnabled" @change="handleNotificationChange" />
          </div>
        </div>

        <!-- 托盘闪烁设置 - 仅在Tauri环境下且通知开启时显示 -->
        <div v-if="isTauri && notificationEnabled" class="setting-item setting-item-switch sub-setting">
          <div class="setting-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <!-- 托盘底座 -->
              <rect x="3" y="18" width="18" height="3" rx="1" fill="currentColor"/>
              <!-- 应用图标 -->
              <rect x="8" y="8" width="8" height="8" rx="2" fill="currentColor"/>
              <!-- 闪烁光芒 -->
              <circle cx="18" cy="6" r="3" fill="currentColor" opacity="0.8"/>
              <line x1="18" y1="1" x2="18" y2="3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <line x1="22" y1="6" x2="20" y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <line x1="21" y1="3" x2="19.5" y2="4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="setting-content">
            <div class="setting-title">托盘闪烁</div>
            <div class="setting-desc">有新消息时托盘图标闪烁提醒</div>
          </div>
          <div class="setting-action">
            <el-switch v-model="trayBlinkEnabled" @change="handleTrayBlinkChange" />
          </div>
        </div>

        <!-- 自用模式下恢复模型配置入口，关闭 NewAPI 网关依赖 -->
        <div v-if="selfUseMode" class="setting-item" @click="showLocalProviderDialog = true">
          <div class="setting-icon">
            <i class="pi pi-server"></i>
          </div>
          <div class="setting-content">
            <div class="setting-title">模型配置</div>
            <div class="setting-desc">管理 AI 模型提供商和模型</div>
          </div>
          <div class="setting-action">
            <i class="pi pi-angle-right"></i>
          </div>
        </div>

        <!-- MCP 工具配置 -->
        <div v-if="isAdmin" class="setting-item" @click="showMcpDialog = true">
          <div class="setting-icon">
            <i class="pi pi-box"></i>
          </div>
          <div class="setting-content">
            <div class="setting-title">MCP 工具配置</div>
            <div class="setting-desc">管理 AI 可用的外部工具服务</div>
          </div>
          <div class="setting-action">
            <i class="pi pi-angle-right"></i>
          </div>
        </div>

        <!-- 渠道配置 -->
        <!-- 已按当前分支需求临时隐藏渠道配置入口，保留组件文件但不在前端暴露。 -->
        <!--
        <div class="setting-item" @click="showChannelDialog = true">
          <div class="setting-icon">
            <i class="pi pi-comments"></i>
          </div>
          <div class="setting-content">
            <div class="setting-title">渠道配置</div>
            <div class="setting-desc">管理企业微信、钉钉等消息渠道</div>
          </div>
          <div class="setting-action">
            <i class="pi pi-angle-right"></i>
          </div>
        </div>
        -->

        <!-- 退出登录 -->
        <div class="setting-item" @click="handleLogout">
          <div class="setting-icon">
            <i class="pi pi-sign-out"></i>
          </div>
          <div class="setting-content">
            <div class="setting-title">退出登录</div>
            <div class="setting-desc">退出当前账号</div>
          </div>
          <div class="setting-action">
            <i class="pi pi-angle-right"></i>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="dialogVisible = false">关闭</el-button>
    </template>

    <!-- Provider 管理弹窗 -->
    <ProviderDialog v-model="showLocalProviderDialog" :base-url="settingsBaseUrl" />

    <!-- MCP 工具管理弹窗 -->
    <McpDialog v-model="showMcpDialog" :base-url="settingsBaseUrl" />

    <!-- 渠道管理弹窗 -->
    <!-- 已按当前分支需求临时隐藏渠道配置入口，保留组件文件但不在前端挂载。 -->
    <!-- <ChannelDialog v-model="showChannelDialog" :base-url="settingsBaseUrl" /> -->

    <!-- 编辑昵称对话框 -->
    <EditNicknameDialog v-model="showEditNicknameDialog" @success="handleNicknameUpdateSuccess" />

    <!-- 头像上传对话框 -->
    <AvatarUploadDialog v-model="showAvatarDialog" @success="handleAvatarUploadSuccess" />

    <!-- 修改密码对话框 -->
    <el-dialog
      v-model="showChangePasswordDialog"
      title="修改密码"
      width="400px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form ref="passwordFormRef" :model="passwordForm" :rules="passwordRules" label-width="80px">
        <el-form-item label="旧密码" prop="oldPassword">
          <el-input v-model="passwordForm.oldPassword" type="password" show-password placeholder="请输入旧密码" />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="passwordForm.newPassword" type="password" show-password placeholder="请输入新密码" />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="passwordForm.confirmPassword" type="password" show-password placeholder="请再次输入新密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showChangePasswordDialog = false">取消</el-button>
        <el-button type="primary" :loading="changingPassword" @click="handleChangePassword">确定</el-button>
      </template>
    </el-dialog>

  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, reactive, onMounted, watch } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/modules/user'
import { isTauriEnv } from '@/utils/env'
import {
  getNotificationSettings,
  saveNotificationSettings,
  requestNotificationPermission
} from '@/utils/notification'
import EditNicknameDialog from '@/components/user/EditNicknameDialog.vue'
import AvatarUploadDialog from '@/components/user/AvatarUploadDialog.vue'
import ProviderDialog from './ProviderDialog.vue'
import McpDialog from './McpDialog.vue'
// import ChannelDialog from './ChannelDialog.vue'
import { useQuotaStore } from './quotaStore'
import http from '@/utils/http'
import { getLocalApiBaseUrl } from '@/utils/env'
import { isSelfUseMode } from '@/utils/runtime-mode'
defineOptions({ name: 'SettingsDialog' })

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const router = useRouter()
const isTauri = isTauriEnv()
const selfUseMode = isSelfUseMode()
// Tauri 桌面端走本地地址，浏览器端走相对路径
const settingsBaseUrl = getLocalApiBaseUrl()
const userStore = useUserStore()
const isAdmin = computed(() => {
  if (isTauri) return true
  const userInfo = userStore.getUserInfo
  if (!userInfo?.roles) return false
  return userInfo.roles.some((r: any) => r.code === 'admin')
})
const showEditNicknameDialog = ref(false)
const showAvatarDialog = ref(false)
const showChangePasswordDialog = ref(false)
const showLocalProviderDialog = ref(false)
const showMcpDialog = ref(false)
// const showChannelDialog = ref(false)

// 用户额度（使用共享 store）
const quotaStore = useQuotaStore()

// 复制邀请链接
const copyInviteLink = async () => {
  const code = userStore.info.inviteCode
  if (!code) return
  try {
    const link = `${window.location.origin}/#/auth/register?invite=${code}`
    await navigator.clipboard.writeText(link)
    ElMessage.success('邀请链接已复制')
  } catch {
    ElMessage.error('复制失败')
  }
}

// 通知设置
const notificationEnabled = ref(true)
const trayBlinkEnabled = ref(true)

// 初始化通知设置
const initNotificationSettings = () => {
  if (isTauri) {
    const settings = getNotificationSettings()
    notificationEnabled.value = settings.enabled
    trayBlinkEnabled.value = settings.trayBlink
  }
}

// 处理通知开关变化
const handleNotificationChange = async (value: boolean) => {
  if (value) {
    // 开启通知时请求权限
    const granted = await requestNotificationPermission()
    if (!granted) {
      ElMessage.warning('请在系统设置中允许应用发送通知')
    }
  }
  saveNotificationSettings({ enabled: value })
}

// 处理托盘闪烁开关变化
const handleTrayBlinkChange = (value: boolean) => {
  saveNotificationSettings({ trayBlink: value })
}

// 修改密码相关
const passwordFormRef = ref<FormInstance>()
const changingPassword = ref(false)
const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const validateConfirmPassword = (_rule: any, value: string, callback: any) => {
  if (value !== passwordForm.newPassword) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const passwordRules: FormRules = {
  oldPassword: [{ required: true, message: '请输入旧密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

// 修改密码
const handleChangePassword = async () => {
  if (!passwordFormRef.value) return
  const valid = await passwordFormRef.value.validate().catch(() => false)
  if (!valid) return

  changingPassword.value = true
  try {
    await http.post({
      url: '/api/auth/change-password',
      data: {
        old_password: passwordForm.oldPassword,
        new_password: passwordForm.newPassword
      }
    })
    ElMessage.success('密码修改成功')
    showChangePasswordDialog.value = false
    // 重置表单
    passwordForm.oldPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
  } catch (error: any) {
    ElMessage.error(error.message || '密码修改失败')
  } finally {
    changingPassword.value = false
  }
}

onMounted(() => {
  initNotificationSettings()
})

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// 打开弹窗时刷新额度（强制刷新，忽略缓存）
watch(dialogVisible, (val) => {
  if (val && !selfUseMode) quotaStore.fetchQuota(true)
})

// 显示用户名称（优先显示真实姓名）
const displayName = computed(() => {
  return userStore.info.realName || userStore.info.userName || '未设置姓名'
})

// 编辑昵称
const handleEditNickname = () => {
  showEditNicknameDialog.value = true
}

// 昵称更新成功
const handleNicknameUpdateSuccess = () => {
  // 昵称已更新，无需额外操作
}

// 点击头像
const handleUserClick = () => {
  showAvatarDialog.value = true
}

// 头像上传成功回调
const handleAvatarUploadSuccess = () => {
  ElMessage.success('头像更新成功')
}

// 退出登录
const handleLogout = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要退出登录吗？',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 执行退出登录
    await userStore.logOut()

    // 关闭对话框
    dialogVisible.value = false

    // 跳转到登录页
    router.push('/auth/login')

    ElMessage.success('已退出登录')
  } catch (error) {
    // 用户取消了操作
    console.log('取消退出登录')
  }
}
</script>

<style scoped lang="scss">
.settings-container {
  padding: 10px 0;
}

.user-info-section {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 10px;

  .user-avatar-large {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    overflow: hidden;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 28px;
    flex-shrink: 0;
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    }

    .avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .user-details {
    flex: 1;
    min-width: 0;

    .user-name-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;

      .user-name {
        font-size: 16px;
        font-weight: 600;
        color: var(--el-text-color-primary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex: 1;
      }

      .edit-btn {
        padding: 4px 8px;
        height: auto;
        color: var(--el-text-color-secondary);
        flex-shrink: 0;

        &:hover {
          color: var(--el-color-primary);
        }

        .pi {
          font-size: 14px;
        }
      }
    }

    .user-email {
      font-size: 13px;
      color: var(--el-text-color-secondary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

.settings-list {
  .setting-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 10px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: var(--el-fill-color-light);
    }

    &.setting-item-switch {
      cursor: default;

      &:hover {
        background: transparent;
      }
    }

    &.sub-setting {
      // 子设置项样式，保持与其他项对齐
    }

    .setting-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: var(--el-fill-color);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--el-text-color-regular);
      font-size: 18px;
      flex-shrink: 0;
    }

    .setting-content {
      flex: 1;
      min-width: 0;

      .setting-title {
        font-size: 14px;
        font-weight: 500;
        color: var(--el-text-color-primary);
        margin-bottom: 2px;

        .invite-code {
          font-family: monospace;
          font-weight: 600;
          letter-spacing: 1.5px;
          color: var(--el-color-primary);
          background: var(--el-color-primary-light-9);
          padding: 1px 6px;
          border-radius: 4px;
          font-size: 13px;
        }
      }

      .setting-desc {
        font-size: 12px;
        color: var(--el-text-color-secondary);
      }
    }

    .setting-action {
      color: var(--el-text-color-placeholder);
      font-size: 14px;
      flex-shrink: 0;

      &.quota-value {
        color: var(--el-text-color-regular);
        font-weight: 600;
        font-size: 15px;
      }
    }
  }
}
</style>
<style>
.settingsdialog .el-dialog__body {
padding: 0!important;
}
</style>
