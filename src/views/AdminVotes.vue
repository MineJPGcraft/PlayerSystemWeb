<script lang="ts" setup>
import {ref} from 'vue'
import {BarChart3, Trash2, Vote} from 'lucide-vue-next'
import AppPageHeader from '@/components/AppPageHeader.vue'
import {Button} from '@/components/ui/button'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {Badge} from '@/components/ui/badge'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select'
import {
  createManagementVote,
  deleteManagementVote,
  getVoteData,
  type VoteData,
  type VoteOptionType,
} from '@/api'
import {extractErrorMessage} from '@/lib/apiError'

// ============ 创建投票 ============
const title = ref('')
const description = ref('')
const optionType = ref<VoteOptionType>('single')
const maxSelections = ref(0)
const startAt = ref('')
const endAt = ref('')
const options = ref([{content: ''}, {content: ''}])
const creating = ref(false)
const createMessage = ref('')
const createError = ref(false)

// ============ 统计数据 ============
const dataVoteId = ref('')
const data = ref<VoteData | null>(null)
const loadingData = ref(false)
const dataMessage = ref('')
const dataError = ref(false)

// ============ 删除投票 ============
const deleteVoteId = ref('')
const deleting = ref(false)
const deleteMessage = ref('')
const deleteError = ref(false)

function addOption(): void {
  options.value.push({content: ''})
}

function removeOption(index: number): void {
  if (options.value.length > 2) {
    options.value.splice(index, 1)
  }
}

async function handleCreate(): Promise<void> {
  createMessage.value = ''
  createError.value = false
  if (!title.value.trim()) {
    createMessage.value = '请输入投票标题。'
    createError.value = true
    return
  }
  const payloadOptions = options.value.map(o => o.content.trim()).filter(Boolean)
  if (payloadOptions.length < 2) {
    createMessage.value = '至少需要填写 2 个选项。'
    createError.value = true
    return
  }
  if (!endAt.value) {
    createMessage.value = '请设置结束时间。'
    createError.value = true
    return
  }
  creating.value = true
  try {
    await createManagementVote({
      title: title.value.trim(),
      description: description.value || undefined,
      optionType: optionType.value,
      maxSelections: optionType.value === 'multiple' && maxSelections.value > 0 ? maxSelections.value : undefined,
      startAt: startAt.value ? new Date(startAt.value).toISOString() : undefined,
      endAt: new Date(endAt.value).toISOString(),
      options: payloadOptions.map(content => ({content}))
    })
    createMessage.value = '投票创建成功。'
    title.value = ''
    description.value = ''
    options.value = [{content: ''}, {content: ''}]
    maxSelections.value = 0
    startAt.value = ''
    endAt.value = ''
  } catch (e) {
    createMessage.value = extractErrorMessage(e, '创建投票失败。')
    createError.value = true
  } finally {
    creating.value = false
  }
}

async function handleLoadData(): Promise<void> {
  dataMessage.value = ''
  dataError.value = false
  data.value = null
  if (!dataVoteId.value) {
    dataMessage.value = '请输入投票 ID。'
    dataError.value = true
    return
  }
  loadingData.value = true
  try {
    data.value = await getVoteData(dataVoteId.value)
  } catch (e) {
    dataMessage.value = extractErrorMessage(e, '加载统计数据失败。')
    dataError.value = true
  } finally {
    loadingData.value = false
  }
}

