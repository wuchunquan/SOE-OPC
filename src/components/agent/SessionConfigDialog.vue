<template>
  <el-dialog v-model="dialogVisible" class="session-config-dialog" title="会话配置" width="520px" :close-on-click-modal="false" destroy-on-close>
    <div class="session-config">
      <!-- 模型选择 -->
      <div class="top-row">
        <div class="config-inline" style="flex:1;min-width:0">
          <span class="inline-label">模型</span>
          <el-select
            v-model="selectedModelName"
            placeholder="选择模型"
            clearable
            filterable
            :disabled="agentStore.isStreaming"
            :loading="modelsLoading"
            @change="handleModelChange"
          >
            <el-option
              v-for="m in modelList"
              :key="m.model_name"
              :label="m.vendor_name ? `${m.model_name} (${m.vendor_name})` : m.model_name"
              :value="m.model_name"
            />
          </el-select>
        </div>
      </div>
      <div v-if="agentStore.isStreaming" class="streaming-hint">AI 回复中，无法切换模型</div>

      <!-- Skills / MCP Tab 切换 -->
      <div class="tools-tabs">
        <div class="tabs-header">
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'skills' }"
            @click="activeTab = 'skills'"
          >
            Skills
            <span class="tab-badge" v-if="enabledSkillCount > 0">{{ enabledSkillCount }}</span>
          </button>
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'mcp' }"
            @click="activeTab = 'mcp'"
          >
            MCP
            <span class="tab-badge" v-if="enabledMcpCount > 0">{{ enabledMcpCount }}</span>
          </button>
        </div>

        <!-- Skills 面板 -->
        <div v-show="activeTab === 'skills'" class="tab-panel">
          <div v-if="skillsLoading" class="skills-loading">
            <i class="pi pi-spin pi-spinner"></i>
            <span>加载中...</span>
          </div>
          <template v-else>
            <div
              v-for="skill in skills"
              :key="skill.folder"
              class="skill-item"
              :class="{ enabled: skill.enabled, invalid: !skill.has_skill_md }"
              @click="toggleSkill(skill)"
            >
              <i class="toggle-icon" :class="skill.enabled ? 'pi pi-check-circle' : 'pi pi-circle'"></i>
              <div class="skill-info">
                <span class="skill-name">{{ skill.name }}</span>
                <span v-if="skill.description" class="skill-desc">{{ skill.description }}</span>
              </div>
              <i v-if="skill.toggling" class="pi pi-spin pi-spinner toggling-icon"></i>
            </div>
            <div v-if="skills.length === 0" class="no-skills">暂无可用 Skills</div>
          </template>
        </div>

        <!-- MCP 面板 -->
        <div v-show="activeTab === 'mcp'" class="tab-panel">
          <div
            v-for="mcp in mcpServers"
            :key="mcp.id"
            class="skill-item"
            :class="{ enabled: mcp.sessionEnabled }"
            @click="toggleMcp(mcp)"
          >
            <i class="toggle-icon" :class="mcp.sessionEnabled ? 'pi pi-check-circle' : 'pi pi-circle'"></i>
            <div class="skill-info">
              <span class="skill-name">{{ mcp.name }}</span>
              <span class="skill-desc">{{ mcp.description || mcp.server_type }}</span>
            </div>
          </div>
          <div v-if="mcpServers.length === 0" class="no-skills">暂无 MCP 服务器，请在设置中添加</div>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="dialogVisible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, inject } from 'vue'
import { ElMessage } from 'element-plus'
import http from '@/utils/http'
import { createMcpApi } from './mcpApi'
import { AgentStoreKey, BaseUrlKey, IsLocalKey } from './injection'
import { useAgentStore as useDefaultStore } from './store'

interface Skill {
  name: string
  folder: string
  path: string
  has_skill_md: boolean
  description: string
  version: string
  enabled: boolean
  toggling?: boolean
}

const props = defineProps<{
  modelValue: boolean
  sessionId: string | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'model-change', modelName: string | undefined): void
}>()

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const baseUrl = inject(BaseUrlKey, '')
const agentStore = inject(AgentStoreKey, null) || useDefaultStore()
const isLocal = inject(IsLocalKey, false)
const mcpApi = computed(() => createMcpApi(baseUrl))

