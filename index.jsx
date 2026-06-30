import { useState, useEffect, useRef } from 'react'

// Cache-bust key for the asset entry document. Mobius's 2026-06-12
// /app-assets caching change (ETag/304 + Range/206) let this wrapper's old
// probe — a 'Range: bytes=0-0' GET — poison the browser HTTP cache and the
// service worker cache under the bare index.html URL: later full GETs
// revalidated 304 and got served the stored 1-byte body as a 200, so the
// iframe rendered a one-character document (black screen). A fresh query key
// sidesteps every poisoned entry already on devices without needing client
// caches cleared. Bump it only if this URL ever needs re-keying again.
const ASSET_BUST = 'v=20260630'

// Probe the asset index.html before mounting the iframe. Returns 'ok',
// 'missing', or 'error'.
async function probeAsset(url) {
  // The probe exists only to catch a hard 404 (missing assets) with a
  // friendly panel. Anything ambiguous — timeout, SW interception, odd
  // status — resolves 'ok' and lets the iframe itself be the real test:
  // a wrapper must never be able to wedge the game behind a spinner.
  const timeout = new Promise((resolve) => setTimeout(() => resolve('ok'), 3000))
  const check = (async () => {
    try {
      // Plain GET, never HEAD-then-Range: the server 405s HEAD, and the
      // 'Range: bytes=0-0' fallback is what poisoned the HTTP cache with a
      // 1-byte body once the server grew 206 support (see ASSET_BUST note).
      // 'no-store' keeps the probe itself out of the HTTP cache; the ~2.5KB
      // body is discarded — only the status matters.
      const res = await fetch(url, { method: 'GET', cache: 'no-store' })
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
  background: var(--accent); color: var(--accent-fg);
  font-family: var(--font); font-size: 14px; font-weight: 600;
}
.cr-retry:hover { background: var(--accent-hover); }
/* /mobius-ui */
`

export default function CubeRunApp({ appId }) {
  const src = appId
    ? `/app-assets/by-id/${appId}/index.html?${ASSET_BUST}`
    : `/app-assets/cuberun/index.html?${ASSET_BUST}`

  // Ask the shell to hide its top bar so the game fills the whole screen,
  // including under the camera notch (the shell switches the iOS status bar
  // to translucent and drops its header). Released on unmount so leaving the
  // game restores normal chrome.
  useEffect(() => {
    const post = (value) => {
      try {
        window.parent.postMessage(
          { type: 'moebius:immersive', value, appId },
          window.location.origin,
        )
      } catch {
        /* not embedded in the shell (standalone /a/cuberun) — no-op */
      }
    }
    post(true)
    return () => post(false)
  }, [appId])

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
          onError={() => setPhase('error')}
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
