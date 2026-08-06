import { useEffect, useState } from 'react'
import { Building2, Globe, Send } from 'lucide-react'
import toast from 'react-hot-toast'

import api, { communityAPI } from '../../services/api'
import { Modal, Spinner } from '../ui'

interface Room {
  id: string
  name: string
  room_type: string
  description?: string
}

/**
 * Send a post into a community chat channel.
 *
 * A share, not a move — the post stays where it is. Re-parenting it would leave
 * its comments, likes and image behind, which is not a trade worth making for a
 * menu item.
 *
 * Only channels the sharer can read are listed, and the server checks the same
 * thing: a list is a convenience, not the permission.
 */
export default function MoveToChannelDialog({
  open,
  onClose,
  postId,
}: {
  open: boolean
  onClose: () => void
  postId: string
}) {
  const [rooms, setRooms] = useState<Room[] | null>(null)
  const [sendingTo, setSendingTo] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setRooms(null)
    api.get('/community/chat/rooms/')
      .then(response => {
        if (cancelled) return
        const all: Room[] = response.data?.results ?? response.data ?? []
        // Community chat channels only. /chat/rooms/ returns everything the user
        // can read, which includes every project and task channel — a list with
        // "stfu" and "efef" in it is noise when you meant the program channels.
        // room_type is set for the global rooms (GLOBAL/CS/IT/IS) and null for the
        // project- and task-scoped ones.
        setRooms(all.filter(room => !!room.room_type))
      })
      .catch(() => { if (!cancelled) setRooms([]) })
    return () => { cancelled = true }
  }, [open])

  const send = async (room: Room) => {
    setSendingTo(room.id)
    try {
      await communityAPI.sharePostToChannel(postId, room.id)
      toast.success(`Sent to ${room.name}`)
      onClose()
    } catch {
      toast.error(`Could not send to ${room.name}.`)
    } finally {
      setSendingTo(null)
    }
  }

  const isGlobal = (room: Room) =>
    room.room_type === 'GLOBAL' || room.name.toLowerCase().includes('global')

  return (
    <Modal open={open} onClose={onClose} title="Send to a channel">
      <div className="space-y-3">
        <p className="text-xs text-neutral-400">
          The post stays on the feed. A message with a link to it is posted in the
          channel you pick.
        </p>

        {rooms === null ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : rooms.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-500">
            You are not in any channels yet.
          </p>
        ) : (
          <ul className="space-y-1">
            {rooms.map(room => (
              <li key={room.id}>
                <button
                  onClick={() => send(room)}
                  disabled={sendingTo !== null}
                  className="flex w-full items-center gap-3 rounded-lg border border-neutral-800
                    px-3 py-2.5 text-left transition-colors hover:border-neutral-700
                    hover:bg-neutral-800/70 disabled:opacity-60"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-800 text-neutral-400">
                    {isGlobal(room) ? <Globe className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-white">{room.name}</span>
                    {room.description && (
                      <span className="block truncate text-[11px] text-neutral-500">{room.description}</span>
                    )}
                  </span>
                  {sendingTo === room.id
                    ? <Spinner />
                    : <Send className="h-4 w-4 shrink-0 text-neutral-500" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}
