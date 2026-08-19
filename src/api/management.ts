import http from './http';
import type {IdentityGroup, PageParams, PrefixPreset, SystemRole} from './types';
import type {IssueClosedReason, IssueLabel, IssueState} from './issues';
import type {VoteOptionType} from './votes';

// ============================================================
// /management — 主站管理端点（需权限节点，默认最低系统角色 Moderator）
// ============================================================

/** 用户状态（由 bans 即时计算） */
export type UserStatus = 'active' | 'banned'

/** 用户列表项（GET /management/users） */
export interface ManagementUser {
    id: string
    username: string
    email: string
    role: SystemRole
    /** 当前佩戴前缀 ID（可空） */
    currentPrefixId: string | null
    /** 持有前缀取值列表（可为空） */
    prefixes: string[]
    /** 所属身份组名（可为空） */
    groups: string[]
    status: UserStatus
    bannedUntil: string | null
    lastLoginAt: string | null
    createdAt: string
}

export interface ManagementUserListParams extends PageParams {
    /** 邮箱精确匹配 或 用户名前缀匹配 */
    q?: string
    role?: SystemRole
    status?: UserStatus
    /** 注册时间下界，ISO 8601 UTC */
    registeredAfter?: string
    /** 注册时间上界，ISO 8601 UTC */
    registeredBefore?: string
    /** 仅接受 createdAt、lastLoginAt，默认 createdAt */
    sortBy?: 'createdAt' | 'lastLoginAt'
    /** asc / desc，默认 desc */
    order?: 'asc' | 'desc'
}

export interface ManagementUserListResponse {
    total: number
    page: number
    pageSize: number
    users: ManagementUser[]
}

/**
 * 用户列表（只读）
 * GET /management/users
 */
export const getManagementUsers = async (
    params: ManagementUserListParams
): Promise<ManagementUserListResponse> => {
    const response = await http.get<ManagementUserListResponse>('/management/users', {params});
    return response.data;
};

/** OIDC 绑定记录 */
export interface OidcBinding {
    providerId: string
    boundAt: string
}

/** 用户详情（GET /management/users/{userId}） */
export interface ManagementUserDetail {
    id: string
    username: string
    email: string
    role: SystemRole
    currentPrefixId: string | null
    prefixes: PrefixPreset[]
    identityGroups: IdentityGroup[]
    status: UserStatus
    bannedUntil: string | null
    lastLoginAt: string | null
    lastLoginIp: string | null
    registerIp: string | null
    createdAt: string
    oidcBindings: OidcBinding[]
}

/**
 * 用户详情（只读）
 * GET /management/users/{userId}
 */
export const getManagementUser = async (userId: string): Promise<ManagementUserDetail> => {
    const response = await http.get<ManagementUserDetail>(`/management/users/${userId}`);
    return response.data;
};

// ============================================================
// 身份组（只读）
// ============================================================

export interface IdentityGroupListResponse {
    total: number
    page: number
    pageSize: number
    groups: IdentityGroup[]
}

/**
 * 身份组列表（只读，写入在后台 console）
 * GET /management/identity-groups
 */
export const getIdentityGroups = async (
    params: PageParams = {}
): Promise<IdentityGroupListResponse> => {
    const response = await http.get<IdentityGroupListResponse>('/management/identity-groups', {params});
    return response.data;
};

// ============================================================
// 前缀授予 / 收回（management.prefix.assign）
// ============================================================

/**
 * 获取可用前缀预设清单
 * GET /management/prefix-presets
 */
export const getPrefixPresets = async (): Promise<{prefixes: PrefixPreset[]}> => {
    const response = await http.get<{prefixes: PrefixPreset[]}>('/management/prefix-presets');
    return response.data;
};

export interface UserPrefixesResponse {
    prefixes: PrefixPreset[]
    /** 该用户当前佩戴的前缀，可为 null */
    currentPrefixId: string | null
}

/**
 * 列出指定用户已持有的前缀
 * GET /management/users/{userId}/prefixes
 */
export const getUserPrefixes = async (userId: string): Promise<UserPrefixesResponse> => {
    const response = await http.get<UserPrefixesResponse>(`/management/users/${userId}/prefixes`);
    return response.data;
};

/**
 * 为用户授予一个前缀（追加到持有集合）
 * POST /management/users/{userId}/prefixes
 * 成功返回 201，返回该用户当前持有列表
 */
