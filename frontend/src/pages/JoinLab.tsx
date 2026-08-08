import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound } from 'lucide-react'

import Navbar from '../components/Navbar'
import api from '../services/api'

/**
 * Join a lab by code.
 *
 * The code is typed off a projector at the back of a room, so it is uppercased
 * on the way in and the alphabet excludes O/0/I/1/S/5 at the point it is
 * generated. A wrong code and a draft lab give the same answer, deliberately —
 * otherwise the form tells you which codes exist.
 */
export default function JoinLab() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const { data } = await api.post('/lab/labs/join/', { join_code: code.trim() })
      navigate(`/lab/${data.lab.id}`)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not join that lab.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      <Navbar />
      <div className="mx-auto max-w-md px-6 py-16">
        <div className="rounded-3xl bg-neutral-900/70 p-6 ring-1 ring-white/5">
          <span className="mb-4 inline-flex rounded-xl bg-purple-500/10 p-2 text-purple-300">
            <KeyRound className="h-5 w-5" />
          </span>
          <h1 className="text-lg font-semibold tracking-tight text-white">Join a coding lab</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Enter the code your instructor is showing.
          </p>

          <form onSubmit={onSubmit} className="mt-5 space-y-3">
            <input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              autoFocus
              aria-label="Join code"
              placeholder="ABC123"
              className="w-full rounded-xl bg-neutral-950 px-4 py-3 text-center font-mono
                text-2xl tracking-[0.3em] text-white ring-1 ring-white/10
                placeholder:text-neutral-700 focus:outline-none focus:ring-purple-500/50"
            />
            {error && <p className="text-sm text-red-300">{error}</p>}
            <button type="submit" disabled={busy || code.trim().length < 6}
              className="w-full rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-medium
                text-white transition-colors hover:bg-purple-500 disabled:opacity-40">
              {busy ? 'Joining…' : 'Join'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
