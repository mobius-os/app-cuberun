import { useState, useEffect, useRef, useCallback } from 'react'

// Build key for the nested entry document. There is deliberately no fetch
// probe: this wrapper has an opaque origin, so probing would require broad
// CORS and would download the game twice. The source-bound ready heartbeat is
// the only success signal; timeout/retry owns every missing or blocked case.
const ASSET_BUST = 'v=20260715a'
const READY_TIMEOUT_MS = 12000
const HIGH_SCORES_PATH = 'highscores.json'

function normalizeHighScores(value) {
  if (!Array.isArray(value)) return [0, 0, 0]

  const scores = value
    .map((score) => Number(score))
    .filter((score) => Number.isFinite(score) && score >= 0)
    .map((score) => Math.round(score))
    .sort((a, b) => b - a)
    .slice(0, 3)

  while (scores.length < 3) scores.push(0)
  return scores
}

function emitSignal(name, payload = {}) {
  try {
    window.mobius?.signal?.(name, payload)
  } catch {
    /* Signal delivery is best-effort; never block the game wrapper. */
  }
}

const CSS = `
@keyframes cr-spin { to { transform: rotate(360deg); } }
/* mobius-ui:Root v1 — keep in sync; library candidate. Cuberun is
   immersive, so this wrapper only owns loading/error chrome around the game. */
.cr-root {
  position: relative; height: 100%; width: 100%; overflow: hidden;
  background: var(--bg); display: flex; align-items: center; justify-content: center;
  color: var(--text); font-family: var(--font);
  -webkit-font-smoothing: antialiased;
  -webkit-tap-highlight-color: transparent;
}
/* /mobius-ui:Root */
/* mobius-ui:Focus v1 -- shared keyboard focus ring (WCAG 2.4.7); never bare outline:none */
:where(button,a,input,textarea,select,summary,[role="button"],[tabindex]:not([tabindex="-1"])):focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
/* /mobius-ui:Focus */
.cr-sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
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
  padding:
    max(16px, env(safe-area-inset-top))
    max(16px, env(safe-area-inset-right))
    max(16px, env(safe-area-inset-bottom))
    max(16px, env(safe-area-inset-left));
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
.cr-label {
  font-family: var(--font);
  font-size: 14px; color: var(--muted); letter-spacing: 0;
}
/* /mobius-ui */
/* mobius-ui: error-panel */
.cr-error-panel {
  max-width: 320px; padding: 28px 24px; border-radius: 8px;
  background: var(--surface); border: 1px solid var(--border);
  text-align: center;
}
.cr-error-title {
  font-family: var(--font);
  font-size: 15px; font-weight: 700; color: var(--text);
  margin-bottom: 10px; letter-spacing: 0;
}
.cr-error-body {
  font-family: var(--font);
  font-size: 13px; line-height: 1.55; color: var(--muted);
}
.cr-retry {
  margin-top: 18px; min-height: 44px; padding: 0 22px;
  border: 0; border-radius: 8px; cursor: pointer;
  background: var(--accent); color: var(--accent-fg);
  font-family: var(--font); font-size: 14px; font-weight: 600;
}
.cr-retry:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}
@media (hover: hover) and (pointer: fine) {
  .cr-retry:hover { background: var(--accent-hover); }
}
/* /mobius-ui */
/* mobius-ui:ReducedMotion v1 — keep in sync; library candidate. Diverge below the marker only. */
@media (prefers-reduced-motion: reduce) {
  .cr-spinner { animation: none; }
}
/* /mobius-ui:ReducedMotion */
`

