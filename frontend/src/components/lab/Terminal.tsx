import { useEffect, useRef, useState } from 'react'
import { Square, Terminal as TerminalIcon } from 'lucide-react'

/**
 * The console, as a terminal rather than a form.
 *
 * The first version had a separate "Input" box you filled in before pressing
 * Run. That is how a judge works, not how an IDE works — and it was wrong for
 * this feature. Here the program runs, and if it asks a question you answer it
 * in the same place the question appeared, while it waits.
 *
 * Input is echoed locally because the container's stdin is a pipe, not a tty,
 * so nothing echoes it back. Without this you would type and see nothing.
 */

export type TerminalState = 'idle' | 'running' | 'exited'

interface Props {
  lines: string
  state: TerminalState
  exitCode: number | null
  onInput: (line: string) => void
  onStop: () => void
}

export default function LabTerminal({ lines, state, exitCode, onInput, onStop }: Props) {
  const [draft, setDraft] = useState('')
  const scroller = useRef<HTMLDivElement>(null)
  const field = useRef<HTMLInputElement>(null)

  // Follow the output, the way a terminal does.
  useEffect(() => {
    const element = scroller.current
    if (element) element.scrollTop = element.scrollHeight
  }, [lines])

  useEffect(() => {
    if (state === 'running') field.current?.focus()
  }, [state])

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (state !== 'running') return
    onInput(draft + '\n')
    setDraft('')
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-black/60 ring-1 ring-white/5">
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold
          uppercase tracking-[0.14em] text-neutral-400">
          <TerminalIcon className="h-3 w-3" /> Terminal
        </span>
        <span className="flex items-center gap-2">
          {state === 'running' && (
            <>
              <span className="flex items-center gap-1 text-[11px] text-green-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                running
              </span>
              <button onClick={onStop}
                className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px]
                  text-neutral-400 transition-colors hover:text-red-300">
                <Square className="h-2.5 w-2.5" /> Stop
              </button>
            </>
          )}
          {state === 'exited' && (
            <span className={`text-[11px] ${
              exitCode === 0 ? 'text-neutral-500' : 'text-red-300'}`}>
              exited {exitCode === null ? '' : `with code ${exitCode}`}
            </span>
          )}
        </span>
      </div>

      <div ref={scroller}
        onClick={() => field.current?.focus()}
        className="h-56 overflow-auto p-3 font-mono text-xs leading-relaxed">
        {lines ? (
          <pre className="whitespace-pre-wrap break-words text-neutral-200">{lines}</pre>
        ) : (
          <p className="text-neutral-600">
            Press Run. If your program asks for something, type it here.
          </p>
        )}

        {state === 'running' && (
          <form onSubmit={submit} className="mt-0.5 flex items-center gap-1.5">
            <span aria-hidden className="text-green-400">›</span>
            <input
              ref={field}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              aria-label="Terminal input"
              autoComplete="off"
              spellCheck={false}
              className="flex-1 bg-transparent font-mono text-xs text-neutral-100
                caret-green-400 outline-none"
            />
          </form>
        )}
      </div>
    </div>
  )
}
