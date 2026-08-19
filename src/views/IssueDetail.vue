<script lang="ts" setup>
import {computed, onMounted, ref} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {ArrowLeft, Lock, MessageSquarePlus, Send} from 'lucide-vue-next'
import AppPageHeader from '@/components/AppPageHeader.vue'
import {Button} from '@/components/ui/button'
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card'
import {Badge} from '@/components/ui/badge'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Textarea} from '@/components/ui/textarea'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select'
import UserDisplay from '@/components/UserDisplay.vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  assignIssueLabels,
  consoleLabels,
  createIssueComment,
  getIssueComments,
  getIssueDetail,
  patchIssue,
  patchIssueState,
  type IssueClosedReason,
  type IssueComment,
  type IssueDetail as IssueDetailType,
  type IssueLabel,
} from '@/api'
import {useUserInfo} from '@/composables/useUserInfo'
import {extractErrorMessage} from '@/lib/apiError'
import {formatDateTime} from '@/lib/format'
import {hasRole} from '@/lib/permissions'

const route = useRoute()
const router = useRouter()
const {user} = useUserInfo()

const issueId = String(route.params.id)
const issue = ref<IssueDetailType | null>(null)
const comments = ref<IssueComment[]>([])
const loading = ref(true)
const loadError = ref('')
const notFound = ref(false)

// 评论
const commentContent = ref('')
const commenting = ref(false)
const commentMessage = ref('')
const commentError = ref(false)

// 编辑
const editOpen = ref(false)
const editTitle = ref('')
const editBody = ref('')
const editVisibility = ref<'public' | 'private'>('public')
const savingEdit = ref(false)
const editMessage = ref('')
const editError = ref(false)

// 标签管理（管理员）
const labelCatalog = ref<IssueLabel[]>([])
const selectedLabels = ref<string[]>([])
const savingLabels = ref(false)
const labelMessage = ref('')
const labelError = ref(false)

// 状态管理（版主以上）
const closeOpen = ref(false)
const closeReason = ref<IssueClosedReason>('completed')
const savingState = ref(false)
const stateMessage = ref('')
const stateError = ref(false)

const isCreator = computed(() => issue.value && user.value && issue.value.creator.id === user.value.userId)
const canManage = computed(() => hasRole(user.value?.role ?? null, 'moderator'))
const canAssignLabels = computed(() => user.value?.role === 'admin')

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  notFound.value = false
  try {
    issue.value = await getIssueDetail(issueId)
    editTitle.value = issue.value.title
    editBody.value = issue.value.body
    editVisibility.value = issue.value.visibility
    selectedLabels.value = issue.value.labels.map(l => l.id)
    const [commentRes, labelRes] = await Promise.all([
      getIssueComments(issueId),
      canAssignLabels.value ? consoleLabels() : Promise.resolve(null)
    ])
    comments.value = commentRes.items
    if (labelRes) {
      labelCatalog.value = labelRes.labels
    }
  } catch (e) {
    notFound.value = true
    loadError.value = extractErrorMessage(e, '议题不存在或不可见。')
  } finally {
    loading.value = false
  }
}

async function handleComment(): Promise<void> {
  commentMessage.value = ''
  commentError.value = false
  if (!commentContent.value.trim()) {
    commentMessage.value = '请输入评论内容。'
    commentError.value = true
    return
  }
  commenting.value = true
  try {
    const comment = await createIssueComment(issueId, commentContent.value.trim())
    comments.value = [...comments.value, comment]
    commentContent.value = ''
  } catch (e) {
    commentMessage.value = extractErrorMessage(e, '评论失败，请重试。')
    commentError.value = true
  } finally {
    commenting.value = false
  }
}

async function handleSaveEdit(): Promise<void> {
  editMessage.value = ''
  editError.value = false
  if (!editTitle.value.trim()) {
    editMessage.value = '标题不能为空。'
    editError.value = true
    return
  }
  savingEdit.value = true
  try {
    const updated = await patchIssue(issueId, {
      title: editTitle.value.trim(),
      body: editBody.value,
      visibility: editVisibility.value
    })
    issue.value = updated
    editOpen.value = false
  } catch (e) {
    editMessage.value = extractErrorMessage(e, '保存失败，请重试。')
    editError.value = true
  } finally {
    savingEdit.value = false
  }
}

