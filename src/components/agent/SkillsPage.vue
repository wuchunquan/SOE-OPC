<template>
  <div class="skills-page">
    <!-- 后端加载中状态（仅 Tauri 本地模式） -->
    <div v-if="backendLoading" class="backend-loading">
      <el-icon class="loading-icon" :size="48"><Loading /></el-icon>
      <div class="loading-text">正在启动本地 AI 服务...</div>
      <div class="loading-subtext">{{ loadingMessage }}</div>
    </div>

    <!-- 后端加载失败状态 -->
    <div v-else-if="backendError" class="backend-error">
      <el-icon class="error-icon" :size="48"><CircleClose /></el-icon>
      <div class="error-text">无法连接到本地服务</div>
      <div class="error-subtext">{{ backendError }}</div>
      <el-button type="primary" @click="retryBackendConnection">重试</el-button>
    </div>

    <!-- 正常内容 -->
    <template v-else>
    <!-- 头部 -->
    <div class="skills-header">
      <div class="header-content">
        <div class="header-left">
          <i class="pi pi-bolt header-icon"></i>
          <div>
            <h1 class="header-title">skill 列表</h1>
          </div>
        </div>
        <!-- Tauri 环境下显示本地/远程切换 -->
        <div class="header-right">
          <!-- 管理员远程模式下显示上传按钮 -->
          <el-button
            v-if="isAdmin && isRemoteMode"
            size="small"
            class="open-folder-btn"
            @click="triggerUpload"
            :loading="uploading"
          >
            <i class="pi pi-upload"></i>
            <span>上传 Skill</span>
          </el-button>
          <input
            ref="fileInputRef"
            type="file"
            accept=".zip"
            style="display: none"
            @change="handleUpload"
          />
          <!-- Tauri 环境下显示本地/远程切换 -->
          <el-button
            v-if="canOpenLocalFolder"
            size="small"
            class="open-folder-btn"
            @click="openSkillsFolder"
          >
            <i class="pi pi-folder-open"></i>
            <span>打开目录</span>
          </el-button>
          <template v-if="showModeSwitch">
            <div class="mode-switch">
              <span class="mode-label">{{ isLocal ? '本地' : '远程' }}</span>
              <el-switch v-model="isLocal" :active-icon="Monitor" :inactive-icon="Connection"
                @change="handleModeChange" />
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="skills-content">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <i class="pi pi-spin pi-spinner"></i>
        <span>加载中...</span>
      </div>

      <!-- Skills 列表 -->
      <div v-else-if="skills.length > 0" class="skills-grid">
        <div v-for="skill in skills" :key="skill.folder" class="skill-card" :class="{ invalid: !skill.has_skill_md }">
          <div class="skill-card-header">
            <div class="skill-icon" :class="{ invalid: !skill.has_skill_md }">
              <i class="pi pi-bolt"></i>
            </div>
            <div class="skill-meta">
              <h3 class="skill-name">{{ skill.name }}</h3>
              <div class="skill-tags">
                <span v-if="skill.version" class="skill-tag version">v{{ skill.version }}</span>
                <span v-if="skill.has_skill_md" class="skill-tag status valid">
                  <i class="pi pi-check-circle"></i>
                  就绪
                </span>
                <span v-else class="skill-tag status invalid">
                  <i class="pi pi-exclamation-triangle"></i>
                  缺少配置
                </span>
              </div>
            </div>
          </div>

          <div class="skill-card-body">
            <el-tooltip v-if="skill.description" :content="skill.description" placement="bottom" :show-after="300" popper-class="skill-tooltip">
              <p class="skill-description">{{ skill.description }}</p>
            </el-tooltip>
            <p v-else class="skill-description empty">暂无描述</p>
          </div>

          <div class="skill-card-footer">
            <div class="skill-path">
              <i class="pi pi-folder"></i>
              <span>{{ skill.folder }}</span>
            </div>
            <el-popconfirm
              v-if="isAdmin && isRemoteMode"
              title="确定删除该 Skill？"
              confirm-button-text="删除"
              cancel-button-text="取消"
              @confirm="deleteSkill(skill.folder)"
            >
              <template #reference>
                <el-button type="danger" text size="small" :loading="skill._deleting">
                  <i class="pi pi-trash"></i>
                </el-button>
              </template>
            </el-popconfirm>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-state">
        <i class="pi pi-folder-open"></i>
        <h3>还没有 Skills</h3>
        <template v-if="isLocal">
          <p>请在程序安装目录下的 <code>static/agent/skills</code> 文件夹中创建 skill</p>
          <p class="hint">每个 skill 是一个文件夹，包含 SKILL.md 文件定义名称、描述和触发条件</p>
        </template>
        <template v-else>
          <p>请联系管理员在服务器 Skills 目录中创建 skill 文件夹</p>
          <p class="hint">每个文件夹包含一个 SKILL.md 文件，定义 skill 的名称、描述和触发条件</p>
        </template>
      </div>
    </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Monitor, Connection, Loading, CircleClose } from '@element-plus/icons-vue'
