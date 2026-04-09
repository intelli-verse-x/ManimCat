import { executeStudioPermissionModeCommand } from './handlers/permission-mode'
import type { StudioPermissionMode } from '../protocol/studio-agent-types'
import type { StudioCommandDefinition, StudioPermissionModeCommand } from './types'

const COMMAND_TO_MODE: Record<string, StudioPermissionMode> = {
  '/safe': 'safe',
  '/auto': 'auto',
  '/full': 'full',
}

export const featureStudioCommands: StudioCommandDefinition[] = [
  {
    id: 'permission-mode',
    group: 'feature',
    presentation: {
      trigger: '/safe',
      titleKey: 'studio.command.safeTitle',
      descriptionKey: 'studio.command.safeDescription',
      aliases: ['/auto', '/full'],
      keywords: ['permission', 'mode', 'approval', 'safety'],
    },
    matches(input): StudioPermissionModeCommand | null {
      const normalized = input.trim().toLowerCase()
      const mode = COMMAND_TO_MODE[normalized]
      if (!mode) {
        return null
      }

      return {
        id: 'permission-mode',
        group: 'feature',
        raw: normalized,
        mode,
      }
    },
    execute: executeStudioPermissionModeCommand,
  },
]
