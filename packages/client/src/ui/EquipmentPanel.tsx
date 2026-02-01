import { useCallback } from 'react'
import { EquipmentSlot, ITEM_DEFINITIONS, ItemType } from '@realm/shared'
import { getItemIcon } from './InventoryPanel'

interface EquipmentPanelProps {
  equipment: Record<string, string | null>
  bonuses: { attackBonus: number; strengthBonus: number; defenceBonus: number }
  onUnequipItem: (slot: string) => void
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

const SLOT_LABELS: Record<EquipmentSlot, string> = {
  [EquipmentSlot.HEAD]: 'Head',
  [EquipmentSlot.BODY]: 'Body',
  [EquipmentSlot.LEGS]: 'Legs',
  [EquipmentSlot.FEET]: 'Feet',
  [EquipmentSlot.HANDS]: 'Hands',
  [EquipmentSlot.WEAPON]: 'Weapon',
  [EquipmentSlot.OFFHAND]: 'Shield'
}

const SLOT_ICONS: Record<EquipmentSlot, string> = {
  [EquipmentSlot.HEAD]: '👤',
  [EquipmentSlot.BODY]: '👕',
  [EquipmentSlot.LEGS]: '👖',
  [EquipmentSlot.FEET]: '👟',
  [EquipmentSlot.HANDS]: '🧤',
  [EquipmentSlot.WEAPON]: '🗡️',
  [EquipmentSlot.OFFHAND]: '🛡️'
}

interface EquipmentSlotProps {
  slot: EquipmentSlot
  itemType: string | null
  onClick: () => void
}

function EquipmentSlotDisplay({ slot, itemType, onClick }: EquipmentSlotProps) {
  const itemDef = itemType ? ITEM_DEFINITIONS[itemType as ItemType] : null
  const hasItem = !!itemType

  return (
    <div
      onClick={hasItem ? onClick : undefined}
      title={itemDef?.name || SLOT_LABELS[slot]}
      style={{
        width: 44,
        height: 44,
        background: hasItem ? 'rgba(212, 168, 75, 0.2)' : 'rgba(0, 0, 0, 0.3)',
        borderRadius: 6,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        border: hasItem ? '2px solid rgba(212, 168, 75, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
        cursor: hasItem ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
        position: 'relative'
      }}
    >
      <span style={{ fontSize: 20, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}>
        {hasItem ? getItemIcon(itemType!) : SLOT_ICONS[slot]}
      </span>
      {!hasItem && (
        <span
          style={{
            position: 'absolute',
            bottom: 2,
            fontSize: 8,
            color: 'rgba(255, 255, 255, 0.3)',
            textTransform: 'uppercase'
          }}
        >
          {SLOT_LABELS[slot].slice(0, 4)}
        </span>
      )}
    </div>
  )
}

export function EquipmentPanel({ equipment, bonuses, onUnequipItem }: EquipmentPanelProps) {
  const handleSlotClick = useCallback(
    (slot: EquipmentSlot) => {
      if (equipment[slot]) {
        onUnequipItem(slot)
      }
    },
    [equipment, onUnequipItem]
  )

  return (
    <div style={{ ...panelStyle, width: 210 }}>
      {/* Header */}
      <div style={headerStyle}>
        <span style={labelStyle}>Equipment</span>
      </div>

      <div style={{ padding: 12 }}>
        {/* Equipment layout - character silhouette style */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6
          }}
        >
          {/* Head */}
          <EquipmentSlotDisplay
            slot={EquipmentSlot.HEAD}
            itemType={equipment[EquipmentSlot.HEAD]}
            onClick={() => handleSlotClick(EquipmentSlot.HEAD)}
          />

          {/* Weapon, Body, Shield row */}
          <div style={{ display: 'flex', gap: 6 }}>
            <EquipmentSlotDisplay
              slot={EquipmentSlot.WEAPON}
              itemType={equipment[EquipmentSlot.WEAPON]}
              onClick={() => handleSlotClick(EquipmentSlot.WEAPON)}
            />
            <EquipmentSlotDisplay
              slot={EquipmentSlot.BODY}
              itemType={equipment[EquipmentSlot.BODY]}
              onClick={() => handleSlotClick(EquipmentSlot.BODY)}
            />
            <EquipmentSlotDisplay
              slot={EquipmentSlot.OFFHAND}
              itemType={equipment[EquipmentSlot.OFFHAND]}
              onClick={() => handleSlotClick(EquipmentSlot.OFFHAND)}
            />
          </div>

          {/* Hands, Legs row */}
          <div style={{ display: 'flex', gap: 6 }}>
            <EquipmentSlotDisplay
              slot={EquipmentSlot.HANDS}
              itemType={equipment[EquipmentSlot.HANDS]}
              onClick={() => handleSlotClick(EquipmentSlot.HANDS)}
            />
            <EquipmentSlotDisplay
              slot={EquipmentSlot.LEGS}
              itemType={equipment[EquipmentSlot.LEGS]}
              onClick={() => handleSlotClick(EquipmentSlot.LEGS)}
            />
          </div>

          {/* Feet */}
          <EquipmentSlotDisplay
            slot={EquipmentSlot.FEET}
            itemType={equipment[EquipmentSlot.FEET]}
            onClick={() => handleSlotClick(EquipmentSlot.FEET)}
          />
        </div>

        {/* Stats display */}
        <div
          style={{
            marginTop: 12,
            padding: '10px 12px',
            background: 'rgba(0, 0, 0, 0.25)',
            borderRadius: 6,
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}
        >
          <div style={{ fontSize: 10, color: 'rgba(212, 168, 75, 0.6)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Bonuses
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <BonusStat label="Attack" value={bonuses.attackBonus} color="#f87171" />
            <BonusStat label="Strength" value={bonuses.strengthBonus} color="#fbbf24" />
            <BonusStat label="Defence" value={bonuses.defenceBonus} color="#60a5fa" />
          </div>
        </div>

        {/* Hint */}
        <div
          style={{
            marginTop: 8,
            fontSize: 10,
            color: 'rgba(255, 255, 255, 0.4)',
            textAlign: 'center'
          }}
        >
          Click equipped item to unequip
        </div>
      </div>
    </div>
  )
}

function BonusStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.6)' }}>{label}</span>
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: value > 0 ? color : 'rgba(255, 255, 255, 0.3)',
          fontVariantNumeric: 'tabular-nums'
        }}
      >
        {value > 0 ? `+${value}` : value}
      </span>
    </div>
  )
}
