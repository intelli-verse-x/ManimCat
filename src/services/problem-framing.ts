import { createCustomOpenAIClient } from './openai-client-factory'
import { createChatCompletionText } from './openai-stream'
import { buildTokenParams } from '../utils/reasoning-model'
import { createLogger } from '../utils/logger'
import type { CustomApiConfig, PromptLocale } from '../types'

const logger = createLogger('ProblemFraming')

const PLANNER_TEMPERATURE = parseFloat(process.env.PROBLEM_FRAMING_TEMPERATURE || '0.7')
const PLANNER_MAX_TOKENS = parseInt(process.env.PROBLEM_FRAMING_MAX_TOKENS || '2400', 10)
const PLANNER_THINKING_TOKENS = parseInt(process.env.PROBLEM_FRAMING_THINKING_TOKENS || '4000', 10)

export interface ProblemFramingStep {
  title: string
  content: string
}

export interface ProblemFramingPlan {
  mode: 'clarify' | 'invent'
  headline: string
  summary: string
  steps: ProblemFramingStep[]
  visualMotif: string
  designerHint: string
}

interface ProblemFramingParams {
  concept: string
  feedback?: string
  currentPlan?: ProblemFramingPlan
  customApiConfig: CustomApiConfig
  locale?: PromptLocale
}

const PATTERN_GUIDE = [
  '隐喻与类比 / Metaphor & Analogy',
  '构造与拆解 / Construction & Decomposition',
  '变形与等价 / Transformation & Equivalence',
  '互动与探索 / Interaction & Exploration',
  '反例与边界 / Counterexample & Boundary'
].join('\n')

