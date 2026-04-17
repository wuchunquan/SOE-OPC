<template>
  <el-dialog
    v-model="dialogVisible"
    title="Skills 配置"
    width="600px"
    :close-on-click-modal="false"
  >
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <i class="pi pi-spin pi-spinner"></i>
      <span>加载中...</span>
    </div>

    <div v-else class="skills-content">
      <!-- 说明 -->
      <div class="info-box">
        <i class="pi pi-info-circle"></i>
        <div class="info-text">
          <p class="info-title">什么是 Skills？</p>
          <p>Skills 是自动触发的技能模块。数字员工会根据 Skill 的描述自动判断何时使用它，无需手动调用。</p>
        </div>
      </div>

      <!-- Skills 列表 -->
      <div v-if="globalSkills.length > 0" class="skills-section">
        <h3 class="section-title">
          可用的 Skills（{{ enabledCount }}/{{ globalSkills.length }} 已启用）
        </h3>
        <div class="skills-list">
          <div
            v-for="skill in globalSkills"
            :key="skill.folder"
            class="skill-card"
            :class="{ enabled: skill.enabled, invalid: !skill.has_skill_md }"
          >
            <div class="skill-icon" :class="{ enabled: skill.enabled }">
              <i :class="skill.enabled ? 'pi pi-check-circle' : 'pi pi-circle'"></i>
            </div>
            <div class="skill-info">
              <div class="skill-header">
                <span class="skill-name">{{ skill.name }}</span>
                <span v-if="skill.version" class="skill-version">v{{ skill.version }}</span>
                <span v-if="!skill.has_skill_md" class="skill-tag invalid">无效</span>
                <span v-if="skill.inWorkspaceOnly" class="skill-tag workspace">仅工作区</span>
              </div>
              <p v-if="skill.description" class="skill-description">{{ skill.description }}</p>
              <p v-else class="skill-description empty">未找到描述</p>
            </div>
            <div class="skill-action">
              <el-button
                :type="skill.enabled ? 'danger' : 'primary'"
                :loading="skill.toggling"
                :disabled="!skill.has_skill_md"
                size="small"
                text
                @click="toggleSkill(skill)"
              >
                <i :class="skill.enabled ? 'pi pi-times' : 'pi pi-plus'"></i>
                {{ skill.enabled ? '禁用' : '启用' }}
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-state">
        <i class="pi pi-folder-open"></i>
        <p>还没有可用的 Skills</p>
        <p class="hint">请联系管理员在服务器 Skills 目录中添加 Skills</p>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">关闭</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, inject } from 'vue'
import { ElMessage } from 'element-plus'
import http from '@/utils/http'
import { BaseUrlKey } from './injection'

interface Skill {
  name: string
  folder: string
  path: string
  has_skill_md: boolean
  description: string
  version: string
  enabled: boolean
  toggling?: boolean
  inWorkspaceOnly?: boolean
}

interface Props {
  visible: boolean
  sessionId: string | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const loading = ref(false)
const baseUrl = inject(BaseUrlKey, '')
const globalSkills = ref<Skill[]>([])

const enabledCount = computed(() => {
  return globalSkills.value.filter(s => s.enabled).length
})

// 加载 Skills 数据
const loadSkills = async () => {
  if (!props.sessionId) return

  loading.value = true
  try {
    // 并行请求全局和工作区的 skills
    const [globalResponse, workspaceResponse] = await Promise.all([
      http.get({ url: `${baseUrl}/api/agent/skills/global` }),
      http.get({ url: `${baseUrl}/api/agent/skills/workspace/${props.sessionId}` })
    ])

    // 创建工作区 skills 的 Map
    const workspaceSkillsMap = new Map(
      (workspaceResponse.skills || []).map((s: any) => [s.folder, true])
    )

    // 合并数据：全局 skills + 启用状态
    globalSkills.value = (globalResponse.skills || []).map((skill: any) => ({
      ...skill,
      enabled: workspaceSkillsMap.has(skill.folder),
      toggling: false
    }))

    // 检查是否有工作区独有的 skills（全局没有的）
    for (const workspaceSkill of (workspaceResponse.skills || [])) {
      const existsInGlobal = globalSkills.value.find(s => s.folder === workspaceSkill.folder)
      if (!existsInGlobal) {
        globalSkills.value.push({
          name: workspaceSkill.name,
          folder: workspaceSkill.folder,
          path: workspaceSkill.path,
          has_skill_md: workspaceSkill.has_skill_md,
          description: workspaceSkill.description || '',
          version: workspaceSkill.version || '',
          enabled: true,
          inWorkspaceOnly: true
        })
      }
    }

    // 按名称排序
    globalSkills.value.sort((a, b) => a.name.localeCompare(b.name))
  } catch (error) {
    console.error('Failed to load skills:', error)
    ElMessage.error('无法加载 Skills 数据')
  } finally {
    loading.value = false
  }
}

// 切换 Skill 启用状态
const toggleSkill = async (skill: Skill) => {
  if (!props.sessionId) return

  skill.toggling = true
  try {
    if (skill.enabled) {
      // 禁用：从工作区删除
      const response = await http.del({
        url: `${baseUrl}/api/agent/skills/disable/${props.sessionId}/${skill.folder}`
      })

      if (response.success) {
        skill.enabled = false
        ElMessage.success(`Skill "${skill.name}" 已禁用`)
      } else {
        throw new Error(response.message || '禁用失败')
      }
    } else {
      // 启用：复制到工作区
      const response = await http.post({
        url: `${baseUrl}/api/agent/skills/enable/${props.sessionId}/${skill.folder}`
      })

      if (response.success) {
        skill.enabled = true
        ElMessage.success(`Skill "${skill.name}" 已启用`)
      } else {
        throw new Error(response.message || '启用失败')
      }
    }
  } catch (error: any) {
    console.error('Failed to toggle skill:', error)
    ElMessage.error(error.message || '无法切换 Skill 状态')
  } finally {
    skill.toggling = false
  }
}

const handleClose = () => {
  emit('update:visible', false)
}

// 监听弹窗打开
watch(() => props.visible, (visible) => {
  if (visible && props.sessionId) {
    loadSkills()
  }
})
</script>

<style scoped lang="scss">
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 12px;
  color: #a1a1aa;

