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
        padding: 16,
        background: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 4,
        minWidth: 160,
        pointerEvents: 'auto'
      }}
    >
      <div
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: '#a3a3a3',
          marginBottom: 12
        }}
      >
        Players Online ({players.size})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                background: '#4ade80'
              }}
            />
            <span style={{ fontSize: 13, color: '#ffffff' }}>{player.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