function getSystemPrompt(locale: PromptLocale): string {
  if (locale === 'en-US') {
    return [
      'You are Problem Framing, the visible first stage of an animation workflow.',
      'Your job is not to design shots and not to write code.',
      'Your job is to turn a raw user concept into a concise, visualizable plan card.',
      'If the user already gave a detailed scheme, choose mode "clarify".',
      'If the user only gave a concept, choose mode "invent".',
      'Prefer one or two of these classic approaches when useful:',
      PATTERN_GUIDE,
      'Return strict JSON only. No markdown fences. No extra commentary.',
      'The JSON schema is:',
      '{"mode":"clarify|invent","headline":"string","summary":"string","steps":[{"title":"string","content":"string"}],"visualMotif":"string","designerHint":"string"}',
      'Rules:',
      '- Follow the few-shot style directly.',
      '- "steps" means visual-planning cards, but the writing style should follow the example more than the label.',
      '- Keep 3 to 5 cards.',
      '- If the user only gives a concept like "Lebesgue integral", directly generate the visual-planning paragraphs yourself.',
      '- Preserve concrete formulas, symbols, animation cues, and action details when they are useful.',
      '- Do not use markdown bullets, headings, or separators like "---". Turn the material into plain paragraphs.',
      '- Do not say "original note", "rewrite", or explain how you organized it.',
      '- Never mention JSON, schema, or internal reasoning.',
      'Concrete example:',
      'Input concept: Lebesgue integral',
      'Output shape: 5 visual-planning cards written as plain paragraphs.',
      'Core analogy: two ways of counting money. This is the most famous and direct analogy for explaining the Lebesgue integral. Riemann integral, the loose-change method: there is a pile of coins in front of you, and you count them in the order they lie on the floor, one after another: 0.1, 0.5, 1.0, 0.1, and so on, then add them up. Lebesgue integral, the grouping method: first gather all coins with the same value together, then compute 0.1 × (number of 0.1 coins) + 0.5 × (number of 0.5 coins) + 1.0 × (number of 1.0 coins). Animation cue: on the left side, show the Riemann method with a scanning line moving from left to right and accumulating one point at a time. On the right side, show the Lebesgue method where equal values are pulled together from the value axis and form several clusters.',
      'Vertical partition versus horizontal partition. This is the visual core of the animation. Act one: the limitation of the Riemann integral. Show a function f(x). Partition the x-axis, which is the domain, by Δx. Form narrow vertical rectangles. Act two: the innovation of the Lebesgue integral. Show the same function again. Shift the focus to the y-axis, which is the value range. Partition the y-axis by Δy. Draw horizontal slices. Each horizontal slice corresponds to a series of scattered intervals or point sets on the x-axis. Visual focus: project those horizontal slices back onto the x-axis and emphasize the measure of those regions, meaning the total length.',
      'Measure. This is the key reason the Lebesgue integral is more powerful than the Riemann integral. Animation details: 1. Pick a small interval [y_i, y_{i+1}] on the y-axis. 2. Find all x-points satisfying y_i ≤ f(x) < y_{i+1}. 3. On the x-axis, those points may not form one continuous interval, but many broken short segments or even point clouds. 4. Dynamic effect: compress or translate those separated pieces together and merge them into one length. That merged length is the measure m(E_i). 5. Compute the area as y_i × m(E_i).',
      'Dirichlet function. This is the ultimate challenge for showing where the Riemann integral fails. Let D(x) = 1 if x is rational and D(x) = 0 if x is irrational. In the Riemann view, the graph is nothing but points jumping up and down. No matter how the x-axis is partitioned, every tiny interval still contains both rational and irrational numbers, so the rectangle height cannot be fixed and the sum cannot be formed. In the Lebesgue view, the value range has only two points, 0 and 1. The set at y = 1 is the rational set, whose measure is 0. The set at y = 0 is the irrational set, whose measure on [0,1] is 1. The result is 1 × 0 + 0 × 1 = 0. Animation effect: rational points flicker densely, even though their area is zero, while irrational points spread like a filled background.',
      'Simple functions. The formal definition of the Lebesgue integral comes from approximation by a sequence of simple functions. Show a more complex continuous function. Cover it with a series of step-like functions, but do not distribute those steps uniformly along the x-axis. Build them from horizontal layers based on y-values. As the y-axis partition becomes finer and finer, those horizontal color bands cling more and more closely to the original curve.'
    ].join('\n\n')
  }

  return [
    '你是 Problem Framing，是动画工作流中面向用户可见的第一层。',
    '你的任务不是设计镜头，也不是写代码。',
    '你的任务是把用户的原始概念整理成一张简洁、可视化导向的计划卡片。',
    '如果用户已经给了详细方案，输出 mode="clarify"。',
    '如果用户只给了概念，输出 mode="invent"。',
    '必要时优先借用这些经典思路中的 1 到 2 种：',
    PATTERN_GUIDE,
    '必须只输出严格 JSON，不要 markdown，不要解释，不要额外文字。',
    'JSON 结构如下：',
    '{"mode":"clarify|invent","headline":"字符串","summary":"字符串","steps":[{"title":"字符串","content":"字符串"}],"visualMotif":"字符串","designerHint":"字符串"}',
    '规则：',
    '- 直接按 few-shot 的风格来写。',
    '- steps 表示画面规划卡片，但写法优先模仿示例本身。',
    '- steps 输出 3 到 5 条。',
    '- 如果用户只给了一个概念，比如“勒贝格积分”，你也要自己直接生成这些画面规划段落。',
    '- 公式、符号、动作细节、动画提示能保留就保留，不要随便压缩掉。',
    '- 不要使用 markdown 标题、项目符号、分隔线。全部改写成普通段落。',
    '- 不要写“原始说明”“整理后的写法”“这一段可以这样表达”之类的话。',
    '- 不要提 JSON、schema、内部推理。',
    '具体示例：',
    '输入概念：勒贝格积分',
    '输出形态：5 组画面规划卡片，全部写成普通段落。',
    '核心类比：数钱的两种方法。这是解释勒贝格积分最著名的直白比喻。黎曼积分（散钱法）：你面前有一堆硬币。你按照硬币在地板上摆放的顺序，一个接一个地数：1角、5角、1元、1角……最后加总。勒贝格积分（分类法）：你先把所有同面值的硬币堆在一起：所有的1角聚成一堆，所有的5角聚成一堆，所有的1元聚成一堆。然后：0.1 ×（1角的个数）+ 0.5 ×（5角的个数）+ 1.0 ×（1元的个数）。动画演示：屏幕左侧显示黎曼方式：扫描线从左到右，逐个点累加高度。屏幕右侧显示勒贝格方式：从纵轴出发，相同高度的值被“拉”到一起，形成几簇。',
    '纵轴划分 vs 横轴划分（几何直观）。这是动画的视觉核心。第一幕：黎曼积分的局限。展示一个函数 f(x)。展示对 x 轴（定义域）进行分割（Δx）。形成垂直的矩形窄条。第二幕：勒贝格积分的创新。展示同一个函数。重点转向 y 轴（值域）。对 y 轴进行分割（Δy）。画出水平的切片。每一层水平切片对应 x 轴上一系列离散的区间或点集。视觉重点：让这些水平切片“投影”回 x 轴，强调这些区域的“测度”（Measure，即长度的总和）。',
    '如何说明“测度”（Measure）的概念。这是由于勒贝格积分比黎曼积分更强大的关键。动画细节：1. 选取 y 轴上的一个小区间 [y_i, y_{i+1}]。2. 寻找满足 y_i ≤ f(x) < y_{i+1} 的所有 x 点。3. 在 x 轴上，这些点可能不是一个连续的区间，而是很多破碎的小线段甚至点阵。4. 动态效果：将这些分散的部分“挤压”或“平移”到一起，合并成一段长度。这个合并后的长度就是测度 m(E_i)。5. 计算面积：y_i × m(E_i)。',
    '终极挑战：迪里赫特函数（Dirichlet Function）。为了证明勒贝格积分的优越性，必须展示黎曼积分失效的地方。函数：D(x) = 1（如果 x 是有理数），D(x) = 0（如果 x 是无理数）。黎曼视角：函数图像全是点，上下跳跃。无论如何分割 x 轴，每个小区间内都有有理数和无理数，矩形高度无法确定，无法求和。勒贝格视角：值域只有两个点：0 和 1。y=1 对应的 x 集合是有理数集，其测度（长度）为 0。y=0 对应的 x 集合是无理数集，其在 [0,1] 上的测度为 1。结果：1 × 0 + 0 × 1 = 0。动画效果：展示有理数点在闪烁（虽然它们稠密但面积为0），展示无理数点“铺满”了底色。这种视觉冲击力非常强。',
    '逼近过程：简单函数（Simple Functions）。勒贝格积分的正式定义是通过“简单函数”序列渐进收敛得到的。动画演示：展示一个复杂的连续函数。用一系列“阶梯状”的函数去覆盖它。但这里的阶梯不是均匀分布在 x 轴上的，而是根据 y 值的水平分层。随着 y 轴分割越来越细，这些水平色块越来越贴合原曲线。'
  ].join('\n\n')
}

