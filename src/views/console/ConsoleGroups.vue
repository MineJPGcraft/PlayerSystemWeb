<script lang="ts" setup>
import {computed, onMounted, ref} from 'vue'
import {Layers, UserPlus, UserMinus} from 'lucide-vue-next'
import {Button} from '@/components/ui/button'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Badge} from '@/components/ui/badge'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select'
import {
  getIdentityGroups,
  consoleGroupCreate,
  consoleGroupDelete,
  consoleGroupPatch,
  consoleUserGroupAssign,
  consoleUserGroupRemove,
  type IdentityGroup,
} from '@/api'
import {extractErrorMessage} from '@/lib/apiError'
import {useConsoleAuth} from '@/composables/useConsoleAuth'

const {session} = useConsoleAuth()
const isSuperAdmin = computed(() => session.value?.consoleRole === 'super_admin')

const groups = ref<IdentityGroup[]>([])
const loading = ref(true)
const loadError = ref('')
const message = ref('')
const isError = ref(false)

// 新建 / 改名
const newName = ref('')
const newDisplay = ref('')
const renameName = ref('')
const renameDisplay = ref('')
const renameTarget = ref<IdentityGroup | null>(null)
const saving = ref(false)

// 分配 / 移除
const assignUserId = ref('')
const assignGroupId = ref('')
const assigning = ref(false)
const removingKey = ref('')

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    const res = await getIdentityGroups({page: 1, pageSize: 100})
    groups.value = res.groups
  } catch (e) {
    loadError.value = extractErrorMessage(e, '加载身份组失败。')
  } finally {
    loading.value = false
  }
}

async function handleCreate(): Promise<void> {
  message.value = ''
  isError.value = false
  if (!newName.value.trim()) {
    message.value = '请输入组名称。'
    isError.value = true
    return
  }
  saving.value = true
  try {
    await consoleGroupCreate(newName.value.trim(), newDisplay.value || undefined)
    newName.value = ''
    newDisplay.value = ''
    await load()
  } catch (e) {
    message.value = extractErrorMessage(e, '创建失败。')
    isError.value = true
  } finally {
    saving.value = false
  }
}

function openRename(group: IdentityGroup): void {
  renameTarget.value = group
  renameName.value = group.name
  renameDisplay.value = group.displayName ?? ''
}

async function handleRename(): Promise<void> {
  if (!renameTarget.value) return
  message.value = ''
  isError.value = false
  saving.value = true
  try {
    await consoleGroupPatch(renameTarget.value.id, {name: renameName.value, displayName: renameDisplay.value || null})
    renameTarget.value = null
    await load()
  } catch (e) {
    message.value = extractErrorMessage(e, '改名失败。')
    isError.value = true
  } finally {
    saving.value = false
  }
}

async function handleDelete(group: IdentityGroup): Promise<void> {
  if (!window.confirm(`确定删除身份组「${group.name}」吗？将解除其与所有用户的关联。`)) return
  message.value = ''
  isError.value = false
  try {
    await consoleGroupDelete(group.id)
    await load()
  } catch (e) {
    message.value = extractErrorMessage(e, '删除失败。')
    isError.value = true
  }
}

async function handleAssign(): Promise<void> {
  message.value = ''
  isError.value = false
  if (!assignUserId.value || !assignGroupId.value) {
    message.value = '请填写用户 ID 并选择身份组。'
    isError.value = true
    return
  }
  assigning.value = true
  try {
    await consoleUserGroupAssign(assignUserId.value, assignGroupId.value)
    assignUserId.value = ''
    assignGroupId.value = ''
    message.value = '身份组分配成功。'
  } catch (e) {
    message.value = extractErrorMessage(e, '分配失败。')
    isError.value = true
  } finally {
    assigning.value = false
  }
}

async function handleRemove(userId: string, groupId: string): Promise<void> {
  removingKey.value = `${userId}:${groupId}`
  try {
    await consoleUserGroupRemove(userId, groupId)
    message.value = '已移除该用户的身份组。'
  } catch (e) {
    message.value = extractErrorMessage(e, '移除失败。')
    isError.value = true
  } finally {
    removingKey.value = ''
  }
}

onMounted(() => void load())
</script>

