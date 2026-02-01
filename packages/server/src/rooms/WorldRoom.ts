import { Room, Client } from '@colyseus/core'
import { WorldState } from '../schemas/WorldState'
import { Player, SkillData, InventoryItem, CurrentAction } from '../schemas/Player'
import { WorldObject } from '../schemas/WorldObject'
import {
  tileToWorld,
  Direction,
  SkillType,
  getInitialSkills,
  getLevelFromXp,
  WorldObjectType,
  WORLD_OBJECT_DEFINITIONS,
  COOKING_RECIPES,
  getBurnChance,
  ItemType
} from '@realm/shared'
import { getOrCreatePlayer, savePlayerSkills, savePlayerInventory, PlayerData } from '../database'

const MAX_INVENTORY_SIZE = 28

export class WorldRoom extends Room {
  state!: WorldState
  maxClients = 100
  private actionTimers: Map<string, NodeJS.Timeout> = new Map()
  private playerDbIds: Map<string, number> = new Map() // sessionId -> database player id
  private pendingSaves: Set<string> = new Set() // sessionIds with unsaved changes

  onCreate() {
    console.log('=== onCreate called ===', { roomId: this.roomId })
    try {
      this.setState(new WorldState())
      // Spawn initial world objects
      this.spawnWorldObjects()
      console.log(`WorldRoom created with ${this.state.worldObjects.size} world objects`)
    } catch (error) {
      console.error('Error in onCreate:', error)
      throw error
    }

    // Handle movement
    this.onMessage('move', (client, data) => {
      const player = this.state.players.get(client.sessionId)
      if (!player) return

      // Cancel current action if moving
      this.cancelAction(client.sessionId)

      player.x = data.x
      player.y = data.y

      if (data.path && data.path.length > 0) {
        const target = data.path[data.path.length - 1]
        const dx = target.x - data.x
        const dy = target.y - data.y

        if (Math.abs(dx) > Math.abs(dy)) {
          player.direction = dx > 0 ? Direction.RIGHT : Direction.LEFT
        } else {
          player.direction = dy > 0 ? Direction.DOWN : Direction.UP
        }
      }
    })

    // Handle starting an action (chop tree, fish, etc)
    this.onMessage('startAction', (client, data: { objectId: string }) => {
      this.handleStartAction(client, data.objectId)
    })

    // Handle chat
    this.onMessage('chat', (client, data: { text: string }) => {
      const player = this.state.players.get(client.sessionId)
      if (!player) return

      this.broadcast('chat', {
        sender: player.name,
        text: data.text.substring(0, 200)
      })
    })

    // Respawn tick - check for depleted objects to respawn
    this.clock.setInterval(() => {
      const now = Date.now()
      this.state.worldObjects.forEach((obj: WorldObject, id: string) => {
        if (obj.depleted && obj.respawnAt > 0 && now >= obj.respawnAt) {
          obj.depleted = false
          obj.respawnAt = 0
          // Broadcast respawn to all clients
          this.broadcast('objectUpdate', { id, depleted: false })
        }
      })
    }, 1000)

    // Auto-save tick - save pending player data every 30 seconds
    this.clock.setInterval(() => {
      this.saveAllPendingPlayers()
    }, 30000)

    console.log('WorldRoom created with world objects')
  }

  hasReservedSeat(sessionId: string, reconnectionToken?: string): boolean {
    const reservedSeats = (this as unknown as { _reservedSeats?: Record<string, unknown> })
      ._reservedSeats
    console.log('hasReservedSeat check', {
      roomId: this.roomId,
      sessionId,
      reservedSeatIds: reservedSeats ? Object.keys(reservedSeats) : []
    })
    return super.hasReservedSeat(sessionId, reconnectionToken)
  }

  onError(client: Client, error: Error) {
    console.error('WorldRoom error for client', client.sessionId, error)
  }

