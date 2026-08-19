<script lang="ts" setup>
import {computed, onMounted, ref} from 'vue'
import {Ban, Search, ShieldOff} from 'lucide-vue-next'
import AppPageHeader from '@/components/AppPageHeader.vue'
import AppPagination from '@/components/AppPagination.vue'
import UserDisplay from '@/components/UserDisplay.vue'
import {Button} from '@/components/ui/button'
import {Card, CardContent} from '@/components/ui/card'
import {Badge} from '@/components/ui/badge'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Textarea} from '@/components/ui/textarea'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  createBan,
  deleteBan,
  getManagementUser,
  getManagementUsers,
  getPrefixPresets,
  grantUserPrefix,
  revokeUserPrefix,
  type ManagementUser,
  type ManagementUserDetail,
  type PrefixPreset,
  type SystemRole,
} from '@/api'
import {extractErrorMessage} from '@/lib/apiError'
import {formatDateTime} from '@/lib/format'
import {ROLE_LABEL} from '@/lib/permissions'
import {useUserInfo} from '@/composables/useUserInfo'

const {user: me} = useUserInfo()

const users = ref<ManagementUser[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 10
const q = ref('')
const roleFilter = ref('')
const statusFilter = ref('')
const loading = ref(true)
const loadError = ref('')

// 用户详情
const detailOpen = ref(false)
const detail = ref<ManagementUserDetail | null>(null)
const detailLoading = ref(false)
const detailMessage = ref('')
const detailError = ref(false)

// 前缀授予
const presets = ref<PrefixPreset[]>([])
const grantPrefixId = ref('')
const granting = ref(false)
const grantMessage = ref('')
const grantError = ref(false)
const revokingId = ref('')

// 封禁
const banOpen = ref(false)
const banUntil = ref('')
const banReason = ref('')
const banning = ref(false)
const banMessage = ref('')
const banError = ref(false)

const currentUserPrefix = computed(() => detail.value?.prefixes ?? [])

/** 当前佩戴前缀（模板内箭头函数无法自动收窄，先计算） */
const currentWornPrefix = computed(() => {
  const d = detail.value
  if (!d) return null
  return d.prefixes.find(p => p.id === d.currentPrefixId) ?? null
})

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    const params: Record<string, string | number | undefined> = {
      page: page.value,
      pageSize,
      q: q.value || undefined,
      role: roleFilter.value || undefined,
      status: statusFilter.value || undefined
    }
    const res = await getManagementUsers(params as Parameters<typeof getManagementUsers>[0])
    users.value = res.users
    total.value = res.total
  } catch (e) {
    loadError.value = extractErrorMessage(e, '加载用户列表失败。')
  } finally {
    loading.value = false
  }
}

function doSearch(): void {
  page.value = 1
  void load()
}

async function openDetail(userId: string): Promise<void> {
  detailOpen.value = true
  detailLoading.value = true
  detail.value = null
  detailMessage.value = ''
  grantMessage.value = ''
  try {
    const [userDetail, pre] = await Promise.all([getManagementUser(userId), getPrefixPresets()])
    detail.value = userDetail
    presets.value = pre.prefixes
    grantPrefixId.value = ''
  } catch (e) {
    detailMessage.value = extractErrorMessage(e, '加载用户详情失败。')
    detailError.value = true
  } finally {
    detailLoading.value = false
  }
}

async function handleGrant(): Promise<void> {
  if (!detail.value || !grantPrefixId.value) return
  grantMessage.value = ''
  grantError.value = false
  granting.value = true
  try {
    await grantUserPrefix(detail.value.id, grantPrefixId.value)
    const updated = await getManagementUser(detail.value.id)
    detail.value = updated
    grantPrefixId.value = ''
    grantMessage.value = '前缀已授予。'
  } catch (e) {
    grantMessage.value = extractErrorMessage(e, '前缀授予失败。')
    grantError.value = true
  } finally {
    granting.value = false
  }
}

async function handleRevoke(prefixId: string): Promise<void> {
  if (!detail.value) return
  grantMessage.value = ''
  grantError.value = false
  revokingId.value = prefixId
  try {
    await revokeUserPrefix(detail.value.id, prefixId)
    const updated = await getManagementUser(detail.value.id)
    detail.value = updated
    grantMessage.value = '前缀已收回。'
  } catch (e) {
    grantMessage.value = extractErrorMessage(e, '前缀收回失败。')
    grantError.value = true
  } finally {
    revokingId.value = ''
  }
}

