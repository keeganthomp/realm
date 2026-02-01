import { useState, useRef, useEffect } from 'react'

interface ChatPanelProps {
  messages: Array<{ sender: string; text: string }>
  onSend: (text: string) => void
}

// Shared panel styles
const panelStyle = {
  background: 'linear-gradient(180deg, rgba(32, 32, 36, 0.95) 0%, rgba(24, 24, 28, 0.95) 100%)',
  borderRadius: 8,
  border: '1px solid rgba(255, 255, 255, 0.08)',
  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
  overflow: 'hidden' as const
}

const headerStyle = {
  padding: '12px 14px',
  display: 'flex' as const,
  justifyContent: 'space-between' as const,
  alignItems: 'center' as const,
  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  background: 'rgba(0, 0, 0, 0.2)'
}

const labelStyle = {
  fontSize: 11,
  fontWeight: 600 as const,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  color: 'rgba(255, 255, 255, 0.5)'
}

export function ChatPanel({ messages, onSend }: ChatPanelProps) {
  const [input, setInput] = useState('')
  const [expanded, setExpanded] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) {
      onSend(input)
      setInput('')
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        width: 340,
        ...panelStyle,
        pointerEvents: 'auto'
      }}
    >
      {/* Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ ...headerStyle, cursor: 'pointer' }}
      >
        <span style={labelStyle}>Chat</span>
        <span style={{
          color: 'rgba(255, 255, 255, 0.4)',
          fontSize: 14,
          fontWeight: 400,
          width: 16,
          textAlign: 'center'
        }}>
          {expanded ? '−' : '+'}
        </span>
      </div>

      {expanded && (
        <>
          {/* Messages */}
          <div
            style={{
              height: 140,
              overflowY: 'auto',
              padding: '12px 14px',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(255,255,255,0.2) transparent'
            }}
          >
            {messages.length === 0 ? (
              <div style={{
                color: 'rgba(255, 255, 255, 0.3)',
                fontSize: 12,
                fontStyle: 'italic'
              }}>
                No messages yet...
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} style={{
                  marginBottom: 8,
                  lineHeight: 1.4
                }}>
                  <span style={{
                    color: msg.sender === 'System' ? '#f87171' : '#d4a84b',
                    fontSize: 12,
                    fontWeight: 500
                  }}>
                    {msg.sender}:
                  </span>{' '}
                  <span style={{
                    color: 'rgba(255, 255, 255, 0.85)',
                    fontSize: 12
                  }}>
                    {msg.text}
                  </span>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} style={{ padding: '0 10px 10px' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 6,
                color: '#ffffff',
                fontSize: 12,
                outline: 'none',
                transition: 'border-color 0.15s ease, background 0.15s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(212, 168, 75, 0.5)'
                e.target.style.background = 'rgba(0, 0, 0, 0.4)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'
                e.target.style.background = 'rgba(0, 0, 0, 0.3)'
              }}
            />
          </form>
        </>
      )}
    </div>
  )
}
