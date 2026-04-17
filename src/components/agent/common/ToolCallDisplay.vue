<template>
  <div class="tool-call-display" :class="{ 'is-compact': compact }">
    <div class="tool-card" :class="compact ? '' : toolCardClass">
      <div class="tool-header">
        <div class="header-left">
          <!-- 工具图标 -->
          <div class="tool-icon">
            <i :class="toolIcon" :style="{ color: toolIconColor }"></i>
          </div>

          <!-- 工具描述 -->
          <div class="tool-description">
            <div class="tool-action">
              {{ toolActionDescription }}
              <span v-if="working" class="working-indicator">
                <i class="pi pi-spin pi-spinner"></i>
              </span>
            </div>
            <div v-if="toolSubDescription && !compact" class="tool-sub">{{ toolSubDescription }}</div>
          </div>
        </div>

        <!-- 展开/收起按钮 -->
        <el-button
          v-if="hasDetails"
          text
          size="small"
          class="toggle-btn"
          @click="toggleDetails"
          :title="showDetails ? '收起详情' : '展开详情'"
        >
          <i :class="showDetails ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"></i>
        </el-button>
      </div>

      <!-- 详细参数（可折叠） -->
      <transition name="expand">
        <div v-if="showDetails && hasDetails" class="tool-details">
          <!-- TodoWrite工具的特殊显示 -->
          <TodoList v-if="toolName === 'TodoWrite'" :todos="toolInput.todos || []" />

          <!-- Bash 工具：格式化显示命令参数 -->
          <div v-else-if="isBashTool" class="bash-details">
            <div v-if="toolInput.description || toolInput.timeout" class="bash-meta">
              <span v-if="toolInput.description" class="bash-description">{{ toolInput.description }}</span>
              <span v-if="toolInput.timeout" class="bash-timeout">{{ toolInput.timeout }}ms</span>
            </div>
            <pre class="bash-command">{{ toolInput.command }}</pre>
          </div>

          <!-- Write 工具：直接显示文件内容源码 -->
          <pre v-else-if="isWriteWithContent" class="detail-content" v-html="highlightedWriteContent"></pre>

          <!-- Edit 工具：diff 对比显示 -->
          <div v-else-if="isEditTool" class="edit-diff">
            <pre class="diff-code" v-html="editDiffHtml"></pre>
          </div>

          <!-- MultiEdit 工具：多处 diff 对比 -->
          <div v-else-if="isMultiEditTool && toolInput.edits?.length" class="edit-diff">
            <pre class="diff-code" v-html="multiEditDiffHtml"></pre>
          </div>

          <!-- 其他工具的通用参数显示 -->
          <pre v-else class="detail-content">{{ formattedDetails }}</pre>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import hljs from 'highlight.js'
import TodoList from './TodoList.vue'

interface Props {
  toolName: string
  toolInput: any
  streaming?: boolean
  working?: boolean
  compact?: boolean
}

const props = defineProps<Props>()

const showDetails = ref(false)

// 判断是否是 Write 工具且有 content
const isWriteWithContent = computed(() => {
  const cleanName = props.toolName.replace(/^mcp__\w+__/, '')
  return cleanName === 'Write' && !!props.toolInput?.content
})

// 判断是否是 Edit 工具
const isEditTool = computed(() => {
  const cleanName = props.toolName.replace(/^mcp__\w+__/, '')
  return cleanName === 'Edit' && (props.toolInput?.old_string != null || props.toolInput?.new_string != null)
})

// 判断是否是 Bash 工具
const isBashTool = computed(() => {
  const cleanName = props.toolName.replace(/^mcp__\w+__/, '')
  return cleanName === 'Bash'
})

// 判断是否是 MultiEdit 工具
const isMultiEditTool = computed(() => {
  const cleanName = props.toolName.replace(/^mcp__\w+__/, '')
  return cleanName === 'MultiEdit' && !!props.toolInput?.edits
})

// 根据文件扩展名获取语言
const getLanguageFromPath = (filePath: string): string => {
  const ext = filePath.split('.').pop()?.toLowerCase() || ''
  const langMap: Record<string, string> = {
    html: 'html', htm: 'html', vue: 'html',
    css: 'css', scss: 'scss', less: 'less',
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    py: 'python', java: 'java', go: 'go', rs: 'rust',
    json: 'json', xml: 'xml', yaml: 'yaml', yml: 'yaml',
    md: 'markdown', sql: 'sql', sh: 'bash', bat: 'dos'
  }
  return langMap[ext] || 'plaintext'
}

