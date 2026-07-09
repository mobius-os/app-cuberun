import { useEffect } from 'react'

import { mutation, useStore } from '../state/useStore'

export default function VisibilityPause() {
  const set = useStore((state) => state.set)

  useEffect(() => {
    const setPaused = (paused) => {
      mutation.gamePaused = paused
      if (paused) {
        mutation.horizontalVelocity = 0
        mutation.currentMusicLevel = 0
        set((state) => ({ ...state, controls: { left: false, right: false } }))
      }
    }

    // CubeRun runs inside a nested same-origin iframe in Mobius. Browser focus can
    // move to shell/fullscreen controls while the iframe stays visible, so using
    // document.hasFocus() here freezes visible gameplay. Pause only when the
    // page is actually hidden; pagehide still handles unload.
    const updatePauseState = () => {
      setPaused(document.visibilityState === 'hidden')
    }

    updatePauseState()
    document.addEventListener('visibilitychange', updatePauseState)
    window.addEventListener('blur', updatePauseState)
    window.addEventListener('focus', updatePauseState)
    const pauseForPageHide = () => setPaused(true)
    window.addEventListener('pagehide', pauseForPageHide)

    return () => {
      document.removeEventListener('visibilitychange', updatePauseState)
      window.removeEventListener('blur', updatePauseState)
      window.removeEventListener('focus', updatePauseState)
      window.removeEventListener('pagehide', pauseForPageHide)
      mutation.gamePaused = false
    }
  }, [set])

  return null
}
