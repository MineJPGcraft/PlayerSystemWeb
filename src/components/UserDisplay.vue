<script lang="ts" setup>
import {computed} from 'vue';
import type {PrefixPreset, SystemRole} from '@/api';
import {ROLE_LABEL, ROLE_LEVEL, type RoleLevel} from '@/lib/permissions';

/**
 * 用户展示名渲染：`[前缀]username[身份组][系统角色]`
 * 前缀使用其背景色渲染徽章；身份组用次要徽章；系统角色按层级着色。
 * 对外展示一律用 username（display_name 已不再使用）。
 */
const props = defineProps<{
  username: string
  /** 当前佩戴的前缀（可为 null） */
  prefix?: PrefixPreset | null
  /** 所属身份组展示名列表（可为空） */
  groups?: string[]
  /** 系统角色（可为空，不展示） */
  role?: SystemRole | null
  /** 是否展示系统角色徽章，默认 true */
  showRole?: boolean
}>();

const roleLabel = computed(() => (props.role ? ROLE_LABEL[props.role] : ''))
const roleTone = computed(() => {
  if (!props.role) return ''
  const level = ROLE_LEVEL[props.role] as RoleLevel
  if (level >= 3) return 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30'
  if (level >= 2) return 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30'
  if (level >= 1) return 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30'
  return ''
})

const prefixStyle = computed(() => {
  if (!props.prefix) return null
  const color = props.prefix.backgroundColor || '#000000'
  // 依据背景色亮度决定文字颜色
  let textColor = '#ffffff'
  try {
    const hex = color.replace('#', '')
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16)
      const g = parseInt(hex.slice(2, 4), 16)
      const b = parseInt(hex.slice(4, 6), 16)
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b
      if (luminance > 150) textColor = '#111827'
    }
  } catch {
    /* 颜色解析失败时使用默认白字 */
  }
  return {backgroundColor: color, color: textColor}
})
</script>

<template>
  <span class="inline-flex items-center gap-1.5">
    <span
        v-if="prefixStyle && prefix"
        class="rounded px-1.5 py-0.5 text-xs font-bold leading-none"
        :style="prefixStyle"
    >
      {{ prefix.value }}
    </span>
    <span class="font-medium">{{ username }}</span>
    <span
        v-for="group in groups || []"
        :key="group"
        class="rounded border border-border bg-muted px-1.5 py-0.5 text-xs leading-none text-muted-foreground"
    >
      {{ group }}
    </span>
    <span
        v-if="role && showRole !== false"
        class="rounded border px-1.5 py-0.5 text-xs leading-none"
        :class="roleTone"
    >
      {{ roleLabel }}
    </span>
  </span>
</template>