import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  MessageCircle, X, Send, Settings, Reply, ArrowUp, Trash2,
  MoreVertical, Smile, Edit2, Check, Globe, Building2, ChevronDown
} from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { getMediaUrl } from '../utils/mediaUrl'

interface ChatRoom {
  id: string
  name: string
  room_type: string
  description: string
  icon: string
  member_count: number
}

interface MessageReaction {
  count: number
  users: string[]
  reacted_by_me: boolean
}

interface ChatMessage {
  id: string
  room: string
  sender: string
  sender_info: {
    id: string
    username: string
    nickname: string | null
    display_name: string
    profile_picture?: string | null
  }
  content: string
  reply_to: string | null
  reply_to_info: {
    id: string
    sender: string
    content: string
  } | null
  is_bumped: boolean
  bump_count: number
  is_deleted: boolean
  deleted_for_everyone: boolean
  is_own_message: boolean
  is_deleted_for_me: boolean
  reactions_summary: { [key: string]: MessageReaction }
  created_at: string
}

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🎉']

export default function CommunityChat() {
  const { user } = useAuth()
  const navigate = useNavigate()
  // Persist chat open state in localStorage
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem('communityChatOpen')
    return saved === 'true'
  })
  const [isIdle, setIsIdle] = useState(true) // Start in idle mode (minimized)
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [nickname, setNickname] = useState('')
  const [editingNickname, setEditingNickname] = useState(false)
  const [showReactions, setShowReactions] = useState<string | null>(null)
  const [showMessageMenu, setShowMessageMenu] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isOpenRef = useRef(isOpen)
  // Per-room message cache — switching back is instant
  const messageCache = useRef<Map<string, ChatMessage[]>>(new Map())

  // Keep ref in sync for use inside setTimeout closures
  useEffect(() => {
    isOpenRef.current = isOpen
    localStorage.setItem('communityChatOpen', isOpen.toString())
    if (isOpen) setUnreadCount(0)
  }, [isOpen])

  // Cleanup idle timer on unmount
  useEffect(() => {
    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current)
      }
    }
  }, [])

  // Handle opening the chat
  const handleOpen = () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
    setIsIdle(false)
    setIsOpen(true)
  }

  // Handle closing the chat - start idle timer
  const handleClose = () => {
    setIsOpen(false)
    idleTimerRef.current = setTimeout(() => {
      setIsIdle(true)
    }, 5000)
  }

  // Click idle dock → expand to floating button
  const handleIdleClick = () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
    setIsIdle(false)
    // Go back to idle if user doesn't open within 5s
    idleTimerRef.current = setTimeout(() => {
      if (!isOpenRef.current) setIsIdle(true)
    }, 5000)
  }

  // Get current user's profile picture
  const getCurrentUserProfilePic = () => {
    return getMediaUrl(user?.profile_picture)
  }

  // Navigate to user profile
  const handleViewProfile = (userId: string) => {
    // Navigate to profile - keep chat open so it stays open when user returns
    navigate(`/user/${userId}`)
  }

  useEffect(() => {
    fetchRooms()
    fetchNickname()
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [])

  useEffect(() => {
    if (!activeRoom) return

    // Instantly show cached messages — no flicker on room switch
    const cached = messageCache.current.get(activeRoom.id)
    if (cached) setMessages(cached)
    else setMessages([])   // clear stale messages from previous room

    localStorage.setItem('communityChatActiveRoom', activeRoom.id)

    // AbortController cancels in-flight requests when room changes
    const controller = new AbortController()

    const doFetch = async () => {
      if (!activeRoom) return
      try {
        const response = await api.get(
          `/community/chat/rooms/${activeRoom.id}/messages/`,
          { signal: controller.signal }
        )
        const msgs: ChatMessage[] = response.data
        messageCache.current.set(activeRoom.id, msgs)
        setMessages(msgs)
      } catch (err: any) {
        // Ignore cancellation — this is intentional on room switch
        if (err?.code === 'ERR_CANCELED' || err?.name === 'AbortError') return
        console.error('Failed to fetch messages:', err)
      }
    }

    doFetch()
    const interval = setInterval(doFetch, 3000)

    return () => {
      controller.abort()      // cancel any in-flight request immediately
      clearInterval(interval)
    }
  }, [activeRoom])

  // Smart auto-scroll: only pull to bottom if already near bottom
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return
    const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
    if (distFromBottom < 120) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    } else if (!isOpen) {
      // Chat is closed — increment unread badge
      setUnreadCount(c => c + 1)
    } else {
      setShowScrollBtn(true)
    }
  }, [messages])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    setShowScrollBtn(false)
  }, [])

  const handleScroll = () => {
    const container = messagesContainerRef.current
    if (!container) return
    const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
    setShowScrollBtn(distFromBottom > 120)
  }

  const fetchRooms = async () => {
    try {
      const response = await api.get('/community/chat/rooms/')
      const roomList = response.data.results || response.data
      setRooms(roomList)

      // Try to restore previously active room from localStorage
      const savedRoomId = localStorage.getItem('communityChatActiveRoom')
      if (savedRoomId && roomList.length > 0) {
        const savedRoom = roomList.find((r: ChatRoom) => r.id === savedRoomId)
        if (savedRoom) {
          setActiveRoom(savedRoom)
          return
        }
      }

      // Fallback: Auto-select first room if no saved room found
      if (roomList.length > 0) {
        setActiveRoom(roomList[0])
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error)
    }
  }

  const fetchMessages = useCallback(async () => {
    if (!activeRoom) return
    try {
      const response = await api.get(`/community/chat/rooms/${activeRoom.id}/messages/`)
      const msgs: ChatMessage[] = response.data
      messageCache.current.set(activeRoom.id, msgs)
      setMessages(msgs)
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    }
  }, [activeRoom])

  const fetchNickname = async () => {
    try {
      const response = await api.get('/community/chat/nicknames/my_nickname/')
      if (response.data.nickname) {
        setNickname(response.data.nickname)
      }
    } catch (error) {
      console.error('Failed to fetch nickname:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeRoom) return

    try {
      setLoading(true)
      await api.post('/community/chat/messages/', {
        room: activeRoom.id,
        content: newMessage,
        reply_to: replyingTo?.id || null
      })
      setNewMessage('')
      setReplyingTo(null)
      fetchMessages()
    } catch (error) {
      toast.error('Failed to send message')
    } finally {
      setLoading(false)
    }
  }

  const handleReact = async (messageId: string, reaction: string) => {
    try {
      await api.post(`/community/chat/messages/${messageId}/react/`, { reaction })
      fetchMessages()
      setShowReactions(null)
    } catch (error) {
      toast.error('Failed to react')
    }
  }

  const handleBump = async (messageId: string) => {
    try {
      await api.post(`/community/chat/messages/${messageId}/bump/`)
      toast.success('Message bumped!')
      fetchMessages()
    } catch (error) {
      toast.error('Failed to bump message')
    }
  }

  const handleDeleteForMe = async (messageId: string) => {
    try {
      await api.post(`/community/chat/messages/${messageId}/delete_for_me/`)
      fetchMessages()
      setShowMessageMenu(null)
    } catch (error) {
      toast.error('Failed to delete')
    }
  }

  const handleDeleteForEveryone = async (messageId: string) => {
    try {
      await api.post(`/community/chat/messages/${messageId}/delete_for_everyone/`)
      fetchMessages()
      setShowMessageMenu(null)
    } catch (error) {
      toast.error('Failed to delete for everyone')
    }
  }

  const handleSaveNickname = async () => {
    try {
      await api.post('/community/chat/nicknames/my_nickname/', { nickname })
      toast.success('Nickname updated!')
      setEditingNickname(false)
      fetchMessages() // Refresh to show new nickname
    } catch (error) {
      toast.error('Failed to update nickname')
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return date.toLocaleDateString()
  }

  const getProfilePicUrl = (profilePic: string | null | undefined) => {
    return getMediaUrl(profilePic)
  }

  const content = (() => {
    if (!isOpen) {
      // Idle mode — minimized side dock
      if (isIdle) {
        return (
          <button
            onClick={handleIdleClick}
            className="fixed right-0 bottom-[45%] w-10 h-16 bg-neutral-900/60 backdrop-blur-sm border border-neutral-700/30 border-r-0 rounded-l-xl shadow-lg hover:w-12 hover:bg-neutral-800/80 transition-[width,background] z-50 flex items-center justify-center group"
            title="Community Chat"
          >
            <MessageCircle className="w-4 h-4 text-purple-400 opacity-60 group-hover:opacity-100 transition-opacity" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        )
      }

      // Active mode — full floating button
      return (
        <button
          onClick={handleOpen}
          className="fixed right-4 sm:right-6 bottom-36 sm:bottom-24 w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-purple-600 to-purple-600 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-transform z-50 flex items-center justify-center"
          title="Open Community Chat"
        >
          <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      )
    }

    return (
      <div className="fixed right-2 sm:right-6 bottom-36 sm:bottom-40 w-[calc(100vw-16px)] sm:w-96 h-[calc(100vh-160px)] sm:h-[550px] bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-700 flex flex-col z-[60] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-700 bg-neutral-800">
        <div className="flex items-center gap-3">
          {/* Use Lucide icons instead of emoji */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-500 flex items-center justify-center">
            {activeRoom?.room_type === 'global' || activeRoom?.name?.toLowerCase().includes('global')
              ? <Globe className="w-5 h-5 text-white" />
              : <Building2 className="w-5 h-5 text-white" />
            }
          </div>
          <div>
            <h3 className="font-bold text-white">{activeRoom?.name || 'Community Chat'}</h3>
            <p className="text-xs text-neutral-400">{activeRoom?.member_count || 0} members</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-neutral-700 rounded-lg transition"
          >
            <Settings className="w-5 h-5 text-neutral-400" />
          </button>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-neutral-700 rounded-lg transition"
          >
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 border-b border-neutral-700 bg-neutral-800/50 space-y-4">
          {/* Nickname */}
          <div>
            <label className="text-xs text-neutral-400 block mb-1">Display Name / Nickname</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                disabled={!editingNickname}
                placeholder="Enter nickname..."
                className="flex-1 px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-sm text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
              />
              {editingNickname ? (
                <button
                  onClick={handleSaveNickname}
                  className="p-2 bg-green-600 hover:bg-green-700 rounded-lg transition"
                >
                  <Check className="w-4 h-4 text-white" />
                </button>
              ) : (
                <button
                  onClick={() => setEditingNickname(true)}
                  className="p-2 bg-neutral-600 hover:bg-neutral-500 rounded-lg transition"
                >
                  <Edit2 className="w-4 h-4 text-white" />
                </button>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Room Tabs */}
      {rooms.length > 1 && (
        <div className="flex gap-1 px-3 pt-2 pb-1 border-b border-neutral-700/50 overflow-x-auto scrollbar-none">
          {rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => setActiveRoom(room)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                activeRoom?.id === room.id
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700/50'
              }`}
            >
              {room.room_type === 'global' || room.name.toLowerCase().includes('global')
                ? <Globe className="w-3 h-3" />
                : <Building2 className="w-3 h-3" />
              }
              {room.name}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 relative"
      >
        {messages.length === 0 ? (
          <div className="text-center text-neutral-500 py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-800 flex items-center justify-center">
              <MessageCircle className="w-8 h-8 opacity-50" />
            </div>
            <p className="text-sm">No messages yet</p>
            <p className="text-xs text-neutral-600 mt-1">Start the conversation!</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const showAvatar = index === 0 ||
              messages[index - 1]?.sender !== message.sender ||
              messages[index - 1]?.is_own_message !== message.is_own_message

            return (
              <div
                key={message.id}
                className={`group relative flex items-end gap-2 ${message.is_own_message ? 'flex-row-reverse' : ''
                  }`}
              >
                {/* Avatar */}
                <div className={`flex-shrink-0 w-8 ${showAvatar ? '' : 'invisible'}`}>
                  {message.is_own_message ? (
                    // Show current user's profile picture
                    getCurrentUserProfilePic() ? (
                      <img
                        src={getCurrentUserProfilePic()!}
                        alt="You"
                        className="w-8 h-8 rounded-full object-cover ring-2 ring-purple-500/30"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center ring-2 ring-purple-500/30">
                        <span className="text-xs font-bold text-white">
                          {user?.username?.[0]?.toUpperCase() || 'U'}
                        </span>
                      </div>
                    )
                  ) : getProfilePicUrl(message.sender_info?.profile_picture) ? (
                    <img
                      src={getProfilePicUrl(message.sender_info.profile_picture)!}
                      alt={message.sender_info?.display_name || 'User'}
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-neutral-600 cursor-pointer hover:ring-purple-500 transition-all"
                      onClick={() => handleViewProfile(message.sender_info.id)}
                    />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-500 flex items-center justify-center ring-2 ring-neutral-600 cursor-pointer hover:ring-purple-500 transition-all"
                      onClick={() => handleViewProfile(message.sender_info.id)}
                    >
                      <span className="text-xs font-bold text-white">
                        {message.sender_info?.display_name?.[0]?.toUpperCase() || 'U'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Message Container */}
                <div className={`relative flex flex-col max-w-[75%] sm:max-w-[70%] ${message.is_own_message ? 'items-end' : 'items-start'}`}>
                  {/* Sender Name - Only show for others' messages and first in group */}
                  {!message.is_own_message && showAvatar && (
                    <span
                      className="text-[11px] font-medium text-purple-400 mb-1 ml-1 cursor-pointer hover:text-purple-300 hover:underline transition-all"
                      onClick={() => handleViewProfile(message.sender_info.id)}
                    >
                      {message.sender_info?.display_name || 'Unknown'}
                    </span>
                  )}

                  {/* Reply Reference */}
                  {message.reply_to_info && (
                    <div className={`flex items-center gap-1 text-[10px] text-neutral-500 mb-1 ${message.is_own_message ? 'mr-1' : 'ml-1'
                      }`}>
                      <Reply className="w-3 h-3" />
                      <span>Replying to {message.reply_to_info.sender}</span>
                    </div>
                  )}

                  {/* Bumped Badge */}
                  {message.is_bumped && (
                    <div className={`flex items-center gap-1 text-[10px] text-amber-500 mb-1 ${message.is_own_message ? 'mr-1' : 'ml-1'
                      }`}>
                      <ArrowUp className="w-3 h-3" />
                      <span>Bumped {message.bump_count}x</span>
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`relative rounded-2xl px-3 py-2 sm:px-4 sm:py-2.5 shadow-md ${message.is_own_message
                      ? 'bg-gradient-to-br from-purple-600 to-purple-700 rounded-br-sm'
                      : 'bg-neutral-700/80 backdrop-blur rounded-bl-sm'
                      } ${message.deleted_for_everyone ? 'opacity-60' : ''}`}
                  >
                    {/* Reply Preview */}
                    {message.reply_to_info && (
                      <div className={`text-[11px] rounded-lg p-2 mb-2 border-l-2 ${message.is_own_message
                        ? 'bg-purple-800/50 border-purple-400'
                        : 'bg-neutral-800/50 border-neutral-500'
                        }`}>
                        <p className="text-neutral-300 truncate">{message.reply_to_info.content}</p>
                      </div>
                    )}

                    {/* Message Content */}
                    <p className={`text-sm break-words leading-relaxed ${message.deleted_for_everyone ? 'italic text-neutral-400' : 'text-white'
                      }`}>
                      {message.deleted_for_everyone ? 'This message was deleted' : message.content}
                    </p>

                    {/* Reactions */}
                    {Object.keys(message.reactions_summary || {}).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Object.entries(message.reactions_summary).map(([emoji, data]) => (
                          <button
                            key={emoji}
                            onClick={() => handleReact(message.id, emoji)}
                            className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] transition-all ${data.reacted_by_me
                              ? 'bg-purple-500/80 ring-1 ring-purple-400'
                              : 'bg-neutral-600/80 hover:bg-neutral-500/80'
                              }`}
                          >
                            <span>{emoji}</span>
                            <span className="text-white/80">{data.count}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Time & Status */}
                    <div className={`flex items-center gap-1.5 mt-1.5 ${message.is_own_message ? 'justify-end' : 'justify-start'
                      }`}>
                      <span className={`text-[10px] ${message.is_own_message ? 'text-purple-200/70' : 'text-neutral-400'
                        }`}>
                        {formatTime(message.created_at)}
                      </span>
                      {message.is_own_message && (
                        <Check className="w-3 h-3 text-purple-200/70" />
                      )}
                    </div>
                  </div>



                  {/* Reactions Picker — anchored to message container */}
                  {showReactions === message.id && (
                    <div className={`absolute ${message.is_own_message ? 'right-0' : 'left-0'} bottom-full mb-1 bg-neutral-800/95 backdrop-blur rounded-xl p-2 shadow-xl border border-neutral-700 flex gap-1 z-20`}>
                      {REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleReact(message.id, emoji)}
                          className="p-1.5 hover:bg-neutral-700 rounded-lg transition text-base hover:scale-110"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Message Menu — anchored to message container */}
                  {showMessageMenu === message.id && (
                    <div className={`absolute ${message.is_own_message ? 'right-0' : 'left-0'} bottom-full mb-1 bg-neutral-800/95 backdrop-blur rounded-xl shadow-xl border border-neutral-700 overflow-hidden z-20 min-w-[160px]`}>
                      {/* Reply */}
                      <button
                        onClick={() => { setReplyingTo(message); setShowMessageMenu(null) }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-neutral-300 hover:bg-neutral-700 transition"
                      >
                        <Reply className="w-4 h-4" />
                        Reply
                      </button>

                      {/* Bump */}
                      <button
                        onClick={() => { handleBump(message.id); setShowMessageMenu(null) }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-neutral-300 hover:bg-neutral-700 transition border-t border-neutral-700"
                      >
                        <ArrowUp className="w-4 h-4" />
                        Bump
                      </button>

                      {/* Delete - Different for own vs others' messages */}
                      {message.is_own_message ? (
                        <button
                          onClick={() => handleDeleteForEveryone(message.id)}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 hover:bg-neutral-700 transition border-t border-neutral-700"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete for everyone
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDeleteForMe(message.id)}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-neutral-300 hover:bg-neutral-700 transition border-t border-neutral-700"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete for me
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Action buttons - appear on opposite side from avatar */}
                {/* For own messages: appears on left (due to flex-row-reverse) */}
                {/* For others' messages: appears on right */}
                {!message.deleted_for_everyone && (
                  <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 self-center">
                    <button
                      onClick={() => setShowReactions(showReactions === message.id ? null : message.id)}
                      className="p-1.5 hover:bg-neutral-700 rounded-md transition bg-neutral-800/80"
                      title="React"
                    >
                      <Smile className="w-3.5 h-3.5 text-neutral-400" />
                    </button>
                    <button
                      onClick={() => setShowMessageMenu(showMessageMenu === message.id ? null : message.id)}
                      className="p-1.5 hover:bg-neutral-700 rounded-md transition bg-neutral-800/80"
                      title="More"
                    >
                      <MoreVertical className="w-3.5 h-3.5 text-neutral-400" />
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />

        {/* Scroll to bottom button */}
        {showScrollBtn && (
          <button
            onClick={scrollToBottom}
            className="sticky bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded-full shadow-lg transition-all animate-bounce"
          >
            <ChevronDown className="w-3 h-3" />
            New messages
          </button>
        )}
      </div>

      {/* Reply Preview */}
      {replyingTo && (
        <div className="px-3 sm:px-4 py-2.5 bg-neutral-800/95 backdrop-blur border-t border-neutral-700">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="flex-shrink-0 w-1 h-8 bg-purple-500 rounded-full" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs">
                  <Reply className="w-3 h-3 text-purple-400 flex-shrink-0" />
                  <span className="text-neutral-400">Replying to</span>
                  <span className="text-purple-400 font-medium truncate">
                    {replyingTo.sender_info?.display_name || 'Unknown'}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 truncate mt-0.5">
                  {replyingTo.content}
                </p>
              </div>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="flex-shrink-0 p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-700 rounded-full transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 sm:p-4 border-t border-neutral-700 bg-neutral-800/95 backdrop-blur">
        <div className="flex items-end gap-2 sm:gap-3">
          <div className="flex-1 relative">
            <textarea
              rows={1}
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value)
                // Auto-grow up to 4 rows
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              placeholder="Type a message... (Shift+Enter for newline)"
              className="w-full px-4 py-2.5 sm:py-3 bg-neutral-700/80 border border-neutral-600 rounded-2xl text-sm text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all resize-none overflow-hidden"
              style={{ minHeight: '44px' }}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={loading || !newMessage.trim()}
            className="flex-shrink-0 p-2.5 sm:p-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl sm:rounded-2xl transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
    )
  })()

  return createPortal(content, document.body)
}
