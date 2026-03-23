import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { spawn } from 'node:child_process'

export interface MatplotlibExecutionResult {
  outputDir: string
  scriptPath: string
  imageDataUris: string[]
  imagePaths: string[]
  stdout: string
  stderr: string
}

export async function executeMatplotlibRender(input: {
  workspaceDirectory: string
  renderId: string
  code: string
}): Promise<MatplotlibExecutionResult> {
  const outputDir = join(input.workspaceDirectory, '.studio', 'plot', input.renderId)
  await mkdir(outputDir, { recursive: true })

  const sourcePath = join(outputDir, 'plot_script.py')
  const wrapperPath = join(outputDir, 'plot_executor.py')
  await writeFile(sourcePath, input.code, 'utf8')
  await writeFile(wrapperPath, buildExecutorScript(), 'utf8')

  const { stdout, stderr } = await runPython(wrapperPath, [sourcePath, outputDir])
  const imagePaths = parseJsonLine(stdout, 'PLOT_OUTPUTS_JSON=') as string[]
  if (!Array.isArray(imagePaths) || imagePaths.length === 0) {
    throw new Error(stderr.trim() || 'Matplotlib execution finished without producing any image output')
  }

  const imageDataUris = await Promise.all(imagePaths.map(async (imagePath) => {
    const bytes = await readFile(imagePath)
    return `data:image/png;base64,${bytes.toString('base64')}`
  }))

  return {
    outputDir,
    scriptPath: sourcePath,
    imageDataUris,
    imagePaths,
    stdout,
    stderr,
  }
}

async function runPython(scriptPath: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  const candidates = [
    { command: 'python', args: [scriptPath, ...args] },
    { command: 'py', args: ['-3', scriptPath, ...args] },
  ]

  let lastError = ''
  for (const candidate of candidates) {
    try {
      return await spawnProcess(candidate.command, candidate.args)
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    }
  }

  throw new Error(`Unable to execute Python for matplotlib render. ${lastError}`)
}

function spawnProcess(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        MPLCONFIGDIR: args[2] ?? process.env.MPLCONFIGDIR,
      },
    })
    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk)
    })
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk)
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr })
        return
      }

      reject(new Error(stderr.trim() || `Python process exited with code ${code}`))
    })
  })
}

function parseJsonLine(stdout: string, prefix: string): unknown {
  const line = stdout.split(/\r?\n/).find((entry) => entry.startsWith(prefix))
  if (!line) {
    return undefined
  }

  return JSON.parse(line.slice(prefix.length))
}

function buildExecutorScript(): string {
  return [
    'import json',
    'import os',
    'import sys',
    'import matplotlib',
    "matplotlib.use('Agg')",
    'import matplotlib.pyplot as plt',
    '',
    'source_path = sys.argv[1]',
    'output_dir = sys.argv[2]',
    "namespace = {'plt': plt, '__name__': '__main__'}",
    '',
    'with open(source_path, "r", encoding="utf-8") as f:',
    '    source = f.read()',
    '',
    'exec(compile(source, source_path, "exec"), namespace)',
    '',
    'figure_numbers = plt.get_fignums()',
    'if not figure_numbers:',
    '    raise RuntimeError("No matplotlib figures were created by the script")',
    '',
    'outputs = []',
    'for index, figure_number in enumerate(figure_numbers, start=1):',
    '    figure = plt.figure(figure_number)',
    '    output_path = os.path.join(output_dir, f"plot_{index}.png")',
    '    figure.savefig(output_path, dpi=160, bbox_inches="tight")',
    '    outputs.append(output_path)',
    '',
    'print("PLOT_OUTPUTS_JSON=" + json.dumps(outputs, ensure_ascii=False))',
  ].join('\n')
}
