interface PlayerListProps {
  players: Map<string, { name: string }>
}

export function PlayerList({ players }: PlayerListProps) {
  if (players.size === 0) return null

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        left: 16,
        padding: '12px 14px',
        background: 'linear-gradient(180deg, rgba(32, 32, 36, 0.95) 0%, rgba(24, 24, 28, 0.95) 100%)',
        borderRadius: 8,
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
        minWidth: 140,
        pointerEvents: 'auto'
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'rgba(255, 255, 255, 0.5)',
          marginBottom: 10,
          paddingBottom: 8,
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
        }}
      >
        Online ({players.size})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {Array.from(players.entries()).map(([id, player]) => (
          <div
            key={id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#4ade80',
                boxShadow: '0 0 6px rgba(74, 222, 128, 0.5)'
              }}
            />
            <span style={{
              fontSize: 12,
              color: 'rgba(255, 255, 255, 0.85)'
            }}>
              {player.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
