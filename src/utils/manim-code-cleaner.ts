/**
 * Manim code cleanup helpers.
 */

import { replaceFullwidthOutsideStrings, replaceLineWithDashedLine } from './manim-code-cleaner/rules'

type CleanupResult = {
  code: string
  changes: string[]
}

/**
 * Fix common bad import patterns that break Manim CE
 */
function fixBadImports(code: string): { code: string; fixed: boolean } {
  let fixed = false
  let cleaned = code

  // Fix: from manim.scene import Scene -> from manim import Scene
  const badImportPattern = /from\s+manim\.[a-zA-Z_]+\s+import\s+([a-zA-Z_, ]+)/g
  const newCleaned = cleaned.replace(badImportPattern, 'from manim import $1')
  if (newCleaned !== cleaned) {
    cleaned = newCleaned
    fixed = true
  }

  // Fix: from manim import scene -> (remove, covered by wildcard)
  if (/from\s+manim\s+import\s+scene\b/.test(cleaned)) {
    cleaned = cleaned.replace(/from\s+manim\s+import\s+scene\b[^\n]*/g, '# scene import removed (use from manim import *)')
    fixed = true
  }

  return { code: cleaned, fixed }
}

/**
 * Detect which scene class name is defined in the code.
 * Looks for classes that inherit from Scene, ThreeDScene, MovingCameraScene, or ZoomedScene.
 * Returns the FIRST top-level class found (not nested classes).
 */
function detectSceneClassName(code: string): string | null {
  // Match class definitions that inherit from Scene types
  // Must be at the start of a line (not indented) to be a top-level class
  const sceneClassPattern = /^class\s+(\w+)\s*\(\s*(?:Scene|ThreeDScene|MovingCameraScene|ZoomedScene)\s*\)/gm
  const match = sceneClassPattern.exec(code)
  if (match) {
    return match[1]
  }

  // Fallback: look for any class with a construct method (likely a Manim scene)
  const classWithConstructPattern = /^class\s+(\w+)\s*\([^)]*\)\s*:\s*\n(?:\s+[^\n]+\n)*?\s+def\s+construct\s*\(\s*self\s*\)/gm
  const constructMatch = classWithConstructPattern.exec(code)
  if (constructMatch) {
    return constructMatch[1]
  }

  // Last resort: any top-level class that inherits from something containing "Scene"
  const anyScenePattern = /^class\s+(\w+)\s*\(\s*\w*Scene\w*\s*\)/gm
  const anyMatch = anyScenePattern.exec(code)
  return anyMatch ? anyMatch[1] : null
}

export function cleanManimCode(code: string): CleanupResult {
  let cleaned = code
  const changes: string[] = []

  if (cleaned.includes('\uFEFF')) {
    cleaned = cleaned.replace(/\uFEFF/g, '')
    changes.push('remove-bom')
  }

  if (cleaned.includes('\uFFFD')) {
    cleaned = cleaned.replace(/\uFFFD/g, '')
    changes.push('remove-replacement-char')
  }

  const importFixResult = fixBadImports(cleaned)
  if (importFixResult.fixed) {
    cleaned = importFixResult.code
    changes.push('fix-bad-imports')
  }

  const fullwidthResult = replaceFullwidthOutsideStrings(cleaned)
  if (fullwidthResult.replaced > 0) {
    cleaned = fullwidthResult.code
    changes.push(`normalize-fullwidth-punctuation:${fullwidthResult.replaced}`)
  } else {
    cleaned = fullwidthResult.code
  }

  const dashedResult = replaceLineWithDashedLine(cleaned)
  if (dashedResult.changed > 0) {
    cleaned = dashedResult.code
    changes.push(`line-to-dashedline:${dashedResult.changed}`)
  }

  return { code: cleaned, changes }
}

/**
 * Get the scene class name from the code (for manim render command)
 */
export function getSceneClassName(code: string): string {
  const detectedClass = detectSceneClassName(code)
  return detectedClass || 'MainScene'
}
