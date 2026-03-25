import type OpenAI from 'openai'
import type { StudioAssistantMessage, StudioMessageStore } from '../domain/types'

export interface StudioStoredAssistantToolCall {
  id?: string
  type?: 'function'
  function?: {
    name?: string
    arguments?: string
  }
  [key: string]: unknown
}

export interface StudioStoredAssistantPayload {
  content?: string | Array<Record<string, unknown>> | null
  tool_calls?: StudioStoredAssistantToolCall[]
}

export function toAssistantConversationMessage(
  message: OpenAI.Chat.Completions.ChatCompletionMessage | undefined,
  assistantText: string,
  toolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[]
): OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam {
  const normalizedToolCalls = normalizeStoredToolCalls(toolCalls)
  return {
    role: 'assistant',
    content: message?.content ?? (assistantText || null),
    tool_calls: normalizedToolCalls as OpenAI.Chat.Completions.ChatCompletionMessageToolCall[] | undefined
  }
}

export async function persistProviderMessageSnapshot(input: {
  messageStore: StudioMessageStore
  assistantMessage: StudioAssistantMessage
  providerMessage?: OpenAI.Chat.Completions.ChatCompletionMessage
}): Promise<void> {
  if (!input.providerMessage) {
    return
  }

  const metadata = {
    ...(input.assistantMessage.metadata ?? {}),
    providerMessage: buildStoredProviderMessagePayload(input.providerMessage)
  }

  input.assistantMessage.metadata = metadata
  await input.messageStore.updateAssistantMessage(input.assistantMessage.id, {
    metadata
  })
}

export function buildStoredProviderMessagePayload(
  providerMessage: OpenAI.Chat.Completions.ChatCompletionMessage
): StudioStoredAssistantPayload {
  const toolCalls = normalizeStoredToolCalls(providerMessage.tool_calls)
  return {
    content: providerMessage.content ?? null,
    tool_calls: toolCalls
  }
}
function normalizeStoredToolCalls(
  toolCalls: readonly OpenAI.Chat.Completions.ChatCompletionMessageToolCall[] | undefined
): StudioStoredAssistantToolCall[] | undefined {
  if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
    return undefined
  }
  return toolCalls.map((toolCall) => ({
    ...toolCall,
    function: {
      ...toolCall.function,
      arguments: toolCall.function.arguments
    }
  }))
}

export function summarizeConversationTailForDebug(
  conversation: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
): Array<Record<string, unknown>> {
  const tail = conversation.slice(-4)
  return tail.map((message, index) => ({
    indexFromTail: index,
    ...summarizeConversationMessageForDebug(message)
  }))
}

export function summarizeConversationMessageForDebug(
  message: OpenAI.Chat.Completions.ChatCompletionMessageParam | undefined
): Record<string, unknown> {
  if (!message) {
    return { missing: true }
  }

  const withToolCalls = message as OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam & {
    tool_call_id?: string
  }

  return {
    role: message.role,
    content: summarizeContentForDebug(withToolCalls.content),
    toolCallId: typeof withToolCalls.tool_call_id === 'string' ? withToolCalls.tool_call_id : undefined,
    toolCalls: Array.isArray(withToolCalls.tool_calls)
      ? withToolCalls.tool_calls.map(summarizeToolCallForDebug)
      : undefined,
  }
}

export function summarizeAssistantMessageForDebug(
  message: OpenAI.Chat.Completions.ChatCompletionMessage | undefined
): Record<string, unknown> {
  if (!message) {
    return { missing: true }
  }

  return {
    role: message.role,
    content: summarizeContentForDebug(message.content),
    toolCalls: Array.isArray(message.tool_calls)
      ? message.tool_calls.map(summarizeToolCallForDebug)
      : undefined,
  }
}

function summarizeContentForDebug(content: unknown): Record<string, unknown> {
  if (content === null) {
    return { kind: 'null' }
  }

  if (typeof content === 'string') {
    return {
      kind: 'string',
      length: content.length,
      preview: content.length > 120 ? `${content.slice(0, 117)}...` : content,
    }
  }

  if (Array.isArray(content)) {
    return {
      kind: 'array',
      blockCount: content.length,
      blocks: content.map((block, index) => summarizeContentBlockForDebug(block, index)),
    }
  }

  return {
    kind: typeof content,
    keys: readObjectKeys(content),
  }
}

function summarizeContentBlockForDebug(block: unknown, index: number): Record<string, unknown> {
  if (!block || typeof block !== 'object' || Array.isArray(block)) {
    return {
      index,
      kind: typeof block,
    }
  }

  const typed = block as Record<string, unknown>
  return {
    index,
    type: typeof typed.type === 'string' ? typed.type : undefined,
    keys: Object.keys(typed),
    hasThoughtSignature: 'thought_signature' in typed,
    thoughtSignatureType: typeof typed.thought_signature,
    id: typeof typed.id === 'string' ? typed.id : undefined,
    name: typeof typed.name === 'string' ? typed.name : undefined,
    callId: typeof typed.call_id === 'string' ? typed.call_id : undefined,
  }
}

function summarizeToolCallForDebug(toolCall: unknown): Record<string, unknown> {
  if (!toolCall || typeof toolCall !== 'object' || Array.isArray(toolCall)) {
    return {
      kind: typeof toolCall,
    }
  }

  const typed = toolCall as Record<string, unknown>
  const fn = typed.function && typeof typed.function === 'object' && !Array.isArray(typed.function)
    ? typed.function as Record<string, unknown>
    : undefined

  const rawArguments = typeof fn?.arguments === 'string' ? fn.arguments : undefined

  return {
    id: typeof typed.id === 'string' ? typed.id : undefined,
    type: typeof typed.type === 'string' ? typed.type : undefined,
    keys: Object.keys(typed),
    hasThoughtSignature: 'thought_signature' in typed,
    thoughtSignatureType: typeof typed.thought_signature,
    functionName: typeof fn?.name === 'string' ? fn.name : undefined,
    functionKeys: fn ? Object.keys(fn) : [],
    functionHasThoughtSignature: fn ? 'thought_signature' in fn : false,
    functionThoughtSignatureType: fn ? typeof fn.thought_signature : 'undefined',
    argumentsLength: rawArguments?.length ?? 0,
    argumentsPreview: rawArguments && rawArguments.length > 160 ? `${rawArguments.slice(0, 157)}...` : rawArguments,
  }
}

function readObjectKeys(value: unknown): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return []
  }
  return Object.keys(value as Record<string, unknown>)
}




