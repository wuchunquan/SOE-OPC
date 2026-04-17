<template>
  <div class="docs-page">
    <!-- 顶部导航栏 -->
    <div class="docs-header">
      <div class="header-left">
        <!-- 移动端：侧边栏切换按钮 -->
        <el-button
          v-if="isMobile"
          text
          class="mobile-menu-btn"
          @click="showSidebar = true"
        >
          <el-icon><Menu /></el-icon>
        </el-button>
        <h1 class="header-title">帮助文档</h1>
      </div>
      <div class="header-center">
        <div class="search-box">
          <el-input
            v-model="searchQuery"
            placeholder="搜索文档..."
            clearable
            @input="handleSearch"
            @focus="showSearchResults = true"
            class="search-input"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>

          <!-- 搜索结果下拉面板 -->
          <transition name="el-zoom-in-top">
            <div
              v-if="showSearchResults && searchQuery && (searchResults.length > 0 || isSearching)"
              class="search-results-panel"
              @click.stop
            >
              <div v-if="isSearching" class="search-loading">
                <el-icon class="is-loading"><Loading /></el-icon>
                <span>搜索中...</span>
              </div>
              <div v-else-if="searchResults.length > 0">
                <div class="search-results-header">
                  找到 {{ searchResults.length }} 个结果
                </div>
                <div class="search-results-list">
                  <div
                    v-for="result in searchResults"
                    :key="result.path"
                    class="search-result-item"
                  >
                    <div class="result-header" @click="handleSearchResultClick(result)">
                      <div class="result-title">{{ result.title }}</div>
                      <div class="result-meta">{{ result.match_count }} 处匹配</div>
                    </div>
                    <!-- 显示所有匹配片段 -->
                    <div class="result-snippets" v-if="result.snippets && result.snippets.length > 0">
                      <div
                        v-for="(snippet, idx) in result.snippets.slice(0, 3)"
                        :key="idx"
                        class="result-snippet"
                        @click="handleSearchResultClick(result, snippet.index)"
                      >
                        <span class="snippet-index">{{ idx + 1}}.</span>
                        <span class="snippet-text" v-html="highlightSearchText(cleanMarkdown(snippet.text), searchQuery)"></span>
                      </div>
                      <div v-if="result.snippets.length > 3" class="more-snippets">
                        ...还有 {{ result.snippets.length - 3 }} 处匹配
                      </div>
                    </div>
                    <!-- 向后兼容：如果没有snippets数组，显示snippet -->
                    <div v-else class="result-snippet" @click="handleSearchResultClick(result)">
                      <span v-html="highlightSearchText(cleanMarkdown(result.snippet), searchQuery)"></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </transition>

          <!-- 无结果提示 -->
          <transition name="el-zoom-in-top">
            <div
              v-if="showSearchResults && searchQuery && searchResults.length === 0 && !isSearching"
              class="search-results-panel no-results-panel"
            >
              <div class="no-results-text">未找到相关文档</div>
            </div>
          </transition>
        </div>
      </div>
      <div class="header-right">
        <!-- 移动端：目录切换按钮 -->
        <el-button
          v-if="isMobile && tocItems.length > 0"
          text
          class="mobile-toc-btn"
          @click="showToc = true"
        >
          <el-icon><List /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="docs-main">
      <!-- 侧边栏 - 桌面端：固定侧边栏 -->
      <div v-if="!isMobile" class="docs-sidebar">
        <el-scrollbar class="sidebar-content">
          <!-- 文档树 -->
          <el-tree
            ref="docTreeRef"
            :data="docTree"
            :props="treeProps"
            node-key="path"
            :default-expand-all="true"
            :highlight-current="true"
            :current-node-key="currentDocPath"
            @node-click="handleNodeClick"
          >
            <template #default="{ node, data }">
              <span class="tree-node">
                <el-icon v-if="data.is_dir" class="node-icon"><Folder /></el-icon>
                <el-icon v-else class="node-icon"><Document /></el-icon>
                <span>{{ data.title || data.name }}</span>
              </span>
            </template>
          </el-tree>
        </el-scrollbar>
      </div>

      <!-- 内容区域 -->
      <div class="docs-content">
        <div v-if="loading" class="loading-container">
        <el-skeleton :rows="10" animated />
      </div>
      <div v-else-if="currentDoc" class="content-card">
        <div class="content-wrapper">
          <!-- 文档内容 -->
          <div class="markdown-container">
            <el-scrollbar class="markdown-scroll">
              <div class="markdown-body" v-html="renderedContent" @click="handleContentClick"></div>
            </el-scrollbar>
          </div>

          <!-- 目录 -->
          <div v-if="tocItems.length > 0 && !isMobile" class="toc-container">
            <div class="toc-header">目录</div>
            <el-scrollbar class="toc-scroll">
              <div class="toc-list">
                <a
                  v-for="(item, index) in tocItems"
                  :key="index"
                  :class="['toc-item', `toc-level-${item.level}`]"
                  :href="`#${item.id}`"
                  @click.prevent="handleTocClick(item.id)"
                >
                  {{ item.text }}
                </a>
              </div>
            </el-scrollbar>
          </div>
        </div>
      </div>
        <div v-else class="empty-container">
          <el-empty description="请从左侧选择文档" />
        </div>
      </div>
    </div>

    <!-- 侧边栏 - 移动端：抽屉 -->
    <el-drawer
      v-model="showSidebar"
      v-if="isMobile"
      title="文档导航"
      direction="ltr"
      size="80%"
    >
      <el-scrollbar class="sidebar-content">
        <el-tree
          ref="docTreeRef"
          :data="docTree"
          :props="treeProps"
          node-key="path"
          :default-expand-all="true"
          :highlight-current="true"
          :current-node-key="currentDocPath"
          @node-click="handleNodeClick"
        >
          <template #default="{ node, data }">
            <span class="tree-node">
              <el-icon v-if="data.is_dir" class="node-icon"><Folder /></el-icon>
              <el-icon v-else class="node-icon"><Document /></el-icon>
              <span>{{ data.title || data.name }}</span>
            </span>
          </template>
        </el-tree>
      </el-scrollbar>
    </el-drawer>

    <!-- 目录 - 移动端：抽屉 -->
    <el-drawer
      v-model="showToc"
      v-if="isMobile"
      title="目录"
      direction="rtl"
      size="70%"
    >
      <el-scrollbar class="toc-scroll">
        <div class="toc-list">
          <a
            v-for="(item, index) in tocItems"
            :key="index"
            :class="['toc-item', `toc-level-${item.level}`]"
            :href="`#${item.id}`"
            @click.prevent="handleTocClickMobile(item.id)"
          >
            {{ item.text }}
          </a>
        </div>
      </el-scrollbar>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Document, Folder, Search, Loading, Menu, List } from '@element-plus/icons-vue'
