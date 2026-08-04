import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

import CommunityChat from '../components/CommunityChat'
import Navbar from '../components/Navbar'

/**
 * The chat at full width.
 *
 * Same component as the floating widget, laid out by the route instead of
 * floating over it — one implementation, so the two cannot drift the way the two
 * post cards and the two dayLabels did.
 */
export default function ChatPage() {
  return (
    <div className="min-h-screen bg-neutral-950">
      <Navbar />

      <main className="mx-auto max-w-[100rem] px-3 pb-24 pt-4 sm:px-6 sm:pb-10">
        <div className="mb-3 flex items-center gap-3">
          <Link
            to="/community"
            aria-label="Back to community"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-800
              text-neutral-400 transition-colors hover:bg-neutral-900 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white sm:text-xl">Chat</h1>
            <p className="text-xs text-neutral-500">
              Program channels for everyone in CCIS
            </p>
          </div>
        </div>

        <CommunityChat variant="page" />
      </main>
    </div>
  )
}
