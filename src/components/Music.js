import { AudioListener, AudioLoader, AudioAnalyser } from 'three'
import { useRef, useEffect, useState, Suspense, useCallback } from 'react'
import { useLoader, useFrame } from '@react-three/fiber'
import { MathUtils } from 'three'


import { mutation, useStore } from '../state/useStore'

import introSong from '../audio/intro-loop.mp3'

import mainSong from '../audio/main-nodrums.mp3'
import mainSongDrums from '../audio/main-onlydrums.mp3'

function Music() {
  const introPlayer = useRef()
  const themePlayer = useRef()
  const drumPlayer = useRef()

  const soundOrigin = useRef()

  const musicEnabled = useStore(s => s.musicEnabled)
  const gameStarted = useStore(s => s.gameStarted)
  const gameOver = useStore(s => s.gameOver)
  const camera = useStore(s => s.camera)
  const level = useStore(s => s.level)
  const hasInteracted = useStore(s => s.hasInteracted)

  const [listener] = useState(() => new AudioListener())

  const introTheme = useLoader(AudioLoader, introSong)
  const mainTheme = useLoader(AudioLoader, mainSong)
  const mainThemeDrums = useLoader(AudioLoader, mainSongDrums)

  const themeFilter = useRef()
  const audioAnalyzer = useRef()

  const introVolume = useRef(1)
  const themeVolume = useRef(0)
  const drumVolume = useRef(0)

  const introPlaying = useRef(true)
  const pageActive = useRef(true)

  const stopAllPlayers = () => {
    for (const player of [introPlayer.current, themePlayer.current, drumPlayer.current]) {
      if (player?.isPlaying) {
        player.stop()
      }
    }
    mutation.currentMusicLevel = 0
  }

  const startIntro = useCallback(() => {
    if (!introPlayer.current) return
    introPlayer.current.setLoop(true)
    introPlayer.current.setVolume(introVolume.current)
    if (!introPlayer.current.isPlaying) {
      introPlayer.current.play()
    }
    introPlaying.current = true
  }, [])

  const startMainTheme = useCallback(() => {
    if (!themePlayer.current || !drumPlayer.current) return
    themePlayer.current.setLoop(true)
    drumPlayer.current.setLoop(true)
    themePlayer.current.setVolume(themeVolume.current)
    drumPlayer.current.setVolume(drumVolume.current)
    if (!themePlayer.current.isPlaying) {
      themePlayer.current.play()
    }
    if (!drumPlayer.current.isPlaying) {
      drumPlayer.current.play()
    }
    introPlaying.current = false
  }, [])

  const resumeCurrentPlayers = useCallback(() => {
    if (!musicEnabled || !pageActive.current) return

    if (gameStarted && !gameOver) {
      if (introVolume.current > 0) startIntro()
      startMainTheme()
      return
    }

    if (!gameOver) {
      startIntro()
    }
  }, [gameOver, gameStarted, musicEnabled, startIntro, startMainTheme])

  useEffect(() => {
    const updatePageActive = () => {
      const wasActive = pageActive.current
      pageActive.current = document.visibilityState !== 'hidden' && document.hasFocus()
      if (pageActive.current && !wasActive) {
        resumeCurrentPlayers()
      } else if (!pageActive.current) {
        stopAllPlayers()
      }
    }

    updatePageActive()
    document.addEventListener('visibilitychange', updatePageActive)
    window.addEventListener('blur', updatePageActive)
    window.addEventListener('focus', updatePageActive)
    window.addEventListener('pagehide', stopAllPlayers)

    return () => {
      stopAllPlayers()
      document.removeEventListener('visibilitychange', updatePageActive)
      window.removeEventListener('blur', updatePageActive)
      window.removeEventListener('focus', updatePageActive)
      window.removeEventListener('pagehide', stopAllPlayers)
    }
  }, [resumeCurrentPlayers])

  useEffect(() => {
    if (hasInteracted && musicEnabled) {
      introPlayer.current.context.resume()
    }
  }, [hasInteracted, musicEnabled])

  useEffect(() => {
    introPlayer.current.setBuffer(introTheme)
  }, [introTheme])

  // creates a lowpass filter with the browser audio API, also an audio analyzer
  useEffect(() => {
    themePlayer.current.setBuffer(mainTheme)
    themeFilter.current = themePlayer.current.context.createBiquadFilter()
    themeFilter.current.type = "lowpass"
    themeFilter.current.frequency.value = 0
    themePlayer.current.setFilter(themeFilter.current)

  }, [mainTheme])

  useEffect(() => {
    drumPlayer.current.setBuffer(mainThemeDrums)

    audioAnalyzer.current = new AudioAnalyser(drumPlayer.current, 32)
  }, [mainThemeDrums])

  useEffect(() => {
    if (!musicEnabled) {
      if (introPlayer.current?.isPlaying) {
        introPlayer.current.stop()
      }

      if (themePlayer.current?.isPlaying) {
        themePlayer.current.stop()
        drumPlayer.current.stop()
      }

    }
  }, [musicEnabled])

  useEffect(() => {
    if (musicEnabled && pageActive.current && !gameOver) {
      if (gameStarted) {
        startMainTheme()
      } else {
        startIntro()
      }
    } else {
      if (introPlayer.current?.isPlaying) {
        introPlayer.current.stop()
      }
    }

    introPlayer.current.setLoop(true)
    themePlayer.current.setLoop(true)
    drumPlayer.current.setLoop(true)

    if (camera.current) {
      const cam = camera.current
      cam.add(listener)
      return () => cam.remove(listener)
    }

  }, [musicEnabled, introTheme, mainTheme, mainThemeDrums, gameStarted, gameOver, camera, listener, startIntro, startMainTheme])

  useEffect(() => {
    if (level > 0 && level % 2 === 0) {
      themePlayer.current.setPlaybackRate(1 + level * 0.02)
      drumPlayer.current.setPlaybackRate(1 + level * 0.02)
    } else if (level === 0) {
      themePlayer.current.setPlaybackRate(1)
      drumPlayer.current.setPlaybackRate(1)
    }
  }, [level])

  useFrame((state, delta) => {
    if (musicEnabled && pageActive.current) {

      if (audioAnalyzer.current) {
        const audioLevel = MathUtils.inverseLerp(0, 255, audioAnalyzer.current.getFrequencyData()[0])
        mutation.currentMusicLevel = audioLevel
      }
      if (gameStarted && !gameOver && (!themePlayer.current.isPlaying || !drumPlayer.current.isPlaying)) {
        startMainTheme()
      }

      // crossfade intro music to main theme when game starts
      if (gameStarted && !gameOver && themeVolume.current < 1) {
        if (!themePlayer.current.isPlaying) {
          startMainTheme()
        }

        themeFilter.current.frequency.value += delta * 4000

        if (themeVolume.current + delta * 0.2 > 1) {
          themeVolume.current = 1
          drumVolume.current = 1
        } else {
          themeVolume.current += delta * 0.2
          drumVolume.current += delta * 0.2
        }

        if (introVolume.current - delta * 0.2 < 0) {
          introVolume.current = 0
        } else {
          introVolume.current -= delta * 0.2
        }

        introPlayer.current.setVolume(introVolume.current)
        themePlayer.current.setVolume(themeVolume.current)
        drumPlayer.current.setVolume(drumVolume.current)
      }


      // Crossfade main theme back to intro on game over
      if (gameOver && introVolume.current < 1) {
        if (!introPlayer.current.isPlaying) {
          introPlayer.current.play()
        }

        themeFilter.current.frequency.value -= delta * 4000

        if (themeVolume.current - delta * 0.2 < 0) {
          themeVolume.current = 0
          drumVolume.current = 0
        } else {
          themeVolume.current -= delta * 0.2
          drumVolume.current -= delta * 0.2
        }

        if (introVolume.current + delta * 0.2 > 1) {
          introVolume.current = 1
        } else {
          introVolume.current += delta * 0.2
        }

        introPlayer.current.setVolume(introVolume.current)
        themePlayer.current.setVolume(themeVolume.current)
        drumPlayer.current.setVolume(drumVolume.current)
      }
    }
  })

  return (
    <group ref={soundOrigin}>
      <audio ref={introPlayer} args={[listener]} />
      <audio ref={themePlayer} args={[listener]} />
      <audio ref={drumPlayer} args={[listener]} />
    </group>
  )
}

export default function SuspenseMusic() {

  return (
    <Suspense fallback={null}>
      <Music />
    </Suspense>
  )
}