// 高亮后的 Write 内容（仅在非流式时高亮，避免频繁调用 hljs）
const highlightedWriteContent = computed(() => {
  if (!isWriteWithContent.value) return ''
  const content = props.toolInput.content
  if (props.streaming) {
    return content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }
  const lang = getLanguageFromPath(props.toolInput.file_path || '')
  try {
    return hljs.highlight(content, { language: lang }).value
  } catch {
    return hljs.highlightAuto(content).value
  }
})

// Edit diff HTML
const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const editDiffHtml = computed(() => {
  const lines: string[] = []
  if (props.toolInput?.old_string != null) {
    for (const line of (props.toolInput.old_string as string).split('\n')) {
      lines.push(`<span class="diff-line diff-line-old">- ${escapeHtml(line)}</span>`)
    }
  }
  if (props.toolInput?.new_string != null) {
    for (const line of (props.toolInput.new_string as string).split('\n')) {
      lines.push(`<span class="diff-line diff-line-new">+ ${escapeHtml(line)}</span>`)
    }
  }
  return lines.join('')
})

const multiEditDiffHtml = computed(() => {
  const edits = props.toolInput?.edits || []
  const lines: string[] = []
  edits.forEach((edit: any, idx: number) => {
    if (edits.length > 1) {
      lines.push(`<span class="diff-line diff-line-info">@@ 修改 ${idx + 1} @@</span>`)
    }
    if (edit.old_string != null) {
      for (const line of (edit.old_string as string).split('\n')) {
        lines.push(`<span class="diff-line diff-line-old">- ${escapeHtml(line)}</span>`)
      }
    }
    if (edit.new_string != null) {
      for (const line of (edit.new_string as string).split('\n')) {
        lines.push(`<span class="diff-line diff-line-new">+ ${escapeHtml(line)}</span>`)
      }
    }
  })
  return lines.join('')
})

// 某些工具默认展开
watch(
  () => props.toolName,
  (newToolName) => {
    const autoExpandTools: string[] = []
    showDetails.value = autoExpandTools.includes(newToolName)
  },
  { immediate: true }
)

const hasDetails = computed(() => {
  return props.toolInput && Object.keys(props.toolInput).length > 0
})

const formattedDetails = computed(() => {
  if (!props.toolInput) return ''
  return JSON.stringify(props.toolInput, null, 2)
})

const normalizeToolName = (toolName: string): string => {
  const cleanName = toolName.replace(/^mcp__\w+__/, '')
  const aliasMap: Record<string, string> = {
    read_file: 'Read',
    write_file: 'Write',
    edit_file: 'Edit',
    bash: 'Bash',
    grep_search: 'Grep',
    glob_search: 'Glob',
    web_search: 'WebSearch',
  }
  return aliasMap[cleanName] || cleanName
}

// 工具图标映射
const toolIcon = computed(() => {
  const iconMap: Record<string, string> = {
    Read: 'pi pi-file-o',
    Write: 'pi pi-file-edit',
    Edit: 'pi pi-pencil',
    MultiEdit: 'pi pi-list',
    Bash: 'pi pi-code',
    Grep: 'pi pi-search',
    Glob: 'pi pi-folder',
    WebFetch: 'pi pi-globe',
    WebSearch: 'pi pi-search-plus',
    TodoWrite: 'pi pi-check-square',
    NotebookEdit: 'pi pi-book',
    Task: 'pi pi-cog',
    list_dir: 'pi pi-folder-open',
    Skill: 'pi pi-star',
    AskUserQuestion: 'pi pi-question-circle',
    ExitPlanMode: 'pi pi-check-circle',
    list_available_apis: 'pi pi-list',
    get_api_documentation: 'pi pi-book',
    call_internal_api: 'pi pi-send',
    ocr_extract_text: 'pi pi-image',
    metaso_search: 'pi pi-compass',
    mcp_list_tools: 'pi pi-server',
    mcp_call_tool: 'pi pi-bolt',
    mcp_list_resources: 'pi pi-database',
    mcp_read_resource: 'pi pi-bookmark',
    send_wecom_text: 'pi pi-comments',
    send_wecom_markdown: 'pi pi-file-edit',
    send_wecom_card: 'pi pi-id-card',
    send_wecom_image: 'pi pi-image',
    send_wecom_file: 'pi pi-file',
    share_html_to_wecom: 'pi pi-share-alt',
    send_feishu_text: 'pi pi-comments',
    send_feishu_post: 'pi pi-file-edit',
    send_feishu_card: 'pi pi-id-card',
    send_feishu_image: 'pi pi-image',
    send_feishu_file: 'pi pi-file',
    share_html_to_feishu: 'pi pi-share-alt',
    // 债务工具
    query_debts: 'pi pi-database',
    get_debt_detail: 'pi pi-file',
    get_debt_metrics: 'pi pi-chart-bar',
    get_repayment_plan: 'pi pi-calendar'
  }
  const cleanName = normalizeToolName(props.toolName)
  return iconMap[cleanName] || 'pi pi-wrench'
})

