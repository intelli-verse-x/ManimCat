import type { StudioToolDefinition, StudioToolResult } from '../domain/types'
import { logPlotStudioSkillTrace } from '../observability/plot-studio-skill-trace'
import type { StudioRuntimeBackedToolContext } from '../runtime/tools/tool-runtime-context'

interface SkillToolInput {
  name: string
}

export function createStudioSkillTool(): StudioToolDefinition<SkillToolInput> {
  return {
    name: 'skill',
    description: 'Load a local Studio skill into the current run context.',
    category: 'agent',
    permission: 'skill',
    allowedAgents: ['builder', 'reviewer', 'designer'],
    requiresTask: false,
    execute: async (input, context) => executeSkillTool(input, context as StudioRuntimeBackedToolContext)
  }
}

async function executeSkillTool(
  input: SkillToolInput,
  context: StudioRuntimeBackedToolContext
): Promise<StudioToolResult> {
  if (!context.resolveSkill) {
    throw new Error('Skill tool requires a skill resolver')
  }

  logPlotStudioSkillTrace(context.session.studioKind, 'skill.tool.called', {
    sessionId: context.session.id,
    runId: context.run.id,
    requestedSkillName: input.name,
    agentType: context.session.agentType,
  })

  const skill = await context.resolveSkill(input.name, context.session)
  const title = `Loaded skill: ${skill.name}`

  await context.recordSkillUsage?.({
    session: context.session,
    skillName: skill.name,
    reason: 'Skill was loaded into the current run.',
    takeaway: skill.description,
    stillRelevant: true
  })

  context.setToolMetadata?.({
    title,
    metadata: {
      skillName: skill.name,
      directory: skill.directory,
      entryFile: skill.entryFile,
      scope: skill.scope,
      tags: skill.tags
    }
  })

  logPlotStudioSkillTrace(context.session.studioKind, 'skill.tool.completed', {
    sessionId: context.session.id,
    runId: context.run.id,
    requestedSkillName: input.name,
    resolvedSkillName: skill.name,
    entryFile: skill.entryFile,
    scope: skill.scope,
  })

  return {
    title,
    output: [
      `<skill_content name="${skill.name}">`,
      `# Skill: ${skill.name}`,
      '',
      skill.body.trim(),
      '',
      `Base directory for this skill: ${skill.directory}`,
      'Relative paths in this skill (for example scripts/ or reference/) are resolved from this directory.',
      '',
      '<skill_files>',
      skill.files.map((file) => `<file>${file}</file>`).join('\n'),
      '</skill_files>',
      '</skill_content>'
    ].join('\n'),
    metadata: {
      skillName: skill.name,
      directory: skill.directory,
      entryFile: skill.entryFile,
      scope: skill.scope,
      tags: skill.tags
    }
  }
}
