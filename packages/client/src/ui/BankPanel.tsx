import { useCallback } from 'react'
import { ItemType, ITEM_DEFINITIONS } from '@realm/shared'

interface BankPanelProps {
  items: Array<{ itemType: string; quantity: number }>
  onDeposit: (itemIndex: number, quantity: number) => void
  onWithdraw: (bankSlot: number, quantity: number) => void
  onClose: () => void
  inventory: Array<{ itemType: string; quantity: number }>
}

const MAX_BANK_SLOTS = 100

export function BankPanel({ items, onDeposit, onWithdraw, onClose, inventory }: BankPanelProps) {
  const handleDeposit = useCallback(
    (index: number) => {
      const item = inventory[index]
      if (item) {
        onDeposit(index, item.quantity)
      }
    },
    [inventory, onDeposit]
  )

  const handleWithdraw = useCallback(
    (slot: number) => {
      const item = items[slot]
      if (item) {
        onWithdraw(slot, item.quantity)
      }
    },
    [items, onWithdraw]
  )

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 600,
        maxHeight: '80vh',
        background: 'rgba(0, 0, 0, 0.95)',
        borderRadius: 8,
        overflow: 'hidden',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: '#ffffff'
          }}
        >
          Bank
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#a3a3a3',
            cursor: 'pointer',
            fontSize: 18,
            padding: '4px 8px'
          }}
        >
          x
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Bank section */}
        <div style={{ flex: 2, padding: 16, borderRight: '1px solid rgba(255,255,255,0.1)' }}>
          <div
            style={{
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: '#a3a3a3',
              marginBottom: 8
            }}
          >
            Bank ({items.length}/{MAX_BANK_SLOTS})
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(8, 1fr)',
              gap: 4,
              maxHeight: 300,
              overflowY: 'auto'
            }}
          >
            {Array.from({ length: Math.max(40, items.length + 8) }).map((_, index) => {
              const item = items[index]
              const itemDef = item ? ITEM_DEFINITIONS[item.itemType as ItemType] : null

              return (
                <div
                  key={index}
                  onClick={() => item && handleWithdraw(index)}
                  title={itemDef ? `${itemDef.name} - Click to withdraw` : undefined}
                  style={{
                    aspectRatio: '1',
                    background: item ? 'rgba(184, 134, 11, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    fontSize: 16,
                    cursor: item ? 'pointer' : 'default',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {item && (
                    <>
                      <span>{getItemIcon(item.itemType)}</span>
                      {item.quantity > 1 && (
                        <span
                          style={{
                            position: 'absolute',
                            bottom: 1,
                            right: 2,
                            fontSize: 9,
                            color: item.quantity >= 10000 ? '#00ff00' : '#ffffff',
                            fontWeight: 500
                          }}
                        >
                          {formatQuantity(item.quantity)}
                        </span>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Inventory section */}
        <div style={{ flex: 1, padding: 16 }}>
          <div
            style={{
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: '#a3a3a3',
              marginBottom: 8
            }}
          >
            Inventory ({inventory.length}/28)
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 4
            }}
          >
            {Array.from({ length: 28 }).map((_, index) => {
              const item = inventory[index]
              const itemDef = item ? ITEM_DEFINITIONS[item.itemType as ItemType] : null

              return (
                <div
                  key={index}
                  onClick={() => item && handleDeposit(index)}
                  title={itemDef ? `${itemDef.name} - Click to deposit` : undefined}
                  style={{
                    aspectRatio: '1',
                    background: item ? 'rgba(184, 134, 11, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    fontSize: 14,
                    cursor: item ? 'pointer' : 'default',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {item && (
                    <>
                      <span>{getItemIcon(item.itemType)}</span>
                      {item.quantity > 1 && (
                        <span
                          style={{
                            position: 'absolute',
                            bottom: 1,
                            right: 2,
                            fontSize: 8,
                            color: item.quantity >= 10000 ? '#00ff00' : '#ffffff',
                            fontWeight: 500
                          }}
                        >
                          {formatQuantity(item.quantity)}
                        </span>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <div
        style={{
          padding: '8px 16px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          fontSize: 11,
          color: '#a3a3a3',
          textAlign: 'center'
        }}
      >
        Click items to deposit or withdraw
      </div>
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
