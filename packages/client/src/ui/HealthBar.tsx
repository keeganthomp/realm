interface HealthBarProps {
  currentHp: number
  maxHp: number
}

export function HealthBar({ currentHp, maxHp }: HealthBarProps) {
  const hpPercent = maxHp > 0 ? (currentHp / maxHp) * 100 : 0

  // Determine color based on HP percentage
  let barColor = '#22c55e' // Green
  if (hpPercent <= 25) {
    barColor = '#ef4444' // Red
  } else if (hpPercent <= 50) {
    barColor = '#eab308' // Yellow
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4
      }}
    >
      {/* Label */}
      <span
        style={{
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: '#a3a3a3'
        }}
      >
        Hitpoints
      </span>

      {/* Bar container */}
      <div
        style={{
          width: 120,
          height: 16,
          background: 'rgba(0, 0, 0, 0.7)',
          borderRadius: 4,
          overflow: 'hidden',
          position: 'relative',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        {/* Fill */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${hpPercent}%`,
            background: barColor,
            transition: 'width 0.2s ease, background 0.2s ease',
            borderRadius: 3
          }}
        />

        {/* Text */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 500,
            color: '#ffffff',
            textShadow: '0 1px 2px rgba(0,0,0,0.8)'
          }}
        >
          {currentHp} / {maxHp}
        </div>
      </div>
    </div>
  )
}