async function handleDelete(): Promise<void> {
  deleteMessage.value = ''
  deleteError.value = false
  if (!deleteVoteId.value) {
    deleteMessage.value = '请输入投票 ID。'
    deleteError.value = true
    return
  }
  if (!window.confirm('确定删除该投票（含选项与投票记录）吗？此操作不可恢复。')) {
    return
  }
  deleting.value = true
  try {
    await deleteManagementVote(deleteVoteId.value)
    deleteMessage.value = '投票已删除。'
    deleteVoteId.value = ''
  } catch (e) {
    deleteMessage.value = extractErrorMessage(e, '删除失败。')
    deleteError.value = true
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="space-y-6 p-4 md:p-8 pt-6">
    <AppPageHeader title="投票管理" description="创建投票、查看统计数据与删除投票。"/>

    <Card>
      <CardHeader class="pb-3">
        <CardTitle class="flex items-center gap-2 text-base">
          <Vote class="h-4 w-4 text-primary"/>
          创建投票
        </CardTitle>
        <CardDescription>设置标题、选项与时间范围。未到开始时间的投票不会出现在用户侧。</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid gap-4 md:grid-cols-2">
          <div class="grid gap-1.5">
            <Label for="vote-title">标题</Label>
            <Input id="vote-title" v-model="title" placeholder="例如：你觉得新界面怎么样？"/>
          </div>
          <div class="grid gap-1.5">
            <Label for="vote-desc">描述（可选）</Label>
            <Input id="vote-desc" v-model="description" placeholder="补充说明"/>
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-3">
          <div class="grid gap-1.5">
            <Label>选项类型</Label>
            <Select v-model="optionType">
              <SelectTrigger>
                <SelectValue placeholder="选择类型"/>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">单选</SelectItem>
                <SelectItem value="multiple">多选</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div v-if="optionType === 'multiple'" class="grid gap-1.5">
            <Label for="max-selections">最多可选数（0 = 不限）</Label>
            <Input id="max-selections" v-model.number="maxSelections" type="number" min="0"/>
          </div>
          <div class="grid gap-1.5">
            <Label for="vote-start">开始时间（可空 = 立即）</Label>
            <Input id="vote-start" v-model="startAt" type="datetime-local"/>
          </div>
          <div class="grid gap-1.5">
            <Label for="vote-end">结束时间</Label>
            <Input id="vote-end" v-model="endAt" type="datetime-local" required/>
          </div>
        </div>

        <div class="space-y-2">
          <Label>选项（至少 2 项）</Label>
          <div v-for="(option, index) in options" :key="index" class="flex gap-2">
            <Input
                v-model="option.content"
                :placeholder="`选项 ${index + 1}`"
            />
            <Button size="icon-sm" variant="outline" :disabled="options.length <= 2" @click="removeOption(index)">
              ×
            </Button>
          </div>
          <Button size="sm" variant="outline" @click="addOption">+ 添加选项</Button>
        </div>

        <div v-if="createMessage" :class="['text-sm font-medium', createError ? 'text-destructive' : 'text-primary']">
          {{ createMessage }}
        </div>

        <Button :disabled="creating" @click="handleCreate">
          {{ creating ? '创建中...' : '创建投票' }}
        </Button>
      </CardContent>
    </Card>

    <div class="grid gap-6 lg:grid-cols-2">
      <!-- 统计数据 -->
      <Card>
        <CardHeader class="pb-3">
          <CardTitle class="flex items-center gap-2 text-base">
            <BarChart3 class="h-4 w-4 text-primary"/>
            统计数据
          </CardTitle>
          <CardDescription>输入投票 ID 查看各选项投票人数与投票人明细。</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex gap-2">
            <Input v-model="dataVoteId" placeholder="投票 ID"/>
            <Button variant="outline" :disabled="loadingData" @click="handleLoadData">
              {{ loadingData ? '加载中...' : '查询' }}
            </Button>
          </div>
          <div v-if="dataMessage" :class="['text-sm font-medium', dataError ? 'text-destructive' : 'text-primary']">
            {{ dataMessage }}
          </div>
          <div v-if="data" class="space-y-3">
            <div class="flex items-center justify-between text-sm">
              <p class="font-medium">{{ data.title }}</p>
              <span class="text-muted-foreground">共 {{ data.total }} 人参与</span>
            </div>
            <div v-for="option in data.options" :key="option.content" class="rounded-lg border p-3">
              <div class="flex items-center justify-between text-sm">
                <p class="font-medium">{{ option.content }}</p>
                <Badge class="text-xs">{{ option.count }} 票</Badge>
              </div>
              <div v-if="option.voters.length > 0" class="mt-2 flex flex-wrap gap-1.5">
                <span
                    v-for="voter in option.voters"
                    :key="voter.userId"
                    class="rounded bg-muted px-1.5 py-0.5 text-xs"
                >
                  {{ voter.username }}
                </span>
              </div>
              <p v-else class="mt-1 text-xs text-muted-foreground">暂无投票人</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- 删除投票 -->
      <Card>
        <CardHeader class="pb-3">
          <CardTitle class="flex items-center gap-2 text-base">
            <Trash2 class="h-4 w-4 text-destructive"/>
            删除投票
          </CardTitle>
          <CardDescription>删除投票将一并清除其选项与全部投票记录。</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex gap-2">
            <Input v-model="deleteVoteId" placeholder="投票 ID"/>
            <Button variant="destructive" :disabled="deleting" @click="handleDelete">
              {{ deleting ? '删除中...' : '删除' }}
            </Button>
          </div>
          <div v-if="deleteMessage" :class="['text-sm font-medium', deleteError ? 'text-destructive' : 'text-primary']">
            {{ deleteMessage }}
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>