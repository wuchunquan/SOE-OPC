/**
 * 外部应用类型定义
 */

export interface ExternalApp {
  id: number
  name: string
  description?: string
  url: string
  icon?: string
  is_enabled: boolean
  open_in_new_window: boolean
  sort_order: number
  category?: string
  created_at: string
  updated_at: string
}

export interface ExternalAppCreate {
  name: string
  description?: string
  url: string
  icon?: string
  is_enabled?: boolean
  open_in_new_window?: boolean
  sort_order?: number
  category?: string
}

export interface ExternalAppUpdate {
  name?: string
  description?: string
  url?: string
  icon?: string
  is_enabled?: boolean
  open_in_new_window?: boolean
  sort_order?: number
  category?: string
}
