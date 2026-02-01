import { useState } from 'react'
import { ItemType, ITEM_DEFINITIONS } from '@realm/shared'

interface InventoryPanelProps {
  items: Array<{ itemType: string; quantity: number }>
}

const MAX_SLOTS = 28

export function InventoryPanel({ items }: InventoryPanelProps) {
  const [expanded, setExpanded] = useState(true)

  // Create 28 slots, filling with items
  const slots: Array<{ itemType: string; quantity: number } | null> = []
  for (let i = 0; i < MAX_SLOTS; i++) {
    slots.push(items[i] || null)
  }

  const usedSlots = items.length

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
          Inventory
        </span>
        <span
          style={{
            color: usedSlots >= MAX_SLOTS ? '#ff6b6b' : '#b8860b',
            fontSize: 12,
            fontWeight: 500
          }}
        >
          {usedSlots}/{MAX_SLOTS}
        </span>
      </div>

      {expanded && (
        <div style={{ padding: 8 }}>
          {/* Inventory grid - 4 columns, 7 rows */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 4
            }}
          >
            {slots.map((slot, index) => (
              <div
                key={index}
                style={{
                  aspectRatio: '1',
                  background: slot ? 'rgba(184, 134, 11, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  borderRadius: 4,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  fontSize: 18
                }}
              >
                {slot && (
                  <>
                    <span>{getItemIcon(slot.itemType)}</span>
                    {slot.quantity > 1 && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: 2,
                          right: 4,
                          fontSize: 10,
                          color: '#ffffff',
                          fontWeight: 500
                        }}
                      >
                        {slot.quantity}
                      </span>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function getItemIcon(itemType: string): string {
  const icons: Record<string, string> = {
    [ItemType.LOGS]: '🪵',
    [ItemType.OAK_LOGS]: '🪵',
    [ItemType.WILLOW_LOGS]: '🪵',
    [ItemType.RAW_SHRIMP]: '🦐',
    [ItemType.RAW_TROUT]: '🐟',
    [ItemType.RAW_SALMON]: '🐟',
    [ItemType.RAW_LOBSTER]: '🦞',
    [ItemType.COOKED_SHRIMP]: '🍤',
    [ItemType.COOKED_TROUT]: '🍣',
    [ItemType.COOKED_SALMON]: '🍣',
    [ItemType.COOKED_LOBSTER]: '🦞',
    [ItemType.BURNT_FISH]: '💨'
  }
  return icons[itemType] || '📦'
}
