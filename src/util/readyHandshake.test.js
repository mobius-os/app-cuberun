import { startReadyHandshake } from './readyHandshake'

function createHarness() {
  const listeners = new Map()
  const wrapperWindow = { postMessage: jest.fn() }
  const childWindow = {
    location: { origin: 'null' },
    addEventListener: jest.fn((type, listener) => listeners.set(type, listener)),
    removeEventListener: jest.fn((type, listener) => {
      if (listeners.get(type) === listener) listeners.delete(type)
    }),
    setInterval: jest.fn((callback) => {
      childWindow.retry = callback
      return 17
    }),
    clearInterval: jest.fn(),
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

    expect(harness.wrapperWindow.postMessage).toHaveBeenCalledWith(
      { type: 'cuberun:ready' },
      '*',
    )
    harness.childWindow.retry()
    expect(harness.wrapperWindow.postMessage).toHaveBeenCalledTimes(2)

    harness.dispatch({ type: 'cuberun:ready-ack' })
    expect(harness.childWindow.clearInterval).toHaveBeenCalledWith(17)
    harness.childWindow.retry()
    expect(harness.wrapperWindow.postMessage).toHaveBeenCalledTimes(2)

    stop()
    expect(harness.childWindow.removeEventListener).toHaveBeenCalledWith(
      'message',
      expect.any(Function),
    )
  })

  it('answers a trusted probe and ignores another window', () => {
    const harness = createHarness()
    startReadyHandshake(harness)

    harness.dispatch({ type: 'cuberun:ready-probe' })
    expect(harness.wrapperWindow.postMessage).toHaveBeenCalledTimes(2)

    harness.dispatch({ type: 'cuberun:ready-ack' }, {})
    expect(harness.childWindow.clearInterval).not.toHaveBeenCalled()
  })
})