  private spawnWorldObjects() {
    let objectId = 0

    // Spawn trees in specific locations
    const treeLocations = [
      { x: 5, y: 5 },
      { x: 6, y: 5 },
      { x: 7, y: 5 },
      { x: 5, y: 6 },
      { x: 7, y: 6 },
      { x: 25, y: 8 },
      { x: 26, y: 8 },
      { x: 27, y: 8 },
      { x: 25, y: 9 },
      { x: 27, y: 9 },
      { x: 30, y: 15 },
      { x: 31, y: 15 },
      { x: 32, y: 15 }
    ]

    for (const loc of treeLocations) {
      const obj = new WorldObject()
      obj.id = `tree_${objectId++}`
      obj.objectType = WorldObjectType.TREE
      const pos = tileToWorld({ tileX: loc.x, tileY: loc.y })
      obj.x = pos.x
      obj.y = pos.y
      this.state.worldObjects.set(obj.id, obj)
    }

    // Spawn fishing spots near water (the pond in the center)
    const fishingLocations = [
      { x: 18, y: 13 },
      { x: 22, y: 13 },
      { x: 17, y: 15 },
      { x: 23, y: 15 },
      { x: 18, y: 17 },
      { x: 22, y: 17 }
    ]

    for (const loc of fishingLocations) {
      const obj = new WorldObject()
      obj.id = `fish_${objectId++}`
      obj.objectType = WorldObjectType.FISHING_SPOT_NET
      const pos = tileToWorld({ tileX: loc.x, tileY: loc.y })
      obj.x = pos.x
      obj.y = pos.y
      this.state.worldObjects.set(obj.id, obj)
    }

    // Spawn a permanent fire for cooking
    const fireLocations = [{ x: 12, y: 12 }]

    for (const loc of fireLocations) {
      const obj = new WorldObject()
      obj.id = `fire_${objectId++}`
      obj.objectType = WorldObjectType.FIRE
      const pos = tileToWorld({ tileX: loc.x, tileY: loc.y })
      obj.x = pos.x
      obj.y = pos.y
      this.state.worldObjects.set(obj.id, obj)
    }

    console.log(`Spawned ${objectId} world objects`)
  }

  private handleStartAction(client: Client, objectId: string) {
    const player = this.state.players.get(client.sessionId)
    if (!player) return

    const worldObj = this.state.worldObjects.get(objectId)
    if (!worldObj || worldObj.depleted) {
      client.send('actionError', { message: 'Object not available' })
      return
    }

    const objDef = WORLD_OBJECT_DEFINITIONS[worldObj.objectType as WorldObjectType]
    if (!objDef) return

    // Check level requirement
    const skillXp = player.skills.get(objDef.skill)?.xp || 0
    const playerLevel = getLevelFromXp(skillXp)
    if (playerLevel < objDef.levelRequired) {
      client.send('actionError', {
        message: `Need level ${objDef.levelRequired} ${objDef.skill}`
      })
      return
    }

    // Check inventory space (except for cooking which transforms items)
    if (objDef.skill !== SkillType.COOKING && player.inventory.length >= MAX_INVENTORY_SIZE) {
      client.send('actionError', { message: 'Inventory full' })
      return
    }

    // Cancel any existing action
    this.cancelAction(client.sessionId)

    // Start the action
    const action = new CurrentAction()
    action.actionType = objDef.skill
    action.targetId = objectId
    action.startTime = Date.now()
    action.duration = objDef.actionTime
    player.currentAction = action

    // Set timer for action completion
    const timer = setTimeout(() => {
      this.completeAction(client.sessionId)
    }, objDef.actionTime)
    this.actionTimers.set(client.sessionId, timer)

    client.send('actionStarted', {
      objectId,
      duration: objDef.actionTime,
      action: objDef.action
    })
  }

