/**
 * Token budget guard for vLLM / OpenAI-compatible context-length limits.
 *
 * Why this exists:
 * Some vLLM deployments pin `--max-model-len` (e.g. 8192) for KV-cache memory
 * reasons. When prompt + requested `max_tokens` exceeds that ceiling, the
 * server returns 400 ("This model's maximum context length is N tokens. ...")
 * and the whole animation job fails. This module estimates input tokens
 * cheaply (no `tiktoken` dep), clamps the requested output budget so we never
 * cross the ceiling, and exposes a recovery path the caller can take if the
 * model still rejects us (off-by-one / undercount cases).
 *
 * Estimator notes:
 *  - We bias the estimator slightly upward so we don't undercount.
 *  - Image parts in vision messages are counted as a flat 85 tokens each
 *    (matches OpenAI vision pricing heuristic; close enough for budgeting).
 *  - The constants below are environment-overridable for tuning per cluster.
 */

import { createLogger } from './logger'

const logger = createLogger('TokenBudget')

const DEFAULT_MODEL_MAX_CONTEXT = parseInt(process.env.MODEL_MAX_CONTEXT_TOKENS || '8192', 10)
const SAFETY_MARGIN = parseInt(process.env.MODEL_CONTEXT_SAFETY_MARGIN || '128', 10)
const MIN_OUTPUT_TOKENS = parseInt(process.env.MIN_OUTPUT_TOKENS || '256', 10)
const CHARS_PER_TOKEN = parseFloat(process.env.CHARS_PER_TOKEN || '3.5')
const IMAGE_TOKEN_COST = parseInt(process.env.IMAGE_TOKEN_COST || '85', 10)

interface MessageLike {
  role: string
  content: unknown
}

export function getModelMaxContext(): number {
  return DEFAULT_MODEL_MAX_CONTEXT
}

export function getSafetyMargin(): number {
  return SAFETY_MARGIN
}

export function getMinOutputTokens(): number {
  return MIN_OUTPUT_TOKENS
}

/** Cheap token estimator (no tiktoken dep). Slightly overestimates for safety. */
export function estimateTokens(text: string): number {
  if (!text) return 0
  return Math.ceil(text.length / CHARS_PER_TOKEN) + 4
}

export function estimateMessagesTokens(messages: ReadonlyArray<MessageLike>): number {
  let total = 0
  for (const m of messages) {
    if (typeof m.content === 'string') {
      total += estimateTokens(m.content)
    } else if (Array.isArray(m.content)) {
      for (const part of m.content as Array<{ type?: string; text?: string }>) {
        if (part?.type === 'text' && typeof part.text === 'string') {
          total += estimateTokens(part.text)
        } else {
          total += IMAGE_TOKEN_COST
        }
      }
    }
    total += 4
  }
  return total + 4
}

export interface TokenBudgetResult {
  /** The output budget you should pass to `max_tokens`. */
  maxOutputTokens: number
  /** Estimated input tokens (for logging/diagnostics). */
  estimatedInputTokens: number
  /** Effective context cap used for the calculation. */
  maxContext: number
  /** True if we had to lower the requested budget. */
  clamped: boolean
  /** Human-readable reason when clamped. */
  reason?: 'reduced-output' | 'prompt-too-large'
}

/**
 * Compute a safe output-token budget given an estimated input size and a
 * caller-requested ceiling. The result never exceeds the model context cap.
 */
export function computeOutputBudget(
  estimatedInputTokens: number,
  requestedOutputTokens: number,
  options: { modelMaxContext?: number; safetyMargin?: number } = {}
): TokenBudgetResult {
  const maxContext = options.modelMaxContext ?? DEFAULT_MODEL_MAX_CONTEXT
  const safety = options.safetyMargin ?? SAFETY_MARGIN
  const available = Math.max(0, maxContext - estimatedInputTokens - safety)

  if (available >= requestedOutputTokens && requestedOutputTokens > 0) {
    return {
      maxOutputTokens: requestedOutputTokens,
      estimatedInputTokens,
      maxContext,
      clamped: false,
    }
  }

  if (available >= MIN_OUTPUT_TOKENS) {
    return {
      maxOutputTokens: available,
      estimatedInputTokens,
      maxContext,
      clamped: true,
      reason: 'reduced-output',
    }
  }

  return {
    maxOutputTokens: Math.max(MIN_OUTPUT_TOKENS, available),
    estimatedInputTokens,
    maxContext,
    clamped: true,
    reason: 'prompt-too-large',
  }
}

/** Detect vLLM / OpenAI context-length 400 errors. */
export function isContextLengthError(err: unknown): boolean {
  if (!err) return false
  if (typeof err !== 'object') return false
  const e = err as { status?: number; code?: number | string; message?: string }
  const msg = String(e.message ?? '').toLowerCase()
  const isStatus400 = e.status === 400 || e.code === 400 || e.code === '400'
  return (
    isStatus400 &&
    (msg.includes('maximum context length') ||
      msg.includes('max_model_len') ||
      msg.includes('context_length_exceeded') ||
      msg.includes('context length'))
  )
}

/**
 * Truncate a long text in the middle, preserving head + tail.
 * Used as the last-resort recovery when prompt itself is too large.
 */
export function truncateMiddle(text: string, maxChars: number, marker = '\n\n[... truncated for context budget ...]\n\n'): string {
  if (!text) return text
  if (text.length <= maxChars) return text
  const usable = Math.max(0, maxChars - marker.length)
  const head = Math.floor(usable * 0.6)
  const tail = usable - head
  return `${text.slice(0, head)}${marker}${text.slice(text.length - tail)}`
}

export function logBudgetDecision(label: string, requested: number, result: TokenBudgetResult): void {
  if (!result.clamped) return
  logger.warn('Token budget clamped to fit model context', {
    stage: label,
    requestedOutputTokens: requested,
    clampedOutputTokens: result.maxOutputTokens,
    estimatedInputTokens: result.estimatedInputTokens,
    maxContext: result.maxContext,
    reason: result.reason,
  })
}
