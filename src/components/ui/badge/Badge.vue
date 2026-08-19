<script lang="ts" setup>
import type {HTMLAttributes} from "vue";
import {cn} from "@/lib/utils";
import {badgeVariants} from ".";

const props = defineProps<{
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"
  class?: HTMLAttributes["class"]
}>();
</script>

<template>
  <span :class="cn(badgeVariants({ variant }), props.class)">
    <slot />
  </span>
</template>