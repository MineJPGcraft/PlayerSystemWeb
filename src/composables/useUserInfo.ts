import {computed, readonly, ref} from 'vue';
import type {UserInfo} from '@/api';

/**
 * 全局用户状态（单一数据源）：
 * - localStorage.userInfo 为登录态标记（真实凭据为 HttpOnly Cookie）
 * - 登录 / OIDC 回调成功后调用 setUser() 写入
 * - 登出 / 401 时调用 clear() 清除
 */
const user = ref<UserInfo | null>(null);

/** 校验 localStorage 中的用户信息是否为当前模型；旧版/损坏数据直接丢弃（避免渲染崩溃） */
function isUserInfo(info: unknown): info is UserInfo {
    if (!info || typeof info !== 'object') return false
    const record = info as Record<string, unknown>
    // 新模型必须包含 username 与 userId；旧模型（displayName）视为失效
    return typeof record.userId === 'string'
        && typeof record.username === 'string'
        && Array.isArray(record.prefixes)
        && Array.isArray(record.identityGroups)
}

function readFromStorage(): UserInfo | null {
    const raw = localStorage.getItem('userInfo');
    if (!raw) {
        return null;
    }
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!isUserInfo(parsed)) {
            // 旧模型（升级前登录态）或损坏数据：清除，强制重新登录以获取新模型
            localStorage.removeItem('userInfo');
            return null;
        }
        return parsed;
    } catch {
        localStorage.removeItem('userInfo');
        return null;
    }
}

/** 初始化：从 localStorage 读取 */
function init(): void {
    user.value = readFromStorage();
}

function setUser(info: UserInfo | null): void {
    user.value = info;
    if (info) {
        localStorage.setItem('userInfo', JSON.stringify(info));
    } else {
        localStorage.removeItem('userInfo');
    }
}

function clear(): void {
    setUser(null);
}

// 监听主站会话过期事件（http 401 拦截器派发）
if (typeof window !== 'undefined') {
    window.addEventListener('auth:expired', () => setUser(null));
}

/** 刷新（重新拉取 /user/me；失败时清空登录态） */
async function refresh(): Promise<UserInfo | null> {
    try {
        const {getUserInfo} = await import('@/api');
        const info = await getUserInfo();
        setUser(info);
        return info;
    } catch {
        // 401 拦截器已处理跳转，这里仅保证本地状态一致
        clear();
        return null;
    }
}

init();

/** 是否已登录 */
export const isAuthenticated = computed(() => !!user.value);

/** 当前用户信息（只读） */
export const currentUser = readonly(user);

export function useUserInfo() {
    return {
        user: currentUser,
        isAuthenticated,
        setUser,
        clear,
        refresh,
    };
}

// 供非组件环境使用的命名导出
export {user as userInfoRef};