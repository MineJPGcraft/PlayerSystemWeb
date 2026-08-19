import {AxiosError} from 'axios';
import type {ApiError} from '@/api';

/**
 * 从任意错误中提取人类可读的后端错误信息。
 * 后端统一返回 { error, errorMessage, cause }；
 * 优先取 errorMessage，其次取 error 码，最后回退到兜底文案。
 */
export function extractErrorMessage(error: unknown, fallback = '操作失败，请重试。'): string {
    if (error instanceof AxiosError) {
        const data = error.response?.data as ApiError | undefined;
        if (data?.errorMessage) {
            return data.errorMessage;
        }
        if (data?.error) {
            return data.error;
        }
    }
    return fallback;
}

/** 从任意错误中提取后端机器可读错误码（无则返回 null） */
export function extractErrorCode(error: unknown): string | null {
    if (error instanceof AxiosError) {
        const data = error.response?.data as ApiError | undefined;
        return data?.error ?? null;
    }
    return null;
}

/** 判断是否为人机验证相关错误（需要重新渲染 widget 后自动重试） */
export function isCaptchaError(error: unknown): boolean {
    const code = extractErrorCode(error);
    return !!code && [
        'CaptchaMissing',
        'CaptchaExpired',
        'CaptchaInvalid',
        'CaptchaActionMismatch',
        'CaptchaRequired'
    ].includes(code);
}