<script lang="ts" setup>
import {onMounted, ref} from 'vue'
import {BarChart3, CheckCircle2, Clock, Vote as VoteIcon} from 'lucide-vue-next'
import AppPageHeader from '@/components/AppPageHeader.vue'
import AppPagination from '@/components/AppPagination.vue'
import {Button} from '@/components/ui/button'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {Badge} from '@/components/ui/badge'
import {Label} from '@/components/ui/label'
import {Checkbox} from '@/components/ui/checkbox'
import {RadioGroup, RadioGroupItem} from '@/components/ui/radio-group'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  getMyVoteAnswer,
  getVoteDetail,
  getVotes,
  submitVoteAnswer,
  type VoteDetail,
  type VoteItem,
} from '@/api'
import {extractErrorMessage} from '@/lib/apiError'
import {formatDateTime} from '@/lib/format'

const items = ref<VoteItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 10
const loading = ref(true)
const loadError = ref('')

// 投票弹窗状态
const detail = ref<VoteDetail | null>(null)
const dialogOpen = ref(false)
const selectedSingle = ref('')
const selectedMulti = ref<string[]>([])
const myAnswer = ref<string[]>([])
const submitting = ref(false)
const submitMessage = ref('')
const submitError = ref(false)

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    const res = await getVotes({page: page.value, pageSize})
    items.value = res.items
    total.value = res.total
  } catch (e) {
    loadError.value = extractErrorMessage(e, '加载投票失败。')
  } finally {
    loading.value = false
  }
}

async function openVote(vote: VoteItem): Promise<void> {
  submitMessage.value = ''
  submitError.value = false
  selectedSingle.value = ''
  selectedMulti.value = []
  myAnswer.value = []
  dialogOpen.value = true
  try {
    detail.value = await getVoteDetail(vote.id)
    const me = await getMyVoteAnswer(vote.id)
    if (me.answered && me.optionIds) {
      myAnswer.value = me.optionIds
      if (detail.value.optionType === 'single' && me.optionIds.length > 0) {
        selectedSingle.value = me.optionIds[0]
      } else {
        selectedMulti.value = [...me.optionIds]
      }
    }
  } catch (e) {
    submitMessage.value = extractErrorMessage(e, '加载投票详情失败。')
    submitError.value = true
  }
}

function toggleMultiOption(optionId: string): void {
  const max = detail.value?.maxSelections && detail.value.maxSelections > 0
      ? detail.value.maxSelections
      : null
  const idx = selectedMulti.value.indexOf(optionId)
  if (idx >= 0) {
    selectedMulti.value = selectedMulti.value.filter(id => id !== optionId)
  } else if (max && selectedMulti.value.length >= max) {
    submitMessage.value = `最多选择 ${max} 项。`
    submitError.value = true
    return
  } else {
    selectedMulti.value = [...selectedMulti.value, optionId]
  }
  submitMessage.value = ''
  submitError.value = false
}

async function handleSubmit(): Promise<void> {
  if (!detail.value) return
  submitMessage.value = ''
  submitError.value = false
  const optionIds = detail.value.optionType === 'single'
      ? selectedSingle.value ? [selectedSingle.value] : []
      : selectedMulti.value
  if (optionIds.length === 0) {
    submitMessage.value = '请至少选择一个选项。'
    submitError.value = true
    return
  }
  submitting.value = true
  try {
    if (detail.value.optionType === 'single') {
      await submitVoteAnswer(detail.value.id, optionIds[0])
    } else {
      await submitVoteAnswer(detail.value.id, undefined, optionIds)
    }
    myAnswer.value = optionIds
    submitMessage.value = '投票成功，感谢您的参与！'
    // 刷新列表标记已答
    const res = await getVotes({page: page.value, pageSize})
    items.value = res.items
  } catch (e) {
    submitMessage.value = extractErrorMessage(e, '投票失败，请重试。')
    submitError.value = true
  } finally {
    submitting.value = false
  }
}

onMounted(() => void load())
</script>

<template>
  <div class="space-y-6 p-4 md:p-8 pt-6">
    <AppPageHeader title="投票" description="参与社区投票，表达您的意见。投票结果不对外公开。"/>

    <div v-if="loadError" class="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
      {{ loadError }}
    </div>

    <div v-if="loading" class="grid gap-4 md:grid-cols-2">
      <div v-for="i in 4" :key="i" class="h-36 animate-pulse rounded-xl bg-muted"/>
    </div>

    <div v-else-if="items.length === 0" class="flex flex-col items-center gap-3 py-16 text-center">
      <VoteIcon class="h-10 w-10 text-muted-foreground/50"/>
      <p class="text-sm text-muted-foreground">当前没有进行中的投票</p>
    </div>

    <div v-else class="grid gap-4 md:grid-cols-2">
      <Card
          v-for="vote in items"
          :key="vote.id"
          class="cursor-pointer transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
          @click="openVote(vote)"
      >
        <CardHeader class="pb-2">
          <div class="flex items-center gap-2">
            <Badge :variant="vote.optionType === 'single' ? 'info' : 'warning'">
              {{ vote.optionType === 'single' ? '单选' : '多选' }}
            </Badge>
            <Badge v-if="vote.answered" variant="success">
              <CheckCircle2 class="mr-1 h-3 w-3"/>
              已参与
            </Badge>
          </div>
          <CardTitle class="text-base">{{ vote.title }}</CardTitle>
          <CardDescription v-if="vote.description">{{ vote.description }}</CardDescription>
        </CardHeader>
        <CardContent class="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock class="h-3.5 w-3.5"/>
          {{ formatDateTime(vote.startAt) }} — {{ formatDateTime(vote.endAt) }}
        </CardContent>
      </Card>
    </div>

    <div class="flex justify-center">
      <AppPagination v-model:page="page" :page-size="pageSize" :total="total" @update:page="load"/>
    </div>

    <!-- 投票弹窗 -->
    <Dialog v-model:open="dialogOpen">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>{{ detail?.title }}</DialogTitle>
          <DialogDescription v-if="detail?.description">{{ detail.description }}</DialogDescription>
        </DialogHeader>

        <div v-if="detail" class="space-y-3">
          <p class="text-xs text-muted-foreground">
            截止时间：{{ formatDateTime(detail.endAt) }}
            <template v-if="detail.optionType === 'multiple' && detail.maxSelections">
              ｜最多可选 {{ detail.maxSelections }} 项
            </template>
          </p>

          <RadioGroup v-if="detail.optionType === 'single'" v-model="selectedSingle" class="gap-2">
            <label
                v-for="option in detail.options"
                :key="option.id"
                class="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-accent/50 data-[selected=true]:border-primary"
                :data-selected="selectedSingle === option.id"
            >
              <RadioGroupItem :value="option.id" :id="option.id"/>
              <Label :for="option.id" class="cursor-pointer font-normal">{{ option.content }}</Label>
            </label>
          </RadioGroup>

          <div v-else class="grid gap-2">
            <label
                v-for="option in detail.options"
                :key="option.id"
                class="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-accent/50"
            >
              <Checkbox
                  :checked="selectedMulti.includes(option.id)"
                  @update:checked="toggleMultiOption(option.id)"
              />
              <span>{{ option.content }}</span>
            </label>
          </div>

          <div v-if="submitMessage" :class="['text-sm font-medium', submitError ? 'text-destructive' : 'text-primary']">
            {{ submitMessage }}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="dialogOpen = false">关闭</Button>
          <Button :disabled="submitting" @click="handleSubmit">
            {{ submitting ? '提交中...' : myAnswer.length > 0 ? '重新投票' : '投票' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>