export const grantUserPrefix = async (userId: string, prefixId: string): Promise<PrefixPreset[]> => {
    const response = await http.post<PrefixPreset[]>(`/management/users/${userId}/prefixes`, {prefixId});
    return response.data;
};

/**
 * 收回用户持有的一个前缀（若佩戴中则同步置空）
 * DELETE /management/users/{userId}/prefixes/{prefixId}
 * 成功返回 204
 */
export const revokeUserPrefix = async (userId: string, prefixId: string): Promise<void> => {
    await http.delete(`/management/users/${userId}/prefixes/${prefixId}`);
};

// ============================================================
// 投票管理 /management/votes
// ============================================================

export interface CreateVoteRequest {
    title: string
    description?: string
    optionType: VoteOptionType
    /** 多选时最多可选选项数；0 或省略表示不限制 */
    maxSelections?: number
    /** 可选，开始时间（缺省即立即生效） */
    startAt?: string
    /** ISO 8601 UTC */
    endAt: string
    options: {content: string}[]
}

export interface ManageVoteResult {
    id: string
    title: string
    optionType: VoteOptionType
    maxSelections: number | null
    startAt: string | null
    endAt: string
    options: {id: string; content: string; sortOrder: number}[]
}

/**
 * 创建投票
 * POST /management/votes
 */
export const createManagementVote = async (body: CreateVoteRequest): Promise<ManageVoteResult> => {
    const response = await http.post<ManageVoteResult>('/management/votes', body);
    return response.data;
};

/**
 * 删除投票（含其选项与投票记录）
 * DELETE /management/votes/{voteId}
 */
export const deleteManagementVote = async (voteId: string): Promise<void> => {
    await http.delete(`/management/votes/${voteId}`);
};

/** 投票统计数据（管理侧，含投票人明细） */
export interface VoteData {
    id: string
    title: string
    total: number
    options: {
        content: string
        count: number
        /** 每选项投票人 */
        voters: {userId: string; username: string}[]
    }[]
}

/**
 * 查看投票统计数据
 * GET /management/votes/{voteId}/data
 */
export const getVoteData = async (voteId: string): Promise<VoteData> => {
    const response = await http.get<VoteData>(`/management/votes/${voteId}/data`);
    return response.data;
};

// ============================================================
// Issue 管理 /management/issues
// ============================================================

/**
 * 给议题分配标签（覆盖式，传空数组表示清空）
 * POST /management/issues/{issueId}/labels
 * 成功返回 204
 */
export const assignIssueLabels = async (issueId: string, labelIds: string[]): Promise<void> => {
    await http.post(`/management/issues/${issueId}/labels`, {labelIds});
};

export interface PatchIssueStateRequest {
    state: IssueState
    /** state=closed 时：completed / duplicated / not_planned */
    closedReason?: IssueClosedReason
}

/**
 * 打开 / 关闭议题（带关闭原因）
 * PATCH /management/issues/{issueId}/state
 * 成功返回 200，返回议题当前状态
 */
export const patchIssueState = async (
    issueId: string,
    body: PatchIssueStateRequest
): Promise<{id: string; state: IssueState; closedReason: IssueClosedReason | null}> => {
    const response = await http.patch<{id: string; state: IssueState; closedReason: IssueClosedReason | null}>(
        `/management/issues/${issueId}/state`,
        body
    );
    return response.data;
};

// ============================================================
// 封禁 /management/bans
// ============================================================

export interface BanRecord {
    id: string
    userId: string
    /** 解封时间，null 表示永久封禁 */
    bannedUntil: string | null
    reason?: string
    operatorId: string
    createdAt: string
}

export interface CreateBanRequest {
    userId: string
    /** null 表示永久封禁 */
    bannedUntil: string | null
    /** 可选 */
    reason?: string
}

/**
 * 创建封禁（自动吊销该用户全部主站会话、Yggdrasil 令牌与启动器会话）
 * POST /management/bans
 */
export const createBan = async (body: CreateBanRequest): Promise<BanRecord> => {
    const response = await http.post<BanRecord>('/management/bans', body);
    return response.data;
};

export interface BanListParams extends PageParams {
    /** 仅返回生效中的记录 */
    active?: boolean
}

export interface BanListResponse {
    items: BanRecord[]
    page: number
    pageSize: number
    total: number
}