// 工具图标颜色映射
const toolIconColor = computed(() => {
  const colorMap: Record<string, string> = {
    Read: '#3b82f6', // blue
    Write: '#10b981', // green
    Edit: '#f59e0b', // amber
    MultiEdit: '#f59e0b', // amber
    Bash: '#8b5cf6', // purple
    Grep: '#f97316', // orange
    Glob: '#f97316', // orange
    WebFetch: '#06b6d4', // cyan
    WebSearch: '#06b6d4', // cyan
    TodoWrite: '#ec4899', // pink
    NotebookEdit: '#6366f1', // indigo
    Task: '#ef4444', // red
    list_dir: '#f97316',
    Skill: '#eab308',
    AskUserQuestion: '#06b6d4',
    ExitPlanMode: '#10b981',
    list_available_apis: '#3b82f6',
    get_api_documentation: '#6366f1',
    call_internal_api: '#10b981',
    ocr_extract_text: '#14b8a6',
    metaso_search: '#06b6d4',
    mcp_list_tools: '#8b5cf6',
    mcp_call_tool: '#8b5cf6',
    mcp_list_resources: '#6366f1',
    mcp_read_resource: '#6366f1',
    send_wecom_text: '#10b981',
    send_wecom_markdown: '#10b981',
    send_wecom_card: '#10b981',
    send_wecom_image: '#10b981',
    send_wecom_file: '#10b981',
    share_html_to_wecom: '#10b981',
    send_feishu_text: '#0ea5e9',
    send_feishu_post: '#0ea5e9',
    send_feishu_card: '#0ea5e9',
    send_feishu_image: '#0ea5e9',
    send_feishu_file: '#0ea5e9',
    share_html_to_feishu: '#0ea5e9',
    // 债务工具默认蓝色
    query_debts: '#3b82f6',
    get_debt_detail: '#3b82f6',
    get_debt_metrics: '#3b82f6',
    get_repayment_plan: '#3b82f6'
  }
  const cleanName = normalizeToolName(props.toolName)
  return colorMap[cleanName] || '#6b7280' // gray
})

// 工具卡片样式
const toolCardClass = computed(() => {
  const classMap: Record<string, string> = {
    Read: 'tool-card-blue',
    Write: 'tool-card-green',
    Edit: 'tool-card-amber',
    MultiEdit: 'tool-card-amber',
    Bash: 'tool-card-purple',
    Grep: 'tool-card-orange',
    Glob: 'tool-card-orange',
    WebFetch: 'tool-card-cyan',
    WebSearch: 'tool-card-cyan',
    TodoWrite: 'tool-card-pink',
    NotebookEdit: 'tool-card-indigo',
    Task: 'tool-card-red',
    list_dir: 'tool-card-orange',
    Skill: 'tool-card-amber',
    AskUserQuestion: 'tool-card-cyan',
    ExitPlanMode: 'tool-card-green',
    list_available_apis: 'tool-card-blue',
    get_api_documentation: 'tool-card-indigo',
    call_internal_api: 'tool-card-green',
    ocr_extract_text: 'tool-card-cyan',
    metaso_search: 'tool-card-cyan',
    mcp_list_tools: 'tool-card-purple',
    mcp_call_tool: 'tool-card-purple',
    mcp_list_resources: 'tool-card-indigo',
    mcp_read_resource: 'tool-card-indigo',
    send_wecom_text: 'tool-card-green',
    send_wecom_markdown: 'tool-card-green',
    send_wecom_card: 'tool-card-green',
    send_wecom_image: 'tool-card-green',
    send_wecom_file: 'tool-card-green',
    share_html_to_wecom: 'tool-card-green',
    send_feishu_text: 'tool-card-cyan',
    send_feishu_post: 'tool-card-cyan',
    send_feishu_card: 'tool-card-cyan',
    send_feishu_image: 'tool-card-cyan',
    send_feishu_file: 'tool-card-cyan',
    share_html_to_feishu: 'tool-card-cyan',
    // 债务工具
    query_debts: 'tool-card-blue',
    get_debt_detail: 'tool-card-blue',
    get_debt_metrics: 'tool-card-blue',
    get_repayment_plan: 'tool-card-blue'
  }
  const cleanName = normalizeToolName(props.toolName)
  return classMap[cleanName] || 'tool-card-gray'
})

