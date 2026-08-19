<script lang="ts" setup>
import {computed, onMounted, ref} from 'vue'
import {KeyRound, Search} from 'lucide-vue-next'
import AppPagination from '@/components/AppPagination.vue'
import {Button} from '@/components/ui/button'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {Badge} from '@/components/ui/badge'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select'
import UserDisplay from '@/components/UserDisplay.vue'
import {getManagementUsers, consoleResetPassword, consoleRoleChange, type ManagementUser, type SystemRole} from '@/api'
import {useConsoleAuth} from '@/composables/useConsoleAuth'
import {extractErrorMessage} from '@/lib/apiError'
import {ROLE_LABEL} from '@/lib/permissions'

const {session} = useConsoleAuth()
const isSuperAdmin = computed(() => session.value?.consoleRole === 'super_admin')

const users = ref<ManagementUser[]>([])
const total = ref(0)
const page = ref(1)
const q = ref('')
const loading = ref(true)
const loadError = ref('')
const changingUser = ref('')
const changeRole = ref<Record<string, SystemRole>>({})
const message = ref('')
const isError = ref(false)
const resettingId = ref('')

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    const res = await getManagementUsers({
      page: page.value,
      pageSize: 10,
      q: q.value || undefined
    })
    users.value = res.users
    total.value = res.total
    const roleMap: Record<string, SystemRole> = {}
    res.users.forEach(u => (roleMap[u.id] = u.role))
    changeRole.value = roleMap
  } catch (e) {
    loadError.value = extractErrorMessage(e, '加载用户失败。')
  } finally {
    loading.value = false
  }
}

function doSearch(): void {
  page.value = 1
  void load()
}

function onRoleChange(userId: string, value: unknown): void {
  changeRole.value[userId] = value as SystemRole
}

async function handleRoleChange(userId: string, role: SystemRole): Promise<void> {
  message.value = ''
  isError.value = false
  changingUser.value = userId
  try {
    await consoleRoleChange(userId, role, '后台变更')
    message.value = `已将会员 ${changeRole.value[userId]} 的角色变更为 ${ROLE_LABEL[role]}。`
    await load()
  } catch (e) {
    message.value = extractErrorMessage(e, '角色变更失败。')
    isError.value = true
  } finally {
    changingUser.value = ''
  }
}

async function handleResetPassword(userId: string): Promise<void> {
  if (!window.confirm('确定重置该管理员的后台密码吗？重置后其需重新设密才能进入后台。')) return
  resettingId.value = userId
  try {
    await consoleResetPassword(userId)
    message.value = '已重置该管理员的后台密码（回到待设密状态）。'
  } catch (e) {
    message.value = extractErrorMessage(e, '重置失败。')
    isError.value = true
  } finally {
    resettingId.value = ''
  }
}

onMounted(() => void load())
</script>

<template>
  <Card>
    <CardHeader class="pb-3">
      <CardTitle class="text-base">用户系统角色</CardTitle>
      <CardDescription>
        变更用户系统角色（user / helper / moderator / admin）。
        普通管理员可变更非管理员用户且不可提升为管理员；超级管理员可变更任一非 SuperAdmin 用户。
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      <div class="flex gap-2">
        <div class="relative flex-1">
          <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input v-model="q" class="pl-8" placeholder="按用户名 / 邮箱搜索" @keyup.enter="doSearch"/>
        </div>
        <Button variant="outline" @click="doSearch">搜索</Button>
      </div>

      <div v-if="loadError" class="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
        {{ loadError }}
      </div>
      <div v-if="message" :class="['text-sm font-medium', isError ? 'text-destructive' : 'text-primary']">
        {{ message }}
      </div>

      <div v-if="loading" class="space-y-3">
        <div v-for="i in 4" :key="i" class="h-12 animate-pulse rounded-lg bg-muted"/>
      </div>

      <div v-else-if="users.length === 0" class="py-10 text-center text-sm text-muted-foreground">
        未找到匹配的用户
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[560px] text-sm">
          <thead>
          <tr class="border-b text-left text-xs text-muted-foreground">
            <th class="py-2 pr-4">用户</th>
            <th class="py-2 pr-4">当前角色</th>
            <th class="py-2 pr-4">变更角色</th>
            <th class="py-2 text-right">操作</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="u in users" :key="u.id" class="border-b last:border-0">
            <td class="py-2 pr-4">
              <UserDisplay :username="u.username" :groups="u.groups" :role="u.role"/>
            </td>
            <td class="py-2 pr-4">
              <Badge variant="secondary">{{ ROLE_LABEL[u.role] }}</Badge>
            </td>
            <td class="py-2 pr-4">
              <Select :model-value="changeRole[u.id] ?? u.role" @update:model-value="onRoleChange(u.id, $event)">
                <SelectTrigger class="w-36">
                  <SelectValue/>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">玩家</SelectItem>
                  <SelectItem value="helper">协管</SelectItem>
                  <SelectItem value="moderator">版主</SelectItem>
                  <SelectItem value="admin">管理员</SelectItem>
                </SelectContent>
              </Select>
            </td>
            <td class="py-2 text-right whitespace-nowrap">
              <Button
                  size="sm"
                  :disabled="changingUser === u.id || (changeRole[u.id] ?? u.role) === u.role || ((!isSuperAdmin) && ((changeRole[u.id] ?? u.role) === 'admin' || u.role === 'admin'))"
                  @click="handleRoleChange(u.id, changeRole[u.id] ?? u.role)"
              >
                {{ changingUser === u.id ? '保存中...' : '保存' }}
              </Button>
              <Button
                  v-if="isSuperAdmin && u.role === 'admin'"
                  size="sm"
                  variant="outline"
                  class="ml-1"
                  :disabled="resettingId === u.id"
                  title="重置该后台账户密码（回到待设密）"
                  @click="handleResetPassword(u.id)"
              >
                <KeyRound class="mr-1 h-3.5 w-3.5"/>
                {{ resettingId === u.id ? '重置中...' : '重置密码' }}
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
</template>