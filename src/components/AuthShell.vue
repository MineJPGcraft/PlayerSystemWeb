<script lang="ts" setup>
import {getSiteConfig} from '@/lib/siteConfig'
import ThemeSwitcher from '@/components/ThemeSwitcher.vue'

/**
 * 认证页外壳：左侧品牌展示区（渐变背景 + 站点简介 + 特性列表），右侧表单卡片。
 * 移动端仅展示卡片，品牌区隐藏。
 */
defineProps<{
  /** 表单卡片标题 */
  title: string
  /** 表单卡片描述 */
  description?: string
  /** 是否显示站点 Logo */
  showLogo?: boolean
}>()

const config = getSiteConfig()
const siteName = config.brand.name
const tagline = config.brand.tagline
const features = [
  {label: 'Minecraft 外置登录', description: '兼容 Yggdrasil / authlib-injector 协议'},
  {label: '角色与皮肤', description: '3D 预览、皮肤与披风管理'},
  {label: '社区互动', description: '投票、议题与站内通知'},
  {label: '多端适配', description: '桌面与移动端流畅体验'},
]
</script>

<template>
  <div class="relative flex min-h-screen bg-background">
    <!-- 品牌展示区（大屏可见） -->
    <aside class="relative hidden w-1/2 overflow-hidden lg:flex lg:flex-col lg:justify-between p-10 xl:p-14">
      <div
          class="absolute inset-0 bg-gradient-to-br from-primary via-primary/80 to-fuchsia-500/70"
      />
      <div
          class="absolute inset-0 opacity-20"
          style="background-image: radial-gradient(circle at 20% 20%, rgba(255,255,255,.9) 1px, transparent 1px), radial-gradient(circle at 80% 60%, rgba(255,255,255,.7) 1px, transparent 1px); background-size: 48px 48px;"
      />
      <div class="relative flex items-center gap-2 text-primary-foreground">
        <svg class="size-8" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
          <rect fill="none" height="256" width="256"/>
          <line fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" x1="208" x2="128"
                y1="128" y2="208"/>
          <line fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" x1="192" x2="40"
                y1="40" y2="192"/>
        </svg>
        <span class="text-xl font-bold">{{ siteName }}</span>
      </div>

      <div class="relative space-y-6 text-primary-foreground">
        <p v-if="tagline" class="text-sm font-medium uppercase tracking-widest opacity-80">{{ tagline }}</p>
        <h1 class="text-3xl font-bold leading-tight xl:text-4xl">
          {{ config.home.hero.title }}
          <span v-if="config.home.hero.titleHighlight" class="underline decoration-fuchsia-300 decoration-4 underline-offset-8">
            {{ config.home.hero.titleHighlight }}
          </span>
        </h1>
        <p class="max-w-md text-sm leading-relaxed opacity-90">{{ config.home.hero.description }}</p>

        <ul class="grid max-w-md gap-3 text-sm">
          <li
              v-for="feature in features"
              :key="feature.label"
              class="flex items-start gap-2 rounded-lg bg-primary-foreground/10 px-3 py-2 backdrop-blur-sm"
          >
            <span class="mt-0.5 font-bold">✓</span>
            <span>
              <b>{{ feature.label }}</b>
              <span class="opacity-80"> — {{ feature.description }}</span>
            </span>
          </li>
        </ul>
      </div>

      <p class="relative text-xs text-primary-foreground/70">© {{ new Date().getFullYear() }} {{ siteName }}</p>
    </aside>

    <!-- 表单区 -->
    <main class="relative flex flex-1 items-center justify-center p-6 md:p-10">
      <div class="absolute right-4 top-4">
        <ThemeSwitcher/>
      </div>
      <div class="w-full max-w-md">
        <div class="mb-6 flex items-center gap-2 lg:hidden">
          <svg class="size-7 text-primary" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
            <rect fill="none" height="256" width="256"/>
            <line fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" x1="208" x2="128"
                  y1="128" y2="208"/>
            <line fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" x1="192" x2="40"
                  y1="40" y2="192"/>
          </svg>
          <span class="text-lg font-bold">{{ siteName }}</span>
        </div>
        <slot/>
      </div>
    </main>
  </div>
</template>