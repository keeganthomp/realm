import { Client, Room } from '@colyseus/sdk'
import type { Game } from '../Game'
import type { Position } from '@realm/shared'
import { Direction, WorldObjectType } from '@realm/shared'

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
  public onInventoryChanged?: (items: Array<{ itemType: string; quantity: number }>) => void

  constructor(game: Game) {
    this.game = game
    this.client = new Client(SERVER_URL)

    // Set up game callbacks
    this.game.onLocalPlayerMove = (position, path) => {
      this.sendMovement(position, path)
    }

    this.game.onWorldObjectClick = (objectId) => {
      this.startAction(objectId)
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
    })

    this.room.onMessage(
      'actionComplete',
      (data: { xpGained: number; skill: string; itemGained: string }) => {
        this.onActionComplete?.(data.xpGained, data.skill, data.itemGained)
      }
    )

    this.room.onMessage('actionError', (data: { message: string }) => {
      this.onActionError?.(data.message)
    })

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
      }) => {
        if (data.sessionId === this.sessionId) {
          this.game.setLocalPlayerPosition({ x: data.x, y: data.y })

          const skills = new Map<string, number>()
          for (const [skillType, xp] of Object.entries(data.skills)) {
            skills.set(skillType, xp)
          }
          this.onSkillsChanged?.(skills)

          this.onInventoryChanged?.(data.inventory)
        }
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
    this.room.send('move', { x: position.x, y: position.y, path })
  }

  startAction(objectId: string) {
    if (!this.room) return
    this.room.send('startAction', { objectId })
  }

  sendChat(text: string) {
    if (!this.room || !text.trim()) return
    this.room.send('chat', { text: text.trim() })
  }

  disconnect() {
    this.room?.leave()
    this.room = null
  }
}
