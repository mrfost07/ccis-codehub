/**
 * Browser Speech Recognition Hook
 * Uses the Web Speech API for free, instant speech-to-text
 */
import { useState, useRef, useCallback, useEffect } from 'react'

// Extend Window for vendor-prefixed SpeechRecognition
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message?: string
}

type SpeechRecognitionStatus = 'idle' | 'listening' | 'processing' | 'error' | 'unsupported'

interface UseSpeechRecognitionReturn {
  status: SpeechRecognitionStatus
  transcript: string
  interimTranscript: string
  isListening: boolean
  isSupported: boolean
  startListening: () => void
  stopListening: () => void
  resetTranscript: () => void
  getTranscript: () => { transcript: string; interim: string }
  error: string | null
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [status, setStatus] = useState<SpeechRecognitionStatus>('idle')
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<any>(null)
  const isListeningRef = useRef(false)
  // Keep a ref copy of transcript so it's available synchronously after stop
  const transcriptRef = useRef('')
  const interimRef = useRef('')

  // Check browser support
  const isSupported = typeof window !== 'undefined' && (
    'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  )

  // Initialize recognition instance
  useEffect(() => {
    if (!isSupported) {
      setStatus('unsupported')
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    // continuous=true so it keeps recording until manually stopped
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ''
      let final = ''

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          final += result[0].transcript
        } else {
          interim += result[0].transcript
        }
      }

      if (final) {
        setTranscript(final.trim())
        transcriptRef.current = final.trim()
        setInterimTranscript('')
        interimRef.current = ''
      }
      if (interim) {
        setInterimTranscript(interim)
        interimRef.current = interim
      }
    }

    recognition.onend = () => {
      isListeningRef.current = false
      setStatus('idle')
      // Don't clear transcripts here — let the consumer read them first
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      isListeningRef.current = false
      if (event.error === 'no-speech') {
        setStatus('idle')
        return
      }
      if (event.error === 'aborted') {
        setStatus('idle')
        return
      }
      console.error('Speech recognition error:', event.error)
      setError(event.error)
      setStatus('error')
    }

    recognition.onstart = () => {
      isListeningRef.current = true
      setStatus('listening')
      setError(null)
    }

    recognitionRef.current = recognition

    return () => {
      try {
        recognition.abort()
      } catch (_) { /* ignore */ }
    }
  }, [isSupported])

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListeningRef.current) return
    // Clear previous transcripts
    setTranscript('')
    setInterimTranscript('')
    transcriptRef.current = ''
    interimRef.current = ''
    setError(null)
    try {
      recognitionRef.current.start()
    } catch (e) {
      console.warn('Speech recognition start failed:', e)
    }
  }, [])

  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !isListeningRef.current) return
    try {
      recognitionRef.current.stop()
    } catch (_) { /* ignore */ }
  }, [])

  const resetTranscript = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
    transcriptRef.current = ''
    interimRef.current = ''
  }, [])

  // Direct ref access — bypasses React state timing entirely
  const getTranscript = useCallback(() => ({
    transcript: transcriptRef.current,
    interim: interimRef.current,
  }), [])

  return {
    status,
    // Return ref values so they're available even after onend fires
    transcript: transcript || transcriptRef.current,
    interimTranscript: interimTranscript || interimRef.current,
    isListening: status === 'listening',
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    getTranscript,
    error,
  }
}
