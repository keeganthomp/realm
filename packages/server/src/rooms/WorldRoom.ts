import { Room, Client } from '@colyseus/core'
import { WorldState } from '../schemas/WorldState'
import { Player, SkillData, InventoryItem, CurrentAction } from '../schemas/Player'
import { WorldObject } from '../schemas/WorldObject'
import { NPC } from '../schemas/NPC'
import {
  tileToWorld,
  worldToTile,
  Direction,
  SkillType,
  getInitialSkills,
  getLevelFromXp,
  WorldObjectType,
  WORLD_OBJECT_DEFINITIONS,
  COOKING_RECIPES,
  getBurnChance,
  ItemType,
  ITEM_DEFINITIONS,
  FOOD_HEALING,
  NpcType,
  NPC_DEFINITIONS,
  rollDrops,
  CombatStyle,
  COMBAT_TICK_MS,
  calculateHitChance,
  calculateMaxHit,
  rollDamage,
  calculateCombatXp,
  calculateMaxHp,
  CHUNK_SIZE,
  getChunkKey,
  TILE_SIZE
} from '@realm/shared'
import type { ChunkData, ChunkKey } from '@realm/shared'
import { WorldGenerator } from '../world/WorldGenerator'
import {
  getOrCreatePlayer,
  savePlayerSkills,
  savePlayerInventory,
  savePlayerBank
} from '../database'
import { SpatialHashGrid } from '../spatial/SpatialHashGrid'

const MAX_INVENTORY_SIZE = 28

const MAX_BANK_SIZE = 100
const SPAWN_POINT = { tileX: 12, tileY: 10 } // Default respawn location
const WORLD_SEED = 1337
const CHUNK_RADIUS = 1

export class WorldRoom extends Room {
  state!: WorldState
  maxClients = 100
  private actionTimers: Map<string, NodeJS.Timeout> = new Map()
  private playerDbIds: Map<string, number> = new Map() // sessionId -> database player id
  private pendingSaves: Set<string> = new Set() // sessionIds with unsaved changes
  private playerBanks: Map<string, Array<{ itemType: string; quantity: number }>> = new Map()
  private combatInterval: { clear: () => void } | null = null
  private generator: WorldGenerator = new WorldGenerator(WORLD_SEED)
  private chunkCache: Map<ChunkKey, ChunkData> = new Map()
  private chunkRefCounts: Map<ChunkKey, number> = new Map()
  private playerChunks: Map<string, Set<ChunkKey>> = new Map()
  private chunkObjectIds: Map<ChunkKey, Set<string>> = new Map()
  private objectToChunk: Map<string, ChunkKey> = new Map()

  // Spatial hash grids for O(1) proximity queries (5 tiles per cell)
  private playerGrid: SpatialHashGrid<Player & { sessionId: string }> = new SpatialHashGrid(5 * TILE_SIZE)
  private npcGrid: SpatialHashGrid<NPC> = new SpatialHashGrid(5 * TILE_SIZE)