async function handleSaveLabels(): Promise<void> {
  labelMessage.value = ''
  labelError.value = false
  savingLabels.value = true
  try {
    await assignIssueLabels(issueId, selectedLabels.value)
    const updated = await getIssueDetail(issueId)
    issue.value = updated
    labelMessage.value = '标签已更新。'
  } catch (e) {
    labelMessage.value = extractErrorMessage(e, '标签更新失败。')
    labelError.value = true
  } finally {
    savingLabels.value = false
  }
}

async function handleClose(): Promise<void> {
  stateMessage.value = ''
  stateError.value = false
  savingState.value = true
  try {
    await patchIssueState(issueId, {state: 'closed', closedReason: closeReason.value})
    const updated = await getIssueDetail(issueId)
    issue.value = updated
    closeOpen.value = false
  } catch (e) {
    stateMessage.value = extractErrorMessage(e, '操作失败。')
    stateError.value = true
  } finally {
    savingState.value = false
  }
}

async function handleReopen(): Promise<void> {
  stateMessage.value = ''
  stateError.value = false
  savingState.value = true
  try {
    await patchIssueState(issueId, {state: 'open'})
    const updated = await getIssueDetail(issueId)
    issue.value = updated
  } catch (e) {
    stateMessage.value = extractErrorMessage(e, '操作失败。')
    stateError.value = true
  } finally {
    savingState.value = false
  }
}

onMounted(() => void load())
</script>