function getUserPrompt(
  concept: string,
  feedback: string | undefined,
  currentPlan: ProblemFramingPlan | undefined,
  locale: PromptLocale
): string {
  const currentPlanText = currentPlan ? JSON.stringify(currentPlan, null, 2) : ''
  if (locale === 'en-US') {
    return [
      `Concept:\n${concept}`,
      feedback ? `Adjustment request:\n${feedback}` : '',
      currentPlanText ? `Current plan to revise:\n${currentPlanText}` : '',
      'Generate the next problem-framing card now.'
    ]
      .filter(Boolean)
      .join('\n\n')
  }

  return [
    `用户概念：\n${concept}`,
    feedback ? `用户这次的调整意见：\n${feedback}` : '',
    currentPlanText ? `当前方案（请在此基础上调整，而不是完全跑题）：\n${currentPlanText}` : '',
    '现在请输出新的 problem-framing 卡片。'
  ]
    .filter(Boolean)
    .join('\n\n')
}

function stripCodeFence(text: string): string {
  return text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
}

function extractJsonObject(text: string): string {
  const cleaned = stripCodeFence(text)
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Problem framing response did not contain a JSON object')
  }

  return cleaned.slice(start, end + 1)
}

function sanitizeString(value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback
  }

  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized || fallback
}

