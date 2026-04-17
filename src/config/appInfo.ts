const DEFAULT_APP_NAME = '一人国企·OPC'

export const APP_NAME = (import.meta.env.VITE_APP_NAME || '').trim() || DEFAULT_APP_NAME

export const APP_DIR_NAME = (import.meta.env.VITE_APP_DIR_NAME || '').trim() || APP_NAME