/**
 * 封禁列表（按 createdAt 倒序）
 * GET /management/bans
 */
export const getBans = async (params: BanListParams = {}): Promise<BanListResponse> => {
    const response = await http.get<BanListResponse>('/management/bans', {params});
    return response.data;
};

/**
 * 查询指定用户封禁状态
 * GET /management/bans/{userId}
 * 无封禁记录返回 404 BanNotFound
 */
export const getBan = async (userId: string): Promise<BanRecord> => {
    const response = await http.get<BanRecord>(`/management/bans/${userId}`);
    return response.data;
};

/**
 * 解封（删除封禁记录）
 * DELETE /management/bans/{userId}
 */
export const deleteBan = async (userId: string, reason?: string): Promise<void> => {
    await http.delete(`/management/bans/${userId}`, {data: reason ? {reason} : undefined});
};

// ============================================================
// 主站审计日志 /management/audit-logs（只读）
// ============================================================

export interface AuditLogParams {
    operatorId?: string
    targetUserId?: string
    /** 动作，支持前缀匹配（如 user.） */
    action?: string
    /** success / denied */
    result?: 'success' | 'denied'
    /** 时间下界，ISO 8601 UTC */
    from?: string
    /** 时间上界，ISO 8601 UTC */
    to?: string
    page?: number
    pageSize?: number
}

export interface AuditLogEntry {
    id: string
    operatorId: string
    action: string
    targetUserId: string | null
    result: 'success' | 'denied'
    /** 操作者 IP */
    ip: string
    /** 动作相关参数，结构随 action 而异 */
    payload?: Record<string, unknown>
    createdAt: string
}

export interface AuditLogListResponse {
    items: AuditLogEntry[]
    page: number
    pageSize: number
    total: number
}

/**
 * 主站审计日志查询（只读，按 createdAt 倒序）
 * GET /management/audit-logs
 */
export const getAuditLogs = async (params: AuditLogParams = {}): Promise<AuditLogListResponse> => {
    const response = await http.get<AuditLogListResponse>('/management/audit-logs', {params});
    return response.data;
};

// ============================================================
// Yggdrasil 管理 /management/yggdrasil
// ============================================================

export interface ManagedProfile {
    id: string
    userId: string
    name: string
    model: 'default' | 'slim'
    createdAt: string
    updatedAt: string
}

export interface ManagedProfileListResponse {
    total: number
    page: number
    pageSize: number
    items: ManagedProfile[]
}

/**
 * 角色列表
 * GET /management/yggdrasil/profiles
 */
export const getManagedProfiles = async (
    params: PageParams & {userId?: string} = {}
): Promise<ManagedProfileListResponse> => {
    const response = await http.get<ManagedProfileListResponse>('/management/yggdrasil/profiles', {params});
    return response.data;
};

export interface ManagedTextureRef {
    textureType: 'skin' | 'cape'
    hash: string
    model?: string
}

export interface ManagedProfileDetail extends ManagedProfile {
    textures: ManagedTextureRef[]
}

/**
 * 角色详情
 * GET /management/yggdrasil/profiles/{profileId}
 */
export const getManagedProfile = async (profileId: string): Promise<ManagedProfileDetail> => {
    const response = await http.get<ManagedProfileDetail>(`/management/yggdrasil/profiles/${profileId}`);
    return response.data;
};

export interface ManagedTexture {
    hash: string
    textureType: 'skin' | 'cape'
    profileId: string | null
    orphan: boolean
}

export interface ManagedTextureListResponse {
    total: number
    page: number
    pageSize: number
    items: ManagedTexture[]
}

/**
 * 材质列表（默认只列出孤儿材质）
 * GET /management/yggdrasil/textures
 */
export const getManagedTextures = async (
    params: PageParams & {profileId?: string; orphanOnly?: boolean} = {}
): Promise<ManagedTextureListResponse> => {
    const response = await http.get<ManagedTextureListResponse>('/management/yggdrasil/textures', {params});
    return response.data;
};

/**
 * 删除材质文件（仅允许孤儿材质）
 * DELETE /management/yggdrasil/textures/{hash}
 */
export const deleteManagedTexture = async (hash: string): Promise<void> => {
    await http.delete(`/management/yggdrasil/textures/${hash}`);
};

// 兼容导出：旧版页面可能引用的类型名
export type {IssueLabel};