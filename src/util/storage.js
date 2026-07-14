export const HIGH_SCORES_KEY = 'cuberun:highscores'
export const LEGACY_HIGH_SCORES_KEY = 'highscores'
export const MUSIC_ENABLED_KEY = 'cuberun:musicEnabled'
export const LEGACY_MUSIC_ENABLED_KEY = 'musicEnabled'

const DEFAULT_HIGH_SCORES = [0, 0, 0]

export function normalizeHighScores(value) {
  if (!Array.isArray(value)) return [...DEFAULT_HIGH_SCORES]

  const scores = value
    .map((score) => Number(score))
    .filter((score) => Number.isFinite(score) && score >= 0)
    .map((score) => Math.round(score))
    .sort((a, b) => b - a)
    .slice(0, 3)

  while (scores.length < 3) scores.push(0)
  return scores
}

function safeParseJson(value) {
  if (value == null) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function browserStorage() {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    // Sandboxed opaque frames can throw before the wrapper bridge is ready.
    return null
  }
}

function safeGet(storage, key) {
  try {
    return storage?.getItem(key) ?? null
  } catch {
    return null
  }
}

function safeSet(storage, key, value) {
  try {
    storage?.setItem(key, value)
  } catch {
    // The wrapper owns durable storage in Mobius; standalone storage is best
    // effort and must never prevent the game from rendering.
  }
}

export function readHighScores(storage) {
  const target = storage ?? browserStorage()
  const namespaced = safeParseJson(safeGet(target, HIGH_SCORES_KEY))
  if (namespaced) return normalizeHighScores(namespaced)

  const legacy = safeParseJson(safeGet(target, LEGACY_HIGH_SCORES_KEY))
  if (legacy) return normalizeHighScores(legacy)

  return [...DEFAULT_HIGH_SCORES]
}

export function writeHighScores(scores, storage) {
  const normalized = normalizeHighScores(scores)
  safeSet(storage ?? browserStorage(), HIGH_SCORES_KEY, JSON.stringify(normalized))
  return normalized
}

export function readMusicEnabled(storage) {
  const target = storage ?? browserStorage()
  const namespaced = safeParseJson(safeGet(target, MUSIC_ENABLED_KEY))
  if (typeof namespaced === 'boolean') return namespaced

  const legacy = safeParseJson(safeGet(target, LEGACY_MUSIC_ENABLED_KEY))
  if (typeof legacy === 'boolean') return legacy

  return false
}

export function writeMusicEnabled(enabled, storage) {
  const value = Boolean(enabled)
  safeSet(storage ?? browserStorage(), MUSIC_ENABLED_KEY, JSON.stringify(value))
  return value
}

export function isTrustedWrapperMessage(
  event,
  parentWindow = window.parent,
  expectedOrigin = window.location.origin,
) {
  return event?.source === parentWindow && (
    event.origin === expectedOrigin || event.origin === 'null'
  )
}

export function postToWrapper(message) {
  if (typeof window === 'undefined' || window.parent === window) return
  try {
    // Möbius deliberately runs both this packaged game and its wrapper under
    // an opaque sandbox origin. Opaque targets cannot be addressed with a
    // concrete targetOrigin; the wrapper authenticates this sender by the
    // exact child contentWindow instead.
    window.parent.postMessage(message, '*')
  } catch {
    /* Standalone development page without a parent. */
  }
}
