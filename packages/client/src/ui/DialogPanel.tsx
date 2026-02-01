interface DialogPanelProps {
  title: string
  text: string
  onClose: () => void
}

export function DialogPanel({ title, text, onClose }: DialogPanelProps) {
  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        minWidth: 300,
        maxWidth: 400,
        background: 'rgba(0, 0, 0, 0.95)',
        borderRadius: 8,
        overflow: 'hidden',
        zIndex: 1000,
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(184, 134, 11, 0.15)'
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: '#d4af37'
          }}
        >
          {title}
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#a3a3a3',
            cursor: 'pointer',
            fontSize: 18,
            padding: '4px 8px'
          }}
        >
          x
        </button>
      </div>

      {/* Content */}
      <div
        style={{
          padding: 16,
          fontSize: 13,
          lineHeight: 1.5,
          color: '#e0e0e0',
          whiteSpace: 'pre-wrap'
        }}
      >
        {text}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '8px 16px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          justifyContent: 'center'
        }}
      >
        <button
          onClick={onClose}
          style={{
            padding: '6px 24px',
            background: 'rgba(184, 134, 11, 0.3)',
            border: '1px solid rgba(184, 134, 11, 0.5)',
            borderRadius: 4,
            color: '#d4af37',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 500
          }}
        >
          Close
        </button>
      </div>
    </div>
  )
}
