import { useState, useCallback, useMemo } from 'react'
import { ItemType, ITEM_DEFINITIONS, isFood } from '@realm/shared'

interface InventoryPanelProps {
  items: Array<{ itemType: string; quantity: number }>
  selectedIndex: number | null
  onSelectItem: (index: number | null) => void
  onDropItem: (index: number) => void
  onEatFood?: (index: number) => void
}

const MAX_SLOTS = 28

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

export function InventoryPanel({
  items,
  selectedIndex,
  onSelectItem,
  onDropItem,
  onEatFood
}: InventoryPanelProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; index: number } | null>(
    null
  )

  // Create 28 slots, filling with items
  const slots = useMemo(() => {
    const result: Array<{ itemType: string; quantity: number } | null> = []
    for (let i = 0; i < MAX_SLOTS; i++) {
      result.push(items[i] || null)
    }
    return result
  }, [items])

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

  const handleEat = useCallback(() => {
    if (contextMenu !== null && onEatFood) {
      onEatFood(contextMenu.index)
      setContextMenu(null)
    }
  }, [contextMenu, onEatFood])

  // Close context menu when clicking elsewhere
  const handlePanelClick = useCallback(() => {
    setContextMenu(null)
  }, [])

  return (
    <div
      onClick={handlePanelClick}
      style={{ ...panelStyle, width: 210, position: 'relative' }}
    >
      {/* Header */}
      <div style={headerStyle}>
        <span style={labelStyle}>Inventory</span>
        <span
          style={{
            color: usedSlots >= MAX_SLOTS ? '#f87171' : '#d4a84b',
            fontSize: 12,
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          {usedSlots}/{MAX_SLOTS}
        </span>
      </div>

      <div style={{ padding: 10 }}>
        {/* Inventory grid - 4 columns, 7 rows */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 5
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
                        ? 'rgba(212, 168, 75, 0.35)'
                        : 'rgba(212, 168, 75, 0.12)'
                      : 'rgba(0, 0, 0, 0.3)',
                    borderRadius: 6,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    fontSize: 20,
                    cursor: slot ? 'pointer' : 'default',
                    border: isSelected
                      ? '2px solid #d4a84b'
                      : '1px solid rgba(255, 255, 255, 0.06)',
                    transition: 'all 0.12s ease',
                    boxSizing: 'border-box'
                  }}
                >
                  {slot && (
                    <>
                      <span style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}>
                        {getItemIcon(slot.itemType)}
                      </span>
                      {slot.quantity > 1 && (
                        <span
                          style={{
                            position: 'absolute',
                            bottom: 2,
                            right: 4,
                            fontSize: 10,
                            fontWeight: 600,
                            color: slot.quantity >= 10000 ? '#4ade80' : '#ffffff',
                            textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                            fontVariantNumeric: 'tabular-nums'
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
                marginTop: 10,
                padding: '8px 10px',
                background: 'rgba(212, 168, 75, 0.15)',
                borderRadius: 6,
                fontSize: 11,
                color: '#d4a84b',
                textAlign: 'center',
                border: '1px solid rgba(212, 168, 75, 0.2)'
              }}
            >
              Click fire to cook {ITEM_DEFINITIONS[items[selectedIndex].itemType as ItemType]?.name}
            </div>
          )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            background: 'linear-gradient(180deg, rgba(40, 40, 44, 0.98) 0%, rgba(28, 28, 32, 0.98) 100%)',
            borderRadius: 6,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            overflow: 'hidden',
            zIndex: 1000,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
            minWidth: 100
          }}
        >
          {/* Eat option - only show for food items */}
          {items[contextMenu.index] &&
            isFood(items[contextMenu.index].itemType as ItemType) && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleEat()
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 16px',
                  background: 'transparent',
                  border: 'none',
                  color: '#4ade80',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.1s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(74, 222, 128, 0.15)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                Eat
              </button>
            )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDrop()
            }}
            style={{
              display: 'block',
              width: '100%',
              padding: '10px 16px',
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.1s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(212, 168, 75, 0.2)'
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
    [ItemType.BURNT_FISH]: '💨',
    [ItemType.BONES]: '🦴',
    [ItemType.COWHIDE]: '🟫',
    [ItemType.RAW_CHICKEN]: '🍗',
    [ItemType.RAW_BEEF]: '🥩',
    [ItemType.COOKED_CHICKEN]: '🍗',
    [ItemType.COOKED_BEEF]: '🥩'
  }
  return icons[itemType] || '📦'
}
