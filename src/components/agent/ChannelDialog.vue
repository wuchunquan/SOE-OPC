<template>
  <el-dialog v-model="dialogVisible" width="640px" :close-on-click-modal="false" destroy-on-close>
    <template #header>
      <div class="dialog-header">
        <span class="dialog-title">渠道配置</span>
        <div v-if="isTauri && isAdmin" class="mode-switch">
          <span class="mode-label">{{ isLocal ? '本地' : '远程' }}</span>
          <el-switch v-model="isLocal" @change="handleModeChange" />
        </div>
      </div>
    </template>

    <div class="channel-manager">
      <!-- 渠道列表 -->
      <div class="channel-list">
        <div
          v-for="ch in channels"
          :key="ch.id"
          class="channel-card"
          :class="{ disabled: !ch.is_enabled }"
        >
          <div class="channel-header">
            <div class="channel-info">
              <span class="channel-name">{{ ch.name }}</span>
              <el-tag size="small" :type="typeTagMap[ch.channel_type]?.type || 'info'" effect="plain">
                {{ typeTagMap[ch.channel_type]?.label || ch.channel_type }}
              </el-tag>
              <!-- 飞书连接状态 -->
              <template v-if="ch.channel_type === 'feishu'">
                <el-tag v-if="ch.ws_connected" size="small" type="success" effect="light" round>
                  <i class="pi pi-link" style="margin-right:2px;font-size:11px" /> 已连接
                </el-tag>
                <el-tag v-else size="small" type="info" effect="light" round>
                  <i class="pi pi-minus-circle" style="margin-right:2px;font-size:11px" /> 未连接
                </el-tag>
              </template>
              <span v-if="ch.role_name" class="channel-role">
                <i class="pi pi-user"></i> {{ ch.role_name }}
              </span>
              <span v-else class="channel-role unbound">未关联角色</span>
            </div>
            <div class="channel-actions" @click.stop>
              <!-- 飞书连接/断开按钮 -->
              <template v-if="ch.channel_type === 'feishu' && ch.is_enabled">
                <el-button v-if="!ch.ws_connected" text size="small" type="success" @click="handleConnect(ch)" :loading="ch._connecting" title="连接">
                  <i class="pi pi-play" />
                </el-button>
                <el-button v-else text size="small" type="warning" @click="handleDisconnect(ch)" :loading="ch._disconnecting" title="断开">
                  <i class="pi pi-stop" />
                </el-button>
              </template>
              <el-switch v-model="ch.is_enabled" size="small" @change="handleToggleEnabled(ch)" />
              <el-button text size="small" @click="handleEdit(ch)"><i class="pi pi-pencil" /></el-button>
              <el-button text size="small" type="danger" @click="handleDelete(ch)"><i class="pi pi-trash" /></el-button>
            </div>
          </div>
          <div v-if="ch.description" class="channel-detail">
            <span class="channel-desc">{{ ch.description }}</span>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="channels.length === 0 && !loading" class="empty-state">
        <i class="pi pi-comments"></i>
        <p>还没有配置消息渠道</p>
        <p class="hint">添加企业微信、钉钉等渠道，让 AI 角色接收外部消息</p>
      </div>

      <!-- 添加按钮 -->
      <div class="add-channel">
        <el-button type="primary" plain @click="handleAdd"><i class="pi pi-plus" style="margin-right:4px" /> 添加渠道</el-button>
      </div>
    </div>

    <!-- 添加/编辑弹窗 -->
    <el-dialog
      v-model="showForm"
      :title="editingChannel ? '编辑渠道' : '添加渠道'"
      width="500px"
      append-to-body
      :close-on-click-modal="false"
    >
      <el-form :model="form" label-width="90px" size="default">
        <el-form-item label="渠道名称" required>
          <el-input v-model="form.name" placeholder="如：客服企业微信" />
        </el-form-item>
        <el-form-item label="渠道类型" required>
          <el-select v-model="form.channel_type" style="width:100%" :disabled="!!editingChannel">
            <el-option label="企业微信" value="wecom" />
            <el-option label="钉钉" value="dingtalk" />
            <el-option label="飞书" value="feishu" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" placeholder="可选，简要描述该渠道的用途" />
        </el-form-item>
        <el-form-item label="关联角色">
          <el-select v-model="form.role_id" style="width:100%" clearable placeholder="选择要关联的角色">
            <el-option
              v-for="role in availableRoles"
              :key="role.role_id"
              :label="role.name + (role.is_system ? ' (系统)' : '')"
              :value="role.role_id"
              :disabled="isRoleOccupied(role.role_id)"
            >
              <div class="role-option">
                <span>{{ role.name }}</span>
                <span v-if="isRoleOccupied(role.role_id)" class="occupied-hint">已被其他渠道占用</span>
                <el-tag v-if="role.is_system" size="small" type="info" effect="plain" style="margin-left:6px">系统</el-tag>
              </div>
            </el-option>
          </el-select>
        </el-form-item>

        <!-- 企业微信配置 -->
        <template v-if="form.channel_type === 'wecom'">
          <el-divider content-position="left">企业微信配置</el-divider>
          <el-form-item label="企业ID" required>
            <el-input v-model="form.config.corp_id" placeholder="企业微信的 CorpID" />
          </el-form-item>
          <el-form-item label="AgentId" required>
            <el-input v-model="form.config.agent_id" placeholder="应用的 AgentId（数字）" />
          </el-form-item>
          <el-form-item label="Secret" required>
            <el-input v-model="form.config.secret" placeholder="应用的 Secret" type="password" show-password />
          </el-form-item>
          <el-form-item label="回调Token" required>
            <el-input v-model="form.config.token" placeholder="回调配置中的 Token" />
          </el-form-item>
          <el-form-item label="AESKey" required>
            <el-input v-model="form.config.encoding_aes_key" placeholder="回调配置中的 EncodingAESKey（43位）" />
          </el-form-item>
          <el-form-item label="回调URL">
            <div class="callback-info">
              <code class="callback-url">{{ callbackUrl }}</code>
              <el-button text size="small" @click="copyCallbackUrl">
                <i class="pi pi-copy"></i>
              </el-button>
            </div>
            <div class="hint-text">请在企业微信管理后台 → 应用管理 → 接收消息 中配置此URL</div>
          </el-form-item>
        </template>

        <!-- 钉钉/飞书预留 -->
        <template v-if="form.channel_type === 'dingtalk'">
          <el-divider content-position="left">钉钉配置</el-divider>
          <div class="placeholder-hint">钉钉渠道配置即将推出，敬请期待</div>
        </template>
        <template v-if="form.channel_type === 'feishu'">
          <el-divider content-position="left">飞书配置</el-divider>
          <el-form-item label="App ID" required>
            <el-input v-model="form.config.app_id" placeholder="飞书应用的 App ID" />
          </el-form-item>
          <el-form-item label="App Secret" required>
            <el-input v-model="form.config.app_secret" placeholder="飞书应用的 App Secret" type="password" show-password />
          </el-form-item>
          <div class="hint-text" style="padding: 0 0 10px 90px;">
            飞书使用 WebSocket 长连接接收消息，保存后可通过连接按钮启动。<br/>
            请在飞书开放平台 → 应用 → 事件订阅中启用「接收消息 v2.0」事件。
          </div>
        </template>
      </el-form>

      <template #footer>
        <el-button @click="showForm = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import http from '@/utils/http'