// 工具操作描述
const toolActionDescription = computed(() => {
  const input = props.toolInput || {}
  const cleanName = normalizeToolName(props.toolName)

  switch (cleanName) {
    case 'Read':
      return `正在读取 ${getFileName(input.path || input.file_path) || '文件'}`

    case 'Write':
      return `正在写入 ${getFileName(input.path || input.file_path) || '文件'}`

    case 'Edit':
      return `正在编辑 ${getFileName(input.path || input.file_path) || '文件'}`

    case 'MultiEdit':
      const editCount = input.edits?.length || 0
      return `正在批量编辑 ${getFileName(input.file_path) || '文件'} (${editCount}处修改)`

    case 'Bash':
      const command = input.command || ''
      const shortCommand = command.length > 40 ? command.substring(0, 40) + '...' : command
      return `执行命令: ${shortCommand}`

    case 'Grep':
      const pattern = input.pattern || input.query || ''
      return `搜索 "${pattern}"`

    case 'Glob':
      const globPattern = input.pattern || input.path || ''
      return `查找文件: ${globPattern}`

    case 'list_dir':
      return `浏览目录: ${input.path || '.'}`

    case 'Skill':
      return `使用技能: ${input.skill_name || input.name || '未命名技能'}`

    case 'AskUserQuestion':
      return '等待用户回答问题'

    case 'ExitPlanMode':
      return '提交计划等待确认'

    case 'WebFetch':
      const url = input.url || ''
      const domain = extractDomain(url)
      return `获取网页: ${domain}`

    case 'WebSearch':
      const query = input.query || ''
      return `网络搜索: ${query}`

    case 'list_available_apis':
      return '读取内部 API 列表'

    case 'get_api_documentation':
      return `读取接口文档: ${input.operation_id || ''}`

    case 'call_internal_api':
      return `调用内部接口: ${input.operation_id || ''}`

    case 'ocr_extract_text':
      return `识别文件内容: ${getFileName(input.file_path) || '文件'}`

    case 'metaso_search':
      return `秘塔搜索: ${input.query || ''}`

    case 'mcp_list_tools':
      return `查看 MCP 工具: ${input.server || '全部服务器'}`

    case 'mcp_call_tool':
      return `调用 MCP 工具: ${input.tool_name || ''}`

    case 'mcp_list_resources':
      return '查看 MCP 资源'

    case 'mcp_read_resource':
      return `读取 MCP 资源: ${input.uri || ''}`

    case 'send_wecom_text':
    case 'send_wecom_markdown':
    case 'send_wecom_card':
    case 'send_wecom_image':
    case 'send_wecom_file':
    case 'share_html_to_wecom':
      return `发送企业微信消息: ${cleanName}`

    case 'send_feishu_text':
    case 'send_feishu_post':
    case 'send_feishu_card':
    case 'send_feishu_image':
    case 'send_feishu_file':
    case 'share_html_to_feishu':
      return `发送飞书消息: ${cleanName}`

    case 'TodoWrite':
      const todoCount = input.todos?.length || 0
      return `更新任务列表 (${todoCount}个任务)`

    case 'NotebookEdit':
      return `编辑笔记本 ${getFileName(input.notebook_path) || ''}`

    case 'Task':
      const taskDescription = input.description || '执行任务'
      return `启动代理: ${taskDescription}`

    // 债务工具
    case 'query_debts':
      return '查询债务列表'

    case 'get_debt_detail':
      return '获取债务详情'

    case 'get_debt_metrics':
      return '获取统计数据'

    case 'get_repayment_plan':
      return '获取还款计划'

    default:
      return `调用 ${cleanName}`
  }
})

