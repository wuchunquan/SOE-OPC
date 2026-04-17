/**
 * 字典工具
 *
 * 提供字典数据的获取、缓存和转换功能
 */
import { ref, computed, onMounted, type Ref } from 'vue'
import {
  getDictionaryItemsByTypeApi,
  type DictionaryItemSimple
} from '@/api/sys/dictionary'

// 字典编码常量
export const DictCode = {
  /** 性别 */
  GENDER: 'gender',
} as const

export type DictCodeType = (typeof DictCode)[keyof typeof DictCode]

// 字典缓存
const dictCache = new Map<string, DictionaryItemSimple[]>()

/**
 * 获取字典项列表
 * @param code 字典编码
 * @param useCache 是否使用缓存，默认 true
 */
export async function getDictItems(
  code: string,
  useCache = true
): Promise<DictionaryItemSimple[]> {
  if (useCache && dictCache.has(code)) {
    return dictCache.get(code)!
  }

  try {
    const items = await getDictionaryItemsByTypeApi(code)
    dictCache.set(code, items)
    return items
  } catch (error) {
    console.error(`获取字典[${code}]失败:`, error)
    return []
  }
}

/**
 * 根据 value 获取 label
 * @param code 字典编码
 * @param value 字典值
 * @param defaultLabel 默认标签
 */
export async function getDictLabel(
  code: string,
  value: string,
  defaultLabel = ''
): Promise<string> {
  const items = await getDictItems(code)
  const item = items.find((i) => i.value === value)
  return item?.label ?? defaultLabel
}

/**
 * 根据 label 获取 value
 * @param code 字典编码
 * @param label 字典标签
 * @param defaultValue 默认值
 */
export async function getDictValue(
  code: string,
  label: string,
  defaultValue = ''
): Promise<string> {
  const items = await getDictItems(code)
  const item = items.find((i) => i.label === label)
  return item?.value ?? defaultValue
}

/**
 * 清除字典缓存
 * @param code 字典编码，不传则清除所有
 */
export function clearDictCache(code?: string): void {
  if (code) {
    dictCache.delete(code)
  } else {
    dictCache.clear()
  }
}

/**
 * 字典 composable - 用于组件中
 *
 * @example
 * const { items, loading, labelMap, getLabel } = useDict(DictCode.CREDITOR_TYPE)
 */
export function useDict(code: string) {
  const items: Ref<DictionaryItemSimple[]> = ref([])
  const loading = ref(false)

  // value -> label 映射
  const labelMap = computed(() => {
    const map: Record<string, string> = {}
    items.value.forEach((item) => {
      map[item.value] = item.label
    })
    return map
  })

  // 获取 label
  const getLabel = (value: string, defaultLabel = '-'): string => {
    return labelMap.value[value] ?? defaultLabel
  }

  // 加载字典数据
  const load = async (useCache = true) => {
    loading.value = true
    try {
      items.value = await getDictItems(code, useCache)
    } finally {
      loading.value = false
    }
  }

  // 刷新（不使用缓存）
  const refresh = () => load(false)

  // 自动加载
  onMounted(() => {
    load()
  })

  return {
    items,
    loading,
    labelMap,
    getLabel,
    load,
    refresh
  }
}
