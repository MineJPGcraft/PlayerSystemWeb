<script lang="ts" setup>
import {onBeforeUnmount, onMounted, ref} from 'vue';
import {useRouter} from 'vue-router';
import {Bell, BellOff, Mail, MailOpen} from 'lucide-vue-next';
import {
  Button,
} from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {getUserNotifications, markNotificationRead, type UserNotification} from '@/api';
import {formatRelativeTime} from '@/lib/format';
import {isAuthenticated, useUserInfo} from '@/composables/useUserInfo';

const router = useRouter()
const {user} = useUserInfo()

const notifications = ref<UserNotification[]>([])
const unread = ref(0)
let timer: number | null = null

/** 拉取通知（仅拉取第一页，用于铃铛预览） */
async function loadNotifications(): Promise<void> {
  if (!isAuthenticated.value) return
  try {
    const res = await getUserNotifications(1, 5)
    notifications.value = res.items.slice(0, 5)
    unread.value = res.unread ?? 0
  } catch {
    /* 忽略通知加载失败 */
  }
}

async function handleOpenChange(open: boolean): Promise<void> {
  if (open) {
    await loadNotifications()
  }
}

async function handleMarkOne(item: UserNotification): Promise<void> {
  if (item.isRead) return
  try {
    await markNotificationRead(item.id)
    item.isRead = true
    unread.value = Math.max(0, unread.value - 1)
  } catch {
    /* 忽略 */
  }
}

async function handleMarkAll(): Promise<void> {
  try {
    await markNotificationRead()
    notifications.value.forEach(n => (n.isRead = true))
    unread.value = 0
  } catch {
    /* 忽略 */
  }
}

function goNotifications(): void {
  router.push('/notifications')
}

onMounted(() => {
  void loadNotifications()
  // 每 60 秒刷新一次未读数
  timer = window.setInterval(() => void loadNotifications(), 60_000)
})

onBeforeUnmount(() => {
  if (timer !== null) {
    window.clearInterval(timer)
  }
})
</script>

<template>
  <DropdownMenu @update:open="handleOpenChange">
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="icon" class="relative" aria-label="通知">
        <Bell class="h-4.5 w-4.5"/>
        <span
            v-if="unread > 0"
            class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground"
        >
          {{ unread > 99 ? '99+' : unread }}
        </span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-80">
      <DropdownMenuLabel class="flex items-center justify-between">
        <span class="text-sm font-medium">通知</span>
        <Button v-if="unread > 0" size="xs" variant="outline" @click="handleMarkAll">
          <MailOpen class="mr-1 h-3.5 w-3.5"/>
          全部已读
        </Button>
      </DropdownMenuLabel>
      <DropdownMenuSeparator/>
      <div v-if="notifications.length === 0" class="flex flex-col items-center gap-2 px-4 py-8 text-center">
        <BellOff class="h-8 w-8 text-muted-foreground/50"/>
        <p class="text-sm text-muted-foreground">暂无通知</p>
      </div>
      <template v-else>
        <DropdownMenuItem
            v-for="item in notifications"
            :key="item.id"
            class="flex cursor-pointer items-start gap-2 py-2"
            @click="handleMarkOne(item)"
        >
          <Mail v-if="!item.isRead" class="mt-0.5 h-4 w-4 shrink-0 text-primary"/>
          <MailOpen v-else class="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"/>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-medium" :class="item.isRead ? 'text-muted-foreground' : ''">
              {{ item.title }}
            </span>
            <span class="block truncate text-xs text-muted-foreground">{{ item.content }}</span>
            <span class="block text-xs text-muted-foreground/70">{{ formatRelativeTime(item.createdAt) }}</span>
          </span>
        </DropdownMenuItem>
        <DropdownMenuSeparator/>
        <DropdownMenuItem class="justify-center" @click="goNotifications">
          <span class="text-sm text-primary">查看全部通知</span>
        </DropdownMenuItem>
      </template>
    </DropdownMenuContent>
  </DropdownMenu>
</template>