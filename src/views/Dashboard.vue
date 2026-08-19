<script lang="ts" setup>
import {computed, onMounted, ref} from 'vue'
import {ArrowRight, Bell, Crown, Gamepad2, MessagesSquare, MonitorSmartphone, Vote} from 'lucide-vue-next'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {Badge} from '@/components/ui/badge'
import {Button} from '@/components/ui/button'
import {Skeleton} from '@/components/ui/skeleton'
import AppPageHeader from '@/components/AppPageHeader.vue'
import UserDisplay from '@/components/UserDisplay.vue'
import {
  getLauncherSessions,
  getYggdrasilProfiles,
  getUserAnnouncements,
  getUserNotifications,
  type Announcement,
} from '@/api'
import {useUserInfo} from '@/composables/useUserInfo'
import {formatRelativeTime} from '@/lib/format'
import {hasRole} from '@/lib/permissions'

const {user, isAuthenticated} = useUserInfo()

const rolesCount = ref<number | null>(null)
const sessionsCount = ref<number | null>(null)
const unread = ref(0)
const announcements = ref<Announcement[]>([])
const loading = ref(true)

const quickLinks = [
  {name: '角色管理', desc: '创建角色、上传皮肤与披风', to: '/role-management', icon: Gamepad2},
  {name: '启动器会话', desc: '生成游戏登录凭据', to: '/launcher-sessions', icon: MonitorSmartphone},
  {name: '投票', desc: '参与社区投票', to: '/votes', icon: Vote},
  {name: '议题', desc: '反馈问题、参与讨论', to: '/issues', icon: MessagesSquare},
  {name: '通知', desc: '查看站内通知', to: '/notifications', icon: Bell},
]

const canManage = computed(() => hasRole(user.value?.role ?? null, 'moderator'))

onMounted(async () => {
  loading.value = true
  try {
    const [profiles, sessions, notif, ann] = await Promise.allSettled([
      getYggdrasilProfiles(),
      getLauncherSessions(),
      getUserNotifications(1, 1),
      getUserAnnouncements(1, 5),
    ])
    if (profiles.status === 'fulfilled') rolesCount.value = profiles.value.total
    if (sessions.status === 'fulfilled') sessionsCount.value = sessions.value.total
    if (notif.status === 'fulfilled') unread.value = notif.value.unread ?? 0
    if (ann.status === 'fulfilled') announcements.value = ann.value.items
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="space-y-6 p-4 md:p-8 pt-6">
    <AppPageHeader title="仪表盘" description="欢迎回来，这里汇总了您的账号概览与社区动态。">
      <template v-if="canManage" #actions>
        <Button as-child variant="outline">
          <router-link to="/management/users">管理入口</router-link>
        </Button>
      </template>
    </AppPageHeader>

    <!-- 欢迎横幅 -->
    <Card class="overflow-hidden border-0 bg-gradient-to-br from-primary via-primary/85 to-fuchsia-500/80 text-primary-foreground shadow-lg">
      <CardContent class="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
        <div class="space-y-2">
          <Badge class="border-transparent bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20">
            已登录
          </Badge>
          <h2 class="text-xl font-bold md:text-2xl">
            <UserDisplay
                :username="user?.username || ''"
                :prefix="(user?.prefixes ?? []).find(p => p.id === user?.prefixId) ?? null"
                :groups="user?.identityGroups.map(g => g.displayName ?? g.name) ?? []"
                :role="user?.role ?? null"
            />
          </h2>
          <p class="text-sm opacity-90">
            邮箱：{{ user?.email || '未绑定邮箱' }}
          </p>
        </div>
        <div class="flex flex-wrap gap-8">
          <div class="text-center md:text-left">
            <p class="text-2xl font-bold">{{ rolesCount ?? '—' }}</p>
            <p class="text-xs opacity-80">我的角色</p>
          </div>
          <div class="text-center md:text-left">
            <p class="text-2xl font-bold">{{ sessionsCount ?? '—' }}</p>
            <p class="text-xs opacity-80">启动器会话</p>
          </div>
          <div class="text-center md:text-left">
            <p class="text-2xl font-bold">{{ unread }}</p>
            <p class="text-xs opacity-80">未读通知</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- 公告 -->
    <Card v-if="announcements.length > 0">
      <CardHeader class="pb-3">
        <CardTitle class="flex items-center gap-2">
          <Crown class="h-5 w-5 text-primary"/>
          全站公告
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-3">
        <router-link
            v-for="item in announcements"
            :key="item.id"
            to="/notifications"
            class="block rounded-lg border bg-card p-3 transition-colors hover:bg-accent/40"
        >
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm font-semibold">{{ item.title }}</p>
            <span class="shrink-0 text-xs text-muted-foreground">{{ formatRelativeTime(item.publishedAt) }}</span>
          </div>
          <p class="mt-1 line-clamp-2 text-sm text-muted-foreground">{{ item.content }}</p>
        </router-link>
      </CardContent>
    </Card>

    <!-- 常用功能 -->
    <div>
      <h3 class="mb-3 text-base font-semibold">常用功能</h3>
      <Skeleton v-if="loading" class="h-24 w-full"/>
      <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <router-link
            v-for="link in quickLinks"
            :key="link.to"
            :to="link.to"
            class="group rounded-xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
        >
          <div class="flex items-center justify-between">
            <span class="rounded-lg bg-primary/10 p-2.5 text-primary">
              <component :is="link.icon" class="h-5 w-5"/>
            </span>
            <ArrowRight class="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary"/>
          </div>
          <p class="mt-4 font-semibold">{{ link.name }}</p>
          <p class="mt-1 text-sm text-muted-foreground">{{ link.desc }}</p>
        </router-link>
      </div>
    </div>
  </div>
</template>