// --- Tab 切换 ---
const activeTab = ref<'skills' | 'mcp'>('skills')

// --- 模型选择（NewAPI） ---
const selectedModelName = ref<string | undefined>()
const modelList = ref<{ model_name: string; vendor_name: string; tags: string[] }[]>([])
const modelsLoading = ref(false)

const loadModels = async () => {
  modelsLoading.value = true
  try {
    const resp = await http.get({ url: `${baseUrl}/api/agent/newapi/models` })
    modelList.value = resp.data || []
    // 从当前会话 config 回填已保存的选择
    const config = agentStore.currentSessionInfo?.config
    if (config?.model_name) {
      selectedModelName.value = config.model_name
    } else if (resp.default_model) {
      // 未选过模型，使用系统默认模型
      selectedModelName.value = resp.default_model
      emit('model-change', resp.default_model)
    }
  } catch { /* ignore */ }
  finally {
    modelsLoading.value = false
  }
}

const handleModelChange = (val: string | undefined) => {
  emit('model-change', val)
}

// --- Skills ---
const skills = ref<Skill[]>([])
const skillsLoading = ref(false)

const enabledSkillCount = computed(() => skills.value.filter(s => s.enabled).length)

const loadSkills = async () => {
  if (!props.sessionId) return
  skillsLoading.value = true
  try {
    const [globalResponse, workspaceResponse] = await Promise.all([
      http.get({ url: `${baseUrl}/api/agent/skills/global` }),
      http.get({ url: `${baseUrl}/api/agent/skills/workspace/${props.sessionId}` })
    ])

    const workspaceSkillsMap = new Map(
      (workspaceResponse.skills || []).map((s: any) => [s.folder, true])
    )

    skills.value = (globalResponse.skills || []).map((skill: any) => ({
      ...skill,
      enabled: workspaceSkillsMap.has(skill.folder),
      toggling: false
    }))

    for (const ws of (workspaceResponse.skills || [])) {
      if (!skills.value.find(s => s.folder === ws.folder)) {
        skills.value.push({
          name: ws.name, folder: ws.folder, path: ws.path,
          has_skill_md: ws.has_skill_md, description: ws.description || '',
          version: ws.version || '', enabled: true
        })
      }
    }

    skills.value.sort((a, b) => a.name.localeCompare(b.name))
  } catch {
    ElMessage.error('加载 Skills 失败')
  } finally {
    skillsLoading.value = false
  }
}

const toggleSkill = async (skill: Skill) => {
  if (!props.sessionId || !skill.has_skill_md || skill.toggling) return
  skill.toggling = true
  try {
    if (skill.enabled) {
      const resp = await http.del({ url: `${baseUrl}/api/agent/skills/disable/${props.sessionId}/${skill.folder}` })
      if (resp.success) { skill.enabled = false; ElMessage.success(`"${skill.name}" 已禁用`) }
    } else {
      const resp = await http.post({ url: `${baseUrl}/api/agent/skills/enable/${props.sessionId}/${skill.folder}` })
      if (resp.success) { skill.enabled = true; ElMessage.success(`"${skill.name}" 已启用`) }
    }
  } catch (e: any) {
    ElMessage.error(e.message || '操作失败')
  } finally {
    skill.toggling = false
  }
}

// --- MCP 服务器 ---
interface McpItem {
  id: number
  name: string
  description: string | null
  server_type: string
  sessionEnabled: boolean
}

const mcpServers = ref<McpItem[]>([])
const enabledMcpCount = computed(() => mcpServers.value.filter(m => m.sessionEnabled).length)

const loadMcpServers = async () => {
  try {
    const servers = await mcpApi.value.getMcpServers()
    // 只显示全局启用的
    const enabledServers = servers.filter((s: any) => s.is_enabled)
    // 从会话 config 中读取 enabled_mcp_servers
    const config = agentStore.currentSessionInfo?.config
    const enabledIds: number[] | null = config?.enabled_mcp_servers ?? null

    mcpServers.value = enabledServers.map((s: any) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      server_type: s.server_type,
      // null = 全部启用, [] = 全部禁用, [1,3] = 指定启用
      sessionEnabled: enabledIds === null ? true : enabledIds.includes(s.id),
    }))
  } catch { /* ignore */ }
}

