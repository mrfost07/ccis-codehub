import { useState, useEffect, useRef } from 'react'
import { Send, Bot, User, Copy, Check, Code, Loader } from 'lucide-react'
import api from '../services/api'
import Navbar from '../components/Navbar'
import CodeHighlight from '../components/CodeHighlight'

interface Message {
  id: string
  sender: 'user' | 'ai'
  message: string
  code?: {
    language: string
    content: string
  }
  timestamp: string
  isStreaming?: boolean
}

function AIChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [streamingText, setStreamingText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)

  useEffect(() => {
    createSession()
    // Add welcome message
    setMessages([{
      id: 'welcome',
      sender: 'ai',
      message: "👋 Hello! I'm your AI coding mentor. I can help you with:\n\n• Writing and debugging code\n• Explaining programming concepts\n• Code optimization suggestions\n• Learning recommendations\n• Project guidance\n\nHow can I assist you today?",
      timestamp: new Date().toISOString()
    }])
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingText])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const createSession = async () => {
    try {
      const response = await api.post('/ai/sessions/', {
        title: 'Chat Session ' + new Date().toLocaleString(),
        context_type: 'general'
      })
      setSessionId(response.data.id)
    } catch (error) {
      console.error('Failed to create session:', error)
    }
  }

  const simulateStreaming = (text: string, messageId: string) => {
    setIsStreaming(true)
    setStreamingText('')
    let currentIndex = 0
    const speed = 20 // milliseconds per character for smooth animation
    
    const streamInterval = setInterval(() => {
      if (currentIndex < text.length) {
        setStreamingText(text.substring(0, currentIndex + 1))
        currentIndex++
      } else {
        clearInterval(streamInterval)
        setIsStreaming(false)
        // Update the actual message
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, message: text, isStreaming: false }
            : msg
        ))
        setStreamingText('')
      }
    }, speed) // Smooth character-by-character animation
  }

  const extractCodeFromResponse = (response: string) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
    const matches = [...response.matchAll(codeBlockRegex)]
    
    if (matches.length > 0) {
      const codes = matches.map(match => ({
        language: match[1] || 'javascript',
        content: match[2].trim()
      }))
      
      // Remove code blocks from message
      let cleanMessage = response
      matches.forEach(match => {
        cleanMessage = cleanMessage.replace(match[0], '[CODE_BLOCK]')
      })
      
      return { message: cleanMessage, codes }
    }
    
    return { message: response, codes: [] }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || !sessionId) return

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      message: inputMessage,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const response = await api.post(`/ai/sessions/${sessionId}/send_message/`, {
        message: inputMessage
      })

      const aiResponse = response.data.ai_response.message
      const { message, codes } = extractCodeFromResponse(aiResponse)
      
      const aiMessageId = Date.now().toString() + '-ai'
      const aiMessage: Message = {
        id: aiMessageId,
        sender: 'ai',
        message: '',
        code: codes.length > 0 ? codes[0] : undefined,
        timestamp: new Date().toISOString(),
        isStreaming: true
      }

      setMessages(prev => [...prev, aiMessage])
      simulateStreaming(message, aiMessageId)
    } catch (error) {
      console.error('Failed to send message:', error)
      setMessages(prev => [...prev, {
        id: Date.now().toString() + '-error',
        sender: 'ai',
        message: '❌ Sorry, I encountered an error. Please try again or check your API configuration.',
        timestamp: new Date().toISOString()
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(id)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const formatMessage = (message: string) => {
    // Replace [CODE_BLOCK] placeholders and format the message
    return message.split('[CODE_BLOCK]').map((part, index) => (
      <span key={index}>
        {part.split('\n').map((line, lineIndex) => (
          <span key={lineIndex}>
            {line}
            {lineIndex < part.split('\n').length - 1 && <br />}
          </span>
        ))}
        {index < message.split('[CODE_BLOCK]').length - 1 && (
          <div className="my-2 text-xs text-blue-400">[See code below]</div>
        )}
      </span>
    ))
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />
      
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-t-xl p-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Bot className="h-8 w-8" />
            AI Coding Mentor
          </h1>
          <p className="text-blue-100 mt-2">Powered by Advanced AI Models</p>
        </div>

        {/* Chat Container */}
        <div className="flex-1 bg-slate-900 overflow-hidden flex flex-col">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
              >
                <div className={`flex gap-3 max-w-[80%] ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                  {/* Avatar */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    msg.sender === 'user' 
                      ? 'bg-blue-600' 
                      : 'bg-gradient-to-br from-purple-600 to-pink-600'
                  }`}>
                    {msg.sender === 'user' ? <User className="h-5 w-5 text-white" /> : <Bot className="h-5 w-5 text-white" />}
                  </div>
                  
                  {/* Message Bubble */}
                  <div className="flex flex-col gap-2">
                    <div className={`rounded-2xl p-4 ${
                      msg.sender === 'user' 
                        ? 'bg-blue-600/20 border border-blue-600/30' 
                        : 'bg-slate-800 border border-slate-700'
                    }`}>
                      <div className="text-white">
                        {msg.isStreaming ? (
                          <div className="flex items-center gap-2">
                            <span className="whitespace-pre-wrap">{streamingText}</span>
                            <span className="inline-block w-0.5 h-4 bg-purple-500 animate-pulse"></span>
                          </div>
                        ) : (
                          formatMessage(msg.message)
                        )}
                      </div>
                    </div>
                    
                    {/* Code Block if exists */}
                    {msg.code && !msg.isStreaming && (
                      <div className="bg-slate-950 rounded-lg overflow-hidden border border-slate-800">
                        <div className="flex justify-between items-center px-4 py-2 bg-slate-900 border-b border-slate-800">
                          <div className="flex items-center gap-2">
                            <Code className="h-4 w-4 text-blue-400" />
                            <span className="text-sm text-slate-400">{msg.code.language}</span>
                          </div>
                          <button
                            onClick={() => copyCode(msg.code!.content, msg.id)}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                          >
                            {copiedCode === msg.id ? (
                              <>
                                <Check className="h-3 w-3 text-green-400" />
                                <span className="text-green-400">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3 text-slate-400" />
                                <span className="text-slate-400">Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                        <div className="p-4">
                          <CodeHighlight 
                            code={msg.code.content}
                            language={msg.code.language}
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Timestamp */}
                    <span className="text-xs text-slate-500 px-2">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start animate-fadeIn">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-slate-800 p-4">
            <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-3">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask me anything about coding..."
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                disabled={isLoading || isStreaming}
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading || isStreaming}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95"
              >
                {isLoading || isStreaming ? (
                  <Loader className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </form>
            <div className="mt-2 flex gap-2 flex-wrap">
              {['How do I learn Python?', 'Explain async/await', 'Debug my code', 'Best practices for React'].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInputMessage(suggestion)}
                  className="px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"
                  disabled={isLoading || isStreaming}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AIChatInterface
