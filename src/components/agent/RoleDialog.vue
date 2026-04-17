<template>
  <el-dialog
    v-model="dialogVisible"
    title="选择角色"
    width="700px"
    :close-on-click-modal="false"
  >
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <i class="pi pi-spin pi-spinner"></i>
      <span>加载中...</span>
    </div>

    <!-- 角色列表 -->
    <div v-else class="role-content">
      <!-- 系统角色 -->
      <div v-if="systemRoles.length > 0" class="role-section">
        <div class="section-header">
          <h3 class="section-title">系统预设</h3>
          <el-button v-if="isAdmin" text size="small" @click="isCreatingSystemRole = true; showCreateDialog = true; selectedChannelId = null">
            <i class="pi pi-plus"></i>
            <span>新建</span>
          </el-button>
        </div>
        <div class="role-grid">
          <div
            v-for="role in systemRoles"
            :key="role.role_id"
            class="role-card"
            :class="{ selected: selectedRole?.role_id === role.role_id }"
            @click="selectedRole = role"
          >
            <div class="role-card-content">
              <div
                class="role-icon"
                :style="{
                  backgroundColor: role.color + '20',
                  border: `2px solid ${role.color}40`
                }"
              >
                <img v-if="role.avatar_url" :src="baseUrl + role.avatar_url" :alt="role.name" class="role-avatar-img" />
                <i v-else class="pi pi-user" :style="{ color: role.color }"></i>
              </div>
              <div class="role-info">
                <h4 class="role-name">
                  {{ role.name }}
                  <!-- 已按当前分支需求临时隐藏角色上的渠道标识，保留后端字段但不在前端展示。 -->
                  <!--
                  <span v-if="role.channel" class="channel-badge" :title="'已关联渠道: ' + role.channel.name">
                    <i v-if="role.channel.channel_type === 'wecom'" class="pi pi-wechat"></i>
                    <i v-else-if="role.channel.channel_type === 'feishu'" class="pi pi-send"></i>
                    <i v-else class="pi pi-comments"></i>
                  </span>
                  -->
                </h4>
                <p class="role-description">{{ role.description }}</p>
              </div>
              <div class="role-actions">
                <div v-if="!isLocal">
                <el-tooltip :content="role.is_public ? '分享链接' : '未开启公开访问'" placement="top">
                  <el-button
                    text
                    size="small"
                    :disabled="!role.is_public"
                    @click.stop="showShareDialog(role)"
                  >
                    <i class="pi pi-share-alt"></i>
                  </el-button>
                </el-tooltip>
                </div>
                <template v-if="isAdmin">
                  <div>
                  <el-button text size="small" @click.stop="editRole(role)">
                    <i class="pi pi-pencil"></i>
                  </el-button>
                  </div>
                  <div>
                  <el-button text size="small" @click.stop="confirmDeleteRole(role)">
                    <i class="pi pi-trash"></i>
                  </el-button>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 成员共享角色 -->
      <div v-if="!isLocal && sharedRoles.length > 0" class="role-section">
        <h3 class="section-title">成员共享</h3>
        <div class="role-grid">
          <div
            v-for="role in sharedRoles"
            :key="role.role_id"
            class="role-card"
            :class="{ selected: selectedRole?.role_id === role.role_id }"
            @click="selectedRole = role"
          >
            <div class="role-card-content">
              <div
                class="role-icon"
                :style="{
                  backgroundColor: role.color + '20',
                  border: `2px solid ${role.color}40`
                }"
              >
                <img v-if="role.avatar_url" :src="baseUrl + role.avatar_url" :alt="role.name" class="role-avatar-img" />
                <i v-else class="pi pi-user" :style="{ color: role.color }"></i>
              </div>
              <div class="role-info">
                <div class="role-name-row">
                  <h4 class="role-name">{{ role.name }}</h4>
                  <span v-if="role.creator_name" class="creator-tag">{{ role.creator_name }}</span>
                </div>
                <p class="role-description">{{ role.description }}</p>
              </div>
              <div class="role-actions">
                <el-tooltip :content="role.is_public ? '分享链接' : '未开启公开访问'" placement="top">
                  <el-button
                    text
                    size="small"
                    :disabled="!role.is_public"
                    @click.stop="showShareDialog(role)"
                  >
                    <i class="pi pi-share-alt"></i>
                  </el-button>
                </el-tooltip>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 自定义角色 -->
      <div v-if="customRoles.length > 0" class="role-section">
        <div class="section-header">
          <h3 class="section-title">自定义角色</h3>
          <el-button text size="small" @click="showCreateDialog = true; selectedChannelId = null">
            <i class="pi pi-plus"></i>
            <span>新建</span>
          </el-button>
        </div>
        <div class="role-grid">
          <div
            v-for="role in customRoles"
            :key="role.role_id"
            class="role-card"
            :class="{ selected: selectedRole?.role_id === role.role_id }"
            @click="selectedRole = role"
          >
            <div class="role-card-content">
              <div
                class="role-icon"
                :style="{
                  backgroundColor: role.color + '20',
                  border: `2px solid ${role.color}40`
                }"
              >
                <img v-if="role.avatar_url" :src="baseUrl + role.avatar_url" :alt="role.name" class="role-avatar-img" />
                <i v-else class="pi pi-user" :style="{ color: role.color }"></i>
              </div>
              <div class="role-info">
                <h4 class="role-name">{{ role.name }}</h4>
                <p class="role-description">{{ role.description }}</p>
              </div>
              <div class="role-actions">
                <div v-if="!isLocal">
                <el-tooltip :content="role.is_public ? '分享链接' : '未开启公开访问'" placement="top">
                  <el-button
                    text
                    size="small"
                    :disabled="!role.is_public"
                    @click.stop="showShareDialog(role)"
                  >
                    <i class="pi pi-share-alt"></i>
                  </el-button>
                </el-tooltip>
                </div>
                <div>
                <el-button text size="small" @click.stop="editRole(role)">
                  <i class="pi pi-pencil"></i>
                </el-button>
                </div>
                <div>
                <el-button text size="small" @click.stop="confirmDeleteRole(role)">
                  <i class="pi pi-trash"></i>
                </el-button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="customRoles.length === 0 && !loading" class="empty-state">
        <p>还没有自定义角色</p>
        <el-button  @click="showCreateDialog = true; selectedChannelId = null">
          <i class="pi pi-plus"></i>
          <span>创建角色</span>
        </el-button>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" :loading="applying" :disabled="!selectedRole" @click="applyRole">
          应用角色
        </el-button>
      </div>
    </template>
  </el-dialog>

  <!-- 创建/编辑角色对话框 -->
  <el-dialog
    v-model="showCreateDialog"
    :title="editingRole ? '编辑角色' : (isCreatingSystemRole ? '创建系统角色' : '创建角色')"
    width="500px"
    :close-on-click-modal="false"
  >
    <el-form :model="roleForm" label-width="100px">
      <el-form-item label="角色名称">
        <el-input v-model="roleForm.name" placeholder="例如：专业翻译" />
      </el-form-item>

      <el-form-item label="描述">
        <el-input v-model="roleForm.description" placeholder="简短描述这个角色的特点" />
      </el-form-item>

      <el-form-item label="头像">
        <div class="avatar-upload">
          <div class="avatar-preview" v-if="roleForm.avatar_url">
            <img :src="baseUrl + roleForm.avatar_url" alt="头像预览" />
            <div class="avatar-overlay">
              <el-button text @click="handleRemoveAvatar">
                <i class="pi pi-trash"></i>
              </el-button>
            </div>
          </div>
          <el-upload
            v-else
            class="avatar-uploader"
            :action="baseUrl + '/api/agent/roles/upload-avatar'"
            :headers="uploadHeaders"
            :show-file-list="false"
            :on-success="handleAvatarSuccess"
            :before-upload="beforeAvatarUpload"
            accept="image/*"
          >
            <div class="upload-placeholder">
              <i class="pi pi-plus"></i>
              <div>点击上传头像</div>
            </div>
          </el-upload>
        </div>
      </el-form-item>

      <el-form-item label="颜色">
        <el-color-picker v-model="roleForm.color" />
      </el-form-item>

      <el-form-item v-if="!isLocal" label="公开访问">
        <div class="public-config">
          <el-switch v-model="roleForm.is_public" />
          <span class="public-hint">开启后可作为AI客服对外提供服务，无需登录即可访问</span>
        </div>
      </el-form-item>

      <el-form-item v-if="!isLocal && !isCreatingSystemRole && !(editingRole && editingRole.is_system)" label="内部共享">
        <div class="public-config">
          <el-switch v-model="roleForm.is_shared" />
          <span class="public-hint">开启后其他成员可在「成员共享」板块看到并使用此角色</span>
        </div>
      </el-form-item>

      <!-- 已按当前分支需求临时隐藏角色关联渠道配置，保留实现代码但不在前端展示。 -->
      <!--
      <el-form-item label="关联渠道">
        <el-select
          v-model="selectedChannelId"
          style="width: 100%"
          clearable
          placeholder="选择要关联的消息渠道"
        >
          <el-option
            v-for="ch in availableChannels"
            :key="ch.id"
            :label="ch.name"
            :value="ch.id"
            :disabled="isChannelOccupied(ch)"
          >
            <div class="channel-option">
              <span>{{ ch.name }}</span>
              <el-tag size="small" :type="ch.channel_type === 'wecom' ? 'success' : 'primary'" effect="plain" style="margin-left:6px">
                {{ channelTypeLabel(ch.channel_type) }}
              </el-tag>
              <span v-if="isChannelOccupied(ch)" class="occupied-hint">已关联其他角色</span>
            </div>
          </el-option>
        </el-select>
        <div class="public-hint" style="margin-top: 4px">关联后该角色可通过对应渠道接收和回复消息</div>
      </el-form-item>
      -->

      <el-form-item label="启用技能">
        <div class="skills-config">
          <el-button
            @click="openSkillsDialog"
          >
            配置技能
            <span v-if="roleForm.enabled_skills && roleForm.enabled_skills.length > 0" class="skills-count">
              ({{ roleForm.enabled_skills.length }} 个已选择)
            </span>
          </el-button>
        </div>
      </el-form-item>

      <el-form-item label="系统提示词">
        <el-input
          v-model="roleForm.prompt"
          type="textarea"
          :rows="8"
          placeholder="输入详细的系统提示词..."
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="cancelEdit">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveRole">
          {{ editingRole ? '保存' : '创建' }}
        </el-button>
      </div>
    </template>
  </el-dialog>

  <!-- 技能配置弹窗 -->
  <el-dialog
    v-model="showSkillsDialog"
    title="技能配置"
    width="600px"
    :close-on-click-modal="false"
  >
    <!-- 加载状态 -->
    <div v-if="loadingSkills" class="loading-state">
      <i class="pi pi-spin pi-spinner"></i>
      <span>加载技能列表中...</span>
    </div>

    <div v-else class="skills-content">
      <!-- 说明 -->
      <div class="info-box">
        <i class="pi pi-info-circle"></i>
        <div class="info-text">
          <p class="info-title">什么是技能？</p>
          <p>技能是自动触发的功能模块。AI助手会根据技能描述自动判断何时使用，无需手动调用。</p>
        </div>
      </div>

      <!-- 技能列表 -->
      <div v-if="availableSkills.length > 0" class="skills-section">
        <h3 class="section-title">
          可用的技能（{{ selectedSkillsCount }}/{{ availableSkills.length }} 已选择）
        </h3>
        <div class="skills-list">
          <div
            v-for="skill in availableSkills"
            :key="skill.folder_name"
            class="skill-card"
            :class="{ enabled: isSkillSelected(skill.folder_name), invalid: !skill.has_skill_md }"
          >
            <div class="skill-icon" :class="{ enabled: isSkillSelected(skill.folder_name) }">
              <i :class="isSkillSelected(skill.folder_name) ? 'pi pi-check-circle' : 'pi pi-circle'"></i>
            </div>
            <div class="skill-info">
              <div class="skill-header">
                <span class="skill-name">{{ skill.display_name }}</span>
                <span v-if="skill.version" class="skill-version">v{{ skill.version }}</span>
                <span v-if="!skill.has_skill_md" class="skill-tag invalid">无效</span>
              </div>
              <p v-if="skill.description" class="skill-description">{{ skill.description }}</p>
              <p v-else class="skill-description empty">未找到描述</p>
            </div>
            <div class="skill-action">
              <el-button
                :type="isSkillSelected(skill.folder_name) ? 'danger' : 'primary'"
                :disabled="!skill.has_skill_md"
                size="small"
                text
                @click="toggleSkill(skill.folder_name)"
              >
                <i :class="isSkillSelected(skill.folder_name) ? 'pi pi-times' : 'pi pi-plus'"></i>
                {{ isSkillSelected(skill.folder_name) ? '移除' : '选择' }}
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-state">
        <i class="pi pi-folder-open"></i>
        <p>还没有可用的技能</p>
        <p class="hint">请联系管理员添加技能模块</p>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="showSkillsDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmSkillsSelection">
          确定选择 ({{ selectedSkillsCount }} 个)
        </el-button>
      </div>
    </template>
  </el-dialog>

  <!-- 分享链接对话框 -->
  <el-dialog
    v-model="shareDialogVisible"
    title="分享链接"
    width="500px"
    :close-on-click-modal="true"
  >
    <div class="share-content">
      <div class="share-info">
        <i class="pi pi-info-circle"></i>
        <span>将此链接分享给他人，无需登录即可与 <strong>{{ sharingRole?.name }}</strong> 对话</span>
      </div>
      <div class="share-link-box">
        <el-input
          v-model="shareLink"
          readonly
          class="share-link-input"
        >
          <template #append>
            <el-button @click="copyShareLink">
              <i class="pi pi-copy"></i>
              复制
            </el-button>
          </template>
        </el-input>
      </div>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="shareDialogVisible = false">关闭</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, inject } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import http from '@/utils/http'
