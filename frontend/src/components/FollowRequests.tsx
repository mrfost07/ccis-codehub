import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { UserPlus, UserMinus, UserCheck, UserX, Clock, Users, Bell } from 'lucide-react'
import { communityAPI } from '../services/api'
import toast from 'react-hot-toast'
import { getMediaUrl } from '../utils/mediaUrl'

interface FollowUser {
  id: string
  username: string
  first_name: string
  last_name: string
  profile_picture: string | null
}

interface FollowRequest {
  id: string
  follower: FollowUser
  following: FollowUser
  status: string
  created_at: string
}

interface FollowRequestsProps {
  isOpen: boolean
  onClose: () => void
}

export default function FollowRequests({ isOpen, onClose }: FollowRequestsProps) {
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received')
  const [pendingRequests, setPendingRequests] = useState<FollowRequest[]>([])
  const [sentRequests, setSentRequests] = useState<FollowRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      fetchRequests()
    }
  }, [isOpen])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const [pendingRes, sentRes] = await Promise.all([
        communityAPI.getPendingRequests(),
        communityAPI.getSentRequests()
      ])
      setPendingRequests(pendingRes.data)
      setSentRequests(sentRes.data)
    } catch (error) {
      console.error('Failed to fetch requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (requestId: string) => {
    try {
      await communityAPI.acceptFollowRequest(requestId)
      toast.success('Follow request accepted!')
      fetchRequests()
    } catch (error) {
      toast.error('Failed to accept request')
    }
  }

  const handleReject = async (requestId: string) => {
    try {
      await communityAPI.rejectFollowRequest(requestId)
      toast.success('Follow request rejected')
      fetchRequests()
    } catch (error) {
      toast.error('Failed to reject request')
    }
  }

  const handleCancelRequest = async (userId: string) => {
    try {
      await communityAPI.unfollowUser(userId)
      toast.success('Request cancelled')
      fetchRequests()
    } catch (error) {
      toast.error('Failed to cancel request')
    }
  }

  const getProfilePicUrl = (pic: string | null) => {
    return getMediaUrl(pic)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return date.toLocaleDateString()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-purple-400" />
            Follow Requests
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          <button
            onClick={() => setActiveTab('received')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition ${activeTab === 'received'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-slate-400 hover:text-white'
              }`}
          >
            Received ({pendingRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition ${activeTab === 'sent'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-slate-400 hover:text-white'
              }`}
          >
            Sent ({sentRequests.length})
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          ) : activeTab === 'received' ? (
            pendingRequests.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500">No pending follow requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <Link to={`/user/${request.follower.id}`} className="flex items-center gap-3 flex-1">
                      {getProfilePicUrl(request.follower.profile_picture) ? (
                        <img
                          src={getProfilePicUrl(request.follower.profile_picture)!}
                          alt={request.follower.username}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                          {request.follower.username[0]?.toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-white font-medium hover:text-purple-400 transition">
                          {request.follower.first_name} {request.follower.last_name}
                        </p>
                        <p className="text-sm text-slate-400">@{request.follower.username}</p>
                        <p className="text-xs text-slate-500">{formatDate(request.created_at)}</p>
                      </div>
                    </Link>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAccept(request.id)}
                        className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                        title="Accept"
                      >
                        <UserCheck className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleReject(request.id)}
                        className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                        title="Reject"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            sentRequests.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500">No pending sent requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sentRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <Link to={`/user/${request.following.id}`} className="flex items-center gap-3 flex-1">
                      {getProfilePicUrl(request.following.profile_picture) ? (
                        <img
                          src={getProfilePicUrl(request.following.profile_picture)!}
                          alt={request.following.username}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                          {request.following.username[0]?.toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-white font-medium hover:text-purple-400 transition">
                          {request.following.first_name} {request.following.last_name}
                        </p>
                        <p className="text-sm text-slate-400">@{request.following.username}</p>
                        <p className="text-xs text-slate-500">{formatDate(request.created_at)}</p>
                      </div>
                    </Link>
                    <button
                      onClick={() => handleCancelRequest(request.following.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-red-600 text-white text-sm rounded-lg transition"
                    >
                      <UserX className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
