import assert from 'node:assert/strict'
import { describe, it, mock } from 'node:test'

import {
  HIGH_SCORES_KEY,
  isTrustedWrapperMessage,
  LEGACY_HIGH_SCORES_KEY,
  LEGACY_MUSIC_ENABLED_KEY,
  MUSIC_ENABLED_KEY,
  normalizeHighScores,
  readHighScores,
  readMusicEnabled,
  writeHighScores,
  writeMusicEnabled,
} from './storage.js'

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem: mock.fn((key) => values.has(key) ? values.get(key) : null),
    setItem: mock.fn((key, value) => values.set(key, value)),
  }
}

describe('storage helpers', () => {
  it('normalizes high scores to three descending numbers', () => {
    assert.deepEqual(normalizeHighScores([10, '30.4', -2, 'bad', 20, 40]), [40, 30, 20])
    assert.deepEqual(normalizeHighScores(null), [0, 0, 0])
  })

  it('falls back for corrupt high-score values', () => {
    const storage = createStorage({ [HIGH_SCORES_KEY]: 'not json' })

    assert.deepEqual(readHighScores(storage), [0, 0, 0])
  })

  it('reads legacy high scores without writing the bare key', () => {
    const storage = createStorage({
      [LEGACY_HIGH_SCORES_KEY]: JSON.stringify([100, 50, 10]),
    })

    assert.deepEqual(readHighScores(storage), [100, 50, 10])
    writeHighScores([150, 100, 50], storage)

    const writes = storage.setItem.mock.calls.map((call) => call.arguments)
    assert.deepEqual(writes[0], [HIGH_SCORES_KEY, JSON.stringify([150, 100, 50])])
    assert.equal(writes.some(([key]) => key === LEGACY_HIGH_SCORES_KEY), false)
  })

  it('falls back for corrupt music settings and writes only the namespaced key', () => {
    const storage = createStorage({
      [MUSIC_ENABLED_KEY]: 'bad',
      [LEGACY_MUSIC_ENABLED_KEY]: 'also bad',
    })

    assert.equal(readMusicEnabled(storage), false)
    writeMusicEnabled(true, storage)

    const writes = storage.setItem.mock.calls.map((call) => call.arguments)
    assert.deepEqual(writes[0], [MUSIC_ENABLED_KEY, 'true'])
    assert.equal(writes.some(([key]) => key === LEGACY_MUSIC_ENABLED_KEY), false)
  })

  it('can read a valid legacy music setting during migration', () => {
    const storage = createStorage({
      [LEGACY_MUSIC_ENABLED_KEY]: 'true',
    })

    assert.equal(readMusicEnabled(storage), true)
  })

  it('renders with defaults when opaque-frame localStorage is unavailable', () => {
    const previousWindow = globalThis.window
    globalThis.window = {}
    Object.defineProperty(globalThis.window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('Access denied', 'SecurityError')
      },
    })

    try {
      assert.deepEqual(readHighScores(), [0, 0, 0])
      assert.equal(readMusicEnabled(), false)
      assert.deepEqual(writeHighScores([30, 20, 10]), [30, 20, 10])
      assert.equal(writeMusicEnabled(true), true)
    } finally {
      if (previousWindow === undefined) delete globalThis.window
      else globalThis.window = previousWindow
    }
  })

  it('treats throwing storage methods as unavailable', () => {
    const storage = {
      getItem() { throw new DOMException('Access denied', 'SecurityError') },
      setItem() { throw new DOMException('Access denied', 'SecurityError') },
    }

    assert.deepEqual(readHighScores(storage), [0, 0, 0])
    assert.equal(readMusicEnabled(storage), false)
    assert.deepEqual(writeHighScores([3, 2, 1], storage), [3, 2, 1])
    assert.equal(writeMusicEnabled(true, storage), true)
  })

  it('trusts only the wrapper window, including its opaque origin', () => {
    const wrapper = {}
    assert.equal(isTrustedWrapperMessage(
      { source: wrapper, origin: 'null' }, wrapper, 'https://mobius.test',
    ), true)
    assert.equal(isTrustedWrapperMessage(
      { source: wrapper, origin: 'https://mobius.test' },
      wrapper,
      'https://mobius.test',
    ), true)
    assert.equal(isTrustedWrapperMessage(
      { source: {}, origin: 'null' }, wrapper, 'https://mobius.test',
    ), false)
    assert.equal(isTrustedWrapperMessage(
      { source: wrapper, origin: 'https://evil.test' },
      wrapper,
      'https://mobius.test',
    ), false)
  })
})
