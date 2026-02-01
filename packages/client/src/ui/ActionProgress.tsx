import { useEffect, useState, useRef } from 'react'

interface ActionProgressProps {
  duration: number
  action: string
  loop?: boolean
}

export function ActionProgress({ duration, action, loop = false }: ActionProgressProps) {
  const [progress, setProgress] = useState(0)
  const startTimeRef = useRef(window.performance.now())
  const rafRef = useRef<number>(0)

  useEffect(() => {
    startTimeRef.current = window.performance.now()

    const animate = () => {
      const elapsed = window.performance.now() - startTimeRef.current
      const rawProgress = elapsed / duration
      const newProgress = loop ? rawProgress % 1 : Math.min(rawProgress, 1)
      setProgress(newProgress)

      if (loop || newProgress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [duration, loop])

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 100,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 220,
        pointerEvents: 'none'
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          background: 'linear-gradient(180deg, rgba(32, 32, 36, 0.95) 0%, rgba(24, 24, 28, 0.95) 100%)',
          borderRadius: 8,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)'
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'rgba(255, 255, 255, 0.7)',
            textAlign: 'center',
            marginBottom: 8,
            textTransform: 'uppercase',
            letterSpacing: '0.08em'
          }}
        >
          {action}...
        </div>
        <div
          style={{
            height: 6,
            background: 'rgba(0, 0, 0, 0.4)',
            borderRadius: 3,
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress * 100}%`,
              background: 'linear-gradient(90deg, #c99a3a, #e6bc5a)',
              borderRadius: 3,
              boxShadow: '0 0 8px rgba(212, 168, 75, 0.4)'
            }}
          />
        </div>
      </div>
    </div>
  )
}
