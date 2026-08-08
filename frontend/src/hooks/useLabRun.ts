import { useCallback, useEffect, useRef, useState } from 'react'

import api from '../services/api'

/**
 * Running code in a lab.
 *
 * The server accepts a run and returns a ticket; the result arrives later. So
 * this polls, and the whole difficulty is what happens when a student presses
 * Run again before the first one has finished — which they do constantly,
 * because that is what people do when they are waiting.
 *
 * The server supersedes the earlier run. This side has to match that: the
 * response to an abandoned run must never overwrite the console, or a student
 * sees the output of code they have already edited and concludes their change
 * did nothing.
 *
 * Realtime push replaces the polling in Phase 3. The shape stays the same.
 */

export interface LabRun {
  state: 'queued' | 'running' | 'done' | 'superseded'
  queue_position: number
  stdout: string
  stderr: string
  error: string | null
}

const POLL_MS = 700

export function useLabRun(labId: string | undefined) {
  const [run, setRun] = useState<LabRun | null>(null)
  const [running, setRunning] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)

  // The run this hook still cares about. Anything else is a reply to a
  // question the student has already moved on from.
  const current = useRef<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const alive = useRef(true)

  useEffect(() => () => {
    alive.current = false
    if (timer.current) clearTimeout(timer.current)
  }, [])

  const poll = useCallback((runId: string) => {
    if (!alive.current) return
    api.get(`/lab/labs/${labId}/runs/${runId}/`)
      .then(({ data }) => {
        if (!alive.current || current.current !== runId) return
        setRun(data)
        if (data.state === 'done') {
          setRunning(false)
          current.current = null
          return
        }
        if (data.state === 'superseded') {
          // A newer run took over. Leave the console showing whatever the
          // newer one produces rather than reporting this one as finished.
          return
        }
        timer.current = setTimeout(() => { if (alive.current) poll(runId) }, POLL_MS)
      })
      .catch(() => {
        if (!alive.current || current.current !== runId) return
        setRunning(false)
        current.current = null
        setFailed('Lost contact with the execution service.')
      })
  }, [labId])

  const start = useCallback(async (payload: {
    language: string; code: string; stdin?: string; problem?: string
  }) => {
    if (timer.current) clearTimeout(timer.current)
    setFailed(null)
    setRunning(true)
    setRun(null)
    try {
      const { data } = await api.post(`/lab/labs/${labId}/run/`, payload)
      if (!alive.current) return
      current.current = data.run_id
      setRun(data)
      timer.current = setTimeout(() => poll(data.run_id), POLL_MS)
    } catch (error: any) {
      if (!alive.current) return
      setRunning(false)
      current.current = null
      setFailed(error?.response?.data?.detail || 'Could not start that run.')
    }
  }, [labId, poll])

  return { run, running, failed, start }
}
