import OpenAI from 'openai'
import { createLogger } from '../../utils/logger'
import { cleanManimCode } from '../../utils/manim-code-cleaner'
import { getClient } from './client'
import type { CodeRetryContext } from './types'
import { buildRetryPrompt, getCodeRetrySystemPrompt } from './prompt-builder'
import { dedupeSharedBlocksInMessages } from '../prompt-dedup'
import { createChatCompletionText } from '../openai-stream'
import { buildTokenParams } from '../../utils/reasoning-model'
import { applyPatchToCode, extractTargetLine, parsePatchResponse } from './utils'

const logger = createLogger('CodeRetryCodeGen')

const AI_TEMPERATURE = parseFloat(process.env.AI_TEMPERATURE || '0.7')
const MAX_TOKENS = parseInt(process.env.AI_MAX_TOKENS || '12000', 10)
const THINKING_TOKENS = parseInt(process.env.AI_THINKING_TOKENS || '20000', 10)

function getModel(customApiConfig?: unknown): string {
  const model = (customApiConfig as { model?: string } | undefined)?.model
  const trimmed = model?.trim() || ''
  if (!trimmed) {
    throw new Error('No model available')
  }
  return trimmed
}

export async function retryCodeGeneration(
  context: CodeRetryContext,
  errorMessage: string,
  attempt: number,
  currentCode: string,
  codeSnippet: string | undefined,
  customApiConfig?: unknown
): Promise<string> {
  const client = getClient(customApiConfig as any)
  if (!client) {
    throw new Error('No upstream AI is configured for this request')
  }

  const retryPrompt = buildRetryPrompt(context, errorMessage, attempt, currentCode, codeSnippet)

  try {
    const requestMessages = dedupeSharedBlocksInMessages(
      [
        { role: 'system', content: getCodeRetrySystemPrompt(context.promptOverrides) },
        { role: 'user', content: retryPrompt }
      ],
      context.promptOverrides
    )

    const { content, mode } = await createChatCompletionText(
      client,
      {
        model: getModel(customApiConfig),
        messages: requestMessages,
        temperature: AI_TEMPERATURE,
        ...buildTokenParams(THINKING_TOKENS, MAX_TOKENS)
      },
      { fallbackToNonStream: true, usageLabel: `retry-${attempt}` }
    )

    if (!content) {
      throw new Error('AI returned empty content')
    }

    const patch = parsePatchResponse(content)
    const patchedCode = applyPatchToCode(currentCode, patch, extractTargetLine(errorMessage))
    const cleaned = cleanManimCode(patchedCode)

    logger.info('Code retry patch applied', {
      concept: context.concept,
      attempt,
      mode,
      codeLength: cleaned.code.length,
      originalSnippetLength: patch.originalSnippet.length,
      replacementSnippetLength: patch.replacementSnippet.length
    })

    return cleaned.code
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      logger.error('OpenAI API error during code retry', {
        attempt,
        status: error.status,
        message: error.message
      })
    }
    throw error
  }
}
