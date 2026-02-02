import { formatExpeditionTime } from '@realm/shared'

export interface ExpeditionState {
  id: string
  riftId: string
  tier: number
  tierName: string
  maxDuration: number
  maxStability: number
  currentStability: number
  stabilityDrainRate: number
  timeRemaining: number
}

interface ExpeditionPanelProps {
  expedition: ExpeditionState
  onExtract: () => void
}

export function ExpeditionPanel({ expedition, onExtract }: ExpeditionPanelProps) {
  const stabilityPercent = expedition.maxStability > 0
    ? (expedition.currentStability / expedition.maxStability) * 100
    : 0

  // Determine stability bar color based on percentage
  let stabilityColor = '#a855f7' // Purple (healthy)
  let stabilityGlow = 'rgba(168, 85, 247, 0.4)'
  if (stabilityPercent <= 25) {
    stabilityColor = '#f87171' // Red (critical)
    stabilityGlow = 'rgba(248, 113, 113, 0.5)'
  } else if (stabilityPercent <= 50) {
    stabilityColor = '#fbbf24' // Amber (warning)
    stabilityGlow = 'rgba(251, 191, 36, 0.4)'
  }

  // Timer urgency
  const timeSeconds = expedition.timeRemaining / 1000
  const timeUrgent = timeSeconds <= 60

  return (
    <div
      style={{
        position: 'absolute',
        top: 60,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: '12px 16px',
        background: 'linear-gradient(180deg, rgba(40, 20, 60, 0.95) 0%, rgba(20, 10, 40, 0.95) 100%)',
        borderRadius: 8,
        border: '1px solid rgba(168, 85, 247, 0.3)',
        boxShadow: '0 4px 20px rgba(88, 28, 135, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        minWidth: 200,
        pointerEvents: 'auto'
      }}
    >
      {/* Tier Name */}
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: '#c084fc',
          textShadow: '0 0 10px rgba(192, 132, 252, 0.5)',
          letterSpacing: '0.05em'
        }}
      >
        {expedition.tierName}
      </div>

      {/* Stability Bar */}
      <div style={{ width: '100%' }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'rgba(255, 255, 255, 0.5)',
            marginBottom: 4
          }}
        >
          Veil Stability
        </div>
        <div
          style={{
            width: '100%',
            height: 16,
            background: 'linear-gradient(180deg, rgba(32, 32, 36, 0.95) 0%, rgba(24, 24, 28, 0.95) 100%)',
            borderRadius: 4,
            overflow: 'hidden',
            position: 'relative',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          {/* Fill */}
          <div
            style={{
              position: 'absolute',
              left: 2,
              top: 2,
              bottom: 2,
              width: `calc(${stabilityPercent}% - 4px)`,
              minWidth: stabilityPercent > 0 ? 4 : 0,
              background: `linear-gradient(180deg, ${stabilityColor} 0%, ${stabilityColor}cc 100%)`,
              borderRadius: 2,
              transition: 'width 0.5s ease, background 0.25s ease',
              boxShadow: `0 0 12px ${stabilityGlow}`
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
              fontSize: 10,
              fontWeight: 600,
              color: '#ffffff',
              textShadow: '0 1px 3px rgba(0,0,0,0.8)',
              fontVariantNumeric: 'tabular-nums'
            }}
          >
            {Math.floor(expedition.currentStability)} / {expedition.maxStability}
          </div>
        </div>
      </div>

      {/* Timer */}
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: timeUrgent ? '#f87171' : '#e2e8f0',
          fontVariantNumeric: 'tabular-nums',
          textShadow: timeUrgent ? '0 0 10px rgba(248, 113, 113, 0.6)' : 'none',
          animation: timeUrgent ? 'pulse 1s ease-in-out infinite' : 'none'
        }}
      >
        {formatExpeditionTime(expedition.timeRemaining)}
      </div>

      {/* Extract Button */}
      <button
        onClick={onExtract}
        style={{
          width: '100%',
          padding: '8px 16px',
          background: 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)',
          border: 'none',
          borderRadius: 4,
          color: '#ffffff',
          fontSize: 12,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)',
          transition: 'transform 0.1s ease, box-shadow 0.1s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.02)'
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.5)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(34, 197, 94, 0.3)'
        }}
      >
        Extract
      </button>

      {/* Drain Rate Info */}
      <div
        style={{
          fontSize: 9,
          color: 'rgba(255, 255, 255, 0.4)',
          textAlign: 'center'
        }}
      >
        Stability drain: {expedition.stabilityDrainRate.toFixed(1)}/sec
      </div>
    </div>
  )
}
