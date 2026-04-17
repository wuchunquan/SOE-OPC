<template>
  <el-dialog v-model="dialogVisible" width="680px" :close-on-click-modal="false" destroy-on-close>
    <template #header>
      <div class="dialog-header">
        <span class="dialog-title">模型配置</span>
        <div v-if="showModeSwitch" class="mode-switch">
          <span class="mode-label">{{ isLocal ? '本地' : '远程' }}</span>
          <el-switch v-model="isLocal" @change="handleModeChange" />
        </div>
      </div>
    </template>

    <div class="provider-manager">
      <!-- 提供商列表 -->
      <div class="provider-list">
        <div
          v-for="p in providers"
          :key="p.id"
          class="provider-card"
          :class="{ 'is-default': p.is_default }"
        >
          <div class="provider-header" @click="toggleExpand(p.id)">
            <div class="provider-info">
              <i class="expand-icon pi" :class="expandedIds.has(p.id) ? 'pi-chevron-down' : 'pi-chevron-right'"></i>
              <span class="provider-name">{{ p.name }}</span>
              <el-tag v-if="p.is_default" size="small" type="primary" effect="plain">默认</el-tag>
              <span class="provider-url">{{ p.base_url }}</span>
              <span class="model-count">{{ p.models.length }} 个模型</span>
            </div>
            <div class="provider-actions" @click.stop>
              <el-button v-if="!p.is_default" text size="small" @click="handleSetDefault(p)">设为默认</el-button>
              <el-button text size="small" @click="handleEditProvider(p)"><i class="pi pi-pencil" /></el-button>
              <el-button text size="small" type="danger" @click="handleDeleteProvider(p)"><i class="pi pi-trash" /></el-button>
            </div>
          </div>

          <!-- 模型列表（折叠/展开） -->
          <div v-show="expandedIds.has(p.id)" class="model-section">
            <div v-if="p.models.length > 0" class="model-list">
              <div v-for="m in p.models" :key="m.id" class="model-item">
                <div class="model-info">
                  <span class="model-name">{{ m.name }}</span>
                  <span class="model-id">{{ m.model_id }}</span>
                  <el-tag v-if="m.is_default" size="small" effect="plain">默认</el-tag>
                </div>
                <div class="model-actions">
                  <el-button v-if="!m.is_default" text size="small" @click="handleSetDefaultModel(p, m)">设为默认</el-button>
                  <el-button text size="small" type="danger" @click="handleDeleteModel(p, m)"><i class="pi pi-times" /></el-button>
                </div>
              </div>
            </div>
            <div v-else class="no-models">暂无模型，请在下方添加</div>
            <!-- 添加模型 -->
            <div class="add-model">
              <el-input v-model="newModels[p.id].name" placeholder="显示名称" size="small" style="width: 130px" />
              <el-input v-model="newModels[p.id].model_id" placeholder="模型ID（如 qwen3-plus）" size="small" style="flex:1" />
              <el-button size="small" type="primary" :disabled="!newModels[p.id].name || !newModels[p.id].model_id" @click="handleAddModel(p)">添加</el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="providers.length === 0 && !loading" class="empty-state">
        <i class="pi pi-server"></i>
        <p>还没有配置供应商</p>
        <p class="hint">添加一个供应商，然后配置可用的模型</p>
      </div>

      <!-- 添加提供商 -->
      <div class="add-provider">
        <el-button type="primary" plain @click="handleAddProvider"><i class="pi pi-plus" style="margin-right:4px" /> 添加提供商</el-button>
      </div>
    </div>

    <!-- 添加/编辑提供商弹窗 -->
    <el-dialog v-model="showForm" :title="editingProvider ? '编辑提供商' : '添加提供商'" width="440px" append-to-body :close-on-click-modal="false">
      <el-form :model="form"  label-width="60px" size="default">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" placeholder="如：Anthropic官方、阿里云" />
        </el-form-item>
        <el-form-item label="密钥" :required="!editingProvider">
          <el-input v-model="form.api_key" placeholder="sk-..." show-password />
          <div v-if="editingProvider" class="form-hint">留空表示不修改</div>
        </el-form-item>
        <el-form-item label="链接" required>
          <el-input v-model="form.base_url" placeholder="https://api.anthropic.com" />
        </el-form-item>
        <el-form-item label="默认">
          <el-switch v-model="form.is_default" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showForm = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSaveProvider">保存</el-button>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createProviderApi } from './providerApi'
import type { Provider, ModelConfig } from './providerApi'
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

const api = computed(() => createProviderApi(currentBaseUrl.value))