import { useUserStore } from '@/store/modules/user'
import { BaseUrlKey, IsLocalKey } from './injection'

interface Role {
  id: number
  role_id: string
  name: string
  description: string
  prompt: string
  icon: string
  avatar_url?: string
  color: string
  is_system: boolean
  is_public: boolean
  is_shared: boolean
  enabled_skills?: string[]
  channel?: { id: number; name: string; channel_type: string } | null
  created_by?: number
  creator_name?: string
}

interface Skill {
  folder_name: string
  display_name: string
  description: string
  version: string
  has_skill_md: boolean
}

interface Props {
  visible: boolean
  sessionId: string | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:visible': [value: boolean]
  'roleApplied': []
}>()

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const loading = ref(false)
const baseUrl = inject(BaseUrlKey, '')
const isLocal = inject(IsLocalKey, false)
const applying = ref(false)
const saving = ref(false)
const roles = ref<Role[]>([])
const selectedRole = ref<Role | null>(null)
const showCreateDialog = ref(false)
const editingRole = ref<Role | null>(null)
const isCreatingSystemRole = ref(false)
const availableSkills = ref<Skill[]>([])
const loadingSkills = ref(false)
const showSkillsDialog = ref(false)
const tempSelectedSkills = ref<string[]>([]) // 临时存储技能选择

