import { useState, useEffect } from 'react'
import { aiAPI } from '../services/api'

export default function AIMentor() {
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      content: 'Hello! I\'m your AI Mentor. How can I help you with your coding journey today?'
    }
  ])
  const [input, setInput] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    createSession()
  }, [])

  const createSession = async () => {
    try {
      const response = await aiAPI.createSession({ title: 'New Chat' })
      setSessionId(response.data.id)
    } catch (error) {
      console.error('Error creating session:', error)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    // Add user message
    const userMessage = { role: 'user', content: input }
    setMessages([...messages, userMessage])
    setInput('')
    setLoading(true)

    try {
      if (sessionId) {
        const response = await aiAPI.sendMessage(sessionId, input)
        const aiResponse = {
          role: 'ai',
          content: response.data.response || "I'm here to help you with your coding questions!"
        }
        setMessages(prev => [...prev, aiResponse])
      } else {
        // Fallback response if no session
        const aiResponse = {
          role: 'ai',
          content: "I'm here to help! What coding topic would you like to explore today?"
        }
        setMessages(prev => [...prev, aiResponse])
      }
    } catch (error) {
      const aiResponse = {
        role: 'ai',
        content: "I can help you with coding questions! Try asking about web development, data structures, or any programming concept."
      }
      setMessages(prev => [...prev, aiResponse])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">AI Mentor</h1>
          <p className="text-xl text-slate-400">Get instant help with your coding questions</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl h-[600px] flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
                <div className={`flex items-start max-w-md ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`p-2 rounded-full ${msg.role === 'user' ? 'bg-indigo-600 ml-2' : 'bg-purple-600 mr-2'} flex items-center justify-center w-10 h-10`}>
                    <span className="text-xl">{msg.role === 'user' ? '👤' : '🤖'}</span>
                  </div>
                  <div className={`p-4 rounded-lg ${msg.role === 'user' ? 'bg-indigo-900' : 'bg-slate-800'}`}>
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start mb-4">
                <div className="flex items-start">
                  <div className="p-2 rounded-full bg-purple-600 mr-2 flex items-center justify-center w-10 h-10">
                    <span className="text-xl animate-pulse">🤖</span>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-800">
                    <span className="animate-pulse">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSendMessage} className="border-t border-slate-800 p-4 flex space-x-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything about coding..."
              className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:border-purple-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition disabled:opacity-50 flex items-center"
            >
              <span className="text-xl">{loading ? '⏳' : '📤'}</span>
              <span className="ml-2">Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
