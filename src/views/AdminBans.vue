<script lang="ts" setup>
import {onMounted, ref} from 'vue'
import {Ban, ShieldOff} from 'lucide-vue-next'
import AppPageHeader from '@/components/AppPageHeader.vue'
import AppPagination from '@/components/AppPagination.vue'
import UserDisplay from '@/components/UserDisplay.vue'
import {Button} from '@/components/ui/button'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {Badge} from '@/components/ui/badge'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Textarea} from '@/components/ui/textarea'
import {Switch} from '@/components/ui/switch'
import {Separator} from '@/components/ui/separator'
import {createBan, deleteBan, getBans, type BanRecord} from '@/api'
import {extractErrorMessage} from '@/lib/apiError'
import {describeBan, formatDateTime} from '@/lib/format'

const items = ref<BanRecord[]>([])
const total = ref(0)
const page = ref(1)
const activeOnly = ref(false)
const loading = ref(true)
const loadError = ref('')
const unbanningId = ref('')

// 新建封禁
const targetUserId = ref('')
const banUntil = ref('')
const banReason = ref('')
const banning = ref(false)
const banMessage = ref('')
const banError = ref(false)

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    const res = await getBans({
      page: page.value,
      pageSize: 10,
      active: activeOnly.value ? true : undefined
    })
    items.value = res.items
    total.value = res.total
  } catch (e) {
    loadError.value = extractErrorMessage(e, '加载封禁列表失败。')
  } finally {
    loading.value = false
  }
}

async function handleCreate(): Promise<void> {
  banMessage.value = ''
  banError.value = false
  if (!targetUserId.value) {
    banMessage.value = '请输入目标用户 ID。'
    banError.value = true
    return
  }
  banning.value = true
  try {
    await createBan({
      userId: targetUserId.value,
      bannedUntil: banUntil.value ? new Date(banUntil.value).toISOString() : null,
      reason: banReason.value || undefined
    })
    banMessage.value = '封禁已生效。'
    targetUserId.value = ''
    banUntil.value = ''
    banReason.value = ''
    void load()
  } catch (e) {
    banMessage.value = extractErrorMessage(e, '封禁失败。')
    banError.value = true
  } finally {
    banning.value = false
  }
}

async function handleUnban(rec: BanRecord): Promise<void> {
  unbanningId.value = rec.id
  try {
    await deleteBan(rec.userId, '解封')
    void load()
  } catch (e) {
    loadError.value = extractErrorMessage(e, '解封失败。')
  } finally {
    unbanningId.value = ''
  }
}

onMounted(() => void load())
</script>

<template>
  <div class="space-y-6 p-4 md:p-8 pt-6">
    <AppPageHeader title="封禁管理" description="创建与解除用户封禁。封禁将立即吊销其全部会话与游戏凭据。"/>

    <Card>
      <CardHeader class="pb-3">
        <CardTitle class="text-base">创建封禁</CardTitle>
        <CardDescription>按用户 ID 封禁，可选择到期时间与原因。</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid gap-3 md:grid-cols-3">
          <div class="grid gap-1.5 md:col-span-3">
            <Label for="target-user">用户 ID</Label>
            <Input id="target-user" v-model="targetUserId" placeholder="be081dbc-..."/>
          </div>
          <div class="grid gap-1.5">
            <Label for="ban-until">解封时间（可空 = 永久）</Label>
            <Input id="ban-until" v-model="banUntil" type="datetime-local"/>
          </div>
          <div class="grid gap-1.5 md:col-span-2">
            <Label for="ban-reason">原因</Label>
            <Textarea id="ban-reason" v-model="banReason" rows="1" placeholder="违反社区规则"/>
          </div>
        </div>
        <div v-if="banMessage" :class="['text-sm font-medium', banError ? 'text-destructive' : 'text-primary']">
          {{ banMessage }}
        </div>
        <Button variant="destructive" :disabled="banning" @click="handleCreate">
          <Ban class="mr-1.5 h-4 w-4"/>
          {{ banning ? '封禁中...' : '执行封禁' }}
        </Button>
      </CardContent>
    </Card>

    <Separator/>

    <Card>
      <CardContent class="space-y-4 p-4">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium">封禁列表</p>
          <label class="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch :checked="activeOnly" @update:checked="activeOnly = $event; page = 1; load()"/>
            仅显示生效中
          </label>
        </div>

        <div v-if="loadError" class="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {{ loadError }}
        </div>

        <div v-if="loading" class="space-y-3">
          <div v-for="i in 3" :key="i" class="h-12 animate-pulse rounded-lg bg-muted"/>
        </div>

        <div v-else-if="items.length === 0" class="py-10 text-center text-sm text-muted-foreground">
          暂无封禁记录
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[560px] text-sm">
            <thead>
            <tr class="border-b text-left text-xs text-muted-foreground">
              <th class="py-2 pr-4">用户 ID</th>
              <th class="py-2 pr-4">封禁期限</th>
              <th class="py-2 pr-4">原因</th>
              <th class="py-2 pr-4">操作人</th>
              <th class="py-2 pr-4">创建时间</th>
              <th class="py-2 text-right">操作</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="rec in items" :key="rec.id" class="border-b last:border-0">
              <td class="py-2 pr-4 font-mono text-xs">{{ rec.userId }}</td>
              <td class="py-2 pr-4">
                <Badge :variant="rec.bannedUntil === null ? 'destructive' : 'warning'">
                  {{ describeBan(rec.bannedUntil) }}
                </Badge>
              </td>
              <td class="py-2 pr-4">{{ rec.reason || '-' }}</td>
              <td class="py-2 pr-4 font-mono text-xs">{{ rec.operatorId }}</td>
              <td class="py-2 pr-4 text-muted-foreground">{{ formatDateTime(rec.createdAt) }}</td>
              <td class="py-2 text-right">
                <Button size="sm" variant="outline" :disabled="unbanningId === rec.id" @click="handleUnban(rec)">
                  <ShieldOff class="mr-1 h-3.5 w-3.5"/>
                  {{ unbanningId === rec.id ? '处理中...' : '解封' }}
                </Button>
              </td>
            </tr>
            </tbody>
          </table>
        </div>

        <div class="flex justify-center">
          <AppPagination v-model:page="page" :page-size="10" :total="total" @update:page="load"/>
        </div>
      </CardContent>
    </Card>
  </div>
</template>