import { useWindowSize } from '@vueuse/core'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'
import {
  getDocTreeApi,
  getDocContentApi,
  searchDocsApi,
  type DocNode,
  type DocContentResponse,
  type SearchResult
} from '@/api/docs'

defineOptions({ name: 'DocsPage' })

// 响应式窗口尺寸
const { width } = useWindowSize()
const isMobile = computed(() => width.value < 768)

// 移动端抽屉状态
const showSidebar = ref(false)
const showToc = ref(false)

// 目录项接口
interface TocItem {
  id: string
  text: string
  level: number
}

// Markdown 渲染器配置
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
      } catch (__) {}
    }
    return md.utils.escapeHtml(str)
  }
})

const loading = ref(false)
const docTree = ref<DocNode[]>([])
const currentDoc = ref<DocContentResponse | null>(null)

// 待执行的滚动任务
const pendingScrollTask = ref<{ query: string; targetIndex: number } | null>(null)
const tocItems = ref<TocItem[]>([])
const currentDocPath = ref<string>('')
const docTreeRef = ref()
const searchQuery = ref('')
const searchResults = ref<SearchResult[]>([])
const showSearchResults = ref(false)
const isSearching = ref(false)
let searchTimer: any = null

const treeProps = {
  children: 'children',
  label: 'name'
}

