import { useEffect, useState, useRef } from 'react'

interface ActionProgressProps {
  duration: number
  action: string
}

export function ActionProgress({ duration, action }: ActionProgressProps) {
  const [progress, setProgress] = useState(0)
  const startTimeRef = useRef(performance.now())
  const rafRef = useRef<number>(0)

  useEffect(() => {
    startTimeRef.current = performance.now()

    const animate = () => {
      const elapsed = performance.now() - startTimeRef.current
      const newProgress = Math.min(elapsed / duration, 1)
      setProgress(newProgress)

      if (newProgress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [duration])

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 100,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 200,
        pointerEvents: 'none',
        opacity: 1,
        transition: 'opacity 0.15s ease-out'
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
            borderRadius: 3
          }}
        />
      </div>
    </div>
  )
}