<template>
  <div class="space-y-6 p-4 md:p-8 pt-6">
    <div class="flex items-center gap-2">
      <Button variant="ghost" size="sm" @click="router.push('/issues')">
        <ArrowLeft class="mr-1 h-4 w-4"/>
        返回议题列表
      </Button>
    </div>

    <div v-if="loading" class="space-y-4">
      <div class="h-10 animate-pulse rounded-lg bg-muted"/>
      <div class="h-40 animate-pulse rounded-xl bg-muted"/>
    </div>

    <div v-else-if="notFound || !issue" class="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-center text-sm text-destructive">
      {{ loadError || '议题不存在或不可见。' }}
    </div>

    <template v-else>
      <AppPageHeader :title="issue.title" :description="`#${issue.id}`">
        <template #actions>
          <div class="flex items-center gap-2">
            <Badge :variant="issue.state === 'open' ? 'success' : 'secondary'">
              {{ issue.state === 'open' ? '开放中' : '已关闭' }}
            </Badge>
            <Badge v-if="issue.visibility === 'private'" variant="outline">
              <Lock class="mr-1 h-3 w-3"/>
              私有
            </Badge>
            <Button v-if="isCreator" size="sm" variant="outline" @click="editOpen = true">编辑</Button>
            <Button
                v-if="canManage && issue.state === 'open'"
                size="sm"
                variant="destructive"
                @click="closeOpen = true"
            >
              关闭议题
            </Button>
            <Button v-if="canManage && issue.state === 'closed'" size="sm" variant="outline" @click="handleReopen">
              重新打开
            </Button>
          </div>
        </template>
      </AppPageHeader>

      <div v-if="stateMessage" :class="['text-sm font-medium', stateError ? 'text-destructive' : 'text-primary']">
        {{ stateMessage }}
      </div>

      <Card>
        <CardHeader class="pb-3">
          <div class="flex items-center justify-between gap-2">
            <UserDisplay :username="issue.creator.username"/>
            <span class="text-xs text-muted-foreground">创建于 {{ formatDateTime(issue.createdAt) }}</span>
          </div>
          <div class="flex flex-wrap items-center gap-2 pt-2">
            <Badge
                v-for="label in issue.labels"
                :key="label.id"
                :style="{backgroundColor: label.color, color: '#fff'}"
            >
              {{ label.name }}
            </Badge>
            <span v-if="issue.labels.length === 0" class="text-xs text-muted-foreground">暂无标签</span>
          </div>
        </CardHeader>
        <CardContent>
          <p class="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{{ issue.body || '（无正文）' }}</p>
        </CardContent>
      </Card>

      <!-- 标签管理（管理员） -->
      <Card v-if="canAssignLabels && labelCatalog.length > 0">
        <CardHeader class="pb-3">
          <CardTitle class="text-base">标签管理</CardTitle>
        </CardHeader>
        <CardContent class="space-y-3">
          <div class="flex flex-wrap gap-2">
            <Button
                v-for="label in labelCatalog"
                :key="label.id"
                size="sm"
                :variant="selectedLabels.includes(label.id) ? 'default' : 'outline'"
                :style="selectedLabels.includes(label.id) ? {backgroundColor: label.color, borderColor: label.color} : {}"
                @click="
                  selectedLabels.includes(label.id)
                    ? selectedLabels = selectedLabels.filter(id => id !== label.id)
                    : selectedLabels = [...selectedLabels, label.id]
                "
            >
              {{ label.name }}
            </Button>
          </div>
          <div v-if="labelMessage" :class="['text-sm font-medium', labelError ? 'text-destructive' : 'text-primary']">
            {{ labelMessage }}
          </div>
          <Button size="sm" :disabled="savingLabels" @click="handleSaveLabels">
            {{ savingLabels ? '保存中...' : '保存标签' }}
          </Button>
        </CardContent>
      </Card>

      <!-- 评论 -->
      <Card>
        <CardHeader class="pb-3">
          <CardTitle class="flex items-center gap-2 text-base">
            <MessageSquarePlus class="h-4 w-4 text-primary"/>
            评论（{{ comments.length }}）
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div v-if="comments.length === 0" class="py-6 text-center text-sm text-muted-foreground">暂无评论</div>
          <ul v-else class="space-y-4">
            <li v-for="comment in comments" :key="comment.id" class="rounded-lg border p-3">
              <div class="flex items-center justify-between gap-2">
                <UserDisplay :username="comment.user.username"/>
                <span class="text-xs text-muted-foreground">{{ formatDateTime(comment.createdAt) }}</span>
              </div>
              <p class="mt-2 whitespace-pre-wrap text-sm">{{ comment.content }}</p>
            </li>
          </ul>

          <!-- 发表评论 -->
          <div v-if="issue.state === 'open'" class="space-y-2 border-t pt-4">
            <Textarea v-model="commentContent" placeholder="写下您的评论..." rows="3"/>
            <div class="flex items-center justify-between gap-2">
              <div v-if="commentMessage" :class="['text-sm font-medium', commentError ? 'text-destructive' : 'text-primary']">
                {{ commentMessage }}
              </div>
              <Button class="ml-auto" :disabled="commenting" @click="handleComment">
                <Send class="mr-1.5 h-4 w-4"/>
                {{ commenting ? '发送中...' : '发表评论' }}
              </Button>
            </div>
          </div>
          <p v-else class="border-t pt-4 text-sm text-muted-foreground">议题已关闭，无法继续评论。</p>
        </CardContent>
      </Card>
    </template>

    <!-- 编辑弹窗 -->
    <Dialog v-model:open="editOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑议题</DialogTitle>
          <DialogDescription>仅创建者可编辑标题、正文与可见性。</DialogDescription>
        </DialogHeader>
        <div class="space-y-4">
          <div class="grid gap-2">
            <Label for="edit-title">标题</Label>
            <Input id="edit-title" v-model="editTitle"/>
          </div>
          <div class="grid gap-2">
            <Label for="edit-body">正文</Label>
            <Textarea id="edit-body" v-model="editBody" rows="5"/>
          </div>
          <div class="grid gap-2">
            <Label>可见性</Label>
            <Select v-model="editVisibility">
              <SelectTrigger class="w-full">
                <SelectValue placeholder="选择可见性"/>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">公开</SelectItem>
                <SelectItem value="private">私有</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div v-if="editMessage" :class="['text-sm font-medium', editError ? 'text-destructive' : 'text-primary']">
            {{ editMessage }}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="editOpen = false">取消</Button>
          <Button :disabled="savingEdit" @click="handleSaveEdit">
            {{ savingEdit ? '保存中...' : '保存' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 关闭议题弹窗 -->
    <Dialog v-model:open="closeOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>关闭议题</DialogTitle>
          <DialogDescription>请选择关闭原因。</DialogDescription>
        </DialogHeader>
        <div class="space-y-4">
          <Select v-model="closeReason">
            <SelectTrigger class="w-full">
              <SelectValue placeholder="选择关闭原因"/>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="completed">已完成</SelectItem>
              <SelectItem value="duplicated">重复议题</SelectItem>
              <SelectItem value="not_planned">不计划处理</SelectItem>
            </SelectContent>
          </Select>
          <div v-if="stateMessage" :class="['text-sm font-medium', stateError ? 'text-destructive' : 'text-primary']">
            {{ stateMessage }}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="closeOpen = false">取消</Button>
          <Button variant="destructive" :disabled="savingState" @click="handleClose">
            {{ savingState ? '处理中...' : '确认关闭' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>