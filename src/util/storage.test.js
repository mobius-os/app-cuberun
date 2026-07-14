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
} from './storage'

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem: jest.fn((key) => values.has(key) ? values.get(key) : null),
    setItem: jest.fn((key, value) => values.set(key, value)),
  }
}

describe('storage helpers', () => {
  it('normalizes high scores to three descending numbers', () => {
    expect(normalizeHighScores([10, '30.4', -2, 'bad', 20, 40])).toEqual([40, 30, 20])
    expect(normalizeHighScores(null)).toEqual([0, 0, 0])
  })

  it('falls back for corrupt high-score values', () => {
    const storage = createStorage({ [HIGH_SCORES_KEY]: 'not json' })

    expect(readHighScores(storage)).toEqual([0, 0, 0])
  })

  it('reads legacy high scores without writing the bare key', () => {
    const storage = createStorage({
      [LEGACY_HIGH_SCORES_KEY]: JSON.stringify([100, 50, 10]),
    })

    expect(readHighScores(storage)).toEqual([100, 50, 10])
    writeHighScores([150, 100, 50], storage)

    expect(storage.setItem).toHaveBeenCalledWith(HIGH_SCORES_KEY, JSON.stringify([150, 100, 50]))
    expect(storage.setItem).not.toHaveBeenCalledWith(LEGACY_HIGH_SCORES_KEY, expect.any(String))
  })

  it('falls back for corrupt music settings and writes only the namespaced key', () => {
    const storage = createStorage({
      [MUSIC_ENABLED_KEY]: 'bad',
      [LEGACY_MUSIC_ENABLED_KEY]: 'also bad',
    })

    expect(readMusicEnabled(storage)).toBe(false)
    writeMusicEnabled(true, storage)

    expect(storage.setItem).toHaveBeenCalledWith(MUSIC_ENABLED_KEY, 'true')
    expect(storage.setItem).not.toHaveBeenCalledWith(LEGACY_MUSIC_ENABLED_KEY, expect.any(String))
  })

  it('can read a valid legacy music setting during migration', () => {
    const storage = createStorage({
      [LEGACY_MUSIC_ENABLED_KEY]: 'true',
    })

    expect(readMusicEnabled(storage)).toBe(true)
  })

  it('renders with defaults when opaque-frame localStorage is unavailable', () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('Access denied', 'SecurityError')
      },
    })

    try {
      expect(readHighScores()).toEqual([0, 0, 0])
      expect(readMusicEnabled()).toBe(false)
      expect(writeHighScores([30, 20, 10])).toEqual([30, 20, 10])
      expect(writeMusicEnabled(true)).toBe(true)
    } finally {
      Object.defineProperty(window, 'localStorage', descriptor)
    }
  })

  it('treats throwing storage methods as unavailable', () => {
    const storage = {
      getItem() { throw new DOMException('Access denied', 'SecurityError') },
      setItem() { throw new DOMException('Access denied', 'SecurityError') },
    }

    expect(readHighScores(storage)).toEqual([0, 0, 0])
    expect(readMusicEnabled(storage)).toBe(false)
    expect(writeHighScores([3, 2, 1], storage)).toEqual([3, 2, 1])
    expect(writeMusicEnabled(true, storage)).toBe(true)
  })

  it('trusts only the wrapper window, including its opaque origin', () => {
    const wrapper = {}
    expect(isTrustedWrapperMessage(
      { source: wrapper, origin: 'null' }, wrapper, 'https://mobius.test',
    )).toBe(true)
    expect(isTrustedWrapperMessage(
      { source: wrapper, origin: 'https://mobius.test' },
      wrapper,
      'https://mobius.test',
    )).toBe(true)
    expect(isTrustedWrapperMessage(
      { source: {}, origin: 'null' }, wrapper, 'https://mobius.test',
    )).toBe(false)
    expect(isTrustedWrapperMessage(
      { source: wrapper, origin: 'https://evil.test' },
      wrapper,
      'https://mobius.test',
    )).toBe(false)
  })
})
