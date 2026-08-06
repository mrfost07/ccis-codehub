import { useEffect, useRef, useState } from 'react'
import { Image as ImageIcon, Trash2, Upload } from 'lucide-react'
import toast from 'react-hot-toast'

import { communityAPI } from '../../services/api'
import { Modal } from '../ui'
import { getMediaUrl } from '../../utils/mediaUrl'

/**
 * Edit a post or a comment — its words and its picture.
 *
 * Editing used to be an inline textarea that only sent `content`, so a post's
 * image could never be changed, replaced or dropped once it was up. Both surfaces
 * had their own copy of that textarea.
 *
 * Three request shapes, because "no image" and "leave the image alone" are
 * different things:
 *   new file      → multipart, so the file is actually uploaded
 *   image removed → JSON {image: null}; the serializers allow_null for this
 *   neither       → JSON {content} only, leaving the existing image untouched
 * Sending multipart with no file, or JSON with a File in it, silently drops one or
 * the other.
 */
export default function EditContentDialog({
  open,
  onClose,
  kind,
  id,
  initialContent,
  initialImageUrl,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  kind: 'post' | 'comment'
  id: string
  initialContent: string
  initialImageUrl?: string | null
  /** Called after a successful save, with what changed. */
  onSaved: (next: { content: string; imageUrl: string | null }) => void
}) {
  const [content, setContent] = useState(initialContent)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [removed, setRemoved] = useState(false)
  const [saving, setSaving] = useState(false)
  const picker = useRef<HTMLInputElement>(null)

  // Reset every time it opens, or the second post you edit inherits the first
  // one's text and pending file.
  useEffect(() => {
    if (!open) return
    setContent(initialContent)
    setFile(null)
    setPreview(null)
    setRemoved(false)
  }, [open, initialContent])

  const choose = (chosen: File | null) => {
    if (!chosen) return
    if (!chosen.type.startsWith('image/')) {
      toast.error('That is not an image.')
      return
    }
    setFile(chosen)
    setRemoved(false)
    const reader = new FileReader()
    reader.onloadend = () => setPreview(reader.result as string)
    reader.readAsDataURL(chosen)
  }

  const shownImage = preview ?? (removed ? null : getMediaUrl(initialImageUrl) || null)

  const save = async () => {
    const words = content.trim()
    if (!words && !shownImage) {
      toast.error('Write something or keep an image.')
      return
    }

    setSaving(true)
    try {
      let response
      if (file) {
        const form = new FormData()
        form.append('content', content)
        form.append('image', file)
        response = kind === 'post'
          ? await communityAPI.updatePost(id, form)
          : await communityAPI.updateCommentData(id, form)
      } else {
        const body: Record<string, unknown> = { content }
        if (removed) body.image = null
        response = kind === 'post'
          ? await communityAPI.updatePost(id, body)
          : await communityAPI.updateCommentData(id, body)
      }
      toast.success(kind === 'post' ? 'Post updated' : 'Comment updated')
      onSaved({
        content,
        imageUrl: response?.data?.image_url ?? (removed ? null : initialImageUrl ?? null),
      })
      onClose()
    } catch (error: any) {
      const detail = error?.response?.data
      toast.error(
        (typeof detail === 'string' && detail)
        || detail?.detail
        || detail?.image?.[0]
        || `Could not update the ${kind}.`,
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={kind === 'post' ? 'Edit post' : 'Edit comment'}>
      <div className="space-y-4">
        <textarea
          value={content}
          onChange={event => setContent(event.target.value)}
          rows={kind === 'post' ? 5 : 3}
          placeholder={kind === 'post' ? 'What do you want to say?' : 'Your comment'}
          aria-label={kind === 'post' ? 'Post text' : 'Comment text'}
          className="w-full resize-none rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2.5
            text-sm text-white placeholder-neutral-500 focus:border-purple-500 focus:outline-none"
        />

        <div>
          <p className="mb-2 text-xs font-medium text-neutral-400">Image</p>

          {shownImage ? (
            <div className="relative overflow-hidden rounded-xl border border-neutral-800">
              <img src={shownImage} alt="" className="max-h-64 w-full object-contain bg-neutral-950" />
              <div className="flex gap-2 border-t border-neutral-800 bg-neutral-900 p-2">
                <button
                  onClick={() => picker.current?.click()}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-neutral-800
                    text-xs font-medium text-neutral-200 transition-colors hover:bg-neutral-700 sm:h-9"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Replace
                </button>
                <button
                  onClick={() => { setFile(null); setPreview(null); setRemoved(true) }}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-red-500/10
                    text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20 sm:h-9"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => picker.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed
                border-neutral-700 py-6 text-xs text-neutral-400 transition-colors
                hover:border-neutral-600 hover:bg-neutral-800/50"
            >
              <ImageIcon className="h-4 w-4" />
              {removed ? 'Image removed — add another' : 'Add an image'}
            </button>
          )}

          <input
            ref={picker}
            type="file"
            accept="image/*"
            aria-label="Choose an image"
            onChange={event => choose(event.target.files?.[0] ?? null)}
            className="hidden"
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
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white
              transition-colors hover:bg-purple-500 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