// 工具子描述
const toolSubDescription = computed(() => {
  const input = props.toolInput || {}
  const cleanName = normalizeToolName(props.toolName)

  switch (cleanName) {
    case 'Read':
      if (input.start_line || input.end_line || input.limit || input.offset) {
        const parts = []
        if (input.start_line) parts.push(`起始第${input.start_line}行`)
        if (input.end_line) parts.push(`结束第${input.end_line}行`)
        if (input.offset) parts.push(`从第${input.offset}行`)
        if (input.limit) parts.push(`${input.limit}行`)
        return parts.join(', ')
      }
      return null

    case 'Bash':
      return input.description || null

    case 'Grep':
      const flags = []
      if (input['-i']) flags.push('忽略大小写')
      if (input.type) flags.push(`类型: ${input.type}`)
      if (input.glob) flags.push(`模式: ${input.glob}`)
      return flags.length > 0 ? flags.join(', ') : null

    case 'Task':
      return input.subagent_type ? `${input.subagent_type} 代理` : null

    case 'query_debts':
      const filters = []
      if (input.name) filters.push(`名称: ${input.name}`)
      if (input.debt_type) filters.push(`类型: ${input.debt_type}`)
      if (input.limit) filters.push(`限制: ${input.limit}`)
      return filters.length > 0 ? filters.join(' · ') : null

    default:
      return null
  }
})

// 辅助函数
const getFileName = (filePath: string | undefined): string => {
  if (!filePath) return ''
  const parts = filePath.split(/[/\\]/)
  return parts[parts.length - 1] || filePath
}

const extractDomain = (url: string): string => {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

const toggleDetails = () => {
  showDetails.value = !showDetails.value
}
</script>

<style scoped lang="scss">
.tool-call-display {
  margin-bottom: 10px;
}

// 紧凑模式（时间轴内）
.tool-call-display.is-compact {
  margin-bottom: 0;

  .tool-card {
    padding: 0;
    border-left: none;
    background: transparent;
    border-radius: 0;
  }

  .tool-icon {
    width: 20px;
    height: 20px;

    i { font-size: 13px; }
  }

  .header-left {
    gap: 8px;
  }

  .tool-description .tool-action {
    font-size: 13px;
  }

  .tool-description .tool-sub {
    font-size: 11px;
  }
}

.tool-card {
  padding: 10px 14px;
  border-radius: 0 6px 6px 0;
  transition: all 0.2s;
  border-left: 2px solid;
}

// 不同工具的颜色主题 - 暗色模式
html.dark {
  .tool-card-blue {
    background: rgba(59, 130, 246, 0.05);
    border-left-color: rgba(59, 130, 246, 0.3);
  }

  .tool-card-green {
    background: rgba(16, 185, 129, 0.05);
    border-left-color: rgba(16, 185, 129, 0.3);
  }

  .tool-card-amber {
    background: rgba(245, 158, 11, 0.05);
    border-left-color: rgba(245, 158, 11, 0.3);
  }

  .tool-card-purple {
    background: rgba(139, 92, 246, 0.05);
    border-left-color: rgba(139, 92, 246, 0.3);
  }

  .tool-card-orange {
    background: rgba(249, 115, 22, 0.05);
    border-left-color: rgba(249, 115, 22, 0.3);
  }

  .tool-card-cyan {
    background: rgba(6, 182, 212, 0.05);
    border-left-color: rgba(6, 182, 212, 0.3);
  }

  .tool-card-pink {
    background: rgba(236, 72, 153, 0.05);
    border-left-color: rgba(236, 72, 153, 0.3);
  }

  .tool-card-indigo {
    background: rgba(99, 102, 241, 0.05);
    border-left-color: rgba(99, 102, 241, 0.3);
  }

  .tool-card-red {
    background: rgba(239, 68, 68, 0.05);
    border-left-color: rgba(239, 68, 68, 0.3);
  }

  .tool-card-gray {
    background: rgba(107, 114, 128, 0.05);
    border-left-color: rgba(107, 114, 128, 0.3);
  }
}

// 浅色模式
html:not(.dark) {
  .tool-card-blue {
    background: rgba(59, 130, 246, 0.06);
    border-left-color: rgba(59, 130, 246, 0.4);
  }

  .tool-card-green {
    background: rgba(16, 185, 129, 0.06);
    border-left-color: rgba(16, 185, 129, 0.4);
  }

  .tool-card-amber {
    background: rgba(245, 158, 11, 0.06);
    border-left-color: rgba(245, 158, 11, 0.4);
  }

  .tool-card-purple {
    background: rgba(139, 92, 246, 0.06);
    border-left-color: rgba(139, 92, 246, 0.4);
  }

  .tool-card-orange {
    background: rgba(249, 115, 22, 0.06);
    border-left-color: rgba(249, 115, 22, 0.4);
  }

  .tool-card-cyan {
    background: rgba(6, 182, 212, 0.06);
    border-left-color: rgba(6, 182, 212, 0.4);
  }

  .tool-card-pink {
    background: rgba(236, 72, 153, 0.06);
    border-left-color: rgba(236, 72, 153, 0.4);
  }

  .tool-card-indigo {
    background: rgba(99, 102, 241, 0.06);
    border-left-color: rgba(99, 102, 241, 0.4);
  }

  .tool-card-red {
    background: rgba(239, 68, 68, 0.06);
    border-left-color: rgba(239, 68, 68, 0.4);
  }

  .tool-card-gray {
    background: rgba(107, 114, 128, 0.06);
    border-left-color: rgba(107, 114, 128, 0.4);
  }
}

.tool-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    min-width: 0;
  }
}

