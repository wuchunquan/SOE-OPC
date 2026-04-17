<!-- 登录页面 -->
<template>
  <div class="flex w-full h-screen">
    <LoginLeftView />

    <div class="relative flex-1">
      <AuthTopBar />

      <div class="auth-right-wrap">
        <div class="form" style="padding: 10px;">
          <h3 class="title">{{ $t('login.title') }}</h3>
          <p class="sub-title">{{ $t('login.subTitle') }}</p>
          <ElForm
            ref="formRef"
            :model="formData"
            :rules="rules"
            :key="formKey"
            @keyup.enter="handleSubmit"
            style="margin-top: 25px"
          >
            <ElFormItem prop="username">
              <ElInput
                class="custom-height"
                :placeholder="$t('login.placeholder.username')"
                v-model.trim="formData.username"
              />
            </ElFormItem>
            <ElFormItem prop="password">
              <ElInput
                class="custom-height"
                :placeholder="$t('login.placeholder.password')"
                v-model.trim="formData.password"
                type="password"
                autocomplete="off"
                show-password
              />
            </ElFormItem>

            <!-- 推拽验证 -->
            <div class="relative pb-5 mt-6">
              <div
                class="relative z-[2] overflow-hidden select-none rounded-lg border border-transparent tad-300"
                :class="{ '!border-[#FF4E4F]': !isPassing && isClickPass }"
              >
                <ArtDragVerify
                  ref="dragVerify"
                  v-model:value="isPassing"
                  :text="$t('login.sliderText')"
                  textColor="var(--art-gray-700)"
                  :successText="$t('login.sliderSuccessText')"
                  progressBarBg="var(--main-color)"
                  :background="isDark ? '#26272F' : '#F1F1F4'"
                  handlerBg="var(--default-box-color)"
                />
              </div>
              <p
                class="absolute top-0 z-[1] px-px mt-2 text-xs text-[#f56c6c] tad-300"
                :class="{ 'translate-y-10': !isPassing && isClickPass }"
              >
                {{ $t('login.placeholder.slider') }}
              </p>
            </div>

            <div class="flex-cb mt-2 text-sm">
              <ElCheckbox v-model="formData.rememberPassword">{{
                $t('login.rememberPwd')
              }}</ElCheckbox>
              <RouterLink class="text-theme" :to="{ name: 'ForgetPassword' }">{{
                $t('login.forgetPwd')
              }}</RouterLink>
            </div>

            <div class="mt-4 text-sm">
              <ElCheckbox v-model="formData.agreement">
                我已阅读并同意
                <span class="text-theme cursor-pointer" @click.prevent="openPrivacyDialog('privacy')">《隐私政策》</span>
                和
                <span class="text-theme cursor-pointer" @click.prevent="openPrivacyDialog('agreement')">《用户协议》</span>
              </ElCheckbox>
            </div>

            <div style="margin-top: 20px">
              <ElButton
                class="w-full custom-height"
                type="primary"
                @click="handleSubmit"
                :loading="loading"
                v-ripple
              >
                {{ $t('login.btnText') }}
              </ElButton>
            </div>

            <div class="mt-5 text-sm text-gray-600 flex items-center justify-between">
              <div>
                <span>{{ $t('login.noAccount') }}</span>
                <RouterLink class="text-theme" :to="{ name: 'Register' }">{{
                  $t('login.register')
                }}</RouterLink>
              </div>
              <span class="trial-tag">欢迎加群交流</span>
            </div>
          </ElForm>

          <!-- 微信交流群 -->
          <div class="qrcode-wrap">
            <img :src="getPublicUrl('wechat.png')" class="qrcode-img" />
          </div>

          <!-- 隐私协议弹窗 -->
          <PrivacyPolicyDialog v-model:visible="privacyDialogVisible" :defaultTab="privacyDialogTab" />

          <!-- 演示版提示 -->
          <div v-if="isDemoMode" class="demo-notice">
            <div class="demo-notice-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <span class="demo-notice-text">该版本为线上演示版，请勿输入真实数据</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import AppConfig from '@/config'
  import { useUserStore } from '@/store/modules/user'
  import { useI18n } from 'vue-i18n'
  import { HttpError } from '@/utils/http/error'
  import { fetchLogin } from '@/api/auth'
  import { ElNotification, ElMessage, type FormInstance, type FormRules } from 'element-plus'
  import { useSettingStore } from '@/store/modules/setting'
  import { isTauriEnv, getPublicUrl } from '@/utils/env'
  import PrivacyPolicyDialog from '@/components/core/views/login/PrivacyPolicyDialog.vue'
  import { isSelfUseMode } from '@/utils/runtime-mode'
  import { ensureSelfUseLogin } from '@/utils/self-use-auth'

  defineOptions({ name: 'Login' })

  // 是否为演示模式
  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true'

  const settingStore = useSettingStore()
  const { isDark } = storeToRefs(settingStore)
  const { t, locale } = useI18n()
  const formKey = ref(0)

  // 监听语言切换，重置表单
  watch(locale, () => {
    formKey.value++
  })

  const dragVerify = ref()

  const userStore = useUserStore()
  const router = useRouter()
  const route = useRoute()
  const isPassing = ref(false)
  const isClickPass = ref(false)

  const systemName = AppConfig.systemInfo.name
  const formRef = ref<FormInstance>()

  const formData = reactive({
    username: '',
    password: '',
    rememberPassword: true,
    agreement: false
  })

  // 隐私协议弹窗
  const privacyDialogVisible = ref(false)
  const privacyDialogTab = ref<'privacy' | 'agreement'>('privacy')

  const openPrivacyDialog = (tab: 'privacy' | 'agreement') => {
    privacyDialogTab.value = tab
    privacyDialogVisible.value = true
  }

  const rules = computed<FormRules>(() => ({
    username: [{ required: true, message: t('login.placeholder.username'), trigger: 'blur' }],
    password: [{ required: true, message: t('login.placeholder.password'), trigger: 'blur' }]
  }))

  const loading = ref(false)

  onMounted(async () => {
    if (!isSelfUseMode() || userStore.isLogin) {
      return
    }

    try {
      loading.value = true
      const success = await ensureSelfUseLogin()
      if (success) {
        router.replace('/agent-desktop')
      }
    } catch (error) {
      console.error('[Login] self_use bootstrap failed:', error)
    } finally {
      loading.value = false
    }
  })

  // 登录
  const handleSubmit = async () => {
    if (!formRef.value) return

    try {
      // 表单验证
      const valid = await formRef.value.validate()
      if (!valid) return

      // 拖拽验证
      if (!isPassing.value) {
        isClickPass.value = true
        return
      }

      // 隐私协议验证
      if (!formData.agreement) {
        ElMessage.warning(t('login.agreementRequired'))
        return
      }

      loading.value = true

      // 登录请求
      const { username, password } = formData

      const { access_token, user_info, newapi_token_key, newapi_base_url, newapi_password, newapi_models, newapi_default_model } = await fetchLogin({
        username,
        password
      })

      // 验证token
      if (!access_token) {
        throw new Error('Login failed - no token received')
      }

      // 存储 token 和登录状态
      userStore.setToken(access_token)
      userStore.setUserInfo(user_info)
      userStore.setLoginStatus(true)

      // 存储 NewAPI 数据（供桌面端 sync-user 使用）
      if (newapi_token_key) {
        sessionStorage.setItem('newapi_token_key', newapi_token_key)
      }
      if (newapi_base_url) {
        sessionStorage.setItem('newapi_base_url', newapi_base_url)
      }
      if (newapi_password) {
        sessionStorage.setItem('newapi_password', newapi_password)
      }
      if (newapi_models) {
        sessionStorage.setItem('newapi_models', JSON.stringify(newapi_models))
      }
      if (newapi_default_model) {
        sessionStorage.setItem('newapi_default_model', newapi_default_model)
      }

      // 登录成功处理
      showLoginSuccessNotice()

      // 检测是否为 Tauri 桌面环境
      const isDesktopApp = isTauriEnv()

      console.log('[Login] 环境检测:', {
        isDesktopApp,
        hasTauri: '__TAURI_INTERNALS__' in window,
        userAgent: navigator.userAgent
      })

      // 仅 Tauri 桌面应用跳转到 agent-desktop 页面
      if (isDesktopApp) {
        console.log('[Login] Tauri 桌面环境，跳转到 agent-desktop 页面')
        router.push('/agent-desktop')
      } else {
        // Web 环境：检查 redirect 参数或跳转首页
        const redirect = route.query.redirect as string
        if (redirect) {
          console.log('[Login] Web 环境，跳转到 redirect:', redirect)
          router.push(redirect)
        } else {
          console.log('[Login] Web 环境，跳转到首页')
          router.push('/')
        }
      }
    } catch (error) {
      // 处理 HttpError
      if (error instanceof HttpError) {
        // ElMessage.error(error.message || '登录失败')
      } else {
        // 处理非 HttpError
        // ElMessage.error('登录失败，请稍后重试')
        console.error('[Login] Unexpected error:', error)
      }
    } finally {
      loading.value = false
      resetDragVerify()
    }
  }

  // 重置拖拽验证
  const resetDragVerify = () => {
    dragVerify.value.reset()
  }

  // 登录成功提示
  const showLoginSuccessNotice = () => {
    setTimeout(() => {
      ElNotification({
        title: t('login.success.title'),
        type: 'success',
        duration: 2500,
        zIndex: 10000,
        message: `${t('login.success.message')}：${systemName}!`
      })
    }, 1000)
  }