// 渲染的 Markdown 内容
const renderedContent = computed(() => {
  if (!currentDoc.value) return ''
  let html = md.render(currentDoc.value.content)

  // 提取目录和处理链接、图片
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = html

  // 处理标题，添加 ID
  const headings = tempDiv.querySelectorAll('h1, h2, h3, h4')
  const items: TocItem[] = []
  headings.forEach((heading, index) => {
    const level = parseInt(heading.tagName.substring(1))
    const text = heading.textContent || ''
    const id = `heading-${index}`
    heading.id = id

    items.push({ id, text, level })
  })

  // 处理图片路径
  const images = tempDiv.querySelectorAll('img')
  images.forEach((img) => {
    const src = img.getAttribute('src')
    if (src && !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:')) {
      // 相对路径，转换为 API 路径
      img.setAttribute('src', `/api/docs/assets/${src}`)
    }
  })

  // 处理文档内部链接
  const links = tempDiv.querySelectorAll('a')
  links.forEach((link) => {
    const href = link.getAttribute('href')
    if (href) {
      // 如果是 markdown 文档链接
      if (href.endsWith('.md') || href.includes('.md#')) {
        // 解码 href，因为 markdown-it 可能会自动编码中文字符
        const decodedHref = decodeURIComponent(href)
        link.setAttribute('data-doc-link', decodedHref)
        link.classList.add('doc-internal-link')
        // 阻止默认跳转
        link.removeAttribute('href')
      }
    }
  })

  tocItems.value = items
  return tempDiv.innerHTML
})

// 处理目录点击
const handleTocClick = (id: string) => {
  const element = document.getElementById(id)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// 处理移动端目录点击（关闭抽屉）
const handleTocClickMobile = (id: string) => {
  showToc.value = false
  setTimeout(() => {
    handleTocClick(id)
  }, 300)
}

// 处理文档内容点击（处理内部链接）
const handleContentClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement

  // 检查是否点击了内部文档链接
  if (target.tagName === 'A' && target.classList.contains('doc-internal-link')) {
    event.preventDefault()
    const docLink = target.getAttribute('data-doc-link')

    if (docLink) {
      // 解析链接，可能包含锚点 (example.md#heading)
      const [docPath, anchor] = docLink.split('#')

      // 解析相对路径
      const resolvedPath = resolveDocPath(docPath)

      // 加载新文档
      loadDocument(resolvedPath, anchor)
    }
  }
}

// 解析文档相对路径
const resolveDocPath = (linkPath: string): string => {
  // 如果是绝对路径（以 / 开头）或已经是完整路径，直接返回
  if (linkPath.startsWith('/')) {
    return linkPath.substring(1) // 去掉开头的 /
  }

  // 获取当前文档所在的目录
  const currentPath = currentDocPath.value
  const lastSlashIndex = currentPath.lastIndexOf('/')

  if (lastSlashIndex === -1) {
    // 当前文档在根目录，直接返回链接路径
    return linkPath
  }

  // 当前文档在子目录中
  const currentDir = currentPath.substring(0, lastSlashIndex + 1)

  // 处理相对路径中的 ../
  let resultPath = currentDir + linkPath

  // 简化路径（处理 ../ 和 ./）
  const parts = resultPath.split('/')
  const resolvedParts: string[] = []

  for (const part of parts) {
    if (part === '..') {
      // 返回上一级
      resolvedParts.pop()
    } else if (part !== '.' && part !== '') {
      resolvedParts.push(part)
    }
  }

  return resolvedParts.join('/')
}

