import { useState, useEffect, useRef } from 'react'

// Probe the asset index.html before mounting the iframe. A HEAD request is
// tried first; if the server returns 405 (Method Not Allowed) a GET is used
// instead. Returns 'ok', 'missing', or 'error'.
async function probeAsset(url) {
  try {
    let res = await fetch(url, { method: 'HEAD' })
    if (res.status === 405) {
      res = await fetch(url, { method: 'GET' })
    }
    if (res.ok) return 'ok'
    if (res.status === 404) return 'missing'
    return 'error'
  } catch {
    return 'error'
  }
}

const DARK = '#10121f'

const CSS = `
@keyframes cr-spin { to { transform: rotate(360deg); } }
.cr-root {
  position: relative; height: 100%; width: 100%; overflow: hidden;
  background: ${DARK}; display: flex; align-items: center; justify-content: center;
}
.cr-frame {
  position: absolute; inset: 0; width: 100%; height: 100%; border: 0;
  display: block; background: ${DARK};
  transition: opacity 0.25s ease;
}
.cr-overlay {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 16px; pointer-events: none;
}
.cr-spinner {
  width: 36px; height: 36px; border-radius: 50%;
  border: 3px solid rgba(255,255,255,0.12);
  border-top-color: rgba(255,255,255,0.7);
  animation: cr-spin 0.9s linear infinite;
}
.cr-label {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 14px; color: rgba(255,255,255,0.55); letter-spacing: 0.02em;
}
.cr-error-panel {
  max-width: 320px; padding: 28px 24px; border-radius: 14px;
  background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12);
  text-align: center; pointer-events: none;
}
.cr-error-title {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 15px; font-weight: 700; color: rgba(255,255,255,0.8);
  margin-bottom: 10px; letter-spacing: -0.01em;
}
.cr-error-body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 13px; line-height: 1.55; color: rgba(255,255,255,0.5);
}
`

export default function CubeRunApp({ appId }) {
  const src = appId ? `/app-assets/by-id/${appId}/index.html` : '/app-assets/cuberun/index.html'

  // 'probing' → 'loading' (probe passed, iframe mounted) → 'ready' (iframe onLoad)
  // 'missing' or 'error' replace the above on probe failure.
  const [phase, setPhase] = useState('probing')
  const iframeRef = useRef(null)

  useEffect(() => {
    let live = true
    probeAsset(src).then((result) => {
      if (!live) return
      if (result === 'ok') {
        setPhase('loading')
      } else {
        setPhase(result) // 'missing' or 'error'
      }
    })
    return () => { live = false }
  }, [src])

  const showFrame = phase === 'loading' || phase === 'ready'
  const frameOpacity = phase === 'ready' ? 1 : 0

  const showSpinner = phase === 'probing' || phase === 'loading'
  const showError = phase === 'missing' || phase === 'error'

  return (
    <div className="cr-root">
      <style>{CSS}</style>

      {showFrame && (
        <iframe
          ref={iframeRef}
          title="CubeRun"
          src={src}
          className="cr-frame"
          style={{ opacity: frameOpacity }}
          allow="autoplay; fullscreen; gamepad"
          onLoad={() => setPhase('ready')}
        />
      )}

      {showSpinner && (
        <div className="cr-overlay" aria-live="polite">
          <span className="cr-spinner" aria-hidden="true" />
          <span className="cr-label">Loading CubeRun…</span>
        </div>
      )}

      {showError && (
        <div className="cr-overlay">
          <div className="cr-error-panel" role="alert">
            <div className="cr-error-title">Game assets missing</div>
            <div className="cr-error-body">
              Try reinstalling CubeRun from the App Store.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