import { isTauriEnv } from '@/utils/env'
import { useUserStore } from '@/store/modules/user'

const LOCAL_API_URL = import.meta.env.VITE_LOCAL_API_BASE_URL

interface ChannelItem {
  id: number
  name: string
  channel_type: string
  config: Record<string, any> | null
  description: string | null
  is_enabled: boolean
  role_id: string | null
  role_name: string | null
  ws_connected?: boolean
  _connecting?: boolean
  _disconnecting?: boolean
}

interface RoleItem {
  role_id: string
  name: string
  is_system: boolean
}

const props = defineProps<{
  modelValue: boolean
  baseUrl?: string
}>()
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()

const userStore = useUserStore()
const isTauri = computed(() => isTauriEnv())
const isAdmin = computed(() => {
  const userInfo = userStore.getUserInfo
  if (!userInfo?.roles) return false
  return userInfo.roles.some((r: any) => r.code === 'admin')
})
const isLocal = ref(true)

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const currentBaseUrl = computed(() => {
  if (isTauri.value && isLocal.value) {
    return LOCAL_API_URL
  }
  return ''
})

const base = computed(() => currentBaseUrl.value)

const channels = ref<ChannelItem[]>([])
const availableRoles = ref<RoleItem[]>([])
const loading = ref(false)
const showForm = ref(false)
const saving = ref(false)
const editingChannel = ref<ChannelItem | null>(null)