import http from '@/utils/http'
import { isTauriEnv } from '@/utils/env'
import { useUserStore } from '@/store/modules/user'
import { getRuntimeLocalApiBaseUrl, isSelfUseMode } from '@/utils/runtime-mode'

const LOCAL_API_URL = getRuntimeLocalApiBaseUrl()

interface Skill {
  name: string
  folder: string
  path: string
  has_skill_md: boolean
  description: string
  version: string
  _deleting?: boolean
}

const userStore = useUserStore()
const isAdmin = computed(() => {
  const userInfo = userStore.getUserInfo
  if (!userInfo?.roles) return false
  return userInfo.roles.some((r: any) => r.code === 'admin')
})
const isRemoteMode = computed(() => !isTauri.value || !isLocal.value)
const selfUseMode = isSelfUseMode()
const showModeSwitch = computed(() => isTauri.value && !selfUseMode)
const canOpenLocalFolder = computed(() => isLocal.value && (isTauri.value || selfUseMode))

const loading = ref(false)
const skills = ref<Skill[]>([])
const isTauri = computed(() => isTauriEnv())
const isLocal = ref(true)
const backendLoading = ref(false)
const backendError = ref('')
const loadingMessage = ref('正在检查服务状态...')
let healthCheckTimer: number | null = null
let healthCheckAttempts = 0
const MAX_HEALTH_CHECK_ATTEMPTS = 100

// 检查后端健康状态
const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${LOCAL_API_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    })
    return response.ok
  } catch (error) {
    return false
  }
}

// 等待后端启动
const waitForBackend = async () => {
  backendLoading.value = true
  backendError.value = ''
  healthCheckAttempts = 0

  const checkHealth = async () => {
    healthCheckAttempts++
    loadingMessage.value = `正在检查服务状态... (${healthCheckAttempts}/${MAX_HEALTH_CHECK_ATTEMPTS})`

    const isHealthy = await checkBackendHealth()

    if (isHealthy) {
      backendLoading.value = false
      if (healthCheckTimer) {
        clearInterval(healthCheckTimer)
        healthCheckTimer = null
      }
      await loadSkills()
    } else if (healthCheckAttempts >= MAX_HEALTH_CHECK_ATTEMPTS) {
      backendLoading.value = false
      backendError.value = '服务启动超时，请检查后端是否正常运行'
      if (healthCheckTimer) {
        clearInterval(healthCheckTimer)
        healthCheckTimer = null
      }
    }
  }

  await checkHealth()

  if (backendLoading.value) {
    healthCheckTimer = window.setInterval(checkHealth, 1000)
  }
}

// 重试连接
const retryBackendConnection = () => {
  waitForBackend()
}

// 获取 API 基础 URL
const getBaseUrl = () => {
  if ((isTauri.value || selfUseMode) && isLocal.value) {
    return LOCAL_API_URL
  }
  return '' // 远程模式使用默认配置
}