const providers = ref<Provider[]>([])
const loading = ref(false)
const showForm = ref(false)
const saving = ref(false)
const editingProvider = ref<Provider | null>(null)
const form = ref({ name: '', api_key: '', base_url: '', is_default: false })
// 每个 provider 独立的新模型表单
const newModels = reactive<Record<number, { name: string; model_id: string }>>({})
// 折叠/展开状态
const expandedIds = reactive(new Set<number>())

function toggleExpand(id: number) {
  if (expandedIds.has(id)) {
    expandedIds.delete(id)
  } else {
    expandedIds.add(id)
  }
}

async function loadProviders() {
  loading.value = true
  try {
    providers.value = await api.value.getProviders()
    // 初始化每个 provider 的新模型表单
    for (const p of providers.value) {
      if (!newModels[p.id]) {
        newModels[p.id] = { name: '', model_id: '' }
      }
    }
  } catch (e: any) {
    ElMessage.error('加载失败: ' + e.message)
  } finally {
    loading.value = false
  }
}

watch(dialogVisible, (v) => { if (v) loadProviders() })

function handleModeChange() {
  loadProviders()
}

function handleAddProvider() {
  editingProvider.value = null
  form.value = { name: '', api_key: '', base_url: '', is_default: false }
  showForm.value = true
}

function handleEditProvider(p: Provider) {
  editingProvider.value = p
  form.value = { name: p.name, api_key: '', base_url: p.base_url, is_default: p.is_default }
  showForm.value = true
}

async function handleSaveProvider() {
  if (!form.value.name || !form.value.base_url) {
    ElMessage.warning('请填写名称和 Base URL')
    return
  }
  saving.value = true
  try {
    if (editingProvider.value) {
      const data: any = { name: form.value.name, base_url: form.value.base_url, is_default: form.value.is_default }
      if (form.value.api_key) data.api_key = form.value.api_key
      await api.value.updateProvider(editingProvider.value.id, data)
    } else {
      if (!form.value.api_key) {
        ElMessage.warning('请填写 API Key')
        return
      }
      await api.value.createProvider(form.value)
    }
    ElMessage.success('保存成功')
    showForm.value = false
    await loadProviders()
  } catch (e: any) {
    ElMessage.error('保存失败: ' + e.message)
  } finally {
    saving.value = false
  }
}

async function handleDeleteProvider(p: Provider) {
  await ElMessageBox.confirm(`确定删除提供商「${p.name}」及其所有模型？`, '提示', { type: 'warning' })
  await api.value.deleteProvider(p.id)
  ElMessage.success('已删除')
  await loadProviders()
}

async function handleSetDefault(p: Provider) {
  await api.value.setDefaultProvider(p.id)
  await loadProviders()
}

async function handleAddModel(p: Provider) {
  const m = newModels[p.id]
  if (!m?.name || !m?.model_id) return
  await api.value.addModel(p.id, { name: m.name, model_id: m.model_id })
  newModels[p.id] = { name: '', model_id: '' }
  await loadProviders()
}

async function handleDeleteModel(p: Provider, m: ModelConfig) {
  await api.value.deleteModel(p.id, m.id)
  await loadProviders()
}

async function handleSetDefaultModel(p: Provider, m: ModelConfig) {
  await api.value.setDefaultModel(p.id, m.id)
  await loadProviders()
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

.provider-manager {
  max-height: 500px;
  overflow-y: auto;
}

.provider-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.provider-card {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  overflow: hidden;

  &.is-default {
    border-color: var(--el-color-primary-light-5);
  }
}

.provider-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--el-fill-color-lighter);
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;

  &:hover {
    background: var(--el-fill-color);
  }
}

.provider-info {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;

  .expand-icon {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    flex-shrink: 0;
    transition: transform 0.2s;
  }

  .provider-name {
    font-weight: 600;
    font-size: 14px;
    color: var(--el-text-color-primary);
  }

  .provider-url {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .model-count {
    font-size: 11px;
    color: var(--el-text-color-placeholder);
    flex-shrink: 0;
  }
}

.provider-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

// 模型区域
.model-section {
  padding: 10px 16px 12px;
}

.model-section-header {
  margin-bottom: 8px;
}

.model-section-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
}

.model-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
}

.model-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
}

.model-info {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;

  .model-name {
    font-size: 13px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  .model-id {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    font-family: monospace;
  }
}

.model-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.no-models {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  padding: 8px 0;
}

.add-model {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 4px;
  border-top: 1px dashed var(--el-border-color-extra-light);
}

.add-provider {
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

.form-hint {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  margin-top: 4px;
}
</style>