const typeTagMap: Record<string, { label: string; type: string }> = {
  wecom: { label: '企业微信', type: 'success' },
  dingtalk: { label: '钉钉', type: 'primary' },
  feishu: { label: '飞书', type: 'warning' },
}

const defaultConfig = () => ({
  corp_id: '',
  agent_id: '',
  secret: '',
  token: '',
  encoding_aes_key: '',
  app_id: '',
  app_secret: '',
})

const form = ref({
  name: '',
  channel_type: 'wecom',
  description: '',
  role_id: '' as string | null,
  config: defaultConfig(),
})

// 回调URL
const callbackUrl = computed(() => {
  const origin = window.location.origin
  const roleId = form.value.role_id || '{role_id}'
  return `${origin}/api/agent/wecom/callback/${roleId}`
})

// 检查角色是否已被其他渠道占用（排除当前编辑的渠道）
function isRoleOccupied(roleId: string): boolean {
  return channels.value.some(
    ch => ch.role_id === roleId && ch.id !== editingChannel.value?.id
  )
}

async function loadChannels() {
  loading.value = true
  try {
    channels.value = await http.get({ url: `${base.value}/api/agent/channels/` })
  } catch (e: any) {
    ElMessage.error('加载渠道列表失败')
  } finally {
    loading.value = false
  }
}

async function loadRoles() {
  try {
    const res = await http.get({ url: `${base.value}/api/agent/roles/` })
    availableRoles.value = Array.isArray(res) ? res : []
  } catch {
    availableRoles.value = []
  }
}

watch(dialogVisible, (v) => {
  if (v) {
    loadChannels()
    loadRoles()
  }
})

function handleModeChange() {
  loadChannels()
  loadRoles()
}

function handleAdd() {
  editingChannel.value = null
  form.value = {
    name: '',
    channel_type: 'wecom',
    description: '',
    role_id: null,
    config: defaultConfig(),
  }
  showForm.value = true
}

function handleEdit(ch: ChannelItem) {
  editingChannel.value = ch
  const cfg = ch.config || {}
  form.value = {
    name: ch.name,
    channel_type: ch.channel_type,
    description: ch.description || '',
    role_id: ch.role_id,
    config: {
      corp_id: cfg.corp_id || '',
      agent_id: String(cfg.agent_id || ''),
      secret: cfg.secret || '',
      token: cfg.token || '',
      encoding_aes_key: cfg.encoding_aes_key || '',
      app_id: cfg.app_id || '',
      app_secret: cfg.app_secret || '',
    },
  }
  showForm.value = true
}

async function handleSave() {
  if (!form.value.name) {
    ElMessage.warning('请填写渠道名称')
    return
  }

  // 构建配置
  let config: Record<string, any> | null = null
  if (form.value.channel_type === 'wecom') {
    const c = form.value.config
    if (!c.corp_id || !c.token || !c.encoding_aes_key) {
      ElMessage.warning('请填写完整的企业微信配置（企业ID、回调Token、AESKey）')
      return
    }
    config = {
      corp_id: c.corp_id,
      agent_id: Number(c.agent_id) || 0,
      secret: c.secret,
      token: c.token,
      encoding_aes_key: c.encoding_aes_key,
    }
  } else if (form.value.channel_type === 'feishu') {
    const c = form.value.config
    if (!c.app_id || !c.app_secret) {
      ElMessage.warning('请填写完整的飞书配置（App ID、App Secret）')
      return
    }
    config = {
      app_id: c.app_id,
      app_secret: c.app_secret,
    }
  }

  const data: any = {
    name: form.value.name,
    channel_type: form.value.channel_type,
    description: form.value.description || null,
    role_id: form.value.role_id || null,
    config,
  }

  saving.value = true
  try {
    if (editingChannel.value) {
      await http.request({ url: `${base.value}/api/agent/channels/${editingChannel.value.id}`, method: 'PUT', data })
    } else {
      await http.post({ url: `${base.value}/api/agent/channels/`, data })
    }
    ElMessage.success('保存成功')
    showForm.value = false
    await loadChannels()
  } catch (e: any) {
    ElMessage.error('保存失败: ' + (e.message || '未知错误'))
  } finally {
    saving.value = false
  }
}

