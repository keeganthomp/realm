import { Client, Room } from '@colyseus/sdk'
import type { Game } from '../Game'
import type { Position } from '@realm/shared'
import { Direction, WorldObjectType, NpcType } from '@realm/shared'

const DEFAULT_SERVER_URL = import.meta.env.DEV ? 'http://localhost:2567' : window.location.origin
const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? DEFAULT_SERVER_URL

export class NetworkManager {
  private client: Client
  private room: Room | null = null
  private game: Game
  private sessionId: string = ''

  // Callbacks for React UI
  public onConnected?: () => void
  public onDisconnected?: () => void
  public onConnectionRetry?: (attempt: number, delayMs: number, error: string) => void
  public onPlayersChanged?: (players: Map<string, { name: string }>) => void
  public onChatMessage?: (sender: string, text: string) => void
  public onSkillsChanged?: (skills: Map<string, number>) => void
  public onLevelUp?: (playerName: string, skill: string, newLevel: number) => void
  public onActionStarted?: (duration: number, action: string) => void
  public onActionComplete?: (xpGained: number, skill: string, itemGained: string) => void
  public onActionError?: (message: string) => void
  public onActionCancelled?: () => void
  public onDisengage?: () => void
  public onInventoryChanged?: (items: Array<{ itemType: string; quantity: number }>) => void
  public onItemDropped?: (itemType: string, quantity: number) => void
  public onBankOpened?: (items: Array<{ itemType: string; quantity: number }>) => void

  // Combat callbacks
  public onHealthChanged?: (currentHp: number, maxHp: number) => void
  public onCombatStarted?: (targetId: string) => void
  public onCombatEnded?: () => void
  public onCombatHit?: (
    attackerId: string,
    targetId: string,
    damage: number,
    targetHp: number,
    targetMaxHp: number
  ) => void
  public onNpcDied?: (npcId: string, killerName: string) => void
  public onPlayerDied?: (respawnX: number, respawnY: number) => void
  public onNpcAggro?: (npcId: string) => void

  // Callback for when a world object is clicked (can be overridden by App)
  public onWorldObjectClicked?: (objectId: string) => void

  // Callback for when an NPC is clicked
  public onNpcClicked?: (npcId: string) => void

  constructor(game: Game) {
    this.game = game
    this.client = new Client(SERVER_URL)

    // Set up game callbacks
    this.game.onLocalPlayerMove = (position, path) => {
      this.sendMovement(position, path)
    }

    this.game.onWorldObjectClick = (objectId) => {
      // Allow external handling (e.g., for using items on objects)
      if (this.onWorldObjectClicked) {
        this.onWorldObjectClicked(objectId)
      } else {
        this.startAction(objectId)
      }
    }

    this.game.onNpcClick = (npcId) => {
      if (this.onNpcClicked) {
        this.onNpcClicked(npcId)
      } else {
        this.attackNpc(npcId)
      }
    }
  }

