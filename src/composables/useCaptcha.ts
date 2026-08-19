import {getCaptchaConfig, type CaptchaActionConfig, type CaptchaConfig} from '@/api';
import type {CaptchaHeaders} from '@/api';
import {extractErrorCode, isCaptchaError} from '@/lib/apiError';

/**
 * 人机验证（captcha）集成，依据 AuthAPI-doc EP-captcha.md：
 * - 启动时 / 进入受保护页面前调用 GET /captcha/config 决定是否加载 SDK、加载哪一家；
 * - provider 与 siteKey 一律由后端下发，前端禁止硬编码；
 * - token 通过请求头传递：X-Captcha-Token / X-Captcha-Provider / X-Captcha-Action / X-Captcha-Config-Version；
 * - 开关切换竞态：后端返回 CaptchaMissing 时，重新拉取配置、渲染 widget 并自动重试一次，且不得清空表单；
 * - onDemand 模式：平时不需要，后端返回 403 CaptchaRequired 时弹出 widget，完成后自动重试原请求。
 */

/** 受保护的动作标识 */
export type CaptchaAction =
    | 'register'
    | 'login'
    | 'email-code-register'
    | 'email-code-login'

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
    interface Window {
        turnstile?: {
            render: (el: HTMLElement, opts: Record<string, any>) => string
            reset: (widgetId: string) => void
            remove: (widgetId: string) => void
        }
        hcaptcha?: {
            render: (el: HTMLElement, opts: Record<string, any>) => string
            reset: (widgetId: string) => void
        }
        grecaptcha?: {
            render: (el: HTMLElement, opts: Record<string, any>) => number
            reset: (widgetId: number) => void
        }
        initGeetest4?: (opts: Record<string, any>, handler: (captcha: Record<string, any>) => void) => void
    }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** 配置缓存（端点响应可缓存，建议 Cache-Control max-age=60 与 ETag） */
let configCache: CaptchaConfig | null = null
let configPromise: Promise<CaptchaConfig> | null = null
let sdkLoaded = false
let sdkLoading: Promise<void> | null = null

/** 获取人机验证配置（带模块级缓存；force=true 时强制重新拉取） */
export async function getCaptchaConfigCached(force = false): Promise<CaptchaConfig> {
    if (configCache && !force) {
        return configCache
    }
    if (configPromise) {
        return configPromise
    }
    configPromise = getCaptchaConfig()
        .then((config) => {
            configCache = config
            return config
        })
        .finally(() => {
            configPromise = null
        })
    return configPromise
}

/** 判断某动作当前是否需要人机验证 */
export function isCaptchaRequiredFor(config: CaptchaConfig | null | undefined, action: CaptchaAction): boolean {
    if (!config || !config.enabled) {
        return false
    }
    const actionConfig: CaptchaActionConfig | undefined = config.actions?.[action]
    return !!actionConfig?.enabled
}

/** 加载 SDK 脚本（scriptUrl 由后端下发；只加载一次） */
export function loadCaptchaSdk(scriptUrl: string): Promise<void> {
    if (sdkLoaded) {
        return Promise.resolve()
    }
    if (sdkLoading) {
        return sdkLoading
    }
    sdkLoading = new Promise<void>((resolve, reject) => {
        const script = document.createElement('script')
        script.src = scriptUrl
        script.async = true
        script.onload = () => {
            sdkLoaded = true
            resolve()
        }
        script.onerror = () => {
            sdkLoading = null
            reject(new Error('人机验证 SDK 加载失败'))
        }
        document.head.appendChild(script)
    })
    return sdkLoading
}

/** 各 provider 的 widget 渲染回调键名 */
type WidgetApi = 'turnstile' | 'hcaptcha' | 'recaptcha' | 'geetest'

interface SolvedWidget {
    /** 重置 widget（expired / invalid 后恢复） */
    reset: () => void
}

