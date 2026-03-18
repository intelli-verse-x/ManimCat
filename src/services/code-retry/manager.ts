import { createLogger } from '../../utils/logger'
import type {
  CodeRetryOptions,
  CodeRetryResult,
  RenderResult,
  RetryManagerResult,
  ChatMessage,
  CodeRetryContext
} from './types'
import type { OutputMode, PromptOverrides } from '../../types'
import { extractErrorMessage, getErrorType } from './utils'
import { buildContextOriginalPrompt } from './prompt-builder'
import { generateInitialCode, retryCodeGeneration } from './code-generation'

const logger = createLogger('CodeRetryManager')

const MAX_RETRIES = parseInt(process.env.CODE_RETRY_MAX_RETRIES || '4', 10)

export function createRetryContext(
  concept: string,
  sceneDesign: string,
  promptOverrides?: PromptOverrides,
  outputMode: OutputMode = 'video'
): CodeRetryContext {
  return {
    concept,
    sceneDesign,
    outputMode,
    originalPrompt: buildContextOriginalPrompt(concept, sceneDesign, outputMode, promptOverrides),
    promptOverrides
  }
}

export { buildRetryFixPrompt } from './prompt-builder'

export async function executeCodeRetry(
  context: CodeRetryContext,
  renderer: (code: string) => Promise<RenderResult>,
  customApiConfig?: any,
  initialCode?: string,
  onRenderFailure?: (event: {
    attempt: number
    code: string
    codeSnippet?: string
    stderr: string
    stdout: string
    peakMemoryMB: number
    exitCode?: number
  }) => Promise<void> | void
): Promise<RetryManagerResult> {
  logger.info('开始代码重试管理', {
    concept: context.concept,
    maxRetries: MAX_RETRIES
  })

  let generationTimeMs = 0
  let currentCode = initialCode?.trim() || ''
  if (!currentCode) {
    const generationStart = Date.now()
    currentCode = await generateInitialCode(context, customApiConfig)
    generationTimeMs += Date.now() - generationStart
  }

  let renderResult = await renderer(currentCode)

  if (renderResult.success) {
    logger.info('首次渲染成功')
    return { code: currentCode, success: true, attempts: 1, generationTimeMs }
  }

  if (onRenderFailure) {
    try {
      await onRenderFailure({
        attempt: 1,
        code: currentCode,
        codeSnippet: renderResult.codeSnippet || currentCode,
        stderr: renderResult.stderr,
        stdout: renderResult.stdout,
        peakMemoryMB: renderResult.peakMemoryMB,
        exitCode: renderResult.exitCode
      })
    } catch (error) {
      logger.warn('onRenderFailure callback failed', { attempt: 1, error: String(error) })
    }
  }

  let errorMessage = extractErrorMessage(renderResult.stderr)
  let errorType = getErrorType(renderResult.stderr)
  logger.warn('首次渲染失败', { errorType, error: errorMessage })

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    logger.info(`开始第 ${attempt} 次重试`, {
      totalAttempts: attempt + 1,
      errorType,
      error: errorMessage
    })

    try {
      const generationStart = Date.now()
      currentCode = await retryCodeGeneration(context, errorMessage, attempt, currentCode, customApiConfig)
      generationTimeMs += Date.now() - generationStart

      renderResult = await renderer(currentCode)

      if (renderResult.success) {
        logger.info('重试渲染成功', { attempt: attempt + 1 })
        return { code: currentCode, success: true, attempts: attempt + 1, generationTimeMs }
      }

      if (onRenderFailure) {
        try {
          await onRenderFailure({
            attempt: attempt + 1,
            code: currentCode,
            codeSnippet: renderResult.codeSnippet || currentCode,
            stderr: renderResult.stderr,
            stdout: renderResult.stdout,
            peakMemoryMB: renderResult.peakMemoryMB,
            exitCode: renderResult.exitCode
          })
        } catch (error) {
          logger.warn('onRenderFailure callback failed', { attempt: attempt + 1, error: String(error) })
        }
      }

      errorMessage = extractErrorMessage(renderResult.stderr)
      errorType = getErrorType(renderResult.stderr)
      logger.warn('重试渲染失败', { attempt: attempt + 1, errorType, error: errorMessage })
    } catch (error) {
      logger.error('重试过程出错', { attempt: attempt + 1, error: String(error) })
    }
  }

  logger.error('所有重试均失败', {
    totalAttempts: MAX_RETRIES + 1,
    finalError: extractErrorMessage(renderResult.stderr)
  })

  return {
    code: currentCode,
    success: false,
    attempts: MAX_RETRIES + 1,
    generationTimeMs,
    lastError: extractErrorMessage(renderResult.stderr)
  }
}

export type {
  CodeRetryOptions,
  CodeRetryResult,
  RenderResult,
  RetryManagerResult,
  ChatMessage,
  CodeRetryContext
} from './types'