// 分享相关
const shareDialogVisible = ref(false)
const sharingRole = ref<Role | null>(null)
const shareLink = ref('')

// 渠道关联
interface ChannelItem {
  id: number
  name: string
  channel_type: string
  role_id: string | null
  role_name: string | null
}
const availableChannels = ref<ChannelItem[]>([])
const selectedChannelId = ref<number | null>(null)

const channelTypeLabel = (type: string) => {
  const map: Record<string, string> = { wecom: '企业微信', dingtalk: '钉钉', feishu: '飞书' }
  return map[type] || type
}

const isChannelOccupied = (ch: ChannelItem) => {
  // 如果渠道已关联其他角色（不是当前编辑的角色），则禁用
  if (!ch.role_id) return false
  const currentRoleId = editingRole.value?.role_id
  return ch.role_id !== currentRoleId
}

const loadChannels = async () => {
  try {
    const res = await http.get({ url: `${baseUrl}/api/agent/channels/` })
    availableChannels.value = Array.isArray(res) ? res : []
  } catch {
    availableChannels.value = []
  }
}

// 保存渠道关联（创建/编辑角色后调用）
const saveChannelBinding = async (roleId: string) => {
  try {
    // 先解绑：如果有其他渠道之前绑了这个角色，把它的 role_id 清空
    const oldChannel = availableChannels.value.find(ch => ch.role_id === roleId && ch.id !== selectedChannelId.value)
    if (oldChannel) {
      await http.request({ url: `${baseUrl}/api/agent/channels/${oldChannel.id}`, method: 'PUT', data: { role_id: null } })
    }
    // 再绑定新渠道
    if (selectedChannelId.value) {
      await http.request({ url: `${baseUrl}/api/agent/channels/${selectedChannelId.value}`, method: 'PUT', data: { role_id: roleId } })
    }
  } catch (err) {
    console.error('保存渠道关联失败:', err)
  }
}

