<template>
  <div class="art-page-container">
    <!-- 页面标题和操作按钮 -->
    <!-- <div class="page-header">
      <h2 class="text-xl font-semibold">权限管理</h2>
      <el-button type="primary" @click="openCreateDialog">
        <el-icon class="mr-1"><Plus /></el-icon>
        新增权限
      </el-button>
    </div> -->

    <!-- 搜索和筛选 -->
    <el-card shadow="never" class="search-card">
      <el-form :inline="true" :model="searchForm" class="flex">
        <el-form-item label="搜索">
          <el-input
            v-model="searchForm.search"
            placeholder="权限名称/编码"
            clearable
            style="width: 200px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="模块">
          <el-select v-model="searchForm.module" placeholder="选择模块" clearable style="width: 150px">
            <el-option v-for="mod in modules" :key="mod" :label="mod" :value="mod" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
        <el-form-item style="margin-left: auto; margin-right: 0;">
          <el-button type="primary" @click="openCreateDialog">
            <el-icon class="mr-1"><Plus /></el-icon>
            新增权限
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 权限列表 -->
    <el-card shadow="never" class="table-card">
      <div class="table-wrapper" v-loading="loading">
        <el-table :data="permissions" style="width: 100%" border stripe height="100%">
          <el-table-column prop="id" label="ID" width="70" align="center" />
          <el-table-column prop="name" label="权限名称" width="150" />
          <el-table-column prop="code" label="权限编码" width="200" />
          <el-table-column prop="module" label="模块" width="120">
            <template #default="{ row }">
              <el-tag v-if="row.module" size="small">{{ row.module }}</el-tag>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column prop="action" label="操作类型" width="100">
            <template #default="{ row }">
              {{ row.action || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="description" label="描述" min-width="200">
            <template #default="{ row }">
              {{ row.description || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="创建时间" width="170">
            <template #default="{ row }">
              {{ formatDateTime(row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150" fixed="right" align="center">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="editPermission(row)">编辑</el-button>
              <el-button link type="danger" size="small" @click="deletePermission(row)">删除</el-button>
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
          @size-change="loadPermissions"
          @current-change="loadPermissions"
        />
      </div>
    </el-card>

    <!-- 新增/编辑权限对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingPermission ? '编辑权限' : '新增权限'"
      width="480px"
      destroy-on-close
      @closed="resetPermissionForm"
    >
      <el-form ref="permissionFormRef" :model="permissionForm" :rules="permissionFormRules" label-width="85px">
        <el-form-item label="权限名称" prop="name">
          <el-input v-model="permissionForm.name" placeholder="请输入权限名称" />
        </el-form-item>
        <el-form-item label="权限编码" prop="code">
          <el-input v-model="permissionForm.code" :disabled="!!editingPermission" placeholder="请输入权限编码" />
        </el-form-item>
        <el-form-item label="模块" prop="module">
          <el-select
            v-model="permissionForm.module"
            placeholder="选择或输入模块"
            filterable
            allow-create
            style="width: 100%"
          >
            <el-option v-for="mod in modules" :key="mod" :label="mod" :value="mod" />
          </el-select>
        </el-form-item>
        <el-form-item label="操作类型" prop="action">
          <el-select
            v-model="permissionForm.action"
            placeholder="选择或输入操作类型"
            filterable
            allow-create
            style="width: 100%"
          >
            <el-option label="查看" value="view" />
            <el-option label="创建" value="create" />
            <el-option label="编辑" value="edit" />
            <el-option label="删除" value="delete" />
            <el-option label="导入" value="import" />
            <el-option label="导出" value="export" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="permissionForm.description" type="textarea" :rows="3" placeholder="请输入描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="savePermission">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import {
  getPermissionsApi,
  createPermissionApi,
  updatePermissionApi,
  deletePermissionApi,
  type Permission,
  type PermissionCreateParams,
  type PermissionUpdateParams
} from '@/api/sys/permissions'

defineOptions({ name: 'SysPermissions' })

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
const permissions = ref<Permission[]>([])
const modules = ref<string[]>([])
const showCreateDialog = ref(false)
const editingPermission = ref<Permission | null>(null)
const permissionFormRef = ref<FormInstance>()

// 搜索表单
const searchForm = reactive({
  search: '',
  module: ''
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 权限表单
const permissionForm = reactive<PermissionCreateParams>({
  name: '',
  code: '',
  description: '',
  module: '',
  action: ''
})

// 表单验证规则
const permissionFormRules: FormRules = {
  name: [
    { required: true, message: '请输入权限名称', trigger: 'blur' },
    { min: 2, max: 50, message: '权限名称长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入权限编码', trigger: 'blur' },
    { min: 2, max: 100, message: '权限编码长度在 2 到 100 个字符', trigger: 'blur' },
    { pattern: /^[a-zA-Z][a-zA-Z0-9_:]*$/, message: '权限编码必须以字母开头，只能包含字母、数字、下划线和冒号', trigger: 'blur' }
  ]
}

// 提取所有模块
const extractModules = () => {
  const moduleSet = new Set<string>()
  permissions.value.forEach((p) => {
    if (p.module) moduleSet.add(p.module)
  })
  modules.value = Array.from(moduleSet).sort()
}

// 加载权限列表
const loadPermissions = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      page_size: pagination.pageSize,
      search: searchForm.search || undefined,
      module: searchForm.module || undefined
    }
    const response = await getPermissionsApi(params)
    permissions.value = response.items || []
    pagination.total = response.total || 0
    extractModules()
  } catch (error) {
    console.error('加载权限列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  loadPermissions()
}

// 重置搜索
const resetSearch = () => {
  searchForm.search = ''
  searchForm.module = ''
  pagination.page = 1
  loadPermissions()
}

// 打开创建对话框
const openCreateDialog = () => {
  editingPermission.value = null
  resetPermissionForm()
  showCreateDialog.value = true
}

// 编辑权限
const editPermission = (permission: Permission) => {
  editingPermission.value = permission
  Object.assign(permissionForm, {
    name: permission.name,
    code: permission.code,
    description: permission.description || '',
    module: permission.module || '',
    action: permission.action || ''
  })
  showCreateDialog.value = true
}

// 保存权限
const savePermission = async () => {
  try {
    await permissionFormRef.value?.validate()
    submitting.value = true

    if (editingPermission.value) {
      const updateData: PermissionUpdateParams = {
        name: permissionForm.name,
        description: permissionForm.description,
        module: permissionForm.module,
        action: permissionForm.action
      }
      await updatePermissionApi(editingPermission.value.id, updateData)
      ElMessage.success('权限更新成功')
    } else {
      await createPermissionApi(permissionForm)
      ElMessage.success('权限创建成功')
    }

    showCreateDialog.value = false
    loadPermissions()
  } catch (error: any) {
    if (error !== 'cancel' && error?.name !== 'Error') {
      console.error('保存权限失败:', error)
    }
  } finally {
    submitting.value = false
  }
}

// 重置权限表单
const resetPermissionForm = () => {
  Object.assign(permissionForm, {
    name: '',
    code: '',
    description: '',
    module: '',
    action: ''
  })
  permissionFormRef.value?.resetFields()
}

// 删除权限
const deletePermission = async (permission: Permission) => {
  try {
    await ElMessageBox.confirm(`确定要删除权限 "${permission.name}" 吗？`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await deletePermissionApi(permission.id)
    ElMessage.success('权限删除成功')
    loadPermissions()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除权限失败:', error)
    }
  }
}

// 初始化
onMounted(() => {
  loadPermissions()
})
</script>

<style scoped>
.art-page-container {
  height: calc(100vh - 119px);
  overflow: auto;
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
</style>
