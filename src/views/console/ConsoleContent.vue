<script lang="ts" setup>
import {computed, onMounted, ref} from 'vue'
import {Hash, Plus, Tags, Trash2} from 'lucide-vue-next'
import {Button} from '@/components/ui/button'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Badge} from '@/components/ui/badge'
import {
  consoleLabelCreate,
  consoleLabelDelete,
  consoleLabels,
  consolePrefixCreate,
  consolePrefixDelete,
  consolePrefixes,
  type ConsoleLabel,
  type ConsolePrefix,
} from '@/api'
import {useConsoleAuth} from '@/composables/useConsoleAuth'
import {extractErrorMessage} from '@/lib/apiError'

const {session} = useConsoleAuth()
const isSuperAdmin = computed(() => session.value?.consoleRole === 'super_admin')

// ============ 标签（系统角色 Admin 即可） ============
const labels = ref<ConsoleLabel[]>([])
const newLabelName = ref('')
const newLabelColor = ref('#dd3a0a')
const labelMessage = ref('')
const labelError = ref(false)
const savingLabel = ref(false)
const deletingLabelId = ref('')

// ============ 前缀（仅 super_admin） ============
const prefixes = ref<ConsolePrefix[]>([])
const newPrefixValue = ref('')
const newPrefixName = ref('')
const newPrefixColor = ref('#000000')
const prefixMessage = ref('')
const prefixError = ref(false)
const savingPrefix = ref(false)
const deletingPrefixId = ref('')

async function loadLabels(): Promise<void> {
  try {
    const res = await consoleLabels()
    labels.value = res.labels
  } catch {
    /* 忽略 */
  }
}

async function loadPrefixes(): Promise<void> {
  if (!isSuperAdmin.value) return
  try {
    const res = await consolePrefixes()
    prefixes.value = res.prefixes
  } catch {
    /* 忽略 */
  }
}

async function handleCreateLabel(): Promise<void> {
  labelMessage.value = ''
  labelError.value = false
  if (!newLabelName.value.trim()) {
    labelMessage.value = '请输入标签名称。'
    labelError.value = true
    return
  }
  savingLabel.value = true
  try {
    await consoleLabelCreate(newLabelName.value.trim(), newLabelColor.value)
    newLabelName.value = ''
    await loadLabels()
  } catch (e) {
    labelMessage.value = extractErrorMessage(e, '创建失败。')
    labelError.value = true
  } finally {
    savingLabel.value = false
  }
}

async function handleDeleteLabel(id: string): Promise<void> {
  if (!window.confirm('确定删除该标签吗？将解除其与所有议题的关联。')) return
  deletingLabelId.value = id
  try {
    await consoleLabelDelete(id)
    await loadLabels()
  } catch (e) {
    labelMessage.value = extractErrorMessage(e, '删除失败。')
    labelError.value = true
  } finally {
    deletingLabelId.value = ''
  }
}

async function handleCreatePrefix(): Promise<void> {
  prefixMessage.value = ''
  prefixError.value = false
  if (!newPrefixValue.value.trim()) {
    prefixMessage.value = '请输入前缀值。'
    prefixError.value = true
    return
  }
  savingPrefix.value = true
  try {
    await consolePrefixCreate(newPrefixValue.value.trim(), newPrefixName.value || undefined, newPrefixColor.value || undefined)
    newPrefixValue.value = ''
    newPrefixName.value = ''
    await loadPrefixes()
  } catch (e) {
    prefixMessage.value = extractErrorMessage(e, '创建失败。')
    prefixError.value = true
  } finally {
    savingPrefix.value = false
  }
}

async function handleDeletePrefix(id: string): Promise<void> {
  if (!window.confirm('确定删除该前缀预设吗？持有者的佩戴状态将同步置空。')) return
  deletingPrefixId.value = id
  try {
    await consolePrefixDelete(id)
    await loadPrefixes()
  } catch (e) {
    prefixMessage.value = extractErrorMessage(e, '删除失败。')
    prefixError.value = true
  } finally {
    deletingPrefixId.value = ''
  }
}

onMounted(() => {
  void loadLabels()
  void loadPrefixes()
})
</script>

