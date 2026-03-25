import type OpenAI from 'openai'
import { createLogger } from '../../utils/logger'

const logger = createLogger('StudioProviderRequest')
const DEFAULT_PROVIDER_TIMEOUT_MS = parsePositiveInteger(
  process.env.STUDIO_PROVIDER_REQUEST_TIMEOUT_MS,
  120000,
)

export async function requestStudioChatCompletion(input: {
  client: OpenAI
  model: string
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
  tools: OpenAI.Chat.Completions.ChatCompletionTool[]
  toolChoice: OpenAI.Chat.Completions.ChatCompletionToolChoiceOption
  sessionId: string
  runId: string
  step: number
  assistantMessageId: string
}): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const startedAt = Date.now()

  try {
    const completion = await input.client.chat.completions.create({
      model: input.model,
      messages: input.messages,
      tools: input.tools,
      tool_choice: input.toolChoice,
    }, {
      timeout: DEFAULT_PROVIDER_TIMEOUT_MS,
    })

    logger.info('Studio provider request completed', {
      sessionId: input.sessionId,
      runId: input.runId,
      step: input.step,
      assistantMessageId: input.assistantMessageId,
      durationMs: Date.now() - startedAt,
      timeoutMs: DEFAULT_PROVIDER_TIMEOUT_MS,
      choiceCount: completion.choices.length,
    })

    return completion
  } catch (error) {
    logger.warn('Studio provider request failed', {
      sessionId: input.sessionId,
      runId: input.runId,
      step: input.step,
      assistantMessageId: input.assistantMessageId,
      durationMs: Date.now() - startedAt,
      timeoutMs: DEFAULT_PROVIDER_TIMEOUT_MS,
      error: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : undefined,
    })
    throw error
  }
}

function parsePositiveInteger(raw: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(raw ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}
