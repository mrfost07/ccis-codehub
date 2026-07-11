/**
 * Audio Playback Hook with AnalyserNode for waveform visualization
 * Plays AI response audio and provides frequency data for the visualizer
 */
import { useState, useRef, useCallback, useEffect } from 'react'

interface UseAudioPlaybackReturn {
  isPlaying: boolean
  play: (audioBase64: string) => Promise<void>
  stop: () => void
  analyserNode: AnalyserNode | null
  duration: number
  currentTime: number
}

export function useAudioPlayback(): UseAudioPlaybackReturn {
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)

  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef(0)

  // Initialize AudioContext lazily (requires user interaction)
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 256
      analyserRef.current.smoothingTimeConstant = 0.8
      analyserRef.current.connect(audioContextRef.current.destination)
    }
    // Resume if suspended (autoplay policy)
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume()
    }
    return audioContextRef.current
  }, [])

  const stop = useCallback(() => {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop()
      } catch (_) { /* already stopped */ }
      sourceRef.current = null
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setIsPlaying(false)
    setCurrentTime(0)
  }, [])

  const play = useCallback(async (audioBase64: string) => {
    stop()

    const ctx = getAudioContext()
    const analyser = analyserRef.current!

    // Decode base64 to ArrayBuffer
    const binaryString = atob(audioBase64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    try {
      const audioBuffer = await ctx.decodeAudioData(bytes.buffer.slice(0))

      const source = ctx.createBufferSource()
      source.buffer = audioBuffer
      source.connect(analyser)
      sourceRef.current = source

      setDuration(audioBuffer.duration)
      setCurrentTime(0)
      startTimeRef.current = ctx.currentTime

      source.onended = () => {
        setIsPlaying(false)
        setCurrentTime(0)
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
      }

      source.start(0)
      setIsPlaying(true)

      // Update current time
      timerRef.current = setInterval(() => {
        const elapsed = ctx.currentTime - startTimeRef.current
        setCurrentTime(Math.min(elapsed, audioBuffer.duration))
      }, 100)

    } catch (err) {
      console.error('Audio playback error:', err)
      setIsPlaying(false)
    }
  }, [stop, getAudioContext])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop()
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [stop])

  return {
    isPlaying,
    play,
    stop,
    analyserNode: analyserRef.current,
    duration,
    currentTime,
  }
}
