/**
 * 文档 API
 */
import request from '@/utils/http'

/** 文档节点 */
export interface DocNode {
  name: string
  path: string
  is_dir: boolean
  title?: string
  children?: DocNode[]
}

/** 文档树响应 */
export interface DocTreeResponse {
  tree: DocNode[]
}

/** 文档内容响应 */
export interface DocContentResponse {
  path: string
  title: string
  content: string
}

/**
 * 获取文档目录树
 */
export function getDocTreeApi() {
  return request.get<DocTreeResponse>({
    url: '/api/docs/tree'
  })
}

/**
 * 获取文档内容
 */
export function getDocContentApi(path: string) {
  return request.get<DocContentResponse>({
    url: '/api/docs/content',
    params: { path }
  })
}

/** 匹配片段 */
export interface MatchSnippet {
  text: string
  index: number
}

/** 搜索结果项 */
export interface SearchResult {
  path: string
  title: string
  snippet: string
  match_count: number
  snippets: MatchSnippet[]
}

/** 搜索响应 */
export interface SearchResponse {
  results: SearchResult[]
  total: number
}

/**
 * 搜索文档
 */
export function searchDocsApi(query: string) {
  return request.get<SearchResponse>({
    url: '/api/docs/search',
    params: { q: query }
  })
}
