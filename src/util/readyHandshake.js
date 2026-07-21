import { isTrustedWrapperMessage } from './storage'

export const READY_RETRY_MS = 500

// The wrapper owns the loading veil, so readiness must be acknowledged rather
// than sent as a one-shot event. This also answers an explicit probe from a
// freshly mounted wrapper and keeps warm-cache startup deterministic.
export function startReadyHandshake({
  childWindow = window,
  wrapperWindow = window.parent,
  retryMs = READY_RETRY_MS,
} = {}) {
  if (!wrapperWindow || wrapperWindow === childWindow) return () => {}

  let acknowledged = false
  let retryTimer = null

  const postReady = () => {
    if (acknowledged) return
    try {
      wrapperWindow.postMessage({ type: 'cuberun:ready' }, '*')
    } catch {
      /* The wrapper may disappear while the page is navigating. */
    }
  }

  const onWrapperMessage = (event) => {
    if (!isTrustedWrapperMessage(
      event,
      wrapperWindow,
      childWindow.location?.origin,
    )) return

    if (event.data?.type === 'cuberun:ready-probe') {
      postReady()
      return
    }
    if (event.data?.type === 'cuberun:ready-ack') {
      acknowledged = true
      if (retryTimer !== null) childWindow.clearInterval(retryTimer)
      retryTimer = null
    }
  }

  childWindow.addEventListener('message', onWrapperMessage)
  retryTimer = childWindow.setInterval(postReady, retryMs)
  postReady()

  return () => {
    childWindow.removeEventListener('message', onWrapperMessage)
    if (retryTimer !== null) childWindow.clearInterval(retryTimer)
  }
}