const roleForm = ref({
  name: '',
  description: '',
  prompt: '',
  avatar_url: '',
  color: '#3b82f6',
  is_public: false,
  is_shared: false,
  enabled_skills: [] as string[]
})

const selectedSkillsCount = computed(() => tempSelectedSkills.value.length)

// 判断当前用户是否为管理员
const userStore = useUserStore()
const isAdmin = computed(() => {
  const userInfo = userStore.getUserInfo
  if (!userInfo?.roles) return false
  return userInfo.roles.some((r: any) => r.code === 'admin')
})

// 获取认证headers
const uploadHeaders = computed(() => {
  const { accessToken } = useUserStore()
  const headers: Record<string, string> = {}

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  return headers
})

const systemRoles = computed(() => roles.value.filter(r => r.is_system))
const sharedRoles = computed(() => roles.value.filter(r => !r.is_system && r.is_shared && r.created_by !== userStore.getUserInfo?.userId))
const customRoles = computed(() => roles.value.filter(r => !r.is_system && r.created_by === userStore.getUserInfo?.userId))

// 切换技能选择状态
const toggleSkill = (skillName: string) => {
  const index = tempSelectedSkills.value.indexOf(skillName)
  if (index > -1) {
    // 如果已选择，则移除
    tempSelectedSkills.value.splice(index, 1)
  } else {
    // 如果未选择，则添加
    tempSelectedSkills.value.push(skillName)
  }
}

