import http from './http';
import type {PageParams} from './types';

/** 投票选项类型：single 单选 / multiple 多选 */
export type VoteOptionType = 'single' | 'multiple'

/** 投票题目（列表项，不含选项投票数） */
export interface VoteItem {
    id: string
    title: string
    description: string | null
    optionType: VoteOptionType
    startAt: string
    endAt: string
    /** 已登录用户已投过的题目可附带（可选） */
    answered?: boolean
}

export interface VoteListResponse {
    total: number
    page: number
    pageSize: number
    items: VoteItem[]
}

/**
 * 列出当前已开始且未过期的投票（用户侧）
 * GET /votes
 */
export const getVotes = async (params: PageParams = {}): Promise<VoteListResponse> => {
    const response = await http.get<VoteListResponse>('/votes', {params});
    return response.data;
};

export interface VoteOption {
    id: string
    content: string
    sortOrder: number
}

/** 单个投票题目详情（含选项，不含统计） */
export interface VoteDetail {
    id: string
    title: string
    description: string | null
    optionType: VoteOptionType
    /** 多选时最多可选选项数；0 或 null 表示不限制（单选恒为 1） */
    maxSelections: number | null
    startAt: string
    endAt: string
    options: VoteOption[]
}

/**
 * 获取单个投票题目与其选项
 * GET /votes/{voteId}
 */
export const getVoteDetail = async (voteId: string): Promise<VoteDetail> => {
    const response = await http.get<VoteDetail>(`/votes/${voteId}`);
    return response.data;
};

/**
 * 投票（投票已结束/未开始返回 400 VoteClosed；可重复提交视为覆盖）
 * POST /votes/{voteId}/answer
 * @param optionId 单选时提交一个选项
 * @param optionIds 多选时提交多个选项
 */
export const submitVoteAnswer = async (
    voteId: string,
    optionId?: string,
    optionIds?: string[]
): Promise<void> => {
    const body = optionIds !== undefined
        ? {optionIds}
        : {optionId};
    await http.post(`/votes/${voteId}/answer`, body);
};

export interface VoteMeResponse {
    answered: boolean
    /** multiple 时为数组 */
    optionIds: string[]
    answeredAt?: string
}

/**
 * 查询当前用户在该投票中的选择
 * GET /votes/{voteId}/me
 */
export const getMyVoteAnswer = async (voteId: string): Promise<VoteMeResponse> => {
    const response = await http.get<VoteMeResponse>(`/votes/${voteId}/me`);
    return response.data;
};