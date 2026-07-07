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

    const updatePauseState = () => {
      setPaused(document.visibilityState === 'hidden' || !document.hasFocus())
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