// 检查技能是否已选择
const isSkillSelected = (skillName: string) => {
  return tempSelectedSkills.value.includes(skillName)
}

// 确认技能选择
const confirmSkillsSelection = () => {
  roleForm.value.enabled_skills = [...tempSelectedSkills.value]
  showSkillsDialog.value = false
}

// 加载角色列表
const loadRoles = async () => {
  loading.value = true
  try {
    const response = await http.get({ url: `${baseUrl}/api/agent/roles/` })
    console.log('Roles response:', response)
    roles.value = Array.isArray(response) ? response : []
  } catch (err) {
    console.error('Failed to load roles:', err)
    ElMessage.error('加载角色列表失败')
    roles.value = []
  } finally {
    loading.value = false
  }
}

// 加载可用技能列表
const loadAvailableSkills = async () => {
  loadingSkills.value = true
  try {
    const response = await http.get({ url: `${baseUrl}/api/agent/roles/available-skills` })
    availableSkills.value = response.skills || []
  } catch (err) {
    console.error('Failed to load skills:', err)
    ElMessage.error('加载技能列表失败')
    availableSkills.value = []
  } finally {
    loadingSkills.value = false
  }
}

// 应用角色
const applyRole = async () => {
  if (!selectedRole.value) return

  applying.value = true
  try {
    if (props.sessionId) {
      // 为已有会话应用角色
      await http.post({
        url: `${baseUrl}/api/agent/sessions/${props.sessionId}/role`,
        data: {
          role_id: selectedRole.value.role_id
        }
      })
      ElMessage.success(`已应用角色：${selectedRole.value.name}`)
      emit('roleApplied')
    } else {
      // 选择角色后返回 roleId，用于创建新会话
      emit('roleApplied', selectedRole.value.role_id)
    }
    handleClose()
  } catch (err) {
    console.error('Failed to apply role:', err)
    ElMessage.error('应用角色失败')
  } finally {
    applying.value = false
  }
}

