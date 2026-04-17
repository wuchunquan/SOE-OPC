import { callDesktopBridge } from '@/desktop/bridge'

export async function invoke(command: string, args: Record<string, any> = {}): Promise<any> {
  switch (command) {
    case 'open_folder':
      return await callDesktopBridge('open_path', args.path)
    case 'start_tray_blink':
    case 'stop_tray_blink':
      return false
    default:
      throw new Error(`未实现的桌面命令: ${command}`)
  }
}

