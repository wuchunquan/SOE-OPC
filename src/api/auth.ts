import request from '@/utils/http'

/** 后端返回的原始用户信息 */
interface BackendUserInfo {
  id: number
  username: string
  real_name?: string
  email?: string
  phone?: string
  avatar?: string
  department?: {
    id: number
    name: string
  }
  roles: Array<{
    id: number
    name: string
    code: string
  }>
  permissions: string[]
  invite_code?: string
}

/** 后端登录响应 */
interface BackendLoginResponse {
  access_token: string
  token_type: string
  user_info: BackendUserInfo
  newapi_token_key?: string
  newapi_base_url?: string
  newapi_password?: string
  newapi_models?: Array<{ model_name: string; vendor_name?: string }>
  newapi_default_model?: string
}

/**
 * 转换后端用户信息为前端格式
 * @see /docs/DEVELOPMENT.md 查看字段映射说明
 */
function transformUserInfo(backendUser: BackendUserInfo): Api.Auth.UserInfo {
  return {
    userId: backendUser.id,
    userName: backendUser.username,
    realName: backendUser.real_name,
    email: backendUser.email,
    phone: backendUser.phone,
    avatar: backendUser.avatar,
    department: backendUser.department,
    roles: backendUser.roles,
    // 后端 permissions 映射到前端 buttons，用于按钮级权限控制
    buttons: backendUser.permissions,
    inviteCode: backendUser.invite_code,
  }
}

/**
 * 登录
 * @param params 登录参数
 * @returns 登录响应
 */
export async function fetchLogin(params: Api.Auth.LoginParams): Promise<Api.Auth.LoginResponse> {
  const response = await request.post<BackendLoginResponse>({
    url: '/api/auth/login',
    data: params
  })

  return {
    access_token: response.access_token,
    token_type: response.token_type,
    user_info: transformUserInfo(response.user_info),
    newapi_token_key: response.newapi_token_key,
    newapi_base_url: response.newapi_base_url,
    newapi_password: response.newapi_password,
    newapi_models: response.newapi_models,
    newapi_default_model: response.newapi_default_model,
  }
}

/**
 * 自用模式自动登录
 */
export async function fetchSelfUseBootstrapLogin(): Promise<Api.Auth.LoginResponse> {
  const response = await request.post<BackendLoginResponse>({
    url: '/api/auth/self-use/bootstrap-login'
  })

  return {
    access_token: response.access_token,
    token_type: response.token_type,
    user_info: transformUserInfo(response.user_info),
    newapi_token_key: response.newapi_token_key,
    newapi_base_url: response.newapi_base_url,
    newapi_password: response.newapi_password,
    newapi_models: response.newapi_models,
    newapi_default_model: response.newapi_default_model,
  }
}

/**
 * 获取用户信息
 * @returns 用户信息
 */
export async function fetchGetUserInfo(): Promise<Api.Auth.UserInfo> {
  const response = await request.get<BackendUserInfo>({
    url: '/api/auth/me'
  })

  return transformUserInfo(response)
}

/**
 * 登出
 */
export function fetchLogout() {
  return request.post<{ message: string }>({
    url: '/api/auth/logout'
  })
}

/**
 * 修改密码
 */
export function fetchChangePassword(params: { old_password: string; new_password: string }) {
  return request.post<{ message: string }>({
    url: '/api/auth/change-password',
    data: params
  })
}

/**
 * 刷新Token
 */
export function fetchRefreshToken() {
  return request.post<{ access_token: string; token_type: string }>({
    url: '/api/auth/refresh'
  })
}

/**
 * 更新用户头像
 */
export function fetchUpdateAvatar(avatarUrl: string) {
  return request.post<{ message: string }>({
    url: '/api/users/avatar',
    data: { avatar_url: avatarUrl }
  })
}

/**
 * 更新用户真实姓名
 */
export function fetchUpdateRealName(realName: string) {
  return request.post<{ message: string }>({
    url: '/api/users/real-name',
    data: { real_name: realName }
  })
}

/**
 * 发送注册验证码
 */
export function fetchSendCode(params: { email: string }) {
  return request.post<{ message: string }>({
    url: '/api/auth/send-code',
    data: params
  })
}

/**
 * 用户注册
 */
export function fetchRegister(params: { username: string; email: string; password: string; code: string; invite_code?: string }) {
  return request.post<{ message: string }>({
    url: '/api/auth/register',
    data: params
  })
}