// 编辑角色
const editRole = (role: Role) => {
  editingRole.value = role
  roleForm.value = {
    name: role.name,
    description: role.description,
    prompt: role.prompt,
    avatar_url: role.avatar_url || '',
    color: role.color,
    is_public: role.is_public || false,
    is_shared: role.is_shared || false,
    enabled_skills: role.enabled_skills || []
  }
  // 已按当前分支需求临时隐藏角色关联渠道配置，保留字段但不加载渠道列表。
  // loadChannels().then(() => {
  //   const bound = availableChannels.value.find(ch => ch.role_id === role.role_id)
  //   selectedChannelId.value = bound ? bound.id : null
  // })
  showCreateDialog.value = true
}

// 打开技能配置弹窗
const openSkillsDialog = () => {
  // 将当前表单中的技能设置为临时选择
  tempSelectedSkills.value = [...(roleForm.value.enabled_skills || [])]
  showSkillsDialog.value = true
  if (availableSkills.value.length === 0) {
    loadAvailableSkills()
  }
}

// 头像上传成功
const handleAvatarSuccess = (response: any) => {
  roleForm.value.avatar_url = response.avatar_url
  ElMessage.success('头像上传成功')
}

// 上传前检查
const beforeAvatarUpload = (file: File) => {
  const isImage = file.type.startsWith('image/')
  const isLt5M = file.size / 1024 / 1024 < 5

  if (!isImage) {
    ElMessage.error('只能上传图片文件!')
    return false
  }
  if (!isLt5M) {
    ElMessage.error('图片大小不能超过 5MB!')
    return false
  }
  return true
}

// 移除头像
const handleRemoveAvatar = () => {
  roleForm.value.avatar_url = ''
}

// 保存角色
const saveRole = async () => {
  if (!roleForm.value.name || !roleForm.value.prompt) {
    ElMessage.warning('请填写角色名称和提示词')
    return
  }

  // 构建保存数据
  const payload: any = { ...roleForm.value }

  saving.value = true
  try {
    let savedRoleId = ''
    if (editingRole.value) {
      await http.request({
        url: `${baseUrl}/api/agent/roles/${editingRole.value.role_id}`,
        method: 'PUT',
        data: payload
      })
      savedRoleId = editingRole.value.role_id
      ElMessage.success('角色已更新')
    } else if (isCreatingSystemRole.value) {
      const res = await http.post({
        url: `${baseUrl}/api/agent/roles/system`,
        data: payload
      })
      savedRoleId = res.role_id
      ElMessage.success('系统角色已创建')
    } else {
      const res = await http.post({
        url: `${baseUrl}/api/agent/roles/`,
        data: payload
      })
      savedRoleId = res.role_id || ''
      ElMessage.success('角色已创建')
    }

    // 保存渠道关联
    // 已按当前分支需求临时隐藏角色关联渠道配置，不再发起渠道绑定请求。
    // if (savedRoleId) {
    //   await saveChannelBinding(savedRoleId)
    // }

    showCreateDialog.value = false
    cancelEdit()
    await loadRoles()
  } catch (err) {
    console.error('Failed to save role:', err)
    ElMessage.error('保存角色失败')
  } finally {
    saving.value = false
  }
}

