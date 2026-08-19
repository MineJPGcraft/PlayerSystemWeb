<script lang="ts" setup>
import {computed} from 'vue'
import {useRoute} from 'vue-router'
import AppSidebar from '@/components/AppSidebar.vue';
import Footer from '@/components/Footer.vue';
import NotificationsBell from '@/components/NotificationsBell.vue';
import ThemeSwitcher from '@/components/ThemeSwitcher.vue';
import {SidebarInset, SidebarProvider, SidebarTrigger} from '@/components/ui/sidebar'
import {Separator} from '@/components/ui/separator'
import {isAuthenticated} from '@/composables/useUserInfo'

const route = useRoute()
// 仅登录后的应用页面显示侧边栏；Home 等公开页面不显示
const showSidebar = computed(() => route.meta.sidebar === true)
</script>

<template>
  <!-- 登录后的应用页面：侧边栏布局 -->
  <SidebarProvider v-if="showSidebar">
    <AppSidebar/>
    <SidebarInset>
      <!-- 顶部栏：侧边栏开关 + 页面标题 + 通知铃铛 + 主题切换 -->
      <header
          class="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <SidebarTrigger class="-ml-1"/>
        <Separator class="mr-2 h-4" orientation="vertical"/>
        <h1 class="truncate text-sm font-semibold">{{ route.meta.title }}</h1>
        <div class="ml-auto flex items-center gap-1.5">
          <NotificationsBell v-if="isAuthenticated"/>
          <ThemeSwitcher/>
        </div>
      </header>
      <div class="flex flex-1 flex-col">
        <main class="flex-1">
          <router-view/>
        </main>
        <Footer/>
      </div>
    </SidebarInset>
  </SidebarProvider>

  <!-- 公开页面（如 Home）：顶部导航 + 内容 + 页脚 -->
  <div v-else class="flex min-h-screen flex-col bg-background">
    <header
        class="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <span class="text-base font-semibold tracking-tight">{{ route.meta.title || '' }}</span>
      <div class="ml-auto flex items-center gap-1.5">
        <ThemeSwitcher/>
      </div>
    </header>
    <main class="flex-1">
      <router-view/>
    </main>
    <Footer/>
  </div>
</template>