import { AppRouteRecord } from '@/types/router'

export const docsRoutes: AppRouteRecord[] = [
  {
    name: 'HelpDocs',
    path: '/sys/docs',
    component: '/docs/index',
    meta: {
      title: '帮助文档',
      icon: 'ri:book-open-line',
      keepAlive: false
    }
  }
]
