import OpenAI from 'openai'
import type { CustomApiConfig } from '../types'

const OPENAI_TIMEOUT = parseInt(process.env.OPENAI_TIMEOUT || '600000', 10)
const CUSTOM_API_URL = process.env.CUSTOM_API_URL?.trim()
const CUSTOM_API_KEY = process.env.CUSTOM_API_KEY?.trim()

interface OpenAIBaseConfig {
  timeout: number
  defaultHeaders: {
    'User-Agent': string
  }
}

function createBaseConfig(): OpenAIBaseConfig {
  return {
    timeout: OPENAI_TIMEOUT,
    defaultHeaders: {
      'User-Agent': 'ManimCat/1.0'
    }
  }
}

export function createDefaultOpenAIClient(): OpenAI {
  const baseConfig = createBaseConfig()
  if (CUSTOM_API_URL) {
    const apiKey = CUSTOM_API_KEY || process.env.OPENAI_API_KEY?.trim()
    if (!apiKey) {
      throw new Error('CUSTOM_API_KEY (or OPENAI_API_KEY) is missing for custom default OpenAI client')
    }
    return new OpenAI({
      ...baseConfig,
      baseURL: CUSTOM_API_URL.replace(/\/+$/, ''),
      apiKey
    })
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is missing for default OpenAI client')
  }
  return new OpenAI({
    ...baseConfig,
    apiKey
  })
}

export function createCustomOpenAIClient(config: CustomApiConfig): OpenAI {
  return new OpenAI({
    ...createBaseConfig(),
    baseURL: config.apiUrl.trim().replace(/\/+$/, ''),
    apiKey: config.apiKey
  })
}

export function initializeDefaultOpenAIClient(
  onError?: (error: unknown) => void
): OpenAI | null {
  if (CUSTOM_API_URL) {
    const apiKey = CUSTOM_API_KEY || process.env.OPENAI_API_KEY?.trim()
    if (!apiKey) {
      return null
    }
  } else {
    const apiKey = process.env.OPENAI_API_KEY?.trim()
    if (!apiKey) {
      return null
    }
  }

  try {
    return createDefaultOpenAIClient()
  } catch (error) {
    onError?.(error)
    return null
  }
}
