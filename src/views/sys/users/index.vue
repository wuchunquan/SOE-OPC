<template>
  <div class="art-page-container">
    <!-- 页面标题和操作按钮 -->
    <!-- <div class="page-header">
      <h2 class="text-xl font-semibold">用户管理</h2>
      <el-button type="primary" @click="openCreateDialog">
        <el-icon class="mr-1">
          <Plus />
        </el-icon>
        新增用户
      </el-button>
    </div> -->

    <!-- 搜索和筛选 -->
    <el-card shadow="never" class="search-card">
      <el-form :inline="true" :model="searchForm" class="flex">
        <el-form-item label="搜索">
          <el-input v-model="searchForm.search" placeholder="用户名/姓名/邮箱" clearable style="width: 200px"
            @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item label="部门">
          <el-tree-select v-model="searchForm.department_id" :data="departmentTree"
            :props="{ label: 'name', value: 'id', children: 'children' }" placeholder="选择部门" clearable check-strictly
            style="width: 180px" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="searchForm.role_id" placeholder="选择角色" clearable style="width: 150px">
            <el-option v-for="role in roles" :key="role.id" :label="role.name" :value="role.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.is_active" placeholder="选择状态" clearable style="width: 120px">
            <el-option label="激活" :value="true" />
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
            新增用户
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 用户列表 -->
    <el-card shadow="never" class="table-card flex w-full">

      <div class="table-wrapper" v-loading="loading">
        <el-table :data="users" style="width: 100%" stripe border height="100%">
          <el-table-column prop="id" label="ID" width="70" align="center" />
          <el-table-column prop="username" label="用户名" width="120" />
          <el-table-column prop="real_name" label="真实姓名" width="120">
            <template #default="{ row }">
              {{ row.real_name || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="部门" width="150">
            <template #default="{ row }">
              {{ row.department?.name || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="角色" min-width="150">
            <template #default="{ row }">
              <el-tag v-for="role in row.roles" :key="role.id" size="small" class="mr-1 mb-1">
                {{ role.name }}
              </el-tag>
              <span v-if="!row.roles?.length">-</span>
            </template>
          </el-table-column>
          <el-table-column prop="email" label="邮箱" min-width="180">
            <template #default="{ row }">
              {{ row.email || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="phone" label="手机号" width="130">
            <template #default="{ row }">
              {{ row.phone || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="row.is_active ? 'success' : 'danger'" size="small">
                {{ row.is_active ? '激活' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="最后登录" width="170">
            <template #default="{ row }">
              {{ row.last_login ? formatDateTime(row.last_login) : '-' }}
            </template>
          </el-table-column>
          <el-table-column label="NewAPI" width="100" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.newapi_user_id" type="success" size="small">已创建</el-tag>
              <el-tag v-else type="info" size="small">未创建</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="400" fixed="right" align="center">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="editUser(row)">编辑</el-button>
              <el-button link type="primary" size="small" @click="manageRoles(row)">角色</el-button>
              <el-button link type="warning" size="small" @click="resetPassword(row)">重置密码</el-button>
              <el-button v-if="!row.newapi_user_id" link type="success" size="small" @click="ensureNewApiUser(row)">创建NewAPI</el-button>
              <el-button v-else link type="warning" size="small" @click="resetNewApiToken(row)">重置令牌</el-button>
              <el-button link type="danger" size="small" @click="deleteUser(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination v-model:current-page="pagination.page" v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]" :total="pagination.total" layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadUsers" @current-change="loadUsers" />
      </div>
    </el-card>

    <!-- 新增/编辑用户对话框 -->
    <el-dialog v-model="showCreateDialog" :title="editingUser ? '编辑用户' : '新增用户'" width="520px" destroy-on-close
      @closed="resetUserForm">
      <el-form ref="userFormRef" :model="userForm" :rules="userFormRules" label-width="85px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="userForm.username" :disabled="!!editingUser" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item v-if="!editingUser" label="密码" prop="password">
          <el-input v-model="userForm.password" type="password" show-password placeholder="请输入密码" />
        </el-form-item>
        <el-form-item label="真实姓名" prop="real_name">
          <el-input v-model="userForm.real_name" placeholder="请输入真实姓名" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="userForm.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="userForm.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="所属部门" prop="department_id">
          <el-tree-select v-model="userForm.department_id" :data="departmentTree"
            :props="{ label: 'name', value: 'id', children: 'children' }" placeholder="请选择部门" clearable check-strictly
            style="width: 100%" />
        </el-form-item>
        <el-form-item label="角色" prop="role_ids">
          <el-select v-model="userForm.role_ids" multiple placeholder="请选择角色" style="width: 100%">
            <el-option v-for="role in roles" :key="role.id" :label="role.name" :value="role.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="is_active">
          <el-switch v-model="userForm.is_active" active-text="激活" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="saveUser">确定</el-button>
      </template>
    </el-dialog>

    <!-- 角色管理对话框 -->
    <el-dialog v-model="showRoleDialog" title="分配角色" width="450px" destroy-on-close>
      <el-form label-width="80px">
        <el-form-item label="当前用户">
          <span >{{ editingUser?.username }} ({{ editingUser?.real_name || '-' }})</span>
        </el-form-item>
        <el-form-item label="选择角色">
          <el-checkbox-group v-model="selectedRoleIds">
            <el-checkbox v-for="role in roles" :key="role.id" :value="role.id" :label="role.id">
              {{ role.name }}
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRoleDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="saveRoles">确定</el-button>
      </template>
    </el-dialog>

    <!-- 重置密码对话框 -->
    <el-dialog v-model="showPasswordDialog" title="重置密码" width="400px" destroy-on-close>
      <el-form ref="passwordFormRef" :model="passwordForm" :rules="passwordFormRules" label-width="85px">
        <el-form-item label="当前用户">
          <span>{{ editingUser?.username }}</span>
        </el-form-item>
        <el-form-item label="新密码" prop="password">
          <el-input v-model="passwordForm.password" type="password" show-password placeholder="请输入新密码" />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="passwordForm.confirmPassword" type="password" show-password placeholder="请再次输入密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showPasswordDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="savePassword">确定</el-button>
      </template>
    </el-dialog>


  </div>
</template>

<script setup lang="ts">
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import {
  getUsersApi,
  createUserApi,
  updateUserApi,
  deleteUserApi,
  resetUserPasswordApi,
  setUserRolesApi,
  type User,
  type UserCreateParams,
  type UserUpdateParams
} from '@/api/sys/users'
import { getRolesApi, type Role } from '@/api/sys/roles'
import { getDepartmentTreeApi, type Department } from '@/api/sys/departments'
import http from '@/utils/http'

defineOptions({ name: 'SysUsers' })

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
const users = ref<User[]>([])
const roles = ref<Role[]>([])
const departmentTree = ref<Department[]>([])
const showCreateDialog = ref(false)
const showRoleDialog = ref(false)
const showPasswordDialog = ref(false)
const showCompanyDialog = ref(false)
const editingUser = ref<User | null>(null)
const managingCompanyUser = ref<User | null>(null)
const userFormRef = ref<FormInstance>()
const passwordFormRef = ref<FormInstance>()
const selectedRoleIds = ref<number[]>([])

// 搜索表单
const searchForm = reactive({
  search: '',
  department_id: null as number | null,
  role_id: null as number | null,
  is_active: null as boolean | null
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 用户表单
const userForm = reactive<UserCreateParams & { role_ids: number[] }>({
  username: '',
  password: '',
  real_name: '',
  email: '',
  phone: '',
  department_id: undefined,
  role_ids: [],
  is_active: true
})

// 密码表单
const passwordForm = reactive({
  password: '',
  confirmPassword: ''
})

// 表单验证规则
const userFormRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 50, message: '用户名长度在 3 到 50 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于 6 个字符', trigger: 'blur' }
  ],
  real_name: [{ required: true, message: '请输入真实姓名', trigger: 'blur' }],
  email: [{ type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }]
}

const passwordFormRules: FormRules = {
  password: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于 6 个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        if (value !== passwordForm.password) {
          callback(new Error('两次输入密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// 加载角色列表
const loadRoles = async () => {
  try {
    const response = await getRolesApi({ page: 1, page_size: 1000 })
    roles.value = response.items || []
  } catch (error) {
    console.error('加载角色列表失败:', error)
  }
}

// 加载部门树
const loadDepartmentTree = async () => {
  try {
    departmentTree.value = await getDepartmentTreeApi()
  } catch (error) {
    console.error('加载部门树失败:', error)
  }
}

// 加载用户列表
const loadUsers = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      page_size: pagination.pageSize,
      search: searchForm.search || undefined,
      department_id: searchForm.department_id || undefined,
      role_id: searchForm.role_id || undefined,
      is_active: searchForm.is_active ?? undefined
    }
    const response = await getUsersApi(params)
    users.value = response.items || []
    pagination.total = response.total || 0
  } catch (error) {
    console.error('加载用户列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  loadUsers()
}

// 重置搜索
const resetSearch = () => {
  searchForm.search = ''
  searchForm.department_id = null
  searchForm.role_id = null
  searchForm.is_active = null
  pagination.page = 1
  loadUsers()
}

// 打开创建对话框
const openCreateDialog = () => {
  editingUser.value = null
  resetUserForm()
  showCreateDialog.value = true
}

// 编辑用户
const editUser = (user: User) => {
  editingUser.value = user
  Object.assign(userForm, {
    username: user.username,
    password: '',
    real_name: user.real_name || '',
    email: user.email || '',
    phone: user.phone || '',
    department_id: user.department_id,
    role_ids: user.roles?.map((r) => r.id) || [],
    is_active: user.is_active
  })
  showCreateDialog.value = true
}

// 保存用户
const saveUser = async () => {
  try {
    await userFormRef.value?.validate()
    submitting.value = true

    if (editingUser.value) {
      const updateData: UserUpdateParams = {
        real_name: userForm.real_name,
        email: userForm.email,
        phone: userForm.phone,
        department_id: userForm.department_id,
        role_ids: userForm.role_ids,
        is_active: userForm.is_active
      }
      await updateUserApi(editingUser.value.id, updateData)
      ElMessage.success('用户更新成功')
    } else {
      await createUserApi(userForm)
      ElMessage.success('用户创建成功')
    }

    showCreateDialog.value = false
    loadUsers()
  } catch (error: any) {
    if (error !== 'cancel' && error?.name !== 'Error') {
      console.error('保存用户失败:', error)
    }
  } finally {
    submitting.value = false
  }
}

// 重置用户表单
const resetUserForm = () => {
  Object.assign(userForm, {
    username: '',
    password: '',
    real_name: '',
    email: '',
    phone: '',
    department_id: undefined,
    role_ids: [],
    is_active: true
  })
  userFormRef.value?.resetFields()
}

// 管理角色
const manageRoles = (user: User) => {
  editingUser.value = user
  selectedRoleIds.value = user.roles?.map((r) => r.id) || []
  showRoleDialog.value = true
}

// 保存角色
const saveRoles = async () => {
  if (!editingUser.value) return
  try {
    submitting.value = true
    await setUserRolesApi(editingUser.value.id, selectedRoleIds.value)
    ElMessage.success('角色分配成功')
    showRoleDialog.value = false
    loadUsers()
  } catch (error) {
    console.error('分配角色失败:', error)
  } finally {
    submitting.value = false
  }
}

// 重置密码
const resetPassword = (user: User) => {
  editingUser.value = user
  passwordForm.password = ''
  passwordForm.confirmPassword = ''
  showPasswordDialog.value = true
}

// 保存密码
const savePassword = async () => {
  if (!editingUser.value) return
  try {
    await passwordFormRef.value?.validate()
    submitting.value = true
    await resetUserPasswordApi(editingUser.value.id, passwordForm.password)
    ElMessage.success('密码重置成功')
    showPasswordDialog.value = false
  } catch (error: any) {
    if (error !== 'cancel' && error?.name !== 'Error') {
      console.error('重置密码失败:', error)
    }
  } finally {
    submitting.value = false
  }
}

// 删除用户
const deleteUser = async (user: User) => {
  try {
    await ElMessageBox.confirm(`确定要删除用户 "${user.username}" 吗？`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await deleteUserApi(user.id)
    ElMessage.success('用户删除成功')
    loadUsers()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除用户失败:', error)
    }
  }
}

// 管理公司权限

// NewAPI 管理操作
const ensureNewApiUser = async (user: User) => {
  try {
    await ElMessageBox.confirm(`确定要为用户 "${user.username}" 创建 NewAPI 账号吗？`, '创建 NewAPI 账号', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    })
    await http.post({ url: `/api/agent/newapi/admin/ensure-user/${user.id}` })
    ElMessage.success('NewAPI 账号创建成功')
    loadUsers()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '创建失败')
    }
  }
}

const resetNewApiToken = async (user: User) => {
  try {
    await ElMessageBox.confirm(`确定要重置用户 "${user.username}" 的 NewAPI 令牌吗？`, '重置令牌', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await http.post({ url: `/api/agent/newapi/admin/reset-token/${user.id}` })
    ElMessage.success('NewAPI 令牌已重置')
    loadUsers()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '重置失败')
    }
  }
}

// 初始化
onMounted(() => {
  loadRoles()
  loadDepartmentTree()
  loadUsers()
})
</script>

<style scoped>
.art-page-container {
  padding: 16px;
  padding-bottom: 8px;
  height: calc(100vh - 119px);
  display: flex;
  flex-direction: column;
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
