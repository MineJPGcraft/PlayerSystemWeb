import axios, {AxiosError} from 'axios';

// 后端 API 的基础 URL（与主站 http 实例一致）
// eslint-disable-next-line no-restricted-imports
export const consoleBaseURL = import.meta.env.PROD
    ? (import.meta.env.VITE_API_BASE_URL || '/api')
    : '/api';

export const CONSOLE_JWT_KEY = 'consoleJwt';

/** 读取后台 JWT（登录后台后写入 localStorage） */
export function getConsoleJwt(): string | null {
    return localStorage.getItem(CONSOLE_JWT_KEY);
}

/** 保存后台 JWT */
export function setConsoleJwt(jwt: string): void {
    localStorage.setItem(CONSOLE_JWT_KEY, jwt);
}

/** 清除后台 JWT（登出后台 / JWT 失效） */
export function clearConsoleJwt(): void {
    localStorage.removeItem(CONSOLE_JWT_KEY);
}

/**
 * 后台专用 axios 实例：
 * - withCredentials 携带主站 Cookie（确认已登录且为 admin）
 * - 每次请求自动附带 Authorization: Bearer {JWT}（后台会话）
 */
const consoleHttp = axios.create({
    baseURL: consoleBaseURL,
    headers: {
        'Content-Type': 'application/json; charset=utf-8'
    },
    timeout: 10000,
    withCredentials: true
});

// 请求拦截器：附加后台 JWT
consoleHttp.interceptors.request.use((config) => {
    const jwt = getConsoleJwt();
    if (jwt) {
        config.headers.set('Authorization', `Bearer ${jwt}`);
    }
    return config;
});

// 响应拦截器：401 时清除后台 JWT 并跳转后台登录页
consoleHttp.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        if (error.response?.status === 401) {
            clearConsoleJwt();
            import('@/router')
                .then(({default: router}) => {
                    if (router.currentRoute.value.path !== '/console/login') {
                        router.push('/console/login');
                    }
                })
                .catch(() => {/* 忽略模块加载失败 */
                });
        }
        return Promise.reject(error);
    }
);

export default consoleHttp;