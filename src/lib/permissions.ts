import type {SystemRole} from '@/api';

/** 角色层级数字类型 */
export type RoleLevel = 0 | 1 | 2 | 3

/** 系统角色层级：user < helper < moderator < admin */
export const ROLE_LEVEL: Record<SystemRole, RoleLevel> = {
    user: 0,
    helper: 1,
    moderator: 2,
    admin: 3
};

/** 系统角色展示名 */
export const ROLE_LABEL: Record<SystemRole, string> = {
    user: '玩家',
    helper: '协管',
    moderator: '版主',
    admin: '管理员'
};

export const ROLE_OPTIONS: SystemRole[] = ['user', 'helper', 'moderator', 'admin'];

/** 判断当前角色是否达到指定最低角色 */
export function hasRole(role: SystemRole | undefined | null, min: SystemRole): boolean {
    if (!role) {
        return false;
    }
    return ROLE_LEVEL[role] >= ROLE_LEVEL[min];
}

/**
 * 渲染用户展示名：[前缀]username[身份组][系统角色]（前缀为佩戴的那个）
 * @param prefix 佩戴前缀文本（如 [VIP]），无则忽略
 * @param username 展示用户名
 * @param groups 所属身份组展示名列表
 * @param role 系统角色
 */
export function formatUserDisplay(
    prefix: string | null | undefined,
    username: string,
    groups: string[] = [],
    role?: SystemRole | null
): string {
    const parts: string[] = [];
    if (prefix) {
        parts.push(prefix);
    }
    parts.push(username);
    if (groups.length > 0) {
        parts.push(`[${groups.join(', ')}]`);
    }
    if (role) {
        parts.push(`[${ROLE_LABEL[role]}]`);
    }
    return parts.join('');
}