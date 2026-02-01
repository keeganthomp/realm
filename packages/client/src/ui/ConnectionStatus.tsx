interface ConnectionStatusProps {
  connected: boolean
}

export function ConnectionStatus({ connected }: ConnectionStatusProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        background: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 4,
        pointerEvents: 'auto'
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: connected ? '#4ade80' : '#ef4444',
          transition: 'background 0.2s ease'
        }}
      />
      <span
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: '#a3a3a3'
        }}
      >
        {connected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  )
}
