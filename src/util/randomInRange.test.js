import randomInRange from './randomInRange'

describe('randomInRange', () => {
  const originalRandom = Math.random

  afterEach(() => {
    Math.random = originalRandom
  })

  it('supports negative-to-zero ranges', () => {
    Math.random = jest.fn()
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.999)

    expect(randomInRange(-200, 0)).toBe(-200)
    expect(randomInRange(-200, 0)).toBe(0)
  })

  it('supports positive and symmetric ranges', () => {
    Math.random = jest.fn()
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5)

    expect(randomInRange(0, 200)).toBe(100)
    expect(randomInRange(-5, 5)).toBe(0)
  })
})
