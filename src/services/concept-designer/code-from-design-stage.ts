import OpenAI from 'openai'
import { createLogger } from '../../utils/logger'
import { generateCodeGenerationPrompt, getRoleSystemPrompt } from '../../prompts'
import type { OutputMode, PromptOverrides } from '../../types'
import {
  applyPromptTemplate,
  buildCompletionDiagnostics,
  extractCodeFromResponse,
  generateUniqueSeed,
  normalizeMessageContent
} from '../concept-designer-utils'
import { createChatCompletionText } from '../openai-stream'
import { buildTokenParams } from '../../utils/reasoning-model'
import { JobCancelledError } from '../../utils/errors'
import {
  computeOutputBudget,
  estimateMessagesTokens,
  estimateTokens,
  getMinOutputTokens,
  getModelMaxContext,
  getSafetyMargin,
  isContextLengthError,
  logBudgetDecision,
  truncateMiddle,
} from '../../utils/token-budget'

const logger = createLogger('CodeFromDesignStage')

interface CodeFromDesignStageParams {
  client: OpenAI
  concept: string
  outputMode: OutputMode
  sceneDesign: string
  model: string
  promptOverrides?: PromptOverrides
  coderTemperature: number
  maxTokens: number
  thinkingTokens: number
  onCheckpoint?: () => Promise<void>
}

/**
 * 阶段2：代码生成者
 * 接收场景设计方案，输出 Manim 代码
 */
