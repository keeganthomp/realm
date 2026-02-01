import { useState, useRef, useEffect } from 'react'

interface ChatPanelProps {
  messages: Array<{ sender: string; text: string }>
  onSend: (text: string) => void
}

export function ChatPanel({ messages, onSend }: ChatPanelProps) {
  const [input, setInput] = useState('')
  const [expanded, setExpanded] = useState(true)
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
        width: 320,
        background: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 4,
        overflow: 'hidden',
        pointerEvents: 'auto',
        transition: 'all 0.2s ease'
      }}
    >
      {/* Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '10px 16px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: expanded ? '1px solid rgba(255,255,255,0.1)' : 'none'
        }}
      >
        <span
          style={{
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: '#a3a3a3'
          }}
        >
          Chat
        </span>
        <span style={{ color: '#a3a3a3', fontSize: 12 }}>{expanded ? '−' : '+'}</span>
      </div>

      {expanded && (
        <>
          {/* Messages */}
          <div
            style={{
              height: 160,
              overflowY: 'auto',
              padding: 12
            }}
          >
            {messages.length === 0 ? (
              <div style={{ color: '#666', fontSize: 12, fontStyle: 'italic' }}>
                No messages yet...
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} style={{ marginBottom: 6 }}>
                  <span style={{ color: '#b8860b', fontSize: 13 }}>{msg.sender}:</span>{' '}
                  <span style={{ color: '#ffffff', fontSize: 13 }}>{msg.text}</span>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} style={{ padding: '0 12px 12px' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 4,
                color: '#ffffff',
                fontSize: 13,
                outline: 'none',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#b8860b'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'
              }}
            />
          </form>
        </>
      )}
    </div>
  )
}
