import { useState, useEffect } from 'react'

interface LoadingScreenProps {
  status: string
}

export function LoadingScreen({ status }: LoadingScreenProps) {
  const [dots, setDots] = useState('')

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'))
    }, 400)
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: '#1a1a2e',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        fontFamily: 'Inter, sans-serif'
      }}
    >
      {/* Logo/Title */}
      <h1
        style={{
          fontSize: 48,
          fontWeight: 600,
          letterSpacing: '-0.02em',
          color: '#ffffff',
          margin: 0,
          marginBottom: 48
        }}
      >
        REALM
      </h1>

      {/* Loading spinner */}
      <div
        style={{
          width: 32,
          height: 32,
          border: '2px solid rgba(255, 255, 255, 0.1)',
          borderTopColor: '#B8860B',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: 24
        }}
      />

      {/* Status text */}
      <p
        style={{
          fontSize: 14,
          color: '#A3A3A3',
          letterSpacing: '0.05em',
          margin: 0,
          minWidth: 200,
          textAlign: 'center'
        }}
      >
        {status}
        {dots}
      </p>

      {/* CSS animation */}
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  )
}
