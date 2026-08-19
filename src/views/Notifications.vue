<script lang="ts" setup>
import {onMounted, ref} from 'vue'
import {BellOff, CheckCheck, Mail, MailOpen} from 'lucide-vue-next'
import AppPageHeader from '@/components/AppPageHeader.vue'
import AppPagination from '@/components/AppPagination.vue'
import {Button} from '@/components/ui/button'
import {Card, CardContent} from '@/components/ui/card'
import {Badge} from '@/components/ui/badge'
import {getUserNotifications, markNotificationRead, type UserNotification} from '@/api'
import {formatDateTime} from '@/lib/format'

const items = ref<UserNotification[]>([])
const total = ref(0)
const unread = ref(0)
const page = ref(1)
const pageSize = 10
const loading = ref(true)

async function load(): Promise<void> {
  loading.value = true
  try {
    const res = await getUserNotifications(page.value, pageSize)
    items.value = res.items
    total.value = res.total
    unread.value = res.unread
  } catch {
    /* 忽略 */
  } finally {
    loading.value = false
  }
}

async function handleRead(item: UserNotification): Promise<void> {
  if (item.isRead) return
  try {
    await markNotificationRead(item.id)
    item.isRead = true
    unread.value = Math.max(0, unread.value - 1)
  } catch {
    /* 忽略 */
  }
}

async function handleReadAll(): Promise<void> {
  try {
    await markNotificationRead()
    items.value.forEach(n => (n.isRead = true))
    unread.value = 0
  } catch {
    /* 忽略 */
  }
}

onMounted(() => void load())
</script>

<template>
  <div class="space-y-6 p-4 md:p-8 pt-6">
    <AppPageHeader title="通知" description="查看您的站内通知。">
      <template #actions>
        <Button variant="outline" :disabled="unread === 0" @click="handleReadAll">
          <CheckCheck class="mr-1.5 h-4 w-4"/>
          全部已读
        </Button>
      </template>
    </AppPageHeader>

    <Card>
      <CardContent class="p-0">
        <div v-if="loading" class="space-y-3 p-6">
          <div v-for="i in 4" :key="i" class="h-16 animate-pulse rounded-lg bg-muted"/>
        </div>
        <div v-else-if="items.length === 0" class="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <BellOff class="h-10 w-10 text-muted-foreground/50"/>
          <p class="text-sm text-muted-foreground">暂无通知</p>
        </div>
        <ul v-else class="divide-y">
          <li
              v-for="item in items"
              :key="item.id"
              class="flex cursor-pointer items-start gap-3 p-4 transition-colors hover:bg-accent/40"
              @click="handleRead(item)"
          >
            <span class="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
              <MailOpen v-if="item.isRead" class="h-4 w-4 text-muted-foreground"/>
              <Mail v-else class="h-4 w-4"/>
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <p class="truncate text-sm font-semibold" :class="item.isRead ? 'text-muted-foreground' : ''">
                  {{ item.title }}
                </p>
                <Badge v-if="!item.isRead" variant="default">未读</Badge>
              </div>
              <p class="mt-1 text-sm text-muted-foreground">{{ item.content }}</p>
              <p class="mt-1 text-xs text-muted-foreground/70">{{ formatDateTime(item.createdAt) }}</p>
            </div>
          </li>
        </ul>
      </CardContent>
    </Card>

    <div class="flex justify-center">
      <AppPagination v-model:page="page" :page-size="pageSize" :total="total" @update:page="load"/>
    </div>
  </div>
</template>