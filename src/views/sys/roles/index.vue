<template>
  <div class="art-page-container role-page">
    <!-- 页面标题和操作按钮 -->


    <!-- 搜索和筛选 -->
    <el-card shadow="never" class="search-card">
      <el-form :inline="true" :model="searchForm" class="flex">
        <el-form-item label="搜索">
          <el-input
            v-model="searchForm.search"
            placeholder="角色名称/编码"
            clearable
            style="width: 200px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.is_active" placeholder="选择状态" clearable style="width: 120px">
            <el-option label="启用" :value="true" />
            <el-option label="禁用" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
        <el-form-item style="margin-left: auto;margin-right: 0;">
          <el-button type="primary" @click="openCreateDialog">
            <el-icon class="mr-1">
              <Plus />
            </el-icon>
            新增角色
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 角色列表 -->
    <el-card shadow="never" class="table-card">
      <div class="table-wrapper" v-loading="loading">
        <el-table :data="roles" style="width: 100%" border stripe height="100%">
          <el-table-column prop="id" label="ID" width="70" align="center" />
          <el-table-column prop="name" label="角色名称" width="150" />
          <el-table-column prop="code" label="角色编码" width="150" />
          <el-table-column prop="description" label="描述" min-width="200">
            <template #default="{ row }">
              {{ row.description || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="row.is_active ? 'success' : 'danger'" size="small">
                {{ row.is_active ? '启用' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="创建时间" width="170">
            <template #default="{ row }">
              {{ formatDateTime(row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right" align="center">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="editRole(row)">编辑</el-button>
              <el-button link type="primary" size="small" @click="managePermissions(row)">权限</el-button>
              <el-button link type="danger" size="small" @click="deleteRole(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadRoles"
          @current-change="loadRoles"
        />
      </div>
    </el-card>

    <!-- 新增/编辑角色对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingRole ? '编辑角色' : '新增角色'"
      width="480px"
      destroy-on-close
      @closed="resetRoleForm"
    >
      <el-form ref="roleFormRef" :model="roleForm" :rules="roleFormRules" label-width="85px">
        <el-form-item label="角色名称" prop="name">
          <el-input v-model="roleForm.name" placeholder="请输入角色名称" />
        </el-form-item>
        <el-form-item label="角色编码" prop="code">
          <el-input v-model="roleForm.code" :disabled="!!editingRole" placeholder="请输入角色编码" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="roleForm.description" type="textarea" :rows="3" placeholder="请输入描述" />
        </el-form-item>
        <el-form-item label="状态" prop="is_active">
          <el-switch v-model="roleForm.is_active" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="saveRole">确定</el-button>
      </template>
    </el-dialog>

    <!-- 权限分配对话框 -->
    <el-dialog v-model="showPermissionDialog" title="分配权限" width="600px" destroy-on-close>
      <div v-if="editingRole">
        <div class="mb-4">
          <el-alert :title="`正在为角色「${editingRole.name}」分配权限`" type="info" :closable="false" />
        </div>

        <!-- 权限树 -->
        <div class="permission-tree-container">
          <el-tree
            ref="permissionTreeRef"
            :data="permissionTreeData"
            :props="{ children: 'children', label: 'label' }"
            node-key="id"
            show-checkbox
            default-expand-all
            :default-checked-keys="selectedPermissionIds"
            @check="handlePermissionCheck"
          >
            <template #default="{ node, data }">
              <el-tooltip v-if="data.description" :content="data.description" placement="top">
                <span class="tree-node-label">{{ node.label }}</span>
              </el-tooltip>
              <span v-else class="tree-node-label">{{ node.label }}</span>
            </template>
          </el-tree>
        </div>
      </div>
      <template #footer>
        <el-button @click="showPermissionDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="savePermissions">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import {
  getRolesApi,
  createRoleApi,
  updateRoleApi,
  deleteRoleApi,
  getRolePermissionsApi,
  setRolePermissionsApi,
  type Role,
  type RoleCreateParams,
  type RoleUpdateParams
} from '@/api/sys/roles'
import { getPermissionsApi, type Permission } from '@/api/sys/permissions'

defineOptions({ name: 'SysRoles' })

// 格式化日期时间
const formatDateTime = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 响应式数据
const loading = ref(false)
const submitting = ref(false)
const roles = ref<Role[]>([])
const permissions = ref<Permission[]>([])
const showCreateDialog = ref(false)
const showPermissionDialog = ref(false)
const editingRole = ref<Role | null>(null)
const roleFormRef = ref<FormInstance>()
const permissionTreeRef = ref()
const selectedPermissionIds = ref<number[]>([])

// 搜索表单
const searchForm = reactive({
  search: '',
  is_active: null as boolean | null
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 角色表单
const roleForm = reactive<RoleCreateParams>({
  name: '',
  code: '',
  description: '',
  is_active: true
})

// 表单验证规则
const roleFormRules: FormRules = {
  name: [
    { required: true, message: '请输入角色名称', trigger: 'blur' },
    { min: 2, max: 50, message: '角色名称长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入角色编码', trigger: 'blur' },
    { min: 2, max: 50, message: '角色编码长度在 2 到 50 个字符', trigger: 'blur' },
    { pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/, message: '角色编码必须以字母开头，只能包含字母、数字和下划线', trigger: 'blur' }
  ]
}

// 构建权限树形数据
const permissionTreeData = computed(() => {
  const modules = new Map()

  permissions.value.forEach((permission) => {
    const moduleName = permission.module || '其他'
    if (!modules.has(moduleName)) {
      modules.set(moduleName, {
        id: `module_${moduleName}`,
        label: moduleName,
        isModule: true,
        count: 0,
        children: []
      })
    }
    const module = modules.get(moduleName)
    module.children.push({
      id: permission.id,
      label: permission.name,
      description: permission.description,
      isModule: false
    })
    module.count++
  })

  return Array.from(modules.values())
})

// 处理权限树复选框变化
const handlePermissionCheck = () => {
  const checkedKeys = permissionTreeRef.value?.getCheckedKeys(true) || []
  selectedPermissionIds.value = checkedKeys.filter((key: any) => typeof key === 'number')
}

// 加载权限列表
const loadPermissions = async () => {
  try {
    const response = await getPermissionsApi({ page: 1, page_size: 1000 })
    permissions.value = response.items || []
  } catch (error) {
    console.error('加载权限列表失败:', error)
  }
}

// 加载角色列表
const loadRoles = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      page_size: pagination.pageSize,
      search: searchForm.search || undefined,
      is_active: searchForm.is_active ?? undefined
    }
    const response = await getRolesApi(params)
    roles.value = response.items || []
    pagination.total = response.total || 0
  } catch (error) {
    console.error('加载角色列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  loadRoles()
}

// 重置搜索
const resetSearch = () => {
  searchForm.search = ''
  searchForm.is_active = null
  pagination.page = 1
  loadRoles()
}

// 打开创建对话框
const openCreateDialog = () => {
  editingRole.value = null
  resetRoleForm()
  showCreateDialog.value = true
}

// 编辑角色
const editRole = (role: Role) => {
  editingRole.value = role
  Object.assign(roleForm, {
    name: role.name,
    code: role.code,
    description: role.description || '',
    is_active: role.is_active
  })
  showCreateDialog.value = true
}

// 保存角色
const saveRole = async () => {
  try {
    await roleFormRef.value?.validate()
    submitting.value = true

    if (editingRole.value) {
      const updateData: RoleUpdateParams = {
        name: roleForm.name,
        description: roleForm.description,
        is_active: roleForm.is_active
      }
      await updateRoleApi(editingRole.value.id, updateData)
      ElMessage.success('角色更新成功')
    } else {
      await createRoleApi(roleForm)
      ElMessage.success('角色创建成功')
    }

    showCreateDialog.value = false
    loadRoles()
  } catch (error: any) {
    if (error !== 'cancel' && error?.name !== 'Error') {
      console.error('保存角色失败:', error)
    }
  } finally {
    submitting.value = false
  }
}

// 重置角色表单
const resetRoleForm = () => {
  Object.assign(roleForm, {
    name: '',
    code: '',
    description: '',
    is_active: true
  })
  roleFormRef.value?.resetFields()
}

// 管理权限
const managePermissions = async (role: Role) => {
  editingRole.value = role
  try {
    const permissionIds = await getRolePermissionsApi(role.id)
    selectedPermissionIds.value = permissionIds || []
  } catch (error) {
    console.error('加载角色权限失败:', error)
    selectedPermissionIds.value = []
  }
  showPermissionDialog.value = true
}

// 保存权限
const savePermissions = async () => {
  if (!editingRole.value) return
  try {
    submitting.value = true
    // 从树组件获取所有选中的叶子节点（只包括权限，不包括模块）
    const checkedKeys = permissionTreeRef.value?.getCheckedKeys(true) || []
    const permissionIds = checkedKeys.filter((key: any) => typeof key === 'number')
    await setRolePermissionsApi(editingRole.value.id, permissionIds)
    ElMessage.success('权限分配成功')
    showPermissionDialog.value = false
  } catch (error) {
    console.error('分配权限失败:', error)
  } finally {
    submitting.value = false
  }
}

// 删除角色
const deleteRole = async (role: Role) => {
  try {
    await ElMessageBox.confirm(`确定要删除角色 "${role.name}" 吗？`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await deleteRoleApi(role.id)
    ElMessage.success('角色删除成功')
    loadRoles()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除角色失败:', error)
    }
  }
}

// 初始化
onMounted(() => {
  loadPermissions()
  loadRoles()
})
</script>

<style scoped>
.art-page-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px;
  padding-bottom: 8px;
  box-sizing: border-box;
}

.page-header {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.search-card {
  flex-shrink: 0;
  margin-bottom: 16px;
}

.table-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.table-card :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.table-wrapper {
  flex: 1;
  overflow: hidden;
}

.pagination-wrapper {
  flex-shrink: 0;
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.permission-tree-container {
  max-height: 450px;
  overflow-y: auto;
  border-radius: 4px;
  padding: 12px;
}

.tree-node-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}
</style>

<style>
.role-page .el-tree-node__content {
  height: 32px;
  padding: 4px 0;
}

.role-page .el-tree-node.is-expanded > .el-tree-node__children {
  display: flex;
  flex-flow: wrap;
}
</style>