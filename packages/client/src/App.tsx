import { useEffect, useRef, useState, useCallback } from 'react'
import { Game } from './Game'
import { NetworkManager } from './systems/NetworkManager'
import { ChatPanel } from './ui/ChatPanel'
import { PlayerList } from './ui/PlayerList'
import { ConnectionStatus } from './ui/ConnectionStatus'
import { SkillsPanel } from './ui/SkillsPanel'
import { InventoryPanel } from './ui/InventoryPanel'
import { BankPanel } from './ui/BankPanel'
import { ActionProgress } from './ui/ActionProgress'
import { Notifications, useNotifications } from './ui/Notifications'
import { LoadingScreen } from './ui/LoadingScreen'
import { HealthBar } from './ui/HealthBar'
import { Sidebar, PanelType } from './ui/Sidebar'

export function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Game | null>(null)
  const networkRef = useRef<NetworkManager | null>(null)
  const initRef = useRef(false)

  const [isLoading, setIsLoading] = useState(true)

  const [loadingStatus, setLoadingStatus] = useState('Initializing...')
  const [connected, setConnected] = useState(false)
  const [players, setPlayers] = useState<Map<string, { name: string }>>(new Map())
  const [messages, setMessages] = useState<Array<{ sender: string; text: string }>>([])
  const [skills, setSkills] = useState<Map<string, number>>(new Map())
  const [inventory, setInventory] = useState<Array<{ itemType: string; quantity: number }>>([])
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null)
  const [bankItems, setBankItems] = useState<Array<{ itemType: string; quantity: number }>>([])
  const [isBankOpen, setIsBankOpen] = useState(false)
  const [currentAction, setCurrentAction] = useState<{
    duration: number
    action: string
    startTime: number
  } | null>(null)

  // Combat state
  const [currentHp, setCurrentHp] = useState(10)
  const [maxHp, setMaxHp] = useState(10)
  const [inCombat, setInCombat] = useState(false)

  // Sidebar panel state - null means no panel open
  const [activePanel, setActivePanel] = useState<PanelType>(null)

  // Store selected item index in ref for use in callbacks
  const selectedItemIndexRef = useRef<number | null>(null)
  useEffect(() => {
    selectedItemIndexRef.current = selectedItemIndex
  }, [selectedItemIndex])

  const { notifications, showLevelUp, showXpGain, showError } = useNotifications()

  // Store notification functions in refs to avoid stale closures
  const showLevelUpRef = useRef(showLevelUp)
  const showXpGainRef = useRef(showXpGain)
  const showErrorRef = useRef(showError)

  useEffect(() => {
    showLevelUpRef.current = showLevelUp
    showXpGainRef.current = showXpGain
    showErrorRef.current = showError
  }, [showLevelUp, showXpGain, showError])

  useEffect(() => {
    if (!containerRef.current || initRef.current) return
    initRef.current = true

    const init = async () => {
      // Initialize game
      setLoadingStatus('Loading game engine...')
      const game = new Game()
      try {
        await game.init(containerRef.current!)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (/webgl not supported/i.test(message)) {
          setIsLoading(true)
          setLoadingStatus('WebGL not supported. Please enable WebGL or try another browser.')
          return
        }
        throw error
      }
      gameRef.current = game

      // Initialize network
      setLoadingStatus('Connecting to server...')
      const network = new NetworkManager(game)
      networkRef.current = network

      // Connection callbacks
      network.onConnected = () => {
        setConnected(true)
        setLoadingStatus('Entering world...')
        // Small delay to ensure world objects are received
        setTimeout(() => {
          setIsLoading(false)
        }, 300)
      }
      network.onDisconnected = () => {
        setConnected(false)
        setIsLoading(true)
        setLoadingStatus('Disconnected. Retrying...')
      }
      network.onConnectionRetry = (attempt, delayMs, error) => {
        setLoadingStatus(
          `Connection failed (${error}). Retrying in ${Math.ceil(delayMs / 1000)}s...`
        )
        if (attempt === 1) {
          setIsLoading(true)
        }
      }
      network.onPlayersChanged = (playerMap) => setPlayers(new Map(playerMap))

      // Chat
      network.onChatMessage = (sender, text) => {
        setMessages((prev) => [...prev.slice(-50), { sender, text }])
      }

      // Skills
      network.onSkillsChanged = (skillMap) => {
        setSkills(new Map(skillMap))
      }

      // Inventory
      network.onInventoryChanged = (items) => {
        setInventory([...items])
        // Clear selection if item at that index is gone
        if (selectedItemIndexRef.current !== null && selectedItemIndexRef.current >= items.length) {
          setSelectedItemIndex(null)
        }
      }

      // Actions
      network.onActionStarted = (duration, action) => {
        setCurrentAction({ duration, action, startTime: Date.now() })
      }

      network.onActionComplete = (xpGained, skill, _itemGained) => {
        setCurrentAction(null)
        showXpGainRef.current(skill, xpGained)
      }

      network.onActionError = (message) => {
        showErrorRef.current(message)
        setCurrentAction(null)
      }

      network.onActionCancelled = () => {
        setCurrentAction(null)
      }

      network.onDisengage = () => {
        setInCombat(false)
        setCurrentAction(null)
      }

      // Level ups
      network.onLevelUp = (playerName, skill, newLevel) => {
        showLevelUpRef.current(skill, newLevel)
        setMessages((prev) => [
          ...prev.slice(-50),
          {
            sender: 'System',
            text: `${playerName} reached level ${newLevel} ${skill}!`
          }
        ])
      }

      // World object click - handle item-on-object or normal action
      network.onWorldObjectClicked = (objectId) => {
        const selectedIdx = selectedItemIndexRef.current
        if (selectedIdx !== null) {
          // Use selected item on the object
          network.useItemOnObject(selectedIdx, objectId)
          setSelectedItemIndex(null)
        } else {
          // Normal action (chop tree, fish, etc.)
          network.startAction(objectId)
        }
      }

      // Item dropped feedback
      network.onItemDropped = (itemType, _quantity) => {
        showXpGainRef.current('', 0) // Clear any existing notification
        setMessages((prev) => [
          ...prev.slice(-50),
          { sender: 'System', text: `Dropped ${itemType}` }
        ])
      }

      // Bank opened
      network.onBankOpened = (items) => {
        setBankItems([...items])
        setIsBankOpen(true)
      }

      // Combat callbacks
      network.onHealthChanged = (hp, max) => {
        setCurrentHp(hp)
        setMaxHp(max)
      }

      network.onCombatStarted = () => {
        setInCombat(true)
      }

      network.onCombatEnded = () => {
        setInCombat(false)
      }

      network.onPlayerDied = () => {
        setInCombat(false)
        showErrorRef.current('You have died!')
      }

      network.onNpcAggro = (npcId) => {
        setInCombat(true)
        setMessages((prev) => [
          ...prev.slice(-50),
          { sender: 'System', text: `You are under attack!` }
        ])
      }

      // Connect to server
      await network.connect()

      // Start game loop
      game.start()
    }

    init().catch(console.error)

    return () => {
      networkRef.current?.disconnect()
      gameRef.current?.destroy()
    }
  }, [])

  const handleSendMessage = useCallback((text: string) => {
    networkRef.current?.sendChat(text)
  }, [])

  const handleSelectItem = useCallback((index: number | null) => {
    setSelectedItemIndex(index)
  }, [])

  const handleDropItem = useCallback((index: number) => {
    networkRef.current?.dropItem(index)
  }, [])

  const handleBankDeposit = useCallback((itemIndex: number, quantity: number) => {
    networkRef.current?.bankDeposit(itemIndex, quantity)
  }, [])

  const handleBankWithdraw = useCallback((bankSlot: number, quantity: number) => {
    networkRef.current?.bankWithdraw(bankSlot, quantity)
  }, [])

  const handleCloseBank = useCallback(() => {
    setIsBankOpen(false)
  }, [])

  const handleEatFood = useCallback((index: number) => {
    networkRef.current?.eatFood(index)
  }, [])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Loading Screen */}
      {isLoading && <LoadingScreen status={loadingStatus} />}

      {/* Game canvas container */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* UI Overlay - only show when loaded */}
      {!isLoading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            overflow: 'hidden'
          }}
        >
          {/* Top center - Health bar */}
          <HealthBar currentHp={currentHp} maxHp={maxHp} />

          {/* Top left - Player list */}
          <PlayerList players={players} />

          {/* Right side - Sidebar with Skills and Inventory panels */}
          <Sidebar activePanel={activePanel} onPanelChange={setActivePanel}>
            {activePanel === 'skills' && <SkillsPanel skills={skills} />}
            {activePanel === 'inventory' && (
              <InventoryPanel
                items={inventory}
                selectedIndex={selectedItemIndex}
                onSelectItem={handleSelectItem}
                onDropItem={handleDropItem}
                onEatFood={handleEatFood}
              />
            )}
          </Sidebar>

          {/* Connection indicator - bottom right */}
          <div
            style={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              pointerEvents: 'auto'
            }}
          >
            <ConnectionStatus connected={connected} />
          </div>

          {/* Bottom left - Chat */}
          <ChatPanel messages={messages} onSend={handleSendMessage} />

          {/* Center - Action progress */}
          {currentAction ? (
            <ActionProgress
              key={currentAction.startTime}
              duration={currentAction.duration}
              action={currentAction.action}
            />
          ) : inCombat ? (
            <ActionProgress key="combat" duration={900} action="Attacking" loop />
          ) : null}

          {/* Center - Notifications */}
          <Notifications notifications={notifications} />

          {/* Bank Panel */}
          {isBankOpen && (
            <div style={{ pointerEvents: 'auto' }}>
              <BankPanel
                items={bankItems}
                inventory={inventory}
                onDeposit={handleBankDeposit}
                onWithdraw={handleBankWithdraw}
                onClose={handleCloseBank}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
