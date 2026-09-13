export const HIGH_SCORES_KEY = 'cuberun:highscores'
export const LEGACY_HIGH_SCORES_KEY = 'highscores'
export const MUSIC_ENABLED_KEY = 'cuberun:musicEnabled'
export const LEGACY_MUSIC_ENABLED_KEY = 'musicEnabled'
export const STORAGE_MIGRATION_KEY = 'cuberun:storage-migration-v1'

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

function tryGet(storage, key) {
  try {
    return { ok: true, value: storage?.getItem(key) ?? null }
  } catch {
    return { ok: false, value: null }
  }
}

function safeGet(storage, key) {
  return tryGet(storage, key).value
}

function safeSet(storage, key, value) {
  try {
    storage?.setItem(key, value)
  } catch {
    // The wrapper owns durable storage in Mobius; standalone storage is best
    // effort and must never prevent the game from rendering.
  }
}

function setAndConfirm(storage, key, value) {
  try {
    storage?.setItem(key, value)
  } catch {
    return false
  }

  const readback = tryGet(storage, key)
  return readback.ok && readback.value === value
}

export function migrateLegacyStorage(storage) {
  const target = storage ?? browserStorage()
  if (!target) return

  const marker = tryGet(target, STORAGE_MIGRATION_KEY)
  if (!marker.ok || marker.value === '1') return

  const storedValues = {
    currentScores: tryGet(target, HIGH_SCORES_KEY),
    legacyScores: tryGet(target, LEGACY_HIGH_SCORES_KEY),
    currentMusic: tryGet(target, MUSIC_ENABLED_KEY),
    legacyMusic: tryGet(target, LEGACY_MUSIC_ENABLED_KEY),
  }
  if (Object.values(storedValues).some(({ ok }) => !ok)) return

  const currentScores = safeParseJson(storedValues.currentScores.value)
  const legacyScores = safeParseJson(storedValues.legacyScores.value)
  const scores = Array.isArray(currentScores) ? currentScores : legacyScores
  if (Array.isArray(scores)) {
    const canonicalScores = JSON.stringify(normalizeHighScores(scores))
    if (!setAndConfirm(target, HIGH_SCORES_KEY, canonicalScores)) return
  }

  const currentMusic = safeParseJson(storedValues.currentMusic.value)
  const legacyMusic = safeParseJson(storedValues.legacyMusic.value)
  const music = typeof currentMusic === 'boolean' ? currentMusic : legacyMusic
  if (typeof music === 'boolean') {
    if (!setAndConfirm(target, MUSIC_ENABLED_KEY, JSON.stringify(music))) return
  }

  // The marker itself is app-scoped by the frame bridge. Rewriting even an
  // already-namespaced visible value above is intentional: an older
  // same-origin CubeRun may have left it at the shell origin, while this write
  // establishes the app-owned physical copy before that shell import retires.
  setAndConfirm(target, STORAGE_MIGRATION_KEY, '1')
}

export function readHighScores(storage) {
  const target = storage ?? browserStorage()
  migrateLegacyStorage(target)
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
  migrateLegacyStorage(target)
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