export async function generateCodeFromDesignStage(params: CodeFromDesignStageParams): Promise<string> {
  const {
    client,
    concept,
    outputMode,
    sceneDesign,
    model,
    promptOverrides,
    coderTemperature,
    maxTokens,
    thinkingTokens,
    onCheckpoint
  } = params

  try {
    const seed = generateUniqueSeed(`${concept}-${sceneDesign.slice(0, 20)}`)
    const systemPrompt = getRoleSystemPrompt('codeGeneration', promptOverrides)
    const userPromptOverride = promptOverrides?.roles?.codeGeneration?.user
    const buildUserPrompt = (design: string) =>
      userPromptOverride
        ? applyPromptTemplate(userPromptOverride, { concept, seed, sceneDesign: design, outputMode }, promptOverrides)
        : generateCodeGenerationPrompt(concept, seed, design, outputMode)

    let activeSceneDesign = sceneDesign
    let userPrompt = buildUserPrompt(activeSceneDesign)

    logger.info('开始阶段2：根据设计方案生成代码', { concept, outputMode, seed })
    if (onCheckpoint) await onCheckpoint()

    // ---- Token budget guard ----
    // vLLM enforces `--max-model-len` (often 8192). If prompt + max_tokens
    // exceeds that, the server rejects with 400 and the whole job fails.
    // We pre-clamp the output budget here, and shrink the scene design
    // in-place if even the prompt alone won't leave room for a useful answer.
    const modelMaxContext = getModelMaxContext()
    const safetyMargin = getSafetyMargin()
    let messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]
    let estimatedInput = estimateMessagesTokens(messages)
    let budget = computeOutputBudget(estimatedInput, maxTokens + thinkingTokens, {
      modelMaxContext,
      safetyMargin,
    })
    if (budget.reason === 'prompt-too-large') {
      const overheadTokens =
        estimateTokens(systemPrompt) + estimateTokens(concept) + 32
      const designTokenBudget =
        modelMaxContext - overheadTokens - safetyMargin - getMinOutputTokens()
      const designCharBudget = Math.max(800, designTokenBudget * 3) // ~3 chars/token, conservative
      activeSceneDesign = truncateMiddle(sceneDesign, designCharBudget)
      userPrompt = buildUserPrompt(activeSceneDesign)
      messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]
      estimatedInput = estimateMessagesTokens(messages)
      budget = computeOutputBudget(estimatedInput, maxTokens + thinkingTokens, {
        modelMaxContext,
        safetyMargin,
      })
      logger.warn('Scene design truncated to fit context budget', {
        concept,
        seed,
        originalDesignChars: sceneDesign.length,
        truncatedDesignChars: activeSceneDesign.length,
        designCharBudget,
      })
    }
    logBudgetDecision('code-generation', maxTokens + thinkingTokens, budget)

    const finalThinking = Math.min(thinkingTokens, Math.max(0, budget.maxOutputTokens - getMinOutputTokens()))
    const finalOutput = Math.max(getMinOutputTokens(), budget.maxOutputTokens - finalThinking)

    const sendChat = async () =>
      createChatCompletionText(
        client,
        {
          model,
          messages,
          temperature: coderTemperature,
          ...buildTokenParams(finalThinking, finalOutput),
        },
        { fallbackToNonStream: true, usageLabel: 'code-generation' }
      )

    let completion
    try {
      completion = await sendChat()
    } catch (err) {
      // Last-resort recovery: server still says context too long. Hard-truncate
      // scene design to a tiny bullet list and retry once with a lean output cap.
      if (!isContextLengthError(err)) throw err
      logger.warn('Server reported context-length overflow; retrying with hard-truncated scene design', {
        concept,
        seed,
        estimatedInput,
        budget,
        errorMessage: err instanceof Error ? err.message : String(err),
      })
      const overheadTokens = estimateTokens(systemPrompt) + estimateTokens(concept) + 32
      const designTokens = Math.max(getMinOutputTokens(), Math.floor(modelMaxContext * 0.35))
      const retryDesign = truncateMiddle(activeSceneDesign, designTokens * 3)
      const retryPrompt = buildUserPrompt(retryDesign)
      const retryMessages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: retryPrompt },
      ]
      const retryInput = estimateMessagesTokens(retryMessages)
      const retryBudget = computeOutputBudget(retryInput, getMinOutputTokens() * 2, {
        modelMaxContext,
        safetyMargin: safetyMargin + 64,
      })
      logBudgetDecision('code-generation-retry', getMinOutputTokens() * 2, retryBudget)
      messages = retryMessages
      completion = await createChatCompletionText(
        client,
        {
          model,
          messages,
          temperature: coderTemperature,
          ...buildTokenParams(0, retryBudget.maxOutputTokens),
        },
        { fallbackToNonStream: true, usageLabel: 'code-generation-retry' }
      )
    }
    const { content, mode, response } = completion
    if (onCheckpoint) await onCheckpoint()

    const normalizedContent = normalizeMessageContent(content)
    if (!normalizedContent) {
      logger.warn('代码生成者返回空内容', {
        concept,
        seed,
        mode,
        model,
        systemPromptLength: systemPrompt.length,
        userPromptLength: userPrompt.length,
        diagnostics: response ? buildCompletionDiagnostics(response) : { mode: 'stream' }
      })
      throw new Error('Code generation stage returned empty content from AI response')
    }

    logger.info('阶段2：代码生成成功', {
      concept,
      seed,
      mode,
      codeLength: normalizedContent.length,
      codePreview: normalizedContent.slice(0, 500)
    })

    if (outputMode === 'image') {
      return normalizedContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
    }

    const extractedCode = extractCodeFromResponse(normalizedContent)
    logger.info('阶段2：代码提取完成', {
      concept,
      seed,
      extractedLength: extractedCode.length,
      extractedPreview: extractedCode.slice(0, 500)
    })
    return extractedCode
  } catch (error) {
    if (error instanceof JobCancelledError) {
      logger.warn('代码生成阶段已取消', {
        concept,
        reason: error.details
      })
      throw error
    }

    if (error instanceof OpenAI.APIError) {
      logger.error('代码生成者 API 错误', {
        concept,
        status: error.status,
        code: error.code,
        type: error.type,
        message: error.message
      })
    } else if (error instanceof Error) {
      logger.error('代码生成者失败', {
        concept,
        errorName: error.name,
        errorMessage: error.message
      })
    } else {
      logger.error('代码生成者失败（未知错误）', { concept, error: String(error) })
    }
    throw new Error(`Code generation stage failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}