async function handleDelete(ch: ChannelItem) {
  await ElMessageBox.confirm(`确定删除渠道「${ch.name}」？`, '提示', { type: 'warning' })
  try {
    await http.del({ url: `${base.value}/api/agent/channels/${ch.id}` })
    ElMessage.success('已删除')
    await loadChannels()
  } catch (e: any) {
    ElMessage.error('删除失败')
  }
}

async function handleToggleEnabled(ch: ChannelItem) {
  try {
    await http.request({
      url: `${base.value}/api/agent/channels/${ch.id}`,
      method: 'PUT',
      data: { is_enabled: ch.is_enabled },
    })
    // 飞书渠道切换启用状态后刷新连接状态
    if (ch.channel_type === 'feishu') {
      setTimeout(() => loadChannels(), 1000)
    }
  } catch {
    ch.is_enabled = !ch.is_enabled
    ElMessage.error('更新失败')
  }
}

async function handleConnect(ch: ChannelItem) {
  ch._connecting = true
  try {
    await http.post({ url: `${base.value}/api/agent/channels/${ch.id}/connect` })
    ElMessage.success('连接已启动')
    setTimeout(() => loadChannels(), 1500)
  } catch (e: any) {
    ElMessage.error('连接失败: ' + (e.message || '未知错误'))
  } finally {
    ch._connecting = false
  }
}

async function handleDisconnect(ch: ChannelItem) {
  ch._disconnecting = true
  try {
    await http.post({ url: `${base.value}/api/agent/channels/${ch.id}/disconnect` })
    ElMessage.success('已断开连接')
    await loadChannels()
  } catch (e: any) {
    ElMessage.error('断开失败: ' + (e.message || '未知错误'))
  } finally {
    ch._disconnecting = false
  }
}

async function copyCallbackUrl() {
  try {
    await navigator.clipboard.writeText(callbackUrl.value)
    ElMessage.success('回调URL已复制')
  } catch {
    const input = document.createElement('input')
    input.value = callbackUrl.value
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    ElMessage.success('回调URL已复制')
  }
}
</script>

<style scoped lang="scss">
.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding-right: 40px;
}

.dialog-title {
  font-size: 16px;
  color: var(--el-text-color-primary);
}

.mode-switch {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mode-label {
  font-size: 14px;
  color: var(--el-text-color-regular);
  font-weight: 500;
}

.channel-manager {
  max-height: 500px;
  overflow-y: auto;
}

.channel-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.channel-card {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  padding: 12px 16px;
  transition: all 0.15s;

  &.disabled {
    opacity: 0.5;
  }
}

.channel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.channel-info {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;

  .channel-name {
    font-weight: 600;
    font-size: 14px;
    color: var(--el-text-color-primary);
  }

  .channel-role {
    font-size: 12px;
    color: var(--el-text-color-regular);
    display: flex;
    align-items: center;
    gap: 3px;

    &.unbound {
      color: var(--el-text-color-placeholder);
      font-style: italic;
    }
  }
}

.channel-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.channel-detail {
  margin-top: 6px;

  .channel-desc {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

.add-channel {
  margin-top: 12px;
  text-align: center;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--el-text-color-secondary);

  > i {
    font-size: 40px;
    color: var(--el-text-color-placeholder);
    margin-bottom: 12px;
  }

  p { margin: 0 0 4px; }

  .hint {
    font-size: 12px;
    color: var(--el-text-color-placeholder);
  }
}

.role-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;

  .occupied-hint {
    font-size: 11px;
    color: var(--el-text-color-placeholder);
  }
}

.callback-info {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 10px;
  background: var(--el-fill-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  margin-bottom: 4px;

  .callback-url {
    flex: 1;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    word-break: break-all;
    font-family: monospace;
  }
}

.hint-text {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.placeholder-hint {
  text-align: center;
  padding: 20px;
  color: var(--el-text-color-placeholder);
  font-size: 13px;
}

// 移动端适配
@media (max-width: 500px) {
  .channel-header {
    flex-wrap: wrap;
    gap: 8px;
  }

  .channel-info {
    flex-wrap: wrap;
    gap: 4px !important;
  }

  .channel-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
