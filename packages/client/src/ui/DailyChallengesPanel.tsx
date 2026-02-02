import { useState, useEffect } from 'react'
import {
  DailyChallengesData,
  ChallengeDefinition,
  formatTimeRemaining,
  SKILL_DEFINITIONS,
  SkillType
} from '@realm/shared'

interface DailyChallengesPanelProps {
  challenges: DailyChallengesData | null
  onClaimReward: (challengeIndex: number) => void
}

function ChallengeCard({
  definition,
  progress,
  completed,
  claimed,
  onClaim
}: {
  definition: ChallengeDefinition
  progress: number
  completed: boolean
  claimed: boolean
  onClaim: () => void
}) {
  const progressPercent = Math.min((progress / definition.targetCount) * 100, 100)

  // Get reward display
  let rewardText = ''
  if (definition.rewardXp && definition.rewardSkill) {
    const skillDef = SKILL_DEFINITIONS[definition.rewardSkill as SkillType]
    rewardText = `+${definition.rewardXp} ${skillDef?.name || definition.rewardSkill} XP`
  } else if (definition.rewardCoins) {
    rewardText = `+${definition.rewardCoins} coins`
  }

  return (
    <div
      style={{
        background: claimed
          ? 'rgba(40, 60, 40, 0.5)'
          : completed
            ? 'rgba(40, 80, 40, 0.6)'
            : 'rgba(0, 0, 0, 0.4)',
        border: `1px solid ${claimed ? 'rgba(100, 150, 100, 0.4)' : completed ? 'rgba(100, 200, 100, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
        borderRadius: 6,
        padding: 12,
        marginBottom: 8
      }}
    >
      {/* Challenge name */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6
        }}
      >
        <span
          style={{
            color: claimed ? 'rgba(150, 200, 150, 0.7)' : '#d4a84b',
            fontWeight: 600,
            fontSize: 13
          }}
        >
          {definition.name}
        </span>
        {claimed && (
          <span style={{ color: '#4caf50', fontSize: 11 }}>Claimed</span>
        )}
      </div>

      {/* Description */}
      <div
        style={{
          color: claimed ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.7)',
          fontSize: 11,
          marginBottom: 8
        }}
      >
        {definition.description}
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 6,
          background: 'rgba(0, 0, 0, 0.5)',
          borderRadius: 3,
          overflow: 'hidden',
          marginBottom: 6
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progressPercent}%`,
            background: claimed
              ? 'rgba(100, 150, 100, 0.5)'
              : completed
                ? 'linear-gradient(90deg, #2d7d32, #4caf50)'
                : 'linear-gradient(90deg, #1565c0, #2196f3)',
            borderRadius: 3,
            transition: 'width 0.3s ease'
          }}
        />
      </div>

      {/* Progress text and reward */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 11
        }}
      >
        <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
          {progress} / {definition.targetCount}
        </span>
        <span style={{ color: claimed ? 'rgba(150, 200, 150, 0.6)' : '#d4a84b' }}>
          {rewardText}
        </span>
      </div>

      {/* Claim button */}
      {completed && !claimed && (
        <button
          onClick={onClaim}
          style={{
            width: '100%',
            marginTop: 8,
            padding: '6px 12px',
            background: 'linear-gradient(180deg, #4caf50, #2d7d32)',
            border: '1px solid rgba(100, 200, 100, 0.5)',
            borderRadius: 4,
            color: '#fff',
            fontWeight: 600,
            fontSize: 12,
            cursor: 'pointer'
          }}
        >
          Claim Reward
        </button>
      )}
    </div>
  )
}

export function DailyChallengesPanel({ challenges, onClaimReward }: DailyChallengesPanelProps) {
  const [timeUntilReset, setTimeUntilReset] = useState(challenges?.timeUntilReset || 0)

  // Update countdown timer
  useEffect(() => {
    if (!challenges) return

    setTimeUntilReset(challenges.timeUntilReset)

    const interval = setInterval(() => {
      setTimeUntilReset((prev) => Math.max(0, prev - 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [challenges])

  if (!challenges) {
    return (
      <div
        style={{
          background: 'rgba(0, 0, 0, 0.75)',
          border: '2px solid rgba(212, 168, 75, 0.5)',
          borderRadius: 8,
          padding: 16,
          width: 260
        }}
      >
        <div style={{ color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center' }}>
          Loading challenges...
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        background: 'rgba(0, 0, 0, 0.75)',
        border: '2px solid rgba(212, 168, 75, 0.5)',
        borderRadius: 8,
        padding: 16,
        width: 260
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
          Daily Challenges
        </span>
        <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 11 }}>
          Resets in {formatTimeRemaining(timeUntilReset)}
        </span>
      </div>

      {/* Challenge cards */}
      {challenges.challenges.map((challenge, index) => (
        <ChallengeCard
          key={index}
          definition={challenge.definition}
          progress={challenge.progress}
          completed={challenge.completed}
          claimed={challenge.claimed}
          onClaim={() => onClaimReward(index)}
        />
      ))}
    </div>
  )
}