// 删除角色
const confirmDeleteRole = async (role: Role) => {
  try {
    await ElMessageBox.confirm(`确定要删除角色"${role.name}"吗？`, '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await http.del({
      url: `${baseUrl}/api/agent/roles/${role.role_id}`
    })
    ElMessage.success('角色已删除')
    await loadRoles()
  } catch (error) {
    // 用户取消或删除失败
  }
}

// 取消编辑
const cancelEdit = () => {
  showCreateDialog.value = false
  editingRole.value = null
  isCreatingSystemRole.value = false
  roleForm.value = {
    name: '',
    description: '',
    prompt: '',
    avatar_url: '',
    color: '#3b82f6',
    is_public: false,
    is_shared: false,
    enabled_skills: []
  }
  selectedChannelId.value = null
}

// 显示分享对话框
const showShareDialog = (role: Role) => {
  if (!role.is_public) return
  sharingRole.value = role
  // 生成分享链接（支持 hash 路由模式）
  const baseUrl = window.location.origin
  shareLink.value = `${baseUrl}/#/agent-public/${role.role_id}`
  shareDialogVisible.value = true
}

// 复制分享链接
const copyShareLink = async () => {
  try {
    await navigator.clipboard.writeText(shareLink.value)
    ElMessage.success('链接已复制到剪贴板')
  } catch (err) {
    // 降级方案：使用传统方式复制
    const input = document.createElement('input')
    input.value = shareLink.value
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    ElMessage.success('链接已复制到剪贴板')
  }
}

const handleClose = () => {
  emit('update:visible', false)
  selectedRole.value = null
}

watch(() => props.visible, (newVal) => {
  if (newVal) {
    loadRoles()
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

.role-content {
  max-height: 60vh;
  overflow-y: auto;
}

.role-section {
  margin-bottom: 24px;

  &:last-child {
    margin-bottom: 0;
  }
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #d4d4d8;
  margin: 0 0 12px 0;
}

.role-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.role-card {
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #27272a;
  background: #18181b;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #3f3f46;
    background: #1f1f23;
  }

  &.selected {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.1);
  }
}

.role-card-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.role-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
  overflow: hidden;

  .role-avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  i {
    font-size: 20px;
  }
}

.role-info {
  flex: 1;
  min-width: 0;
}

.role-name {
  font-size: 14px;
  font-weight: 500;
  color: white;
  margin: 0 0 4px 0;

  .channel-badge {
    display: inline-flex;
    align-items: center;
    margin-left: 4px;
    color: #22c55e;
    font-size: 12px;
    vertical-align: middle;
  }
}

.role-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;

  .role-name {
    margin: 0;
  }
}

.creator-tag {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  white-space: nowrap;
  flex-shrink: 0;
}

.role-description {
  font-size: 12px;
  color: #a1a1aa;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.role-actions {
  display: flex;
  gap: 0px;
  margin-left: auto;

  // 移动端隐藏
  @media (max-width: 768px) {
    display: none;
  }

  :deep(.el-button) {
    color: #71717a;

    &:hover {
      color: white;
    }

    &:last-child:hover {
      color: #ef4444;
    }
  }
}

