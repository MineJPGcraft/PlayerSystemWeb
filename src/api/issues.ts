import http from './http';
import type {PageParams} from './types';

/** 议题状态 */
export type IssueState = 'open' | 'closed'
/** 议题可见性 */
export type IssueVisibility = 'public' | 'private'
/** 关闭原因 */
export type IssueClosedReason = 'completed' | 'duplicated' | 'not_planned'

/** 议题标签 */
export interface IssueLabel {
    id: string
    name: string
    color: string
}

/** 简化用户对象（议题列表/评论中的作者） */
export interface IssueUser {
    id: string
    username: string
}

/** 议题列表项 */
export interface IssueItem {
    id: string
    title: string
    state: IssueState
    createdAt: string
    creator: IssueUser
    labels: IssueLabel[]
    commentCount: number
}

export interface IssueListResponse {
    total: number
    page: number
    pageSize: number
    items: IssueItem[]
}

export interface IssueListParams extends PageParams {
    /** open / closed（默认 open） */
    state?: IssueState
    /** 按标签名筛选 */
    label?: string
    /** created / updated / comments，默认 created */
    sort?: 'created' | 'updated' | 'comments'
    /** 标题/正文搜索 */
    q?: string
}

/**
 * 公开议题列表（不含私有）
 * GET /issues
 */
export const getIssues = async (params: IssueListParams = {}): Promise<IssueListResponse> => {
    const response = await http.get<IssueListResponse>('/issues', {params});
    return response.data;
};

/**
 * 列出当前用户创建的议题（含其私有议题）
 * GET /issues/mine
 */
export const getMyIssues = async (params: IssueListParams = {}): Promise<IssueListResponse> => {
    const response = await http.get<IssueListResponse>('/issues/mine', {params});
    return response.data;
};

/** 议题详情 */
export interface IssueDetail {
    id: string
    title: string
    body: string
    visibility: IssueVisibility
    state: IssueState
    closedReason: IssueClosedReason | null
    creator: IssueUser
    labels: IssueLabel[]
    createdAt: string
    updatedAt: string
    closedAt: string | null
}

export interface CreateIssueRequest {
    title: string
    body: string
    /** public / private */
    visibility: IssueVisibility
}

/**
 * 创建议题
 * POST /issues
 * 成功返回 201，返回新议题（结构同详情）
 */
export const createIssue = async (body: CreateIssueRequest): Promise<IssueDetail> => {
    const response = await http.post<IssueDetail>('/issues', body);
    return response.data;
};

/**
 * 议题详情（私有议题仅创建者或有 issue.private_read 节点者可见，无权限返回 404）
 * GET /issues/{issueId}
 */
export const getIssueDetail = async (issueId: string): Promise<IssueDetail> => {
    const response = await http.get<IssueDetail>(`/issues/${issueId}`);
    return response.data;
};

export interface PatchIssueRequest {
    /** 不传则不修改 */
    title?: string
    body?: string
    visibility?: IssueVisibility
}

/**
 * 编辑议题（仅创建者可编辑 title / body / visibility）
 * PATCH /issues/{issueId}
 */
export const patchIssue = async (issueId: string, body: PatchIssueRequest): Promise<IssueDetail> => {
    const response = await http.patch<IssueDetail>(`/issues/${issueId}`, body);
    return response.data;
};

export interface IssueComment {
    id: string
    user: IssueUser
    content: string
    createdAt: string
}

export interface IssueCommentListResponse {
    total: number
    items: IssueComment[]
}

/**
 * 议题评论列表
 * GET /issues/{issueId}/comments
 */
export const getIssueComments = async (issueId: string): Promise<IssueCommentListResponse> => {
    const response = await http.get<IssueCommentListResponse>(`/issues/${issueId}/comments`);
    return response.data;
};

/**
 * 评论议题（可见者均可）
 * POST /issues/{issueId}/comments
 * 成功返回 201，返回评论对象
 */
export const createIssueComment = async (issueId: string, content: string): Promise<IssueComment> => {
    const response = await http.post<IssueComment>(`/issues/${issueId}/comments`, {content});
    return response.data;
};

export interface IssueLabelsResponse {
    labels: IssueLabel[]
}

/**
 * 议题当前的标签列表
 * GET /issues/{issueId}/labels
 */
export const getIssueLabels = async (issueId: string): Promise<IssueLabelsResponse> => {
    const response = await http.get<IssueLabelsResponse>(`/issues/${issueId}/labels`);
    return response.data;
};