function normalizePlan(raw: unknown, locale: PromptLocale): ProblemFramingPlan {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Problem framing response was not an object')
  }

  const input = raw as {
    mode?: unknown
    headline?: unknown
    summary?: unknown
    steps?: unknown
    visualMotif?: unknown
    visual_motif?: unknown
    designerHint?: unknown
    designer_hint?: unknown
  }

  const fallbackStepTitle = locale === 'en-US' ? 'Step' : '步骤'
  const fallbackStepContent =
    locale === 'en-US'
      ? 'Continue clarifying the visual direction and storytelling order for this part.'
      : '继续细化这一段的可视化表达和叙事顺序。'
  const fallbackHeadline = locale === 'en-US' ? 'A fresh visualization plan' : '新的可视化方案'
  const fallbackSummary = locale === 'en-US' ? 'The expression path has been organized more clearly.' : '整理出一个更清晰的表达路径。'
  const fallbackMotif = locale === 'en-US' ? 'Cat paws are sorting the steps across the card.' : '猫爪在卡片上整理出步骤。'
  const fallbackHint = locale === 'en-US' ? 'The next designer stage should expand these three steps into concrete animation design.' : '下一阶段继续把三步扩成具体动画设计。'

  const steps = Array.isArray(input.steps) ? input.steps : []
  const normalizedSteps = steps
    .slice(0, 5)
    .map((step, index) => {
      const item = step && typeof step === 'object' ? step as { title?: unknown; content?: unknown } : {}
      return {
        title: sanitizeString(item.title, `${fallbackStepTitle} ${index + 1}`),
        content: sanitizeString(item.content, '')
      }
    })
    .filter((step) => step.content)

  while (normalizedSteps.length < 3) {
    normalizedSteps.push({
      title: `${fallbackStepTitle} ${normalizedSteps.length + 1}`,
      content: fallbackStepContent
    })
  }

  return {
    mode: input.mode === 'clarify' ? 'clarify' : 'invent',
    headline: sanitizeString(input.headline, fallbackHeadline),
    summary: sanitizeString(input.summary, fallbackSummary),
    steps: normalizedSteps,
    visualMotif: sanitizeString(input.visualMotif ?? input.visual_motif, fallbackMotif),
    designerHint: sanitizeString(input.designerHint ?? input.designer_hint, fallbackHint)
  }
}

export async function generateProblemFramingPlan(params: ProblemFramingParams): Promise<ProblemFramingPlan> {
  const locale = params.locale === 'en-US' ? 'en-US' : 'zh-CN'
  const client = createCustomOpenAIClient(params.customApiConfig)
  const model = (params.customApiConfig.model || '').trim()

  if (!model) {
    throw new Error('No model available')
  }

  logger.info('Problem framing started', {
    locale,
    conceptLength: params.concept.length,
    hasFeedback: !!params.feedback,
    hasCurrentPlan: !!params.currentPlan
  })

  const response = await createChatCompletionText(
    client,
    {
      model,
      messages: [
        { role: 'system', content: getSystemPrompt(locale) },
        { role: 'user', content: getUserPrompt(params.concept, params.feedback, params.currentPlan, locale) }
      ],
      temperature: PLANNER_TEMPERATURE,
      ...buildTokenParams(PLANNER_THINKING_TOKENS, PLANNER_MAX_TOKENS)
    },
    { fallbackToNonStream: true, usageLabel: 'problem-framing' }
  )

  const parsed = JSON.parse(extractJsonObject(response.content))
  const plan = normalizePlan(parsed, locale)

  logger.info('Problem framing completed', {
    mode: plan.mode,
    headline: plan.headline,
    stepCount: plan.steps.length
  })

  return plan
}