.tool-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.tool-description {
  flex: 1;
  min-width: 0;

  .tool-action {
    font-size: 13px;
    color: var(--el-text-color-primary);
    font-weight: 500;
    line-height: 1.4;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tool-sub {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    margin-top: 3px;
    line-height: 1.4;
  }
}

.toggle-btn {
  flex-shrink: 0;
  margin-left: 8px;
  color: var(--el-text-color-secondary);

  &:hover {
    color: var(--el-text-color-primary);
  }
}

.working-indicator {
  display: inline-flex;
  align-items: center;
  margin-left: 6px;
  color: var(--el-color-primary);
  font-size: 12px;

  i {
    animation: tool-spin 1s linear infinite;
  }
}

@keyframes tool-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.tool-details {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--el-border-color-lighter);

  .detail-content {
    margin: 0;
    padding: 12px;
    // background: var(--el-fill-color);
    border-radius: 6px;
    font-size: 12px;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    color: var(--el-text-color-regular);
    overflow-x: auto;
    line-height: 1.6;
    max-height: 400px;
    overflow-y: auto;

    &::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }

    &::-webkit-scrollbar-track {
      background: var(--el-fill-color-light);
      border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb {
      background: var(--el-border-color);
      border-radius: 3px;

      &:hover {
        background: var(--el-border-color-darker);
      }
    }
  }
}

/* 展开动画 */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  max-height: 600px;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
  transform: translateY(-10px);
}

.expand-enter-to,
.expand-leave-from {
  max-height: 600px;
  opacity: 1;
  transform: translateY(0);
}

/* Edit diff 样式 */
.edit-diff {
  max-height: 400px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: var(--el-fill-color-light);
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--el-border-color);
    border-radius: 3px;
  }
}

/* Bash 工具详情样式 */
.bash-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bash-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.bash-description {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
  font-style: italic;
}

.bash-timeout {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  background: var(--el-color-warning-light-9);
  color: var(--el-color-warning);
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.4;
}

.bash-command {
  margin: 0;
  padding: 10px 12px;
  background: var(--el-fill-color-lighter);
  border-radius: 6px;
  font-size: 13px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  color: var(--el-text-color-primary);
  white-space: pre-wrap;
  word-break: break-all;
  overflow-x: auto;
  line-height: 1.6;
}

.diff-code {
  margin: 0;
  padding: 0;
  font-size: 12px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  line-height: 1.7;
  overflow-x: auto;
  border-radius: 4px;
  background: var(--el-fill-color-lighter);
}
</style>

<!-- v-html 内部的 diff 行样式（不能 scoped） -->
<style lang="scss">
.tool-call-display .diff-line {
  display: block;
  padding: 0 10px;
  white-space: pre-wrap;
  word-break: break-all;
}

html.dark .tool-call-display {
  .diff-line-old {
    background: rgba(239, 68, 68, 0.1);
    color: #fca5a5;
  }
  .diff-line-new {
    background: rgba(34, 197, 94, 0.1);
    color: #86efac;
  }
  .diff-line-info {
    background: rgba(59, 130, 246, 0.1);
    color: #93c5fd;
  }
}

html:not(.dark) .tool-call-display {
  .diff-line-old {
    background: rgba(239, 68, 68, 0.08);
    color: #b91c1c;
  }
  .diff-line-new {
    background: rgba(34, 197, 94, 0.08);
    color: #15803d;
  }
  .diff-line-info {
    background: rgba(59, 130, 246, 0.08);
    color: #1d4ed8;
  }
}
</style>
