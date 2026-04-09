import { useCallback } from 'react'
import { allStudioCommands } from './all-commands'
import { parseStudioCommand } from './parse-studio-command'
import type { StudioCommandContext } from './types'

interface UseStudioCommandRunnerInput extends StudioCommandContext {
  onRun: (inputText: string) => Promise<void>
}

export function useStudioCommandRunner(input: UseStudioCommandRunnerInput) {
  return useCallback(async (inputText: string) => {
    const command = parseStudioCommand(inputText)
    if (!command) {
      await input.onRun(inputText)
      return { kind: 'run' as const }
    }

    const definition = allStudioCommands.find((item) => item.id === command.id)
    if (!definition) {
      await input.onRun(inputText)
      return { kind: 'run' as const }
    }

    await definition.execute(command as never, input)
    return { kind: 'control' as const, command }
  }, [input])
}

