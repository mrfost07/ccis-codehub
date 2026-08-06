import { useState } from 'react'
import { Flag } from 'lucide-react'
import toast from 'react-hot-toast'

import { communityAPI } from '../../services/api'
import { Modal } from '../ui'

/** Mirrors Report.REPORT_TYPE_CHOICES. */
const REASONS = [
  { value: 'spam', label: 'Spam or advertising' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'copyright', label: 'Copyright violation' },
  { value: 'other', label: 'Something else' },
] as const

/**
 * Report a post or a comment to the moderators.
 *
 * Asks for a category and a sentence. The sentence is required because a queue of
 * bare "inappropriate" reports gives a moderator nothing to judge — the model has
 * `reason` as a non-blank TextField for the same reason.
 */
export default function ReportDialog({
  open,
  onClose,
  targetType,
  targetId,
}: {
  open: boolean
  onClose: () => void
  targetType: 'post' | 'comment'
  targetId: string
}) {
  const [reportType, setReportType] = useState<string>('spam')
  const [reason, setReason] = useState('')
  const [sending, setSending] = useState(false)

  const submit = async () => {
    const detail = reason.trim()
    if (!detail) {
      toast.error('Please say briefly what is wrong.')
      return
    }
    setSending(true)
    try {
      await communityAPI.reportContent(targetType, targetId, reportType, detail)
      toast.success('Reported. A moderator will review it.')
      setReason('')
      onClose()
    } catch {
      toast.error('Could not send the report. Try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Report ${targetType}`}>
      <div className="space-y-4">
        <p className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200">
          <Flag className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Reports go to the CCIS moderators. Your name is visible to them, not to
            the person you are reporting.
          </span>
        </p>

        <div>
          <label htmlFor="report-type" className="mb-1 block text-xs text-neutral-400">
            What is the problem?
          </label>
          <select
            id="report-type"
            value={reportType}
            onChange={event => setReportType(event.target.value)}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2.5
              text-sm text-white focus:border-purple-500 focus:outline-none"
          >
            {REASONS.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="report-reason" className="mb-1 block text-xs text-neutral-400">
            Tell the moderator what to look at
          </label>
          <textarea
            id="report-reason"
            value={reason}
            onChange={event => setReason(event.target.value)}
            rows={3}
            placeholder="A sentence is enough."
            className="w-full resize-none rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2.5
              text-sm text-white placeholder-neutral-500 focus:border-purple-500 focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2.5 text-sm text-neutral-300 transition-colors hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={sending}
            className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white
              transition-colors hover:bg-red-500 disabled:opacity-60"
          >
            {sending ? 'Sending…' : 'Send report'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
