import type { StaticDiagnostic } from './types'

function escapeJsonString(value: string): string {
  return JSON.stringify(value)
}

export function getStaticPatchSystemPrompt(): string {
  return [
    '你是一个静态修复员，只做局部替换。',
    '你的唯一任务是根据静态检查报错，返回可直接替换的原片段和新片段。',
    '优先修改最小片段；能改一行内局部就不要改整行；能改一行就不要改多行。',
    '禁止返回完整代码，禁止解释，禁止附加任何文字。',
    '只输出 JSON 对象，格式为 {"original_snippet":"...","replacement_snippet":"..."}。'
  ].join('\n')
}

export function buildStaticPatchUserPrompt(code: string, diagnostic: StaticDiagnostic): string {
  return [
    '完整代码：',
    code,
    '',
    '静态检查结果：',
    `- 工具：${diagnostic.tool}`,
    `- 错误码：${diagnostic.code || 'unknown'}`,
    `- 行号：${diagnostic.line}`,
    `- 报错信息：${diagnostic.message}`,
    '',
    '只返回 JSON：',
    `{"original_snippet":${escapeJsonString('原片段')},"replacement_snippet":${escapeJsonString('新片段')}}`
  ].join('\n')
}
