import path from 'node:path'

function pathEnvKey(env: NodeJS.ProcessEnv): string {
  const found = Object.keys(env).find((k) => k.toUpperCase() === 'PATH')
  return found ?? 'PATH'
}

function prependToPath(existing: string, dir: string, delimiter: string): string {
  const d = dir.trim()
  if (!d) {
    return existing
  }
  const norm = path.normalize(d)
  const segments = existing.split(delimiter).filter(Boolean)
  // Remove the directory if it already exists (we'll add it to the front)
  const filtered = segments.filter((p) => path.normalize(p) !== norm)
  return `${norm}${delimiter}${filtered.join(delimiter)}`
}

/**
 * Environment for spawning Manim / Python / toolchain children.
 * On Windows, the IDE or `npm run dev` often inherits a PATH that omits User-scope
 * entries (where WinGet/Chocolatey put ffmpeg), so optional env vars can prepend dirs.
 */
export function buildInheritedChildEnv(baseEnv: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const env = { ...baseEnv }
  const pathKey = pathEnvKey(env)
  const delimiter = path.delimiter
  let currentPath = env[pathKey] ?? ''

  const prependDir = (dir: string): void => {
    currentPath = prependToPath(currentPath, dir, delimiter)
  }

  const ffmpegExplicit =
    env.MANIMCAT_FFMPEG_PATH?.trim() || env.FFMPEG_PATH?.trim() || env.FFMPEG_BINARY?.trim()

  if (ffmpegExplicit) {
    const resolved = path.resolve(ffmpegExplicit)
    const base = path.basename(resolved)
    if (/\.exe$/i.test(resolved) || base.toLowerCase() === 'ffmpeg' || base.toLowerCase() === 'ffmpeg.exe') {
      prependDir(path.dirname(resolved))
    } else {
      prependDir(resolved)
    }
  }

  const texBin = env.MANIMCAT_TEX_BIN?.trim()
  if (texBin) {
    prependDir(texBin)
  }

  const prepend = env.MANIMCAT_PATH_PREPEND?.trim()
  if (prepend) {
    const parts = prepend
      .split(/[;,]/)
      .map((s) => s.trim())
      .filter(Boolean)
    for (let i = parts.length - 1; i >= 0; i -= 1) {
      prependDir(parts[i]!)
    }
  }

  env[pathKey] = currentPath
  return env
}
