import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'

import randomInRange from './randomInRange.js'

describe('randomInRange', () => {
  const originalRandom = Math.random

  afterEach(() => {
    Math.random = originalRandom
  })

  it('supports negative-to-zero ranges', () => {
    const values = [0, 0.999]
    Math.random = () => values.shift()

    assert.equal(randomInRange(-200, 0), -200)
    assert.equal(randomInRange(-200, 0), 0)
  })

  it('supports positive and symmetric ranges', () => {
    Math.random = () => 0.5

    assert.equal(randomInRange(0, 200), 100)
    assert.equal(randomInRange(-5, 5), 0)
  })
})
