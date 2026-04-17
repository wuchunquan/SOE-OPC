<template>
  <div class="employee-selector">
    <el-input
      :model-value="displayValue"
      :placeholder="placeholder"
      readonly
      @click="openDialog"
    >
      <template #suffix>
        <el-icon v-if="modelValue" class="cursor-pointer" @click.stop="clearSelection">
          <CircleClose />
        </el-icon>
        <el-icon v-else class="cursor-pointer">
          <Search />
        </el-icon>
      </template>
    </el-input>

    <el-dialog
      v-model="dialogVisible"
      title="选择员工"
      width="800px"
      @close="handleClose"
    >
      <!-- 搜索栏 -->
      <el-form :inline="true" class="mb-4">
        <el-form-item label="搜索">
          <el-input
            v-model="searchKeyword"
            placeholder="用户名/姓名/邮箱"
            clearable
            style="width: 200px"
            @keyup.enter="search"
          />
        </el-form-item>
        <el-form-item label="部门">
          <el-tree-select
            v-model="searchDepartmentId"
            :data="departmentTree"
            :props="{ children: 'children', label: 'name', value: 'id' }"
            node-key="id"
            check-strictly
            clearable
            placeholder="选择部门"
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="search">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 员工表格 -->
      <el-table
        v-loading="loading"
        :data="employees"
        highlight-current-row
        border
        style="width: 100%"
        max-height="400px"
        @current-change="handleCurrentChange"
      >
        <el-table-column type="index" label="#" width="50" />
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
        <el-table-column prop="email" label="邮箱">
          <template #default="{ row }">
            {{ row.email || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="手机号" width="120">
          <template #default="{ row }">
            {{ row.phone || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right" align="center">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="selectEmployee(row)">
              选择
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="mt-4 flex justify-center">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          :total="pagination.total"
          @size-change="loadEmployees"
          @current-change="loadEmployees"
        />
      </div>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!selectedEmployee" @click="confirmSelect">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { Search, CircleClose } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getUsersApi, type User } from '@/api/sys/users'
import { getDepartmentTreeApi, type Department } from '@/api/sys/departments'
import { useUserStore } from '@/store/modules/user'

interface Props {
  modelValue?: number | null
  placeholder?: string
  /** 可以传入已选中的员工信息用于显示 */
  selectedEmployeeInfo?: User | null
  /** 是否排除当前登录用户（用于聊天等场景，默认false） */
  excludeCurrentUser?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  placeholder: '请选择员工',
  selectedEmployeeInfo: null,
  excludeCurrentUser: false
})

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
  change: [employee: User | null]
}>()

const userStore = useUserStore()
const dialogVisible = ref(false)
const loading = ref(false)
const employees = ref<User[]>([])
const selectedEmployee = ref<User | null>(null)
const searchKeyword = ref('')
const searchDepartmentId = ref<number | null>(null)
const departmentTree = ref<Department[]>([])

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 显示值：优先使用传入的员工信息
const displayValue = computed(() => {
  if (props.selectedEmployeeInfo) {
    const name = props.selectedEmployeeInfo.real_name || props.selectedEmployeeInfo.username
    return `${name} (${props.selectedEmployeeInfo.username})`
  }
  return ''
})

// 打开对话框
const openDialog = async () => {
  dialogVisible.value = true
  loadDepartmentTree()
  loadEmployees()
}

// 加载部门树
const loadDepartmentTree = async () => {
  try {
    departmentTree.value = await getDepartmentTreeApi()
  } catch (error) {
    console.error('加载部门树失败:', error)
  }
}

// 加载员工列表
const loadEmployees = async () => {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: pagination.page,
      page_size: pagination.pageSize,
      search: searchKeyword.value || undefined,
      department_id: searchDepartmentId.value || undefined
    }

    const response = await getUsersApi(params)

    // 如果需要排除当前用户
    if (props.excludeCurrentUser) {
      const currentUserId = userStore.info.userId
      employees.value = (response.items || []).filter(user => user.id !== currentUserId)
      // 调整总数（减去被过滤的当前用户）
      pagination.total = response.total ? response.total - 1 : 0
    } else {
      employees.value = response.items || []
      pagination.total = response.total || 0
    }
  } catch (error) {
    console.error('加载员工列表失败:', error)
    ElMessage.error('加载员工列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const search = () => {
  pagination.page = 1
  loadEmployees()
}

// 重置搜索
const resetSearch = () => {
  searchKeyword.value = ''
  searchDepartmentId.value = null
  pagination.page = 1
  loadEmployees()
}

// 表格行选中
const handleCurrentChange = (row: User | null) => {
  selectedEmployee.value = row
}

// 快速选择（点击选择按钮）
const selectEmployee = (employee: User) => {
  selectedEmployee.value = employee
  confirmSelect()
}

// 确认选择
const confirmSelect = () => {
  if (selectedEmployee.value) {
    emit('update:modelValue', selectedEmployee.value.id)
    emit('change', selectedEmployee.value)
    dialogVisible.value = false
  }
}

// 清空选择
const clearSelection = () => {
  emit('update:modelValue', null)
  emit('change', null)
}

// 关闭对话框
const handleClose = () => {
  selectedEmployee.value = null
}

// 监听 modelValue 变化
watch(
  () => props.modelValue,
  (newVal) => {
    if (!newVal) {
      selectedEmployee.value = null
    }
  }
)
</script>

<style scoped>
.employee-selector {
  width: 100%;
}

:deep(.el-input__suffix) {
  cursor: pointer;
}

.cursor-pointer {
  cursor: pointer;
}
</style>
