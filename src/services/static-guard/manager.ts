import { createLogger } from '../../utils/logger'
import { createChatCompletionText } from '../openai-stream'
import { createCustomOpenAIClient } from '../openai-client-factory'
import { buildTokenParams } from '../../utils/reasoning-model'
import type { CustomApiConfig } from '../../types'
import type { StaticDiagnostic, StaticGuardContext, StaticGuardResult, StaticPatch } from './types'
import { buildStaticPatchUserPrompt, getStaticPatchSystemPrompt } from './prompt'
import { runStaticChecks } from './checker'

const logger = createLogger('StaticGuardManager')

const STATIC_GUARD_MAX_PASSES = parseInt(process.env.STATIC_GUARD_MAX_PASSES || '6', 10)
const STATIC_GUARD_TEMPERATURE = parseFloat(process.env.STATIC_GUARD_TEMPERATURE || '0.2')
const MAX_TOKENS = parseInt(process.env.AI_MAX_TOKENS || '12000', 10)
const THINKING_TOKENS = parseInt(process.env.AI_THINKING_TOKENS || '20000', 10)

function extractJsonObject(text: string): string {
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim()
  }

  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start >= 0 && end > start) {
    return text.slice(start, end + 1)
  }

  return text.trim()
}

function parsePatchResponse(content: string): StaticPatch {
  const parsed = JSON.parse(extractJsonObject(content)) as {
    original_snippet?: unknown
    replacement_snippet?: unknown
  }

  const originalSnippet = typeof parsed.original_snippet === 'string' ? parsed.original_snippet : ''
  const replacementSnippet = typeof parsed.replacement_snippet === 'string' ? parsed.replacement_snippet : ''

  if (!originalSnippet) {
    throw new Error('Static patch response missing original_snippet')
  }

  if (originalSnippet === replacementSnippet) {
    throw new Error('Static patch produced no change')
  }

  return { originalSnippet, replacementSnippet }
}

function getLineNumberAtIndex(text: string, index: number): number {
  return text.slice(0, index).split('\n').length
}

function applyPatch(code: string, patch: StaticPatch, targetLine: number): string {
  const matches: number[] = []
  let searchIndex = 0

  while (true) {
    const foundAt = code.indexOf(patch.originalSnippet, searchIndex)
    if (foundAt < 0) {
      break
    }
    matches.push(foundAt)
    searchIndex = foundAt + Math.max(1, patch.originalSnippet.length)
  }

  if (matches.length === 0) {
    throw new Error('Static patch original_snippet not found in code')
  }

  const bestIndex = matches.reduce((best, current) => {
    const bestDistance = Math.abs(getLineNumberAtIndex(code, best) - targetLine)
    const currentDistance = Math.abs(getLineNumberAtIndex(code, current) - targetLine)
    return currentDistance < bestDistance ? current : best
  })

  return `${code.slice(0, bestIndex)}${patch.replacementSnippet}${code.slice(bestIndex + patch.originalSnippet.length)}`
}

async function generateStaticPatch(
  code: string,
  diagnostic: StaticDiagnostic,
  customApiConfig: CustomApiConfig
): Promise<StaticPatch> {
  const client = createCustomOpenAIClient(customApiConfig)
  const model = (customApiConfig.model || '').trim()
  if (!model) {
    throw new Error('No model available')
  }

  const { content } = await createChatCompletionText(
    client,
    {
      model,
      messages: [
        { role: 'system', content: getStaticPatchSystemPrompt() },
        { role: 'user', content: buildStaticPatchUserPrompt(code, diagnostic) }
      ],
      temperature: STATIC_GUARD_TEMPERATURE,
      ...buildTokenParams(THINKING_TOKENS, MAX_TOKENS)
    },
    { fallbackToNonStream: true, usageLabel: 'static-guard' }
  )

  if (!content) {
    throw new Error('Static patch model returned empty content')
  }

  return parsePatchResponse(content)
}

export async function runStaticGuardLoop(
  code: string,
  context: StaticGuardContext,
  customApiConfig: CustomApiConfig,
  onCheckpoint?: () => Promise<void>
): Promise<StaticGuardResult> {
  let currentCode = code

  for (let passIndex = 1; passIndex <= STATIC_GUARD_MAX_PASSES; passIndex++) {
    logger.info('Static guard pass started', {
      passIndex,
      maxPasses: STATIC_GUARD_MAX_PASSES,
      outputMode: context.outputMode,
      codeLength: currentCode.length
    })

    if (onCheckpoint) {
      await onCheckpoint()
    }

    const diagnostic = await runStaticChecks(currentCode, context.outputMode)
    if (!diagnostic) {
      logger.info('Static guard passed', { outputMode: context.outputMode, passes: passIndex - 1 })
      return {
        code: currentCode,
        passes: passIndex - 1
      }
    }

    logger.warn('Static guard found diagnostic', {
      passIndex,
      tool: diagnostic.tool,
      line: diagnostic.line,
      code: diagnostic.code,
      message: diagnostic.message
    })

    const patch = await generateStaticPatch(currentCode, diagnostic, customApiConfig)
    currentCode = applyPatch(currentCode, patch, diagnostic.line)
    logger.info('Static guard patch applied', {
      passIndex,
      tool: diagnostic.tool,
      line: diagnostic.line,
      originalLength: patch.originalSnippet.length,
      replacementLength: patch.replacementSnippet.length
    })
  }

  throw new Error(`Static guard failed after ${STATIC_GUARD_MAX_PASSES} passes`)
}
