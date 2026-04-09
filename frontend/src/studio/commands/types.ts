import type { StudioPermissionMode, StudioSession } from '../protocol/studio-agent-types'

export type StudioCommandGroup = 'basic' | 'feature' | 'advanced'

export interface StudioCommandPresentation {
  trigger: string
  titleKey: string
  descriptionKey: string
  aliases?: string[]
  keywords?: string[]
}

export interface StudioCommandContext {
  session: StudioSession | null
  openHistory: () => void
  createSession: () => Promise<void>
  setPendingMode: (mode: StudioPermissionMode) => void
}

export interface StudioParsedCommandBase {
  id: string
  group: StudioCommandGroup
  raw: string
}

export interface StudioPermissionModeCommand extends StudioParsedCommandBase {
  id: 'permission-mode'
  group: 'feature'
  mode: StudioPermissionMode
}

export interface StudioHistoryCommand extends StudioParsedCommandBase {
  id: 'history'
  group: 'basic'
}

export interface StudioNewSessionCommand extends StudioParsedCommandBase {
  id: 'new-session'
  group: 'basic'
}

export type StudioParsedCommand =
  | StudioPermissionModeCommand
  | StudioHistoryCommand
  | StudioNewSessionCommand

export interface StudioCommandDefinition<TCommand extends StudioParsedCommand = StudioParsedCommand> {
  id: TCommand['id']
  group: StudioCommandGroup
  presentation: StudioCommandPresentation
  matches: (input: string) => TCommand | null
  execute: (command: TCommand, context: StudioCommandContext) => Promise<void> | void
}