// 加载 Skills 列表
const loadSkills = async () => {
  loading.value = true
  try {
    const baseUrl = getBaseUrl()
    const url = baseUrl ? `${baseUrl}/api/agent/skills/global` : '/api/agent/skills/global'
    const response = await http.get({ url })
    skills.value = response.skills || []
  } catch (error) {
    console.error('Failed to load skills:', error)
    ElMessage.error('无法加载 Skills 列表')
  } finally {
    loading.value = false
  }
}

// 切换模式时重新加载
const handleModeChange = () => {
  loadSkills()
}

// 打开本地 Skills 目录
const openSkillsFolder = async () => {
  try {
    await http.post({ url: `${LOCAL_API_URL}/api/agent/skills/open-folder` })
  } catch (error) {
    console.error('Failed to open skills folder:', error)
    ElMessage.error('无法打开 Skills 目录')
  }
}

// 上传 Skill 压缩包
const fileInputRef = ref<HTMLInputElement | null>(null)
const uploading = ref(false)

const triggerUpload = () => {
  fileInputRef.value?.click()
}

const handleUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    await http.post({
      url: '/api/agent/skills/global/upload',
      data: formData,
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    ElMessage.success('上传成功')
    await loadSkills()
  } catch (error: any) {
    console.error('Failed to upload skill:', error)
    ElMessage.error(error?.message || '上传失败')
  } finally {
    uploading.value = false
    input.value = ''
  }
}

// 删除 Skill
const deleteSkill = async (folder: string) => {
  const skill = skills.value.find(s => s.folder === folder)
  if (skill) skill._deleting = true
  try {
    await http.del({ url: `/api/agent/skills/global/${folder}` })
    ElMessage.success('删除成功')
    await loadSkills()
  } catch (error: any) {
    console.error('Failed to delete skill:', error)
    ElMessage.error(error?.message || '删除失败')
  } finally {
    if (skill) skill._deleting = false
  }
}

onMounted(async () => {
  // Tauri 本地模式下需要等待后端启动
  if (isLocal.value && (isTauri.value || selfUseMode)) {
    await waitForBackend()
  } else {
    await loadSkills()
  }
})

onUnmounted(() => {
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer)
    healthCheckTimer = null
  }
})
</script>

<style scoped lang="scss">
.skills-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #111111;
  overflow: hidden;
}

.backend-loading,
.backend-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  gap: 16px;
}

.backend-loading {
  .loading-icon {
    color: var(--el-color-primary);
    animation: rotate 1s linear infinite;
  }

  .loading-text {
    font-size: 18px;
    font-weight: 500;
    color: white;
  }

  .loading-subtext {
    font-size: 14px;
    color: #a1a1aa;
  }
}

.backend-error {
  .error-icon {
    color: var(--el-color-danger);
  }

  .error-text {
    font-size: 18px;
    font-weight: 500;
    color: white;
  }

  .error-subtext {
    font-size: 14px;
    color: #a1a1aa;
    margin-bottom: 8px;
  }
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.skills-header {
  flex-shrink: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding: 4px 12px;

  .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .header-icon {
    font-size: 20px;
    color: #60a5fa;
  }

  .header-title {
    font-size: 20px;
    font-weight: 600;
    color: white;
  }

  .header-subtitle {
    font-size: 14px;
    color: #a1a1aa;
    margin: 0;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .open-folder-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(59, 130, 246, 0.15);
    border: 1px solid rgba(59, 130, 246, 0.3);
    color: #60a5fa;

    &:hover {
      background: rgba(59, 130, 246, 0.25);
      border-color: rgba(59, 130, 246, 0.5);
    }

    i {
      font-size: 14px;
    }
  }

  .mode-switch {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    border-radius: 8px;

    .mode-label {
      font-size: 13px;
      color: #a1a1aa;
      min-width: 32px;
    }
  }
}

.skills-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  gap: 16px;
  color: #a1a1aa;

  i {
    font-size: 48px;
    color: #3b82f6;
  }

  span {
    font-size: 16px;
  }
}

.skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.skill-card {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: all 0.3s;

  &:hover {
    border-color: #3f3f46;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  &.invalid {
    opacity: 0.7;
  }
}

.skill-card-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.skill-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(59, 130, 246, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  i {
    font-size: 24px;
    color: #60a5fa;
  }

  &.invalid {
    background: rgba(234, 179, 8, 0.2);

    i {
      color: #facc15;
    }
  }
}

.skill-meta {
  flex: 1;
  min-width: 0;
}

.skill-name {
  font-size: 18px;
  font-weight: 600;
  color: white;
  margin: 0 0 8px 0;
}

.skill-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.skill-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 6px;

  &.version {
    background: #27272a;
    color: #a1a1aa;
  }

  &.status {
    i {
      font-size: 12px;
    }

    &.valid {
      background: rgba(34, 197, 94, 0.2);
      color: #4ade80;
    }

    &.invalid {
      background: rgba(234, 179, 8, 0.2);
      color: #facc15;
    }
  }
}

.skill-card-body {
  flex: 1;
}

.skill-description {
  font-size: 14px;
  line-height: 1.6;
  color: #d4d4d8;
  margin: 0;
  max-height: 3.2em;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;

  &.empty {
    color: #52525b;
    font-style: italic;
  }
}

.skill-card-footer {
  padding-top: 12px;
  border-top: 1px solid #27272a;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.skill-path {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #71717a;
  font-family: 'Courier New', monospace;

  i {
    font-size: 14px;
  }

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;

  i {
    font-size: 64px;
    color: #3f3f46;
    margin-bottom: 24px;
  }

  h3 {
    font-size: 20px;
    font-weight: 600;
    color: #d4d4d8;
    margin: 0 0 12px 0;
  }

  p {
    font-size: 14px;
    color: #71717a;
    margin: 0 0 8px 0;
    max-width: 480px;

    &.hint {
      font-size: 13px;
      color: #52525b;
    }

    code {
      background: rgba(59, 130, 246, 0.15);
      color: #60a5fa;
      padding: 2px 8px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 13px;
    }
  }
}

// 浅色模式
html:not(.dark) {
  .skills-page {
    background: #f9fafb;
  }

  .skills-header {
    border-bottom-color: #e5e7eb;

    .header-icon {
      color: #3b82f6;
    }

    .header-title {
      color: #111827;
    }

    .header-subtitle {
      color: #6b7280;
    }

    .mode-switch {

      .mode-label {
        color: #6b7280;
      }
    }
  }

  .skill-card {
    background: #ffffff;
    border-color: #e5e7eb;

    &:hover {
      border-color: #d1d5db;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
  }

  .skill-icon {
    background: rgba(59, 130, 246, 0.1);

    i {
      color: #3b82f6;
    }

    &.invalid {
      background: rgba(234, 179, 8, 0.1);

      i {
        color: #d97706;
      }
    }
  }

  .skill-name {
    color: #111827;
  }

  .skill-tag {
    &.version {
      background: #f3f4f6;
      color: #6b7280;
    }

    &.status.valid {
      background: rgba(34, 197, 94, 0.1);
      color: #16a34a;
    }

    &.status.invalid {
      background: rgba(234, 179, 8, 0.1);
      color: #d97706;
    }
  }

  .skill-description {
    color: #374151;

    &.empty {
      color: #9ca3af;
    }
  }

  .skill-card-footer {
    border-top-color: #e5e7eb;
  }

  .skill-path {
    color: #6b7280;
  }

  .empty-state {
    i {
      color: #d1d5db;
    }

    h3 {
      color: #111827;
    }

    p {
      color: #6b7280;

      &.hint {
        color: #9ca3af;
      }
    }
  }

  .loading-state {
    color: #6b7280;
  }
}
</style>

<style>
.skill-tooltip {
  max-width: 400px !important;
  white-space: pre-wrap;
  line-height: 1.6;
}
</style>