<template>
  <div class="space-y-6">
    <!-- 新建 / 改名 / 删除（仅 super_admin） -->
    <Card v-if="isSuperAdmin">
      <CardHeader class="pb-3">
        <CardTitle class="flex items-center gap-2 text-base">
          <Layers class="h-4 w-4 text-primary"/>
          身份组维护
        </CardTitle>
        <CardDescription>创建、改名或删除身份组。组的权限节点由配置文件定义，变更后需热重载。</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid gap-3 md:grid-cols-3">
          <div class="grid gap-1.5">
            <Label for="group-name">组名称（唯一）</Label>
            <Input id="group-name" v-model="newName" placeholder="groupA"/>
          </div>
          <div class="grid gap-1.5">
            <Label for="group-display">展示名（可选）</Label>
            <Input id="group-display" v-model="newDisplay" placeholder="Group A"/>
          </div>
          <div class="flex items-end">
            <Button :disabled="saving" @click="handleCreate">创建身份组</Button>
          </div>
        </div>

        <div v-if="groups.length > 0" class="overflow-x-auto">
          <table class="w-full min-w-[520px] text-sm">
            <thead>
            <tr class="border-b text-left text-xs text-muted-foreground">
              <th class="py-2 pr-4">名称</th>
              <th class="py-2 pr-4">展示名</th>
              <th class="py-2 pr-4">ID</th>
              <th class="py-2 text-right">操作</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="group in groups" :key="group.id" class="border-b last:border-0">
              <td class="py-2 pr-4 font-medium">{{ group.name }}</td>
              <td class="py-2 pr-4">{{ group.displayName || '-' }}</td>
              <td class="py-2 pr-4 font-mono text-xs">{{ group.id }}</td>
              <td class="py-2 text-right whitespace-nowrap">
                <Button size="sm" variant="outline" @click="openRename(group)">改名</Button>
                <Button size="sm" variant="destructive" class="ml-1" @click="handleDelete(group)">删除</Button>
              </td>
            </tr>
            </tbody>
          </table>
        </div>

        <!-- 改名行 -->
        <div v-if="renameTarget" class="rounded-lg border p-3">
          <p class="mb-2 text-sm font-medium">改名：{{ renameTarget.name }}</p>
          <div class="grid gap-3 md:grid-cols-3">
            <Input v-model="renameName" placeholder="新名称"/>
            <Input v-model="renameDisplay" placeholder="新展示名"/>
            <div class="flex gap-2">
              <Button size="sm" :disabled="saving" @click="handleRename">保存</Button>
              <Button size="sm" variant="outline" @click="renameTarget = null">取消</Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- 分配 / 移除（仅 super_admin） -->
    <Card v-if="isSuperAdmin">
      <CardHeader class="pb-3">
        <CardTitle class="flex items-center gap-2 text-base">
          <UserPlus class="h-4 w-4 text-primary"/>
          分配身份组
        </CardTitle>
        <CardDescription>按用户 ID 分配 / 移除身份组。</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid gap-3 md:grid-cols-3">
          <div class="grid gap-1.5">
            <Label for="assign-user">用户 ID</Label>
            <Input id="assign-user" v-model="assignUserId" placeholder="be081dbc-..."/>
          </div>
          <div class="grid gap-1.5">
            <Label>身份组</Label>
            <Select v-model="assignGroupId">
              <SelectTrigger>
                <SelectValue placeholder="选择身份组"/>
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="group in groups" :key="group.id" :value="group.id">
                  {{ group.name }}（{{ group.displayName || '-' }}）
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="flex items-end">
            <Button :disabled="assigning" @click="handleAssign">
              {{ assigning ? '分配中...' : '分配' }}
            </Button>
          </div>
        </div>
        <p class="text-xs text-muted-foreground">
          移除身份组请使用「用户管理」页找到对应用户后操作（此处按用户 ID + 组 ID 移除）：
        </p>
        <div class="flex gap-2">
          <Input v-model="assignUserId" placeholder="用户 ID（移除用）" class="max-w-xs"/>
          <Select v-model="assignGroupId">
            <SelectTrigger class="max-w-xs">
              <SelectValue placeholder="选择要移除的身份组"/>
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="group in groups" :key="group.id" :value="group.id">
                {{ group.name }}
              </SelectItem>
            </SelectContent>
          </Select>
          <Button
              variant="outline"
              size="sm"
              :disabled="!assignUserId || !assignGroupId"
              @click="handleRemove(assignUserId, assignGroupId)"
          >
            <UserMinus class="mr-1 h-3.5 w-3.5"/>
            移除
          </Button>
        </div>
      </CardContent>
    </Card>

    <Card v-else>
      <CardContent class="py-8 text-center text-sm text-muted-foreground">
        身份组的新建 / 改名 / 删除与用户分配仅超级管理员（super_admin）可用。
      </CardContent>
    </Card>

    <div v-if="loadError" class="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
      {{ loadError }}
    </div>
    <div v-if="message" :class="['text-sm font-medium', isError ? 'text-destructive' : 'text-primary']">
      {{ message }}
    </div>
  </div>
</template>