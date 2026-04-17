import type { StudioToolDefinition, StudioToolResult } from '../domain/types'
import type { StudioRuntimeBackedToolContext } from '../runtime/tools/tool-runtime-context'
import { readWorkspaceFile, toWorkspaceRelativePath, truncateToolText } from './workspace-paths'

interface ReadToolInput {
  path?: string
  file?: string
}

export function createStudioReadTool(): StudioToolDefinition<ReadToolInput> {
  return {
    name: 'read',
    description: 'Read a file from the current workspace.',
    category: 'safe-read',
    permission: 'read',
    allowedAgents: ['builder', 'reviewer', 'designer'],
    requiresTask: false,
    execute: async (input, context) => executeReadTool(input, context as StudioRuntimeBackedToolContext)
  }
}

async function executeReadTool(
  input: ReadToolInput,
  context: StudioRuntimeBackedToolContext
): Promise<StudioToolResult> {
  const target = input.path ?? input.file
  if (!target) {
    throw new Error('Read tool requires "path" or "file"')
  }

  const allowedRoots = await listLoadedSkillDirectories(context)
  const file = await readWorkspaceFile(context.session.directory, target, { allowedRoots })
  const relativePath = formatReadablePath(context.session.directory, file.absolutePath, allowedRoots)
  const output = truncateToolText(file.content)

  return {
    title: `Read ${relativePath}`,
    output: output.text,
    metadata: {
      path: relativePath,
      absolutePath: file.absolutePath,
      truncated: output.truncated
    }
  }
}

async function listLoadedSkillDirectories(context: StudioRuntimeBackedToolContext): Promise<string[]> {
  if (!context.partStore) {
    return []
  }

  const parts = await context.partStore.listByMessageId(context.assistantMessage.id)
  const directories = new Set<string>()
  for (const part of parts) {
    if (part.type !== 'tool' || part.tool !== 'skill') {
      continue
    }

    const directory = part.metadata?.directory
    if (typeof directory === 'string' && directory.trim()) {
      directories.add(directory)
    }
  }

  return [...directories]
}

function formatReadablePath(baseDirectory: string, absolutePath: string, allowedRoots: string[]): string {
  const workspaceRelative = toWorkspaceRelativePath(baseDirectory, absolutePath).replace(/\\/g, '/')
  if (workspaceRelative !== '.' && !workspaceRelative.startsWith('..')) {
    return workspaceRelative
  }

  for (const root of allowedRoots) {
    const relative = toWorkspaceRelativePath(root, absolutePath).replace(/\\/g, '/')
    if (relative !== '.' && !relative.startsWith('..')) {
      return relative
    }
  }

  return absolutePath.replace(/\\/g, '/')
}
