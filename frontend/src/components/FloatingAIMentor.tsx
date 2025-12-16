import { useState, useEffect, useRef, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { aiAPI } from '../services/api'
import AIChatSettings from './AIChatSettings'
import { AIActionHandler, ConfirmationCallback, SearchResult, ActionButton, generateSearchActionButtons } from '../services/aiActionHandler'
import toast from 'react-hot-toast'

// Enhanced formatted message component for rendering AI responses with proper markdown styling
const FormattedMessage = ({ content }: { content: string }) => {
  if (!content) return null

  // Split content into lines for processing
  const lines = content.split('\n')

  return (
    <div className="formatted-message leading-relaxed text-slate-100 space-y-2">
      {lines.map((line, idx) => {
        const trimmedLine = line.trim()

        // Skip empty lines
        if (!trimmedLine) return <div key={idx} className="h-2" />

        // Handle headers (## or ###)
        if (trimmedLine.startsWith('### ')) {
          return <h4 key={idx} className="text-purple-300 font-semibold text-sm mt-3 mb-1">{formatInlineMarkdown(trimmedLine.slice(4))}</h4>
        }
        if (trimmedLine.startsWith('## ')) {
          return <h3 key={idx} className="text-purple-200 font-bold text-base mt-4 mb-2">{formatInlineMarkdown(trimmedLine.slice(3))}</h3>
        }
        if (trimmedLine.startsWith('# ')) {
          return <h2 key={idx} className="text-purple-100 font-bold text-lg mt-4 mb-2">{formatInlineMarkdown(trimmedLine.slice(2))}</h2>
        }

        // Handle code blocks (```code```)
        if (trimmedLine.startsWith('```')) {
          return null // Skip code block markers (handled separately if needed)
        }

        // Handle bullet points (• or - or *)
        if (trimmedLine.match(/^[•\-\*]\s/)) {
          const bulletContent = trimmedLine.replace(/^[•\-\*]\s*/, '')
          return (
            <div key={idx} className="flex items-start gap-2 ml-2">
              <span className="text-purple-400 mt-0.5">▸</span>
              <span>{formatInlineMarkdown(bulletContent)}</span>
            </div>
          )
        }

        // Handle numbered lists (1. 2. 3.)
        const numberedMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/)
        if (numberedMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 ml-2">
              <span className="text-purple-400 font-semibold min-w-[20px]">{numberedMatch[1]}.</span>
              <span>{formatInlineMarkdown(numberedMatch[2])}</span>
            </div>
          )
        }

        // Regular paragraph
        return <p key={idx} className="text-slate-100">{formatInlineMarkdown(trimmedLine)}</p>
      })}
    </div>
  )
}

