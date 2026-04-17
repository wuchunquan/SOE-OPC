<template>
  <div ref="editorContainer" class="code-editor" :class="{ 'is-dark': isDark }"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, shallowRef } from 'vue'
import { storeToRefs } from 'pinia'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { oneDark } from '@codemirror/theme-one-dark'
import { useSettingStore } from '@/store/modules/setting'

// 语言支持
import { html } from '@codemirror/lang-html'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { json } from '@codemirror/lang-json'
import { css } from '@codemirror/lang-css'
import { markdown } from '@codemirror/lang-markdown'

// 主题
const settingStore = useSettingStore()
const { isDark } = storeToRefs(settingStore)

interface Props {
  modelValue: string
  language?: string
  readonly?: boolean
  fileName?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  language: 'text',
  readonly: false,
  fileName: ''
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  change: [value: string]
}>()

const editorContainer = ref<HTMLElement>()
const editorView = shallowRef<EditorView>()

// 根据文件名或语言获取语言扩展
const getLanguageExtension = (lang: string, fileName: string) => {
  // 从文件名推断语言
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  const langKey = lang.toLowerCase() || ext

  const langMap: Record<string, () => any> = {
    'html': html,
    'htm': html,
    'vue': html,
    'js': () => javascript(),
    'javascript': () => javascript(),
    'ts': () => javascript({ typescript: true }),
    'typescript': () => javascript({ typescript: true }),
    'jsx': () => javascript({ jsx: true }),
    'tsx': () => javascript({ jsx: true, typescript: true }),
    'py': python,
    'python': python,
    'json': json,
    'css': css,
    'scss': css,
    'less': css,
    'md': markdown,
    'markdown': markdown,
  }

  const langFn = langMap[langKey]
  return langFn ? langFn() : []
}

// 浅色主题样式
const lightTheme = EditorView.theme({
  '&': {
    backgroundColor: '#ffffff',
    color: '#1f2937'
  },
  '.cm-content': {
    caretColor: '#1f2937'
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: '#1f2937'
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: '#d7e4f2'
  },
  '.cm-gutters': {
    backgroundColor: '#f5f5f5',
    color: '#6b7280',
    border: 'none',
    borderRight: '1px solid #e5e7eb'
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#e5e7eb'
  },
  '.cm-activeLine': {
    backgroundColor: '#f3f4f6'
  },
  '.cm-line': {
    padding: '0 4px'
  }
})

// 创建编辑器
const createEditor = () => {
  if (!editorContainer.value) return

  const extensions = [
    lineNumbers(),
    highlightActiveLine(),
    highlightActiveLineGutter(),
    highlightSelectionMatches(),
    history(),
    keymap.of([
      ...defaultKeymap,
      ...historyKeymap,
      ...searchKeymap,
    ]),
    // 根据主题选择不同的主题样式
    isDark.value ? oneDark : lightTheme,
    getLanguageExtension(props.language, props.fileName),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const value = update.state.doc.toString()
        emit('update:modelValue', value)
        emit('change', value)
      }
    }),
  ]

  // 添加只读状态
  if (props.readonly) {
    extensions.push(EditorState.readOnly.of(true))
  }

  const state = EditorState.create({
    doc: props.modelValue,
    extensions,
  })

  editorView.value = new EditorView({
    state,
    parent: editorContainer.value,
  })
}

// 销毁编辑器
const destroyEditor = () => {
  if (editorView.value) {
    editorView.value.destroy()
    editorView.value = undefined
  }
}

// 监听内容变化（外部更新）
watch(() => props.modelValue, (newValue) => {
  if (editorView.value) {
    const currentValue = editorView.value.state.doc.toString()
    if (newValue !== currentValue) {
      editorView.value.dispatch({
        changes: {
          from: 0,
          to: currentValue.length,
          insert: newValue,
        },
      })
    }
  }
})

// 监听语言、主题变化，重新创建编辑器
watch([() => props.language, () => props.fileName, () => props.readonly, isDark], () => {
  destroyEditor()
  createEditor()
})

onMounted(() => {
  createEditor()
})

onUnmounted(() => {
  destroyEditor()
})

// 暴露方法
defineExpose({
  getContent: () => editorView.value?.state.doc.toString() || '',
  focus: () => editorView.value?.focus(),
})
</script>

<style scoped lang="scss">
.code-editor {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.code-editor :deep(.cm-editor) {
  height: 100%;
}

.code-editor :deep(.cm-scroller) {
  overflow: auto;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.5;
}

/* 自定义滚动条 - 浅色模式 */
.code-editor :deep(.cm-scroller)::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.code-editor :deep(.cm-scroller)::-webkit-scrollbar-track {
  background: #f5f5f5;
}

.code-editor :deep(.cm-scroller)::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.code-editor :deep(.cm-scroller)::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.2);
}

/* 自定义滚动条 - 深色模式 */
.code-editor.is-dark :deep(.cm-scroller)::-webkit-scrollbar-track {
  background: #18181b;
}

.code-editor.is-dark :deep(.cm-scroller)::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
}

.code-editor.is-dark :deep(.cm-scroller)::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
