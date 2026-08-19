<script lang="ts" setup>
import {computed, onMounted, ref} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {LogOut, ShieldCheck} from 'lucide-vue-next'
import {Button} from '@/components/ui/button'
import {Badge} from '@/components/ui/badge'
import {getConsoleJwt} from '@/api'
import {useConsoleAuth} from '@/composables/useConsoleAuth'
import {useUserInfo} from '@/composables/useUserInfo'

const route = useRoute()
const router = useRouter()
const {session, refreshMe, logout} = useConsoleAuth()
const {clear: clearUser} = useUserInfo()

const navItems = [
  {path: '/console', label: '概览'},
  {path: '/console/users', label: '用户与角色'},
  {path: '/console/groups', label: '身份组'},
  {path: '/console/notifications', label: '通知与公告'},
  {path: '/console/content', label: '标签与前缀'},
  {path: '/console/audit-logs', label: '后台审计'},
]

const current = computed(() => navItems.findIndex(item => route.path === item.path))

function go(index: number): void {
  router.push(navItems[index].path)
}

async function handleLogout(): Promise<void> {
  await logout()
  clearUser()
  router.push('/console/login')
}

onMounted(async () => {
  if (!getConsoleJwt()) {
    router.replace('/console/login')
    return
  }
  try {
    await refreshMe(true)
  } catch {
    // JWT 失效 / 网络异常：consoleHttp 401 拦截器会跳转后台登录页，这里兜底
    if (!getConsoleJwt()) {
      router.replace('/console/login')
    }
  }
})
</script>

<template>
  <div class="space-y-6 p-4 md:p-8 pt-6">
    <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div class="flex items-center gap-2">
        <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ShieldCheck class="h-5 w-5"/>
        </span>
        <div>
          <h1 class="text-xl font-bold md:text-2xl">管理后台</h1>
          <p v-if="session" class="text-xs text-muted-foreground">
            {{ session.username }} ｜
            <Badge variant="secondary">{{ session.consoleRole === 'super_admin' ? '超级管理员' : '管理员' }}</Badge>
          </p>
        </div>
      </div>
      <Button variant="outline" size="sm" @click="handleLogout">
        <LogOut class="mr-1.5 h-4 w-4"/>
        退出后台
      </Button>
    </div>

    <!-- 子导航 -->
    <div class="flex flex-wrap gap-1 rounded-lg border bg-card p-1">
      <Button
          v-for="(item, index) in navItems"
          :key="item.path"
          size="sm"
          :variant="current === index ? 'default' : 'ghost'"
          @click="go(index)"
      >
        {{ item.label }}
      </Button>
    </div>

    <router-view/>
  </div>
</template>