<script lang="ts" setup>
import {computed} from 'vue';
import {ChevronLeft, ChevronRight} from 'lucide-vue-next';
import {Button} from '@/components/ui/button';

const props = withDefaults(defineProps<{
  page: number
  pageSize: number
  total: number
  /** 最多展示的页码按钮数 */
  maxVisible?: number
}>(), {
  maxVisible: 5
});

const emit = defineEmits<{
  'update:page': [page: number]
}>();

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))

/** 可见页码列表（含省略号占位 null） */
const visiblePages = computed<(number | null)[]>(() => {
  const total = totalPages.value
  const current = props.page
  const visible = props.maxVisible
  if (total <= visible) {
    return Array.from({length: total}, (_, i) => i + 1)
  }
  const pages: (number | null)[] = []
  const half = Math.floor(visible / 2)
  let start = Math.max(1, current - half)
  let end = Math.min(total, start + visible - 1)
  start = Math.max(1, end - visible + 1)
  if (start > 1) {
    pages.push(1)
    if (start > 2) pages.push(null)
  }
  for (let i = start; i <= end; i += 1) {
    pages.push(i)
  }
  if (end < total) {
    if (end < total - 1) pages.push(null)
    pages.push(total)
  }
  return pages
})

function go(page: number): void {
  if (page < 1 || page > totalPages.value || page === props.page) return
  emit('update:page', page)
}
</script>

<template>
  <div v-if="totalPages > 1" class="flex items-center gap-1">
    <Button
        size="icon-sm"
        variant="outline"
        :disabled="page <= 1"
        aria-label="上一页"
        @click="go(page - 1)"
    >
      <ChevronLeft class="h-4 w-4"/>
    </Button>
    <template v-for="(p, idx) in visiblePages" :key="p ?? `e${idx}`">
      <Button
          v-if="p !== null"
          size="icon-sm"
          :variant="p === page ? 'default' : 'outline'"
          @click="go(p)"
      >
        {{ p }}
      </Button>
      <span v-else class="px-1 text-sm text-muted-foreground">…</span>
    </template>
    <Button
        size="icon-sm"
        variant="outline"
        :disabled="page >= totalPages"
        aria-label="下一页"
        @click="go(page + 1)"
    >
      <ChevronRight class="h-4 w-4"/>
    </Button>
    <span class="ml-2 text-xs text-muted-foreground">共 {{ total }} 条</span>
  </div>
</template>