  private completeAction(sessionId: string) {
    const player = this.state.players.get(sessionId)
    if (!player || !player.currentAction) return

    const objectId = player.currentAction.targetId
    const worldObj = this.state.worldObjects.get(objectId)
    if (!worldObj) {
      player.currentAction = null
      return
    }

    const objDef = WORLD_OBJECT_DEFINITIONS[worldObj.objectType as WorldObjectType]
    if (!objDef) {
      player.currentAction = null
      return
    }

    // Grant XP
    const skillData = player.skills.get(objDef.skill)
    if (skillData) {
      const oldLevel = getLevelFromXp(skillData.xp)
      skillData.xp += Math.floor(objDef.xpGain)
      const newLevel = getLevelFromXp(skillData.xp)

      // Level up notification
      if (newLevel > oldLevel) {
        this.broadcast('levelUp', {
          playerName: player.name,
          skill: objDef.skill,
          newLevel
        })
      }
    }

    // Grant item
    if (player.inventory.length < MAX_INVENTORY_SIZE) {
      const item = new InventoryItem()
      item.itemType = objDef.yields
      item.quantity = 1
      player.inventory.push(item)
    }

    // Mark player as having unsaved changes
    this.pendingSaves.add(sessionId)

    // Check for depletion (trees)
    if (objDef.depletionChance > 0 && Math.random() < objDef.depletionChance) {
      worldObj.depleted = true
      worldObj.respawnAt = Date.now() + objDef.respawnTime
      // Broadcast depletion to all clients
      this.broadcast('objectUpdate', { id: objectId, depleted: true })
    }

    // Send completion message
    const client = this.clients.find((c) => c.sessionId === sessionId)
    if (client) {
      client.send('actionComplete', {
        xpGained: objDef.xpGain,
        skill: objDef.skill,
        itemGained: objDef.yields
      })

      // Auto-repeat if object still available and inventory has space
      if (!worldObj.depleted && player.inventory.length < MAX_INVENTORY_SIZE) {
        this.handleStartAction(client, objectId)
      } else {
        player.currentAction = null
      }
    } else {
      player.currentAction = null
    }
  }

  private cancelAction(sessionId: string) {
    const timer = this.actionTimers.get(sessionId)
    if (timer) {
      clearTimeout(timer)
      this.actionTimers.delete(sessionId)
    }

    const player = this.state.players.get(sessionId)
    if (player) {
      player.currentAction = null
    }
  }

  private async savePlayerData(sessionId: string) {
    const player = this.state.players.get(sessionId)
    const playerId = this.playerDbIds.get(sessionId)
    if (!player || !playerId) return

    try {
      // Save skills
      const skills: Record<string, number> = {}
      player.skills.forEach((skillData: SkillData, skillType: string) => {
        skills[skillType] = skillData.xp
      })
      await savePlayerSkills(playerId, skills)

      // Save inventory
      const inventory: Array<{ itemType: string; quantity: number }> = []
      for (const item of player.inventory) {
        inventory.push({ itemType: item.itemType, quantity: item.quantity })
      }
      await savePlayerInventory(playerId, inventory)

      this.pendingSaves.delete(sessionId)
    } catch (error) {
      console.error(`Failed to save player ${player.name}:`, error)
    }
  }

  private async saveAllPendingPlayers() {
    const saves = Array.from(this.pendingSaves)
    if (saves.length === 0) return

    console.log(`Auto-saving ${saves.length} player(s)...`)
    await Promise.all(saves.map((sessionId) => this.savePlayerData(sessionId)))
  }