function openBan(user: ManagementUser): void {
  banUntil.value = ''
  banReason.value = ''
  banMessage.value = ''
  banError.value = false
  banOpen.value = true
  // 记住待封禁用户 ID
  currentBanUserId.value = user.id
}

const currentBanUserId = ref('')
const banTargetName = computed(() => {
  const u = users.value.find(x => x.id === currentBanUserId.value)
  return u?.username ?? currentBanUserId.value
})

async function handleCreateBan(): Promise<void> {
  banMessage.value = ''
  banError.value = false
  if (!currentBanUserId.value) {
    banMessage.value = '缺少目标用户。'
    banError.value = true
    return
  }
  banning.value = true
  try {
    await createBan({
      userId: currentBanUserId.value,
      bannedUntil: banUntil.value ? new Date(banUntil.value).toISOString() : null,
      reason: banReason.value || undefined
    })
    banMessage.value = '封禁已生效，该用户的会话与启动器凭据已被吊销。'
    banOpen.value = false
    void load()
  } catch (e) {
    banMessage.value = extractErrorMessage(e, '封禁失败。')
    banError.value = true
  } finally {
    banning.value = false
  }
}

async function handleUnban(user: ManagementUser): Promise<void> {
  try {
    await deleteBan(user.id, '解封')
    void load()
  } catch (e) {
    loadError.value = extractErrorMessage(e, '解封失败。')
  }
}

onMounted(() => void load())
</script>

