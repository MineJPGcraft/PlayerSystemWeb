<script lang="ts" setup>
import {computed, onMounted, ref} from 'vue'
import {BellPlus, Megaphone, Trash2} from 'lucide-vue-next'
import AppPagination from '@/components/AppPagination.vue'
import {Button} from '@/components/ui/button'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {Badge} from '@/components/ui/badge'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Textarea} from '@/components/ui/textarea'
import {Switch} from '@/components/ui/switch'
import {
  consoleAnnouncementCreate,
  consoleAnnouncementDelete,
  consoleAnnouncements,
  consoleSendNotification,
  type ConsoleAnnouncement,
} from '@/api'
import {useConsoleAuth} from '@/composables/useConsoleAuth'
import {extractErrorMessage} from '@/lib/apiError'
import {formatDateTime} from '@/lib/format'

const {session} = useConsoleAuth()
const isSuperAdmin = computed(() => session.value?.consoleRole === 'super_admin')

// ============ 发站内通知 ============
const notifUserId = ref('')
const notifTitle = ref('')
const notifContent = ref('')
const sendingNotif = ref(false)
const notifMessage = ref('')
const notifError = ref(false)

// ============ 公告 ============
const annTitle = ref('')
const annContent = ref('')
const annPublished = ref(true)
const publishing = ref(false)
const annMessage = ref('')
const annError = ref(false)

const announcements = ref<ConsoleAnnouncement[]>([])
const annTotal = ref(0)
const annPage = ref(1)
const loadingAnn = ref(true)
const deletingId = ref('')

async function loadAnnouncements(): Promise<void> {
  loadingAnn.value = true
  try {
    const res = await consoleAnnouncements({page: annPage.value, pageSize: 10})
    announcements.value = res.items
    annTotal.value = res.total
  } catch {
    /* 忽略 */
  } finally {
    loadingAnn.value = false
  }
}

async function handleSendNotification(): Promise<void> {
  notifMessage.value = ''
  notifError.value = false
  if (!notifUserId.value || !notifTitle.value.trim()) {
    notifMessage.value = '请填写目标用户 ID 与通知标题。'
    notifError.value = true
    return
  }
  sendingNotif.value = true
  try {
    await consoleSendNotification(notifUserId.value, notifTitle.value.trim(), notifContent.value)
    notifMessage.value = '站内通知已发送。'
    notifTitle.value = ''
    notifContent.value = ''
  } catch (e) {
    notifMessage.value = extractErrorMessage(e, '发送失败。')
    notifError.value = true
  } finally {
    sendingNotif.value = false
  }
}

async function handlePublishAnnouncement(): Promise<void> {
  annMessage.value = ''
  annError.value = false
  if (!annTitle.value.trim()) {
    annMessage.value = '请输入公告标题。'
    annError.value = true
    return
  }
  publishing.value = true
  try {
    await consoleAnnouncementCreate(annTitle.value.trim(), annContent.value, annPublished.value)
    annMessage.value = '公告已发布。'
    annTitle.value = ''
    annContent.value = ''
    annPage.value = 1
    await loadAnnouncements()
  } catch (e) {
    annMessage.value = extractErrorMessage(e, '发布失败。')
    annError.value = true
  } finally {
    publishing.value = false
  }
}

async function handleDeleteAnnouncement(id: string): Promise<void> {
  if (!window.confirm('确定删除该公告吗？删除后不再对用户展示。')) return
  deletingId.value = id
  try {
    await consoleAnnouncementDelete(id)
    await loadAnnouncements()
  } catch (e) {
    annMessage.value = extractErrorMessage(e, '删除失败。')
    annError.value = true
  } finally {
    deletingId.value = ''
  }
}

onMounted(() => void loadAnnouncements())
</script>

