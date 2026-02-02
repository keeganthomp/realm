import { useState } from 'react'
import {
  AchievementType,
  ACHIEVEMENT_DEFINITIONS,
  ACHIEVEMENT_CATEGORIES,
  getTotalAchievementPoints
} from '@realm/shared'

interface AchievementsPanelProps {
  earnedAchievements: AchievementType[]
  playerStats: Record<string, number>
  cosmetics: { activeTitle: string | null; activeBadge: string | null }
  onSetTitle: (title: string | null) => void
  onSetBadge: (badge: string | null) => void
}

type CategoryKey = keyof typeof ACHIEVEMENT_CATEGORIES

const CATEGORY_NAMES: Record<CategoryKey, string> = {
  combat: 'Combat',
  gathering: 'Gathering',
  production: 'Production',
  milestones: 'Milestones'
}

function AchievementCard({
  achievementType,
  isEarned,
  progress,
  target,
  isActiveTitle,
  isActiveBadge,
  onSetTitle,
  onSetBadge
}: {
  achievementType: AchievementType
  isEarned: boolean
  progress: number
  target: number
  isActiveTitle: boolean
  isActiveBadge: boolean
  onSetTitle?: () => void
  onSetBadge?: () => void
}) {
  const def = ACHIEVEMENT_DEFINITIONS[achievementType]
  const progressPercent = Math.min((progress / target) * 100, 100)

  return (
    <div
      style={{
        background: isEarned ? 'rgba(40, 80, 40, 0.4)' : 'rgba(0, 0, 0, 0.3)',
        border: `1px solid ${isEarned ? 'rgba(100, 200, 100, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
        borderRadius: 6,
        padding: 10,
        marginBottom: 6,
        opacity: isEarned ? 1 : 0.7
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 18 }}>{def.icon}</span>
        <div style={{ flex: 1 }}>
          <div
            style={{
              color: isEarned ? '#4caf50' : '#d4a84b',
              fontWeight: 600,
              fontSize: 12
            }}
          >
            {def.name}
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 10 }}>
            {def.description}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#d4a84b', fontSize: 11, fontWeight: 500 }}>
            {def.points} pts
          </div>
        </div>
      </div>

      {/* Progress bar for unearned achievements */}
      {!isEarned && target > 0 && (
        <div style={{ marginTop: 6 }}>
          <div
            style={{
              height: 4,
              background: 'rgba(0, 0, 0, 0.5)',
              borderRadius: 2,
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progressPercent}%`,
                background: 'linear-gradient(90deg, #1565c0, #2196f3)',
                borderRadius: 2
              }}
            />
          </div>
          <div
            style={{
              fontSize: 9,
              color: 'rgba(255, 255, 255, 0.5)',
              marginTop: 2,
              textAlign: 'right'
            }}
          >
            {progress} / {target}
          </div>
        </div>
      )}

      {/* Rewards for earned achievements */}
      {isEarned && (def.title || def.chatBadge) && (
        <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
          {def.title && (
            <button
              onClick={onSetTitle}
              style={{
                padding: '3px 8px',
                background: isActiveTitle
                  ? 'linear-gradient(180deg, #4caf50, #2d7d32)'
                  : 'rgba(0, 0, 0, 0.4)',
                border: `1px solid ${isActiveTitle ? 'rgba(100, 200, 100, 0.5)' : 'rgba(255, 255, 255, 0.2)'}`,
                borderRadius: 3,
                color: isActiveTitle ? '#fff' : 'rgba(255, 255, 255, 0.7)',
                fontSize: 10,
                cursor: 'pointer'
              }}
            >
              {isActiveTitle ? 'Title Active' : `Use "${def.title}"`}
            </button>
          )}
          {def.chatBadge && (
            <button
              onClick={onSetBadge}
              style={{
                padding: '3px 8px',
                background: isActiveBadge
                  ? 'linear-gradient(180deg, #4caf50, #2d7d32)'
                  : 'rgba(0, 0, 0, 0.4)',
                border: `1px solid ${isActiveBadge ? 'rgba(100, 200, 100, 0.5)' : 'rgba(255, 255, 255, 0.2)'}`,
                borderRadius: 3,
                color: isActiveBadge ? '#fff' : 'rgba(255, 255, 255, 0.7)',
                fontSize: 10,
                cursor: 'pointer'
              }}
            >
              {isActiveBadge ? 'Badge Active' : `Use ${def.chatBadge}`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function AchievementsPanel({
  earnedAchievements,
  playerStats,
  cosmetics,
  onSetTitle,
  onSetBadge
}: AchievementsPanelProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('combat')

  const earnedSet = new Set(earnedAchievements)
  const totalPoints = getTotalAchievementPoints(earnedAchievements)
  const totalAchievements = Object.keys(ACHIEVEMENT_DEFINITIONS).length
  const earnedCount = earnedAchievements.length

  const categoryAchievements = ACHIEVEMENT_CATEGORIES[activeCategory]

  return (
    <div
      style={{
        background: 'rgba(0, 0, 0, 0.75)',
        border: '2px solid rgba(212, 168, 75, 0.5)',
        borderRadius: 8,
        padding: 16,
        width: 280
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          paddingBottom: 8
        }}
      >
        <span style={{ color: '#d4a84b', fontWeight: 600, fontSize: 14 }}>
          Achievements
        </span>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#4caf50', fontSize: 12, fontWeight: 500 }}>
            {totalPoints} pts
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 10 }}>
            {earnedCount} / {totalAchievements}
          </div>
        </div>
      </div>

      {/* Active cosmetics */}
      {(cosmetics.activeTitle || cosmetics.activeBadge) && (
        <div
          style={{
            background: 'rgba(40, 60, 80, 0.4)',
            border: '1px solid rgba(100, 150, 200, 0.3)',
            borderRadius: 4,
            padding: 8,
            marginBottom: 12,
            fontSize: 11
          }}
        >
          <div style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: 4 }}>
            Active:
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {cosmetics.activeTitle && (
              <span style={{ color: '#d4a84b' }}>
                &quot;{cosmetics.activeTitle}&quot;
                <button
                  onClick={() => onSetTitle(null)}
                  style={{
                    marginLeft: 4,
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255, 100, 100, 0.8)',
                    cursor: 'pointer',
                    fontSize: 10
                  }}
                >
                  x
                </button>
              </span>
            )}
            {cosmetics.activeBadge && (
              <span>
                {cosmetics.activeBadge}
                <button
                  onClick={() => onSetBadge(null)}
                  style={{
                    marginLeft: 2,
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255, 100, 100, 0.8)',
                    cursor: 'pointer',
                    fontSize: 10
                  }}
                >
                  x
                </button>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Category tabs */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          marginBottom: 12,
          flexWrap: 'wrap'
        }}
      >
        {(Object.keys(ACHIEVEMENT_CATEGORIES) as CategoryKey[]).map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            style={{
              padding: '4px 8px',
              background:
                activeCategory === category
                  ? 'rgba(212, 168, 75, 0.25)'
                  : 'rgba(0, 0, 0, 0.4)',
              border: `1px solid ${activeCategory === category ? 'rgba(212, 168, 75, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
              borderRadius: 4,
              color: activeCategory === category ? '#d4a84b' : 'rgba(255, 255, 255, 0.6)',
              fontSize: 10,
              cursor: 'pointer'
            }}
          >
            {CATEGORY_NAMES[category]}
          </button>
        ))}
      </div>

      {/* Achievement list */}
      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
        {categoryAchievements.map((achievementType) => {
          const def = ACHIEVEMENT_DEFINITIONS[achievementType]
          const isEarned = earnedSet.has(achievementType)
          const progress = def.statType ? (playerStats[def.statType] || 0) : 0
          const target = def.statTarget || 0
          const isActiveTitle = cosmetics.activeTitle === def.title
          const isActiveBadge = cosmetics.activeBadge === def.chatBadge

          return (
            <AchievementCard
              key={achievementType}
              achievementType={achievementType}
              isEarned={isEarned}
              progress={progress}
              target={target}
              isActiveTitle={isActiveTitle}
              isActiveBadge={isActiveBadge}
              onSetTitle={
                def.title
                  ? () => onSetTitle(isActiveTitle ? null : def.title!)
                  : undefined
              }
              onSetBadge={
                def.chatBadge
                  ? () => onSetBadge(isActiveBadge ? null : def.chatBadge!)
                  : undefined
              }
            />
          )
        })}
      </div>
    </div>
  )
}
