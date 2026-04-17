import type { StudioToolDefinition, StudioToolResult } from '../domain/types'
import type { StudioRuntimeBackedToolContext } from '../runtime/tools/tool-runtime-context'
import { listWorkspaceDirectory, toWorkspaceRelativePath, truncateToolText } from './workspace-paths'

interface LsToolInput {
  path?: string
  directory?: string
}

export function createStudioLsTool(): StudioToolDefinition<LsToolInput> {
  return {
    name: 'ls',
    description: 'List directory contents.',
    category: 'safe-read',
    permission: 'ls',
    allowedAgents: ['builder', 'reviewer', 'designer'],
    requiresTask: false,
    execute: async (input, context) => executeLsTool(input, context as StudioRuntimeBackedToolContext)
  }
}

async function executeLsTool(
  input: LsToolInput,
  context: StudioRuntimeBackedToolContext
): Promise<StudioToolResult> {
  const allowedRoots = await listLoadedSkillDirectories(context)
  const listing = await listWorkspaceDirectory(
    context.session.directory,
    input.path ?? input.directory ?? '.',
    { allowedRoots }
  )
  const relativePath = formatReadablePath(context.session.directory, listing.absolutePath, allowedRoots)
  const output = truncateToolText(listing.entries.join('\n') || '(empty directory)')

  return {
    title: `List ${relativePath}`,
    output: output.text,
    metadata: {
      path: relativePath,
      absolutePath: listing.absolutePath,
      entryCount: listing.entries.length,
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
    if (relative === '.') {
      return '.'
    }
    if (!relative.startsWith('..')) {
      return relative
    }
  }

  return absolutePath.replace(/\\/g, '/')
}
