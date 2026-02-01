import { useEffect, useState } from 'react'

interface ActionProgressProps {
  duration: number
  action: string
  onComplete?: () => void
}

export function ActionProgress({ duration, action, onComplete }: ActionProgressProps) {
  const [progress, setProgress] = useState(0)
  const [startTime] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const newProgress = Math.min(elapsed / duration, 1)
      setProgress(newProgress)

      if (newProgress >= 1) {
        clearInterval(interval)
        onComplete?.()
      }
    }, 16)

    return () => clearInterval(interval)
  }, [duration, startTime, onComplete])

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 100,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 200,
        pointerEvents: 'none'
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: '#ffffff',
          textAlign: 'center',
          marginBottom: 6,
          textTransform: 'uppercase',
          letterSpacing: '0.1em'
        }}
      >
        {action}...
      </div>
      <div
        style={{
          height: 6,
          background: 'rgba(0, 0, 0, 0.6)',
          borderRadius: 3,
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progress * 100}%`,
            background: 'linear-gradient(90deg, #b8860b, #daa520)',
            transition: 'width 0.05s linear'
          }}
        />
      </div>
    </div>
  )
}
