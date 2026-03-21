import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { StudioCommandPanel } from './StudioCommandPanel'
import type { StudioSession } from '../protocol/studio-agent-types'

function createSession(): StudioSession {
  const now = '2026-03-22T00:00:00.000Z'
  return {
    id: 'session-1',
    projectId: 'project-1',
    agentType: 'builder',
    title: 'Studio',
    directory: 'D:/projects/ManimCat',
    permissionLevel: 'L2',
    permissionRules: [],
    createdAt: now,
    updatedAt: now,
  }
}

describe('StudioCommandPanel', () => {
  it('restores the input when submit fails', async () => {
    const onRun = vi.fn(async () => {
      throw new Error('submit failed')
    })

    render(
      <StudioCommandPanel
        session={createSession()}
        messages={[]}
        latestAssistantText=""
        isBusy={false}
        disabled={false}
        onRun={onRun}
        onExit={vi.fn()}
      />,
    )

    const input = screen.getByPlaceholderText('输入指令...') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'render current file' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => expect(onRun).toHaveBeenCalledWith('render current file'))
    await waitFor(() => expect(input.value).toBe('render current file'))
  })
})