<template>
  <div class="grid gap-6 lg:grid-cols-2">
    <!-- 标签 -->
    <Card>
      <CardHeader class="pb-3">
        <CardTitle class="flex items-center gap-2 text-base">
          <Tags class="h-4 w-4 text-primary"/>
          Issue 标签
        </CardTitle>
        <CardDescription>创建 / 删除议题标签。给议题打标签由协管在议题详情完成。</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <div class="grid gap-1.5">
            <Label for="label-name">标签名称</Label>
            <Input id="label-name" v-model="newLabelName" placeholder="bug"/>
          </div>
          <div class="grid gap-1.5">
            <Label for="label-color">颜色</Label>
            <Input id="label-color" v-model="newLabelColor" type="color" class="h-9 w-14 p-1"/>
          </div>
          <div class="flex items-end">
            <Button :disabled="savingLabel" @click="handleCreateLabel">
              <Plus class="mr-1 h-4 w-4"/>
              {{ savingLabel ? '创建中...' : '创建' }}
            </Button>
          </div>
        </div>
        <div v-if="labelMessage" :class="['text-sm font-medium', labelError ? 'text-destructive' : 'text-primary']">
          {{ labelMessage }}
        </div>
        <div class="flex flex-wrap gap-2">
          <span
              v-for="label in labels"
              :key="label.id"
              class="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-white"
              :style="{backgroundColor: label.color}"
          >
            <Hash class="h-3 w-3"/>
            {{ label.name }}
            <button
                class="ml-0.5 font-bold hover:opacity-70 disabled:opacity-40"
                :disabled="deletingLabelId === label.id"
                @click="handleDeleteLabel(label.id)"
            >
              ×
            </button>
          </span>
          <p v-if="labels.length === 0" class="text-sm text-muted-foreground">暂无标签</p>
        </div>
      </CardContent>
    </Card>

    <!-- 前缀（仅 super_admin） -->
    <Card v-if="isSuperAdmin">
      <CardHeader class="pb-3">
        <CardTitle class="flex items-center gap-2 text-base">
          <Tags class="h-4 w-4 text-primary"/>
          前缀预设
        </CardTitle>
        <CardDescription>维护前缀预设清单；授予 / 收回用户前缀请到「用户管理」。</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid gap-3">
          <div class="grid gap-1.5">
            <Label for="prefix-value">前缀值（唯一）</Label>
            <Input id="prefix-value" v-model="newPrefixValue" placeholder="[VIP]"/>
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="grid gap-1.5">
              <Label for="prefix-name">展示名（可选）</Label>
              <Input id="prefix-name" v-model="newPrefixName" placeholder="VIP 用户"/>
            </div>
            <div class="grid gap-1.5">
              <Label for="prefix-color">背景色（可选）</Label>
              <Input id="prefix-color" v-model="newPrefixColor" type="color" class="h-9 w-14 p-1"/>
            </div>
          </div>
        </div>
        <div v-if="prefixMessage" :class="['text-sm font-medium', prefixError ? 'text-destructive' : 'text-primary']">
          {{ prefixMessage }}
        </div>
        <Button :disabled="savingPrefix" @click="handleCreatePrefix">
          <Plus class="mr-1 h-4 w-4"/>
          {{ savingPrefix ? '创建中...' : '创建前缀' }}
        </Button>
        <div class="flex flex-wrap gap-2">
          <span
              v-for="prefix in prefixes"
              :key="prefix.id"
              class="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-white"
              :style="{backgroundColor: prefix.backgroundColor || '#000000'}"
          >
            {{ prefix.value }}
            <span v-if="prefix.displayName" class="opacity-80">（{{ prefix.displayName }}）</span>
            <button
                class="ml-0.5 font-bold hover:opacity-70 disabled:opacity-40"
                :disabled="deletingPrefixId === prefix.id"
                @click="handleDeletePrefix(prefix.id)"
            >
              ×
            </button>
          </span>
          <p v-if="prefixes.length === 0" class="text-sm text-muted-foreground">暂无前缀预设</p>
        </div>
      </CardContent>
    </Card>
  </div>
</template>