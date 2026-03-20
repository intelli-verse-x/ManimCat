import fs from 'fs'
import os from 'os'
import path from 'path'
import { spawn } from 'child_process'
import { createLogger } from '../../utils/logger'
import type { OutputMode } from '../../types'
import type { StaticDiagnostic } from './types'

const logger = createLogger('StaticGuardChecker')

interface CommandResult {
  exitCode: number | null
  stdout: string
  stderr: string
}

interface CodeUnit {
  code: string
  lineOffset: number
}

interface CodeLine {
  lineNumber: number
  text: string
}

interface PyrightJsonDiagnostic {
  severity?: string
  message?: string
  rule?: string
  range?: {
    start?: {
      line?: number
      character?: number
    }
  }
}

interface PyrightJsonResult {
  generalDiagnostics?: PyrightJsonDiagnostic[]
}

interface ResolvedCommand {
  command: string
  argsPrefix: string[]
  displayName: string
}

function runCommand(command: string, args: string[], cwd: string): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    logger.info('Running static guard command', {
      command,
      args,
      cwd
    })
    const proc = spawn(command, args, { cwd, windowsHide: true })
    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    proc.on('error', (error) => {
      const suffix = args.length > 0 ? ` ${args.join(' ')}` : ''
      reject(new Error(`Failed to spawn command: ${command}${suffix} (${String(error)})`))
    })
    proc.on('close', (exitCode) => {
      logger.info('Static guard command finished', {
        command,
        args,
        cwd,
        exitCode,
        stdoutPreview: stdout.trim().slice(0, 300),
        stderrPreview: stderr.trim().slice(0, 300)
      })
      resolve({ exitCode, stdout, stderr })
    })
  })
}

function resolvePyrightCommand(): ResolvedCommand | null {
  const pyrightEntrypoint = path.join(process.cwd(), 'node_modules', 'pyright', 'index.js')
  if (fs.existsSync(pyrightEntrypoint)) {
    return {
      command: process.execPath,
      argsPrefix: [pyrightEntrypoint],
      displayName: 'node pyright'
    }
  }

  return null
}

function parseImageCodeUnits(code: string): CodeUnit[] {
  const units: CodeUnit[] = []
  const blockRegex = /###\s*YON_IMAGE_(\d+)_START\s*###([\s\S]*?)###\s*YON_IMAGE_\1_END\s*###/g

  let match: RegExpExecArray | null
  while ((match = blockRegex.exec(code)) !== null) {
    const fullMatch = match[0]
    const blockCode = match[2].trim()
    if (!blockCode) {
      continue
    }

    const prefix = code.slice(0, match.index)
    const startMarker = fullMatch.indexOf(match[2])
    const beforeCode = fullMatch.slice(0, startMarker)
    const lineOffset = prefix.split('\n').length - 1 + beforeCode.split('\n').length - 1
    units.push({ code: blockCode, lineOffset })
  }

  if (units.length === 0) {
    units.push({ code, lineOffset: 0 })
  }

  return units
}

function getCodeUnits(code: string, outputMode: OutputMode): CodeUnit[] {
  if (outputMode === 'image') {
    return parseImageCodeUnits(code)
  }
  return [{ code, lineOffset: 0 }]
}

function parsePyCompileDiagnostic(stderr: string, lineOffset: number): StaticDiagnostic | null {
  const normalized = stderr.replace(/\r\n/g, '\n').trim()
  if (!normalized) {
    return null
  }

  const lineMatch = normalized.match(/line\s+(\d+)/i)
  const line = lineMatch ? Number.parseInt(lineMatch[1], 10) + lineOffset : 1 + lineOffset
  const lines = normalized.split('\n').map((item) => item.trim()).filter(Boolean)
  const message = lines[lines.length - 1] || normalized

  return {
    tool: 'py_compile',
    line,
    message
  }
}

