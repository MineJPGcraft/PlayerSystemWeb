<script lang="ts" setup>
import type {HTMLAttributes} from 'vue';
import type {RadioGroupItemEmits, RadioGroupItemProps} from 'reka-ui';
import {RadioGroupIndicator, RadioGroupItem, useForwardPropsEmits} from 'reka-ui';
import {cn} from '@/lib/utils';
import {Circle} from 'lucide-vue-next';

const props = defineProps<RadioGroupItemProps & {class?: HTMLAttributes['class']}>();
const emits = defineEmits<RadioGroupItemEmits>();

const delegatedProps = Object.fromEntries(
    Object.entries(props).filter(([key]) => key !== 'class')
) as RadioGroupItemProps;
const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <RadioGroupItem
      v-bind="forwarded"
      :class="cn('aspect-square h-4 w-4 rounded-full border border-primary text-primary shadow focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50', props.class)"
  >
    <RadioGroupIndicator class="flex items-center justify-center">
      <Circle class="h-2.5 w-2.5 fill-current text-current"/>
    </RadioGroupIndicator>
  </RadioGroupItem>
</template>