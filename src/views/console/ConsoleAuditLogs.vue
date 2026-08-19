<script lang="ts" setup>
import {onMounted, ref} from 'vue'
import AppPageHeader from '@/components/AppPageHeader.vue'
import AppPagination from '@/components/AppPagination.vue'
import {Button} from '@/components/ui/button'
import {Card, CardContent} from '@/components/ui/card'
import {Badge} from '@/components/ui/badge'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {consoleAuditLogs, type ConsoleAuditLogEntry} from '@/api'
import {extractErrorMessage} from '@/lib/apiError'
import {formatDateTime} from '@/lib/format'

const items = ref<ConsoleAuditLogEntry[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 10
const loading = ref(true)
const loadError = ref('')

const adminId = ref('')
const action = ref('')
const result = ref('')

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    const res = await consoleAuditLogs({
      page: page.value,
      pageSize,
      adminId: adminId.value || undefined,
      action: action.value || undefined,
      result: (result.value || undefined) as 'success' | 'denied' | undefined
    })
    items.value = res.items
    total.value = res.total
  } catch (e) {
    loadError.value = extractErrorMessage(e, '加载后台审计失败。')
  } finally {
    loading.value = false
  }
}

function doSearch(): void {
  page.value = 1
  void load()
}

onMounted(() => void load())
</script>

<template>
  <Card>
    <CardContent class="space-y-4 p-4">
      <h2 class="text-base font-semibold">后台审计日志</h2>
      <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div class="grid gap-1">
          <Label>管理员 ID</Label>
          <Input v-model="adminId" placeholder="adminId"/>
        </div>
        <div class="grid gap-1">
          <Label>动作（前缀匹配）</Label>
          <Input v-model="action" placeholder="如 console."/>
        </div>
        <div class="grid gap-1">
          <Label>结果</Label>
          <select
              v-model="result"
              class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          >
            <option value="">全部</option>
            <option value="success">成功</option>
            <option value="denied">拒绝</option>
          </select>
        </div>
        <div class="flex items-end">
          <Button class="w-full" variant="outline" @click="doSearch">查询</Button>
        </div>
      </div>

      <div v-if="loadError" class="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
        {{ loadError }}
      </div>

      <div v-if="loading" class="space-y-3">
        <div v-for="i in 5" :key="i" class="h-12 animate-pulse rounded-lg bg-muted"/>
      </div>

      <div v-else-if="items.length === 0" class="py-10 text-center text-sm text-muted-foreground">
        暂无匹配的后台审计记录
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[760px] text-sm">
          <thead>
          <tr class="border-b text-left text-xs text-muted-foreground">
            <th class="py-2 pr-4">时间</th>
            <th class="py-2 pr-4">管理员</th>
            <th class="py-2 pr-4">动作</th>
            <th class="py-2 pr-4">结果</th>
            <th class="py-2 pr-4">IP</th>
            <th class="py-2">载荷</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="entry in items" :key="entry.id" class="border-b last:border-0 align-top">
            <td class="py-2 pr-4 whitespace-nowrap text-muted-foreground">{{ formatDateTime(entry.createdAt) }}</td>
            <td class="py-2 pr-4 font-mono text-xs">{{ entry.adminId }}</td>
            <td class="py-2 pr-4">
              <span class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{{ entry.action }}</span>
            </td>
            <td class="py-2 pr-4">
              <Badge :variant="entry.result === 'success' ? 'success' : 'destructive'">
                {{ entry.result === 'success' ? '成功' : '拒绝' }}
              </Badge>
            </td>
            <td class="py-2 pr-4 font-mono text-xs">{{ entry.ip }}</td>
            <td class="py-2 font-mono text-xs text-muted-foreground">
              {{ entry.payload ? JSON.stringify(entry.payload) : '-' }}
            </td>
          </tr>
          </tbody>
        </table>
      </div>

      <div class="flex justify-center">
        <AppPagination v-model:page="page" :page-size="pageSize" :total="total" @update:page="load"/>
      </div>
    </CardContent>
  </Card>
</template>