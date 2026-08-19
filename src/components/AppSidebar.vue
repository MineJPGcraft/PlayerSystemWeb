<script lang="ts" setup>
import type {Component} from 'vue'
import {computed, onMounted, onUnmounted, ref} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {
  Ban,
  Bell,
  Gamepad2,
  Home,
  LayoutDashboard,
  Layers,
  LogIn,
  LogOut,
  MessagesSquare,
  MonitorSmartphone,
  ScrollText,
  Settings2,
  ShieldCheck,
  UserPlus,
  Users,
  Vote,
} from 'lucide-vue-next'
import {userLogout} from '@/api'
import {getSiteConfig} from '@/lib/siteConfig'
import {hasRole} from '@/lib/permissions'
import {useUserInfo} from '@/composables/useUserInfo'
import {getUserNotifications} from '@/api'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import {Avatar, AvatarFallback} from '@/components/ui/avatar'
import {Button} from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import ThemeSwitcher from '@/components/ThemeSwitcher.vue'

const route = useRoute()
const router = useRouter()
// 品牌名来自站点配置（public/config.json）
const siteName = getSiteConfig().brand.name

const {user, isAuthenticated, clear: clearUser} = useUserInfo()
const unread = ref(0)

interface SidebarLink {
  name: string
  path: string
  icon: Component
  /** 需要的最低系统角色；不设置则仅需登录 */
  minRole?: 'moderator' | 'admin'
  badge?: 'unread'
}

interface SidebarGroupDef {
  label: string
  links: SidebarLink[]
}

/** 侧边栏导航分组：登录后可见；管理组按角色展示 */
const navGroups = computed<SidebarGroupDef[]>(() => {
  const groups: SidebarGroupDef[] = [
    {
      label: '总览',
      links: [{name: '仪表盘', path: '/dashboard', icon: LayoutDashboard}]
    },
    {
      label: '角色与皮肤',
      links: [
        {name: '角色管理', path: '/role-management', icon: Gamepad2},
        {name: '启动器会话', path: '/launcher-sessions', icon: MonitorSmartphone}
      ]
    },
    {
      label: '社区',
      links: [
        {name: '投票', path: '/votes', icon: Vote},
        {name: '议题', path: '/issues', icon: MessagesSquare},
        {name: '通知', path: '/notifications', icon: Bell, badge: 'unread'}
      ]
    },
    {
      label: '管理',
      links: [
        {name: '用户管理', path: '/management/users', icon: Users, minRole: 'moderator'},
        {name: '封禁管理', path: '/management/bans', icon: Ban, minRole: 'moderator'},
        {name: '投票管理', path: '/management/votes', icon: Vote, minRole: 'moderator'},
        {name: '审计日志', path: '/management/audit-logs', icon: ScrollText, minRole: 'moderator'},
        {name: '身份组', path: '/management/identity-groups', icon: Layers, minRole: 'moderator'},
        {name: 'Yggdrasil 资源', path: '/management/yggdrasil', icon: ShieldCheck, minRole: 'moderator'}
      ]
    },
    {
      label: '后台',
      links: [
        {name: '管理后台', path: '/console', icon: Settings2, minRole: 'admin'}
      ]
    },
    {
      label: '账户',
      links: [{name: '个人信息', path: '/profile', icon: Users}]
    }
  ]
  const role = user.value?.role ?? null
  return groups
      .map(group => ({
        ...group,
        links: group.links.filter(link => !link.minRole || hasRole(role, link.minRole))
      }))
      .filter(group => group.links.length > 0)
})

// 未登录时展示的公开链接
const publicLinks: SidebarLink[] = [
  {name: '首页', path: '/', icon: Home},
  {name: '登录', path: '/login', icon: LogIn},
  {name: '注册', path: '/register', icon: UserPlus},
]

const isActive = (path: string) => route.path === path

// 头像占位字符：username 首字符
const avatarText = computed(() => user.value?.username?.trim().charAt(0).toUpperCase() || '用')
const displayName = computed(() => {
  const u = user.value
  if (!u) return ''
  const prefix = u.prefixes.find(p => p.id === u.prefixId)?.value ?? ''
  return `${prefix}${u.username}`
})

const showLogoutDialog = ref(false)
const confirmLogout = async () => {
  try {
    await userLogout()
  } catch (e) {
    console.error('登出失败:', e)
  } finally {
    clearUser()
    showLogoutDialog.value = false
    router.push('/login')
  }
}

