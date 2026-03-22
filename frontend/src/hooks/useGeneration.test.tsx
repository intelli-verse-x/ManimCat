import type { ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useGeneration } from './useGeneration'
import { cancelJob, generateAnimation, getJobStatus, modifyAnimation } from '../lib/api'
import { I18nProvider } from '../i18n'

vi.mock('../lib/api', () => ({
  generateAnimation: vi.fn(),
  getJobStatus: vi.fn(),
  cancelJob: vi.fn(),
  modifyAnimation: vi.fn(),
}))

vi.mock('../lib/settings', () => ({
  loadSettings: () => ({
    video: { timeout: 1200 },
    api: {},
  }),
}))

vi.mock('../lib/ai-providers', () => ({
  getActiveProvider: () => null,
  providerToCustomApiConfig: () => null,
}))

vi.mock('./usePrompts', () => ({
  loadPrompts: () => undefined,
}))

const mockedGenerateAnimation = vi.mocked(generateAnimation)
const mockedGetJobStatus = vi.mocked(getJobStatus)
const mockedCancelJob = vi.mocked(cancelJob)
const mockedModifyAnimation = vi.mocked(modifyAnimation)

function wrapper({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>
}

describe('useGeneration', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    sessionStorage.clear()
    mockedGenerateAnimation.mockResolvedValue({
      success: true,
      jobId: 'job-1',
      message: 'ok',
      status: 'processing',
    })
    mockedModifyAnimation.mockResolvedValue({
      success: true,
      jobId: 'job-1',
      message: 'ok',
      status: 'processing',
    })
    mockedCancelJob.mockResolvedValue()
    mockedGetJobStatus.mockResolvedValue({
      jobId: 'job-1',
      status: 'processing',
      stage: 'analyzing',
      message: 'running',
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not cancel the job when polling hits a non-network error', async () => {
    mockedGetJobStatus.mockRejectedValueOnce(new Error('Unexpected JSON parse failure'))

    const { result } = renderHook(() => useGeneration(), { wrapper })

    await act(async () => {
      await result.current.generate({ concept: 'test', outputMode: 'video' })
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    expect(result.current.status).toBe('error')
    expect(result.current.error).toBe('Unexpected JSON parse failure')
    expect(mockedCancelJob).not.toHaveBeenCalled()
  })

  it('restores an active job from session storage and resumes polling', async () => {
    sessionStorage.setItem('manimcat_active_job', JSON.stringify({
      jobId: 'job-restore',
      stage: 'rendering',
    }))
    mockedGetJobStatus.mockResolvedValueOnce({
      jobId: 'job-restore',
      status: 'processing',
      stage: 'rendering',
      message: 'running',
    })

    const { result } = renderHook(() => useGeneration(), { wrapper })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    expect(result.current.jobId).toBe('job-restore')
    expect(result.current.status).toBe('processing')
  })

  it('resumes polling if cancel request fails', async () => {
    mockedCancelJob.mockRejectedValueOnce(new Error('cancel failed'))

    const { result } = renderHook(() => useGeneration(), { wrapper })

    await act(async () => {
      await result.current.generate({ concept: 'test', outputMode: 'video' })
    })

    await act(async () => {
      result.current.cancel()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current.status).toBe('processing')
    expect(result.current.jobId).toBe('job-1')
  })
})