  async connect() {
    let playerName = localStorage.getItem('realm_player_name')
    if (!playerName) {
      playerName = `Player${Math.floor(Math.random() * 10000)}`
      localStorage.setItem('realm_player_name', playerName)
    }

    const maxAttempts = 5
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        console.log('Attempting to join room with name:', playerName)
        this.room = await this.client.joinOrCreate('world', {
          name: playerName
        })
        this.sessionId = this.room.sessionId
        this.setupRoomListeners()
        this.onConnected?.()
        return
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        const shouldRetry =
          /seat reservation expired/i.test(message) ||
          /WebSocket|Failed to fetch|ECONNREFUSED|ENOTFOUND/i.test(message)

        if (!shouldRetry || attempt === maxAttempts) {
          console.error('Failed to connect:', error)
          this.onDisconnected?.()
          return
        }

        const delayMs = Math.min(1000 * 2 ** (attempt - 1), 8000)
        console.warn(`Connect failed (${message}). Retrying in ${delayMs}ms...`)
        this.onConnectionRetry?.(attempt, delayMs, message)
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }
  }

  private setupRoomListeners() {
    if (!this.room) return

    // World objects are sent via 'worldObjects' message on join (see below)
    // Handle real-time updates for object state changes (depletion, respawn)
    this.room.onMessage('objectUpdate', (data: { id: string; depleted: boolean }) => {
      this.game.updateWorldObject(data.id, data.depleted)
    })

    // Players
    const processedPlayers = new Set<string>()

    const handlePlayerAdd = async (player: any, sessionId: string) => {
      if (processedPlayers.has(sessionId)) {
        return
      }
      processedPlayers.add(sessionId)

      if (sessionId === this.sessionId) {
        this.game.setLocalPlayerPosition({ x: player.x, y: player.y })

        // Sync skills
        this.syncSkills(player)
        player.skills.onAdd((skillData: any, _skillType: string) => {
          this.syncSkills(player)
          skillData.onChange(() => this.syncSkills(player))
        })
        player.skills.forEach((skillData: any) => {
          skillData.onChange(() => this.syncSkills(player))
        })

        // Sync inventory
        this.syncInventory(player)
        player.inventory.onAdd((item: any) => {
          this.syncInventory(player)
          item.onChange(() => this.syncInventory(player))
        })
        player.inventory.onRemove(() => this.syncInventory(player))
        for (const item of player.inventory) {
          item.onChange(() => this.syncInventory(player))
        }

        // Track current action
        player.onChange(() => {
          this.game.setPlayerAction(Boolean(player.currentAction))
        })
      } else {
        await this.game.addRemotePlayer(sessionId, player.name, {
          x: player.x,
          y: player.y
        })

        player.onChange(() => {
          if (sessionId !== this.sessionId) {
            this.game.updateRemotePlayer(
              sessionId,
              { x: player.x, y: player.y },
              player.direction as Direction
            )
          }
        })
      }

      this.updatePlayerList()
    }

    const attachPlayerListeners = () => {
      const players = this.room?.state?.players
      if (
        !players ||
        typeof players.onAdd !== 'function' ||
        typeof players.onRemove !== 'function'
      ) {
        return
      }

      players.onAdd((player: any, sessionId: string) => {
        handlePlayerAdd(player, sessionId)
      })

      this.room?.onStateChange((state: any) => {
        if (state.players.size > 0 && !processedPlayers.has(this.sessionId)) {
          state.players.forEach((player: any, sessionId: string) => {
            handlePlayerAdd(player, sessionId)
          })
        }
      })

      players.onRemove((_player: any, sessionId: string) => {
        this.game.removeRemotePlayer(sessionId)
        this.updatePlayerList()
      })
    }

    if (this.room.state?.players) {
      attachPlayerListeners()
    }

    this.room.onStateChange((state: any) => {
      if (state?.players && typeof state.players.onAdd === 'function') {
        attachPlayerListeners()
      }
    })

    // Action messages
    this.room.onMessage('actionStarted', (data: { duration: number; action: string }) => {
      this.onActionStarted?.(data.duration, data.action)
      this.game.setSkillingAction(data.action)
      this.game.setPlayerAction(true)
    })

    this.room.onMessage('actionCancelled', () => {
      this.onActionCancelled?.()
      this.game.setSkillingAction(null)
      this.game.setPlayerAction(false)
    })

    this.room.onMessage(
      'actionComplete',
      (data: { xpGained: number; skill: string; itemGained: string }) => {
        this.onActionComplete?.(data.xpGained, data.skill, data.itemGained)
        this.game.setSkillingAction(null)
        this.game.setPlayerAction(false)
      }
    )

    this.room.onMessage('actionError', (data: { message: string }) => {
      this.onActionError?.(data.message)
      this.game.setSkillingAction(null)
      this.game.setPlayerAction(false)
    })

    this.room.onMessage('itemDropped', (data: { itemType: string; quantity: number }) => {
      this.onItemDropped?.(data.itemType, data.quantity)
    })

    this.room.onMessage(
      'bankOpened',
      (data: { items: Array<{ itemType: string; quantity: number }> }) => {
        this.onBankOpened?.(data.items)
      }
    )

    // Level up
    this.room.onMessage(
      'levelUp',
      (data: { playerName: string; skill: string; newLevel: number }) => {
        this.onLevelUp?.(data.playerName, data.skill, data.newLevel)
      }
    )

    // Chat
    this.room.onMessage('chat', (message: { sender: string; text: string }) => {
      this.onChatMessage?.(message.sender, message.text)
    })

    // World objects sent on join
    this.room.onMessage(
      'worldObjects',
      (
        data: Array<{ id: string; objectType: string; x: number; y: number; depleted: boolean }>
      ) => {
        for (const obj of data) {
          this.game.addWorldObject(obj.id, obj.objectType as WorldObjectType, obj.x, obj.y)
          if (obj.depleted) {
            this.game.updateWorldObject(obj.id, true)
          }
        }
      }
    )

    // Player data sent via message
    this.room.onMessage(
      'playerData',
      (data: {
        sessionId: string
        name: string
        x: number
        y: number
        skills: Record<string, number>
        inventory: Array<{ itemType: string; quantity: number }>
        currentHp?: number
        maxHp?: number
      }) => {
        if (data.sessionId === this.sessionId) {
          this.game.setLocalPlayerPosition({ x: data.x, y: data.y })

          const skills = new Map<string, number>()
          for (const [skillType, xp] of Object.entries(data.skills)) {
            skills.set(skillType, xp)
          }
          this.onSkillsChanged?.(skills)

          this.onInventoryChanged?.(data.inventory)

          if (data.currentHp !== undefined && data.maxHp !== undefined) {
            this.onHealthChanged?.(data.currentHp, data.maxHp)
          }
        }
      }
    )

    // Live state updates (skills, inventory) after actions
    this.room.onMessage(
      'stateUpdate',
      (data: {
        skills: Record<string, number>
        inventory: Array<{ itemType: string; quantity: number }>
      }) => {
        const skills = new Map<string, number>()
        for (const [skillType, xp] of Object.entries(data.skills)) {
          skills.set(skillType, xp)
        }
        this.onSkillsChanged?.(skills)
        this.onInventoryChanged?.(data.inventory)
      }
    )

    // NPCs sent on join
    this.room.onMessage(
      'npcs',
      (
        data: Array<{
          id: string
          npcType: string
          x: number
          y: number
          currentHp: number
          maxHp: number
          isDead: boolean
        }>
      ) => {
        for (const npc of data) {
          this.game.addNpc(npc.id, npc.npcType as NpcType, npc.x, npc.y, npc.currentHp, npc.maxHp)
          if (npc.isDead) {
            this.game.setNpcDead(npc.id, true)
          }
        }
      }
    )

    // Combat messages
    this.room.onMessage('combatStarted', (data: { targetId: string }) => {
      this.onCombatStarted?.(data.targetId)
      this.game.setCombatTarget(data.targetId)
    })

    this.room.onMessage('combatEnded', () => {
      this.onCombatEnded?.()
      this.game.setCombatTarget(null)
    })

    this.room.onMessage(
      'combatHit',
      (data: {
        attackerId: string
        targetId: string
        damage: number
        targetHp: number
        targetMaxHp: number
      }) => {
        // Show hit splat on NPC if they're the target
        if (data.targetId.includes('_')) {
          // NPC IDs have underscores (chicken_0, cow_1, etc)
          this.game.showNpcHitSplat(data.targetId, data.damage)
          this.game.updateNpcHealth(data.targetId, data.targetHp, data.targetMaxHp)
        }

        // Update player health if player is target
        if (data.targetId === this.sessionId) {
          this.onHealthChanged?.(data.targetHp, data.targetMaxHp)
        }

        this.onCombatHit?.(
          data.attackerId,
          data.targetId,
          data.damage,
          data.targetHp,
          data.targetMaxHp
        )
      }
    )

    this.room.onMessage(
      'npcDied',
      (data: {
        npcId: string
        killerName: string
        drops: Array<{ itemType: string; quantity: number }>
      }) => {
        this.game.setNpcDead(data.npcId, true)
        this.onNpcDied?.(data.npcId, data.killerName)
      }
    )

    this.room.onMessage('npcRespawned', (data: { npcId: string }) => {
      this.game.setNpcDead(data.npcId, false)
    })

    this.room.onMessage(
      'playerDied',
      (data: { respawnX: number; respawnY: number; currentHp: number; maxHp: number }) => {
        this.game.setLocalPlayerPosition({ x: data.respawnX, y: data.respawnY })
        this.onHealthChanged?.(data.currentHp, data.maxHp)
        this.onPlayerDied?.(data.respawnX, data.respawnY)
      }
    )

    this.room.onMessage('npcAggro', (data: { npcId: string }) => {
      this.onNpcAggro?.(data.npcId)
    })

    this.room.onMessage(
      'healthUpdate',
      (data: { currentHp: number; maxHp: number; healAmount: number }) => {
        this.onHealthChanged?.(data.currentHp, data.maxHp)
      }
    )

    this.room.onLeave(() => {
      this.onDisconnected?.()
    })
  }

  private syncSkills(player: any) {
    const skills = new Map<string, number>()

    if (player.skills?.forEach) {
      player.skills.forEach((skill: any, skillType: string) => {
        skills.set(skillType, skill?.xp ?? 0)
      })
    }

    for (const key in player.skills) {
      if (key.startsWith('$')) continue
      const skill = player.skills[key]
      if (skill && typeof skill.xp === 'number' && !skills.has(key)) {
        skills.set(key, skill.xp)
      }
    }

    this.onSkillsChanged?.(skills)
  }

  private syncInventory(player: any) {
    const items: Array<{ itemType: string; quantity: number }> = []
    for (const item of player.inventory) {
      items.push({ itemType: item.itemType, quantity: item.quantity })
    }
    this.onInventoryChanged?.(items)
  }

  private updatePlayerList() {
    if (!this.room) return

    const players = new Map<string, { name: string }>()
    this.room.state.players.forEach((player: any, sessionId: string) => {
      players.set(sessionId, { name: player.name })
    })
    this.onPlayersChanged?.(players)
  }

  sendMovement(position: Position, path: Position[]) {
    if (!this.room) return
    this.onActionCancelled?.()
    this.onDisengage?.()
    const finalPos = path.length > 0 ? path[path.length - 1] : position
    this.room.send('move', { x: finalPos.x, y: finalPos.y, path })
    this.room.send('flee', {})
  }

  startAction(objectId: string) {
    if (!this.room) return
    this.room.send('startAction', { objectId })
  }

  sendChat(text: string) {
    if (!this.room || !text.trim()) return
    this.room.send('chat', { text: text.trim() })
  }

  useItemOnObject(itemIndex: number, objectId: string) {
    if (!this.room) return
    this.room.send('useItemOnObject', { itemIndex, objectId })
  }

  dropItem(itemIndex: number) {
    if (!this.room) return
    this.room.send('dropItem', { itemIndex })
  }

  openBank() {
    if (!this.room) return
    this.room.send('openBank', {})
  }

  bankDeposit(itemIndex: number, quantity: number = 1) {
    if (!this.room) return
    this.room.send('bankDeposit', { itemIndex, quantity })
  }

  bankWithdraw(bankSlot: number, quantity: number = 1) {
    if (!this.room) return
    this.room.send('bankWithdraw', { bankSlot, quantity })
  }

  attackNpc(npcId: string) {
    if (!this.room) return
    this.room.send('attackNpc', { npcId })
  }

  eatFood(itemIndex: number) {
    if (!this.room) return
    this.room.send('eatFood', { itemIndex })
  }

  flee() {
    if (!this.room) return
    this.room.send('flee', {})
  }

  setCombatStyle(style: string) {
    if (!this.room) return
    this.room.send('setCombatStyle', { style })
  }

  disconnect() {
    this.room?.leave()
    this.room = null
  }
}