const toggleMcp = async (mcp: McpItem) => {
  if (!props.sessionId) return
  mcp.sessionEnabled = !mcp.sessionEnabled

  // 构建新的 enabled_mcp_servers 列表
  const newList = mcpServers.value.filter(m => m.sessionEnabled).map(m => m.id)
  // 如果全部启用，则设为 null（默认行为）
  const allEnabled = newList.length === mcpServers.value.length
  const enabledMcpServers = allEnabled ? null : newList

  try {
    await agentStore.updateSessionConfig(props.sessionId, { enabled_mcp_servers: enabledMcpServers })
  } catch (e: any) {
    mcp.sessionEnabled = !mcp.sessionEnabled
    ElMessage.error(e.message || '更新失败')
  }
}

// --- 打开时加载 ---
watch(() => props.modelValue, (visible) => {
  if (visible) {
    activeTab.value = 'skills'
    loadModels()
    loadSkills()
    loadMcpServers()
  }
})
</script>

<style scoped lang="scss">
.session-config {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

// ---- 顶部行 ----
.top-row {
  display: flex;
  gap: 16px;
  align-items: flex-end;
}

.config-inline {
  display: flex;
  flex-direction: column;
  gap: 4px;

  .el-select {
    width: 100%;
  }
}

.inline-label {
  font-size: 12px;
  font-weight: 500;
  color: #71717a;
}

.streaming-hint {
  font-size: 12px;
  color: var(--el-color-warning);
  padding: 0 2px;
}

// ---- Tab 切换 ----
.tools-tabs {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.tabs-header {
  display: flex;
  gap: 0;
  border-bottom: 1px solid #27272a;
  margin-bottom: 8px;
  flex-shrink: 0;
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 500;
  color: #71717a;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
  margin-bottom: -1px;

  &:hover {
    color: #a1a1aa;
  }

  &.active {
    color: #3b82f6;
    border-bottom-color: #3b82f6;
  }

  .tab-badge {
    font-size: 10px;
    font-weight: 400;
    color: #60a5fa;
    padding: 1px 6px;
    background: rgba(59, 130, 246, 0.15);
    border-radius: 8px;
    line-height: 1.4;
  }
}

.tab-panel {
  max-height: 280px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-right: 4px;

  // 滚动条
  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: #27272a;
    border-radius: 2px;
  }
}

.skills-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px;
  color: #71717a;
  font-size: 13px;
  i { font-size: 16px; color: #3b82f6; }
}

.skill-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 6px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;

  &:hover {
    background: rgba(255, 255, 255, 0.03);
  }

  &.enabled {
    background: rgba(59, 130, 246, 0.06);
    border-color: rgba(59, 130, 246, 0.2);
  }

  &.invalid {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.toggle-icon {
  font-size: 14px;
  color: #3f3f46;
  flex-shrink: 0;
  transition: color 0.15s;

  .skill-item.enabled & {
    color: #3b82f6;
  }
}

.toggling-icon {
  font-size: 12px;
  color: #3b82f6;
  flex-shrink: 0;
}

.skill-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.skill-name {
  font-size: 13px;
  font-weight: 500;
  color: #d4d4d8;
  line-height: 1.3;
}

.skill-desc {
  font-size: 11px;
  color: #52525b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.no-skills {
  text-align: center;
  padding: 24px;
  color: #3f3f46;
  font-size: 12px;
}

// ---- 浅色模式 ----
html:not(.dark) {
  .inline-label { color: #6b7280; }

  .tabs-header {
    border-bottom-color: #e5e7eb;
  }

  .tab-btn {
    color: #9ca3af;
    &:hover { color: #6b7280; }
    &.active { color: #3b82f6; }
  }

  .skill-item {
    &:hover { background: rgba(0, 0, 0, 0.02); }
    &.enabled {
      background: rgba(59, 130, 246, 0.04);
      border-color: rgba(59, 130, 246, 0.15);
    }
  }

  .toggle-icon { color: #d1d5db; }
  .skill-name { color: #1f2937; }
  .skill-desc { color: #9ca3af; }
  .no-skills { color: #d1d5db; }

  .tab-panel {
    &::-webkit-scrollbar-thumb { background: #e5e7eb; }
  }
}
</style>
<style>
.session-config-dialog .el-dialog__body {
  padding: 0 !important;
}
</style>
