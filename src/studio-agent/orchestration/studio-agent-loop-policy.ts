import type { StudioToolChoice } from '../domain/types'

/**
 * Studio Agent 循环动作类型
 * - continue: 继续执行下一步
 * - finish: 完成任务
 * - abort: 中止执行并返回原因
 */
export type StudioAgentLoopAction =
  | { type: 'continue' }
  | { type: 'finish' }
  | { type: 'abort'; message: string }

interface DetermineStudioAgentLoopActionInput {
  finishReason?: string | null
  toolCallCount: number
  step: number
  maxSteps: number
}

/**
 * 根据当前执行状态决定下一步动作
 * @param input - 包含完成原因、工具调用次数、当前步骤和最大步骤的输入对象
 * @returns 下一步动作（继续、完成或中止）
 */
export function determineStudioAgentLoopAction(
  input: DetermineStudioAgentLoopActionInput
): StudioAgentLoopAction {
  // 如果有工具调用，检查是否达到步骤上限
  if (input.toolCallCount > 0) {
    if (input.step + 1 >= input.maxSteps) {
      return {
        type: 'abort',
        message: `Stopped after reaching the Studio agent step limit (${input.maxSteps}).`
      }
    }

    return { type: 'continue' }
  }

  // 检查是否因输出长度限制而终止
  if (input.finishReason === 'length') {
    return {
      type: 'abort',
      message: 'Studio agent response hit the model output limit before finishing.'
    }
  }

  // 检查是否被内容过滤器拦截
  if (input.finishReason === 'content_filter') {
    return {
      type: 'abort',
      message: 'Studio agent response was blocked by the provider content filter.'
    }
  }

  // 默认完成任务
  return { type: 'finish' }
}