  onCreate() {
    console.log('=== onCreate called ===', { roomId: this.roomId })
    try {
      this.setState(new WorldState())
      // World objects now generated per chunk
      // Spawn NPCs
      this.spawnNpcs()
      console.log(
        `WorldRoom created with ${this.state.worldObjects.size} world objects and ${this.state.npcs.size} NPCs`
      )
    } catch (error) {
      console.error('Error in onCreate:', error)
      throw error
    }

    // Handle movement
    this.onMessage('move', (client, data) => {
      const player = this.state.players.get(client.sessionId)
      if (!player) return

      // Cancel current action if moving
      this.cancelAction(client.sessionId, true)

      player.x = data.x
      player.y = data.y

      // Update spatial grid position
      const gridPlayer = player as Player & { sessionId: string }
      gridPlayer.sessionId = client.sessionId
      this.playerGrid.update(gridPlayer)

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

      this.updatePlayerChunks(client.sessionId)
    })

    // Handle starting an action (chop tree, fish, etc)
    this.onMessage('startAction', (client, data: { objectId: string }) => {
      this.handleStartAction(client, data.objectId)
    })

    // Handle using an item on a world object (cooking, etc)
    this.onMessage('useItemOnObject', (client, data: { itemIndex: number; objectId: string }) => {
      this.handleUseItemOnObject(client, data.itemIndex, data.objectId)
    })

    // Handle dropping an item
    this.onMessage('dropItem', (client, data: { itemIndex: number }) => {
      this.handleDropItem(client, data.itemIndex)
    })

    // Handle opening bank
    this.onMessage('openBank', (client) => {
      this.handleOpenBank(client)
    })

    // Handle depositing item to bank
    this.onMessage('bankDeposit', (client, data: { itemIndex: number; quantity: number }) => {
      this.handleBankDeposit(client, data.itemIndex, data.quantity)
    })

    // Handle withdrawing item from bank
    this.onMessage('bankWithdraw', (client, data: { bankSlot: number; quantity: number }) => {
      this.handleBankWithdraw(client, data.bankSlot, data.quantity)
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

    // Handle attacking an NPC
    this.onMessage('attackNpc', (client, data: { npcId: string }) => {
      this.handleAttackNpc(client, data.npcId)
    })

    // Handle eating food
    this.onMessage('eatFood', (client, data: { itemIndex: number }) => {
      this.handleEatFood(client, data.itemIndex)
    })

    // Handle fleeing from combat
    this.onMessage('flee', (client) => {
      this.handleFlee(client)
    })

    // Handle setting combat style
    this.onMessage('setCombatStyle', (client, data: { style: string }) => {
      const player = this.state.players.get(client.sessionId)
      if (!player) return
      if (['accurate', 'aggressive', 'defensive'].includes(data.style)) {
        player.combatStyle = data.style
      }
    })

    // Client requests chunk resend (after handlers are ready)
    this.onMessage('requestChunks', (client) => {
      this.updatePlayerChunks(client.sessionId, true)
    })

    // Respawn tick - check for depleted objects and dead NPCs to respawn
    this.clock.setInterval(() => {
      const now = Date.now()
      this.state.worldObjects.forEach((obj: WorldObject, id: string) => {
        if (obj.depleted && obj.respawnAt > 0 && now >= obj.respawnAt) {
          obj.depleted = false
          obj.respawnAt = 0
          this.updateCachedObjectState(id)
          // Broadcast respawn to all clients
          this.broadcast('objectUpdate', { id, depleted: false })
        }
      })

      // NPC respawn
      this.state.npcs.forEach((npc: NPC) => {
        if (npc.isDead && npc.respawnAt > 0 && now >= npc.respawnAt) {
          this.respawnNpc(npc)
        }
      })
    }, 1000)

    // Combat tick - process all combat
    this.combatInterval = this.clock.setInterval(() => {
      this.processCombatTick()
    }, COMBAT_TICK_MS)

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

  // Spawn NPCs from town definitions via WorldGenerator
  private spawnNpcs() {
    let npcCount = 0

    // Spawn NPCs for chunks around the starting area
    // Thornwick is roughly at chunks -1,-1 to 1,1
    for (let chunkX = -2; chunkX <= 2; chunkX++) {
      for (let chunkY = -2; chunkY <= 2; chunkY++) {
        const spawns = this.generator.getNpcSpawnsForChunk(chunkX, chunkY)

        for (const spawn of spawns) {
          const npc = new NPC()
          npc.id = spawn.id
          npc.npcType = spawn.npcType as NpcType
          npc.x = spawn.x
          npc.y = spawn.y
          npc.spawnX = spawn.x
          npc.spawnY = spawn.y

          const def = NPC_DEFINITIONS[spawn.npcType as NpcType]
          if (def) {
            npc.currentHp = def.hitpoints
            npc.maxHp = def.hitpoints
          }
          npc.direction = Direction.DOWN

          this.state.npcs.set(npc.id, npc)
          this.npcGrid.insert(npc)
          npcCount++
        }
      }
    }

    console.log(`Spawned ${npcCount} NPCs from town definitions`)
  }

  private respawnNpc(npc: NPC) {
    const def = NPC_DEFINITIONS[npc.npcType as NpcType]
    if (!def) return

    npc.isDead = false
    npc.respawnAt = 0
    npc.currentHp = def.hitpoints
    npc.maxHp = def.hitpoints
    npc.x = npc.spawnX
    npc.y = npc.spawnY
    npc.targetId = ''
    npc.lastAttackTime = 0

    // Notify all clients
    this.broadcast('npcRespawned', { npcId: npc.id })
  }

  private handleStartAction(client: Client, objectId: string) {
    const player = this.state.players.get(client.sessionId)
    if (!player) return

    const worldObj = this.state.worldObjects.get(objectId)
    if (!worldObj || worldObj.depleted) {
      client.send('actionError', { message: 'Object not available' })
      return
    }

    // Range check before any interaction
    if (!this.isPlayerInRangeOfObject(player, worldObj)) {
      client.send('actionError', { message: 'Too far away' })
      return
    }

    // Special handling for bank booth
    if (worldObj.objectType === WorldObjectType.BANK_BOOTH) {
      this.handleOpenBank(client)
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
    this.cancelAction(client.sessionId, false)

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

    // Ensure player is still in range
    if (!this.isPlayerInRangeOfObject(player, worldObj)) {
      player.currentAction = null
      const client = this.clients.find((c) => c.sessionId === sessionId)
      client?.send('actionError', { message: 'Too far away' })
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

    // Grant item (with stacking support)
    this.addItemToInventory(player, objDef.yields, 1)

    // Mark player as having unsaved changes
    this.pendingSaves.add(sessionId)

    // Check for depletion (trees)
    if (objDef.depletionChance > 0 && Math.random() < objDef.depletionChance) {
      worldObj.depleted = true
      worldObj.respawnAt = Date.now() + objDef.respawnTime
      this.updateCachedObjectState(objectId)
      // Broadcast depletion to all clients
      this.broadcast('objectUpdate', { id: objectId, depleted: true })
    }

    // Send completion message and state update
    const client = this.clients.find((c) => c.sessionId === sessionId)
    if (client) {
      client.send('actionComplete', {
        xpGained: objDef.xpGain,
        skill: objDef.skill,
        itemGained: objDef.yields
      })

      // Send updated skills and inventory immediately
      this.sendStateUpdate(sessionId)

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

  private cancelAction(sessionId: string, notifyClient: boolean = false) {
    const timer = this.actionTimers.get(sessionId)
    if (timer) {
      clearTimeout(timer)
      this.actionTimers.delete(sessionId)
    }

    const player = this.state.players.get(sessionId)
    if (player) {
      player.currentAction = null
    }

    if (notifyClient) {
      const client = this.clients.find((c) => c.sessionId === sessionId)
      client?.send('actionCancelled', {})
    }
  }

  private updatePlayerChunks(sessionId: string, forceSend: boolean = false) {
    const player = this.state.players.get(sessionId)
    const client = this.clients.find((c) => c.sessionId === sessionId)
    if (!player || !client) return

    const { chunkX, chunkY } = this.getChunkCoordForPosition(player.x, player.y)
    const desired = this.getVisibleChunkKeys(chunkX, chunkY, CHUNK_RADIUS)
    const current = this.playerChunks.get(sessionId) ?? new Set<ChunkKey>()

    for (const key of desired) {
      if (!current.has(key)) {
        const [cx, cy] = key.split(',').map(Number)
        const chunk = this.ensureChunkLoaded(cx, cy)
        this.incrementChunkRef(key)
        client.send('chunkData', chunk)
      } else if (forceSend) {
        const [cx, cy] = key.split(',').map(Number)
        const chunk = this.ensureChunkLoaded(cx, cy)
        client.send('chunkData', chunk)
      }
    }

    for (const key of current) {
      if (!desired.has(key)) {
        this.decrementChunkRef(key)
        client.send('chunkUnload', { chunkKey: key })
      }
    }

    this.playerChunks.set(sessionId, desired)
  }

  private getChunkCoordForPosition(x: number, y: number) {
    const tile = worldToTile({ x, y })
    return {
      chunkX: Math.floor(tile.tileX / CHUNK_SIZE),
      chunkY: Math.floor(tile.tileY / CHUNK_SIZE)
    }
  }

  private getVisibleChunkKeys(centerX: number, centerY: number, radius: number): Set<ChunkKey> {
    const keys = new Set<ChunkKey>()
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const cx = centerX + dx
        const cy = centerY + dy
        keys.add(getChunkKey(cx, cy))
      }
    }
    return keys
  }

  private ensureChunkLoaded(chunkX: number, chunkY: number): ChunkData {
    const key = getChunkKey(chunkX, chunkY)
    let chunk = this.chunkCache.get(key)
    if (!chunk) {
      chunk = this.generator.generateChunk(chunkX, chunkY)
      this.chunkCache.set(key, chunk)
    }

    if (!this.chunkObjectIds.has(key)) {
      this.chunkObjectIds.set(key, new Set())
    }

    for (const objData of chunk.objects) {
      if (!this.state.worldObjects.has(objData.id)) {
        const obj = new WorldObject()
        obj.id = objData.id
        obj.objectType = objData.objectType
        obj.x = objData.x
        obj.y = objData.y
        obj.depleted = objData.depleted ?? false
        obj.respawnAt = objData.respawnAt ?? 0
        this.state.worldObjects.set(obj.id, obj)
      }
      this.objectToChunk.set(objData.id, key)
      this.chunkObjectIds.get(key)?.add(objData.id)
    }

    return chunk
  }

  private incrementChunkRef(key: ChunkKey) {
    const count = this.chunkRefCounts.get(key) ?? 0
    this.chunkRefCounts.set(key, count + 1)
  }

  private decrementChunkRef(key: ChunkKey) {
    const count = this.chunkRefCounts.get(key) ?? 0
    if (count <= 1) {
      this.chunkRefCounts.delete(key)
      this.unloadChunk(key)
    } else {
      this.chunkRefCounts.set(key, count - 1)
    }
  }

  private unloadChunk(key: ChunkKey) {
    const objectIds = this.chunkObjectIds.get(key)
    if (!objectIds) return

    const chunk = this.chunkCache.get(key)
    if (chunk) {
      for (const objId of objectIds) {
        const worldObj = this.state.worldObjects.get(objId)
        if (worldObj) {
          const chunkObj = chunk.objects.find((obj) => obj.id === objId)
          if (chunkObj) {
            chunkObj.depleted = worldObj.depleted
            chunkObj.respawnAt = worldObj.respawnAt
          }
          this.state.worldObjects.delete(objId)
        }
        this.objectToChunk.delete(objId)
      }
    }

    this.chunkObjectIds.delete(key)
  }

  private updateCachedObjectState(objectId: string) {
    const key = this.objectToChunk.get(objectId)
    if (!key) return
    const chunk = this.chunkCache.get(key)
    const worldObj = this.state.worldObjects.get(objectId)
    if (!chunk || !worldObj) return

    const obj = chunk.objects.find((entry) => entry.id === objectId)
    if (obj) {
      obj.depleted = worldObj.depleted
      obj.respawnAt = worldObj.respawnAt
    }
  }

  private isPlayerInRangeOfObject(player: Player, worldObj: WorldObject, range: number = 1) {
    const playerTile = worldToTile({ x: player.x, y: player.y })
    const objTile = worldToTile({ x: worldObj.x, y: worldObj.y })
    return (
      Math.abs(playerTile.tileX - objTile.tileX) <= range &&
      Math.abs(playerTile.tileY - objTile.tileY) <= range
    )
  }

  /**
   * Send current skills and inventory state to client via message.
   * More reliable than schema sync for instant UI updates.
   */
  private sendStateUpdate(sessionId: string) {
    const player = this.state.players.get(sessionId)
    const client = this.clients.find((c) => c.sessionId === sessionId)
    if (!player || !client) return

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

    client.send('stateUpdate', {
      skills: skillsData,
      inventory: inventoryData
    })
  }

  /**
   * Add an item to player inventory with stacking support
   * Returns true if item was added, false if inventory is full
   */
  private addItemToInventory(player: Player, itemType: ItemType, quantity: number = 1): boolean {
    const itemDef = ITEM_DEFINITIONS[itemType]
    if (!itemDef) return false

    // If stackable, try to find existing stack
    if (itemDef.stackable) {
      for (const item of player.inventory) {
        if (item.itemType === itemType) {
          item.quantity += quantity
          return true
        }
      }
    }

    // No existing stack or not stackable - add new slot
    if (player.inventory.length >= MAX_INVENTORY_SIZE) {
      return false // Inventory full
    }

    const item = new InventoryItem()
    item.itemType = itemType
    item.quantity = quantity
    player.inventory.push(item)
    return true
  }

  private handleUseItemOnObject(client: Client, itemIndex: number, objectId: string) {
    const player = this.state.players.get(client.sessionId)
    if (!player) return

    // Validate item index
    if (itemIndex < 0 || itemIndex >= player.inventory.length) {
      client.send('actionError', { message: 'Invalid item' })
      return
    }

    const item = player.inventory[itemIndex]
    const worldObj = this.state.worldObjects.get(objectId)
    if (!worldObj || worldObj.depleted) {
      client.send('actionError', { message: 'Object not available' })
      return
    }

    // Check if this is a cooking action (fire + raw fish)
    if (worldObj.objectType === WorldObjectType.FIRE) {
      this.handleCooking(client, player, itemIndex, item.itemType as ItemType)
      return
    }

    client.send('actionError', { message: "Can't use that here" })
  }

  private handleCooking(client: Client, player: Player, itemIndex: number, rawItemType: ItemType) {
    // Find the cooking recipe for this item
    const recipe = COOKING_RECIPES.find((r) => r.raw === rawItemType)
    if (!recipe) {
      client.send('actionError', { message: "Can't cook that" })
      return
    }

    // Check cooking level
    const cookingXp = player.skills.get(SkillType.COOKING)?.xp || 0
    const cookingLevel = getLevelFromXp(cookingXp)
    if (cookingLevel < recipe.levelRequired) {
      client.send('actionError', {
        message: `Need level ${recipe.levelRequired} Cooking`
      })
      return
    }

    // Cancel any existing action
    this.cancelAction(client.sessionId)

    // Start cooking action
    const action = new CurrentAction()
    action.actionType = SkillType.COOKING
    action.targetId = `cook_${itemIndex}`
    action.startTime = Date.now()
    action.duration = 1800 // cooking takes 1.8 seconds
    player.currentAction = action

    // Notify client that cooking started
    client.send('actionStarted', {
      duration: 1800,
      action: 'Cook'
    })

    // Set timer for cooking completion
    const timer = setTimeout(() => {
      this.completeCooking(client.sessionId, itemIndex, recipe)
    }, 1800)
    this.actionTimers.set(client.sessionId, timer)
  }

  private completeCooking(
    sessionId: string,
    itemIndex: number,
    recipe: (typeof COOKING_RECIPES)[0]
  ) {
    const player = this.state.players.get(sessionId)
    if (!player || !player.currentAction) return

    // Verify item still exists at that index
    if (itemIndex >= player.inventory.length) {
      player.currentAction = null
      return
    }

    const item = player.inventory[itemIndex]
    if (item.itemType !== recipe.raw) {
      player.currentAction = null
      return
    }

    // Calculate burn chance
    const cookingXp = player.skills.get(SkillType.COOKING)?.xp || 0
    const cookingLevel = getLevelFromXp(cookingXp)
    const burnChance = getBurnChance(cookingLevel, recipe)
    const burned = Math.random() < burnChance

    // Transform the item
    item.itemType = burned ? ItemType.BURNT_FISH : recipe.cooked

    // Grant XP (even if burned, but less)
    const skillData = player.skills.get(SkillType.COOKING)
    if (skillData) {
      const oldLevel = getLevelFromXp(skillData.xp)
      skillData.xp += burned ? Math.floor(recipe.xpGain * 0.1) : recipe.xpGain
      const newLevel = getLevelFromXp(skillData.xp)

      if (newLevel > oldLevel) {
        this.broadcast('levelUp', {
          playerName: player.name,
          skill: SkillType.COOKING,
          newLevel
        })
      }
    }

    // Mark for save
    this.pendingSaves.add(sessionId)

    // Send completion message
    const client = this.clients.find((c) => c.sessionId === sessionId)
    if (client) {
      client.send('actionComplete', {
        xpGained: burned ? Math.floor(recipe.xpGain * 0.1) : recipe.xpGain,
        skill: SkillType.COOKING,
        itemGained: burned ? ItemType.BURNT_FISH : recipe.cooked
      })

      // Send updated skills and inventory immediately
      this.sendStateUpdate(sessionId)
    }

    player.currentAction = null
  }

  private handleDropItem(client: Client, itemIndex: number) {
    const player = this.state.players.get(client.sessionId)
    if (!player) return

    // Validate item index
    if (itemIndex < 0 || itemIndex >= player.inventory.length) {
      client.send('actionError', { message: 'Invalid item' })
      return
    }

    // Remove item from inventory
    const droppedItem = player.inventory[itemIndex]
    player.inventory.splice(itemIndex, 1)

    // Mark for save
    this.pendingSaves.add(client.sessionId)

    // Notify client
    client.send('itemDropped', {
      itemType: droppedItem.itemType,
      quantity: droppedItem.quantity
    })

    // Send updated inventory immediately
    this.sendStateUpdate(client.sessionId)

    // TODO: In the future, spawn ground item that others can pick up
    // For now, items are just destroyed when dropped
  }

  private handleOpenBank(client: Client) {
    const bank = this.playerBanks.get(client.sessionId) || []
    client.send('bankOpened', { items: bank })
  }

  private handleBankDeposit(client: Client, itemIndex: number, quantity: number) {
    const player = this.state.players.get(client.sessionId)
    if (!player) return

    // Validate item index
    if (itemIndex < 0 || itemIndex >= player.inventory.length) {
      client.send('actionError', { message: 'Invalid item' })
      return
    }

    const inventoryItem = player.inventory[itemIndex]
    const actualQuantity = Math.min(quantity, inventoryItem.quantity)
    if (actualQuantity <= 0) return

    // Get or create bank
    let bank = this.playerBanks.get(client.sessionId)
    if (!bank) {
      bank = []
      this.playerBanks.set(client.sessionId, bank)
    }

    const itemDef = ITEM_DEFINITIONS[inventoryItem.itemType as ItemType]

    // If stackable, try to find existing stack in bank
    if (itemDef?.stackable) {
      const existingSlot = bank.find((b) => b.itemType === inventoryItem.itemType)
      if (existingSlot) {
        existingSlot.quantity += actualQuantity
      } else if (bank.length < MAX_BANK_SIZE) {
        bank.push({ itemType: inventoryItem.itemType, quantity: actualQuantity })
      } else {
        client.send('actionError', { message: 'Bank is full' })
        return
      }
    } else {
      // Non-stackable: add each item as separate slot
      if (bank.length >= MAX_BANK_SIZE) {
        client.send('actionError', { message: 'Bank is full' })
        return
      }
      bank.push({ itemType: inventoryItem.itemType, quantity: actualQuantity })
    }

    // Remove from inventory
    if (inventoryItem.quantity <= actualQuantity) {
      player.inventory.splice(itemIndex, 1)
    } else {
      inventoryItem.quantity -= actualQuantity
    }

    // Mark for save
    this.pendingSaves.add(client.sessionId)

    // Send updated bank and inventory to client
    client.send('bankOpened', { items: bank })
    this.sendStateUpdate(client.sessionId)
  }

  private handleBankWithdraw(client: Client, bankSlot: number, quantity: number) {
    const player = this.state.players.get(client.sessionId)
    if (!player) return

    const bank = this.playerBanks.get(client.sessionId)
    if (!bank || bankSlot < 0 || bankSlot >= bank.length) {
      client.send('actionError', { message: 'Invalid bank slot' })
      return
    }

    const bankItem = bank[bankSlot]
    const actualQuantity = Math.min(quantity, bankItem.quantity)
    if (actualQuantity <= 0) return

    // Try to add to inventory
    const itemDef = ITEM_DEFINITIONS[bankItem.itemType as ItemType]

    // If stackable, try to find existing stack in inventory
    if (itemDef?.stackable) {
      let existingItem: InventoryItem | undefined
      for (const item of player.inventory) {
        if (item.itemType === bankItem.itemType) {
          existingItem = item
          break
        }
      }

      if (existingItem) {
        existingItem.quantity += actualQuantity
      } else if (player.inventory.length < MAX_INVENTORY_SIZE) {
        const newItem = new InventoryItem()
        newItem.itemType = bankItem.itemType
        newItem.quantity = actualQuantity
        player.inventory.push(newItem)
      } else {
        client.send('actionError', { message: 'Inventory full' })
        return
      }
    } else {
      // Non-stackable
      if (player.inventory.length >= MAX_INVENTORY_SIZE) {
        client.send('actionError', { message: 'Inventory full' })
        return
      }
      const newItem = new InventoryItem()
      newItem.itemType = bankItem.itemType
      newItem.quantity = actualQuantity
      player.inventory.push(newItem)
    }

    // Remove from bank
    if (bankItem.quantity <= actualQuantity) {
      bank.splice(bankSlot, 1)
    } else {
      bankItem.quantity -= actualQuantity
    }

    // Mark for save
    this.pendingSaves.add(client.sessionId)

    // Send updated bank and inventory to client
    client.send('bankOpened', { items: bank })
    this.sendStateUpdate(client.sessionId)
  }

  // Combat methods
  private handleAttackNpc(client: Client, npcId: string) {
    const player = this.state.players.get(client.sessionId)
    if (!player) return

    const npc = this.state.npcs.get(npcId)
    if (!npc || npc.isDead) {
      client.send('actionError', { message: 'Target not available' })
      return
    }

    // Client validates adjacency before sending - update server position to be adjacent to NPC
    // This fixes the stale position issue since we only track start of movement
    const npcTile = worldToTile({ x: npc.x, y: npc.y })
    const adjacentPos = tileToWorld({ tileX: npcTile.tileX, tileY: npcTile.tileY + 1 })
    player.x = adjacentPos.x
    player.y = adjacentPos.y

    // Cancel any existing skilling action
    this.cancelAction(client.sessionId)

    // Start combat
    player.combatTargetId = npcId

    // NPC retaliates
    if (!npc.targetId) {
      npc.targetId = client.sessionId
    }

    client.send('combatStarted', { targetId: npcId })
  }

  private handleEatFood(client: Client, itemIndex: number) {
    const player = this.state.players.get(client.sessionId)
    if (!player) return

    // Validate item index
    if (itemIndex < 0 || itemIndex >= player.inventory.length) {
      client.send('actionError', { message: 'Invalid item' })
      return
    }

    const item = player.inventory[itemIndex]
    const healAmount = FOOD_HEALING[item.itemType as ItemType]

    if (healAmount === undefined) {
      client.send('actionError', { message: "That's not food" })
      return
    }

    // Already at full HP
    if (player.currentHp >= player.maxHp) {
      client.send('actionError', { message: 'Already at full health' })
      return
    }

    // Consume the food
    if (item.quantity > 1) {
      item.quantity -= 1
    } else {
      player.inventory.splice(itemIndex, 1)
    }

    // Heal
    const oldHp = player.currentHp
    player.currentHp = Math.min(player.currentHp + healAmount, player.maxHp)
    const actualHeal = player.currentHp - oldHp

    // Mark for save
    this.pendingSaves.add(client.sessionId)

    // Notify client
    client.send('healthUpdate', {
      currentHp: player.currentHp,
      maxHp: player.maxHp,
      healAmount: actualHeal
    })

    this.sendStateUpdate(client.sessionId)
  }

  private handleFlee(client: Client) {
    const player = this.state.players.get(client.sessionId)
    if (!player) return

    // Clear combat target
    player.combatTargetId = ''

    // If an NPC was targeting this player, clear its target
    this.state.npcs.forEach((npc: NPC) => {
      if (npc.targetId === client.sessionId) {
        npc.targetId = ''
      }
    })

    client.send('combatEnded', {})
  }

  private processCombatTick() {
    const now = Date.now()

    // Process player attacks on NPCs
    this.state.players.forEach((player: Player, sessionId: string) => {
      if (!player.combatTargetId) return

      const npc = this.state.npcs.get(player.combatTargetId)
      if (!npc || npc.isDead) {
        player.combatTargetId = ''
        const client = this.clients.find((c) => c.sessionId === sessionId)
        client?.send('combatEnded', {})
        return
      }

      // Check if enough time has passed for next attack (4 ticks = 2.4s for players)
      if (now - player.lastAttackTime < COMBAT_TICK_MS * 4) return
      player.lastAttackTime = now

      // Get player combat stats
      const attackXp = player.skills.get(SkillType.ATTACK)?.xp || 0
      const strengthXp = player.skills.get(SkillType.STRENGTH)?.xp || 0
      const attackLevel = getLevelFromXp(attackXp)
      const strengthLevel = getLevelFromXp(strengthXp)

      const npcDef = NPC_DEFINITIONS[npc.npcType as NpcType]
      if (!npcDef) return

      // Roll to hit
      const didHit = calculateHitChance(attackLevel, strengthLevel, npcDef.defenceLevel)

      let damage = 0
      if (didHit) {
        const maxHit = calculateMaxHit(strengthLevel)
        damage = rollDamage(maxHit)
      }

      // Apply damage
      npc.currentHp = Math.max(0, npc.currentHp - damage)

      // Grant XP
      if (damage > 0) {
        const xpResult = calculateCombatXp(damage, player.combatStyle as CombatStyle)

        // Grant combat skill XP
        const combatSkillData = player.skills.get(xpResult.skill)
        if (combatSkillData) {
          const oldLevel = getLevelFromXp(combatSkillData.xp)
          combatSkillData.xp += xpResult.combatXp
          const newLevel = getLevelFromXp(combatSkillData.xp)

          if (newLevel > oldLevel) {
            this.broadcast('levelUp', {
              playerName: player.name,
              skill: xpResult.skill,
              newLevel
            })
          }
        }

        // Grant hitpoints XP
        const hpSkillData = player.skills.get(SkillType.HITPOINTS)
        if (hpSkillData) {
          const oldLevel = getLevelFromXp(hpSkillData.xp)
          hpSkillData.xp += Math.floor(xpResult.hitpointsXp)
          const newLevel = getLevelFromXp(hpSkillData.xp)

          // Update max HP
          player.maxHp = calculateMaxHp(newLevel)

          if (newLevel > oldLevel) {
            this.broadcast('levelUp', {
              playerName: player.name,
              skill: SkillType.HITPOINTS,
              newLevel
            })
          }
        }

        this.pendingSaves.add(sessionId)
      }

      // Notify clients of hit
      const client = this.clients.find((c) => c.sessionId === sessionId)
      client?.send('combatHit', {
        attackerId: sessionId,
        targetId: npc.id,
        damage,
        targetHp: npc.currentHp,
        targetMaxHp: npc.maxHp
      })

      // Check if NPC died
      if (npc.currentHp <= 0) {
        this.handleNpcDeath(npc, sessionId)
      }
    })

    // Process NPC attacks on players
    this.state.npcs.forEach((npc: NPC) => {
      if (npc.isDead || !npc.targetId) return

      const player = this.state.players.get(npc.targetId)
      if (!player) {
        npc.targetId = ''
        return
      }

      const npcDef = NPC_DEFINITIONS[npc.npcType as NpcType]
      if (!npcDef) return

      // Check distance - if too far, NPC should chase or lose aggro
      const playerTile = worldToTile({ x: player.x, y: player.y })
      const npcTile = worldToTile({ x: npc.x, y: npc.y })
      const dx = Math.abs(playerTile.tileX - npcTile.tileX)
      const dy = Math.abs(playerTile.tileY - npcTile.tileY)
      const distance = Math.max(dx, dy)

      // If too far from spawn, leash back
      const spawnTile = worldToTile({ x: npc.spawnX, y: npc.spawnY })
      const distFromSpawn = Math.max(
        Math.abs(npcTile.tileX - spawnTile.tileX),
        Math.abs(npcTile.tileY - spawnTile.tileY)
      )

      if (distFromSpawn > npc.leashRange) {
        npc.targetId = ''
        npc.x = npc.spawnX
        npc.y = npc.spawnY
        return
      }

      // Can only attack if adjacent
      if (distance > 1) {
        // TODO: NPC movement towards player
        return
      }

      // Check attack cooldown
      if (now - npc.lastAttackTime < COMBAT_TICK_MS * npcDef.attackSpeed) return
      npc.lastAttackTime = now

      // Get player defence level
      const defenceXp = player.skills.get(SkillType.DEFENCE)?.xp || 0
      const defenceLevel = getLevelFromXp(defenceXp)

      // Roll to hit
      const didHit = calculateHitChance(npcDef.attackLevel, npcDef.strengthLevel, defenceLevel)

      let damage = 0
      if (didHit) {
        damage = rollDamage(npcDef.maxHit)
      }

      // Apply damage
      player.currentHp = Math.max(0, player.currentHp - damage)

      // Notify clients of hit
      const client = this.clients.find((c) => c.sessionId === npc.targetId)
      client?.send('combatHit', {
        attackerId: npc.id,
        targetId: npc.targetId,
        damage,
        targetHp: player.currentHp,
        targetMaxHp: player.maxHp
      })

      // Check if player died
      if (player.currentHp <= 0) {
        this.handlePlayerDeath(npc.targetId)
      }
    })

    // Check for aggressive NPCs to aggro nearby players
    // Uses spatial hash grid for O(1) lookups instead of O(n*m)
    this.state.npcs.forEach((npc: NPC) => {
      if (npc.isDead || npc.targetId) return

      const npcDef = NPC_DEFINITIONS[npc.npcType as NpcType]
      if (!npcDef || npcDef.aggroRange <= 0) return

      // Query players within aggro range using spatial grid
      const aggroRangeWorld = npcDef.aggroRange * TILE_SIZE
      const nearbyPlayers = this.playerGrid.queryRadius(npc.x, npc.y, aggroRangeWorld)

      if (nearbyPlayers.length === 0) return

      // Find nearest among nearby players
      let nearestSessionId: string | null = null
      let nearestDistanceSq = Infinity

      for (const player of nearbyPlayers) {
        const dx = player.x - npc.x
        const dy = player.y - npc.y
        const distSq = dx * dx + dy * dy

        if (distSq < nearestDistanceSq) {
          nearestSessionId = player.sessionId
          nearestDistanceSq = distSq
        }
      }

      if (nearestSessionId) {
        npc.targetId = nearestSessionId

        // Notify the player they're being attacked
        const client = this.clients.find((c) => c.sessionId === nearestSessionId)
        client?.send('npcAggro', { npcId: npc.id })
      }
    })
  }

  private handleNpcDeath(npc: NPC, killerSessionId: string) {
    const npcDef = NPC_DEFINITIONS[npc.npcType as NpcType]
    if (!npcDef) return

    npc.isDead = true
    npc.respawnAt = Date.now() + npcDef.respawnTime
    npc.targetId = ''
    npc.currentHp = 0

    // Roll drops
    const drops = rollDrops(npc.npcType as NpcType)

    // Add drops to killer's inventory
    const player = this.state.players.get(killerSessionId)
    if (player) {
      for (const drop of drops) {
        this.addItemToInventory(player, drop.item, drop.quantity)
      }
      this.pendingSaves.add(killerSessionId)
      this.sendStateUpdate(killerSessionId)
    }

    // Clear player's combat target
    if (player) {
      player.combatTargetId = ''
    }

    // Notify all clients
    this.broadcast('npcDied', {
      npcId: npc.id,
      killerName: player?.name || 'Unknown',
      drops: drops.map((d) => ({ itemType: d.item, quantity: d.quantity }))
    })

    // Notify killer specifically
    const client = this.clients.find((c) => c.sessionId === killerSessionId)
    client?.send('combatEnded', {})
  }

  private handlePlayerDeath(sessionId: string) {
    const player = this.state.players.get(sessionId)
    if (!player) return

    // Clear combat state
    player.combatTargetId = ''

    // Clear any NPC targeting this player
    this.state.npcs.forEach((npc: NPC) => {
      if (npc.targetId === sessionId) {
        npc.targetId = ''
      }
    })

    // Respawn at spawn point with full HP
    const spawnPos = tileToWorld(SPAWN_POINT)
    player.x = spawnPos.x
    player.y = spawnPos.y

    const hitpointsXp = player.skills.get(SkillType.HITPOINTS)?.xp || 0
    const hitpointsLevel = getLevelFromXp(hitpointsXp)
    player.maxHp = calculateMaxHp(hitpointsLevel)
    player.currentHp = player.maxHp

    // Cancel any action
    this.cancelAction(sessionId)

    // Notify client
    const client = this.clients.find((c) => c.sessionId === sessionId)
    client?.send('playerDied', {
      respawnX: player.x,
      respawnY: player.y,
      currentHp: player.currentHp,
      maxHp: player.maxHp
    })

    // Broadcast death to all
    this.broadcast('chat', {
      sender: 'System',
      text: `${player.name} has died!`
    })
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

      // Save bank
      const bank = this.playerBanks.get(sessionId) || []
      await savePlayerBank(playerId, bank)

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

    // Add player to spatial grid for efficient aggro queries
    const gridPlayer = player as Player & { sessionId: string }
    gridPlayer.sessionId = client.sessionId
    this.playerGrid.insert(gridPlayer)

    // Set initial HP based on hitpoints level
    const hitpointsXp = player.skills.get(SkillType.HITPOINTS)?.xp || 0
    const hitpointsLevel = getLevelFromXp(hitpointsXp)
    player.maxHp = calculateMaxHp(hitpointsLevel)
    player.currentHp = player.maxHp

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
      inventory: [],
      currentHp: player.currentHp,
      maxHp: player.maxHp
    })

    // Send initial chunks to the newly joined client
    this.updatePlayerChunks(client.sessionId, true)

    // Send NPCs to the newly joined client
    const npcsData: Array<{
      id: string
      npcType: string
      x: number
      y: number
      currentHp: number
      maxHp: number
      isDead: boolean
    }> = []
    this.state.npcs.forEach((npc: NPC, id: string) => {
      npcsData.push({
        id,
        npcType: npc.npcType,
        x: npc.x,
        y: npc.y,
        currentHp: npc.currentHp,
        maxHp: npc.maxHp,
        isDead: npc.isDead
      })
    })
    client.send('npcs', npcsData)

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

      // Load bank from database
      if (playerData.bank && playerData.bank.length > 0) {
        this.playerBanks.set(sessionId, [...playerData.bank])
        console.log('Loaded player bank from DB for:', username)
      }

      // Update HP based on hitpoints level from DB
      const hitpointsXp = player.skills.get(SkillType.HITPOINTS)?.xp || 0
      const hitpointsLevel = getLevelFromXp(hitpointsXp)
      player.maxHp = calculateMaxHp(hitpointsLevel)
      player.currentHp = player.maxHp

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
          inventory: inventoryData,
          currentHp: player.currentHp,
          maxHp: player.maxHp
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

    // Remove from spatial grid
    if (player) {
      this.playerGrid.remove(player as Player & { sessionId: string })
    }

    this.cancelAction(client.sessionId)
    this.pendingSaves.delete(client.sessionId)
    this.playerDbIds.delete(client.sessionId)
    this.playerBanks.delete(client.sessionId)
    const chunks = this.playerChunks.get(client.sessionId)
    if (chunks) {
      for (const key of chunks) {
        this.decrementChunkRef(key)
      }
      this.playerChunks.delete(client.sessionId)
    }
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

    // Clear combat interval
    if (this.combatInterval) {
      this.combatInterval.clear()
      this.combatInterval = null
    }

    console.log('WorldRoom disposed')
  }
}