<template>
  <div class="space-y-6 p-4 md:p-8 pt-6">
    <AppPageHeader title="用户管理" description="查询用户列表与详情，授予前缀、封禁与解封用户。"/>

    <Card>
      <CardContent class="space-y-4 p-4">
        <div class="flex flex-col gap-2 sm:flex-row">
          <div class="relative flex-1">
            <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"/>
            <Input
                v-model="q"
                class="pl-8"
                placeholder="邮箱精确匹配 或 用户名前缀匹配"
                @keyup.enter="doSearch"
            />
          </div>
          <Select v-model="roleFilter">
            <SelectTrigger class="w-full sm:w-32">
              <SelectValue placeholder="角色"/>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部角色</SelectItem>
              <SelectItem value="user">玩家</SelectItem>
              <SelectItem value="helper">协管</SelectItem>
              <SelectItem value="moderator">版主</SelectItem>
              <SelectItem value="admin">管理员</SelectItem>
            </SelectContent>
          </Select>
          <Select v-model="statusFilter">
            <SelectTrigger class="w-full sm:w-32">
              <SelectValue placeholder="状态"/>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部状态</SelectItem>
              <SelectItem value="active">正常</SelectItem>
              <SelectItem value="banned">已封禁</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" @click="doSearch">搜索</Button>
        </div>

        <div v-if="loadError" class="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {{ loadError }}
        </div>

        <div v-if="loading" class="space-y-3">
          <div v-for="i in 5" :key="i" class="h-12 animate-pulse rounded-lg bg-muted"/>
        </div>

        <div v-else-if="users.length === 0" class="py-12 text-center text-sm text-muted-foreground">
          未找到匹配的用户
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[640px] text-sm">
            <thead>
            <tr class="border-b text-left text-xs text-muted-foreground">
              <th class="py-2 pr-4">用户</th>
              <th class="py-2 pr-4">邮箱</th>
              <th class="py-2 pr-4">角色</th>
              <th class="py-2 pr-4">状态</th>
              <th class="py-2 pr-4">最后登录</th>
              <th class="py-2 text-right">操作</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="u in users" :key="u.id" class="border-b last:border-0">
              <td class="py-2 pr-4">
                <button class="text-left hover:text-primary hover:underline" @click="openDetail(u.id)">
                  <UserDisplay
                      :username="u.username"
                      :prefix="null"
                      :groups="u.groups"
                      :role="u.role"
                  />
                </button>
              </td>
              <td class="py-2 pr-4 text-muted-foreground">{{ u.email || '-' }}</td>
              <td class="py-2 pr-4">{{ ROLE_LABEL[u.role] }}</td>
              <td class="py-2 pr-4">
                <Badge :variant="u.status === 'banned' ? 'destructive' : 'success'">
                  {{ u.status === 'banned' ? '已封禁' : '正常' }}
                </Badge>
              </td>
              <td class="py-2 pr-4 text-muted-foreground">{{ formatDateTime(u.lastLoginAt) }}</td>
              <td class="py-2 text-right whitespace-nowrap">
                <Button size="sm" variant="outline" @click="openDetail(u.id)">详情</Button>
                <Button v-if="u.status === 'banned'" size="sm" variant="outline" class="ml-1" @click="handleUnban(u)">
                  <ShieldOff class="mr-1 h-3.5 w-3.5"/>
                  解封
                </Button>
                <Button v-else size="sm" variant="destructive" class="ml-1" @click="openBan(u)">
                  <Ban class="mr-1 h-3.5 w-3.5"/>
                  封禁
                </Button>
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

    <!-- 用户详情弹窗 -->
    <Dialog v-model:open="detailOpen">
      <DialogContent class="max-w-lg">
        <DialogHeader>
          <DialogTitle>用户详情</DialogTitle>
          <DialogDescription>查看用户信息、授予或收回前缀。</DialogDescription>
        </DialogHeader>

        <div v-if="detailLoading" class="py-8 text-center text-sm text-muted-foreground">加载中...</div>
        <div v-else-if="detail" class="space-y-4">
          <div class="rounded-lg border p-3">
            <UserDisplay
                :username="detail.username"
                :prefix="currentWornPrefix"
                :groups="detail.identityGroups.map(g => g.displayName ?? g.name)"
                :role="detail.role"
            />
            <dl class="mt-3 grid gap-1 text-sm">
              <div class="flex justify-between"><dt class="text-muted-foreground">邮箱</dt><dd>{{ detail.email || '-' }}</dd></div>
              <div class="flex justify-between"><dt class="text-muted-foreground">注册 IP</dt><dd>{{ detail.registerIp || '-' }}</dd></div>
              <div class="flex justify-between"><dt class="text-muted-foreground">最后登录 IP</dt><dd>{{ detail.lastLoginIp || '-' }}</dd></div>
              <div class="flex justify-between"><dt class="text-muted-foreground">注册时间</dt><dd>{{ formatDateTime(detail.createdAt) }}</dd></div>
              <div v-if="detail.oidcBindings.length > 0" class="flex justify-between">
                <dt class="text-muted-foreground">OIDC</dt>
                <dd>{{ detail.oidcBindings.map(b => b.providerId).join(', ') }}</dd>
              </div>
            </dl>
          </div>

          <!-- 已持有前缀 -->
          <div class="space-y-2">
            <Label>已持有前缀</Label>
            <div v-if="currentUserPrefix.length === 0" class="text-sm text-muted-foreground">未持有任何前缀</div>
            <div v-else class="flex flex-wrap gap-2">
              <Badge
                  v-for="prefix in currentUserPrefix"
                  :key="prefix.id"
                  :style="{backgroundColor: prefix.backgroundColor || '#000000', color: '#fff'}"
              >
                {{ prefix.value }}
                <button class="ml-1 font-bold hover:opacity-70" title="收回" @click="handleRevoke(prefix.id)">
                  {{ revokingId === prefix.id ? '…' : '×' }}
                </button>
              </Badge>
            </div>
          </div>

          <!-- 授予前缀 -->
          <div class="space-y-2 rounded-lg border p-3">
            <Label>授予前缀</Label>
            <div class="flex gap-2">
              <Select v-model="grantPrefixId">
                <SelectTrigger class="flex-1">
                  <SelectValue placeholder="选择前缀预设"/>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="p in presets" :key="p.id" :value="p.id">
                    {{ p.value }} {{ p.displayName ? `（${p.displayName}）` : '' }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" :disabled="granting || !grantPrefixId" @click="handleGrant">
                {{ granting ? '授予中...' : '授予' }}
              </Button>
            </div>
          </div>

          <div v-if="grantMessage" :class="['text-sm font-medium', grantError ? 'text-destructive' : 'text-primary']">
            {{ grantMessage }}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="detailOpen = false">关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 封禁弹窗 -->
    <Dialog v-model:open="banOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>封禁用户</DialogTitle>
          <DialogDescription>
            封禁 {{ banTargetName }}？封禁后其全部会话、游戏令牌与启动器凭据将立即失效。
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-4">
          <div class="grid gap-2">
            <Label for="ban-until">解封时间（留空为永久封禁）</Label>
            <Input id="ban-until" v-model="banUntil" type="datetime-local"/>
          </div>
          <div class="grid gap-2">
            <Label for="ban-reason">封禁原因（可选）</Label>
            <Textarea id="ban-reason" v-model="banReason" rows="2" placeholder="违反社区规则"/>
          </div>
          <div v-if="banMessage" :class="['text-sm font-medium', banError ? 'text-destructive' : 'text-primary']">
            {{ banMessage }}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="banOpen = false">取消</Button>
          <Button variant="destructive" :disabled="banning" @click="handleCreateBan">
            {{ banning ? '封禁中...' : '确认封禁' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>