</script>

<style scoped>
  @import './style.css';
</style>

<style lang="scss" scoped>
  :deep(.el-select__wrapper) {
    height: 40px !important;
  }

  .demo-notice {
    margin-top: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 16px;
    background: rgba(59, 130, 246, 0.08);
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: 8px;
  }

  .demo-notice-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #3b82f6;
    flex-shrink: 0;
  }

  .demo-notice-text {
    font-size: 13px;
    color: var(--el-text-color-regular);
    font-weight: 500;
    letter-spacing: 0.3px;
  }

  html.dark {
    .demo-notice {
      background: rgba(59, 130, 246, 0.15);
      border-color: rgba(59, 130, 246, 0.3);
    }

    .demo-notice-icon {
      color: #60a5fa;
    }
  }

  .qrcode-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 14px;

    .qrcode-img {
      width: 135px;
      height: 135px;
      border-radius: 8px;
      border: 1px solid var(--el-border-color-lighter);
      object-fit: cover;
    }

    .qrcode-label {
      margin-top: 6px;
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }
  }

  .trial-notice {
    margin-top: 16px;
    text-align: center;
    font-size: 13px;
    color: var(--el-text-color-secondary);

    strong {
      color: var(--el-text-color-primary);
      user-select: all;
    }
  }
</style>
