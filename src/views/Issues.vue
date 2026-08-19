<script lang="ts" setup>
import {onMounted, ref, watch} from 'vue'
import {useRouter} from 'vue-router'
import {MessageSquarePlus, MessagesSquare, Plus, Search} from 'lucide-vue-next'
import AppPageHeader from '@/components/AppPageHeader.vue'
import AppPagination from '@/components/AppPagination.vue'
import {Button} from '@/components/ui/button'
import {Card, CardContent} from '@/components/ui/card'
import {Badge} from '@/components/ui/badge'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Textarea} from '@/components/ui/textarea'
import {RadioGroup, RadioGroupItem} from '@/components/ui/radio-group'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select'
import {Tabs, TabsList, TabsTrigger} from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {createIssue, getIssues, getMyIssues, type IssueItem, type IssueState} from '@/api'
import {extractErrorMessage} from '@/lib/apiError'
import {formatRelativeTime} from '@/lib/format'

const router = useRouter()

const mode = ref<'all' | 'mine'>('all')
const state = ref<IssueState>('open')
const q = ref('')
const sort = ref('created')
const items = ref<IssueItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 10
const loading = ref(true)
const loadError = ref('')

// 创建议题
const createOpen = ref(false)
const newTitle = ref('')
const newBody = ref('')
const newVisibility = ref<'public' | 'private'>('public')
const creating = ref(false)
const createMessage = ref('')
const createError = ref(false)

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    const params = {state: state.value, q: q.value || undefined, sort: sort.value as 'created', page: page.value, pageSize}
    const res = mode.value === 'all'
        ? await getIssues(params)
        : await getMyIssues(params)
    items.value = res.items
    total.value = res.total
  } catch (e) {
    loadError.value = extractErrorMessage(e, '加载议题失败。')
  } finally {
    loading.value = false
  }
}

function doSearch(): void {
  page.value = 1
  void load()
}

async function handleCreate(): Promise<void> {
  createMessage.value = ''
  createError.value = false
  if (!newTitle.value.trim()) {
    createMessage.value = '请输入议题标题。'
    createError.value = true
    return
  }
  creating.value = true
  try {
    const issue = await createIssue({
      title: newTitle.value.trim(),
      body: newBody.value,
      visibility: newVisibility.value
    })
    createOpen.value = false
    router.push(`/issues/${issue.id}`)
  } catch (e) {
    createMessage.value = extractErrorMessage(e, '创建议题失败。')
    createError.value = true
  } finally {
    creating.value = false
  }
}

function switchMode(next: 'all' | 'mine'): void {
  mode.value = next
  page.value = 1
  void load()
}

watch(() => state.value, () => {
  page.value = 1
  void load()
})

onMounted(() => void load())
</script>

<template>
  <div class="space-y-6 p-4 md:p-8 pt-6">
    <AppPageHeader title="议题" description="反馈问题、提出建议，与社区共同讨论。">
      <template #actions>
        <Button @click="createOpen = true">
          <Plus class="mr-1.5 h-4 w-4"/>
          创建议题
        </Button>
      </template>
    </AppPageHeader>

    <Card>
      <CardContent class="space-y-4 p-4">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Tabs :model-value="mode" class="w-full md:w-auto">
            <TabsList class="grid w-full grid-cols-2">
              <TabsTrigger value="all" @click="switchMode('all')">公开议题</TabsTrigger>
              <TabsTrigger value="mine" @click="switchMode('mine')">我的议题</TabsTrigger>
            </TabsList>
          </Tabs>
          <div class="flex flex-1 flex-col gap-2 sm:flex-row md:max-w-xl">
            <div class="relative flex-1">
              <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"/>
              <Input
                  v-model="q"
                  class="pl-8"
                  placeholder="搜索标题 / 正文"
                  @keyup.enter="doSearch"
              />
            </div>
            <Select v-model="state">
              <SelectTrigger class="w-full sm:w-32">
                <SelectValue placeholder="状态"/>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">开放中</SelectItem>
                <SelectItem value="closed">已关闭</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" @click="doSearch">搜索</Button>
          </div>
        </div>

        <div v-if="loadError" class="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {{ loadError }}
        </div>

        <div v-if="loading" class="space-y-3">
          <div v-for="i in 5" :key="i" class="h-14 animate-pulse rounded-lg bg-muted"/>
        </div>

        <div v-else-if="items.length === 0" class="flex flex-col items-center gap-3 py-12 text-center">
          <MessagesSquare class="h-10 w-10 text-muted-foreground/50"/>
          <p class="text-sm text-muted-foreground">暂无议题，快来创建第一个吧！</p>
        </div>

        <ul v-else class="divide-y">
          <li
              v-for="item in items"
              :key="item.id"
              class="cursor-pointer rounded-lg px-2 py-3 transition-colors hover:bg-accent/40"
              @click="router.push(`/issues/${item.id}`)"
          >
            <div class="flex items-center gap-2">
              <span class="text-sm">
                <span
                    :class="item.state === 'open'
                      ? 'inline-block h-2.5 w-2.5 rounded-full bg-emerald-500'
                      : 'inline-block h-2.5 w-2.5 rounded-full bg-muted-foreground'"
                />
              </span>
              <p class="truncate font-medium">{{ item.title }}</p>
              <Badge v-for="label in item.labels" :key="label.id" class="shrink-0" :style="{backgroundColor: label.color, color: '#fff'}">
                {{ label.name }}
              </Badge>
              <span class="ml-auto shrink-0 text-xs text-muted-foreground">
                <MessageSquarePlus class="mr-0.5 inline h-3.5 w-3.5"/>{{ item.commentCount }}
              </span>
            </div>
            <div class="mt-1 flex items-center gap-2 pl-4 text-xs text-muted-foreground">
              <span>#{{ item.id }}</span>
              <span>{{ item.creator.username }}</span>
              <span>{{ formatRelativeTime(item.createdAt) }}</span>
            </div>
          </li>
        </ul>

        <div class="flex justify-center">
          <AppPagination v-model:page="page" :page-size="pageSize" :total="total" @update:page="load"/>
        </div>
      </CardContent>
    </Card>

    <!-- 创建议题弹窗 -->
    <Dialog v-model:open="createOpen">
      <DialogContent class="max-w-lg">
        <DialogHeader>
          <DialogTitle>创建议题</DialogTitle>
          <DialogDescription>描述您遇到的 Bug、建议或讨论话题。</DialogDescription>
        </DialogHeader>
        <div class="space-y-4">
          <div class="grid gap-2">
            <Label for="issue-title">标题</Label>
            <Input id="issue-title" v-model="newTitle" placeholder="简洁地描述问题"/>
          </div>
          <div class="grid gap-2">
            <Label for="issue-body">正文</Label>
            <Textarea id="issue-body" v-model="newBody" placeholder="详细描述（可含复现步骤）" rows="5"/>
          </div>
          <div class="grid gap-2">
            <Label>可见性</Label>
            <RadioGroup v-model="newVisibility" class="flex gap-4">
              <label class="flex items-center gap-2 text-sm">
                <RadioGroupItem value="public"/>
                公开（所有登录用户可见）
              </label>
              <label class="flex items-center gap-2 text-sm">
                <RadioGroupItem value="private"/>
                私有（仅您与协管以上可见）
              </label>
            </RadioGroup>
          </div>
          <div v-if="createMessage" :class="['text-sm font-medium', createError ? 'text-destructive' : 'text-primary']">
            {{ createMessage }}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="createOpen = false">取消</Button>
          <Button :disabled="creating" @click="handleCreate">
            {{ creating ? '创建中...' : '创建' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>