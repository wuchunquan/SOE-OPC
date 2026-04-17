import { AppRouteRecord } from '@/types/router'

export const sysRoutes: AppRouteRecord = {
  path: '/sys',
  name: 'Sys',
  component: '/index/index',
  meta: {
    title: 'menus.sys.title',
    icon: 'ri:settings-3-line',
    roles: ['admin', 'manager']
  },
  children: [
    {
      path: 'users',
      name: 'SysUsers',
      component: '/sys/users/index',
      meta: {
        title: 'menus.sys.users',
        icon: 'ri:user-line',
        keepAlive: false,
        roles: ['admin', 'manager']
      }
    },
    {
      path: 'roles',
      name: 'SysRoles',
      component: '/sys/roles/index',
      meta: {
        title: 'menus.sys.roles',
        icon: 'ri:user-settings-line',
        keepAlive: false,
        roles: ['admin', 'manager']
      }
    },
    {
      path: 'permissions',
      name: 'SysPermissions',
      component: '/sys/permissions/index',
      meta: {
        title: 'menus.sys.permissions',
        icon: 'ri:shield-keyhole-line',
        keepAlive: false,
        roles: ['admin', 'manager']
      }
    },
    {
      path: 'organization',
      name: 'SysOrganization',
      component: '/sys/organization/index',
      meta: {
        title: 'menus.sys.organization',
        icon: 'ri:building-line',
        keepAlive: false,
        roles: ['admin', 'manager']
      }
    },
    {
      path: 'dictionary',
      name: 'SysDictionary',
      component: '/sys/dictionary/index',
      meta: {
        title: 'menus.sys.dictionary',
        icon: 'ri:book-2-line',
        keepAlive: false,
        roles: ['admin', 'manager']
      }
    },
    {
      path: 'scheduled-task',
      name: 'ScheduledTask',
      component: '/base/scheduledTask/index',
      meta: {
        title: 'menus.sys.scheduledTask',
        icon: 'ri:time-line',
        keepAlive: false,
        roles: ['admin', 'manager']
      }
    },
    {
      path: 'scheduled-task-logs',
      name: 'ScheduledTaskLogs',
      component: '/base/scheduledTask/logs',
      meta: {
        title: 'menus.sys.scheduledTaskLogs',
        icon: 'ri:file-list-3-line',
        keepAlive: false,
        roles: ['admin', 'manager'],
        hidden: true
      }
    },
    {
      path: 'config',
      name: 'SysConfig',
      component: '/sys/config/index',
      meta: {
        title: 'menus.sys.config',
        icon: 'ri:settings-4-line',
        keepAlive: false,
        roles: ['admin', 'manager']
      }
    },
    {
      path: 'external-apps',
      name: 'SysExternalApps',
      component: '/sys/external-apps/index',
      meta: {
        title: 'menus.sys.externalApps',
        icon: 'ri:apps-line',
        keepAlive: false,
        roles: ['admin', 'manager']
      }
    }
  ]
}
