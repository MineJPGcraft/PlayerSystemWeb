<script lang="ts" setup>
import type {HTMLAttributes} from 'vue';
import type {DialogDescriptionProps} from 'reka-ui';
import {DialogDescription} from 'reka-ui';
import {cn} from '@/lib/utils';

const props = defineProps<DialogDescriptionProps & {class?: HTMLAttributes['class']}>();
</script>

<template>
  <DialogDescription
      v-bind="props"
      :class="cn('text-sm text-muted-foreground', props.class)"
  >
    <slot/>
  </DialogDescription>
</template>