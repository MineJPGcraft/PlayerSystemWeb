<script lang="ts" setup>
import type {HTMLAttributes} from 'vue';
import {cn} from '@/lib/utils';

const props = defineProps<{
  title: string
  description?: string
  class?: HTMLAttributes['class']
}>();
</script>

<template>
  <div :class="cn('flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between', props.class)">
    <div class="space-y-1">
      <h1 class="text-2xl font-bold tracking-tight md:text-3xl">{{ title }}</h1>
      <p v-if="description" class="text-sm text-muted-foreground">{{ description }}</p>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <slot name="actions"/>
    </div>
  </div>
</template>