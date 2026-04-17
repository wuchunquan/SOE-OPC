<template>
  <el-dialog v-model="dialogVisible" width="640px" :close-on-click-modal="false" destroy-on-close>
    <template #header>
      <div class="dialog-header">
        <span class="dialog-title">MCP 工具配置</span>
        <div v-if="showModeSwitch" class="mode-switch">
          <span class="mode-label">{{ isLocal ? '本地' : '远程' }}</span>
          <el-switch v-model="isLocal" @change="handleModeChange" />
        </div>
      </div>
    </template>

    <div class="mcp-manager">
      <!-- MCP 服务器列表 -->
      <div class="mcp-list">
        <div
          v-for="s in servers"
          :key="s.id"
          class="mcp-card"
          :class="{ disabled: !s.is_enabled }"
        >
          <div class="mcp-header">
            <div class="mcp-info">
              <span class="mcp-name">{{ s.name }}</span>
              <el-tag size="small" :type="s.server_type === 'stdio' ? 'primary' : 'success'" effect="plain">{{ s.server_type }}</el-tag>
              <span v-if="s.description" class="mcp-desc">{{ s.description }}</span>
            </div>
            <div class="mcp-actions" @click.stop>
              <el-switch v-model="s.is_enabled" size="small" @change="handleToggleEnabled(s)" />
              <el-button text size="small" @click="handleEdit(s)"><i class="pi pi-pencil" /></el-button>
              <el-button text size="small" type="danger" @click="handleDelete(s)"><i class="pi pi-trash" /></el-button>
            </div>
          </div>
          <div class="mcp-detail">
            <span v-if="s.server_type === 'stdio' && s.command" class="mcp-cmd">{{ s.command }} {{ (s.args || []).join(' ') }}</span>
            <span v-if="s.server_type === 'sse' && s.url" class="mcp-cmd">{{ s.url }}</span>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="servers.length === 0 && !loading" class="empty-state">
        <i class="pi pi-box"></i>
        <p>还没有配置 MCP 服务器</p>
        <p class="hint">添加外部工具服务，让 AI 获取更多能力</p>
      </div>

      <!-- 添加按钮 -->
      <div class="add-mcp">
        <el-button type="primary" plain @click="handleAdd"><i class="pi pi-plus" style="margin-right:4px" /> 添加 MCP 服务器</el-button>
      </div>
    </div>

    <!-- 添加/编辑弹窗 -->
    <el-dialog v-model="showForm" :title="editingServer ? '编辑 MCP 服务器' : '添加 MCP 服务器'" width="480px" append-to-body :close-on-click-modal="false">
      <el-form :model="form" label-width="70px" size="default">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" placeholder="如：Tavily 搜索" />
        </el-form-item>
        <el-form-item label="类型" required>
          <el-select v-model="form.server_type" style="width:100%">
            <el-option label="stdio（本地命令）" value="stdio" />
            <el-option label="sse（远程服务）" value="sse" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.server_type === 'stdio'" label="命令" required>
          <el-input v-model="form.command" placeholder="如：npx" />
        </el-form-item>
        <el-form-item v-if="form.server_type === 'stdio'" label="参数">
          <el-input v-model="form.argsText" type="textarea" :rows="2" placeholder="每行一个参数，如：&#10;-y&#10;@anthropic/tavily-mcp" />
        </el-form-item>
        <el-form-item v-if="form.server_type === 'stdio'" label="环境变量">
          <el-input v-model="form.envText" type="textarea" :rows="2" placeholder="每行一个，格式：KEY=VALUE&#10;如：TAVILY_API_KEY=tvly-xxx" />
        </el-form-item>
        <el-form-item v-if="form.server_type === 'sse'" label="URL" required>
          <el-input v-model="form.url" placeholder="http://localhost:3000/sse" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" placeholder="可选，简要描述该服务的用途" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showForm = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createMcpApi } from './mcpApi'
import type { McpServer } from './mcpApi'
import { isTauriEnv } from '@/utils/env'
import { useUserStore } from '@/store/modules/user'
import { getRuntimeLocalApiBaseUrl, isSelfUseMode } from '@/utils/runtime-mode'

