<!-- 注册页面 -->
<template>
  <div class="flex w-full h-screen">
    <LoginLeftView />

    <div class="relative flex-1">
      <AuthTopBar />

      <div class="auth-right-wrap">
        <div class="form">
          <h3 class="title">{{ $t('register.title') }}</h3>
          <p class="sub-title">{{ $t('register.subTitle') }}</p>
          <ElForm
            class="mt-7.5"
            ref="formRef"
            :model="formData"
            :rules="rules"
            label-position="top"
            :key="formKey"
          >
            <ElFormItem prop="email">
              <ElInput
                class="custom-height"
                v-model.trim="formData.email"
                :placeholder="$t('register.placeholder.email')"
                :prefix-icon="Message"
              />
            </ElFormItem>

            <ElFormItem prop="username">
              <ElInput
                class="custom-height"
                v-model.trim="formData.username"
                :placeholder="$t('register.placeholder.username')"
                :prefix-icon="User"
              />
            </ElFormItem>

            <ElFormItem prop="password">
              <ElInput
                class="custom-height"
                v-model.trim="formData.password"
                :placeholder="$t('register.placeholder.password')"
                type="password"
                autocomplete="off"
                show-password
                :prefix-icon="Lock"
              />
            </ElFormItem>

            <ElFormItem prop="confirmPassword">
              <ElInput
                class="custom-height"
                v-model.trim="formData.confirmPassword"
                :placeholder="$t('register.placeholder.confirmPassword')"
                type="password"
                autocomplete="off"
                show-password
                :prefix-icon="Lock"
              />
            </ElFormItem>

            <ElFormItem prop="code">
              <div class="code-input-wrap">
                <ElInput
                  class="custom-height"
                  v-model.trim="formData.code"
                  :placeholder="$t('register.placeholder.code')"
                  maxlength="6"
                  :prefix-icon="Key"
                  @keyup.enter="register"
                />
                <ElButton
                  type="primary"
                  :disabled="countdown > 0"
                  :loading="sendingCode"
                  @click="handleSendCode"
                >
                  {{ countdown > 0 ? `${countdown}s` : $t('register.sendCode') }}
                </ElButton>
              </div>
            </ElFormItem>

            <ElFormItem>
              <ElInput
                class="custom-height"
                v-model.trim="formData.inviteCode"
                placeholder="邀请码（选填）"
                maxlength="12"
                :prefix-icon="Ticket"
              />
            </ElFormItem>

            <ElFormItem prop="agreement">
              <ElCheckbox v-model="formData.agreement">
                {{ $t('register.agreeText') }}
                <span
                  style="color: var(--theme-color); cursor: pointer"
                  @click.prevent="openPrivacyDialog('privacy')"
                  >{{ $t('register.privacyPolicy') }}</span
                >
                {{ $t('login.and') }}
                <span
                  style="color: var(--theme-color); cursor: pointer"
                  @click.prevent="openPrivacyDialog('agreement')"
                  >{{ $t('register.userAgreement') }}</span
                >
              </ElCheckbox>
            </ElFormItem>

            <!-- 隐私协议弹窗 -->
            <PrivacyPolicyDialog v-model:visible="privacyDialogVisible" :defaultTab="privacyDialogTab" />

            <div style="margin-top: 15px">
              <ElButton
                class="w-full custom-height"
                type="primary"
                @click="register"
                :loading="loading"
                v-ripple
              >
                {{ $t('register.submitBtnText') }}
              </ElButton>
            </div>

            <div class="mt-5 text-sm text-g-600">
              <span>{{ $t('register.hasAccount') }}</span>
              <RouterLink class="text-theme" :to="{ name: 'Login' }">{{
                $t('register.toLogin')
              }}</RouterLink>
            </div>
          </ElForm>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import type { FormInstance, FormRules } from 'element-plus'
  import { Message, User, Lock, Key, Ticket } from '@element-plus/icons-vue'
  import { fetchSendCode, fetchRegister } from '@/api/auth'
  import PrivacyPolicyDialog from '@/components/core/views/login/PrivacyPolicyDialog.vue'

  defineOptions({ name: 'Register' })

  interface RegisterForm {
    email: string
    username: string
    password: string
    confirmPassword: string
    code: string
    inviteCode: string
    agreement: boolean
  }

  const USERNAME_MIN_LENGTH = 3
  const USERNAME_MAX_LENGTH = 20
  const PASSWORD_MIN_LENGTH = 6
  const REDIRECT_DELAY = 1000

  const { t, locale } = useI18n()
  const router = useRouter()
  const route = useRoute()
  const formRef = ref<FormInstance>()

  const loading = ref(false)
  const sendingCode = ref(false)
  const countdown = ref(0)
  const formKey = ref(0)
  let countdownTimer: ReturnType<typeof setInterval> | null = null

  // 隐私协议弹窗
  const privacyDialogVisible = ref(false)
  const privacyDialogTab = ref<'privacy' | 'agreement'>('privacy')

  const openPrivacyDialog = (tab: 'privacy' | 'agreement') => {
    privacyDialogTab.value = tab
    privacyDialogVisible.value = true
  }

  // 监听语言切换，重置表单
  watch(locale, () => {
    formKey.value++
  })

  const formData = reactive<RegisterForm>({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    code: '',
    inviteCode: (route.query.invite as string) || '',
    agreement: false
  })

  /**
   * 验证密码
   */
  const validatePassword = (_rule: any, value: string, callback: (error?: Error) => void) => {
    if (!value) {
      callback(new Error(t('register.placeholder.password')))
      return
    }

    if (formData.confirmPassword) {
      formRef.value?.validateField('confirmPassword')
    }

    callback()
  }

  /**
   * 验证确认密码
   */
  const validateConfirmPassword = (
    _rule: any,
    value: string,
    callback: (error?: Error) => void
  ) => {
    if (!value) {
      callback(new Error(t('register.rule.confirmPasswordRequired')))
      return
    }

    if (value !== formData.password) {
      callback(new Error(t('register.rule.passwordMismatch')))
      return
    }

    callback()
  }

  /**
   * 验证用户协议
   */
  const validateAgreement = (_rule: any, value: boolean, callback: (error?: Error) => void) => {
    if (!value) {
      callback(new Error(t('register.rule.agreementRequired')))
      return
    }
    callback()
  }

  const rules = computed<FormRules<RegisterForm>>(() => ({
    email: [
      { required: true, message: t('register.rule.emailRequired'), trigger: 'blur' },
      { type: 'email', message: t('register.rule.emailRequired'), trigger: 'blur' }
    ],
    username: [
      { required: true, message: t('register.placeholder.username'), trigger: 'blur' },
      {
        min: USERNAME_MIN_LENGTH,
        max: USERNAME_MAX_LENGTH,
        message: t('register.rule.usernameLength'),
        trigger: 'blur'
      }
    ],
    password: [
      { required: true, validator: validatePassword, trigger: 'blur' },
      { min: PASSWORD_MIN_LENGTH, message: t('register.rule.passwordLength'), trigger: 'blur' }
    ],
    confirmPassword: [{ required: true, validator: validateConfirmPassword, trigger: 'blur' }],
    code: [
      { required: true, message: t('register.rule.codeRequired'), trigger: 'blur' },
      { min: 6, max: 6, message: '验证码为6位数字', trigger: 'blur' }
    ],
    agreement: [{ validator: validateAgreement, trigger: 'change' }]
  }))

  /**
   * 发送验证码
   */
  const handleSendCode = async () => {
    if (!formRef.value) return

    // 先验证邮箱字段
    try {
      await formRef.value.validateField('email')
    } catch {
      return
    }

    sendingCode.value = true
    try {
      await fetchSendCode({ email: formData.email })
      ElMessage.success(t('register.codeSent'))
      startCountdown()
    } catch (error: any) {
      ElMessage.error(error.message || '发送失败')
    } finally {
      sendingCode.value = false
    }
  }

  /**
   * 开始60秒倒计时
   */
  const startCountdown = () => {
    countdown.value = 60
    countdownTimer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        if (countdownTimer) {
          clearInterval(countdownTimer)
          countdownTimer = null
        }
      }
    }, 1000)
  }

  /**
   * 注册用户
   */
  const register = async () => {
    if (!formRef.value) return

    try {
      await formRef.value.validate()
      loading.value = true

      await fetchRegister({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        code: formData.code,
        invite_code: formData.inviteCode || undefined
      })

      ElMessage.success('注册成功')
      toLogin()
    } catch (error: any) {
      ElMessage.error(error.message || '注册失败')
    } finally {
      loading.value = false
    }
  }

  /**
   * 跳转到登录页面
   */
  const toLogin = () => {
    setTimeout(() => {
      router.push({ name: 'Login' })
    }, REDIRECT_DELAY)
  }

  onUnmounted(() => {
    if (countdownTimer) {
      clearInterval(countdownTimer)
    }
  })
</script>

<style scoped>
  @import '../login/style.css';

  .code-input-wrap {
    display: flex;
    width: 100%;
    gap: 10px;
  }

  .code-input-wrap .el-input {
    flex: 1;
  }

  .code-input-wrap .el-button {
    flex-shrink: 0;
    min-width: 120px;
    height: 42px;
  }
</style>