// Helper function to format inline markdown (bold, italic, code, links)
const formatInlineMarkdown = (text: string): React.ReactNode => {
  if (!text) return null

  // Process text into segments with different formatting
  const segments: React.ReactNode[] = []
  let remaining = text
  let keyIndex = 0

  while (remaining.length > 0) {
    // Find the next markdown pattern
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
    const italicMatch = remaining.match(/(?<!\*)\*([^*]+?)\*(?!\*)/)
    const codeMatch = remaining.match(/`([^`]+)`/)
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/)

    // Find which pattern comes first
    const patterns = [
      { type: 'bold', match: boldMatch, index: boldMatch?.index ?? Infinity },
      { type: 'italic', match: italicMatch, index: italicMatch?.index ?? Infinity },
      { type: 'code', match: codeMatch, index: codeMatch?.index ?? Infinity },
      { type: 'link', match: linkMatch, index: linkMatch?.index ?? Infinity },
    ].sort((a, b) => a.index - b.index)

    const first = patterns[0]

    if (first.index === Infinity || !first.match) {
      // No more patterns, push remaining text
      segments.push(remaining)
      break
    }

    // Push text before the pattern
    if (first.index > 0) {
      segments.push(remaining.slice(0, first.index))
    }

    // Handle the pattern
    switch (first.type) {
      case 'bold':
        segments.push(<strong key={`b${keyIndex++}`} className="font-semibold text-white">{first.match[1]}</strong>)
        remaining = remaining.slice(first.index + first.match[0].length)
        break
      case 'italic':
        segments.push(<em key={`i${keyIndex++}`} className="italic text-slate-200">{first.match[1]}</em>)
        remaining = remaining.slice(first.index + first.match[0].length)
        break
      case 'code':
        segments.push(<code key={`c${keyIndex++}`} className="px-1.5 py-0.5 bg-slate-700 rounded text-purple-300 text-sm font-mono">{first.match[1]}</code>)
        remaining = remaining.slice(first.index + first.match[0].length)
        break
      case 'link':
        segments.push(<a key={`l${keyIndex++}`} href={first.match[2]} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">{first.match[1]}</a>)
        remaining = remaining.slice(first.index + first.match[0].length)
        break
    }
  }

  return segments.length === 1 ? segments[0] : <>{segments}</>
}

// Legacy helper function (kept for compatibility)
const cleanText = (text: string): string => {
  // Remove markdown formatting for plain text contexts
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')  // Remove bold markers
    .replace(/\*(.+?)\*/g, '$1')      // Remove italic markers
    .replace(/`([^`]+)`/g, '$1')      // Remove code markers
}


interface Message {
  role: 'user' | 'ai'
  content: string
  isStreaming?: boolean
  searchResults?: SearchResult
  actionButtons?: ActionButton[]
}

interface Session {
  id: string
  title?: string
  session_type: string
  started_at: string
  status: string
}

export default function FloatingAIMentor() {
  const [isOpen, setIsOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showConversations, setShowConversations] = useState(false)
  const [selectedModelId, setSelectedModelId] = useState('gemini')
  const [messages, setMessages] = useState<Message[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(() => {
    // Get user-specific session ID to avoid sharing sessions between users
    const userData = sessionStorage.getItem('user') || localStorage.getItem('user')
    if (userData) {
      try {
        const user = JSON.parse(userData)
        return sessionStorage.getItem(`ai_mentor_session_id_${user.id}`) || localStorage.getItem(`ai_mentor_session_id_${user.id}`)
      } catch {
        return null
      }
    }
    return null
  })
  const [streamingText, setStreamingText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [confirmationDialog, setConfirmationDialog] = useState<ConfirmationCallback | null>(null)
  const [pendingStreamText, setPendingStreamText] = useState('')
  const [isFirstMessage, setIsFirstMessage] = useState(true)
  const streamingIntervalRef = useRef<number | null>(null)
  const actionHandlerRef = useRef<AIActionHandler | null>(null)
  const shouldStopRef = useRef(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    actionHandlerRef.current = new AIActionHandler(
      navigate,
      (callback) => setConfirmationDialog(callback)
    )
  }, [navigate])

  const isAuthenticated = () => {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token')
    const user = sessionStorage.getItem('user') || localStorage.getItem('user')
    return !!(token && user)
  }

  // Get current user ID for user-specific storage
  const getCurrentUserId = () => {
    const userData = sessionStorage.getItem('user') || localStorage.getItem('user')
    if (userData) {
      try {
        return JSON.parse(userData).id
      } catch {
        return null
      }
    }
    return null
  }

  const shouldShow = () => {
    const publicRoutes = ['/', '/login', '/register']
    return !publicRoutes.includes(location.pathname) && isAuthenticated()
  }

  // All hooks must be called before any early return!
  useEffect(() => {
    if (isOpen && sessions.length === 0) {
      loadConversations()
    }
  }, [isOpen])

  // Persist sessionId to user-specific storage
  useEffect(() => {
    if (sessionId) {
      const userId = getCurrentUserId()
      if (userId) {
        sessionStorage.setItem(`ai_mentor_session_id_${userId}`, sessionId)
        localStorage.setItem(`ai_mentor_session_id_${userId}`, sessionId)
      }
      loadSessionMessages(sessionId)
    }
  }, [sessionId])

  // Early return AFTER all hooks are called
  if (!shouldShow()) {
    return null
  }

  const loadConversations = async () => {
    try {
      const response = await aiAPI.getSessions()
      const sessionList = response.data.results || response.data || []
      console.log('loadConversations: Loaded sessions:', sessionList)
      console.log('loadConversations: First session title:', sessionList[0]?.title)
      setSessions(sessionList)

      if (sessionList.length > 0 && !sessionId) {
        const activeSession = sessionList.find((s: Session) => s.status === 'active') || sessionList[0]
        setSessionId(activeSession.id)
      }
    } catch (error) {
      console.error('Error loading conversations:', error)
    }
  }

  const loadSessionMessages = async (sid: string) => {
    try {
      setLoadingHistory(true)
      const response = await aiAPI.getSession(sid)
      const sessionMessages = response.data.messages || []

      const formattedMessages: Message[] = sessionMessages.map((msg: any) => ({
        role: msg.sender === 'user' ? 'user' : 'ai',
        content: msg.message
      }))

      // Check if this is the first message for auto-naming
      const hasUserMessages = sessionMessages.some((msg: any) => msg.sender === 'user')
      setIsFirstMessage(!hasUserMessages)

      if (formattedMessages.length === 0) {
        setMessages([])
        setLoadingHistory(false)
        setIsFirstMessage(true)
        streamAIResponse("Hi! I'm your CCIS-CodeHub AI Mentor. I can help you with:\n\n• Navigating the platform\n• Understanding features\n• Learning paths and modules\n• Projects and collaboration\n• Technical coding questions\n\nWhat would you like to know?")
        return
      }

      setMessages(formattedMessages)
    } catch (error: any) {
      console.error('Error loading messages:', error)
      // If session not found (404), clear the stored session and create new one
      if (error?.response?.status === 404) {
        const userId = getCurrentUserId()
        if (userId) {
          sessionStorage.removeItem(`ai_mentor_session_id_${userId}`)
          localStorage.removeItem(`ai_mentor_session_id_${userId}`)
        }
        setSessionId(null)
        setMessages([])
        setIsFirstMessage(true)
        // Auto-create a new session
        try {
          const response = await aiAPI.createSession({
            session_type: 'general_chat',
            project: null
          })
          const newSession = response.data
          setSessions([newSession, ...sessions])
          setSessionId(newSession.id)
          streamAIResponse("Hi! I'm your CCIS-CodeHub AI Mentor. How can I help you today?")
        } catch (createError) {
          console.error('Error creating new session:', createError)
          streamAIResponse("Hi! I'm your AI Mentor. How can I help you today?")
        }
        return
      }
      setMessages([])
      setIsFirstMessage(true)
      streamAIResponse("Hi! I'm your AI Mentor. How can I help you today?")
    } finally {
      setLoadingHistory(false)
    }
  }

  const createNewConversation = async () => {
    try {
      const response = await aiAPI.createSession({
        session_type: 'general_chat',
        project: null
      })
      const newSession = response.data
      setSessions([newSession, ...sessions])
      setSessionId(newSession.id)
      setMessages([])
      setShowConversations(false)
      setIsFirstMessage(true)
      streamAIResponse("Hi! I'm your CCIS-CodeHub AI Mentor. I can help you with:\n\n• Navigating the platform\n• Understanding features\n• Learning paths and modules\n• Projects and collaboration\n• Technical coding questions\n\nWhat would you like to know?")
    } catch (error) {
      console.error('Error creating conversation:', error)
    }
  }

  // Delete conversation
  const deleteConversation = async (sid: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering switchConversation

    console.log('deleteConversation: Deleting session:', sid)
    console.log('deleteConversation: Current sessions count:', sessions.length)

    try {
      await aiAPI.deleteSession(sid)
      console.log('deleteConversation: API call successful')

      // Remove from local state
      const updatedSessions = sessions.filter(s => s.id !== sid)
      console.log('deleteConversation: Updated sessions count:', updatedSessions.length)
      setSessions(updatedSessions)

      // If we deleted the current session, switch to another or create new
      if (sid === sessionId) {
        console.log('deleteConversation: Deleted current session, switching...')
        setMessages([]) // Clear messages first

        if (updatedSessions.length > 0) {
          setSessionId(updatedSessions[0].id)
        } else {
          setSessionId(null)
          await createNewConversation()
        }
      }

      toast.success('Conversation deleted')
    } catch (error: any) {
      console.error('Error deleting conversation:', error)
      console.error('Error response:', error.response?.data)
      toast.error('Failed to delete conversation')
    }
  }

  // Auto-name conversation based on first query
  const autoNameConversation = async (userQuery: string) => {
    if (!sessionId) {
      console.log('autoNameConversation: No sessionId')
      return
    }
    if (!isFirstMessage) {
      console.log('autoNameConversation: Not first message')
      return
    }

    // Generate a short title from the query (first 30 chars, cleaned up)
    let title = userQuery.trim()
    if (title.length > 35) {
      title = title.substring(0, 35).trim() + '...'
    }

    console.log('autoNameConversation: Updating title to:', title, 'for session:', sessionId)

    try {
      const response = await aiAPI.updateSession(sessionId, { title })
      console.log('autoNameConversation: Update response:', response.data)
      // Update local state
      setSessions(prev => prev.map(s =>
        s.id === sessionId ? { ...s, title } : s
      ))
      setIsFirstMessage(false)
    } catch (error: any) {
      console.error('Error updating conversation title:', error)
      console.error('Error response:', error.response?.data)
    }
  }

  const switchConversation = (sid: string) => {
    setSessionId(sid)
    setShowConversations(false)
  }

  const handleToggle = async () => {
    setIsOpen(!isOpen)
    if (!isOpen) {
      await loadConversations()
      if (!sessionId) {
        await createNewConversation()
      }
    }
  }

  const stopStreaming = () => {
    shouldStopRef.current = true
    if (streamingIntervalRef.current) {
      clearInterval(streamingIntervalRef.current)
      streamingIntervalRef.current = null
    }

    if (streamingText) {
      setMessages(prev => [...prev, { role: 'ai', content: streamingText }])
    } else if (pendingStreamText) {
      setMessages(prev => [...prev, { role: 'ai', content: pendingStreamText }])
    }

    setStreamingText('')
    setPendingStreamText('')
    setIsStreaming(false)
    setLoading(false)
    shouldStopRef.current = false
  }

  const streamAIResponse = (text: string) => {
    setStreamingText('')
    setPendingStreamText(text)
    setIsStreaming(true)
    shouldStopRef.current = false

    let currentIndex = 0
    const speed = 20

    if (streamingIntervalRef.current) {
      clearInterval(streamingIntervalRef.current)
    }

    streamingIntervalRef.current = setInterval(() => {
      if (shouldStopRef.current) {
        clearInterval(streamingIntervalRef.current!)
        setIsStreaming(false)
        setStreamingText('')
        setPendingStreamText('')
        return
      }

      if (currentIndex < text.length) {
        setStreamingText(text.substring(0, currentIndex + 1))
        currentIndex++
      } else {
        clearInterval(streamingIntervalRef.current!)
        setIsStreaming(false)
        setMessages(prev => [...prev, { role: 'ai', content: text }])
        setStreamingText('')
        setPendingStreamText('')
      }
    }, speed)
  }

  useEffect(() => {
    return () => {
      if (streamingIntervalRef.current) {
        clearInterval(streamingIntervalRef.current)
      }
    }
  }, [])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isStreaming) return

    const userMessage: Message = { role: 'user', content: input }
    setMessages([...messages, userMessage])
    const userInput = input
    setInput('')
    setLoading(true)

    // Auto-name conversation on first message
    if (isFirstMessage && sessionId) {
      autoNameConversation(userInput)
    }

    try {
      if (!sessionId) {
        await createNewConversation()
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      if (!sessionId) {
        throw new Error('Failed to create session')
      }

      const response = await aiAPI.sendMessage(sessionId, userInput, { current_page: location.pathname })
      const aiResponseText = response.data.ai_response?.message || response.data.response || "I'm here to help with CCIS-CodeHub!"

      setLoading(false)

      const action = response.data.action
      if (action && actionHandlerRef.current) {
        await actionHandlerRef.current.handleAction(action, sessionId)

        if (action.type === 'search_results' && action.results) {
          const actionButtons = generateSearchActionButtons(action.results, actionHandlerRef.current, sessionId)
          streamAIResponseWithResults(aiResponseText, action.results, actionButtons)
          return
        }
      }

      streamAIResponse(aiResponseText)

    } catch (error: any) {
      console.error('AI Chat error:', error)
      setLoading(false)
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || "I'm your CCIS-CodeHub AI assistant! How can I help you?"
      streamAIResponse(errorMessage)
    }
  }

  const streamAIResponseWithResults = (text: string, results: SearchResult, buttons: ActionButton[]) => {
    setStreamingText('')
    setPendingStreamText(text)
    setIsStreaming(true)
    shouldStopRef.current = false

    let currentIndex = 0
    const speed = 20

    if (streamingIntervalRef.current) {
      clearInterval(streamingIntervalRef.current)
    }

    streamingIntervalRef.current = setInterval(() => {
      if (shouldStopRef.current) {
        clearInterval(streamingIntervalRef.current!)
        setIsStreaming(false)
        setStreamingText('')
        setPendingStreamText('')
        return
      }

      if (currentIndex < text.length) {
        setStreamingText(text.substring(0, currentIndex + 1))
        currentIndex++
      } else {
        clearInterval(streamingIntervalRef.current!)
        setIsStreaming(false)
        setMessages(prev => [...prev, { role: 'ai', content: text, searchResults: results, actionButtons: buttons }])
        setStreamingText('')
        setPendingStreamText('')
      }
    }, speed)
  }

  // Get display title for session
  const getSessionTitle = (session: Session) => {
    if (session.title) return session.title
    return session.session_type.replace('_', ' ')
  }

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={handleToggle}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full shadow-2xl hover:scale-110 transition-transform z-50 flex items-center justify-center"
        >
          <span className="text-2xl sm:text-3xl">🤖</span>
        </button>
      )}

      {/* Chat Window - Dark Glass UI */}
      {isOpen && (
        <div className="fixed inset-2 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[420px] sm:h-[550px] bg-slate-900/95 backdrop-blur-lg border border-slate-700/50 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden">
          {/* Header - Dark Glass */}
          <div className="bg-slate-800/80 backdrop-blur-lg border-b border-slate-700/50 p-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowConversations(!showConversations)}
                className="text-purple-400 hover:bg-slate-700/50 rounded-lg px-2 py-1 flex items-center justify-center transition-colors"
                title="Conversations"
              >
                💬
              </button>
              <span className="text-2xl">🤖</span>
              <div>
                <h3 className="font-bold text-white">AI Mentor</h3>
                <p className="text-xs text-slate-400">Smarter Than Your Average Mentor</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={createNewConversation}
                className="text-slate-300 hover:bg-slate-700/50 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
                title="New Chat"
              >
                ➕
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="text-slate-300 hover:bg-slate-700/50 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
                title="Settings"
              >
                ⚙️
              </button>
              <button
                onClick={handleToggle}
                className="text-slate-300 hover:bg-slate-700/50 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Conversation List Sidebar - Dark Glass */}
          {showConversations && (
            <div className="absolute left-0 top-0 h-full w-64 bg-slate-900/98 backdrop-blur-lg border-r border-slate-700/50 rounded-l-2xl z-10 overflow-hidden shadow-xl">
              <div className="p-4 bg-slate-800/80 border-b border-slate-700/50">
                <h3 className="font-bold text-white">Conversations</h3>
              </div>
              <div className="overflow-y-auto h-[calc(100%-4rem)]">
                {sessions.length === 0 ? (
                  <div className="p-4 text-center text-slate-400">
                    <p className="text-sm">No conversations yet</p>
                    <button onClick={createNewConversation} className="mt-2 px-4 py-2 bg-purple-600 rounded-lg text-white text-sm hover:bg-purple-700">
                      Start New Chat
                    </button>
                  </div>
                ) : (
                  <div className="p-2 space-y-2">
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        className={`w-full text-left p-3 rounded-lg transition-colors cursor-pointer group relative ${session.id === sessionId ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                        onClick={() => switchConversation(session.id)}
                      >
                        <div className="text-sm font-medium truncate pr-6">{getSessionTitle(session)}</div>
                        <div className="text-xs opacity-70 mt-1">{new Date(session.started_at).toLocaleDateString()}</div>

                        {/* Delete button */}
                        <button
                          onClick={(e) => deleteConversation(session.id, e)}
                          className={`absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${session.id === sessionId ? 'hover:bg-purple-700 text-white' : 'hover:bg-red-600 text-slate-400 hover:text-white'}`}
                          title="Delete conversation"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loadingHistory ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="flex gap-1 justify-center mb-2">
                    <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                  <p className="text-sm text-slate-400">Loading conversation...</p>
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] ${msg.role === 'user' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white' : 'bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 text-slate-100'} rounded-2xl overflow-hidden shadow-md`}>
                      <div className="p-3 text-sm">
                        {msg.role === 'ai' ? (
                          <FormattedMessage content={msg.content} />
                        ) : (
                          <span className="whitespace-pre-wrap">{msg.content}</span>
                        )}
                      </div>

                      {msg.searchResults && (
                        <div className="border-t border-slate-700 p-3 space-y-2">
                          <div className="text-xs font-semibold text-purple-400 mb-2">🔍 Found {msg.searchResults.total} results</div>
                          {msg.searchResults.paths && msg.searchResults.paths.length > 0 && (
                            <div className="space-y-1">
                              {msg.searchResults.paths.slice(0, 3).map((path) => (
                                <div key={path.id} className="bg-slate-700/50 p-2 rounded text-xs">
                                  <div className="font-medium flex items-center gap-1"><span>{path.icon}</span><span>{path.name}</span></div>
                                  <div className="text-slate-400 text-[10px] mt-1">{path.module_count} modules</div>
                                </div>
                              ))}
                            </div>
                          )}
                          {msg.searchResults.modules && msg.searchResults.modules.length > 0 && (
                            <div className="space-y-1">
                              {msg.searchResults.modules.slice(0, 2).map((module) => (
                                <div key={module.id} className="bg-slate-700/50 p-2 rounded text-xs">
                                  <div className="font-medium">📘 {module.title}</div>
                                  <div className="text-slate-400 text-[10px]">{module.path_name}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {msg.actionButtons && msg.actionButtons.length > 0 && (
                        <div className="border-t border-slate-700 p-3 space-y-2">
                          {msg.actionButtons.map((btn, btnIdx) => (
                            <button
                              key={btnIdx}
                              onClick={btn.onClick}
                              className={`w-full text-xs px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${btn.variant === 'primary' ? 'bg-purple-600 hover:bg-purple-700 text-white' : btn.variant === 'success' ? 'bg-green-600 hover:bg-green-700 text-white' : btn.variant === 'danger' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
                            >
                              {btn.icon && <span>{btn.icon}</span>}
                              <span>{btn.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}

            {isStreaming && streamingText && (
              <div className="flex justify-start">
                <div className="max-w-[85%] p-3 rounded-2xl bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 text-slate-100 shadow-md">
                  <span className="whitespace-pre-wrap text-sm leading-relaxed">{streamingText}</span>
                  <span className="inline-block w-0.5 h-4 ml-1 bg-purple-400 animate-pulse"></span>
                </div>
              </div>
            )}

            {loading && !isStreaming && (
              <div className="flex justify-start">
                <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 p-3 rounded-2xl shadow-md">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                    <span className="text-sm text-slate-400">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}

            {isStreaming && (
              <div className="flex justify-center my-2">
                <button onClick={stopStreaming} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition-colors flex items-center gap-2">
                  <span>⏹</span><span>Stop Generating</span>
                </button>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="p-3 sm:p-4 border-t border-slate-700/50 bg-slate-900/50">
            <div className="flex space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything..."
                className="flex-1 px-4 py-2.5 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-sm placeholder:text-slate-500 transition-all"
              />
              <button
                type="submit"
                disabled={loading || isStreaming}
                className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-xl transition disabled:opacity-50 shadow-lg shadow-purple-500/20"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
                  <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}

      <AIChatSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onModelChange={(modelId) => {
          setSelectedModelId(modelId)
          setShowSettings(false)
        }}
      />

      {confirmationDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <span className="text-3xl">⚠️</span>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Confirm Action</h3>
                <p className="text-slate-300 text-sm">{confirmationDialog.message}</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { confirmationDialog.onCancel?.(); setConfirmationDialog(null) }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={async () => { await confirmationDialog.onConfirm(); setConfirmationDialog(null) }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors text-sm font-medium"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
