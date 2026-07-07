import { useEffect, useState, useRef } from 'react'
import { addEffect } from '@react-three/fiber'

import { useStore, mutation } from '../../state/useStore'

import '../../styles/hud.css'

const getSpeed = () => `${(mutation.gameSpeed * 400).toFixed(0)}`
const getScore = () => `${mutation.score.toFixed(0)}`


export default function Hud() {
  const set = useStore((state) => state.set)
  const level = useStore(s => s.level)

  const gameOver = useStore(s => s.gameOver)
  const gameStarted = useStore(s => s.gameStarted)
  const isSpeedingUp = useStore(s => s.isSpeedingUp)

  const [shown, setShown] = useState(false)

  const [showControls, setShowControls] = useState(false)
  const [left, setLeftPressed] = useState(false)
  const [right, setRightPressed] = useState(false)


  // performance optimization for the rapidly updating speedometer and score - see https://github.com/pmndrs/racing-game/blob/main/src/ui/Speed/Text.tsx
  let then = Date.now()

  const speedRef = useRef()
  const scoreRef = useRef()

  let currentSpeed = getSpeed()
  let currentScore = getScore()

  useEffect(() => addEffect(() => {
    const now = Date.now()

    if (now - then > 33.3333) { // throttle these to a max of 30 updates/sec
      if (speedRef.current) {
        speedRef.current.innerText = getSpeed()
      }

      if (scoreRef.current) {
        scoreRef.current.innerText = getScore()
      }

      // eslint-disable-next-line
      then = now
    }
  }))

  useEffect(() => {
    if (!showControls) return

    const preventContextMenu = (event) => {
      event.preventDefault()
      event.stopPropagation()
    }

    window.addEventListener('contextmenu', preventContextMenu)
    return () => window.removeEventListener('contextmenu', preventContextMenu)
  }, [showControls])

  useEffect(() => {
    if (gameStarted && !gameOver) {
      setShown(true)
    } else {
      setShown(false)
    }
  }, [gameStarted, gameOver])

  // Show on-screen steering controls whenever the device's primary pointer is
  // coarse (touch). UA sniffing was wrong on tablets and desktop-touch and only
  // ran once at mount; a (pointer: coarse) media query covers those cases and
  // re-evaluates if the pointer capability changes (e.g. detachable keyboards).
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return
    }
    const mql = window.matchMedia('(pointer: coarse)')
    const update = () => setShowControls(mql.matches)
    update()
    // Safari <14 only supports the deprecated addListener API.
    if (mql.addEventListener) {
      mql.addEventListener('change', update)
      return () => mql.removeEventListener('change', update)
    }
    mql.addListener(update)
    return () => mql.removeListener(update)
  }, [])

  useEffect(() => {
    set((state) => ({ ...state, controls: { ...state.controls, left } }))
  }, [set, left])

  useEffect(() => {
    set((state) => ({ ...state, controls: { ...state.controls, right } }))
  }, [set, right])

  return shown ? (
    <div className="hud">
      {level > 0 && isSpeedingUp && (
        <div className="center">
          <h3 className="center__speedup">SPEED UP</h3>
        </div>
      )}
      {showControls && (
        <div className="controls">
          <button
            type="button"
            aria-label="Steer left"
            onPointerDown={() => setLeftPressed(true)}
            onPointerUp={() => setLeftPressed(false)}
            onPointerCancel={() => setLeftPressed(false)}
            onPointerLeave={() => setLeftPressed(false)}
            className={`control control__left ${left ? 'control-active' : ''}`}
          >
            {'<'}
          </button>
          <button
            type="button"
            aria-label="Steer right"
            onPointerDown={() => setRightPressed(true)}
            onPointerUp={() => setRightPressed(false)}
            onPointerCancel={() => setRightPressed(false)}
            onPointerLeave={() => setRightPressed(false)}
            className={`control control__right ${right ? 'control-active' : ''}`}
          >
            {'>'}
          </button>
        </div>
      )}
      <div className="bottomLeft">
        <div className={`score ${showControls ? 'score__withcontrols' : ''}`}>
          <h3 className="score__title">LEVEL</h3>
          <h1 className="score__number">{level + 1}</h1>
          <h3 className="score__title">KM/H</h3>
          <h1 ref={speedRef} className="score__number">{currentSpeed}</h1>
          <h3 className="score__title">SCORE</h3>
          <h1 ref={scoreRef} className="score__number">{currentScore}</h1>
        </div>
      </div>
    </div>
  ) : null
}