async function loadUnread(): Promise<void> {
  if (!isAuthenticated.value) return
  try {
    const res = await getUserNotifications(1, 1)
    unread.value = res.unread ?? 0
  } catch {
    /* 忽略 */
  }
}

onMounted(() => {
  void loadUnread()
  window.addEventListener('storage', () => void loadUnread())
})

onUnmounted(() => {
  window.removeEventListener('storage', () => void loadUnread())
})
</script>

<template>
  <Sidebar collapsible="icon">
    <SidebarHeader>
      <!-- 品牌 Logo + 站点名 -->
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton as-child size="lg">
            <router-link class="gap-2" to="/">
              <svg class="size-6 text-primary" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
                <rect fill="none" height="256" width="256"/>
                <line fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" x1="208" x2="128"
                      y1="128" y2="208"/>
                <line fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" x1="192" x2="40"
                      y1="40" y2="192"/>
              </svg>
              <span class="truncate font-semibold">{{ siteName }}</span>
            </router-link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>

    <SidebarContent>
      <!-- 已登录：分组导航 -->
      <template v-if="isAuthenticated">
        <SidebarGroup v-for="group in navGroups" :key="group.label">
          <SidebarGroupLabel>{{ group.label }}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem v-for="link in group.links" :key="link.path">
                <SidebarMenuButton :is-active="isActive(link.path)" :tooltip="link.name" as-child>
                  <router-link :to="link.path" class="gap-2">
                    <component :is="link.icon"/>
                    <span>{{ link.name }}</span>
                  </router-link>
                </SidebarMenuButton>
                <SidebarMenuBadge v-if="link.badge === 'unread' && unread > 0" class="data-[active=true]:bg-primary/20">
                  {{ unread > 99 ? '99+' : unread }}
                </SidebarMenuBadge>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </template>

      <!-- 未登录：公开链接 -->
      <SidebarGroup v-else>
        <SidebarGroupLabel>导航</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem v-for="link in publicLinks" :key="link.path">
              <SidebarMenuButton :is-active="isActive(link.path)" :tooltip="link.name" as-child>
                <router-link :to="link.path" class="gap-2">
                  <component :is="link.icon"/>
                  <span>{{ link.name }}</span>
                </router-link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>

    <SidebarFooter>
      <div
          class="flex items-center justify-between gap-2 px-1 group-data-[collapsible=icon]:justify-center">
        <!-- 主题切换（侧边栏折叠为图标时隐藏） -->
        <div class="group-data-[collapsible=icon]:hidden">
          <ThemeSwitcher/>
        </div>
        <!-- 已登录：用户菜单 -->
        <DropdownMenu v-if="isAuthenticated">
          <DropdownMenuTrigger as-child>
            <Button
                class="h-8 gap-2 px-2 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
                variant="ghost"
            >
              <Avatar class="size-6">
                <AvatarFallback class="text-xs">{{ avatarText }}</AvatarFallback>
              </Avatar>
              <span class="max-w-28 truncate text-sm group-data-[collapsible=icon]:hidden">{{ displayName || '我的账户' }}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" class="w-56">
            <DropdownMenuLabel class="font-normal">
              <div class="flex flex-col space-y-1">
                <p class="text-sm font-medium leading-none text-foreground">{{ user?.username }}</p>
                <p class="truncate text-xs leading-none text-muted-foreground">{{ user?.email || '未绑定邮箱' }}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator/>
            <DropdownMenuItem as-child>
              <router-link to="/profile">个人信息</router-link>
            </DropdownMenuItem>
            <DropdownMenuItem v-if="hasRole(user?.role ?? null, 'admin')" as-child>
              <router-link to="/console">管理后台</router-link>
            </DropdownMenuItem>
            <DropdownMenuSeparator/>
            <DropdownMenuItem
                class="text-destructive focus:text-destructive focus:bg-destructive/10"
                @click="showLogoutDialog = true"
            >
              <LogOut/>
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <span v-else class="hidden text-xs text-muted-foreground lg:inline group-data-[collapsible=icon]:hidden">未登录</span>
      </div>
    </SidebarFooter>

    <!-- 登出确认弹窗 -->
    <AlertDialog v-model:open="showLogoutDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认退出登录吗？</AlertDialogTitle>
          <AlertDialogDescription>
            退出后将清除本地登录状态，需要重新登录才能访问角色与皮肤等个人数据。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
              class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              @click="confirmLogout"
          >
            退出登录
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <SidebarRail/>
  </Sidebar>
</template>