<script lang="ts" setup>
import {onMounted, ref} from 'vue'
import {useRouter} from 'vue-router'
import {ShieldCheck} from 'lucide-vue-next'
import {Button} from '@/components/ui/button'
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from '@/components/ui/card'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import AuthShell from '@/components/AuthShell.vue'
import {consoleLogin, consoleSetPassword, getConsoleJwt} from '@/api'
import {useConsoleAuth} from '@/composables/useConsoleAuth'
import {extractErrorCode, extractErrorMessage} from '@/lib/apiError'

const router = useRouter()
const {setJwt} = useConsoleAuth()

const password = ref('')
// 待设密模式：新提升或刚被重置的后台账户需先设置强密码
const mustSetPassword = ref(false)
const message = ref('')
const isError = ref(false)
const loading = ref(false)

onMounted(async () => {
  // 已有后台 JWT 则直接进入后台
  if (getConsoleJwt()) {
    router.replace('/console')
  }
})

const handleLogin = async () => {
  message.value = ''
  isError.value = false
  if (!password.value) {
    message.value = '请输入后台密码。'
    isError.value = true
    return
  }
  loading.value = true
  try {
    const res = await consoleLogin(password.value)
    setJwt(res.jwt)
    router.replace('/console')
  } catch (e) {
    const code = extractErrorCode(e)
    if (code === 'ConsolePasswordNotSet') {
      mustSetPassword.value = true
      message.value = '该后台账户尚未设置密码，请先完成首次设密。'
    } else {
      message.value = extractErrorMessage(e, '后台登录失败。')
      isError.value = true
    }
  } finally {
    loading.value = false
  }
}

const handleSetPassword = async () => {
  message.value = ''
  isError.value = false
  if (!password.value || password.value.length < 12) {
    message.value = '后台密码至少 12 位，需包含大小写字母、数字与符号。'
    isError.value = true
    return
  }
  loading.value = true
  try {
    await consoleSetPassword(password.value)
    message.value = '设密成功，请使用新密码登录。'
    mustSetPassword.value = false
    password.value = ''
  } catch (e) {
    message.value = extractErrorMessage(e, '设密失败。')
    isError.value = true
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthShell title="管理后台" description="管理员专用入口。需使用主站管理员账号的后台密码登录。">
    <Card class="w-full border-border/60 shadow-xl shadow-black/5 backdrop-blur">
      <CardHeader class="text-center">
        <div class="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck class="h-6 w-6"/>
        </div>
        <CardTitle class="text-2xl">管理后台</CardTitle>
        <CardDescription>
          {{ mustSetPassword ? '首次设密' : '输入后台密码以继续' }}
        </CardDescription>
      </CardHeader>
      <CardContent class="grid gap-4">
        <div v-if="mustSetPassword" class="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">
          您的后台账户处于待设密状态。请设置一个强密码（至少 12 位，含大小写字母、数字与符号，且不得与主站密码相同）。
        </div>
        <div class="grid gap-2">
          <Label :for="mustSetPassword ? 'set-password' : 'password'">
            {{ mustSetPassword ? '新后台密码' : '后台密码' }}
          </Label>
          <Input
              :id="mustSetPassword ? 'set-password' : 'password'"
              v-model="password"
              type="password"
              autocomplete="current-password"
              :placeholder="mustSetPassword ? '设置强密码' : '输入后台密码'"
              @keyup.enter="mustSetPassword ? handleSetPassword() : handleLogin()"
          />
        </div>
        <div v-if="message" :class="['text-sm font-medium', isError ? 'text-destructive' : 'text-primary']">
          {{ message }}
        </div>
        <Button :disabled="loading" @click="mustSetPassword ? handleSetPassword() : handleLogin()">
          {{ loading ? '处理中...' : mustSetPassword ? '设置密码' : '登录后台' }}
        </Button>
      </CardContent>
      <CardFooter class="text-center text-sm text-muted-foreground">
        仅系统角色为管理员（Admin）的用户可以使用此入口
      </CardFooter>
    </Card>
  </AuthShell>
</template>