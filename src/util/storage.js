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

export function readHighScores(storage = window.localStorage) {
  const namespaced = safeParseJson(storage.getItem(HIGH_SCORES_KEY))
  if (namespaced) return normalizeHighScores(namespaced)

  const legacy = safeParseJson(storage.getItem(LEGACY_HIGH_SCORES_KEY))
  if (legacy) return normalizeHighScores(legacy)

  return [...DEFAULT_HIGH_SCORES]
}

export function writeHighScores(scores, storage = window.localStorage) {
  const normalized = normalizeHighScores(scores)
  storage.setItem(HIGH_SCORES_KEY, JSON.stringify(normalized))
  return normalized
}

export function readMusicEnabled(storage = window.localStorage) {
  const namespaced = safeParseJson(storage.getItem(MUSIC_ENABLED_KEY))
  if (typeof namespaced === 'boolean') return namespaced

  const legacy = safeParseJson(storage.getItem(LEGACY_MUSIC_ENABLED_KEY))
  if (typeof legacy === 'boolean') return legacy

  return false
}

export function writeMusicEnabled(enabled, storage = window.localStorage) {
  const value = Boolean(enabled)
  storage.setItem(MUSIC_ENABLED_KEY, JSON.stringify(value))
  return value
}

export function postToWrapper(message) {
  if (typeof window === 'undefined' || window.parent === window) return
  try {
    window.parent.postMessage(message, window.location.origin)
  } catch {
    /* Standalone development page without a same-origin parent. */
  }
}
