/**
 * 时间格式化工具：后端时间统一为 ISO 8601 UTC 字符串。
 */

/** 格式化为本地时间字符串：YYYY-MM-DD HH:mm */
export function formatDateTime(iso: string | null | undefined): string {
    if (!iso) {
        return '-';
    }
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return String(iso);
    }
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** 相对时间（刚刚 / N分钟前 / N小时前 / N天前 / 具体日期） */
export function formatRelativeTime(iso: string | null | undefined): string {
    if (!iso) {
        return '-';
    }
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return String(iso);
    }
    const diff = Date.now() - date.getTime();
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    if (diff < minute) {
        return '刚刚';
    }
    if (diff < hour) {
        return `${Math.floor(diff / minute)} 分钟前`;
    }
    if (diff < day) {
        return `${Math.floor(diff / hour)} 小时前`;
    }
    if (diff < 30 * day) {
        return `${Math.floor(diff / day)} 天前`;
    }
    return formatDateTime(iso);
}

/** 是否为永久封禁（bannedUntil 为 null） */
export function isPermanent(bannedUntil: string | null): boolean {
    return bannedUntil === null;
}

/** 封禁状态描述 */
export function describeBan(bannedUntil: string | null): string {
    if (bannedUntil === null) {
        return '永久封禁';
    }
    return `至 ${formatDateTime(bannedUntil)}`;
}