<template>
  <div class="space-y-6">
    <!-- 站内通知（任意级别 Admin） -->
    <Card>
      <CardHeader class="pb-3">
        <CardTitle class="flex items-center gap-2 text-base">
          <BellPlus class="h-4 w-4 text-primary"/>
          发送站内通知
        </CardTitle>
        <CardDescription>给单个用户发送站内通知，用户可在通知中心查看。</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid gap-3 md:grid-cols-3">
          <div class="grid gap-1.5">
            <Label for="notif-user">目标用户 ID</Label>
            <Input id="notif-user" v-model="notifUserId" placeholder="be081dbc-..."/>
          </div>
          <div class="grid gap-1.5 md:col-span-2">
            <Label for="notif-title">标题</Label>
            <Input id="notif-title" v-model="notifTitle" placeholder="欢迎加入社区"/>
          </div>
          <div class="grid gap-1.5 md:col-span-3">
            <Label for="notif-content">内容</Label>
            <Textarea id="notif-content" v-model="notifContent" rows="2"/>
          </div>
        </div>
        <div v-if="notifMessage" :class="['text-sm font-medium', notifError ? 'text-destructive' : 'text-primary']">
          {{ notifMessage }}
        </div>
        <Button :disabled="sendingNotif" @click="handleSendNotification">
          {{ sendingNotif ? '发送中...' : '发送通知' }}
        </Button>
      </CardContent>
    </Card>

    <!-- 全站公告（仅 super_admin） -->
    <Card v-if="isSuperAdmin">
      <CardHeader class="pb-3">
        <CardTitle class="flex items-center gap-2 text-base">
          <Megaphone class="h-4 w-4 text-primary"/>
          发布全站公告
        </CardTitle>
        <CardDescription>公告对所有用户可见，展示在仪表盘。</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid gap-3">
          <div class="grid gap-1.5">
            <Label for="ann-title">标题</Label>
            <Input id="ann-title" v-model="annTitle" placeholder="维护通知"/>
          </div>
          <div class="grid gap-1.5">
            <Label for="ann-content">内容</Label>
            <Textarea id="ann-content" v-model="annContent" rows="2"/>
          </div>
          <label class="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch v-model:checked="annPublished"/>
            立即发布（关闭则仅记录草稿）
          </label>
        </div>
        <div v-if="annMessage" :class="['text-sm font-medium', annError ? 'text-destructive' : 'text-primary']">
          {{ annMessage }}
        </div>
        <Button :disabled="publishing" @click="handlePublishAnnouncement">
          {{ publishing ? '发布中...' : '发布公告' }}
        </Button>
      </CardContent>
    </Card>

    <!-- 公告列表（仅 super_admin） -->
    <Card v-if="isSuperAdmin">
      <CardHeader class="pb-3">
        <CardTitle class="text-base">公告列表</CardTitle>
      </CardHeader>
      <CardContent class="space-y-3">
        <div v-if="loadingAnn" class="space-y-2">
          <div v-for="i in 3" :key="i" class="h-10 animate-pulse rounded-lg bg-muted"/>
        </div>
        <div v-else-if="announcements.length === 0" class="py-8 text-center text-sm text-muted-foreground">
          暂无公告
        </div>
        <div v-else class="space-y-2">
          <div
              v-for="item in announcements"
              :key="item.id"
              class="flex items-center justify-between gap-3 rounded-lg border p-3"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-medium">{{ item.title }}</p>
              <p class="text-xs text-muted-foreground">{{ formatDateTime(item.publishedAt) }}</p>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <Badge :variant="item.published ? 'success' : 'secondary'">
                {{ item.published ? '已发布' : '未发布' }}
              </Badge>
              <Button size="icon-sm" variant="destructive" :disabled="deletingId === item.id" @click="handleDeleteAnnouncement(item.id)">
                <Trash2 class="h-3.5 w-3.5"/>
              </Button>
            </div>
          </div>
        </div>
        <div class="flex justify-center">
          <AppPagination v-model:page="annPage" :page-size="10" :total="annTotal" @update:page="loadAnnouncements"/>
        </div>
      </CardContent>
    </Card>
  </div>
</template>