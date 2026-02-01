import { useState } from 'react'
import {
  SkillType,
  SKILL_DEFINITIONS,
  SKILL_CATEGORIES,
  getLevelFromXp,
  getLevelProgress,
  getXpForLevel,
  getTotalLevel
} from '@realm/shared'

interface SkillsPanelProps {
  skills: Map<string, number>
}

export function SkillsPanel({ skills }: SkillsPanelProps) {
  const [expanded, setExpanded] = useState(true)
  const [hoveredSkill, setHoveredSkill] = useState<SkillType | null>(null)

  // Convert to record for easier access
  const skillXp: Record<string, number> = {}
  skills.forEach((xp, type) => {
    skillXp[type] = xp
  })

  const totalLevel = getTotalLevel(skillXp as Record<SkillType, number>)

  return (
    <div
      style={{
        width: 200,
        background: 'rgba(0, 0, 0, 0.7)',
        borderRadius: 4,
        overflow: 'hidden',
        transition: 'all 0.2s ease'
      }}
    >
      {/* Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '10px 16px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: expanded ? '1px solid rgba(255,255,255,0.1)' : 'none'
        }}
      >
        <span
          style={{
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: '#a3a3a3'
          }}
        >
          Skills
        </span>
        <span style={{ color: '#b8860b', fontSize: 12, fontWeight: 500 }}>Total: {totalLevel}</span>
      </div>

      {expanded && (
        <div style={{ padding: 8 }}>
          {/* Skill grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 4
            }}
          >
            {Object.values(SkillType).map((skillType) => {
              const def = SKILL_DEFINITIONS[skillType]
              const xp = skillXp[skillType] || 0
              const level = getLevelFromXp(xp)
              const progress = getLevelProgress(xp)

              return (
                <div
                  key={skillType}
                  onMouseEnter={() => setHoveredSkill(skillType)}
                  onMouseLeave={() => setHoveredSkill(null)}
                  style={{
                    padding: '6px 4px',
                    background:
                      hoveredSkill === skillType
                        ? 'rgba(184, 134, 11, 0.2)'
                        : 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 4,
                    cursor: 'pointer',
                    transition: 'background 0.15s ease'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4
                    }}
                  >
                    <span style={{ fontSize: 12 }}>{def.icon}</span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: '#ffffff'
                      }}
                    >
                      {level}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div
                    style={{
                      height: 2,
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: 1,
                      marginTop: 4,
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${progress * 100}%`,
                        background: '#b8860b',
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Tooltip */}
          {hoveredSkill && (
            <div
              style={{
                marginTop: 8,
                padding: 8,
                background: 'rgba(0, 0, 0, 0.5)',
                borderRadius: 4,
                fontSize: 12
              }}
            >
              <div
                style={{
                  color: '#b8860b',
                  fontWeight: 500,
                  marginBottom: 4
                }}
              >
                {SKILL_DEFINITIONS[hoveredSkill].name}
              </div>
              <div style={{ color: '#a3a3a3', marginBottom: 4 }}>
                {SKILL_DEFINITIONS[hoveredSkill].description}
              </div>
              <div style={{ color: '#ffffff' }}>
                XP: {(skillXp[hoveredSkill] || 0).toLocaleString()} /{' '}
                {getXpForLevel(getLevelFromXp(skillXp[hoveredSkill] || 0) + 1).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
