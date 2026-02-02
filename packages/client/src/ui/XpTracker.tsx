import { useState, useEffect, useRef, useMemo } from 'react'
import {
  SkillType,
  SKILL_DEFINITIONS,
  getLevelFromXp,
  getXpToNextLevel,
  getLevelProgress
} from '@realm/shared'

interface XpTrackerProps {
  skills: Map<string, number>
}

interface XpGainEntry {
  xp: number
  timestamp: number
}

const XP_TRACKER_IDLE_TIMEOUT = 60000 // 60 seconds before auto-hide
const XP_RATE_WINDOW = 60000 // Use last 60 seconds for XP/hr calculation

export function XpTracker({ skills }: XpTrackerProps) {
  const [trackedSkill, setTrackedSkill] = useState<SkillType | null>(null)
  const [sessionXp, setSessionXp] = useState(0)
  const [xpHistory, setXpHistory] = useState<XpGainEntry[]>([])
  const [isVisible, setIsVisible] = useState(false)

  const prevSkillsRef = useRef<Map<string, number>>(new Map())
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Detect XP gains and update tracking
  useEffect(() => {
    const prevSkills = prevSkillsRef.current

    // Find skill with XP gain
    for (const [skillType, xp] of skills.entries()) {
      const prevXp = prevSkills.get(skillType) || 0
      if (xp > prevXp) {
        const xpGained = xp - prevXp

        // If this is a different skill than we were tracking, switch to it
        if (trackedSkill !== skillType) {
          setTrackedSkill(skillType as SkillType)
          setSessionXp(xpGained)
          setXpHistory([{ xp: xpGained, timestamp: Date.now() }])
        } else {
          // Same skill - accumulate
          setSessionXp((prev) => prev + xpGained)
          setXpHistory((prev) => [...prev, { xp: xpGained, timestamp: Date.now() }])
        }

        // Show tracker and reset idle timer
        setIsVisible(true)

        // Clear existing hide timeout
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current)
        }

        // Set new hide timeout
        hideTimeoutRef.current = setTimeout(() => {
          setIsVisible(false)
        }, XP_TRACKER_IDLE_TIMEOUT)

        break // Only track one skill gain per update
      }
    }

    // Update previous skills reference
    prevSkillsRef.current = new Map(skills)
  }, [skills, trackedSkill])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
    }
  }, [])

  // Clean up old XP history entries (older than window)
  useEffect(() => {
    const interval = setInterval(() => {
      const cutoff = Date.now() - XP_RATE_WINDOW
      setXpHistory((prev) => prev.filter((entry) => entry.timestamp > cutoff))
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  // Calculate XP per hour from recent history
  const xpPerHour = useMemo(() => {
    if (xpHistory.length === 0) return 0

    const now = Date.now()
    const cutoff = now - XP_RATE_WINDOW
    const recentEntries = xpHistory.filter((entry) => entry.timestamp > cutoff)

    if (recentEntries.length === 0) return 0

    const totalRecentXp = recentEntries.reduce((sum, entry) => sum + entry.xp, 0)
    const oldestEntry = recentEntries[0]
    const timeSpanMs = now - oldestEntry.timestamp

    // If we only have recent data, extrapolate to hourly rate
    if (timeSpanMs < 1000) return 0 // Avoid division by tiny numbers

    return Math.round((totalRecentXp / timeSpanMs) * 3600000)
  }, [xpHistory])

  // Get current skill info
  const currentXp = trackedSkill ? skills.get(trackedSkill) || 0 : 0
  const currentLevel = getLevelFromXp(currentXp)
  const xpToNextLevel = getXpToNextLevel(currentXp)
  const levelProgress = getLevelProgress(currentXp)
  const skillDef = trackedSkill ? SKILL_DEFINITIONS[trackedSkill] : null

  // Calculate time to level
  const timeToLevel = useMemo(() => {
    if (xpPerHour === 0 || xpToNextLevel === 0) return null
    const hoursToLevel = xpToNextLevel / xpPerHour
    const minutes = Math.round(hoursToLevel * 60)

    if (minutes < 1) return '< 1m'
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }, [xpPerHour, xpToNextLevel])

  if (!isVisible || !trackedSkill || !skillDef) {
    return null
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 70, // Below PlayerList
        left: 16,
        background: 'rgba(0, 0, 0, 0.75)',
        border: '2px solid rgba(212, 168, 75, 0.5)',
        borderRadius: 8,
        padding: '12px 16px',
        minWidth: 180,
        pointerEvents: 'auto',
        animation: 'fadeInSlide 0.2s ease-out'
      }}
    >
      {/* Skill header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 10,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          paddingBottom: 8
        }}
      >
        <span style={{ fontSize: 18 }}>{skillDef.icon}</span>
        <span
          style={{
            color: '#d4a84b',
            fontSize: 14,
            fontWeight: 600
          }}
        >
          {skillDef.name}
        </span>
        <span
          style={{
            marginLeft: 'auto',
            color: '#fff',
            fontSize: 14,
            fontWeight: 500
          }}
        >
          Lvl {currentLevel}
        </span>
      </div>

      {/* XP Progress bar */}
      <div style={{ marginBottom: 10 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 11,
            color: 'rgba(255, 255, 255, 0.7)',
            marginBottom: 4
          }}
        >
          <span>Level {currentLevel + 1}</span>
          <span>{xpToNextLevel.toLocaleString()} XP to go</span>
        </div>
        <div
          style={{
            height: 6,
            background: 'rgba(0, 0, 0, 0.5)',
            borderRadius: 3,
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${levelProgress * 100}%`,
              background: 'linear-gradient(90deg, #2d7d32, #4caf50)',
              borderRadius: 3,
              transition: 'width 0.3s ease'
            }}
          />
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 12
          }}
        >
          <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Session XP:</span>
          <span style={{ color: '#4caf50', fontWeight: 500 }}>
            +{sessionXp.toLocaleString()}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 12
          }}
        >
          <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>XP/hour:</span>
          <span style={{ color: '#2196f3', fontWeight: 500 }}>
            {xpPerHour.toLocaleString()}
          </span>
        </div>

        {timeToLevel && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12
            }}
          >
            <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Time to level:</span>
            <span style={{ color: '#ff9800', fontWeight: 500 }}>{timeToLevel}</span>
          </div>
        )}
      </div>

      {/* Inline keyframe animation */}
      <style>{`
        @keyframes fadeInSlide {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  )
}
