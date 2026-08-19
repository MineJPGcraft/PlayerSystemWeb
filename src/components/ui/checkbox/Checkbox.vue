<script lang="ts" setup>
import type {HTMLAttributes} from 'vue';
import type {CheckboxRootEmits, CheckboxRootProps} from 'reka-ui';
import {CheckboxIndicator, CheckboxRoot, useForwardPropsEmits} from 'reka-ui';
import {cn} from '@/lib/utils';
import {Check} from 'lucide-vue-next';

const props = defineProps<CheckboxRootProps & {class?: HTMLAttributes['class']}>();
const emits = defineEmits<CheckboxRootEmits>();

const delegatedProps = Object.fromEntries(
    Object.entries(props).filter(([key]) => key !== 'class')
) as CheckboxRootProps;
const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <CheckboxRoot
      v-bind="forwarded"
      :class="cn(
        'peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
        props.class,
      )"
  >
    <CheckboxIndicator class="flex h-full w-full items-center justify-center text-current">
      <Check class="h-3.5 w-3.5"/>
    </CheckboxIndicator>
  </CheckboxRoot>
</template>