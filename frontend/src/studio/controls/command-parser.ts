import type { StudioPermissionMode } from '../protocol/studio-agent-types'
import { parseStudioPermissionModeCommand } from './permission-modes'

export type StudioSlashCommand = {
  type: 'permission-mode'
  raw: '/safe' | '/auto' | '/full'
  mode: StudioPermissionMode
} | {
  type: 'history'
  raw: '/history'
} | {
  type: 'new-session'
  raw: '/new'
}

export function parseStudioSlashCommand(input: string): StudioSlashCommand | null {
  const normalized = input.trim().toLowerCase()

  const permissionMode = parseStudioPermissionModeCommand(input)
  if (permissionMode) {
    return {
      type: 'permission-mode',
      raw: permissionMode.command,
      mode: permissionMode.mode,
    }
  }

  if (normalized === '/history') {
    return {
      type: 'history',
      raw: '/history',
    }
  }

  if (normalized === '/new') {
    return {
      type: 'new-session',
      raw: '/new',
    }
  }

  return null
}
