import { executeStudioImageInputCommand } from './handlers/image-input'
import { executeStudioPermissionModeCommand } from './handlers/permission-mode'
import type { StudioPermissionMode } from '../protocol/studio-agent-types'
import type { StudioCommandDefinition, StudioImageInputCommand, StudioPermissionModeCommand } from './types'

export const featureStudioCommands: StudioCommandDefinition[] = [
  createPermissionModeCommand({
    trigger: '/safe',
    mode: 'safe',
    titleKey: 'studio.command.safeTitle',
    descriptionKey: 'studio.command.safeDescription',
    keywords: ['permission', 'mode', 'approval', 'safety'],
  }),
  createPermissionModeCommand({
    trigger: '/auto',
    mode: 'auto',
    titleKey: 'studio.command.autoTitle',
    descriptionKey: 'studio.command.autoDescription',
    keywords: ['permission', 'mode', 'approval'],
  }),
  createPermissionModeCommand({
    trigger: '/full',
    mode: 'full',
    titleKey: 'studio.command.fullTitle',
    descriptionKey: 'studio.command.fullDescription',
    keywords: ['permission', 'mode', 'approval'],
  }),
  {
    id: 'image-input',
    group: 'feature',
    scope: 'local',
    presentation: {
      trigger: '/p',
      titleKey: 'studio.command.imageTitle',
      descriptionKey: 'studio.command.imageDescription',
      aliases: ['/paint'],
      keywords: ['image', 'upload', 'canvas', 'reference'],
    },
    matches(input): StudioImageInputCommand | null {
      const normalized = input.trim().toLowerCase()
      if (normalized !== '/p' && normalized !== '/paint') {
        return null
      }

      return {
        id: 'image-input',
        group: 'feature',
        raw: normalized,
      }
    },
    execute: executeStudioImageInputCommand,
  },
]

function createPermissionModeCommand(input: {
  trigger: string
  mode: StudioPermissionMode
  titleKey: string
  descriptionKey: string
  keywords: string[]
}): StudioCommandDefinition<StudioPermissionModeCommand> {
  return {
    id: 'permission-mode',
    group: 'feature',
    scope: 'global',
    presentation: {
      trigger: input.trigger,
      titleKey: input.titleKey,
      descriptionKey: input.descriptionKey,
      keywords: input.keywords,
    },
    matches(value): StudioPermissionModeCommand | null {
      const normalized = value.trim().toLowerCase()
      if (normalized !== input.trigger) {
        return null
      }

      return {
        id: 'permission-mode',
        group: 'feature',
        raw: normalized,
        mode: input.mode,
      }
    },
    execute: executeStudioPermissionModeCommand,
  }
}
