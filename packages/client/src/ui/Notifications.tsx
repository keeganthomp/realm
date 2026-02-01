import { useEffect, useState, useRef, useCallback } from 'react'
import { SKILL_DEFINITIONS, SkillType } from '@realm/shared'

interface Notification {
  id: number
  type: 'levelUp' | 'xp' | 'item' | 'error'
  message: string
  icon?: string
}

interface NotificationsProps {
  notifications: Notification[]
}

export function Notifications({ notifications }: NotificationsProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        pointerEvents: 'none'
      }}
    >
      {notifications.map((notif) => (
        <NotificationItem key={notif.id} notification={notif} />
      ))}
    </div>
  )
}

function NotificationItem({ notification }: { notification: Notification }) {
  const [opacity, setOpacity] = useState(0)
  const [translateY, setTranslateY] = useState(20)

  useEffect(() => {
    requestAnimationFrame(() => {
      setOpacity(1)
      setTranslateY(0)
    })

    const timeout = setTimeout(() => {
      setOpacity(0)
      setTranslateY(-20)
    }, 2500)

    return () => clearTimeout(timeout)
  }, [])

  const isLevelUp = notification.type === 'levelUp'

  return (
    <div
      style={{
        padding: isLevelUp ? '12px 24px' : '8px 16px',
        background: isLevelUp
          ? 'linear-gradient(135deg, rgba(184, 134, 11, 0.9), rgba(218, 165, 32, 0.9))'
          : notification.type === 'error'
            ? 'rgba(220, 38, 38, 0.8)'
            : 'rgba(0, 0, 0, 0.8)',
        borderRadius: 8,
        color: '#ffffff',
        fontSize: isLevelUp ? 16 : 13,
        fontWeight: isLevelUp ? 600 : 400,
        textAlign: 'center',
        opacity,
        transform: `translateY(${translateY}px)`,
        transition: 'all 0.3s ease',
        boxShadow: isLevelUp ? '0 4px 20px rgba(184, 134, 11, 0.4)' : 'none'
      }}
    >
      {notification.icon && <span style={{ marginRight: 8 }}>{notification.icon}</span>}
      {notification.message}
    </div>
  )
}

// Hook to manage notifications
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const nextIdRef = useRef(0)

  const addNotification = useCallback(
    (type: Notification['type'], message: string, icon?: string) => {
      const id = nextIdRef.current++
      setNotifications((prev) => [...prev, { id, type, message, icon }])

      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id))
      }, 3000)
    },
    []
  )

  const showLevelUp = useCallback(
    (skill: string, newLevel: number) => {
      const def = SKILL_DEFINITIONS[skill as SkillType]
      addNotification('levelUp', `Level Up! ${def?.name || skill} is now ${newLevel}`, def?.icon)
    },
    [addNotification]
  )

  const showXpGain = useCallback(
    (skill: string, xp: number) => {
      const def = SKILL_DEFINITIONS[skill as SkillType]
      addNotification('xp', `+${xp} ${def?.name || skill} XP`, def?.icon)
    },
    [addNotification]
  )

  const showItemGain = useCallback(
    (item: string) => {
      addNotification('item', `Obtained: ${item}`)
    },
    [addNotification]
  )

  const showError = useCallback(
    (message: string) => {
      addNotification('error', message)
    },
    [addNotification]
  )

  return {
    notifications,
    showLevelUp,
    showXpGain,
    showItemGain,
    showError
  }
}
