import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface CodeHighlightProps {
  code: string
  language: string
}

export default function CodeHighlight({ code, language }: CodeHighlightProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Simple syntax highlighting for common patterns
  const highlightCode = (text: string, lang: string) => {
    // Basic keyword highlighting
    const keywords = {
      javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'default', 'async', 'await'],
      python: ['def', 'class', 'import', 'from', 'return', 'if', 'else', 'elif', 'for', 'while', 'in', 'and', 'or', 'not', 'True', 'False', 'None'],
      typescript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'interface', 'type', 'import', 'export', 'default', 'async', 'await'],
      java: ['public', 'private', 'protected', 'class', 'interface', 'extends', 'implements', 'return', 'if', 'else', 'for', 'while', 'new', 'static', 'final'],
      html: ['div', 'span', 'p', 'a', 'img', 'button', 'input', 'form', 'header', 'footer', 'nav', 'section', 'article'],
      css: ['color', 'background', 'display', 'position', 'width', 'height', 'margin', 'padding', 'border', 'font'],
    }

    const langKeywords = keywords[lang as keyof typeof keywords] || []
    let highlighted = text

    // Escape HTML
    highlighted = highlighted
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    // Highlight strings
    highlighted = highlighted.replace(/(["'`])([^"'`]*)\1/g, '<span class="text-green-400">$1$2$1</span>')

    // Highlight numbers
    highlighted = highlighted.replace(/\b(\d+)\b/g, '<span class="text-blue-400">$1</span>')

    // Highlight comments
    highlighted = highlighted.replace(/(\/\/.*$)/gm, '<span class="text-gray-500">$1</span>')
    highlighted = highlighted.replace(/(#.*$)/gm, '<span class="text-gray-500">$1</span>')

    // Highlight keywords
    langKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b(${keyword})\\b`, 'g')
      highlighted = highlighted.replace(regex, '<span class="text-purple-400 font-semibold">$1</span>')
    })

    return highlighted
  }

  return (
    <div className="relative group">
      <div className="absolute top-2 right-2 z-10">
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-1 px-2 py-1 bg-slate-800/80 hover:bg-slate-700 rounded text-xs transition-colors"
        >
          {copied ? (
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
      <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-x-auto">
        <code 
          className="text-sm text-gray-300 font-mono"
          dangerouslySetInnerHTML={{ __html: highlightCode(code, language) }}
        />
      </pre>
    </div>
  )
}
