import assert from 'node:assert/strict'
import { describe, it, mock } from 'node:test'

import { startReadyHandshake } from './readyHandshake.js'

function createHarness() {
  const listeners = new Map()
  const wrapperWindow = { postMessage: mock.fn() }
  const childWindow = {
    location: { origin: 'null' },
    addEventListener: mock.fn((type, listener) => listeners.set(type, listener)),
    removeEventListener: mock.fn((type, listener) => {
      if (listeners.get(type) === listener) listeners.delete(type)
    }),
    setInterval: mock.fn((callback) => {
      childWindow.retry = callback
      return 17
    }),
    clearInterval: mock.fn(),
  }
  const dispatch = (data, source = wrapperWindow, origin = 'null') => {
    listeners.get('message')?.({ data, source, origin })
  }
  return { childWindow, dispatch, listeners, wrapperWindow }
}

describe('CubeRun ready handshake', () => {
  it('retries readiness until the wrapper acknowledges it', () => {
    const harness = createHarness()
    const stop = startReadyHandshake(harness)

    assert.deepEqual(
      harness.wrapperWindow.postMessage.mock.calls[0].arguments,
      [{ type: 'cuberun:ready' }, '*'],
    )
    harness.childWindow.retry()
    assert.equal(harness.wrapperWindow.postMessage.mock.calls.length, 2)

    harness.dispatch({ type: 'cuberun:ready-ack' })
    assert.deepEqual(harness.childWindow.clearInterval.mock.calls[0].arguments, [17])
    harness.childWindow.retry()
    assert.equal(harness.wrapperWindow.postMessage.mock.calls.length, 2)

    stop()
    const removeArguments = harness.childWindow.removeEventListener.mock.calls[0].arguments
    assert.equal(removeArguments[0], 'message')
    assert.equal(typeof removeArguments[1], 'function')
  })

  it('answers a trusted probe and ignores another window', () => {
    const harness = createHarness()
    startReadyHandshake(harness)

    harness.dispatch({ type: 'cuberun:ready-probe' })
    assert.equal(harness.wrapperWindow.postMessage.mock.calls.length, 2)

    harness.dispatch({ type: 'cuberun:ready-ack' }, {})
    assert.equal(harness.childWindow.clearInterval.mock.calls.length, 0)
  })
})
