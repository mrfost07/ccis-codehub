import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { AlertTriangle, CheckCircle2, Clock, Play, Send, Terminal } from 'lucide-react'
import toast from 'react-hot-toast'

import Navbar from '../components/Navbar'
import { LoadingState } from '../components/ui'
import { useLabRun } from '../hooks/useLabRun'
import api from '../services/api'
import '../lib/monacoSetup'

/**
 * The student's workspace: statement, editor, console.
 *
 * Run is unlimited and ungraded — it is a compiler, and that is the whole
 * point of the exercise. Submit is a claim, so it asks first and then locks
 * the editor for that problem: a student who can keep typing after submitting
 * does not know whether the instructor is reading this version or the next.
 */

const MONACO_LANGUAGE: Record<string, string> = {
  python: 'python', javascript: 'javascript', java: 'java', cpp: 'cpp',
}

const LANGUAGE_LABEL: Record<string, string> = {
  python: 'Python', javascript: 'JavaScript', java: 'Java', cpp: 'C++',
}

interface Problem {
  id: string; order: number; title: string; statement: string
  starter_code: Record<string, string>
}

interface Submission {
  id: string; problem: string; status: 'submitted' | 'accepted' | 'returned'
  feedback: string; attempt_number: number
}

const STATUS_COPY: Record<string, { label: string; className: string }> = {
  submitted: { label: 'Awaiting review', className: 'text-amber-300 bg-amber-500/10' },
  accepted: { label: 'Accepted', className: 'text-green-300 bg-green-500/10' },
  returned: { label: 'Returned', className: 'text-red-300 bg-red-500/10' },
}

