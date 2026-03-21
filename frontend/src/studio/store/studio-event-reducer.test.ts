import { describe, expect, it } from 'vitest'
import { studioEventReducer } from './studio-event-reducer'
import { createInitialStudioState } from './studio-session-store'

describe('studioEventReducer', () => {
  it('clears submitting and stores the error when run submission fails', () => {
    const state = {
      ...createInitialStudioState(),
      runtime: {
        ...createInitialStudioState().runtime,
        submitting: true,
      },
    }

    const next = studioEventReducer(state, {
      type: 'run_submit_failed',
      error: 'Studio provider config is incomplete',
    })

    expect(next.runtime.submitting).toBe(false)
    expect(next.error).toBe('Studio provider config is incomplete')
  })
})
