import { useState, useCallback, ReactNode } from 'react'

export type PanelType = 'skills' | 'inventory' | null

interface SidebarProps {
  activePanel: PanelType
  onPanelChange: (panel: PanelType) => void
  children?: ReactNode
}

interface SidebarButtonProps {
  icon: ReactNode
  label: string
  isActive: boolean
  onClick: () => void
}

// Floating sidebar button with tooltip
function SidebarButton({ icon, label, isActive, onClick }: SidebarButtonProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          width: 40,
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isActive
            ? 'rgba(212, 168, 75, 0.25)'
            : isHovered
              ? 'rgba(0, 0, 0, 0.6)'
              : 'rgba(0, 0, 0, 0.5)',
          border: isActive
            ? '2px solid rgba(212, 168, 75, 0.8)'
            : '2px solid rgba(255, 255, 255, 0.15)',
          borderRadius: 6,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: isActive
            ? '0 0 10px rgba(212, 168, 75, 0.3)'
            : '0 2px 8px rgba(0, 0, 0, 0.4)'
        }}
      >
        <span
          style={{
            opacity: isActive ? 1 : isHovered ? 0.9 : 0.7,
            transition: 'opacity 0.15s ease'
          }}
        >
          {icon}
        </span>
      </button>

      {/* Tooltip on hover */}
      {isHovered && (
        <div
          style={{
            position: 'absolute',
            right: '100%',
            top: '50%',
            transform: 'translateY(-50%)',
            marginRight: 8,
            padding: '6px 10px',
            background: 'rgba(0, 0, 0, 0.85)',
            color: '#d4a84b',
            fontSize: 12,
            fontWeight: 500,
            borderRadius: 4,
            whiteSpace: 'nowrap',
            pointerEvents: 'none'
          }}
        >
          {label}
        </div>
      )}
    </div>
  )
}

// SVG Icons for a cleaner look
const SkillsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#d4a84b' }}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
)

const InventoryIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#d4a84b' }}>
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
)

export function Sidebar({ activePanel, onPanelChange, children }: SidebarProps) {
  const handleButtonClick = useCallback(
    (panel: 'skills' | 'inventory') => {
      // Toggle: if clicking the active panel, close it; otherwise open the new one
      onPanelChange(activePanel === panel ? null : panel)
    },
    [activePanel, onPanelChange]
  )

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        display: 'flex',
        flexDirection: 'row',
        gap: 8,
        pointerEvents: 'auto'
      }}
    >
      {/* Panel content area */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          // Animate panel appearance
          opacity: activePanel ? 1 : 0,
          transform: activePanel ? 'translateX(0)' : 'translateX(20px)',
          transition: 'opacity 0.2s ease, transform 0.2s ease',
          pointerEvents: activePanel ? 'auto' : 'none'
        }}
      >
        {children}
      </div>

      {/* Sidebar buttons - floating squares */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8
        }}
      >
        <SidebarButton
          icon={<SkillsIcon />}
          label="Skills"
          isActive={activePanel === 'skills'}
          onClick={() => handleButtonClick('skills')}
        />
        <SidebarButton
          icon={<InventoryIcon />}
          label="Inventory"
          isActive={activePanel === 'inventory'}
          onClick={() => handleButtonClick('inventory')}
        />
      </div>
    </div>
  )
}