export default function LabWorkspace() {
  const { labId } = useParams<{ labId: string }>()

  const [lab, setLab] = useState<any>(null)
  const [problems, setProblems] = useState<Problem[]>([])
  const [setLabel, setSetLabel] = useState<string | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState<string | null>(null)

  const [activeId, setActiveId] = useState<string | null>(null)
  const [language, setLanguage] = useState('python')
  // Code is kept per problem, so switching between them does not lose work.
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [stdin, setStdin] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { run, running, failed: runFailed, start } = useLabRun(labId)

  const active = problems.find(p => p.id === activeId) || null
  const languages: string[] = useMemo(
    () => (lab?.languages?.length ? lab.languages : ['python', 'javascript', 'java', 'cpp']),
    [lab])

  const submissionFor = useCallback(
    (problemId: string) => submissions.find(s => s.problem === problemId) || null,
    [submissions])
  const activeSubmission = active ? submissionFor(active.id) : null
  const locked = activeSubmission?.status === 'submitted'
    || activeSubmission?.status === 'accepted'

  const refreshSubmissions = useCallback(() => {
    if (!labId) return
    api.get(`/lab/labs/${labId}/my-submissions/`)
      .then(({ data }) => setSubmissions(data))
      .catch(() => { /* the workspace still works without the history */ })
  }, [labId])

  useEffect(() => {
    if (!labId) return
    let cancelled = false
    Promise.all([
      api.get(`/lab/labs/${labId}/`),
      api.get(`/lab/labs/${labId}/my-problems/`),
    ])
      .then(([labResponse, problemsResponse]) => {
        if (cancelled) return
        setLab(labResponse.data)
        setProblems(problemsResponse.data.problems || [])
        setSetLabel(problemsResponse.data.set)
        setActiveId(problemsResponse.data.problems?.[0]?.id || null)
        const allowed = labResponse.data.languages
        if (allowed?.length) setLanguage(allowed[0])
      })
      .catch(() => { if (!cancelled) setFailed('Could not open this lab.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    refreshSubmissions()
    return () => { cancelled = true }
  }, [labId, refreshSubmissions])

  const code = active
    ? drafts[active.id] ?? active.starter_code?.[language] ?? ''
    : ''

  const onRun = () => {
    if (!active) return
    start({ language, code, stdin, problem: active.id })
  }

  const onSubmit = async () => {
    if (!active) return
    const confirmed = window.confirm(
      `Hand in "${active.title}" for review?\n\n`
      + 'Your instructor will read this version. You cannot edit it again '
      + 'unless they return it to you.')
    if (!confirmed) return

    setSubmitting(true)
    try {
      await api.post(`/lab/labs/${labId}/submit/`, {
        problem: active.id, language, code, stdin,
        student_output: run?.stdout || '',
      })
      toast.success('Submitted. Your instructor will review it.')
      refreshSubmissions()
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Could not submit that.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950">
        <Navbar />
        <LoadingState label="Opening the lab…" />
      </div>
    )
  }

  if (failed || !lab) {
    return (
      <div className="min-h-screen bg-neutral-950">
        <Navbar />
        <div className="mx-auto max-w-2xl px-6 py-20 text-center">
          <p className="text-neutral-400">{failed || 'Lab not found.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      <Navbar />

      <header className="border-b border-white/5 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-white">{lab.title}</h1>
            <p className="text-[11px] text-neutral-500">
              {setLabel ? `Your set: ${setLabel}` : 'No set assigned'}
              {' · '}{problems.length} problem{problems.length === 1 ? '' : 's'}
            </p>
          </div>
          <span className="rounded-full bg-white/5 px-3 py-1 text-[11px] text-neutral-400">
            {lab.state === 'running' ? 'Lab is running' : `Lab is ${lab.state}`}
          </span>
        </div>
      </header>

      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] sm:p-6">
        {/* Statement */}
        <aside className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {problems.map((problem, index) => {
              const submission = submissionFor(problem.id)
              const isActive = problem.id === activeId
              return (
                <button key={problem.id} onClick={() => setActiveId(problem.id)}
                  className={`rounded-lg px-2.5 py-1 text-xs transition-colors ${
                    isActive ? 'bg-purple-600 text-white'
                      : 'bg-white/5 text-neutral-300 hover:bg-white/10'}`}>
                  {index + 1}
                  {submission?.status === 'accepted' && (
                    <CheckCircle2 className="ml-1 inline h-3 w-3 text-green-300" />
                  )}
                </button>
              )
            })}
          </div>

          {active ? (
            <section className="rounded-2xl bg-neutral-900/70 p-4 ring-1 ring-white/5">
              <h2 className="text-sm font-semibold text-white">{active.title}</h2>
              {activeSubmission && (
                <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px]
                  font-medium ${STATUS_COPY[activeSubmission.status].className}`}>
                  {STATUS_COPY[activeSubmission.status].label}
                  {activeSubmission.attempt_number > 1
                    && ` · attempt ${activeSubmission.attempt_number}`}
                </span>
              )}
              <div className="prose-invert mt-3 text-sm leading-relaxed text-neutral-300
                [&_code]:rounded [&_code]:bg-black/40 [&_code]:px-1 [&_li]:ml-4
                [&_li]:list-disc [&_p]:mb-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg
                [&_pre]:bg-black/40 [&_pre]:p-3"
                dangerouslySetInnerHTML={{ __html: active.statement }} />
              {activeSubmission?.feedback && (
                <p className="mt-3 rounded-xl bg-red-500/5 p-3 text-xs text-red-200">
                  <strong className="font-semibold">From your instructor:</strong>{' '}
                  {activeSubmission.feedback}
                </p>
              )}
            </section>
          ) : (
            <p className="rounded-2xl bg-neutral-900/70 p-4 text-sm text-neutral-500
              ring-1 ring-white/5">
              No problems have been assigned to your set yet.
            </p>
          )}
        </aside>

        {/* Editor + console */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <select value={language} onChange={e => setLanguage(e.target.value)}
              aria-label="Language"
              className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs text-neutral-200
                ring-1 ring-white/10">
              {languages.map(key => (
                <option key={key} value={key}>{LANGUAGE_LABEL[key] || key}</option>
              ))}
            </select>

            <button onClick={onRun} disabled={running || !active}
              className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5
                text-xs font-medium text-neutral-100 transition-colors
                hover:bg-white/10 disabled:opacity-40">
              <Play className="h-3.5 w-3.5" /> {running ? 'Running…' : 'Run'}
            </button>

            <button onClick={onSubmit} disabled={submitting || locked || !active}
              className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5
                text-xs font-medium text-white transition-colors hover:bg-purple-500
                disabled:opacity-40">
              <Send className="h-3.5 w-3.5" />
              {locked ? 'Handed in' : submitting ? 'Submitting…' : 'Submit'}
            </button>

            {locked && (
              <span className="text-[11px] text-neutral-500">
                Locked while your instructor reviews it.
              </span>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl ring-1 ring-white/5">
            <Editor
              height="46vh"
              theme="vs-dark"
              language={MONACO_LANGUAGE[language] || 'plaintext'}
              value={code}
              onChange={value => {
                if (!active || locked) return
                setDrafts(previous => ({ ...previous, [active.id]: value ?? '' }))
              }}
              options={{
                readOnly: locked,
                minimap: { enabled: false },
                fontSize: 13,
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="lab-stdin"
                className="mb-1 block text-[11px] font-semibold uppercase
                  tracking-[0.14em] text-neutral-400">
                Input
              </label>
              <textarea id="lab-stdin" value={stdin} rows={5}
                onChange={e => setStdin(e.target.value)}
                placeholder="Anything your program reads from input"
                className="w-full rounded-xl bg-neutral-900 p-3 font-mono text-xs
                  text-neutral-200 ring-1 ring-white/5 placeholder:text-neutral-600" />
            </div>

            <div>
              <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold
                uppercase tracking-[0.14em] text-neutral-400">
                <Terminal className="h-3 w-3" /> Output
              </p>
              <div className="h-[7.5rem] overflow-auto rounded-xl bg-black/50 p-3
                font-mono text-xs ring-1 ring-white/5">
                {runFailed ? (
                  <p className="flex items-center gap-1.5 text-red-300">
                    <AlertTriangle className="h-3 w-3" /> {runFailed}
                  </p>
                ) : running && run?.state !== 'running' ? (
                  <p className="flex items-center gap-1.5 text-neutral-400">
                    <Clock className="h-3 w-3" />
                    {run && run.queue_position > 0
                      ? `Queued — ${run.queue_position} ahead of you`
                      : 'Starting…'}
                  </p>
                ) : running ? (
                  <p className="text-neutral-400">Running…</p>
                ) : run ? (
                  <>
                    {run.stdout && (
                      <pre className="whitespace-pre-wrap text-neutral-200">{run.stdout}</pre>
                    )}
                    {run.stderr && (
                      <pre className="whitespace-pre-wrap text-red-300">{run.stderr}</pre>
                    )}
                    {!run.stdout && !run.stderr && (
                      <p className="text-neutral-500">Finished without printing anything.</p>
                    )}
                  </>
                ) : (
                  <p className="text-neutral-600">Press Run to see what your code prints.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
