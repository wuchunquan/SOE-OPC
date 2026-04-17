// 自定义的 language-data，只包含需要的语言，避免打包所有 legacy-modes
// 参考 @codemirror/language-data 的结构

import { html } from '@codemirror/lang-html'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { json } from '@codemirror/lang-json'
import { css } from '@codemirror/lang-css'
import { markdown } from '@codemirror/lang-markdown'

// 定义语言配置接口
interface LanguageDescription {
  name: string
  alias?: string[]
  extensions?: string[]
  filename?: RegExp
  load?: () => Promise<any>
  support?: any
}

// 只导出我们需要的语言
export const languages: LanguageDescription[] = [
  {
    name: 'HTML',
    alias: ['html', 'htm'],
    extensions: ['html', 'htm'],
    load: () => Promise.resolve(html())
  },
  {
    name: 'JavaScript',
    alias: ['javascript', 'js'],
    extensions: ['js', 'mjs'],
    load: () => Promise.resolve(javascript())
  },
  {
    name: 'TypeScript',
    alias: ['typescript', 'ts'],
    extensions: ['ts'],
    load: () => Promise.resolve(javascript({ typescript: true }))
  },
  {
    name: 'JSX',
    alias: ['jsx'],
    extensions: ['jsx'],
    load: () => Promise.resolve(javascript({ jsx: true }))
  },
  {
    name: 'TSX',
    alias: ['tsx'],
    extensions: ['tsx'],
    load: () => Promise.resolve(javascript({ jsx: true, typescript: true }))
  },
  {
    name: 'Python',
    alias: ['python', 'py'],
    extensions: ['py', 'pyw'],
    load: () => Promise.resolve(python())
  },
  {
    name: 'JSON',
    alias: ['json'],
    extensions: ['json', 'map'],
    load: () => Promise.resolve(json())
  },
  {
    name: 'CSS',
    alias: ['css'],
    extensions: ['css'],
    load: () => Promise.resolve(css())
  },
  {
    name: 'Markdown',
    alias: ['markdown', 'md'],
    extensions: ['md', 'markdown'],
    load: () => Promise.resolve(markdown())
  }
]
