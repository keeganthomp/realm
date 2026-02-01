interface ConnectionStatusProps {
  connected: boolean
}

export function ConnectionStatus({ connected }: ConnectionStatusProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        background: 'linear-gradient(180deg, rgba(32, 32, 36, 0.9) 0%, rgba(24, 24, 28, 0.9) 100%)',
        borderRadius: 6,
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.3)',
        pointerEvents: 'auto'
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: connected ? '#4ade80' : '#f87171',
          boxShadow: connected
            ? '0 0 8px rgba(74, 222, 128, 0.5)'
            : '0 0 8px rgba(248, 113, 113, 0.5)',
          transition: 'all 0.2s ease'
        }}
      />
      <span
        style={{
          fontSize: 11,
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'rgba(255, 255, 255, 0.5)'
        }}
      >
        {connected ? 'Online' : 'Offline'}
      </span>
    </div>
  )
}