/** 渲染 widget 并等待 token；resolve(null) 表示该动作无需人机验证 */
async function renderWidget(
    config: CaptchaConfig,
    action: CaptchaAction,
    el: HTMLElement | null,
    onDemand = false
): Promise<{headers: CaptchaHeaders; widget: SolvedWidget} | null> {
    if (!config.enabled) {
        return null
    }
    const actionConfig = config.actions?.[action]
    if (!actionConfig?.enabled) {
        return null
    }
    if (actionConfig.mode === 'onDemand' && !onDemand) {
        return null
    }
    const provider = (config.provider ?? 'turnstile') as WidgetApi
    if (!config.scriptUrl || !config.siteKey) {
        throw new Error('后端未下发行人机验证配置（scriptUrl/siteKey）')
    }
    if (!el) {
        throw new Error('缺少人机验证挂载容器')
    }
    // 清空容器避免重复渲染
    el.innerHTML = ''

    await loadCaptchaSdk(config.scriptUrl)

    return new Promise<{headers: CaptchaHeaders; widget: SolvedWidget} | null>((resolve, reject) => {
        const common = {
            sitekey: config.siteKey,
            ...(config.options ?? {})
        }
        const finish = (token: string, reset: () => void) => {
            const headers: CaptchaHeaders = {
                'X-Captcha-Token': token,
                'X-Captcha-Provider': provider,
                'X-Captcha-Action': action,
                'X-Captcha-Config-Version': String(config.configVersion ?? '')
            }
            resolve({headers, widget: {reset}})
        }

        const fail = (err: unknown) => reject(err instanceof Error ? err : new Error('人机验证失败，请重试'))

        switch (provider) {
            case 'turnstile': {
                if (!window.turnstile) {
                    fail(new Error('Turnstile SDK 未就绪'))
                    return
                }
                const widgetId = window.turnstile.render(el, {
                    ...common,
                    callback: (token: string) => finish(token, () => window.turnstile?.reset(widgetId)),
                    'expired-callback': () => {},
                    'error-callback': () => {}
                })
                break
            }
            case 'hcaptcha': {
                if (!window.hcaptcha) {
                    fail(new Error('hCaptcha SDK 未就绪'))
                    return
                }
                const widgetId = window.hcaptcha.render(el, {
                    ...common,
                    callback: (token: string) => finish(token, () => window.hcaptcha?.reset(widgetId))
                })
                break
            }
            case 'recaptcha': {
                if (!window.grecaptcha) {
                    fail(new Error('reCAPTCHA SDK 未就绪'))
                    return
                }
                const widgetId = window.grecaptcha.render(el, {
                    ...common,
                    callback: (token: string) => finish(token, () => window.grecaptcha?.reset(widgetId))
                })
                break
            }
            case 'geetest': {
                // 极验 4：product=bind 内嵌渲染，token 取 getValidate() 的四段拼接
                if (!window.initGeetest4) {
                    fail(new Error('极验 SDK 未就绪'))
                    return
                }
                window.initGeetest4(
                    {
                        captchaId: config.siteKey,
                        product: 'bind',
                        ...(config.options ?? {})
                    },
                    (captcha) => {
                        captcha.appendTo?.(el)
                        captcha.onReady?.(() => {})
                        captcha.onSuccess?.(() => {
                            const validate = captcha.getValidate?.() as Record<string, unknown> | undefined
                            if (validate) {
                                const token = [
                                    validate.lot_number,
                                    validate.captcha_output,
                                    validate.pass_token,
                                    validate.gen_time
                                ].join('||')
                                finish(token, () => captcha.reset?.())
                            } else {
                                fail(new Error('极验验证结果缺失'))
                            }
                        })
                        captcha.onError?.(() => fail(new Error('人机验证失败，请重试')))
                    }
                )
                break
            }
            default:
                fail(new Error(`暂不支持该人机验证服务商：${provider}`))
        }
    })
}

export interface CaptchaController {
    /** 判断该动作当前是否需要人机验证 */
    needed: (action: CaptchaAction) => Promise<boolean>
    /** 渲染 widget 并获取请求头；不需要时返回 null */
    solve: (action: CaptchaAction, el: HTMLElement | null, onDemand?: boolean) => Promise<CaptchaHeaders | null>
    /** 强制重新拉取配置（开关切换竞态后调用） */
    refreshConfig: () => Promise<CaptchaConfig>
}

export function useCaptcha(): CaptchaController {
    return {
        needed: async (action) => {
            const config = await getCaptchaConfigCached()
            return isCaptchaRequiredFor(config, action)
        },
        solve: async (action, el, onDemand = false) => {
            const config = await getCaptchaConfigCached()
            const result = await renderWidget(config, action, el, onDemand)
            return result?.headers ?? null
        },
        refreshConfig: () => getCaptchaConfigCached(true)
    }
}

/**
 * 表单提交包装器：自动携带人机验证请求头，并按文档约定处理错误重试：
 * - CaptchaMissing / CaptchaExpired / CaptchaInvalid → 重新拉取配置、重置 widget、自动重试一次（不清空表单）
 * - CaptchaRequired（onDemand）→ 强制弹出 widget，完成后自动重试原请求
 */
export async function withCaptcha(
    action: CaptchaAction,
    getElement: () => HTMLElement | null,
    fn: (headers?: CaptchaHeaders) => Promise<void>
): Promise<void> {
    let config = await getCaptchaConfigCached()
    let retried = false

    // 定时轮询检查 widget 容器是否挂载（Vue 渲染完成后才有元素）
    const waitForElement = (): Promise<HTMLElement | null> =>
        new Promise((resolve) => {
            const el = getElement()
            if (el) {
                resolve(el)
                return
            }
            let tries = 0
            const timer = window.setInterval(() => {
                tries += 1
                const current = getElement()
                if (current || tries > 20) {
                    window.clearInterval(timer)
                    resolve(current)
                }
            }, 50)
        })

    for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
            const el = await waitForElement()
            if (retried) {
                // 重试路径：后端已索要验证（CaptchaRequired），强制渲染 widget 并携带 token
                const result = await renderWidget(config, action, el, true)
                await fn(result?.headers)
                return
            }
            // 常规路径：按配置决定是否需要人机验证
            if (isCaptchaRequiredFor(config, action)) {
                const result = await renderWidget(config, action, el)
                await fn(result?.headers)
                return
            }
            await fn()
            return
        } catch (error) {
            const code = extractErrorCode(error)
            // 开关切换竞态（CaptchaMissing 等）或 onDemand 临时索要（CaptchaRequired）：
            // 重新拉取配置，自动重试一次（保留表单数据）
            if ((isCaptchaError(error) || code === 'CaptchaRequired') && !retried) {
                retried = true
                config = await getCaptchaConfigCached(true)
                continue
            }
            throw error
        }
    }
    throw new Error('人机验证重试次数过多，请稍后再试')
}