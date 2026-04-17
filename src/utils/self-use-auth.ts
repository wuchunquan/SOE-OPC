import { fetchSelfUseBootstrapLogin } from '@/api/auth'
import { useUserStore } from '@/store/modules/user'
import { isSelfUseMode } from '@/utils/runtime-mode'

let bootstrapPromise: Promise<boolean> | null = null

function persistNewApiSession(data: Api.Auth.LoginResponse) {
  if (data.newapi_token_key) {
    sessionStorage.setItem('newapi_token_key', data.newapi_token_key)
  }
  if (data.newapi_base_url) {
    sessionStorage.setItem('newapi_base_url', data.newapi_base_url)
  }
  if (data.newapi_password) {
    sessionStorage.setItem('newapi_password', data.newapi_password)
  }
  if (data.newapi_models) {
    sessionStorage.setItem('newapi_models', JSON.stringify(data.newapi_models))
  }
  if (data.newapi_default_model) {
    sessionStorage.setItem('newapi_default_model', data.newapi_default_model)
  }
}

export async function ensureSelfUseLogin(): Promise<boolean> {
  if (!isSelfUseMode()) return false

  const userStore = useUserStore()
  if (userStore.isLogin && userStore.accessToken) {
    return true
  }

  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      const loginData = await fetchSelfUseBootstrapLogin()
      userStore.setToken(loginData.access_token)
      userStore.setUserInfo(loginData.user_info)
      userStore.setLoginStatus(true)
      persistNewApiSession(loginData)
      return true
    })().finally(() => {
      bootstrapPromise = null
    })
  }

  return bootstrapPromise
}

