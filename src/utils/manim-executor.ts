import { spawn } from 'child_process'
import { createLogger } from './logger'
import {
  registerManimProcess,
  unregisterManimProcess,
  wasManimProcessCancelled
} from './manim-process-registry'
import {
  buildManimArgs,
  buildResult,
  createExecutionState,
  elapsedSeconds,
  handleStderrData,
  handleStdoutData,
  normalizeExecuteOptions,
  startMemoryMonitor
} from './manim-executor-runtime'
import { buildInheritedChildEnv } from './inherited-process-env'

const logger = createLogger('ManimExecutor')

export interface ManimExecutionResult {
  success: boolean
  stdout: string
  stderr: string
  peakMemoryMB: number
  exitCode?: number
}

export interface ManimExecuteOptions {
  jobId: string
  quality: string
  frameRate?: number
  format?: 'mp4' | 'png'
  sceneName?: string
  tempDir: string
  mediaDir: string
  timeoutMs?: number
}

export function executeManimCommand(
  codeFile: string,
  options: ManimExecuteOptions
): Promise<ManimExecutionResult> {
  const normalizedOptions = normalizeExecuteOptions(options)
  const args = buildManimArgs(codeFile, normalizedOptions)

  // Use custom MANIM_PATH if provided, otherwise use 'manim' from PATH
  // If MANIM_PATH is 'py' or 'python', prepend '-m manim' to args
  const manimCommand = process.env.MANIM_PATH || 'manim'
  const finalArgs = ['py', 'python'].includes(manimCommand) ? ['-m', 'manim', ...args] : args

  logger.info(`Job ${normalizedOptions.jobId}: starting manim process`, {
    command: `${manimCommand} ${finalArgs.join(' ')}`,
    cwd: normalizedOptions.tempDir
  })

  return new Promise((resolve) => {
    const startTime = Date.now()
    const state = createExecutionState()
    const proc = spawn(manimCommand, finalArgs, {
      cwd: normalizedOptions.tempDir,
      env: buildInheritedChildEnv(),
      shell: process.platform === 'win32'
    })

    registerManimProcess(normalizedOptions.jobId, proc)

    const memoryMonitor = startMemoryMonitor(proc, normalizedOptions, state)
    let timeoutTimer: NodeJS.Timeout | null = null
    let settled = false

    const settle = (result: ManimExecutionResult): void => {
      if (settled) {
        return
      }
      settled = true

      if (timeoutTimer) {
        clearTimeout(timeoutTimer)
      }
      clearInterval(memoryMonitor)
      unregisterManimProcess(normalizedOptions.jobId)
      resolve(result)
    }

    proc.stdout.on('data', (data) => {
      handleStdoutData(state, normalizedOptions.jobId, data.toString())
    })

    proc.stderr.on('data', (data) => {
      handleStderrData(state, normalizedOptions.jobId, data.toString())
    })

    timeoutTimer = setTimeout(() => {
      const elapsed = elapsedSeconds(startTime)

      logger.warn(`Job ${normalizedOptions.jobId}: manim render timeout (${elapsed}s), killing process`, {
        peakMemoryMB: state.peakMemoryMB
      })

      proc.kill('SIGKILL')

      settle(
        buildResult(
          false,
          state,
          state.stderr || `Manim render timeout (${Math.round(normalizedOptions.timeoutMs / 1000)} seconds)`
        )
      )
    }, normalizedOptions.timeoutMs)

    proc.on('close', (code) => {
      const elapsed = elapsedSeconds(startTime)
      const cancelled = wasManimProcessCancelled(normalizedOptions.jobId)

      if (cancelled) {
        logger.warn(`Job ${normalizedOptions.jobId}: Manim cancelled`, { elapsed: `${elapsed}s` })
        settle(buildResult(false, state, 'Job cancelled', code ?? undefined))
        return
      }

      if (code === 0) {
        logger.info(`Job ${normalizedOptions.jobId}: manim completed`, {
          elapsed: `${elapsed}s`,
          exitCode: code,
          stdoutLength: state.stdout.length,
          stderrLength: state.stderr.length,
          peakMemoryMB: state.peakMemoryMB
        })
        settle(buildResult(true, state, undefined, code ?? undefined))
        return
      }

      logger.error(`Job ${normalizedOptions.jobId}: manim exited with error`, {
        elapsed: `${elapsed}s`,
        exitCode: code,
        stdoutLength: state.stdout.length,
        stderrLength: state.stderr.length,
        stderrPreview: state.stderr.slice(-500),
        peakMemoryMB: state.peakMemoryMB
      })
      let stderrFinal = state.stderr
      
      // Enhanced error messages for missing dependencies
      if (stderrFinal.includes('FileNotFoundError')) {
        // Windows-specific subprocess errors
        if (stderrFinal.includes('WinError 2') || stderrFinal.includes('[WinError 2]')) {
          stderrFinal += `\n\nManimCat: Windows failed to start a subprocess dependency (often ffmpeg, LaTeX, or dvisvgm). The Node dev server may be using a PATH that does not include your User install. Set MANIMCAT_FFMPEG_PATH to the full path of ffmpeg.exe (and MANIMCAT_TEX_BIN to your TeX bin if you use MathTex), or MANIMCAT_PATH_PREPEND with semicolon-separated folders, then restart the backend.\n`
        }
        // Linux/Mac subprocess errors
        else if (stderrFinal.includes('No such file or directory')) {
          if (stderrFinal.toLowerCase().includes('latex') || stderrFinal.toLowerCase().includes('dvisvgm')) {
            stderrFinal += `\n\nManimCat: LaTeX/dvisvgm not found in PATH. For production Docker: ensure texlive-latex-extra and dvisvgm are installed in Dockerfile. For local development: install TeX Live and ensure binaries are in PATH or set MANIMCAT_TEX_BIN environment variable.\n`
          } else if (stderrFinal.toLowerCase().includes('ffmpeg')) {
            stderrFinal += `\n\nManimCat: FFmpeg not found in PATH. For production Docker: ensure ffmpeg is installed in Dockerfile. For local development: install FFmpeg and ensure it's in PATH or set MANIMCAT_FFMPEG_PATH environment variable.\n`
          } else {
            stderrFinal += `\n\nManimCat: A required dependency is missing from PATH. For production: verify all dependencies are installed in Dockerfile (ffmpeg, texlive, perl, dvisvgm). For local development: check your PATH or use MANIMCAT_PATH_PREPEND to add required directories.\n`
          }
        }
      }
      
      settle(buildResult(false, state, stderrFinal, code ?? undefined))
    })

    proc.on('error', (error) => {
      const elapsed = elapsedSeconds(startTime)
      const cancelled = wasManimProcessCancelled(normalizedOptions.jobId)

      if (cancelled) {
        logger.warn(`Job ${normalizedOptions.jobId}: Manim cancelled`, { elapsed: `${elapsed}s` })
        settle(buildResult(false, state, 'Job cancelled'))
        return
      }

      logger.error(`Job ${normalizedOptions.jobId}: manim process start failed`, {
        elapsed: `${elapsed}s`,
        errorMessage: error.message,
        errorStack: error.stack
      })
      settle(buildResult(false, state, error.message))
    })
  })
}