function parsePyrightDiagnostic(stdout: string, lineOffset: number): StaticDiagnostic | null {
  const normalized = stdout.trim()
  if (!normalized) {
    return null
  }

  let parsed: PyrightJsonResult
  try {
    parsed = JSON.parse(normalized) as PyrightJsonResult
  } catch (error) {
    logger.warn('Failed to parse pyright JSON output', { error: String(error), stdout: normalized.slice(0, 500) })
    return null
  }

  const candidate = parsed.generalDiagnostics?.find((item) => item.severity === 'error')
  if (!candidate) {
    return null
  }

  return {
    tool: 'pyright',
    line: (candidate.range?.start?.line ?? 0) + 1 + lineOffset,
    column: (candidate.range?.start?.character ?? 0) + 1,
    code: candidate.rule,
    message: candidate.message || 'Pyright reported an error'
  }
}

function getCodeLine(code: string, oneBasedLineNumber: number): CodeLine | null {
  if (oneBasedLineNumber < 1) {
    return null
  }

  const lines = code.split('\n')
  const text = lines[oneBasedLineNumber - 1]
  if (typeof text !== 'string') {
    return null
  }

  return {
    lineNumber: oneBasedLineNumber,
    text
  }
}

function shouldIgnorePyrightDiagnostic(diagnostic: StaticDiagnostic, code: string, lineOffset: number): boolean {
  if (diagnostic.tool !== 'pyright') {
    return false
  }

  const message = diagnostic.message.toLowerCase()
  const codeLine = getCodeLine(code, diagnostic.line - lineOffset)
  const normalizedLine = codeLine?.text.toLowerCase() || ''

  if (
    diagnostic.code === 'reportAttributeAccessIssue' &&
    message.includes('cannot access attribute "frame" for class "camera"') &&
    normalizedLine.includes('camera.frame')
  ) {
    logger.info('Ignoring known pyright false positive for Manim camera.frame', {
      line: diagnostic.line,
      column: diagnostic.column,
      code: diagnostic.code,
      lineText: codeLine?.text.trim() || ''
    })
    return true
  }

  return false
}

async function checkUnit(code: string, lineOffset: number): Promise<StaticDiagnostic | null> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'manim-static-'))
  const codeFile = path.join(tempDir, 'scene.py')

  try {
    fs.writeFileSync(codeFile, code, 'utf-8')
    logger.info('Static guard checking code unit', {
      tempDir,
      codeFile,
      lineOffset,
      codeLength: code.length
    })

    const pyCompileResult = await runCommand('python', ['-m', 'py_compile', codeFile], tempDir)
    if (pyCompileResult.exitCode !== 0) {
      logger.warn('py_compile reported diagnostic', {
        codeFile,
        lineOffset,
        stderrPreview: pyCompileResult.stderr.trim().slice(0, 300)
      })
      return parsePyCompileDiagnostic(pyCompileResult.stderr, lineOffset)
    }

    const pyrightCommand = resolvePyrightCommand()
    if (!pyrightCommand) {
      logger.warn('Pyright binary not found, skip pyright static checks')
      return null
    }

    const pyrightResult = await runCommand(
      pyrightCommand.command,
      [...pyrightCommand.argsPrefix, '--outputjson', codeFile],
      tempDir
    )
    const pyrightDiagnostic = parsePyrightDiagnostic(pyrightResult.stdout, lineOffset)
    if (pyrightDiagnostic) {
      if (shouldIgnorePyrightDiagnostic(pyrightDiagnostic, code, lineOffset)) {
        return null
      }

      logger.warn('Pyright reported diagnostic', {
        codeFile,
        lineOffset,
        line: pyrightDiagnostic.line,
        column: pyrightDiagnostic.column,
        code: pyrightDiagnostic.code,
        message: pyrightDiagnostic.message
      })
      return pyrightDiagnostic
    }

    if (pyrightResult.exitCode !== 0 && !pyrightDiagnostic) {
      throw new Error(
        pyrightResult.stderr.trim() ||
          pyrightResult.stdout.trim() ||
          `${pyrightCommand.displayName} check failed`
      )
    }

    return null
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

export async function runStaticChecks(code: string, outputMode: OutputMode): Promise<StaticDiagnostic | null> {
  const units = getCodeUnits(code, outputMode)
  for (const unit of units) {
    const diagnostic = await checkUnit(unit.code, unit.lineOffset)
    if (diagnostic) {
      return diagnostic
    }
  }
  return null
}
