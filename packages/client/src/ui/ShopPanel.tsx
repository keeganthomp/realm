import { useCallback, useState } from 'react'
import { ItemType, ITEM_DEFINITIONS } from '@realm/shared'

interface ShopItem {
  itemType: ItemType
  price: number
  stock: number
}

interface ShopPanelProps {
  shopId: string
  name: string
  items: ShopItem[]
  inventory: Array<{ itemType: string; quantity: number }>
  playerCoins: number
  onBuy: (itemType: ItemType, quantity: number) => void
  onSell: (itemIndex: number, quantity: number) => void
  onClose: () => void
}

export function ShopPanel({
  name,
  items,
  inventory,
  playerCoins,
  onBuy,
  onSell,
  onClose
}: ShopPanelProps) {
  const [selectedShopItem, setSelectedShopItem] = useState<ShopItem | null>(null)
  const [selectedInventoryIndex, setSelectedInventoryIndex] = useState<number | null>(null)
  const [quantity, setQuantity] = useState(1)

  const handleBuy = useCallback(() => {
    if (selectedShopItem) {
      onBuy(selectedShopItem.itemType, quantity)
      setSelectedShopItem(null)
      setQuantity(1)
    }
  }, [selectedShopItem, quantity, onBuy])

  const handleSell = useCallback(() => {
    if (selectedInventoryIndex !== null) {
      onSell(selectedInventoryIndex, quantity)
      setSelectedInventoryIndex(null)
      setQuantity(1)
    }
  }, [selectedInventoryIndex, quantity, onSell])

  const selectedItem = selectedShopItem
    ? ITEM_DEFINITIONS[selectedShopItem.itemType]
    : selectedInventoryIndex !== null && inventory[selectedInventoryIndex]
      ? ITEM_DEFINITIONS[inventory[selectedInventoryIndex].itemType as ItemType]
      : null

  const isSellingMode = selectedInventoryIndex !== null
  const sellPrice =
    isSellingMode && selectedItem ? Math.floor(selectedItem.value * quantity / 2) : 0

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 500,
        maxHeight: '80vh',
        background: 'rgba(0, 0, 0, 0.95)',
        borderRadius: 8,
        overflow: 'hidden',
        zIndex: 1000,
        border: '1px solid rgba(255, 255, 255, 0.1)',
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
          alignItems: 'center',
          background: 'rgba(184, 134, 11, 0.15)'
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 500, color: '#d4af37' }}>{name}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: '#ffd700' }}>Coins: {playerCoins}</span>
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
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Shop stock */}
        <div
          style={{ flex: 1, padding: 12, borderRight: '1px solid rgba(255,255,255,0.1)' }}
        >
          <div
            style={{
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: '#a3a3a3',
              marginBottom: 8
            }}
          >
            Shop Stock
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 4
            }}
          >
            {items.map((shopItem, index) => {
              const itemDef = ITEM_DEFINITIONS[shopItem.itemType]
              const isSelected = selectedShopItem?.itemType === shopItem.itemType
              return (
                <div
                  key={index}
                  onClick={() => {
                    setSelectedShopItem(shopItem)
                    setSelectedInventoryIndex(null)
                    setQuantity(1)
                  }}
                  title={`${itemDef?.name || shopItem.itemType} - ${shopItem.price} coins`}
                  style={{
                    aspectRatio: '1',
                    background: isSelected
                      ? 'rgba(0, 200, 0, 0.3)'
                      : 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    fontSize: 18,
                    cursor: 'pointer',
                    border: isSelected ? '1px solid rgba(0, 200, 0, 0.5)' : '1px solid transparent'
                  }}
                >
                  <span>{getItemIcon(shopItem.itemType)}</span>
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 1,
                      right: 2,
                      fontSize: 9,
                      color: '#ffd700'
                    }}
                  >
                    {shopItem.price}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Player inventory */}
        <div style={{ flex: 1, padding: 12 }}>
          <div
            style={{
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: '#a3a3a3',
              marginBottom: 8
            }}
          >
            Your Inventory
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
              const isSelected = selectedInventoryIndex === index

              return (
                <div
                  key={index}
                  onClick={() => {
                    if (item) {
                      setSelectedInventoryIndex(index)
                      setSelectedShopItem(null)
                      setQuantity(1)
                    }
                  }}
                  title={
                    itemDef
                      ? `${itemDef.name} - Sell for ${Math.floor(itemDef.value / 2)} each`
                      : undefined
                  }
                  style={{
                    aspectRatio: '1',
                    background: isSelected
                      ? 'rgba(200, 100, 0, 0.3)'
                      : item
                        ? 'rgba(184, 134, 11, 0.2)'
                        : 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    fontSize: 14,
                    cursor: item ? 'pointer' : 'default',
                    border: isSelected ? '1px solid rgba(200, 100, 0, 0.5)' : '1px solid transparent'
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
                            color: '#ffffff'
                          }}
                        >
                          {item.quantity}
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

      {/* Action area */}
      {selectedItem && (
        <div
          style={{
            padding: 12,
            borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#ffffff' }}>
              {selectedItem.name}
            </div>
            <div style={{ fontSize: 11, color: '#a3a3a3' }}>
              {isSellingMode
                ? `Sell price: ${sellPrice} coins`
                : `Buy price: ${selectedShopItem!.price * quantity} coins`}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              style={{
                width: 24,
                height: 24,
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: 4,
                color: '#ffffff',
                cursor: 'pointer'
              }}
            >
              -
            </button>
            <span style={{ color: '#ffffff', minWidth: 30, textAlign: 'center' }}>
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              style={{
                width: 24,
                height: 24,
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: 4,
                color: '#ffffff',
                cursor: 'pointer'
              }}
            >
              +
            </button>
          </div>

          <button
            onClick={isSellingMode ? handleSell : handleBuy}
            style={{
              padding: '8px 16px',
              background: isSellingMode
                ? 'rgba(200, 100, 0, 0.3)'
                : 'rgba(0, 200, 0, 0.3)',
              border: `1px solid ${isSellingMode ? 'rgba(200, 100, 0, 0.5)' : 'rgba(0, 200, 0, 0.5)'}`,
              borderRadius: 4,
              color: isSellingMode ? '#ffa500' : '#00ff00',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            {isSellingMode ? 'Sell' : 'Buy'}
          </button>
        </div>
      )}

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
        Click shop items to buy, or your items to sell
      </div>
    </div>
  )
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
    [ItemType.COOKED_CHICKEN]: '🍗',
    [ItemType.COOKED_BEEF]: '🥩',
    [ItemType.RAW_CHICKEN]: '🍗',
    [ItemType.RAW_BEEF]: '🥩',
    [ItemType.BURNT_FISH]: '💨',
    [ItemType.BONES]: '🦴',
    [ItemType.COWHIDE]: '🟫',
    [ItemType.COPPER_ORE]: '🟠',
    [ItemType.TIN_ORE]: '⚪',
    [ItemType.IRON_ORE]: '🟤',
    [ItemType.COAL]: '⚫'
  }
  return icons[itemType] || '📦'
}
