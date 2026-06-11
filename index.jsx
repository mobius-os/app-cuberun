import { useState, useEffect, useRef } from 'react'

// Probe the asset index.html before mounting the iframe. A HEAD request is
// tried first; if the server returns 405 (Method Not Allowed) a GET is used
// instead. Returns 'ok', 'missing', or 'error'.
async function probeAsset(url) {
  // The probe exists only to catch a hard 404 (missing assets) with a
  // friendly panel. Anything ambiguous — timeout, SW interception, odd
  // status — resolves 'ok' and lets the iframe itself be the real test:
  // a wrapper must never be able to wedge the game behind a spinner.
  const timeout = new Promise((resolve) => setTimeout(() => resolve('ok'), 3000))
  const check = (async () => {
    try {
      let res = await fetch(url, { method: 'HEAD' })
      if (res.status === 405 || res.status === 501) {
        res = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-0' } })
      }
      if (res.status === 404) return 'missing'
      return 'ok'
    } catch {
      return 'ok'
    }
  })()
  return Promise.race([timeout, check])
}

const CSS = `
@keyframes cr-spin { to { transform: rotate(360deg); } }
.cr-root {
  position: relative; height: 100%; width: 100%; overflow: hidden;
  background: var(--bg); display: flex; align-items: center; justify-content: center;
}
.cr-frame {
  position: absolute; inset: 0; width: 100%; height: 100%; border: 0;
  display: block; background: var(--bg);
  transition: opacity 0.25s ease;
}
.cr-overlay {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 16px; pointer-events: none;
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
}
/* The error branch needs to host a tappable Retry control, so it opts back
   into pointer events (the spinner overlay stays pass-through). */
.cr-overlay--error { pointer-events: auto; }
/* mobius-ui: loading-state */
.cr-spinner {
  width: 36px; height: 36px; border-radius: 50%;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  animation: cr-spin 0.9s linear infinite;
}
@media (prefers-reduced-motion: reduce) {
  .cr-spinner { animation: none; }
}
.cr-label {
  font-family: var(--font);
  font-size: 14px; color: var(--muted); letter-spacing: 0.02em;
}
/* /mobius-ui */
/* mobius-ui: error-panel */
.cr-error-panel {
  max-width: 320px; padding: 28px 24px; border-radius: 14px;
  background: var(--surface); border: 1px solid var(--border);
  text-align: center;
}
.cr-error-title {
  font-family: var(--font);
  font-size: 15px; font-weight: 700; color: var(--text);
  margin-bottom: 10px; letter-spacing: -0.01em;
}
.cr-error-body {
  font-family: var(--font);
  font-size: 13px; line-height: 1.55; color: var(--muted);
}
.cr-retry {
  margin-top: 18px; min-height: 44px; padding: 0 22px;
  border: 0; border-radius: 10px; cursor: pointer;
  background: var(--accent); color: var(--bg);
  font-family: var(--font); font-size: 14px; font-weight: 600;
}
.cr-retry:hover { background: var(--accent-hover); }
/* /mobius-ui */
`

export default function CubeRunApp({ appId }) {
  const src = appId ? `/app-assets/by-id/${appId}/index.html` : '/app-assets/cuberun/index.html'

  // 'probing' → 'loading' (probe passed, iframe mounted) → 'ready' (iframe onLoad)
  // 'missing' or 'error' replace the above on probe failure.
  const [phase, setPhase] = useState('probing')
  // Bumping this key re-runs the probe effect — the Retry control's mechanism.
  const [attempt, setAttempt] = useState(0)
  const iframeRef = useRef(null)

  useEffect(() => {
    let live = true
    setPhase('probing')
    probeAsset(src).then((result) => {
      if (!live) return
      if (result === 'ok') {
        setPhase('loading')
      } else {
        setPhase(result) // 'missing' or 'error'
      }
    })
    return () => { live = false }
  }, [src, attempt])

  // onLoad on a nested iframe has proven unreliable enough to wedge the
  // spinner overlay over a perfectly working game. Belt-and-suspenders:
  // once the iframe is mounted, drop the overlay after 5s no matter what.
  useEffect(() => {
    if (phase !== 'loading') return
    const t = setTimeout(() => setPhase('ready'), 5000)
    return () => clearTimeout(t)
  }, [phase])

  const showFrame = phase === 'loading' || phase === 'ready'

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
        <div className="cr-overlay cr-overlay--error">
          <div className="cr-error-panel" role="alert">
            <div className="cr-error-title">
              {phase === 'missing' ? 'Game assets missing' : "Couldn't load CubeRun"}
            </div>
            <div className="cr-error-body">
              {phase === 'missing'
                ? 'Some files are missing. Retry, or reinstall CubeRun from the App Store.'
                : 'Something went wrong reaching the game. Check your connection and try again.'}
            </div>
            <button
              type="button"
              className="cr-retry"
              onClick={() => setAttempt((n) => n + 1)}
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