// 加载指定文档
const loadDocument = async (path: string, anchor?: string, skipScroll?: boolean) => {
  loading.value = true
  try {
    const res = await getDocContentApi(path)
    currentDoc.value = res

    // 更新当前文档路径（用于树选中状态）
    // 确保路径格式一致
    let docPath = path
    if (!docPath.endsWith('.md')) {
      docPath = docPath + '.md'
    }
    currentDocPath.value = docPath

    // 设置树的当前选中节点
    if (docTreeRef.value) {
      docTreeRef.value.setCurrentKey(docPath)
    }

    // 如果有锚点，等待渲染后滚动到指定位置
    if (anchor) {
      setTimeout(() => {
        const element = document.getElementById(anchor)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)
    } else if (!skipScroll) {
      // 没有锚点且不跳过滚动时，滚动到顶部
      setTimeout(() => {
        const scrollEl = document.querySelector('.markdown-scroll .el-scrollbar__wrap')
        if (scrollEl) {
          scrollEl.scrollTop = 0
        }
      }, 100)
    }
  } catch (error: any) {
    console.error('加载文档失败:', error)
    ElMessage.error('加载文档失败')
  } finally {
    loading.value = false
  }
}

// 加载文档树
const loadDocTree = async () => {
  try {
    const res = await getDocTreeApi()
    docTree.value = res.tree
  } catch (error: any) {
    console.error('加载文档树失败:', error)
    ElMessage.error('加载文档列表失败')
  }
}

// 处理节点点击
const handleNodeClick = async (data: DocNode) => {
  // 只有文件才能点击查看
  if (data.is_dir) return

  // 移动端关闭侧边栏
  if (isMobile.value) {
    showSidebar.value = false
  }

  loadDocument(data.path)
}

// 清理 Markdown 特殊符号
const cleanMarkdown = (text: string): string => {
  if (!text) return ''

  return text
    // 移除标题标记 (# ## ### 等)
    .replace(/^#+\s+/gm, '')
    // 移除粗体 **text** 或 __text__
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    // 移除斜体 *text* 或 _text_
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // 移除删除线 ~~text~~
    .replace(/~~(.*?)~~/g, '$1')
    // 移除行内代码 `code`
    .replace(/`([^`]+)`/g, '$1')
    // 移除链接 [text](url) 保留 text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // 移除图片 ![alt](url)
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    // 移除引用标记 >
    .replace(/^>\s+/gm, '')
    // 移除列表标记 - * +
    .replace(/^[\s]*[-*+]\s+/gm, '')
    // 移除有序列表标记 1. 2. 等
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // 移除HTML标签
    .replace(/<[^>]+>/g, '')
}

// 高亮搜索文本
const highlightSearchText = (text: string, query: string): string => {
  if (!text || !query) return text

  const trimmedQuery = query.trim()
  if (!trimmedQuery) return text

  // 转义正则特殊字符
  const escapedQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  // 使用正则表达式进行不区分大小写的匹配和替换
  const regex = new RegExp(`(${escapedQuery})`, 'gi')

  return text.replace(regex, '<mark class="search-highlight">$1</mark>')
}

// 处理搜索
const handleSearch = () => {
  // 防抖处理
  if (searchTimer) {
    clearTimeout(searchTimer)
  }

  searchTimer = setTimeout(async () => {
    const query = searchQuery.value.trim()

    if (!query) {
      searchResults.value = []
      isSearching.value = false
      return
    }

    isSearching.value = true
    try {
      const res = await searchDocsApi(query)
      searchResults.value = res.results
    } catch (error: any) {
      console.error('搜索失败:', error)
      ElMessage.error('搜索失败')
    } finally {
      isSearching.value = false
    }
  }, 300)
}

// 执行滚动和高亮的核心逻辑
const executeScrollAndHighlight = (query: string, targetIndex: number) => {
  const contentEl = document.querySelector('.markdown-body')
  if (!contentEl) {
    console.log('未找到内容元素')
    return
  }

  // 查找所有包含query的文本节点
  const walker = document.createTreeWalker(
    contentEl,
    NodeFilter.SHOW_TEXT,
    null
  )

  const matchingNodes: { node: Text; matchIndex: number; absoluteIndex: number }[] = []
  let absolutePosition = 0

  // 遍历所有文本节点，找到所有匹配
  while (walker.nextNode()) {
    const node = walker.currentNode as Text
    const text = node.textContent || ''
    const textLower = text.toLowerCase()

    let searchStart = 0
    while (true) {
      const matchIndex = textLower.indexOf(query, searchStart)
      if (matchIndex === -1) break

      matchingNodes.push({
        node,
        matchIndex,
        absoluteIndex: absolutePosition + matchIndex
      })

      searchStart = matchIndex + 1
    }

    absolutePosition += text.length
  }

  console.log(`找到 ${matchingNodes.length} 个匹配，目标索引：${targetIndex}`)

  if (matchingNodes.length === 0) {
    console.log('未找到匹配的文本节点')
    return
  }

  // 找到最接近目标索引的匹配
  let closestMatch = matchingNodes[0]
  let minDistance = Math.abs(closestMatch.absoluteIndex - targetIndex)

  for (const match of matchingNodes) {
    const distance = Math.abs(match.absoluteIndex - targetIndex)
    if (distance < minDistance) {
      minDistance = distance
      closestMatch = match
    }
  }

  console.log(`最接近的匹配在位置 ${closestMatch.absoluteIndex}，距离 ${minDistance}`)

  // 高亮并滚动到匹配的文本
  const textNode = closestMatch.node
  const matchIndex = closestMatch.matchIndex

  try {
    const range = document.createRange()
    const matchLength = query.length

    // 设置range为匹配的文本
    range.setStart(textNode, matchIndex)
    range.setEnd(textNode, matchIndex + matchLength)

    // 创建高亮元素
    const highlightSpan = document.createElement('mark')
    highlightSpan.style.backgroundColor = '#fff3cd'
    highlightSpan.style.padding = '2px 4px'
    highlightSpan.style.borderRadius = '3px'
    highlightSpan.style.transition = 'background-color 0.3s'

    // 包裹文本
    range.surroundContents(highlightSpan)

    console.log('准备滚动到匹配位置')

    // 滚动到高亮元素
    highlightSpan.scrollIntoView({ behavior: 'smooth', block: 'center' })

    // 2秒后移除高亮
    setTimeout(() => {
      highlightSpan.style.backgroundColor = 'transparent'
      setTimeout(() => {
        const parent = highlightSpan.parentNode
        if (parent) {
          const textContent = highlightSpan.textContent
          parent.replaceChild(document.createTextNode(textContent || ''), highlightSpan)
        }
      }, 300)
    }, 2000)
  } catch (e) {
    console.error('高亮失败:', e)
    // 如果包裹失败，至少滚动到父元素
    const parent = textNode.parentElement
    if (parent) {
      parent.scrollIntoView({ behavior: 'smooth', block: 'center' })
      const originalBg = parent.style.backgroundColor
      parent.style.backgroundColor = '#fff3cd'
      parent.style.transition = 'background-color 0.3s'
      setTimeout(() => {
        parent.style.backgroundColor = originalBg
      }, 2000)
    }
  }
}

// 监听 currentDoc 变化，执行待处理的滚动任务
watch(currentDoc, async (newDoc) => {
  if (newDoc && pendingScrollTask.value) {
    // 等待 Vue 更新 DOM
    await nextTick()

    // 再等待一帧，确保浏览器完成渲染
    requestAnimationFrame(() => {
      // 再等待一帧，双重确保
      requestAnimationFrame(() => {
        const task = pendingScrollTask.value
        if (task && currentDoc.value) {
          console.log('执行待处理的滚动任务:', task)
          executeScrollAndHighlight(task.query, task.targetIndex)
          // 清空任务
          pendingScrollTask.value = null
        }
      })
    })
  }
})

// 处理搜索结果点击
const handleSearchResultClick = async (result: SearchResult, targetSnippetIndex?: number) => {
  // 保存搜索关键词，因为后面会清空
  const query = searchQuery.value.trim().toLowerCase()

  // 清空搜索，隐藏结果
  searchQuery.value = ''
  searchResults.value = []
  showSearchResults.value = false

  // 如果指定了位置，设置待处理任务
  if (targetSnippetIndex !== undefined && query) {
    pendingScrollTask.value = {
      query,
      targetIndex: targetSnippetIndex
    }
  }

  // 加载文档，如果有滚动位置则跳过自动滚动到顶部
  await loadDocument(result.path, undefined, targetSnippetIndex !== undefined)
}

// 点击外部关闭搜索结果
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.search-box')) {
    showSearchResults.value = false
  }
}

onMounted(() => {
  loadDocTree()
  // 默认加载首页
  loadDocument('1.首页.md')
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped lang="scss">
.docs-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--el-bg-color-page);
  overflow: hidden;
}

// Header 样式
.docs-header {
  height: 64px;
  display: flex;
  align-items: center;
  padding: 0 24px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
  gap: 24px;
}

.header-left {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.mobile-menu-btn,
.mobile-toc-btn {
  font-size: 20px;
  color: var(--el-text-color-primary);
  padding: 8px;

  &:hover {
    background: var(--el-fill-color-light);
  }
}

.header-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  letter-spacing: -0.5px;
}

.header-center {
  flex: 1;
  display: flex;
  justify-content: center;
  max-width: 600px;
  margin: 0 auto;
}

.search-box {
  width: 20rem;
  position: relative;
}

.search-input {
  :deep(.el-input__wrapper) {
    border-radius: 16px;
    background: var(--el-fill-color-lighter);
    border: 1px solid var(--el-border-color-light);
    box-shadow: none;
    padding: 2px 12px;
    transition: all 0.3s;

    &:hover {
      background: var(--el-fill-color-light);
      border-color: var(--el-border-color);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
    }

    &.is-focus {
      background: var(--el-bg-color);
      border-color: var(--el-color-primary);
      box-shadow: 0 2px 8px rgba(var(--el-color-primary-rgb), 0.15);
    }
  }

  :deep(.el-input__inner) {
    height: 36px;
    line-height: 36px;
    font-size: 14px;

    &::placeholder {
      color: var(--el-text-color-placeholder);
      font-size: 14px;
    }
  }

  :deep(.el-input__prefix) {
    color: var(--el-text-color-secondary);
    font-size: 16px;
  }

  :deep(.el-input__suffix) {
    .el-icon {
      color: var(--el-text-color-secondary);

      &:hover {
        color: var(--el-text-color-primary);
      }
    }
  }
}

.search-results-panel {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: var(--el-bg-color);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  border: 1px solid var(--el-border-color-lighter);
  max-height: 500px;
  overflow: hidden;
  z-index: 1000;
}

.search-loading {
  padding: 40px 20px;
  text-align: center;
  color: var(--el-text-color-secondary);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;

  .el-icon {
    font-size: 24px;
  }
}

.search-results-header {
  padding: 12px 16px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  font-weight: 600;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-lighter);
}

.search-results-list {
  max-height: 440px;
  overflow-y: auto;
}

.no-results-panel {
  padding: 40px 20px;
  text-align: center;
}

.no-results-text {
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.header-right {
  flex-shrink: 0;
}

// 主要内容区域
.docs-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.docs-sidebar {
  width: 280px;
  border-right: 1px solid var(--el-border-color-lighter);
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
  flex-shrink: 0;
}

.sidebar-content {
  flex: 1;
  padding: 16px 12px;
}

// 搜索结果项
.search-results-list .search-result-item {
  padding: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  transition: all 0.2s;

  &:last-child {
    border-bottom: none;
  }

  .result-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    margin-bottom: 8px;

    &:hover {
      background: var(--el-fill-color-lighter);
    }

    .result-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--el-text-color-primary);
    }

    .result-meta {
      font-size: 12px;
      color: var(--el-color-primary);
      font-weight: 500;
    }
  }

  .result-snippets {
    margin-left: 8px;
  }

  .result-snippet {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    line-height: 1.6;
    padding: 6px 8px;
    margin-bottom: 4px;
    background: var(--el-fill-color-lighter);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    gap: 6px;

    &:hover {
      background: var(--el-fill-color);
      color: var(--el-text-color-primary);
    }

    .snippet-index {
      color: var(--el-color-primary);
      font-weight: 500;
      flex-shrink: 0;
    }

    .snippet-text {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
  }

  .more-snippets {
    font-size: 12px;
    color: var(--el-text-color-placeholder);
    padding: 4px 8px;
    font-style: italic;
  }

  // 搜索高亮样式
  :deep(.search-highlight) {
    background-color: var(--el-color-warning-light-7);
    color: var(--el-color-warning-dark-2);
    font-weight: 600;
    padding: 1px 2px;
    border-radius: 2px;
  }
}

:deep(.el-tree) {
  background: transparent;

  .el-tree-node__content {
    padding: 8px 12px;
    margin: 2px 0;
    border-radius: 8px;
    transition: all 0.2s;

    &:hover {
      background: var(--el-fill-color-light);
    }
  }

  .is-current > .el-tree-node__content {
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
    font-weight: 500;
  }
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
}

.node-icon {
  font-size: 16px;
  color: var(--el-color-primary);
  opacity: 0.8;
}

.docs-content {
  flex: 1;
  overflow: hidden;
  background: var(--el-bg-color-page);
}

// 大卡片容器
.content-card {
  height: 100%;
  background: var(--el-bg-color);
  overflow: hidden;
}

.content-wrapper {
  display: flex;
  height: 100%;
  gap: 0;
}

// 文档内容区域
.markdown-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--el-border-color-lighter);
  overflow: hidden;
}

.markdown-scroll {
  flex: 1;
  height: 100%;
}

// 目录容器
.toc-container {
  width: 220px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--el-fill-color-lighter);
}

.toc-header {
  padding: 14px 20px 14px 10px;
  font-size: 14px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
}

.toc-scroll {
  flex: 1;
  height: 100%;
}

.toc-list {
  padding: 16px 12px;
}

.toc-item {
  display: block;
  padding: 5px 12px;
  margin-bottom: 0px;
  color: var(--el-text-color-regular);
  text-decoration: none;
  font-size: 13px;
  line-height: 1.5;
  border-radius: 6px;
  transition: all 0.2s;
  cursor: pointer;

  &:hover {
    background: var(--el-fill-color);
    color: var(--el-color-primary);
  }

  &.toc-level-1 {
    font-weight: 600;
    margin-top: 12px;
    font-size: 14px;

    &:first-child {
      margin-top: 0;
    }
  }

  &.toc-level-2 {
    padding-left: 20px;
  }

  &.toc-level-3 {
    padding-left: 32px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  &.toc-level-4 {
    padding-left: 44px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

.loading-container,
.empty-container {
  padding: 60px;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.markdown-body {
  padding: 40px 60px;
  background: transparent;
  font-size: 16px;
  line-height: 1.75;
  color: var(--el-text-color-primary);

  // 标题样式优化
  :deep(h1) {
    font-size: 36px;
    font-weight: 700;
    line-height: 1.3;
    margin: 48px 0 24px 0;
    padding-bottom: 16px;
    border-bottom: 2px solid var(--el-border-color);
    letter-spacing: -0.5px;
    scroll-margin-top: 20px;

    &:first-child {
      margin-top: 0;
    }
  }

  :deep(h2) {
    font-size: 28px;
    font-weight: 700;
    line-height: 1.4;
    margin: 40px 0 20px 0;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    letter-spacing: -0.3px;
    scroll-margin-top: 20px;
  }

  :deep(h3) {
    font-size: 22px;
    font-weight: 600;
    line-height: 1.4;
    margin: 32px 0 16px 0;
    scroll-margin-top: 20px;
  }

  :deep(h4) {
    font-size: 18px;
    font-weight: 600;
    line-height: 1.5;
    margin: 24px 0 12px 0;
    scroll-margin-top: 20px;
  }

  // 段落和文本
  :deep(p) {
    margin: 16px 0;
    line-height: 1.75;
    color: var(--el-text-color-regular);
  }

  // 无序列表
  :deep(ul) {
    margin: 16px 0;
    padding-left: 32px;
    list-style-type: disc;

    li {
      margin: 10px 0;
      line-height: 1.75;
      color: var(--el-text-color-regular);
      display: list-item;

      &::marker {
        color: var(--el-color-primary);
        font-size: 0.8em;
      }

      ul {
        margin: 8px 0;
        list-style-type: circle;

        li::marker {
          font-size: 0.7em;
        }
      }
    }
  }

  // 有序列表
  :deep(ol) {
    margin: 16px 0;
    padding-left: 32px;
    list-style-type: decimal;
    counter-reset: item;

    li {
      margin: 10px 0;
      line-height: 1.75;
      color: var(--el-text-color-regular);
      display: list-item;

      &::marker {
        color: var(--el-color-primary);
        font-weight: 600;
      }

      ol {
        margin: 8px 0;
        list-style-type: lower-alpha;
      }
    }
  }

  // 行内代码
  :deep(code:not(pre code)) {
    background: var(--el-fill-color-light);
    color: #e83e8c;
    padding: 3px 8px;
    border-radius: 6px;
    font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    font-size: 0.9em;
    font-weight: 500;
    border: 1px solid var(--el-border-color-lighter);
  }

  // 代码块
  :deep(pre) {
    background: #f6f8fa;
    padding: 20px;
    border-radius: 12px;
    overflow-x: auto;
    margin: 24px 0;
    border: 1px solid var(--el-border-color-light);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

    code {
      background: transparent;
      padding: 0;
      color: inherit;
      border: none;
      font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
      font-size: 14px;
      line-height: 1.6;
      display: block;
    }
  }

  // hljs 代码高亮样式
  :deep(.hljs) {
    display: block;
    overflow-x: auto;
    background: transparent;
  }

  // 引用块
  :deep(blockquote) {
    margin: 24px 0;
    padding: 16px 20px;
    background: var(--el-color-primary-light-9);
    border-left: 4px solid var(--el-color-primary);
    border-radius: 8px;
    color: var(--el-text-color-regular);

    p {
      margin: 8px 0;

      &:first-child {
        margin-top: 0;
      }

      &:last-child {
        margin-bottom: 0;
      }
    }
  }

  // 链接
  :deep(a) {
    color: var(--el-color-primary);
    text-decoration: none;
    font-weight: 500;
    transition: all 0.2s;
    cursor: pointer;

    &:hover {
      color: var(--el-color-primary-light-3);
      text-decoration: underline;
    }

    &.doc-internal-link {
      cursor: pointer;
      position: relative;

      &::after {
        content: '→';
        margin-left: 4px;
        font-size: 0.9em;
        opacity: 0.6;
      }
    }
  }

  // 表格
  :deep(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 24px 0;
    // border-radius: 8px;
    overflow: hidden;
    // box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    font-size: 15px;
    th,
    td {
      border: 1px solid var(--el-border-color-light);
      overflow: hidden;
      padding: 8px 12px;
      text-align: left;
    }

    th {
      background: var(--el-fill-color);
      font-weight: 600;
      color: var(--el-text-color-primary);
    }

    td {
      color: var(--el-text-color-regular);
    }

    tr:hover td {
      background: var(--el-fill-color-lighter);
    }
  }

  // 分割线
  :deep(hr) {
    border: none;
    border-top: 2px solid var(--el-border-color-lighter);
    margin: 40px 0;
  }

  // 图片
  :deep(img) {
    max-width: 100%;
    height: auto;
    border-radius: 12px;
    margin: 24px 0;
    // box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  // 强调
  :deep(strong) {
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  :deep(em) {
    font-style: italic;
    color: var(--el-text-color-regular);
  }
}

// 深色模式适配
html.dark {
  .docs-sidebar {
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.2);
  }

  .markdown-body {
    :deep(code:not(pre code)) {
      background: rgba(110, 118, 129, 0.2);
      color: #ff7b72;
      border-color: rgba(110, 118, 129, 0.3);
    }

    :deep(pre) {
      background: #161b22;
      border-color: #30363d;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    :deep(blockquote) {
      background: rgba(var(--el-color-primary-rgb), 0.1);
      border-left-color: var(--el-color-primary);
    }

    :deep(table) {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);

      th {
        background: rgba(110, 118, 129, 0.15);
      }

      tr:hover td {
        background: rgba(110, 118, 129, 0.1);
      }
    }

    :deep(img) {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    }
  }
}

// 移动端适配
@media (max-width: 800px) {
  .docs-header {
    padding: 0 16px;
    height: 56px;
  }

  .header-title {
    font-size: 18px;
  }

  .header-center {
    max-width: none;
  }

  .search-box {
    width: 100%;
  }

  .markdown-body {
    padding: 24px 16px;
    font-size: 15px;

    :deep(h1) {
      font-size: 28px;
      margin: 32px 0 16px 0;
    }

    :deep(h2) {
      font-size: 24px;
      margin: 28px 0 14px 0;
    }

    :deep(h3) {
      font-size: 20px;
      margin: 24px 0 12px 0;
    }

    :deep(h4) {
      font-size: 16px;
      margin: 20px 0 10px 0;
    }

    :deep(pre) {
      padding: 12px;
      margin: 16px 0;
      overflow-x: auto;

      code {
        font-size: 13px;
      }
    }

    :deep(table) {
      font-size: 13px;
      display: block;
      overflow-x: auto;
    }
  }
}
</style>
