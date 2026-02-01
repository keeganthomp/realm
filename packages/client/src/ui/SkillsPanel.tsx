import { useState } from 'react'
import {
  SkillType,
  SKILL_DEFINITIONS,
  getLevelFromXp,
  getLevelProgress,
  getXpForLevel,
  getTotalLevel
} from '@realm/shared'

interface SkillsPanelProps {
  skills: Map<string, number>
}

// Shared panel styles - medieval/fantasy themed
const panelStyle = {
  background: 'linear-gradient(180deg, rgba(45, 42, 38, 0.97) 0%, rgba(32, 30, 27, 0.97) 100%)',
  borderRadius: 8,
  border: '2px solid rgba(90, 80, 65, 0.7)',
  boxShadow: `
    0 4px 24px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    inset 0 -1px 0 rgba(0, 0, 0, 0.3)
  `,
  overflow: 'hidden' as const,
  // Subtle parchment/stone texture
  backgroundImage: `
    radial-gradient(ellipse at 30% 20%, rgba(255, 255, 255, 0.03) 0%, transparent 60%),
    radial-gradient(ellipse at 70% 80%, rgba(0, 0, 0, 0.1) 0%, transparent 60%),
    linear-gradient(180deg, rgba(45, 42, 38, 0.97) 0%, rgba(32, 30, 27, 0.97) 100%)
  `
}

const headerStyle = {
  padding: '12px 14px',
  display: 'flex' as const,
  justifyContent: 'space-between' as const,
  alignItems: 'center' as const,
  borderBottom: '1px solid rgba(212, 168, 75, 0.15)',
  background: 'rgba(0, 0, 0, 0.2)'
}

const labelStyle = {
  fontSize: 11,
  fontWeight: 600 as const,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  color: 'rgba(212, 168, 75, 0.7)'
}

export function SkillsPanel({ skills }: SkillsPanelProps) {
  const [hoveredSkill, setHoveredSkill] = useState<SkillType | null>(null)

  // Convert to record for easier access
  const skillXp: Record<string, number> = {}
  skills.forEach((xp, type) => {
    skillXp[type] = xp
  })

  const totalLevel = getTotalLevel(skillXp as Record<SkillType, number>)

  return (
    <div style={{ ...panelStyle, width: 210 }}>
      {/* Header */}
      <div style={headerStyle}>
        <span style={labelStyle}>Skills</span>
        <span style={{
          color: '#d4a84b',
          fontSize: 12,
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums'
        }}>
          {totalLevel}
        </span>
      </div>

      <div style={{ padding: 10 }}>
        {/* Skill grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 6
            }}
          >
            {Object.values(SkillType).map((skillType) => {
              const def = SKILL_DEFINITIONS[skillType]
              const xp = skillXp[skillType] || 0
              const level = getLevelFromXp(xp)
              const progress = getLevelProgress(xp)
              const isHovered = hoveredSkill === skillType

              return (
                <div
                  key={skillType}
                  onMouseEnter={() => setHoveredSkill(skillType)}
                  onMouseLeave={() => setHoveredSkill(null)}
                  style={{
                    padding: '8px 6px 6px',
                    background: isHovered
                      ? 'rgba(212, 168, 75, 0.15)'
                      : 'rgba(255, 255, 255, 0.03)',
                    borderRadius: 6,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: isHovered
                      ? '1px solid rgba(212, 168, 75, 0.3)'
                      : '1px solid transparent'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 5
                    }}
                  >
                    <span style={{ fontSize: 13, lineHeight: 1 }}>{def.icon}</span>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#ffffff',
                        fontVariantNumeric: 'tabular-nums'
                      }}
                    >
                      {level}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div
                    style={{
                      height: 3,
                      background: 'rgba(0, 0, 0, 0.4)',
                      borderRadius: 2,
                      marginTop: 6,
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${progress * 100}%`,
                        background: 'linear-gradient(90deg, #c99a3a, #e6bc5a)',
                        transition: 'width 0.3s ease',
                        borderRadius: 2
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
                marginTop: 10,
                padding: 10,
                background: 'rgba(0, 0, 0, 0.4)',
                borderRadius: 6,
                border: '1px solid rgba(255, 255, 255, 0.06)'
              }}
            >
              <div
                style={{
                  color: '#d4a84b',
                  fontWeight: 600,
                  fontSize: 12,
                  marginBottom: 4
                }}
              >
                {SKILL_DEFINITIONS[hoveredSkill].name}
              </div>
              <div style={{
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: 11,
                marginBottom: 6,
                lineHeight: 1.4
              }}>
                {SKILL_DEFINITIONS[hoveredSkill].description}
              </div>
              <div style={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: 11,
                fontVariantNumeric: 'tabular-nums'
              }}>
                {(skillXp[hoveredSkill] || 0).toLocaleString()} / {' '}
                {getXpForLevel(getLevelFromXp(skillXp[hoveredSkill] || 0) + 1).toLocaleString()} XP
              </div>
            </div>
          )}
      </div>
    </div>
  )
}

// Export panel style for consistency
export { panelStyle, headerStyle, labelStyle }