  i {
    font-size: 32px;
    color: #3b82f6;
  }
}

.skills-content {
  max-height: 60vh;
  overflow-y: auto;
}

.info-box {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  margin-bottom: 20px;

  > i {
    color: #60a5fa;
    font-size: 18px;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .info-text {
    font-size: 12px;
    color: #93c5fd;

    .info-title {
      font-weight: 600;
      margin-bottom: 4px;
    }

    p {
      margin: 0;
    }
  }
}

.skills-section {
  .section-title {
    font-size: 14px;
    font-weight: 600;
    color: #d4d4d8;
    margin: 0 0 12px 0;
  }
}

.skills-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skill-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid #27272a;
  background: #18181b;
  transition: all 0.2s;

  &:hover {
    border-color: #3f3f46;
  }

  &.enabled {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.1);
  }

  &.invalid {
    opacity: 0.6;
  }
}

.skill-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #27272a;
  flex-shrink: 0;

  i {
    font-size: 18px;
    color: #71717a;
  }

  &.enabled {
    background: rgba(59, 130, 246, 0.2);

    i {
      color: #60a5fa;
    }
  }
}

.skill-info {
  flex: 1;
  min-width: 0;
}

.skill-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.skill-name {
  font-size: 14px;
  font-weight: 500;
  color: white;
}

.skill-version {
  font-size: 11px;
  color: #71717a;
  padding: 1px 6px;
  background: #27272a;
  border-radius: 4px;
}

.skill-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;

  &.invalid {
    background: rgba(234, 179, 8, 0.2);
    color: #facc15;
  }

  &.workspace {
    background: rgba(249, 115, 22, 0.2);
    color: #fb923c;
  }
}

.skill-description {
  font-size: 12px;
  color: #a1a1aa;
  margin: 4px 0 0 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &.empty {
    color: #52525b;
    font-style: italic;
  }
}

.skill-action {
  flex-shrink: 0;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #71717a;

  > i {
    font-size: 48px;
    color: #3f3f46;
    margin-bottom: 16px;
  }

  p {
    margin: 0 0 8px 0;
  }

  .hint {
    font-size: 12px;
    color: #52525b;
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
}

// 浅色模式
html:not(.dark) {
  .info-box {
    background: rgba(59, 130, 246, 0.05);
    border-color: rgba(59, 130, 246, 0.2);

    .info-text {
      color: #2563eb;
    }
  }

  .skills-section .section-title {
    color: #27272a;
  }

  .skill-card {
    border-color: #e5e7eb;
    background: #ffffff;

    &:hover {
      border-color: #d1d5db;
    }

    &.enabled {
      background: rgba(59, 130, 246, 0.05);
    }
  }

  .skill-icon {
    background: #f3f4f6;

    i {
      color: #9ca3af;
    }

    &.enabled {
      background: rgba(59, 130, 246, 0.1);

      i {
        color: #3b82f6;
      }
    }
  }

  .skill-name {
    color: #111827;
  }

  .skill-version {
    background: #f3f4f6;
    color: #6b7280;
  }

  .skill-description {
    color: #6b7280;

    &.empty {
      color: #9ca3af;
    }
  }

  .loading-state,
  .empty-state {
    color: #6b7280;
  }
}
</style>
