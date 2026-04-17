<template>
  <div class="art-page-container" style="height: calc(100vh - 119px)">
    <div class="flex gap-4 overflow-auto h-full">
      <!-- 左侧：部门树 -->
      <el-card shadow="never" class="department-tree-card" style="width: 300px; flex-shrink: 0">
        <template #header>
          <div class="flex justify-between items-center">
            <span class="font-semibold">组织架构</span>
            <el-button type="primary" size="small" @click="openCreateDepartmentDialog(null)">
              <el-icon class="mr-1">
                <Plus />
              </el-icon>
              新增
            </el-button>
          </div>
        </template>
        <div class="tree-search">
          <el-input v-model="treeFilter" placeholder="搜索部门" clearable />
        </div>
        <div class="tree-wrapper" v-loading="treeLoading">
          <el-tree ref="treeRef" :data="departmentTreeWithRoot" :props="{ label: 'name', children: 'children' }"
            :filter-node-method="filterNode" node-key="id" highlight-current default-expand-all
            @node-click="handleNodeClick">
            <template #default="{ node, data }">
              <div class="tree-node flex items-center justify-between w-full">
                <span>{{ node.label }}</span>
                <el-dropdown v-if="!data.isVirtualRoot" trigger="click"
                  @command="(cmd: string) => handleTreeCommand(cmd, data)">
                  <el-icon class="tree-action" @click.stop>
                    <MoreFilled />
                  </el-icon>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="add">新增子部门</el-dropdown-item>
                      <el-dropdown-item command="edit">编辑</el-dropdown-item>
                      <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </template>
          </el-tree>
        </div>
      </el-card>

      <!-- 右侧：员工列表 -->
      <el-card shadow="never" class="employee-list-card">
        <template #header>
          <div class="flex justify-between items-center">
            <span class="font-semibold">
              {{ (selectedDepartment as any)?.isVirtualRoot ? '全部员工' : (selectedDepartment ? `${selectedDepartment.name}
              - 员工列表` : '员工列表') }}
            </span>
            <el-button type="primary" size="small" @click="openCreateEmployeeDialog">
              <el-icon class="mr-1">
                <Plus />
              </el-icon>
              新增员工
            </el-button>
          </div>
        </template>
        <div class="employee-content">
          <!-- 搜索 -->
          <el-form :inline="true" :model="searchForm" class="search-form">
            <el-form-item>
              <el-input v-model="searchForm.search" placeholder="搜索用户名/姓名" clearable style="width: 200px"
                @keyup.enter="loadEmployees" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="loadEmployees">搜索</el-button>
            </el-form-item>
          </el-form>

          <!-- 表格容器 -->
          <div class="table-wrapper" v-loading="tableLoading">
            <el-table :data="employees" style="width: 100%" border stripe height="100%">
              <el-table-column prop="id" label="ID" width="70" align="center" />
              <el-table-column prop="username" label="用户名" width="120" />
              <el-table-column prop="real_name" label="真实姓名" width="120">
                <template #default="{ row }">
                  {{ row.real_name || '-' }}
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
              <el-table-column label="角色" min-width="150">
                <template #default="{ row }">
                  <el-tag v-for="role in row.roles" :key="role.id" size="small" class="mr-1">
                    {{ role.name }}
                  </el-tag>
                  <span v-if="!row.roles?.length">-</span>
                </template>
              </el-table-column>
              <el-table-column label="状态" width="80" align="center">
                <template #default="{ row }">
                  <el-tag :type="row.is_active ? 'success' : 'danger'" size="small">
                    {{ row.is_active ? '激活' : '禁用' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="200" fixed="right" align="center">
                <template #default="{ row }">
                  <el-button link type="primary" size="small" @click="editEmployee(row)">编辑</el-button>
                  <el-button link type="warning" size="small" @click="resetPassword(row)">重置密码</el-button>
                  <el-button link type="danger" size="small" @click="deleteEmployee(row)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <!-- 分页 -->
          <div class="pagination-wrapper flex justify-center">
            <el-pagination v-model:current-page="pagination.page" v-model:page-size="pagination.pageSize"
              :page-sizes="[10, 20, 50]" :total="pagination.total" layout="total, sizes, prev, pager, next"
              @size-change="loadEmployees" @current-change="loadEmployees" />
          </div>
        </div>
      </el-card>
    </div>

    <!-- 新增/编辑部门对话框 -->
    <el-dialog v-model="showDepartmentDialog" :title="editingDepartment ? '编辑部门' : '新增部门'" width="480px"
      destroy-on-close @closed="resetDepartmentForm">
      <el-form ref="departmentFormRef" :model="departmentForm" :rules="departmentFormRules" label-width="85px">
        <el-form-item label="部门名称" prop="name">
          <el-input v-model="departmentForm.name" placeholder="请输入部门名称" />
        </el-form-item>
        <el-form-item label="部门编码" prop="code">
          <el-input v-model="departmentForm.code" :disabled="!!editingDepartment" placeholder="请输入部门编码" />
        </el-form-item>
        <el-form-item label="上级部门">
          <el-tree-select v-model="departmentForm.parent_id" :data="departmentTree"
            :props="{ label: 'name', value: 'id', children: 'children' }" placeholder="选择上级部门（留空为顶级）" clearable
            check-strictly style="width: 100%" />
        </el-form-item>
        <el-form-item label="负责人">
          <EmployeeSelector v-model="departmentForm.manager_id" :selected-employee-info="selectedManagerInfo"
            placeholder="选择负责人" @change="handleManagerChange" />
        </el-form-item>
        <el-form-item label="排序" prop="sort_order">
          <el-input-number v-model="departmentForm.sort_order" :min="0" :max="9999" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="departmentForm.description" type="textarea" :rows="3" placeholder="请输入描述" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="departmentForm.is_active" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDepartmentDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="saveDepartment">确定</el-button>
      </template>
    </el-dialog>

    <!-- 重置密码对话框 -->
    <el-dialog v-model="showPasswordDialog" title="重置密码" width="400px" destroy-on-close>
      <el-form ref="passwordFormRef" :model="passwordForm" :rules="passwordFormRules" label-width="85px">
        <el-form-item label="当前用户">
          <span >{{ editingEmployee?.username }}</span>
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

    <!-- 新增/编辑员工对话框 -->
    <el-dialog v-model="showEmployeeDialog" :title="editingEmployee ? '编辑员工' : '新增员工'" width="500px" destroy-on-close
      @closed="resetEmployeeForm">
      <el-form ref="employeeFormRef" :model="employeeForm" :rules="employeeFormRules" label-width="85px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="employeeForm.username" :disabled="!!editingEmployee" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item v-if="!editingEmployee" label="密码" prop="password">
          <el-input v-model="employeeForm.password" type="password" show-password placeholder="请输入密码" />
        </el-form-item>
        <el-form-item label="真实姓名" prop="real_name">
          <el-input v-model="employeeForm.real_name" placeholder="请输入真实姓名" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="employeeForm.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="employeeForm.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="所属部门">
          <el-tree-select v-model="employeeForm.department_id" :data="departmentTree"
            :props="{ label: 'name', value: 'id', children: 'children' }" placeholder="选择部门" clearable check-strictly
            style="width: 100%" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="employeeForm.role_ids" multiple placeholder="选择角色" style="width: 100%">
            <el-option v-for="role in roles" :key="role.id" :label="role.name" :value="role.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="employeeForm.is_active" active-text="激活" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEmployeeDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="saveEmployee">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { Plus, MoreFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import type { ElTree } from 'element-plus'
import {
  getDepartmentTreeApi,
  createDepartmentApi,
  updateDepartmentApi,
  deleteDepartmentApi,
  type Department,
  type DepartmentCreateParams,
  type DepartmentUpdateParams
} from '@/api/sys/departments'
import { getUsersApi, createUserApi, updateUserApi, deleteUserApi, resetUserPasswordApi, type User, type UserCreateParams, type UserUpdateParams } from '@/api/sys/users'
import { getRolesApi, type Role } from '@/api/sys/roles'
import EmployeeSelector from '@/components/EmployeeSelector/index.vue'

defineOptions({ name: 'SysOrganization' })

// 响应式数据
const treeLoading = ref(false)
const tableLoading = ref(false)
const submitting = ref(false)
const departmentTree = ref<Department[]>([])
const employees = ref<User[]>([])
const roles = ref<Role[]>([])
const selectedDepartment = ref<Department | null>(null)
const showDepartmentDialog = ref(false)
const showPasswordDialog = ref(false)
const showEmployeeDialog = ref(false)
const editingDepartment = ref<Department | null>(null)
const editingEmployee = ref<User | null>(null)
const treeFilter = ref('')
const treeRef = ref<InstanceType<typeof ElTree>>()
const departmentFormRef = ref<FormInstance>()
const passwordFormRef = ref<FormInstance>()
const employeeFormRef = ref<FormInstance>()
const selectedManagerInfo = ref<User | null>(null)

// 带虚拟根节点的部门树
const departmentTreeWithRoot = computed(() => {
  return [
    {
      id: 'root',
      name: '全公司',
      isVirtualRoot: true,
      children: departmentTree.value
    }
  ]
})

// 搜索表单
const searchForm = reactive({
  search: ''
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 部门表单
const departmentForm = reactive<DepartmentCreateParams>({
  name: '',
  code: '',
  parent_id: undefined,
  manager_id: undefined,
  description: '',
  sort_order: 0,
  is_active: true
})

// 表单验证规则
const departmentFormRules: FormRules = {
  name: [
    { required: true, message: '请输入部门名称', trigger: 'blur' },
    { min: 2, max: 50, message: '部门名称长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入部门编码', trigger: 'blur' },
    { pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/, message: '部门编码必须以字母开头，只能包含字母、数字和下划线', trigger: 'blur' }
  ]
}

// 密码表单
const passwordForm = reactive({
  password: '',
  confirmPassword: ''
})

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

// 员工表单
const employeeForm = reactive({
  username: '',
  password: '',
  real_name: '',
  email: '',
  phone: '',
  department_id: undefined as number | undefined,
  role_ids: [] as number[],
  is_active: true
})

// 员工表单验证规则
const employeeFormRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 50, message: '用户名长度在 3 到 50 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于 6 个字符', trigger: 'blur' }
  ],
  real_name: [
    { required: true, message: '请输入真实姓名', trigger: 'blur' }
  ],
  email: [
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ]
}

// 监听树搜索
watch(treeFilter, (val) => {
  treeRef.value?.filter(val)
})

// 过滤节点
const filterNode = (value: string, data: Department) => {
  if (!value) return true
  return data.name.includes(value)
}

// 加载部门树
const loadDepartmentTree = async () => {
  treeLoading.value = true
  try {
    departmentTree.value = await getDepartmentTreeApi()
  } catch (error) {
    console.error('加载部门树失败:', error)
  } finally {
    treeLoading.value = false
  }
}

// 加载角色列表
const loadRoles = async () => {
  try {
    const response = await getRolesApi({ page_size: 100, is_active: true })
    roles.value = response.items || []
  } catch (error) {
    console.error('加载角色列表失败:', error)
  }
}

// 加载员工列表
const loadEmployees = async () => {
  tableLoading.value = true
  try {
    const params: Record<string, any> = {
      page: pagination.page,
      page_size: pagination.pageSize,
      search: searchForm.search || undefined
    }
    // 如果不是虚拟根节点，才传递 department_id
    if (selectedDepartment.value && !(selectedDepartment.value as any).isVirtualRoot) {
      params.department_id = selectedDepartment.value.id
    }
    const response = await getUsersApi(params)
    employees.value = response.items || []
    pagination.total = response.total || 0
  } catch (error) {
    console.error('加载员工列表失败:', error)
  } finally {
    tableLoading.value = false
  }
}

// 点击节点
const handleNodeClick = (data: Department) => {
  selectedDepartment.value = data
  pagination.page = 1
  loadEmployees()
}

// 处理树节点操作
const handleTreeCommand = (command: string, data: Department) => {
  switch (command) {
    case 'add':
      openCreateDepartmentDialog(data)
      break
    case 'edit':
      editDepartment(data)
      break
    case 'delete':
      deleteDepartment(data)
      break
  }
}

// 打开创建部门对话框
const openCreateDepartmentDialog = (parent: Department | null) => {
  editingDepartment.value = null
  resetDepartmentForm()
  departmentForm.parent_id = parent?.id
  showDepartmentDialog.value = true
}

// 编辑部门
const editDepartment = (department: Department) => {
  editingDepartment.value = department
  Object.assign(departmentForm, {
    name: department.name,
    code: department.code,
    parent_id: department.parent_id,
    manager_id: department.manager_id,
    description: department.description || '',
    sort_order: department.sort_order || 0,
    is_active: department.is_active
  })
  // 设置负责人信息用于显示
  selectedManagerInfo.value = department.manager as User || null
  showDepartmentDialog.value = true
}

// 保存部门
const saveDepartment = async () => {
  try {
    await departmentFormRef.value?.validate()
    submitting.value = true

    if (editingDepartment.value) {
      const updateData: DepartmentUpdateParams = {
        name: departmentForm.name,
        parent_id: departmentForm.parent_id,
        manager_id: departmentForm.manager_id,
        description: departmentForm.description,
        sort_order: departmentForm.sort_order,
        is_active: departmentForm.is_active
      }
      await updateDepartmentApi(editingDepartment.value.id, updateData)
      ElMessage.success('部门更新成功')
    } else {
      await createDepartmentApi(departmentForm)
      ElMessage.success('部门创建成功')
    }

    showDepartmentDialog.value = false
    loadDepartmentTree()
  } catch (error: any) {
    if (error !== 'cancel' && error?.name !== 'Error') {
      console.error('保存部门失败:', error)
    }
  } finally {
    submitting.value = false
  }
}

// 重置部门表单
const resetDepartmentForm = () => {
  Object.assign(departmentForm, {
    name: '',
    code: '',
    parent_id: undefined,
    manager_id: undefined,
    description: '',
    sort_order: 0,
    is_active: true
  })
  selectedManagerInfo.value = null
  departmentFormRef.value?.resetFields()
}

// 处理负责人选择变化
const handleManagerChange = (employee: User | null) => {
  selectedManagerInfo.value = employee
}

// 删除部门
const deleteDepartment = async (department: Department) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除部门 "${department.name}" 吗？删除后该部门下的子部门和员工将失去归属。`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await deleteDepartmentApi(department.id)
    ElMessage.success('部门删除成功')
    if (selectedDepartment.value?.id === department.id) {
      selectedDepartment.value = null
    }
    loadDepartmentTree()
    loadEmployees()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除部门失败:', error)
    }
  }
}

// ==================== 员工操作 ====================

// 打开新增员工对话框
const openCreateEmployeeDialog = () => {
  editingEmployee.value = null
  resetEmployeeForm()
  // 如果当前选中了部门（非全公司），则默认设置该部门
  if (selectedDepartment.value && !(selectedDepartment.value as any).isVirtualRoot) {
    employeeForm.department_id = selectedDepartment.value.id
  }
  showEmployeeDialog.value = true
}

// 编辑员工
const editEmployee = (employee: User) => {
  editingEmployee.value = employee
  Object.assign(employeeForm, {
    username: employee.username,
    password: '',
    real_name: employee.real_name || '',
    email: employee.email || '',
    phone: employee.phone || '',
    department_id: employee.department_id,
    role_ids: employee.roles?.map(r => r.id) || [],
    is_active: employee.is_active
  })
  showEmployeeDialog.value = true
}

// 保存员工
const saveEmployee = async () => {
  try {
    await employeeFormRef.value?.validate()
    submitting.value = true

    if (editingEmployee.value) {
      // 更新员工
      const updateData: UserUpdateParams = {
        real_name: employeeForm.real_name,
        email: employeeForm.email || undefined,
        phone: employeeForm.phone || undefined,
        department_id: employeeForm.department_id,
        role_ids: employeeForm.role_ids,
        is_active: employeeForm.is_active
      }
      await updateUserApi(editingEmployee.value.id, updateData)
      ElMessage.success('员工更新成功')
    } else {
      // 创建员工
      const createData: UserCreateParams = {
        username: employeeForm.username,
        password: employeeForm.password,
        real_name: employeeForm.real_name,
        email: employeeForm.email || undefined,
        phone: employeeForm.phone || undefined,
        department_id: employeeForm.department_id,
        role_ids: employeeForm.role_ids,
        is_active: employeeForm.is_active
      }
      await createUserApi(createData)
      ElMessage.success('员工创建成功')
    }

    showEmployeeDialog.value = false
    loadEmployees()
  } catch (error: any) {
    if (error !== 'cancel' && error?.name !== 'Error') {
      console.error('保存员工失败:', error)
    }
  } finally {
    submitting.value = false
  }
}

// 重置员工表单
const resetEmployeeForm = () => {
  editingEmployee.value = null
  Object.assign(employeeForm, {
    username: '',
    password: '',
    real_name: '',
    email: '',
    phone: '',
    department_id: undefined,
    role_ids: [],
    is_active: true
  })
  employeeFormRef.value?.resetFields()
}

// 重置密码
const resetPassword = (employee: User) => {
  editingEmployee.value = employee
  passwordForm.password = ''
  passwordForm.confirmPassword = ''
  showPasswordDialog.value = true
}

// 保存密码
const savePassword = async () => {
  if (!editingEmployee.value) return
  try {
    await passwordFormRef.value?.validate()
    submitting.value = true
    await resetUserPasswordApi(editingEmployee.value.id, passwordForm.password)
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

// 删除员工
const deleteEmployee = async (employee: User) => {
  try {
    await ElMessageBox.confirm(`确定要删除员工 "${employee.username}" 吗？`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await deleteUserApi(employee.id)
    ElMessage.success('员工删除成功')
    loadEmployees()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除员工失败:', error)
    }
  }
}

// 初始化
onMounted(() => {
  // 并行加载数据，不阻塞页面渲染
  loadDepartmentTree().then(() => {
    // 部门树加载完成后，默认选中虚拟根节点并加载员工
    selectedDepartment.value = departmentTreeWithRoot.value[0] as any
    loadEmployees()
  })
  loadRoles()
})
</script>

<style scoped>
.art-page-container {
  height: 100%;
  padding: 16px;
  padding-bottom: 8px;
}

.department-tree-card {
  display: flex;
  flex-direction: column;
}

.department-tree-card :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tree-search {
  flex-shrink: 0;
  margin-bottom: 12px;
}

.tree-wrapper {
  flex: 1;
  overflow-y: auto;
}

.tree-node {
  flex: 1;
  padding-right: 8px;
}

.tree-action {
  visibility: hidden;
  cursor: pointer;
  color: #909399;
}

.tree-node:hover .tree-action {
  visibility: visible;
}

.tree-action:hover {
  color: #409eff;
}

/* 员工列表卡片 */
.employee-list-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.employee-list-card :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 16px;
}

.employee-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.search-form {
  flex-shrink: 0;
  margin-bottom: 16px;
}

.table-wrapper {
  flex: 1;
  overflow: hidden;
}

.pagination-wrapper {
  flex-shrink: 0;
  margin-top: 16px;
}
</style>
