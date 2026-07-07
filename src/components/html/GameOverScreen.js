import { useState, useEffect, useRef } from 'react'

import cubeRunLogo from '../../textures/cuberun-logo.png'

import '../../styles/gameMenu.css'

import { useStore } from '../../state/useStore'
import { normalizeHighScores, postToWrapper, readHighScores, writeHighScores } from '../../util/storage'

const GAME_OVER_NAV_LABEL = 'cuberun-game-over'

const GameOverScreen = () => {
  const [shown, setShown] = useState(false)
  const [opaque, setOpaque] = useState(false)
  const [highScores, setHighscores] = useState(() => readHighScores())
  const runStartedAt = useRef(null)
  const processedGameOver = useRef(false)

  const gameOver = useStore(s => s.gameOver)
  const gameStarted = useStore(s => s.gameStarted)
  const score = useStore(s => s.score)
  const level = useStore(s => s.level)

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type !== 'cuberun:highscores') return

      const scores = writeHighScores(event.data.scores)
      setHighscores(scores)
    }

    window.addEventListener('message', handleMessage)
    postToWrapper({ type: 'cuberun:get_highscores' })
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  useEffect(() => {
    if (gameStarted && !gameOver && runStartedAt.current == null) {
      runStartedAt.current = Date.now()
    }
    if (!gameStarted) {
      runStartedAt.current = null
    }
  }, [gameStarted, gameOver])

  useEffect(() => {
    let t
    if (gameOver !== opaque) t = setTimeout(() => setOpaque(gameOver), 500)
    return () => clearTimeout(t)
  }, [gameOver, opaque])

  useEffect(() => {
    if (!gameOver) {
      postToWrapper({ type: 'cuberun:nav_close', label: GAME_OVER_NAV_LABEL })
      setShown(false)
      return
    }

    let live = true
    let waitingForWrapper = true

    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.label !== GAME_OVER_NAV_LABEL) return

      if (event.data?.type === 'cuberun:nav_ready') {
        waitingForWrapper = false
        if (live) setShown(true)
      }

      if (event.data?.type === 'cuberun:nav_back') {
        waitingForWrapper = false
        window.location.reload()
      }
    }

    window.addEventListener('message', handleMessage)
    postToWrapper({ type: 'cuberun:nav_open', label: GAME_OVER_NAV_LABEL })

    const fallback = setTimeout(() => {
      if (live && waitingForWrapper) setShown(true)
    }, 250)

    return () => {
      live = false
      clearTimeout(fallback)
      window.removeEventListener('message', handleMessage)
    }
  }, [gameOver])

  useEffect(() => {
    if (!gameOver) {
      processedGameOver.current = false
      return
    }
    if (processedGameOver.current) return
    processedGameOver.current = true

    const currentScore = Math.round(score)
    const previousScores = normalizeHighScores(highScores)
    const previousBest = previousScores[0] || 0
    const nextScores = normalizeHighScores([...previousScores, currentScore])
    const improvedBest = currentScore > previousBest
    const duration = runStartedAt.current
      ? Math.max(0, Math.round((Date.now() - runStartedAt.current) / 1000))
      : 0

    setHighscores(nextScores)
    writeHighScores(nextScores)
    postToWrapper({ type: 'cuberun:set_highscores', scores: nextScores })
    postToWrapper({
      type: 'cuberun:event',
      event: 'run_ended',
      payload: { score: currentScore, level: level + 1, duration_s: duration },
    })

    if (improvedBest) {
      postToWrapper({
        type: 'cuberun:event',
        event: 'high_score',
        payload: { score: currentScore },
      })
    }
  }, [gameOver, highScores, level, score])

  const handleRestart = () => {
    postToWrapper({ type: 'cuberun:nav_close', label: GAME_OVER_NAV_LABEL })
    window.location.reload() // TODO: make a proper restart
  }

  return shown ? (
    <div className="game__container" style={{ opacity: shown ? 1 : 0, background: opaque ? '#141622FF' : '#141622CC' }}>
      <div className="game__menu">
        <img className="game__logo-small" width="512px" src={cubeRunLogo} alt="Cuberun Logo" />
        <h1 className="game__score-gameover">GAME OVER</h1>
        <div className="game__scorecontainer">
          <div className="game__score-left">
            <h1 className="game__score-title">SCORE</h1>
            <h1 className="game__score">{score.toFixed(0)}</h1>
          </div>
          <div className="game__score-right">
            <h1 className="game__score-title">HIGH SCORES</h1>
            {highScores.map((newScore, i) => (
              <div key={`${i}-${score}`} className="game__score-highscore">
                <span className="game__score-number">{i + 1}</span>
                <span style={{ textDecoration: Math.round(score) === newScore ? 'underline' : 'none' }} className="game__score-score">{newScore > 0 ? newScore : '-'}</span>
              </div>
            ))}
          </div>
        </div>
        <button onClick={handleRestart} className="game__menu-button">RESTART</button>
      </div>
    </div>
  ) : null
}

export default GameOverScreen
