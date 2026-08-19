import {createRouter, createWebHistory, type RouteRecordRaw} from 'vue-router';
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import {buildTitle, setPageMeta} from '@/lib/seo';
import {getConsoleJwt} from '@/api/consoleHttp';

declare module 'vue-router' {
    interface RouteMeta {
        requiresAuth?: boolean
        /** 是否显示侧边栏布局（登录后的应用页面；Home 等公开页面不显示） */
        sidebar?: boolean
        /** 页面标题（SEO，用于 afterEach 动态设置 document.title） */
        title?: string
        /** 路由是否需要后台 JWT（管理后台 /console） */
        consoleAuth?: boolean
        /** 路由需要的系统角色（管理侧页面） */
        minRole?: 'moderator' | 'admin'
    }
}

const routes: RouteRecordRaw[] = [
    {
        path: '/',
        component: DefaultLayout,
        children: [
            {
                // 根路径：公开落地页（未登录访问；已登录由守卫跳转仪表盘）
                path: '',
                name: 'home',
                component: () => import('@/views/Home.vue'),
                meta: {title: '首页'}
            },
            {
                path: 'dashboard',
                name: 'dashboard',
                component: () => import('@/views/Dashboard.vue'),
                meta: {requiresAuth: true, sidebar: true, title: '仪表盘'}
            },
            {
                path: 'role-management',
                name: 'role-management',
                component: () => import('@/views/RoleManagement.vue'),
                meta: {requiresAuth: true, sidebar: true, title: '角色管理'}
            },
            {
                path: 'launcher-sessions',
                name: 'launcher-sessions',
                component: () => import('@/views/LauncherSessions.vue'),
                meta: {requiresAuth: true, sidebar: true, title: '启动器会话'}
            },
            {
                path: 'profile',
                name: 'user-profile',
                component: () => import('@/views/UserProfile.vue'),
                meta: {requiresAuth: true, sidebar: true, title: '个人信息'}
            },
            {
                path: 'notifications',
                name: 'notifications',
                component: () => import('@/views/Notifications.vue'),
                meta: {requiresAuth: true, sidebar: true, title: '通知'}
            },
            {
                path: 'votes',
                name: 'votes',
                component: () => import('@/views/Votes.vue'),
                meta: {requiresAuth: true, sidebar: true, title: '投票'}
            },
            {
                path: 'issues',
                name: 'issues',
                component: () => import('@/views/Issues.vue'),
                meta: {requiresAuth: true, sidebar: true, title: '议题'}
            },
            {
                path: 'issues/:id',
                name: 'issue-detail',
                component: () => import('@/views/IssueDetail.vue'),
                meta: {requiresAuth: true, sidebar: true, title: '议题详情'}
            },
            // ============ 管理侧（Moderator 及以上，页面内按角色控制权限） ============
            {
                path: 'management/users',
                name: 'management-users',
                component: () => import('@/views/AdminUsers.vue'),
                meta: {requiresAuth: true, sidebar: true, title: '用户管理', minRole: 'moderator'}
            },
            {
                path: 'management/bans',
                name: 'management-bans',
                component: () => import('@/views/AdminBans.vue'),
                meta: {requiresAuth: true, sidebar: true, title: '封禁管理', minRole: 'moderator'}
            },
            {
                path: 'management/votes',
                name: 'management-votes',
                component: () => import('@/views/AdminVotes.vue'),
                meta: {requiresAuth: true, sidebar: true, title: '投票管理', minRole: 'moderator'}
            },
            {
                path: 'management/audit-logs',
                name: 'management-audit-logs',
                component: () => import('@/views/AdminAuditLogs.vue'),
                meta: {requiresAuth: true, sidebar: true, title: '审计日志', minRole: 'moderator'}
            },
            {
                path: 'management/identity-groups',
                name: 'management-identity-groups',
                component: () => import('@/views/AdminIdentityGroups.vue'),
                meta: {requiresAuth: true, sidebar: true, title: '身份组', minRole: 'moderator'}
            },
            {
                path: 'management/yggdrasil',
                name: 'management-yggdrasil',
                component: () => import('@/views/AdminYggdrasil.vue'),
                meta: {requiresAuth: true, sidebar: true, title: 'Yggdrasil 资源', minRole: 'moderator'}
            },
            // ============ 管理后台（Admin，需后台 JWT） ============
            {
                path: 'console',
                component: () => import('@/views/console/ConsoleLayout.vue'),
                meta: {requiresAuth: true, sidebar: true, title: '管理后台', consoleAuth: true},
                children: [
                    {
                        path: '',
                        name: 'console-overview',
                        component: () => import('@/views/console/ConsoleOverview.vue'),
                        meta: {title: '管理后台'}
                    },
                    {
                        path: 'users',
                        name: 'console-users',
                        component: () => import('@/views/console/ConsoleUsers.vue'),
                        meta: {title: '用户与角色'}
                    },
                    {
                        path: 'groups',
                        name: 'console-groups',
                        component: () => import('@/views/console/ConsoleGroups.vue'),
                        meta: {title: '身份组'}
                    },
                    {
                        path: 'notifications',
                        name: 'console-notifications',
                        component: () => import('@/views/console/ConsoleNotifications.vue'),
                        meta: {title: '通知与公告'}
                    },
                    {
                        path: 'content',
                        name: 'console-content',
                        component: () => import('@/views/console/ConsoleContent.vue'),
                        meta: {title: '标签与前缀'}
                    },
                    {
                        path: 'audit-logs',
                        name: 'console-audit-logs',
                        component: () => import('@/views/console/ConsoleAuditLogs.vue'),
                        meta: {title: '后台审计'}
                    }
                ]
            }
        ]
    },
    {
        path: '/login',
        name: 'login',
        component: () => import('@/views/Login.vue'),
        meta: {title: '登录'}
    },
    {
        path: '/register',
        name: 'register',
        component: () => import('@/views/register.vue'),
        meta: {title: '注册'}
    },
    {
        path: '/reset-password',
        name: 'reset-password',
        component: () => import('@/views/ResetPassword.vue'),
        meta: {title: '重置密码'}
    },
    {
        // OIDC 回调页：provider 授权完成后由后端 302 跳回
        path: '/oidc/callback',
        name: 'oidc-callback',
        component: () => import('@/views/OidcCallback.vue'),
        meta: {title: 'OIDC 回调'}
    },
    {
        path: '/console/login',
        name: 'console-login',
        component: () => import('@/views/console/ConsoleLogin.vue'),
        meta: {title: '后台登录'}
    }
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

// 全局路由守卫
router.beforeEach((to, from, next) => {
    // 登录态以 localStorage 中的 userInfo 为标记（真实会话凭据为 HttpOnly Cookie）
    const loggedIn = !!localStorage.getItem('userInfo');
    const isAuthenticated = loggedIn;

    // 读取当前用户系统角色（用于 minRole 守卫）
    let currentRole: string | null = null;
    if (isAuthenticated) {
        try {
            const raw = localStorage.getItem('userInfo');
            if (raw) {
                currentRole = (JSON.parse(raw) as {role?: string}).role ?? null;
            }
        } catch {
            currentRole = null;
        }
    }
    const roleLevel = (role: string | null): number =>
        ({user: 0, helper: 1, moderator: 2, admin: 3})[role as 'user' | 'helper' | 'moderator' | 'admin'] ?? -1;

    // 定义只有未认证用户才能访问的页面
    const publicOnlyPages = ['login', 'register', 'reset-password', 'console-login'];
    const isPublicOnlyPage = publicOnlyPages.includes(String(to.name));

    // 情况1: 用户已认证，但尝试访问登录/注册/重置密码页面
    if (isAuthenticated && isPublicOnlyPage) {
        next({name: 'dashboard'});
    }
    // 情况1.5: 已登录用户访问首页，跳转仪表盘
    else if (to.name === 'home' && isAuthenticated) {
        next({name: 'dashboard'});
    }
    // 情况2: 路由需要认证，但用户未登录
    else if (to.meta.requiresAuth && !isAuthenticated) {
        next({name: 'login', query: {redirect: to.fullPath}});
    }
    // 情况2.5: 管理侧页面需要最低系统角色
    else if (to.meta.minRole && roleLevel(currentRole) < roleLevel(to.meta.minRole)) {
        next({name: 'dashboard'});
    }
    // 情况3: 后台路由需要后台 JWT
    else if (to.meta.consoleAuth && !getConsoleJwt()) {
        next({name: 'console-login'});
    }
    // 情况4: 已持有后台 JWT 访问后台登录页，直接进入后台
    else if (to.name === 'console-login' && getConsoleJwt()) {
        next({name: 'console-overview'});
    }
    // 其他情况: 继续导航
    else {
        next();
    }
});

// 每次路由切换后根据 meta.title 更新页面标题（SEO）
router.afterEach((to) => {
    if (to.meta.title) {
        setPageMeta(buildTitle(to.meta.title));
    }
});

export default router;