function splitKeyList(input: string | undefined): string[] {
  if (!input) {
    return []
  }
  return input
    .split(/[\n,]+/g)
    .map((item) => item.trim())
    .filter(Boolean)
}

/**
 * BUG-103 (server-side) fix: defence-in-depth deny-list.
 *
 * The Bearer key `qv-vllm` was historically shipped as a default in the
 * QuizVerse TutorX SPA (and is therefore client-visible / forgeable). Even
 * if a misconfigured deployment env still includes it in
 * `MANIMCAT_ROUTE_KEYS`, this list strips it out before it can ever match
 * an incoming request. Add additional well-known burned values here as
 * they are discovered.
 *
 * Override this list ONLY in non-production smoke testing by setting
 * `MANIMCAT_ROUTE_KEY_DENYLIST_OVERRIDE=true`.
 */
const HARD_DENY_KEYS: ReadonlySet<string> = new Set([
  'qv-vllm',
])

export function getAllowedManimcatApiKeys(): string[] {
  const routed = splitKeyList(process.env.MANIMCAT_ROUTE_KEYS)
  const allowOverride = process.env.MANIMCAT_ROUTE_KEY_DENYLIST_OVERRIDE === 'true'
  const filtered = allowOverride
    ? routed
    : routed.filter((k) => !HARD_DENY_KEYS.has(k))
  const unique = new Set<string>([...filtered])
  return Array.from(unique)
}

export function hasManimcatApiKey(token: string): boolean {
  if (!token) {
    return false
  }
  // Token is also rejected if it is on the hard deny-list, regardless of env.
  if (HARD_DENY_KEYS.has(token) && process.env.MANIMCAT_ROUTE_KEY_DENYLIST_OVERRIDE !== 'true') {
    return false
  }
  return getAllowedManimcatApiKeys().includes(token)
}