const LOCAL_API_URL = getRuntimeLocalApiBaseUrl()

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
const selfUseMode = isSelfUseMode()
const showModeSwitch = computed(() => isTauri.value && isAdmin.value && !selfUseMode)
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

const api = computed(() => createMcpApi(currentBaseUrl.value))

const servers = ref<McpServer[]>([])
const loading = ref(false)
const showForm = ref(false)
const saving = ref(false)
const editingServer = ref<McpServer | null>(null)
const form = ref({
  name: '',
  server_type: 'stdio' as 'stdio' | 'sse',
  command: '',
  argsText: '',
  envText: '',
  url: '',
  description: '',
})

async function loadServers() {
  loading.value = true
  try {
    servers.value = await api.value.getMcpServers()
  } catch (e: any) {
    ElMessage.error('加载失败: ' + e.message)
  } finally {
    loading.value = false
  }
}

watch(dialogVisible, (v) => { if (v) loadServers() })

function handleModeChange() {
  loadServers()
}

function handleAdd() {
  editingServer.value = null
  form.value = { name: '', server_type: 'stdio', command: '', argsText: '', envText: '', url: '', description: '' }
  showForm.value = true
}

function handleEdit(s: McpServer) {
  editingServer.value = s
  form.value = {
    name: s.name,
    server_type: s.server_type,
    command: s.command || '',
    argsText: (s.args || []).join('\n'),
    envText: Object.entries(s.env || {}).map(([k, v]) => `${k}=${v}`).join('\n'),
    url: s.url || '',
    description: s.description || '',
  }
  showForm.value = true
}

function parseArgs(text: string): string[] {
  return text.split('\n').map(l => l.trim()).filter(Boolean)
}

function parseEnv(text: string): Record<string, string> {
  const env: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const idx = trimmed.indexOf('=')
    if (idx > 0) {
      env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1)
    }
  }
  return env
}

async function handleSave() {
  if (!form.value.name) {
    ElMessage.warning('请填写名称')
    return
  }
  if (form.value.server_type === 'stdio' && !form.value.command) {
    ElMessage.warning('请填写启动命令')
    return
  }
  if (form.value.server_type === 'sse' && !form.value.url) {
    ElMessage.warning('请填写服务器 URL')
    return
  }

  const data: any = {
    name: form.value.name,
    server_type: form.value.server_type,
    description: form.value.description || null,
  }

  if (form.value.server_type === 'stdio') {
    data.command = form.value.command
    data.args = parseArgs(form.value.argsText)
    data.env = parseEnv(form.value.envText)
    data.url = null
  } else {
    data.url = form.value.url
    data.command = null
    data.args = null
    data.env = null
  }

  saving.value = true
  try {
    if (editingServer.value) {
      await api.value.updateMcpServer(editingServer.value.id, data)
    } else {
      await api.value.createMcpServer(data)
    }
    ElMessage.success('保存成功')
    showForm.value = false
    await loadServers()
  } catch (e: any) {
    ElMessage.error('保存失败: ' + e.message)
  } finally {
    saving.value = false
  }
}

async function handleDelete(s: McpServer) {
  await ElMessageBox.confirm(`确定删除 MCP 服务器「${s.name}」？`, '提示', { type: 'warning' })
  try {
    await api.value.deleteMcpServer(s.id)
    ElMessage.success('已删除')
    await loadServers()
  } catch (e: any) {
    ElMessage.error('删除失败: ' + e.message)
  }
}

async function handleToggleEnabled(s: McpServer) {
  try {
    await api.value.updateMcpServer(s.id, { is_enabled: s.is_enabled })
  } catch (e: any) {
    s.is_enabled = !s.is_enabled
    ElMessage.error('更新失败: ' + e.message)
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

.mcp-manager {
  max-height: 500px;
  overflow-y: auto;
}

.mcp-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mcp-card {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  padding: 12px 16px;
  transition: all 0.15s;

  &.disabled {
    opacity: 0.5;
  }
}

.mcp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mcp-info {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;

  .mcp-name {
    font-weight: 600;
    font-size: 14px;
    color: var(--el-text-color-primary);
  }

  .mcp-desc {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.mcp-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.mcp-detail {
  margin-top: 6px;

  .mcp-cmd {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    font-family: monospace;
    word-break: break-all;
  }
}

.add-mcp {
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
</style>
