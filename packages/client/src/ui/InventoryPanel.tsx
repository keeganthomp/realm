import { useState, useCallback } from 'react'
import { ItemType, ITEM_DEFINITIONS } from '@realm/shared'

interface InventoryPanelProps {
  items: Array<{ itemType: string; quantity: number }>
  selectedIndex: number | null
  onSelectItem: (index: number | null) => void
  onDropItem: (index: number) => void
}

const MAX_SLOTS = 28

export function InventoryPanel({
  items,
  selectedIndex,
  onSelectItem,
  onDropItem
}: InventoryPanelProps) {
  const [expanded, setExpanded] = useState(true)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; index: number } | null>(
    null
  )

  // Create 28 slots, filling with items
  const slots: Array<{ itemType: string; quantity: number } | null> = []
  for (let i = 0; i < MAX_SLOTS; i++) {
    slots.push(items[i] || null)
  }

  const usedSlots = items.length

  const handleSlotClick = useCallback(
    (index: number) => {
      if (!slots[index]) {
        onSelectItem(null)
        return
      }
      // Toggle selection
      onSelectItem(selectedIndex === index ? null : index)
      setContextMenu(null)
    },
    [slots, selectedIndex, onSelectItem]
  )

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, index: number) => {
      e.preventDefault()
      if (!slots[index]) return
      setContextMenu({ x: e.clientX, y: e.clientY, index })
    },
    [slots]
  )

  const handleDrop = useCallback(() => {
    if (contextMenu !== null) {
      onDropItem(contextMenu.index)
      setContextMenu(null)
      if (selectedIndex === contextMenu.index) {
        onSelectItem(null)
      }
    }
  }, [contextMenu, onDropItem, selectedIndex, onSelectItem])

  // Close context menu when clicking elsewhere
  const handlePanelClick = useCallback(() => {
    setContextMenu(null)
  }, [])

  return (
    <div
      onClick={handlePanelClick}
      style={{
        width: 200,
        background: 'rgba(0, 0, 0, 0.7)',
        borderRadius: 4,
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        position: 'relative'
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
            {slots.map((slot, index) => {
              const isSelected = selectedIndex === index
              const itemDef = slot ? ITEM_DEFINITIONS[slot.itemType as ItemType] : null

              return (
                <div
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSlotClick(index)
                  }}
                  onContextMenu={(e) => handleContextMenu(e, index)}
                  title={itemDef?.name}
                  style={{
                    aspectRatio: '1',
                    background: slot
                      ? isSelected
                        ? 'rgba(184, 134, 11, 0.5)'
                        : 'rgba(184, 134, 11, 0.2)'
                      : 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    fontSize: 18,
                    cursor: slot ? 'pointer' : 'default',
                    border: isSelected ? '2px solid #b8860b' : '2px solid transparent',
                    transition: 'all 0.15s ease'
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
                            color: slot.quantity >= 10000 ? '#00ff00' : '#ffffff',
                            fontWeight: 500
                          }}
                        >
                          {formatQuantity(slot.quantity)}
                        </span>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>

          {/* Selection hint */}
          {selectedIndex !== null && items[selectedIndex] && (
            <div
              style={{
                marginTop: 8,
                padding: '6px 8px',
                background: 'rgba(184, 134, 11, 0.2)',
                borderRadius: 4,
                fontSize: 11,
                color: '#b8860b',
                textAlign: 'center'
              }}
            >
              Click on fire to cook {ITEM_DEFINITIONS[items[selectedIndex].itemType as ItemType]?.name}
            </div>
          )}
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            background: 'rgba(0, 0, 0, 0.9)',
            borderRadius: 4,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            overflow: 'hidden',
            zIndex: 1000
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDrop()
            }}
            style={{
              display: 'block',
              width: '100%',
              padding: '8px 16px',
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              fontSize: 12,
              cursor: 'pointer',
              textAlign: 'left'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(184, 134, 11, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            Drop
          </button>
        </div>
      )}
    </div>
  )
}

function formatQuantity(qty: number): string {
  if (qty >= 10000000) return `${Math.floor(qty / 1000000)}M`
  if (qty >= 100000) return `${Math.floor(qty / 1000)}K`
  if (qty >= 10000) return `${(qty / 1000).toFixed(1)}K`
  return qty.toString()
}

function getItemIcon(itemType: string): string {
  const icons: Record<string, string> = {
    [ItemType.COINS]: '🪙',
    [ItemType.FEATHERS]: '🪶',
    [ItemType.FISHING_BAIT]: '🪱',
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
