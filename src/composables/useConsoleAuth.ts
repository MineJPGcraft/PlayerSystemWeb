import {computed, ref} from 'vue';
import {clearConsoleJwt, consoleMe, consoleLogout, getConsoleJwt, setConsoleJwt} from '@/api';
import type {ConsoleMeResponse} from '@/api';

/**
 * 后台（Console）会话状态：
 * - 后台会话独立于主站 Cookie，凭据为 localStorage 中的后台 JWT
 * - 登录成功后调用 setSession({jwt, ...}) 或直接 setJwt(jwt)，再用 consoleMe() 拉取详情
 */
const session = ref<ConsoleMeResponse | null>(null);

/** 是否已持有后台 JWT（路由守卫使用） */
export const hasConsoleJwt = computed(() => !!getConsoleJwt());

function readJwt(): string | null {
    return getConsoleJwt();
}

/** 保存后台 JWT */
function setJwt(jwt: string): void {
    setConsoleJwt(jwt);
}

/** 拉取后台登录信息并更新会话状态 */
async function refreshMe(throwOnError = false): Promise<ConsoleMeResponse | null> {
    if (!getConsoleJwt()) {
        session.value = null;
        return null;
    }
    try {
        const me = await consoleMe();
        session.value = me;
        return me;
    } catch (error) {
        if (throwOnError) {
            throw error;
        }
        session.value = null;
        return null;
    }
}

/** 登出后台（使 JWT 失效并清除本地） */
async function logout(): Promise<void> {
    try {
        await consoleLogout();
    } catch {
        // 忽略登出失败，仍清除本地 JWT
    }
    clearConsoleJwt();
    session.value = null;
}

export function useConsoleAuth() {
    return {
        session,
        isLoggedIn: hasConsoleJwt,
        jwt: readJwt,
        setJwt,
        refreshMe,
        logout,
    };
}