export default function CubeRunApp({ appId }) {
  const [attempt, setAttempt] = useState(0)
  const hasAppId = appId !== undefined && appId !== null && `${appId}`.trim() !== ''
  const src = hasAppId
    ? `/app-embeds/by-id/${appId}/index.html?${ASSET_BUST}&attempt=${attempt}`
    : null

  // Ask the shell to hide its top bar so the game fills the whole screen,
  // including under the camera notch (the shell switches the iOS status bar
  // to translucent and drops its header). Released on unmount so leaving the
  // game restores normal chrome.
  useEffect(() => {
    const post = (value) => {
      try {
        window.parent.postMessage(
          { type: 'moebius:immersive', value, appId },
          '*',
        )
      } catch {
        /* not embedded in the shell (standalone /a/cuberun) — no-op */
      }
    }
    post(true)
    return () => post(false)
  }, [appId])

  // 'loading' (iframe mounted behind branding) → 'ready'
  // (the source-bound inner heartbeat arrived). An iframe load event is not a
  // readiness signal: Chromium fires it for an XFO/CSP-blocked error document.
  // 'error' replaces the above on a browser error or heartbeat timeout.
  const [phase, setPhase] = useState(hasAppId ? 'loading' : 'error')
  const [errorSource, setErrorSource] = useState(
    hasAppId ? 'ready_timeout' : 'missing_app_id',
  )
  const iframeRef = useRef(null)
  const readySignaled = useRef(false)
  const navHandlesRef = useRef(new Map())

  const postToFrame = useCallback((message) => {
    try {
      // The packaged game inherits this wrapper's opaque sandbox origin, so it
      // can only be addressed with `*`; incoming messages are authenticated by
      // the exact contentWindow in handleMessage below.
      iframeRef.current?.contentWindow?.postMessage(message, '*')
    } catch {
      /* Frame may have gone away while retrying. */
    }
  }, [])

  // ── Pause the game when the shell backgrounds this app ───────────
  // Mobius keeps recently-used apps mounted and hides the inactive one by
  // setting `visibility:hidden` on a shell ancestor — it does NOT unmount the
  // iframe. CSS visibility on an ancestor does not change this nested game
  // iframe's Page Visibility state, so the packaged game's own
  // visibilitychange/pagehide audio-pause never fires: music (and gameplay)
  // keep running after you exit. The shell now posts
  // {type:'moebius:frame-visibility', visible} to this wrapper when it flips.
  // We forward that state through the source-bound bridge. The inner document
  // inherits our opaque origin, so direct contentDocument access is forbidden.
  const hiddenRef = useRef(false)
  const applyInnerVisibility = useCallback((hidden) => {
    hiddenRef.current = hidden
    postToFrame({ type: 'cuberun:visibility', visible: !hidden })
  }, [postToFrame])

  useEffect(() => {
    const onShellMessage = (event) => {
      // frame-visibility comes from the shell parent, not the inner game frame.
      if (event.source !== window.parent) return
      const data = event.data || {}
      if (data.type === 'moebius:frame-visibility') {
        applyInnerVisibility(data.visible === false)
      }
    }
    window.addEventListener('message', onShellMessage)
    return () => window.removeEventListener('message', onShellMessage)
  }, [applyInnerVisibility])

  const loadHighScores = useCallback(async () => {
    try {
      if (!window.mobius?.storage) return null
      const stored = await window.mobius.storage.get(HIGH_SCORES_PATH)
      if (stored == null) return null
      return normalizeHighScores(stored)
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    readySignaled.current = false
    setErrorSource(hasAppId ? 'ready_timeout' : 'missing_app_id')
    setPhase(hasAppId ? 'loading' : 'error')
  }, [attempt, appId, hasAppId])

  useEffect(() => {
    if (phase !== 'loading') return
    const timeout = setTimeout(() => {
      setErrorSource('ready_timeout')
      setPhase('error')
    }, READY_TIMEOUT_MS)
    return () => clearTimeout(timeout)
  }, [phase, attempt])

  useEffect(() => {
    if (phase === 'ready' && !readySignaled.current) {
      readySignaled.current = true
      emitSignal('app_ready', { item_count: 0 })
      loadHighScores().then((scores) => {
        if (scores) postToFrame({ type: 'cuberun:highscores', scores })
      })
    }
    if (phase === 'error') {
      emitSignal('error', {
        message: "Couldn't load CubeRun",
        source: errorSource,
      })
    }
  }, [errorSource, loadHighScores, phase, postToFrame])

  useEffect(() => {
    const handleMessage = (event) => {
      const inner = iframeRef.current?.contentWindow
      if (!inner || event.source !== inner) return
      // The dedicated static-document namespace is response-sandboxed without
      // allow-same-origin. Reject a heartbeat if a proxy ever drops that
      // invariant and gives the nested document a real Möbius origin.
      if (event.origin !== 'null') return

      const data = event.data || {}
      if (data.type === 'cuberun:navigating') {
        readySignaled.current = false
        setErrorSource('ready_timeout')
        setPhase('loading')
        return
      }
      if (data.type === 'cuberun:ready') {
        setPhase('ready')
        // If the shell backgrounded us while the game was still loading, apply
        // the hidden shim now that the inner document exists.
        if (hiddenRef.current) applyInnerVisibility(true)
        return
      }

      if (data.type === 'cuberun:get_highscores') {
        loadHighScores().then((scores) => {
          if (scores) postToFrame({ type: 'cuberun:highscores', scores })
        })
        return
      }

      if (data.type === 'cuberun:set_highscores') {
        const scores = normalizeHighScores(data.scores)
        window.mobius?.storage?.set?.(HIGH_SCORES_PATH, scores)?.catch?.(() => {})
        postToFrame({ type: 'cuberun:highscores', scores })
        return
      }

      if (data.type === 'cuberun:nav_open' && typeof data.label === 'string') {
        if (navHandlesRef.current.has(data.label)) {
          postToFrame({ type: 'cuberun:nav_ready', label: data.label, ready: true })
          return
        }

        if (!window.mobius?.nav?.open) {
          postToFrame({ type: 'cuberun:nav_ready', label: data.label, ready: false })
          return
        }

        const handle = window.mobius.nav.open(data.label, () => {
          navHandlesRef.current.delete(data.label)
          postToFrame({ type: 'cuberun:nav_back', label: data.label })
        })
        navHandlesRef.current.set(data.label, handle)
        // handle.ready RESOLVES to a boolean — true when the shell installed
        // the back-stack sentinel, false when the push was refused or timed
        // out (e.g. a standalone launch, where makeNav resolves false because
        // window.parent === window). It NEVER rejects, so the old
        // fulfilled-vs-rejected split always took the fulfilled branch and
        // reported ready:true even on a refused push. Read the resolved
        // boolean, and only keep the handle owned (cached in navHandlesRef)
        // when it's true. On false, drop it so a device back falls through to
        // the shell — the correct degradation — and a later open retries the
        // real push instead of the has()-fast-path above replying a stale
        // ready:true forever.
        Promise.resolve(handle.ready)
          .catch(() => false)
          .then((ready) => {
            if (navHandlesRef.current.get(data.label) !== handle) return
            if (!ready) navHandlesRef.current.delete(data.label)
            postToFrame({ type: 'cuberun:nav_ready', label: data.label, ready: !!ready })
          })
        return
      }

      if (data.type === 'cuberun:nav_close' && typeof data.label === 'string') {
        const handle = navHandlesRef.current.get(data.label)
        navHandlesRef.current.delete(data.label)
        try { handle?.close?.() } catch {}
        return
      }

      if (data.type === 'cuberun:event' && typeof data.event === 'string') {
        emitSignal(data.event, data.payload || {})
      }
    }

    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage)
      for (const handle of navHandlesRef.current.values()) {
        try { handle?.close?.() } catch {}
      }
      navHandlesRef.current.clear()
    }
  }, [applyInnerVisibility, loadHighScores, postToFrame])

  const showFrame = Boolean(src) && (phase === 'loading' || phase === 'ready')

  const showSpinner = phase === 'loading'
  const showError = phase === 'error'

  return (
    <div className="cr-root">
      <style>{CSS}</style>
      <h1 className="cr-sr-only">CubeRun</h1>

      {showFrame && (
        <iframe
          ref={iframeRef}
          key={attempt}
          title="CubeRun"
          src={src}
          className="cr-frame"
          sandbox="allow-scripts allow-forms allow-pointer-lock"
          style={{
            opacity: phase === 'ready' ? 1 : 0,
            pointerEvents: phase === 'ready' ? 'auto' : 'none',
          }}
          allow="autoplay; fullscreen; gamepad"
          onLoad={() => {
            // Keep the branded overlay and the browser error document hidden
            // until the exact child window proves its scripts actually ran.
            applyInnerVisibility(hiddenRef.current)
          }}
          onError={() => {
            setErrorSource('iframe')
            setPhase('error')
          }}
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
              Couldn't load CubeRun
            </div>
            <div className="cr-error-body">
              {errorSource === 'missing_app_id'
                ? 'CubeRun needs to be opened from an installed app.'
                : errorSource === 'ready_timeout'
                ? 'CubeRun did not finish starting. Retry to load a fresh game document.'
                : 'Something went wrong reaching the game. Check your connection and try again.'}
            </div>
            {errorSource !== 'missing_app_id' && (
              <button
                type="button"
                className="cr-retry"
                onClick={() => {
                  setErrorSource('ready_timeout')
                  setAttempt((n) => n + 1)
                }}
              >
                Retry
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
