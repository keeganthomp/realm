interface HealthBarProps {
  currentHp: number
  maxHp: number
}

export function HealthBar({ currentHp, maxHp }: HealthBarProps) {
  const hpPercent = maxHp > 0 ? (currentHp / maxHp) * 100 : 0

  // Determine color based on HP percentage
  let barColor = '#4ade80' // Green
  let glowColor = 'rgba(74, 222, 128, 0.4)'
  if (hpPercent <= 25) {
    barColor = '#f87171' // Red
    glowColor = 'rgba(248, 113, 113, 0.4)'
  } else if (hpPercent <= 50) {
    barColor = '#fbbf24' // Amber
    glowColor = 'rgba(251, 191, 36, 0.4)'
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
        gap: 6
      }}
    >
      {/* Label */}
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'rgba(255, 255, 255, 0.5)'
        }}
      >
        Hitpoints
      </span>

      {/* Bar container */}
      <div
        style={{
          width: 140,
          height: 18,
          background: 'linear-gradient(180deg, rgba(32, 32, 36, 0.95) 0%, rgba(24, 24, 28, 0.95) 100%)',
          borderRadius: 6,
          overflow: 'hidden',
          position: 'relative',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.3)'
        }}
      >
        {/* Fill */}
        <div
          style={{
            position: 'absolute',
            left: 2,
            top: 2,
            bottom: 2,
            width: `calc(${hpPercent}% - 4px)`,
            minWidth: hpPercent > 0 ? 4 : 0,
            background: `linear-gradient(180deg, ${barColor} 0%, ${barColor}cc 100%)`,
            borderRadius: 4,
            transition: 'width 0.25s ease, background 0.25s ease',
            boxShadow: `0 0 12px ${glowColor}`
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
            fontWeight: 600,
            color: '#ffffff',
            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          {currentHp} / {maxHp}
        </div>
      </div>
    </div>
  )
}
