import { useEffect } from 'react'

import { mutation, useStore } from '../state/useStore'
import { isTrustedWrapperMessage } from '../util/storage'

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

    let wrapperVisible = true

    // CubeRun's nested frame inherits Möbius's opaque sandbox, so its native
    // Page Visibility state does not change when the shell merely backgrounds
    // the outer app. The wrapper forwards that state explicitly.
    const updatePauseState = () => {
      setPaused(!wrapperVisible || document.visibilityState === 'hidden')
    }
    const onWrapperMessage = (event) => {
      if (!isTrustedWrapperMessage(event)) return
      if (event.data?.type !== 'cuberun:visibility') return
      wrapperVisible = event.data.visible !== false
      updatePauseState()
    }

    updatePauseState()
    document.addEventListener('visibilitychange', updatePauseState)
    window.addEventListener('message', onWrapperMessage)
    const pauseForPageHide = () => setPaused(true)
    window.addEventListener('pagehide', pauseForPageHide)

    return () => {
      document.removeEventListener('visibilitychange', updatePauseState)
      window.removeEventListener('message', onWrapperMessage)
      window.removeEventListener('pagehide', pauseForPageHide)
      mutation.gamePaused = false
    }
  }, [set])

  return null
}
