import consoleHttp from './consoleHttp';
import type {PageParams, SystemRole} from './types';

/**
 * /management/console — 管理后台端点。
 * 仅系统角色为 admin 的用户可使用（经独立鉴权：主站 Cookie + 后台 JWT）。
 * 后台级别：admin（普通管理）/ super_admin（超级管理）。
 */

/** 后台级别 */
export type ConsoleRole = 'admin' | 'super_admin'

// ============================================================
// 鉴权
// ============================================================

export interface ConsoleLoginResponse {
    /** 后台 JWT，后续放入 Authorization: Bearer */
    jwt: string
    expiresIn: number
    /** 后台级别 admin / super_admin */
    role: ConsoleRole
    userId: string
}

/**
 * 后台登录（主站 Cookie + 后台密码）
 * POST /management/console/auth/login
 * 待设密状态下返回 403 ConsolePasswordNotSet
 */
export const consoleLogin = async (password: string): Promise<ConsoleLoginResponse> => {
    const response = await consoleHttp.post<ConsoleLoginResponse>('/management/console/auth/login', {password});
    return response.data;
};

/**
 * 首次设置 / 重置后重设后台密码
 * POST /management/console/auth/set-password
 * 成功返回 204
 */
export const consoleSetPassword = async (password: string): Promise<void> => {
    await consoleHttp.post('/management/console/auth/set-password', {password});
};

/**
 * SuperAdmin 重置某个普通 Admin 的后台密码（重置后回到待设密状态）
 * POST /management/console/auth/reset-password
 */
export const consoleResetPassword = async (targetUserId: string): Promise<void> => {
    await consoleHttp.post('/management/console/auth/reset-password', {targetUserId});
};

/**
 * 登出后台，使 JWT 失效
 * POST /management/console/auth/logout
 */
export const consoleLogout = async (): Promise<void> => {
    await consoleHttp.post('/management/console/auth/logout');
};

export interface ConsoleMeResponse {
    userId: string
    username: string
    /** 主站系统角色 */
    role: SystemRole
    /** 后台级别 */
    consoleRole: ConsoleRole
}

/**
 * 获取当前后台登录信息
 * GET /management/console/auth/me
 */
export const consoleMe = async (): Promise<ConsoleMeResponse> => {
    const response = await consoleHttp.get<ConsoleMeResponse>('/management/console/auth/me');
    return response.data;
};

// ============================================================
// 系统角色变更
// ============================================================

export interface ConsoleRoleChangeResponse {
    userId: string
    previousRole: SystemRole
    role: SystemRole
    changedAt: string
}

/**
 * 变更用户系统角色（user/helper/moderator/admin）
 * POST /management/console/users/{userId}/roles
 */
export const consoleRoleChange = async (
    userId: string,
    role: SystemRole,
    reason?: string
): Promise<ConsoleRoleChangeResponse> => {
    const response = await consoleHttp.post<ConsoleRoleChangeResponse>(
        `/management/console/users/${userId}/roles`,
        {role, ...(reason ? {reason} : {})}
    );
    return response.data;
};

// ============================================================
// 身份组管理（仅 super_admin）
// ============================================================

export interface ConsoleGroup {
    id: string
    name: string
    displayName: string | null
    createdAt: string
    updatedAt: string
}

/**
 * 创建身份组
 * POST /management/console/identity-groups
 */
export const consoleGroupCreate = async (
    name: string,
    displayName?: string
): Promise<ConsoleGroup> => {
    const response = await consoleHttp.post<ConsoleGroup>('/management/console/identity-groups', {
        name,
        ...(displayName ? {displayName} : {})
    });
    return response.data;
};

/**
 * 改名身份组
 * PATCH /management/console/identity-groups/{groupId}
 */
export const consoleGroupPatch = async (
    groupId: string,
    body: {name?: string; displayName?: string | null}
): Promise<void> => {
    await consoleHttp.patch(`/management/console/identity-groups/${groupId}`, body);
};

/**
 * 删除身份组（解除其下所有 user_groups 关联）
 * DELETE /management/console/identity-groups/{groupId}
 */
export const consoleGroupDelete = async (groupId: string): Promise<void> => {
    await consoleHttp.delete(`/management/console/identity-groups/${groupId}`);
};

/**
 * 为用户分配身份组
 * POST /management/console/users/{userId}/groups
 */
export const consoleUserGroupAssign = async (userId: string, groupId: string): Promise<void> => {
    await consoleHttp.post(`/management/console/users/${userId}/groups`, {groupId});
};

/**
 * 移除用户的身份组
 * DELETE /management/console/users/{userId}/groups/{groupId}
 */
export const consoleUserGroupRemove = async (userId: string, groupId: string): Promise<void> => {
    await consoleHttp.delete(`/management/console/users/${userId}/groups/${groupId}`);
};

// ============================================================
// 通知与公告
// ============================================================

export interface ConsoleNotification {
    id: string
    targetUserId: string
    title: string
    createdAt: string
}

/**
 * 给单个用户发送站内通知
 * POST /management/console/notifications
 */
