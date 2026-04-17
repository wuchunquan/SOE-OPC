<template>
  <div class="art-page-container" style="height: calc(100vh - 119px)">
    <div class="flex gap-4 h-full" >
      <!-- 左侧：字典类型 -->
      <el-card shadow="never" class="dict-type-card" style="width: 500px; flex-shrink: 0">
        <template #header>
          <div class="flex justify-between items-center">
            <span class="font-semibold">字典类型</span>
            <el-button type="primary" size="small" @click="openCreateTypeDialog">
              <el-icon class="mr-1">
                <Plus />
              </el-icon>
              新增
            </el-button>
          </div>
        </template>
        <div class="dict-type-content">
          <div class="search-row">
            <el-input v-model="typeSearch" placeholder="搜索字典类型" clearable class="search-input"
              @input="handleTypeSearch" />
            <el-select v-model="moduleFilter" placeholder="选择模块" clearable class="module-select"
              @change="handleModuleChange">
              <el-option v-for="mod in moduleOptions" :key="mod" :label="mod" :value="mod" />
            </el-select>
          </div>
          <div class="table-wrapper" v-loading="typeLoading">
            <el-table :data="dictionaryTypes" style="width: 100%" size="small" highlight-current-row height="100%"
              @current-change="handleTypeChange">
              <el-table-column prop="name" label="名称" min-width="100" />
              <el-table-column prop="code" label="编码" min-width="100" />
              <el-table-column prop="module" label="模块" min-width="80">
                <template #default="{ row }">
                  <el-tag v-if="row.module" type="info" size="small">{{ row.module }}</el-tag>
                  <span v-else class="text-gray-400">-</span>
                </template>
              </el-table-column>
              <el-table-column label="状态" width="60" align="center">
                <template #default="{ row }">
                  <el-tag :type="row.is_enabled ? 'success' : 'info'" size="small">
                    {{ row.is_enabled ? '启用' : '禁用' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="100" align="center" fixed="right">
                <template #default="{ row }">
                  <el-button link type="primary" size="small" @click.stop="editType(row)">编辑</el-button>
                  <el-button link type="danger" size="small" @click.stop="deleteType(row)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
          <div class="pagination-wrapper" style="justify-content: center">
            <el-pagination v-model:current-page="typePagination.page" v-model:page-size="typePagination.pageSize"
              :total="typePagination.total" layout="prev, pager, next" small @current-change="loadDictionaryTypes" />
          </div>
        </div>
      </el-card>

      <!-- 右侧：字典项 -->
      <el-card shadow="never" class="dict-item-card">
        <template #header>
          <div class="flex justify-between items-center">
            <span class="font-semibold">
              {{ selectedType ? `${selectedType.name} - 字典项` : '请选择字典类型' }}
            </span>
            <el-button v-if="selectedType" type="primary" size="small" @click="openCreateItemDialog">
              <el-icon class="mr-1">
                <Plus />
              </el-icon>
              新增
            </el-button>
          </div>
        </template>
        <div v-if="!selectedType" class="flex items-center justify-center h-full text-gray-400">
          请在左侧选择一个字典类型
        </div>
        <div v-else class="dict-item-content">
          <div class="table-wrapper" v-loading="itemLoading">
            <el-table :data="dictionaryItems" style="width: 100%" border stripe height="100%">
              <el-table-column prop="id" label="ID" width="70" align="center" />
              <el-table-column prop="label" label="标签" min-width="120" />
              <el-table-column prop="value" label="值" min-width="120" />
              <el-table-column prop="sort_order" label="排序" width="80" align="center" />
              <el-table-column label="状态" width="80" align="center">
                <template #default="{ row }">
                  <el-switch :model-value="row.is_enabled" size="small" @change="toggleItemStatus(row)" />
                </template>
              </el-table-column>
              <el-table-column prop="description" label="描述" min-width="150">
                <template #default="{ row }">
                  {{ row.description || '-' }}
                </template>
              </el-table-column>
              <el-table-column label="操作" width="120" align="center">
                <template #default="{ row }">
                  <el-button link type="primary" size="small" @click="editItem(row)">编辑</el-button>
                  <el-button link type="danger" size="small" @click="deleteItem(row)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
          <div class="pagination-wrapper">
            <el-pagination v-model:current-page="itemPagination.page" v-model:page-size="itemPagination.pageSize"
              :page-sizes="[10, 20, 50]" :total="itemPagination.total" layout="total, sizes, prev, pager, next"
              @size-change="loadDictionaryItems" @current-change="loadDictionaryItems" />
          </div>
        </div>
      </el-card>
    </div>

    <!-- 新增/编辑字典类型对话框 -->
    <el-dialog v-model="showTypeDialog" :title="editingType ? '编辑字典类型' : '新增字典类型'" width="480px" destroy-on-close
      @closed="resetTypeForm">
      <el-form ref="typeFormRef" :model="typeForm" :rules="typeFormRules" label-width="85px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="typeForm.name" placeholder="请输入名称" />
        </el-form-item>
        <el-form-item label="编码" prop="code">
          <el-input v-model="typeForm.code" :disabled="!!editingType" placeholder="请输入编码" />
        </el-form-item>
        <el-form-item label="所属模块">
          <el-select v-model="typeForm.module" placeholder="请选择或输入模块" filterable allow-create clearable
            style="width: 100%">
            <el-option v-for="mod in moduleOptions" :key="mod" :label="mod" :value="mod" />
          </el-select>
        </el-form-item>
        <el-form-item label="排序" prop="sort_order">
          <el-input-number v-model="typeForm.sort_order" :min="0" :max="9999" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="typeForm.description" type="textarea" :rows="3" placeholder="请输入描述" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="typeForm.is_enabled" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showTypeDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="saveType">确定</el-button>
      </template>
    </el-dialog>

    <!-- 新增/编辑字典项对话框 -->
    <el-dialog v-model="showItemDialog" :title="editingItem ? '编辑字典项' : '新增字典项'" width="480px" destroy-on-close
      @closed="resetItemForm">
      <el-form ref="itemFormRef" :model="itemForm" :rules="itemFormRules" label-width="85px">
        <el-form-item label="标签" prop="label">
          <el-input v-model="itemForm.label" placeholder="请输入标签（显示名称）" />
        </el-form-item>
        <el-form-item label="值" prop="value">
          <el-input v-model="itemForm.value" placeholder="请输入值" />
        </el-form-item>
        <el-form-item label="排序" prop="sort_order">
          <el-input-number v-model="itemForm.sort_order" :min="0" :max="9999" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="itemForm.description" type="textarea" :rows="3" placeholder="请输入描述" />
        </el-form-item>
        <el-form-item label="扩展数据">
          <el-input v-model="itemForm.extra_data" type="textarea" :rows="2" placeholder="请输入扩展数据（JSON格式）" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="itemForm.is_enabled" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showItemDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="saveItem">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import {
  getDictionaryTypesApi,
  getDictionaryModulesApi,
  createDictionaryTypeApi,
  updateDictionaryTypeApi,
  deleteDictionaryTypeApi,
  getDictionaryItemsApi,
  createDictionaryItemApi,
  updateDictionaryItemApi,
  deleteDictionaryItemApi,
  toggleDictionaryItemApi,
  type DictionaryType,
  type DictionaryTypeCreateParams,
  type DictionaryTypeUpdateParams,
  type DictionaryItem,
  type DictionaryItemCreateParams,
  type DictionaryItemUpdateParams
} from '@/api/sys/dictionary'

defineOptions({ name: 'SysDictionary' })

// 响应式数据
const typeLoading = ref(false)
const itemLoading = ref(false)
const submitting = ref(false)
const dictionaryTypes = ref<DictionaryType[]>([])
const dictionaryItems = ref<DictionaryItem[]>([])
const selectedType = ref<DictionaryType | null>(null)
const showTypeDialog = ref(false)
const showItemDialog = ref(false)
const editingType = ref<DictionaryType | null>(null)
const editingItem = ref<DictionaryItem | null>(null)
const typeSearch = ref('')
const moduleFilter = ref('')
const moduleOptions = ref<string[]>([])
const typeFormRef = ref<FormInstance>()
const itemFormRef = ref<FormInstance>()

// 类型分页
const typePagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 项分页
const itemPagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 类型表单
const typeForm = reactive<DictionaryTypeCreateParams>({
  name: '',
  code: '',
  module: '',
  description: '',
  sort_order: 0,
  is_enabled: true
})

// 项表单
const itemForm = reactive<Omit<DictionaryItemCreateParams, 'dictionary_type_id'> & { dictionary_type_id?: number }>({
  dictionary_type_id: undefined,
  label: '',
  value: '',
  description: '',
  sort_order: 0,
  extra_data: '',
  is_enabled: true
})

// 类型表单验证规则
const typeFormRules: FormRules = {
  name: [
    { required: true, message: '请输入名称', trigger: 'blur' },
    { min: 2, max: 50, message: '名称长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入编码', trigger: 'blur' },
    { pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/, message: '编码必须以字母开头，只能包含字母、数字和下划线', trigger: 'blur' }
  ]
}

// 项表单验证规则
const itemFormRules: FormRules = {
  label: [
    { required: true, message: '请输入标签', trigger: 'blur' },
    { max: 100, message: '标签长度不能超过 100 个字符', trigger: 'blur' }
  ],
  value: [
    { required: true, message: '请输入值', trigger: 'blur' },
    { max: 100, message: '值长度不能超过 100 个字符', trigger: 'blur' }
  ]
}

// 加载模块列表
const loadModules = async () => {
  try {
    const modules = await getDictionaryModulesApi()
    moduleOptions.value = modules || []
  } catch (error) {
    console.error('加载模块列表失败:', error)
  }
}

// 加载字典类型列表
const loadDictionaryTypes = async () => {
  typeLoading.value = true
  try {
    const params = {
      page: typePagination.page,
      page_size: typePagination.pageSize,
      search: typeSearch.value || undefined,
      module: moduleFilter.value || undefined
    }
    const response = await getDictionaryTypesApi(params)
    dictionaryTypes.value = response.items || []
    typePagination.total = response.total || 0
  } catch (error) {
    console.error('加载字典类型列表失败:', error)
  } finally {
    typeLoading.value = false
  }
}

// 搜索类型
let typeSearchTimer: ReturnType<typeof setTimeout>
const handleTypeSearch = () => {
  clearTimeout(typeSearchTimer)
  typeSearchTimer = setTimeout(() => {
    typePagination.page = 1
    loadDictionaryTypes()
  }, 300)
}

// 模块过滤改变
const handleModuleChange = () => {
  typePagination.page = 1
  loadDictionaryTypes()
}

// 选择类型
const handleTypeChange = (type: DictionaryType | null) => {
  selectedType.value = type
  itemPagination.page = 1
  if (type) {
    loadDictionaryItems()
  } else {
    dictionaryItems.value = []
  }
}

// 加载字典项列表
const loadDictionaryItems = async () => {
  if (!selectedType.value) return
  itemLoading.value = true
  try {
    const params = {
      page: itemPagination.page,
      page_size: itemPagination.pageSize,
      dictionary_type_id: selectedType.value.id
    }
    const response = await getDictionaryItemsApi(params)
    dictionaryItems.value = response.items || []
    itemPagination.total = response.total || 0
  } catch (error) {
    console.error('加载字典项列表失败:', error)
  } finally {
    itemLoading.value = false
  }
}

// ==================== 字典类型操作 ====================

const openCreateTypeDialog = () => {
  editingType.value = null
  resetTypeForm()
  showTypeDialog.value = true
}

const editType = (type: DictionaryType) => {
  editingType.value = type
  Object.assign(typeForm, {
    name: type.name,
    code: type.code,
    module: type.module || '',
    description: type.description || '',
    sort_order: type.sort_order || 0,
    is_enabled: type.is_enabled
  })
  showTypeDialog.value = true
}

const saveType = async () => {
  try {
    await typeFormRef.value?.validate()
    submitting.value = true

    if (editingType.value) {
      const updateData: DictionaryTypeUpdateParams = {
        name: typeForm.name,
        module: typeForm.module,
        description: typeForm.description,
        sort_order: typeForm.sort_order,
        is_enabled: typeForm.is_enabled
      }
      await updateDictionaryTypeApi(editingType.value.id, updateData)
      ElMessage.success('字典类型更新成功')
    } else {
      await createDictionaryTypeApi(typeForm)
      ElMessage.success('字典类型创建成功')
    }

    showTypeDialog.value = false
    loadDictionaryTypes()
    loadModules()
  } catch (error: any) {
    if (error !== 'cancel' && error?.name !== 'Error') {
      console.error('保存字典类型失败:', error)
    }
  } finally {
    submitting.value = false
  }
}

const resetTypeForm = () => {
  Object.assign(typeForm, {
    name: '',
    code: '',
    module: '',
    description: '',
    sort_order: 0,
    is_enabled: true
  })
  typeFormRef.value?.resetFields()
}

const deleteType = async (type: DictionaryType) => {
  try {
    await ElMessageBox.confirm(`确定要删除字典类型 "${type.name}" 吗？将同时删除该类型下的所有字典项。`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await deleteDictionaryTypeApi(type.id)
    ElMessage.success('字典类型删除成功')
    if (selectedType.value?.id === type.id) {
      selectedType.value = null
      dictionaryItems.value = []
    }
    loadDictionaryTypes()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除字典类型失败:', error)
    }
  }
}

// ==================== 字典项操作 ====================

const openCreateItemDialog = () => {
  editingItem.value = null
  resetItemForm()
  showItemDialog.value = true
}

const editItem = (item: DictionaryItem) => {
  editingItem.value = item
  Object.assign(itemForm, {
    dictionary_type_id: item.dictionary_type_id,
    label: item.label,
    value: item.value,
    description: item.description || '',
    sort_order: item.sort_order || 0,
    extra_data: item.extra_data || '',
    is_enabled: item.is_enabled
  })
  showItemDialog.value = true
}

const saveItem = async () => {
  if (!selectedType.value) return
  try {
    await itemFormRef.value?.validate()
    submitting.value = true

    if (editingItem.value) {
      const updateData: DictionaryItemUpdateParams = {
        label: itemForm.label,
        value: itemForm.value,
        description: itemForm.description,
        sort_order: itemForm.sort_order,
        extra_data: itemForm.extra_data,
        is_enabled: itemForm.is_enabled
      }
      await updateDictionaryItemApi(editingItem.value.id, updateData)
      ElMessage.success('字典项更新成功')
    } else {
      const createData: DictionaryItemCreateParams = {
        ...itemForm,
        dictionary_type_id: selectedType.value.id
      }
      await createDictionaryItemApi(createData)
      ElMessage.success('字典项创建成功')
    }

    showItemDialog.value = false
    loadDictionaryItems()
  } catch (error: any) {
    if (error !== 'cancel' && error?.name !== 'Error') {
      console.error('保存字典项失败:', error)
    }
  } finally {
    submitting.value = false
  }
}

const resetItemForm = () => {
  Object.assign(itemForm, {
    dictionary_type_id: undefined,
    label: '',
    value: '',
    description: '',
    sort_order: 0,
    extra_data: '',
    is_enabled: true
  })
  itemFormRef.value?.resetFields()
}

const toggleItemStatus = async (item: DictionaryItem) => {
  try {
    await toggleDictionaryItemApi(item.id)
    ElMessage.success(item.is_enabled ? '字典项已禁用' : '字典项已启用')
    loadDictionaryItems()
  } catch (error) {
    console.error('切换字典项状态失败:', error)
  }
}

const deleteItem = async (item: DictionaryItem) => {
  try {
    await ElMessageBox.confirm(`确定要删除字典项 "${item.label}" 吗？`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await deleteDictionaryItemApi(item.id)
    ElMessage.success('字典项删除成功')
    loadDictionaryItems()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除字典项失败:', error)
    }
  }
}

// 初始化
onMounted(() => {
  loadDictionaryTypes()
  loadModules()
})
</script>

<style scoped>
.art-page-container {
  padding: 16px;
  height: 100%;
  box-sizing: border-box;
}

/* 左侧字典类型卡片 */
.dict-type-card {
  display: flex;
  flex-direction: column;
}

.dict-type-card :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dict-type-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.search-row {
  flex-shrink: 0;
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.search-input {
  flex: 1;
}

.module-select {
  width: 120px;
}

/* 右侧字典项卡片 */
.dict-item-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dict-item-card :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dict-item-content {
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
