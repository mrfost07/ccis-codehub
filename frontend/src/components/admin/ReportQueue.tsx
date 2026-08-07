import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle, Check, ExternalLink, Flag, Inbox, RefreshCw, X,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { communityAPI } from '../../services/api'
import { EmptyState, Spinner } from '../ui'
import { getMediaUrl } from '../../utils/mediaUrl'

/**
 * What students have reported, and what a moderator can do about it.
 *
 * The queue endpoint resolves each report's target, because a Report is a generic
 * relation: on its own a row says "post f3a2… was reported for spam" and leaves
 * the moderator to go and find it. Here the reported words and picture sit next to
 * the complaint, which is the whole point.
 */

interface Target {
  type: 'post' | 'comment'
  id: string
  author: { id: string; username: string }
  excerpt: string
  image: string | null
  post_id?: string
  created_at: string
}

interface ReportRow {
  id: string
  report_type: string
  reason: string
  status: string
  created_at: string
  reporter: { id: string; username: string }
  moderator: { id: string; username: string } | null
  /** null when the reported thing has since been deleted. */
  target: Target | null
}

const FILTERS = [
  { value: 'pending', label: 'Pending' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
  { value: 'all', label: 'All' },
] as const

const TYPE_LABELS: Record<string, string> = {
  spam: 'Spam',
  harassment: 'Harassment',
  inappropriate: 'Inappropriate',
  copyright: 'Copyright',
  other: 'Other',
}

/** Harassment reads differently from a copyright notice; colour says which. */
const TYPE_TONE: Record<string, string> = {
  harassment: 'border-red-500/30 bg-red-500/10 text-red-300',
  inappropriate: 'border-red-500/30 bg-red-500/10 text-red-300',
  spam: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  copyright: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
  other: 'border-neutral-700 bg-neutral-800 text-neutral-300',
}

const STATUS_TONE: Record<string, string> = {
  pending: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  reviewing: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
  resolved: 'border-green-500/30 bg-green-500/10 text-green-300',
  dismissed: 'border-neutral-700 bg-neutral-800 text-neutral-400',
}

function ago(iso: string) {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export default function ReportQueue() {
  const [filter, setFilter] = useState<string>('pending')
  const [rows, setRows] = useState<ReportRow[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async (status: string) => {
    setRows(null)
    try {
      const { data } = await communityAPI.getReportQueue(status)
      setRows(data.results ?? [])
    } catch {
      setRows([])
      toast.error('Could not load the report queue.')
    }
  }, [])

  useEffect(() => { load(filter) }, [filter, load])

  const act = async (report: ReportRow, action: 'resolved' | 'dismissed' | 'reviewing') => {
    setBusy(report.id)
    try {
      await communityAPI.resolveReport(report.id, action)
      toast.success(
        action === 'resolved' ? 'Marked as actioned'
          : action === 'dismissed' ? 'Dismissed'
            : 'Marked as under review',
      )
      // Reload rather than patch: the row usually leaves the current filter.
      await load(filter)
    } catch {
      toast.error('Could not update that report.')
    } finally {
      setBusy(null)
    }
  }

  const pendingCount = rows?.filter(r => r.status === 'pending').length ?? 0

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-red-500/10 p-2 text-red-400">
            <Flag className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-white">Reported content</h2>
            <p className="text-xs text-neutral-500">
              Posts and comments students have flagged for review
            </p>
          </div>
        </div>

        <button
          onClick={() => load(filter)}
          className="flex h-11 items-center gap-2 rounded-lg border border-neutral-800 px-3 text-xs
            text-neutral-300 transition-colors hover:bg-neutral-800 sm:h-9"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </header>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              filter === f.value
                ? 'bg-purple-600/20 text-purple-200'
                : 'text-neutral-400 hover:bg-neutral-800/70'
            }`}
          >
            {f.label}
            {f.value === 'pending' && pendingCount > 0 && filter === 'pending' && (
              <span className="ml-1.5 tabular-nums text-purple-300">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {rows === null ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : rows.length === 0 ? (
        <EmptyState
          title={filter === 'pending' ? 'Nothing waiting' : 'Nothing here'}
          description={
            filter === 'pending'
              ? 'No open reports. Anything students flag will appear here.'
              : 'No reports with that status.'
          }
        />
      ) : (
        <ul className="space-y-3">
          {rows.map(report => (
            <li
              key={report.id}
              className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900"
            >
              <div className="flex flex-wrap items-center gap-2 border-b border-neutral-800 px-4 py-2.5">
                <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TYPE_TONE[report.report_type] ?? TYPE_TONE.other}`}>
                  {TYPE_LABELS[report.report_type] ?? report.report_type}
                </span>
                <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_TONE[report.status] ?? STATUS_TONE.dismissed}`}>
                  {report.status}
                </span>
                <span className="text-[11px] text-neutral-500">
                  reported by <span className="text-neutral-300">{report.reporter.username}</span> · {ago(report.created_at)}
                </span>
                {report.moderator && (
                  <span className="ml-auto text-[11px] text-neutral-500">
                    handled by {report.moderator.username}
                  </span>
                )}
              </div>

              <div className="space-y-3 px-4 py-3">
                <p className="rounded-lg border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-sm text-neutral-300">
                  “{report.reason}”
                </p>

                {report.target ? (
                  <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-3">
                    <p className="mb-1.5 flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
                      <span className="rounded bg-neutral-800 px-1.5 py-0.5 uppercase tracking-wide">
                        {report.target.type}
                      </span>
                      by <span className="text-neutral-300">{report.target.author.username}</span>
                      · {ago(report.target.created_at)}
                      <a
                        href={report.target.type === 'post'
                          ? `/community/posts/${report.target.id}`
                          : `/community/posts/${report.target.post_id}#comment-${report.target.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-purple-400 hover:text-purple-300"
                      >
                        open <ExternalLink className="h-3 w-3" />
                      </a>
                    </p>
                    {report.target.excerpt && (
                      <p className="whitespace-pre-wrap break-words text-sm text-neutral-200">
                        {report.target.excerpt}
                      </p>
                    )}
                    {report.target.image && (
                      <img
                        src={getMediaUrl(report.target.image) ?? undefined}
                        alt=""
                        loading="lazy"
                        className="mt-2 max-h-48 rounded-lg border border-neutral-800 object-contain"
                      />
                    )}
                  </div>
                ) : (
                  // The report stays actionable: "already removed" is an outcome.
                  <p className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950/40 px-3 py-2 text-xs text-neutral-500">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    The reported content has since been deleted.
                  </p>
                )}

                {report.status !== 'resolved' && report.status !== 'dismissed' && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => act(report, 'resolved')}
                      disabled={busy === report.id}
                      className="flex h-11 items-center gap-1.5 rounded-lg bg-green-600/20 px-3 text-xs
                        font-medium text-green-400 transition hover:bg-green-600 hover:text-white
                        disabled:opacity-50 sm:h-9"
                    >
                      <Check className="h-3.5 w-3.5" /> Actioned
                    </button>
                    <button
                      onClick={() => act(report, 'dismissed')}
                      disabled={busy === report.id}
                      className="flex h-11 items-center gap-1.5 rounded-lg bg-neutral-800 px-3 text-xs
                        font-medium text-neutral-300 transition hover:bg-neutral-700
                        disabled:opacity-50 sm:h-9"
                    >
                      <X className="h-3.5 w-3.5" /> Dismiss
                    </button>
                    {report.status !== 'reviewing' && (
                      <button
                        onClick={() => act(report, 'reviewing')}
                        disabled={busy === report.id}
                        className="flex h-11 items-center gap-1.5 rounded-lg border border-neutral-800 px-3
                          text-xs font-medium text-neutral-400 transition hover:bg-neutral-800
                          disabled:opacity-50 sm:h-9"
                      >
                        <Inbox className="h-3.5 w-3.5" /> Reviewing
                      </button>
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