.channel-option {
  display: flex;
  align-items: center;
  width: 100%;

  .occupied-hint {
    margin-left: auto;
    font-size: 11px;
    color: #a1a1aa;
  }
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #71717a;

  p {
    margin-bottom: 16px;
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.avatar-upload {
  .avatar-preview {
    position: relative;
    width: 120px;
    height: 120px;
    border-radius: 8px;
    overflow: hidden;
    border: 2px solid #27272a;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s;

      :deep(.el-button) {
        color: white;
        font-size: 20px;
      }
    }

    &:hover .avatar-overlay {
      opacity: 1;
    }
  }

  .avatar-uploader {
    :deep(.el-upload) {
      border: 2px dashed #27272a;
      border-radius: 8px;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      transition: border-color 0.2s;

      &:hover {
        border-color: #3b82f6;
      }
    }

    .upload-placeholder {
      width: 120px;
      height: 120px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #71717a;
      font-size: 14px;

      i {
        font-size: 32px;
        margin-bottom: 8px;
      }
    }
  }
}

// 技能配置按钮样式
.skills-config {
  .skills-count {
    color: #71717a;
    font-size: 12px;
  }
}

// 公开访问配置样式
.public-config {
  display: flex;
  align-items: center;
  gap: 12px;

  .public-hint {
    font-size: 12px;
    color: #71717a;
  }
}

// 分享对话框样式
.share-content {
  .share-info {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 16px;
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 8px;
    margin-bottom: 16px;
    font-size: 14px;
    color: #93c5fd;

    > i {
      color: #60a5fa;
      font-size: 18px;
      flex-shrink: 0;
      margin-top: 2px;
    }

    strong {
      color: #60a5fa;
    }
  }

  .share-link-box {
    .share-link-input {
      :deep(.el-input__inner) {
        font-family: monospace;
        font-size: 13px;
      }
    }
  }
}

// 技能配置弹窗样式
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

// 深色主题
html.dark {
  .role-card {
    border-color: #27272a;
    background: #18181b;

    &:hover {
      border-color: #3f3f46;
      background: #1f1f23;
    }


    &.selected {
      border-color: #3f3f46;
      background: #1f1f23;
    }
  }

  .skill-card {
    border-color: #27272a;
    background: #18181b;

    &:hover {
      border-color: #3f3f46;
    }

    &.enabled {
      border-color: #3b82f6;
      background: rgba(59, 130, 246, 0.1);
    }
  }

  .skill-icon {
    background: #27272a;

    i {
      color: #71717a;
    }

    &.enabled {
      background: rgba(59, 130, 246, 0.2);

      i {
        color: #60a5fa;
      }
    }
  }

  .skill-name {
    color: white;
  }

  .skill-version {
    background: #27272a;
    color: #71717a;
  }

  .skill-description {
    color: #a1a1aa;

    &.empty {
      color: #52525b;
    }
  }

  .skills-section .section-title {
    color: #d4d4d8;
  }
}

// 浅色模式
html:not(.dark) {
  .section-title {
    color: #27272a;
  }

  .role-card {
    border-color: #e5e7eb;
    background: #ffffff;

    &:hover {
      border-color: #d1d5db;
      background: #f9fafb;
    }

    &.selected {
      background: rgba(59, 130, 246, 0.05);
    }
  }

  .role-name {
    color: #111827;
  }

  .creator-tag {
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
  }

  .role-description {
    color: #6b7280;
  }

  .role-actions {
    :deep(.el-button) {
      color: #9ca3af;

      &:hover {
        color: #3b82f6;
      }

      &:last-child:hover {
        color: #ef4444;
      }

      &.is-disabled {
        color: #d1d5db;
      }
    }
  }

  .loading-state,
  .empty-state {
    color: #6b7280;
  }

  .public-config .public-hint {
    color: #6b7280;
  }

  .share-content .share-info {
    background: rgba(59, 130, 246, 0.05);
    border-color: rgba(59, 130, 246, 0.2);
    color: #2563eb;

    > i {
      color: #3b82f6;
    }

    strong {
      color: #3b82f6;
    }
  }

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
}
</style>
