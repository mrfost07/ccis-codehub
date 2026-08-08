import { useCallback, useEffect, useRef, useState } from 'react'

import type { TerminalState } from '../components/lab/Terminal'

/**
 * A live process behind a WebSocket.
 *
 * This replaces a poll-for-the-result hook, because a run is no longer a
 * request with an answer — it is a process that may stop halfway and ask
 * something. Polling cannot express that.
 *
 * The socket is opened per run rather than held open for the tab. A held
 * socket means a container's lifetime is tied to a connection that survives
 * the student navigating away, and the cheapest way to guarantee cleanup is
 * for the server to see the socket close.
 */

export interface LabTerminal {
  output: string
  state: TerminalState
  exitCode: number | null
  error: string | null
  run: (language: string, code: string) => void
  send: (data: string) => void
  stop: () => void
}

function socketUrl(labId: string, token: string | null) {
  const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws'
  const query = token ? `?token=${encodeURIComponent(token)}` : ''
  return `${scheme}://${window.location.host}/ws/lab/${labId}/terminal/${query}`
}

export function useLabTerminal(labId: string | undefined): LabTerminal {
  const [output, setOutput] = useState('')
  const [state, setState] = useState<TerminalState>('idle')
  const [exitCode, setExitCode] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const socket = useRef<WebSocket | null>(null)
  const pending = useRef<{ language: string; code: string } | null>(null)

  const close = useCallback(() => {
    socket.current?.close()
    socket.current = null
  }, [])

  // A closed tab must not leave a container running.
  useEffect(() => close, [close])

  const run = useCallback((language: string, code: string) => {
    if (!labId) return
    close()
    setOutput('')
    setError(null)
    setExitCode(null)
    setState('running')
    pending.current = { language, code }

    const token = sessionStorage.getItem('token')
    const ws = new WebSocket(socketUrl(labId, token))
    socket.current = ws

    ws.onmessage = event => {
      const message = JSON.parse(event.data)
      if (message.type === 'ready' && pending.current) {
        ws.send(JSON.stringify({ type: 'run', ...pending.current }))
        pending.current = null
      } else if (message.type === 'output') {
        setOutput(previous => previous + message.data)
      } else if (message.type === 'exit') {
        setState('exited')
        setExitCode(message.code ?? null)
        close()
      } else if (message.type === 'error') {
        setError(message.detail)
        setState('idle')
        close()
      }
    }

    ws.onerror = () => {
      setError('Lost contact with the runtime.')
      setState('idle')
    }
    ws.onclose = () => {
      // An exit already moved us to 'exited'; this covers a drop mid-run.
      setState(current => (current === 'running' ? 'exited' : current))
    }
  }, [labId, close])

  const send = useCallback((data: string) => {
    if (socket.current?.readyState !== WebSocket.OPEN) return
    // Echo locally: the container's stdin is a pipe, not a tty, so nothing
    // comes back. Without this the student types into a void.
    setOutput(previous => previous + data)
    socket.current.send(JSON.stringify({ type: 'stdin', data }))
  }, [])

  const stop = useCallback(() => {
    if (socket.current?.readyState === WebSocket.OPEN) {
      socket.current.send(JSON.stringify({ type: 'stop' }))
    }
    close()
    setState('exited')
  }, [close])

  return { output, state, exitCode, error, run, send, stop }
}
