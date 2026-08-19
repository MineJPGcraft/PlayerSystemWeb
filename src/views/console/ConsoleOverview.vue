<script lang="ts" setup>
import {computed, ref} from 'vue'
import {RefreshCw} from 'lucide-vue-next'
import {Button} from '@/components/ui/button'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {Badge} from '@/components/ui/badge'
import {consoleReload} from '@/api'
import {useConsoleAuth} from '@/composables/useConsoleAuth'
import {extractErrorMessage} from '@/lib/apiError'
import {ROLE_LABEL} from '@/lib/permissions'

const {session, refreshMe} = useConsoleAuth()

const reloading = ref(false)
const reloadMessage = ref('')
const reloadError = ref(false)
const lastReload = ref<string | null>(null)

const isSuperAdmin = computed(() => session.value?.consoleRole === 'super_admin')

async function handleReload(): Promise<void> {
  reloadMessage.value = ''
  reloadError.value = false
  reloading.value = true
  try {
    const res = await consoleReload()
    reloadMessage.value = `已重载：${res.reloaded.join('、')}`
    lastReload.value = res.reloadedAt
  } catch (e) {
    reloadMessage.value = extractErrorMessage(e, '配置重载失败，本次改动未应用。')
    reloadError.value = true
  } finally {
    reloading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <Card v-if="session">
      <CardHeader>
        <CardTitle>当前后台会话</CardTitle>
        <CardDescription>后台 JWT 不自动续期，过期后需重新登录后台。</CardDescription>
      </CardHeader>
      <CardContent class="grid gap-3 text-sm sm:grid-cols-2">
        <p><span class="text-muted-foreground">用户名：</span>{{ session.username }}</p>
        <p><span class="text-muted-foreground">系统角色：</span>{{ ROLE_LABEL[session.role] }}</p>
        <p><span class="text-muted-foreground">后台级别：</span>
          <Badge variant="secondary">{{ session.consoleRole === 'super_admin' ? '超级管理员' : '管理员' }}</Badge>
        </p>
        <p><span class="text-muted-foreground">用户 ID：</span><code class="text-xs">{{ session.userId }}</code></p>
      </CardContent>
    </Card>

    <Card v-if="isSuperAdmin">
      <CardHeader>
        <CardTitle>配置热重载</CardTitle>
        <CardDescription>
          热重载全部配置文件（权限、限速、OIDC、身份组等）。任意文件解析失败将不应用任何改动。
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-3">
        <Button :disabled="reloading" @click="handleReload">
          <RefreshCw class="mr-1.5 h-4 w-4"/>
          {{ reloading ? '重载中...' : '重新加载配置' }}
        </Button>
        <div v-if="reloadMessage" :class="['text-sm font-medium', reloadError ? 'text-destructive' : 'text-primary']">
          {{ reloadMessage }}
        </div>
        <p v-if="lastReload" class="text-xs text-muted-foreground">最近重载：{{ lastReload }}</p>
      </CardContent>
    </Card>

    <Card v-else>
      <CardContent class="py-8 text-center text-sm text-muted-foreground">
        配置热重载、公告发布、前缀/标签/身份组维护等仅超级管理员（super_admin）可用。
      </CardContent>
    </Card>
  </div>
</template>