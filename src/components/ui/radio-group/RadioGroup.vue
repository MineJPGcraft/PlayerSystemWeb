<script lang="ts" setup>
import type {HTMLAttributes} from 'vue';
import type {RadioGroupRootEmits, RadioGroupRootProps} from 'reka-ui';
import {RadioGroupRoot, useForwardPropsEmits} from 'reka-ui';
import {cn} from '@/lib/utils';

const props = defineProps<RadioGroupRootProps & {class?: HTMLAttributes['class']}>();
const emits = defineEmits<RadioGroupRootEmits>();

const delegatedProps = Object.fromEntries(
    Object.entries(props).filter(([key]) => key !== 'class')
) as RadioGroupRootProps;
const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <RadioGroupRoot
      v-bind="forwarded"
      :class="cn('grid gap-2', props.class)"
  >
    <slot/>
  </RadioGroupRoot>
</template>