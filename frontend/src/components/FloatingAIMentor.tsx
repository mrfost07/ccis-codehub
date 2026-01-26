import { useState, useEffect, useRef, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { aiAPI } from '../services/api'
import AIChatSettings from './AIChatSettings'
import { AIActionHandler, ConfirmationCallback, SearchResult, ActionButton, generateSearchActionButtons } from '../services/aiActionHandler'
import toast from 'react-hot-toast'
import { Menu, Plus, Settings, X, Bot, MessageSquare, Send, ChevronRight, Trash2 } from 'lucide-react'

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
  const [isIdle, setIsIdle] = useState(true) // Start in idle mode (minimized)
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
  const [usedSuggestions, setUsedSuggestions] = useState<Set<string>>(new Set())
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [userRole, setUserRole] = useState<string>('student')
  const streamingIntervalRef = useRef<number | null>(null)
  const actionHandlerRef = useRef<AIActionHandler | null>(null)
  const shouldStopRef = useRef(false)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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

  // Get current user role for role-based suggestions
  const getCurrentUserRole = (): string => {
    const userData = sessionStorage.getItem('user') || localStorage.getItem('user')
    if (userData) {
      try {
        const user = JSON.parse(userData)
        // Check for role in user object (could be 'role', 'user_role', or 'is_staff' for admin)
        if (user.role) return user.role.toLowerCase()
        if (user.user_role) return user.user_role.toLowerCase()
        if (user.is_superuser || user.is_staff) return 'admin'
        return 'student'
      } catch {
        return 'student'
      }
    }
    return 'student'
  }

  // Set user role on mount
  useEffect(() => {
    const role = getCurrentUserRole()
    console.log('Detected user role:', role)
    setUserRole(role)
  }, [])

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
  // Note: Session messages are loaded via loadSessionMessagesRef to avoid temporal dead zone
  const loadSessionMessagesRef = useRef<((sid: string) => Promise<void>) | null>(null)

  useEffect(() => {
    if (sessionId) {
      const userId = getCurrentUserId()
      if (userId) {
        sessionStorage.setItem(`ai_mentor_session_id_${userId}`, sessionId)
        localStorage.setItem(`ai_mentor_session_id_${userId}`, sessionId)
      }
      // Call via ref to avoid temporal dead zone
      if (loadSessionMessagesRef.current) {
        loadSessionMessagesRef.current(sessionId)
      }
    }
  }, [sessionId])

  // Cleanup interval on unmount - MUST be before early return!
  useEffect(() => {
    return () => {
      if (streamingIntervalRef.current) {
        clearInterval(streamingIntervalRef.current)
      }
    }
  }, [])

  // Cleanup idle timer on unmount - MUST be before early return!
  useEffect(() => {
    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current)
      }
    }
  }, [])

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

  // Assign function to ref after it's defined so useEffect can call it
  loadSessionMessagesRef.current = loadSessionMessages

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

    // Confirm before deleting
    if (!window.confirm('Delete this conversation?')) {
      return
    }

    console.log('deleteConversation: Deleting session:', sid)

    try {
      await aiAPI.deleteSession(sid)
      console.log('deleteConversation: API call successful')

      // Remove from local state
      const updatedSessions = sessions.filter(s => s.id !== sid)
      setSessions(updatedSessions)

      // If we deleted the current session, clean up and switch
      if (sid === sessionId) {
        console.log('deleteConversation: Deleted current session, switching...')

        // Clear user-specific storage for this session
        const userId = getCurrentUserId()
        if (userId) {
          sessionStorage.removeItem(`ai_mentor_session_id_${userId}`)
          localStorage.removeItem(`ai_mentor_session_id_${userId}`)
        }

        setMessages([]) // Clear messages first

        if (updatedSessions.length > 0) {
          // Switch to the first available session
          const newSessionId = updatedSessions[0].id
          setSessionId(newSessionId)
        } else {
          // No sessions left, set to null first then create new
          setSessionId(null)
          // Use setTimeout to avoid state race condition
          setTimeout(() => {
            createNewConversation()
          }, 100)
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
    // Clear any existing idle timer
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }

    const wasOpen = isOpen
    setIsOpen(!isOpen)
    setIsIdle(false) // Always exit idle when interacting

    if (!wasOpen) {
      // Opening the chat
      await loadConversations()
      if (!sessionId) {
        await createNewConversation()
      }
    } else {
      // Closing the chat - start idle timer (5 seconds)
      idleTimerRef.current = setTimeout(() => {
        setIsIdle(true)
      }, 5000)
    }
  }

  // Handle clicking the idle button to expand
  const handleIdleClick = () => {
    // Clear any pending idle timer
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
    setIsIdle(false)
    // Start new idle timer - if user doesn't open chat in 5 seconds, go back to idle
    idleTimerRef.current = setTimeout(() => {
      if (!isOpen) {
        setIsIdle(true)
      }
    }, 5000)
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
    const speed = 5  // Fast streaming (was 20ms)

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
      console.error('Error details:', error.response?.data)
      setLoading(false)

      // Show detailed error for debugging, not generic fallback
      let errorMessage = "Sorry, I couldn't process your request. "
      if (error.response?.status === 400) {
        errorMessage += error.response?.data?.error || "Please select an AI model in settings."
      } else if (error.response?.status === 500) {
        errorMessage += "Server error. Please try again."
      } else if (error.response?.data?.error) {
        errorMessage += error.response.data.error
      } else if (error.message) {
        errorMessage += error.message
      } else {
        errorMessage += "Please check your connection and try again."
      }

      streamAIResponse(errorMessage)
    }
  }

  const streamAIResponseWithResults = (text: string, results: SearchResult, buttons: ActionButton[]) => {
    setStreamingText('')
    setPendingStreamText(text)
    setIsStreaming(true)
    shouldStopRef.current = false

    let currentIndex = 0
    const speed = 5  // Fast streaming (was 20ms)

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

  // Role-based quick action suggestions (no emojis, just text)
  const getSuggestions = () => {
    const suggestions: Record<string, Array<{ label: string, value: string }>> = {
      student: [
        { label: "My Courses", value: "What courses am I enrolled in?" },
        { label: "My Progress", value: "Show my learning progress" },
        { label: "Recommend", value: "Recommend a course for me" },
        { label: "My Projects", value: "Show my projects" },
      ],
      instructor: [
        { label: "My Courses", value: "Show courses I teach" },
        { label: "Students", value: "Show my students' progress" },
        { label: "Create Module", value: "Help me create a new module" },
        { label: "Analytics", value: "Show course analytics" },
      ],
      admin: [
        { label: "Stats", value: "Show platform statistics" },
        { label: "Users", value: "Show user overview" },
        { label: "Courses", value: "List all courses" },
        { label: "Activity", value: "Show recent platform activity" },
      ]
    }
    return suggestions[userRole] || suggestions.student
  }

  const handleSuggestionClick = async (suggestionValue: string) => {
    setUsedSuggestions(prev => new Set([...prev, suggestionValue]))
    setShowSuggestions(false)

    // Directly send the message (don't just fill the input)
    const userMessage: Message = { role: 'user', content: suggestionValue }
    setMessages(prev => [...prev, userMessage])
    setLoading(true)

    // Auto-name conversation on first message
    if (isFirstMessage && sessionId) {
      autoNameConversation(suggestionValue)
    }

    try {
      if (!sessionId) {
        await createNewConversation()
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      if (!sessionId) {
        throw new Error('Failed to create session')
      }

      const response = await aiAPI.sendMessage(sessionId, suggestionValue, { current_page: location.pathname })
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
      let errorMessage = "Sorry, I couldn't process your request. "
      if (error.response?.status === 400) {
        errorMessage += error.response?.data?.error || "Please select an AI model in settings."
      } else if (error.response?.data?.error) {
        errorMessage += error.response.data.error
      } else {
        errorMessage += "Please try again."
      }
      streamAIResponse(errorMessage)
    }
  }

  // Get display title for session
  const getSessionTitle = (session: Session) => {
    if (session.title) return session.title
    return session.session_type.replace('_', ' ')
  }

  return (
    <>
      {/* Floating Button - Idle (Minimized Side Dock) or Active (Full Button) */}
      {!isOpen && isIdle && (
        <button
          onClick={handleIdleClick}
          className="fixed right-0 bottom-1/3 w-10 h-16 bg-slate-900/60 backdrop-blur-sm border border-slate-700/30 border-r-0 rounded-l-xl shadow-lg hover:w-12 hover:bg-slate-800/80 transition-all duration-300 z-50 flex items-center justify-center group"
          title="Open AI Mentor"
        >
          <Bot className="w-4 h-4 text-purple-400 opacity-60 group-hover:opacity-100 group-hover:w-5 group-hover:h-5 transition-all" />
        </button>
      )}

      {/* Floating Button - Active (Full floating button with Lucide Icon) */}
      {!isOpen && !isIdle && (
        <button
          onClick={handleToggle}
          className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full shadow-2xl hover:scale-110 transition-all duration-300 z-[60] flex items-center justify-center"
        >
          <Bot className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
        </button>
      )}

      {/* Chat Window - Dark Glass UI */}
      {isOpen && (
        <div className="fixed inset-2 bottom-20 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[420px] sm:h-[550px] bg-slate-900/95 backdrop-blur-lg border border-slate-700/50 rounded-2xl shadow-2xl z-[60] flex flex-col overflow-hidden">
          {/* Header - Dark Glass */}
          <div className="bg-slate-800/80 backdrop-blur-lg border-b border-slate-700/50 p-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowConversations(!showConversations)}
                className="text-slate-400 hover:text-purple-400 hover:bg-slate-700/50 rounded-lg p-1.5 flex items-center justify-center transition-colors"
                title="Conversations"
              >
                <Menu className="w-5 h-5" />
              </button>
              <Bot className="w-7 h-7 text-purple-400" />
              <div>
                <h3 className="font-bold text-white">AI Mentor</h3>
                <p className="text-xs text-slate-400">Smarter Than Your Average Mentor</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={createNewConversation}
                className="text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg p-2 flex items-center justify-center transition-colors"
                title="New Chat"
              >
                <Plus className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg p-2 flex items-center justify-center transition-colors"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={handleToggle}
                className="text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg p-2 flex items-center justify-center transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Conversation List Sidebar - Dark Glass */}
          {showConversations && (
            <div className="absolute left-0 top-0 h-full w-64 bg-slate-900/98 backdrop-blur-lg border-r border-slate-700/50 rounded-l-2xl z-10 overflow-hidden shadow-xl">
              <div className="p-4 bg-slate-800/80 border-b border-slate-700/50 flex items-center justify-between">
                <h3 className="font-bold text-white">Conversations</h3>
                <button
                  onClick={() => setShowConversations(false)}
                  className="text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg p-1.5 transition-colors"
                  title="Close panel"
                >
                  <X className="w-4 h-4" />
                </button>
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

                        {/* Delete button with Lucide icon */}
                        <button
                          onClick={(e) => deleteConversation(session.id, e)}
                          className={`absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${session.id === sessionId ? 'hover:bg-purple-700 text-white' : 'hover:bg-red-600/80 text-slate-400 hover:text-white'}`}
                          title="Delete conversation"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 relative">
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

          {/* Quick Suggestion Buttons - Absolutely positioned overlay above input */}
          <div className={`absolute bottom-16 right-4 z-20 transition-all duration-300 pointer-events-auto ${input.length > 0 || loading || isStreaming ? 'opacity-0 pointer-events-none translate-y-2' : 'opacity-100 translate-y-0'}`}>
            <div className="flex flex-col gap-2 items-end">
              {getSuggestions()
                .filter(s => !usedSuggestions.has(s.value))
                .slice(0, 4)
                .map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion.value)}
                    className="px-3 py-1.5 text-xs text-slate-300 hover:text-white border border-slate-500/50 hover:border-purple-400 rounded-full transition-all flex items-center gap-1 group bg-slate-900/90 backdrop-blur-sm hover:bg-purple-600/80 shadow-md"
                  >
                    <span>{suggestion.label}</span>
                    <ChevronRight className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
            </div>
          </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="p-3 sm:p-4 border-t border-slate-700/50 bg-slate-900/50">
            <div className="flex space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  // Show suggestions again when input is cleared
                  if (e.target.value.length === 0) {
                    setShowSuggestions(true)
                  }
                }}
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
