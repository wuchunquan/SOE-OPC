import { callDesktopBridge } from '@/desktop/bridge'

export enum BaseDirectory {
  App = 'App',
  Download = 'Download'
}

function bytesToBase64(data: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < data.length; i += chunkSize) {
    binary += String.fromCharCode(...data.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

export async function writeFile(path: string, data: Uint8Array | string): Promise<void> {
  const payload = typeof data === 'string' ? btoa(unescape(encodeURIComponent(data))) : bytesToBase64(data)
  await callDesktopBridge('write_file', path, payload)
}

