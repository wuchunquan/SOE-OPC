import request from '@/utils/http'

// ==================== 类型定义 ====================

/** 文件信息 */
export interface FileInfo {
  id: number
  file_name: string
  original_name: string
  file_path: string
  file_size: number
  file_type?: string
  mime_type?: string
  upload_user_id?: number
  created_at: string
}

// ==================== API 接口 ====================

/** 上传文件 */
export function uploadFileApi(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return request.post<FileInfo>({
    url: '/api/file/upload',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/** 批量上传文件 */
export function uploadFilesApi(files: File[]) {
  const formData = new FormData()
  files.forEach(file => {
    formData.append('files', file)
  })
  return request.post<FileInfo[]>({
    url: '/api/file/upload/batch',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/** 获取文件信息 */
export function getFileApi(id: number) {
  return request.get<FileInfo>({
    url: `/api/file/${id}`
  })
}

/** 删除文件 */
export function deleteFileApi(id: number) {
  return request.del({
    url: `/api/file/${id}`
  })
}