export const consoleSendNotification = async (
    targetUserId: string,
    title: string,
    content: string
): Promise<ConsoleNotification> => {
    const response = await consoleHttp.post<ConsoleNotification>('/management/console/notifications', {
        targetUserId,
        title,
        content
    });
    return response.data;
};

export interface ConsoleAnnouncement {
    id: string
    title: string
    published: boolean
    publishedAt: string
}

/**
 * 发布全站公告
 * POST /management/console/announcements
 */
export const consoleAnnouncementCreate = async (
    title: string,
    content: string,
    published = true
): Promise<ConsoleAnnouncement> => {
    const response = await consoleHttp.post<ConsoleAnnouncement>('/management/console/announcements', {
        title,
        content,
        published
    });
    return response.data;
};

export interface ConsoleAnnouncementListResponse {
    total: number
    page: number
    pageSize: number
    items: ConsoleAnnouncement[]
}

/**
 * 公告列表（含未发布项）
 * GET /management/console/announcements
 */
export const consoleAnnouncements = async (
    params: PageParams = {}
): Promise<ConsoleAnnouncementListResponse> => {
    const response = await consoleHttp.get<ConsoleAnnouncementListResponse>(
        '/management/console/announcements',
        {params}
    );
    return response.data;
};

/**
 * 删除一条全站公告
 * DELETE /management/console/announcements/{id}
 */
export const consoleAnnouncementDelete = async (id: string): Promise<void> => {
    await consoleHttp.delete(`/management/console/announcements/${id}`);
};

// ============================================================
// 标签管理（系统角色 Admin）
// ============================================================

export interface ConsoleLabel {
    id: string
    name: string
    color: string
}

/**
 * 标签列表
 * GET /management/console/labels
 */
export const consoleLabels = async (): Promise<{labels: ConsoleLabel[]}> => {
    const response = await consoleHttp.get<{labels: ConsoleLabel[]}>('/management/console/labels');
    return response.data;
};

/**
 * 创建标签
 * POST /management/console/labels
 */
export const consoleLabelCreate = async (name: string, color = '#000000'): Promise<ConsoleLabel> => {
    const response = await consoleHttp.post<ConsoleLabel>('/management/console/labels', {name, color});
    return response.data;
};

/**
 * 删除标签（并解除其与所有议题的关联）
 * DELETE /management/console/labels/{labelId}
 */
export const consoleLabelDelete = async (labelId: string): Promise<void> => {
    await consoleHttp.delete(`/management/console/labels/${labelId}`);
};

// ============================================================
// 前缀预设管理（仅 super_admin）
// ============================================================

export interface ConsolePrefix {
    id: string
    value: string
    displayName?: string | null
    backgroundColor?: string | null
}

/**
 * 前缀预设列表
 * GET /management/console/prefixes
 */
export const consolePrefixes = async (): Promise<{prefixes: ConsolePrefix[]}> => {
    const response = await consoleHttp.get<{prefixes: ConsolePrefix[]}>('/management/console/prefixes');
    return response.data;
};

/**
 * 创建前缀预设
 * POST /management/console/prefixes
 */
export const consolePrefixCreate = async (
    value: string,
    displayName?: string,
    backgroundColor?: string
): Promise<ConsolePrefix> => {
    const response = await consoleHttp.post<ConsolePrefix>('/management/console/prefixes', {
        value,
        ...(displayName ? {displayName} : {}),
        ...(backgroundColor ? {backgroundColor} : {})
    });
    return response.data;
};

/**
 * 删除前缀预设（清除该预设下所有持有关联与佩戴）
 * DELETE /management/console/prefixes/{prefixId}
 */
export const consolePrefixDelete = async (prefixId: string): Promise<void> => {
    await consoleHttp.delete(`/management/console/prefixes/${prefixId}`);
};

// ============================================================
// 配置热重载
// ============================================================

export interface ConsoleReloadResponse {
    reloaded: string[]
    reloadedAt: string
}

/**
 * 热重载全部配置文件
 * POST /management/console/reload
 */
export const consoleReload = async (): Promise<ConsoleReloadResponse> => {
    const response = await consoleHttp.post<ConsoleReloadResponse>('/management/console/reload');
    return response.data;
};

// ============================================================
// 后台审计日志（只读）
// ============================================================

export interface ConsoleAuditLogParams {
    adminId?: string
    /** 动作，支持前缀匹配（如 console.） */
    action?: string
    result?: 'success' | 'denied'
    from?: string
    to?: string
    page?: number
    pageSize?: number
}

export interface ConsoleAuditLogEntry {
    id: string
    adminId: string
    action: string
    result: 'success' | 'denied'
    ip: string
    userAgent: string
    payload?: Record<string, unknown>
    createdAt: string
}

export interface ConsoleAuditLogListResponse {
    items: ConsoleAuditLogEntry[]
    page: number
    pageSize: number
    total: number
}

/**
 * 后台审计日志查询（只读，按 createdAt 倒序）
 * GET /management/console/audit-logs
 */
export const consoleAuditLogs = async (
    params: ConsoleAuditLogParams = {}
): Promise<ConsoleAuditLogListResponse> => {
    const response = await consoleHttp.get<ConsoleAuditLogListResponse>('/management/console/audit-logs', {params});
    return response.data;
};