  onJoin(client: Client, options: { name?: string }) {
    console.log('=== onJoin called ===', client.sessionId, options)
    console.log(`${client.sessionId} joined`)

    const username = options.name || `Player${client.sessionId.slice(0, 4)}`

    // Create player with default data IMMEDIATELY (synchronously)
    // This ensures the player is in state before initial sync
    const player = new Player()
    player.name = username

    // Spawn position
    const spawnTile = {
      tileX: 10 + Math.floor(Math.random() * 3),
      tileY: 10 + Math.floor(Math.random() * 3)
    }
    const spawnPos = tileToWorld(spawnTile)
    player.x = spawnPos.x
    player.y = spawnPos.y
    player.direction = Direction.DOWN

    // Initialize with default skills (will be updated from DB)
    const defaultSkills = getInitialSkills()
    for (const [skillType, xp] of Object.entries(defaultSkills)) {
      const skillData = new SkillData()
      skillData.xp = xp
      player.skills.set(skillType, skillData)
    }

    // Add player to state IMMEDIATELY
    this.state.players.set(client.sessionId, player)
    console.log('Player added to state synchronously, skills:', player.skills.size)

    // Send player's own data via message (state sync is unreliable)
    const skillsData: Record<string, number> = {}
    player.skills.forEach((skill, skillType) => {
      skillsData[skillType] = skill.xp
    })
    client.send('playerData', {
      sessionId: client.sessionId,
      name: player.name,
      x: player.x,
      y: player.y,
      skills: skillsData,
      inventory: []
    })

    // Send world objects to the newly joined client
    const worldObjectsData: Array<{
      id: string
      objectType: string
      x: number
      y: number
      depleted: boolean
    }> = []
    this.state.worldObjects.forEach((obj: WorldObject, id: string) => {
      worldObjectsData.push({
        id,
        objectType: obj.objectType,
        x: obj.x,
        y: obj.y,
        depleted: obj.depleted
      })
    })
    client.send('worldObjects', worldObjectsData)

    this.broadcast('chat', {
      sender: 'System',
      text: `${player.name} joined the game`
    })

    // Load from database in background and update player state
    this.loadPlayerFromDatabase(client.sessionId, username, player)
  }

  private async loadPlayerFromDatabase(sessionId: string, username: string, player: Player) {
    try {
      const playerData = await getOrCreatePlayer(username)
      this.playerDbIds.set(sessionId, playerData.id)

      // Update skills from database
      if (playerData.skills) {
        for (const [skillType, xp] of Object.entries(playerData.skills)) {
          const skillData = player.skills.get(skillType)
          if (skillData) {
            skillData.xp = xp
          }
        }
        console.log('Updated player skills from DB for:', username)
      }

      // Update inventory from database
      if (playerData.inventory && playerData.inventory.length > 0) {
        // Clear default inventory and load from DB
        player.inventory.splice(0, player.inventory.length)
        for (const item of playerData.inventory) {
          const invItem = new InventoryItem()
          invItem.itemType = item.itemType
          invItem.quantity = item.quantity
          player.inventory.push(invItem)
        }
        console.log('Updated player inventory from DB for:', username)
      }

      // Send updated data to client via message (state sync is unreliable)
      const client = this.clients.find((c) => c.sessionId === sessionId)
      if (client) {
        const skillsData: Record<string, number> = {}
        player.skills.forEach((skill, skillType) => {
          skillsData[skillType] = skill.xp
        })
        const inventoryData: Array<{ itemType: string; quantity: number }> = []
        for (const item of player.inventory) {
          inventoryData.push({
            itemType: item.itemType,
            quantity: item.quantity
          })
        }
        client.send('playerData', {
          sessionId,
          name: player.name,
          x: player.x,
          y: player.y,
          skills: skillsData,
          inventory: inventoryData
        })
        console.log('Sent playerData message to client for:', username)
      }
    } catch (error) {
      console.warn('Database unavailable, using defaults:', (error as Error).message)
    }
  }

  async onLeave(client: Client) {
    const player = this.state.players.get(client.sessionId)
    const playerName = player?.name || 'Unknown'

    // Save player data to database before cleanup
    await this.savePlayerData(client.sessionId)
    console.log(`Saved data for ${playerName}`)

    this.cancelAction(client.sessionId)
    this.pendingSaves.delete(client.sessionId)
    this.playerDbIds.delete(client.sessionId)
    console.log(`${client.sessionId} left`)
    this.state.players.delete(client.sessionId)

    this.broadcast('chat', {
      sender: 'System',
      text: `${playerName} left the game`
    })
  }

  async onDispose() {
    // Save all pending player data before disposing
    await this.saveAllPendingPlayers()

    // Clear all timers
    for (const timer of this.actionTimers.values()) {
      clearTimeout(timer)
    }
    this.actionTimers.clear()
    console.log('WorldRoom disposed')
  }
}
