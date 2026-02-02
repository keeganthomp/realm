import { Room, Client } from '@colyseus/core'
import { WorldState } from '../schemas/WorldState'
import { Player, SkillData, InventoryItem, CurrentAction, EquippedItem } from '../schemas/Player'
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
  ActionCategory,
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
  TILE_SIZE,
  EquipmentSlot,
  isEquippable,
  getEquipmentDefinition,
  getEquipmentSlot,
  isTwoHanded,
  getEquipmentRequirements,
  calculateTotalBonuses,
  StatType,
  AchievementType,
  ACHIEVEMENT_DEFINITIONS,
  getAchievementsForStat,
  getSkillLevelAchievements,
  checkStatAchievement,
  checkSkillAchievement,
  getDailyChallenges,
  getTimeUntilReset,
  getRiftById,
  getActiveRifts,
  calculateMaxStability,
  calculateDrainRate,
  getExpeditionTier,
  Expedition,
  VeilRift,
  getVeilCreaturesForTier,
  isVeilCreature,
  getStabilityDrain
} from '@realm/shared'
import type { ChunkData, ChunkKey } from '@realm/shared'
import { WorldGenerator } from '../world/WorldGenerator'
import {
  getOrCreatePlayer,
  savePlayerSkills,
  savePlayerInventory,
  savePlayerBank,
  savePlayerEquipment,
  getPlayerStats,
  incrementPlayerStat,
  getPlayerAchievements,
  grantAchievement,
  getPlayerCosmetics,
  setPlayerCosmetics,
  initPlayerDailyChallenges,
  updateChallengeProgress,
  claimChallengeReward
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

  // Player stats cache (in-memory for performance, persisted to DB periodically)
  private playerStats: Map<string, Map<StatType, number>> = new Map()
  private playerAchievements: Map<string, Set<AchievementType>> = new Map()
  private playerCosmetics: Map<string, { activeTitle: string | null; activeBadge: string | null }> = new Map()
  // Daily challenge progress: sessionId -> Map<challengeIndex, {progress, completed, claimed}>
  private playerChallengeProgress: Map<string, Map<number, { progress: number; completed: boolean; claimed: boolean }>> = new Map()

  // Active expeditions: sessionId -> Expedition
  private activeExpeditions: Map<string, Expedition> = new Map()
  // Expedition stability drain intervals
  private expeditionIntervals: Map<string, NodeJS.Timeout> = new Map()
  // Veil NPCs spawned for each expedition: sessionId -> Set of NPC IDs
  private expeditionNpcs: Map<string, Set<string>> = new Map()

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

    // Handle buying from shop
    this.onMessage('shopBuy', (client, data: { shopId: string; itemType: string; quantity: number }) => {
      this.handleShopBuy(client, data.shopId, data.itemType as ItemType, data.quantity)
    })

    // Handle selling to shop
    this.onMessage('shopSell', (client, data: { shopId: string; itemIndex: number; quantity: number }) => {
      this.handleShopSell(client, data.shopId, data.itemIndex, data.quantity)
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

    // Handle Veil expedition extraction
    this.onMessage('extractExpedition', (client) => {
      this.voluntaryExtractExpedition(client.sessionId)
    })

    // Handle setting combat style
    this.onMessage('setCombatStyle', (client, data: { style: string }) => {
      const player = this.state.players.get(client.sessionId)
      if (!player) return
      if (['accurate', 'aggressive', 'defensive'].includes(data.style)) {
        player.combatStyle = data.style
      }
    })

    // Handle claiming daily challenge reward
    this.onMessage('claimChallengeReward', (client, data: { challengeIndex: number }) => {
      this.handleClaimChallengeReward(client, data.challengeIndex)
    })

    // Handle setting active title
    this.onMessage('setActiveTitle', (client, data: { title: string | null }) => {
      this.handleSetActiveTitle(client, data.title)
    })

    // Handle setting active badge
    this.onMessage('setActiveBadge', (client, data: { badge: string | null }) => {
      this.handleSetActiveBadge(client, data.badge)
    })

    // Handle equipping an item
    this.onMessage('equipItem', (client, data: { inventoryIndex: number }) => {
      this.handleEquipItem(client, data.inventoryIndex)
    })

    // Handle unequipping an item
    this.onMessage('unequipItem', (client, data: { slot: string }) => {
      this.handleUnequipItem(client, data.slot as EquipmentSlot)
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

    console.log(`[Action] Player ${player.name} starting action on object: ${objectId}`)

    const worldObj = this.state.worldObjects.get(objectId)
    if (!worldObj) {
      console.log(`[Action] Object not found: ${objectId}`)
      console.log(`[Action] Available objects: ${Array.from(this.state.worldObjects.keys()).slice(0, 10).join(', ')}...`)
      client.send('actionError', { message: 'Object not found' })
      return
    }

    console.log(`[Action] Found object type: ${worldObj.objectType}`)

    // Range check before any interaction
    if (!this.isPlayerInRangeOfObject(player, worldObj)) {
      client.send('actionError', { message: 'Too far away' })
      return
    }

    const objDef = WORLD_OBJECT_DEFINITIONS[worldObj.objectType as WorldObjectType]
    if (!objDef) {
      console.log(`[Action] No definition for object type: ${worldObj.objectType}`)
      return
    }

    console.log(`[Action] Action category: ${objDef.actionCategory}`)

    // Route by action category
    switch (objDef.actionCategory) {
      case ActionCategory.BANK:
        this.handleOpenBank(client)
        return

      case ActionCategory.SHOP:
        this.handleOpenShop(client, objDef.shopId || 'general_store')
        return

      case ActionCategory.EXAMINE:
      case ActionCategory.READ:
        // Send examine/read text to client - no inventory/skill checks
        client.send('examineResult', {
          objectId,
          name: objDef.name,
          text: objDef.examineText || `A ${objDef.name.toLowerCase()}.`,
          isReadable: objDef.actionCategory === ActionCategory.READ
        })
        return

      case ActionCategory.NONE:
        // No interaction for purely decorative objects
        return

      case ActionCategory.VEIL:
        // Veil rift - enter expedition
        this.handleEnterRift(client, objectId)
        return

      case ActionCategory.SKILL:
        // Skill actions require additional checks
        break

      default:
        return
    }

    // === SKILL ACTION HANDLING ===

    // Check if object is depleted (only relevant for skill objects)
    if (worldObj.depleted) {
      client.send('actionError', { message: 'Object not available' })
      return
    }

    // Check level requirement
    const skill = objDef.skill!
    const skillXp = player.skills.get(skill)?.xp || 0
    const playerLevel = getLevelFromXp(skillXp)
    if (playerLevel < (objDef.levelRequired || 1)) {
      client.send('actionError', {
        message: `Need level ${objDef.levelRequired} ${skill}`
      })
      return
    }

    // Check inventory space (except for cooking which transforms items)
    if (skill !== SkillType.COOKING && player.inventory.length >= MAX_INVENTORY_SIZE) {
      client.send('actionError', { message: 'Inventory full' })
      return
    }

    // Cancel any existing action
    this.cancelAction(client.sessionId, false)

    // Start the action
    const action = new CurrentAction()
    action.actionType = skill
    action.targetId = objectId
    action.startTime = Date.now()
    action.duration = objDef.actionTime || 0
    player.currentAction = action

    // Set timer for action completion
    const timer = setTimeout(() => {
      this.completeAction(client.sessionId)
    }, objDef.actionTime || 0)
    this.actionTimers.set(client.sessionId, timer)

    client.send('actionStarted', {
      objectId,
      duration: objDef.actionTime || 0,
      action: objDef.action
    })
  }

  private handleOpenShop(client: Client, shopId: string) {
    // Send shop data to client
    const shopData = this.getShopData(shopId)
    client.send('openShop', {
      shopId,
      name: shopData.name,
      items: shopData.items
    })
  }

  private getShopData(shopId: string): { name: string; items: { itemType: ItemType; price: number; stock: number }[] } {
    // Shop inventories
    const shops: Record<string, { name: string; items: { itemType: ItemType; price: number; stock: number }[] }> = {
      food_stall: {
        name: 'Food Stall',
        items: [
          { itemType: ItemType.COOKED_SHRIMP, price: 15, stock: 10 },
          { itemType: ItemType.COOKED_CHICKEN, price: 15, stock: 10 },
          { itemType: ItemType.COOKED_BEEF, price: 15, stock: 10 },
          { itemType: ItemType.COOKED_TROUT, price: 50, stock: 5 }
        ]
      },
      weapons_stall: {
        name: 'Weapons Stall',
        items: [
          { itemType: ItemType.BRONZE_SWORD, price: 26, stock: 5 },
          { itemType: ItemType.BRONZE_SHIELD, price: 32, stock: 5 },
          { itemType: ItemType.BRONZE_HELMET, price: 24, stock: 5 },
          { itemType: ItemType.BRONZE_CHESTPLATE, price: 80, stock: 3 },
          { itemType: ItemType.BRONZE_LEGS, price: 52, stock: 3 },
          { itemType: ItemType.IRON_SWORD, price: 91, stock: 3 },
          { itemType: ItemType.IRON_SHIELD, price: 112, stock: 3 }
        ]
      },
      general_store: {
        name: 'General Store',
        items: [
          { itemType: ItemType.FISHING_BAIT, price: 5, stock: 100 },
          { itemType: ItemType.FEATHERS, price: 3, stock: 100 }
        ]
      },
      fish_stall: {
        name: 'Fish Stall',
        items: [
          { itemType: ItemType.RAW_SHRIMP, price: 8, stock: 20 },
          { itemType: ItemType.RAW_TROUT, price: 30, stock: 10 },
          { itemType: ItemType.FISHING_BAIT, price: 5, stock: 50 }
        ]
      }
    }
    return shops[shopId] || { name: 'Shop', items: [] }
  }

  private handleShopBuy(client: Client, shopId: string, itemType: ItemType, quantity: number) {
    const player = this.state.players.get(client.sessionId)
    if (!player) return

    const shop = this.getShopData(shopId)
    const shopItem = shop.items.find(i => i.itemType === itemType)

    if (!shopItem) {
      client.send('shopError', { message: 'Item not sold here' })
      return
    }

    // Check if player has enough gold
    const totalCost = shopItem.price * quantity
    const coinsIndex = player.inventory.toArray().findIndex(
      item => item && item.itemType === ItemType.COINS
    )

    if (coinsIndex === -1) {
      client.send('shopError', { message: 'You need coins to buy items' })
      return
    }

    const coinsItem = player.inventory[coinsIndex]
    if (coinsItem.quantity < totalCost) {
      client.send('shopError', { message: 'Not enough coins' })
      return
    }

    // Check inventory space
    const itemDef = ITEM_DEFINITIONS[itemType]
    if (!itemDef) return

    if (itemDef.stackable) {
      // Stackable items can go into existing stack
      const existingIndex = player.inventory.toArray().findIndex(
        item => item && item.itemType === itemType
      )
      if (existingIndex === -1 && player.inventory.length >= MAX_INVENTORY_SIZE) {
        client.send('shopError', { message: 'Inventory full' })
        return
      }
    } else {
      // Non-stackable items need slots for each
      const emptySlots = MAX_INVENTORY_SIZE - player.inventory.length
      if (emptySlots < quantity) {
        client.send('shopError', { message: 'Not enough inventory space' })
        return
      }
    }

    // Deduct gold
    coinsItem.quantity -= totalCost
    if (coinsItem.quantity <= 0) {
      player.inventory.splice(coinsIndex, 1)
    }

    // Add items to inventory
    this.addItemToInventory(player, itemType, quantity)

    // Mark for save
    this.pendingSaves.add(client.sessionId)

    // Send confirmation
    client.send('shopBuySuccess', {
      itemType,
      quantity,
      totalCost
    })
  }

  private handleShopSell(client: Client, shopId: string, itemIndex: number, quantity: number) {
    const player = this.state.players.get(client.sessionId)
    if (!player) return

    if (itemIndex < 0 || itemIndex >= player.inventory.length) {
      client.send('shopError', { message: 'Invalid item' })
      return
    }

    const item = player.inventory[itemIndex]
    if (!item) return

    const itemDef = ITEM_DEFINITIONS[item.itemType as ItemType]
    if (!itemDef) return

    // Calculate sell price (half of buy value)
    const sellPrice = Math.floor(itemDef.value * quantity / 2)

    // Remove items from inventory
    if (item.quantity <= quantity) {
      player.inventory.splice(itemIndex, 1)
    } else {
      item.quantity -= quantity
    }

    // Add gold to inventory
    this.addItemToInventory(player, ItemType.COINS, sellPrice)

    // Mark for save
    this.pendingSaves.add(client.sessionId)

    // Send confirmation
    client.send('shopSellSuccess', {
      itemType: item.itemType,
      quantity,
      goldReceived: sellPrice
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
    if (!objDef || objDef.actionCategory !== ActionCategory.SKILL) {
      player.currentAction = null
      return
    }

    // Ensure we have skill data for this object
    const skill = objDef.skill!
    const xpGain = objDef.xpGain || 0
    const yields = objDef.yields!
    const depletionChance = objDef.depletionChance || 0
    const respawnTime = objDef.respawnTime || 0

    // Ensure player is still in range
    if (!this.isPlayerInRangeOfObject(player, worldObj)) {
      player.currentAction = null
      const client = this.clients.find((c) => c.sessionId === sessionId)
      client?.send('actionError', { message: 'Too far away' })
      return
    }

    // Grant XP
    const skillData = player.skills.get(skill)
    if (skillData) {
      const oldLevel = getLevelFromXp(skillData.xp)
      skillData.xp += Math.floor(xpGain)
      const newLevel = getLevelFromXp(skillData.xp)

      // Level up notification
      if (newLevel > oldLevel) {
        this.broadcast('levelUp', {
          playerName: player.name,
          skill,
          newLevel
        })
        // Check for skill level achievements
        this.checkSkillLevelAchievements(sessionId, newLevel)
      }
    }

    // Grant item (with stacking support)
    this.addItemToInventory(player, yields, 1)

    // Track stats for achievements and challenges
    if (skill === SkillType.WOODCUTTING) {
      this.trackStat(sessionId, StatType.LOGS_CHOPPED)
    } else if (skill === SkillType.FISHING) {
      this.trackStat(sessionId, StatType.FISH_CAUGHT)
      if (yields === ItemType.RAW_SHRIMP) {
        this.trackStat(sessionId, StatType.SHRIMP_CAUGHT)
      }
    }

    // Mark player as having unsaved changes
    this.pendingSaves.add(sessionId)

    // Check for depletion (trees, ores)
    if (depletionChance > 0 && Math.random() < depletionChance) {
      worldObj.depleted = true
      worldObj.respawnAt = Date.now() + respawnTime
      this.updateCachedObjectState(objectId)
      // Broadcast depletion to all clients
      this.broadcast('objectUpdate', { id: objectId, depleted: true })
    }

    // Send completion message and state update
    const client = this.clients.find((c) => c.sessionId === sessionId)
    if (client) {
      client.send('actionComplete', {
        xpGained: xpGain,
        skill,
        itemGained: yields
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
        // Check for skill level achievements
        this.checkSkillLevelAchievements(sessionId, newLevel)
      }
    }

    // Track cooking stat (only for successful cooks)
    if (!burned) {
      this.trackStat(sessionId, StatType.FOOD_COOKED)
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

      // Get equipment bonuses
      const bonuses = this.getPlayerBonuses(player)

      const npcDef = NPC_DEFINITIONS[npc.npcType as NpcType]
      if (!npcDef) return

      // Roll to hit with equipment bonuses
      const didHit = calculateHitChance(attackLevel, bonuses.attackBonus, npcDef.defenceLevel, 0)

      let damage = 0
      if (didHit) {
        const maxHit = calculateMaxHit(strengthLevel, bonuses.strengthBonus)
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
            // Check for skill level achievements
            this.checkSkillLevelAchievements(sessionId, newLevel)
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
            // Check for skill level achievements
            this.checkSkillLevelAchievements(sessionId, newLevel)
          }
        }

        this.pendingSaves.add(sessionId)
      }

      // Track damage dealt for achievements/challenges
      if (damage > 0) {
        this.trackStat(sessionId, StatType.DAMAGE_DEALT, damage)
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

      // Get player defence level and equipment bonus
      const defenceXp = player.skills.get(SkillType.DEFENCE)?.xp || 0
      const defenceLevel = getLevelFromXp(defenceXp)
      const playerBonuses = this.getPlayerBonuses(player)

      // Roll to hit with player's defence bonus
      const didHit = calculateHitChance(npcDef.attackLevel, 0, defenceLevel, playerBonuses.defenceBonus)

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

      // Apply stability damage if hit by Veil creature during expedition
      if (damage > 0 && isVeilCreature(npc.npcType as NpcType)) {
        const stabilityDrain = getStabilityDrain(npc.npcType as NpcType)
        this.applyExpeditionDamageStabilityLoss(npc.targetId, damage, stabilityDrain)
      }

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
        // Track coins earned for achievement
        if (drop.item === ItemType.COINS) {
          this.trackStat(killerSessionId, StatType.COINS_EARNED, drop.quantity)
        }
      }
      this.pendingSaves.add(killerSessionId)
      this.sendStateUpdate(killerSessionId)
    }

    // Track kill stats
    this.trackStat(killerSessionId, StatType.TOTAL_KILLS)
    if (npc.npcType === NpcType.CHICKEN) {
      this.trackStat(killerSessionId, StatType.CHICKENS_KILLED)
    } else if (npc.npcType === NpcType.GOBLIN) {
      this.trackStat(killerSessionId, StatType.GOBLINS_KILLED)
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

  private handleEquipItem(client: Client, inventoryIndex: number) {
    const player = this.state.players.get(client.sessionId)
    if (!player) return

    // Validate inventory index
    if (inventoryIndex < 0 || inventoryIndex >= player.inventory.length) {
      client.send('actionError', { message: 'Invalid item' })
      return
    }

    const item = player.inventory[inventoryIndex]
    const itemType = item.itemType as ItemType

    // Check if item is equippable
    if (!isEquippable(itemType)) {
      client.send('actionError', { message: 'Cannot equip that item' })
      return
    }

    const equipDef = getEquipmentDefinition(itemType)
    if (!equipDef) return

    // Check requirements
    const requirements = getEquipmentRequirements(itemType)
    if (requirements) {
      if (requirements.attack) {
        const attackXp = player.skills.get(SkillType.ATTACK)?.xp || 0
        const attackLevel = getLevelFromXp(attackXp)
        if (attackLevel < requirements.attack) {
          client.send('actionError', { message: `Need level ${requirements.attack} Attack` })
          return
        }
      }
      if (requirements.defence) {
        const defenceXp = player.skills.get(SkillType.DEFENCE)?.xp || 0
        const defenceLevel = getLevelFromXp(defenceXp)
        if (defenceLevel < requirements.defence) {
          client.send('actionError', { message: `Need level ${requirements.defence} Defence` })
          return
        }
      }
      if (requirements.strength) {
        const strengthXp = player.skills.get(SkillType.STRENGTH)?.xp || 0
        const strengthLevel = getLevelFromXp(strengthXp)
        if (strengthLevel < requirements.strength) {
          client.send('actionError', { message: `Need level ${requirements.strength} Strength` })
          return
        }
      }
    }

    const slot = getEquipmentSlot(itemType)
    if (!slot) return

    // Handle two-handed weapons
    if (isTwoHanded(itemType)) {
      // Need to unequip offhand if there's something there
      if (player.equipOffhand) {
        // Check inventory space for offhand item
        if (player.inventory.length >= MAX_INVENTORY_SIZE) {
          client.send('actionError', { message: 'Inventory full' })
          return
        }
        // Move offhand to inventory
        const offhandItem = new InventoryItem()
        offhandItem.itemType = player.equipOffhand.itemType
        offhandItem.quantity = 1
        player.inventory.push(offhandItem)
        player.equipOffhand = null
      }
    }

    // If equipping offhand while holding 2H weapon, unequip weapon
    if (slot === EquipmentSlot.OFFHAND && player.equipWeapon) {
      if (isTwoHanded(player.equipWeapon.itemType as ItemType)) {
        // Check inventory space for weapon
        if (player.inventory.length >= MAX_INVENTORY_SIZE) {
          client.send('actionError', { message: 'Inventory full' })
          return
        }
        // Move weapon to inventory
        const weaponItem = new InventoryItem()
        weaponItem.itemType = player.equipWeapon.itemType
        weaponItem.quantity = 1
        player.inventory.push(weaponItem)
        player.equipWeapon = null
      }
    }

    // Get current item in slot (if any)
    const currentEquipped = this.getEquippedItem(player, slot)

    // Remove item from inventory
    player.inventory.splice(inventoryIndex, 1)

    // If there was already an item equipped, put it in inventory
    if (currentEquipped) {
      const unequippedItem = new InventoryItem()
      unequippedItem.itemType = currentEquipped.itemType
      unequippedItem.quantity = 1
      player.inventory.push(unequippedItem)
    }

    // Equip the new item
    const equippedItem = new EquippedItem()
    equippedItem.itemType = itemType
    this.setEquippedItem(player, slot, equippedItem)

    // Mark bonuses as dirty
    player.bonusesDirty = true

    // Mark for save
    this.pendingSaves.add(client.sessionId)

    // Send updated state
    this.sendStateUpdate(client.sessionId)
    this.sendEquipmentUpdate(client.sessionId)
  }

  private handleUnequipItem(client: Client, slot: EquipmentSlot) {
    const player = this.state.players.get(client.sessionId)
    if (!player) return

    const equippedItem = this.getEquippedItem(player, slot)
    if (!equippedItem) {
      client.send('actionError', { message: 'Nothing equipped in that slot' })
      return
    }

    // Check inventory space
    if (player.inventory.length >= MAX_INVENTORY_SIZE) {
      client.send('actionError', { message: 'Inventory full' })
      return
    }

    // Remove from equipment slot
    this.setEquippedItem(player, slot, null)

    // Add to inventory
    const inventoryItem = new InventoryItem()
    inventoryItem.itemType = equippedItem.itemType
    inventoryItem.quantity = 1
    player.inventory.push(inventoryItem)

    // Mark bonuses as dirty
    player.bonusesDirty = true

    // Mark for save
    this.pendingSaves.add(client.sessionId)

    // Send updated state
    this.sendStateUpdate(client.sessionId)
    this.sendEquipmentUpdate(client.sessionId)
  }

  private getEquippedItem(player: Player, slot: EquipmentSlot): EquippedItem | null {
    switch (slot) {
      case EquipmentSlot.HEAD:
        return player.equipHead
      case EquipmentSlot.BODY:
        return player.equipBody
      case EquipmentSlot.LEGS:
        return player.equipLegs
      case EquipmentSlot.FEET:
        return player.equipFeet
      case EquipmentSlot.HANDS:
        return player.equipHands
      case EquipmentSlot.WEAPON:
        return player.equipWeapon
      case EquipmentSlot.OFFHAND:
        return player.equipOffhand
      default:
        return null
    }
  }

  private setEquippedItem(player: Player, slot: EquipmentSlot, item: EquippedItem | null) {
    switch (slot) {
      case EquipmentSlot.HEAD:
        player.equipHead = item
        break
      case EquipmentSlot.BODY:
        player.equipBody = item
        break
      case EquipmentSlot.LEGS:
        player.equipLegs = item
        break
      case EquipmentSlot.FEET:
        player.equipFeet = item
        break
      case EquipmentSlot.HANDS:
        player.equipHands = item
        break
      case EquipmentSlot.WEAPON:
        player.equipWeapon = item
        break
      case EquipmentSlot.OFFHAND:
        player.equipOffhand = item
        break
    }
  }

  private getPlayerEquipmentMap(player: Player): Partial<Record<EquipmentSlot, ItemType | null>> {
    return {
      [EquipmentSlot.HEAD]: player.equipHead?.itemType as ItemType | null ?? null,
      [EquipmentSlot.BODY]: player.equipBody?.itemType as ItemType | null ?? null,
      [EquipmentSlot.LEGS]: player.equipLegs?.itemType as ItemType | null ?? null,
      [EquipmentSlot.FEET]: player.equipFeet?.itemType as ItemType | null ?? null,
      [EquipmentSlot.HANDS]: player.equipHands?.itemType as ItemType | null ?? null,
      [EquipmentSlot.WEAPON]: player.equipWeapon?.itemType as ItemType | null ?? null,
      [EquipmentSlot.OFFHAND]: player.equipOffhand?.itemType as ItemType | null ?? null
    }
  }

  private getPlayerBonuses(player: Player): { attackBonus: number; strengthBonus: number; defenceBonus: number } {
    if (player.bonusesDirty) {
      const equipment = this.getPlayerEquipmentMap(player)
      const bonuses = calculateTotalBonuses(equipment)
      player.cachedAttackBonus = bonuses.attackBonus
      player.cachedStrengthBonus = bonuses.strengthBonus
      player.cachedDefenceBonus = bonuses.defenceBonus
      player.bonusesDirty = false
    }
    return {
      attackBonus: player.cachedAttackBonus,
      strengthBonus: player.cachedStrengthBonus,
      defenceBonus: player.cachedDefenceBonus
    }
  }

  private sendEquipmentUpdate(sessionId: string) {
    const player = this.state.players.get(sessionId)
    const client = this.clients.find((c) => c.sessionId === sessionId)
    if (!player || !client) return

    const equipment: Record<string, string | null> = {}
    for (const slot of Object.values(EquipmentSlot)) {
      const item = this.getEquippedItem(player, slot)
      equipment[slot] = item?.itemType ?? null
    }

    const bonuses = this.getPlayerBonuses(player)

    client.send('equipmentUpdate', {
      equipment,
      bonuses
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

      // Save equipment
      const equipment: Record<string, string | null> = {}
      for (const slot of Object.values(EquipmentSlot)) {
        const item = this.getEquippedItem(player, slot)
        equipment[slot] = item?.itemType ?? null
      }
      await savePlayerEquipment(playerId, equipment)

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

      // Load equipment from database
      if (playerData.equipment && Object.keys(playerData.equipment).length > 0) {
        for (const [slot, itemType] of Object.entries(playerData.equipment)) {
          if (itemType) {
            const equippedItem = new EquippedItem()
            equippedItem.itemType = itemType
            this.setEquippedItem(player, slot as EquipmentSlot, equippedItem)
          }
        }
        player.bonusesDirty = true
        console.log('Loaded player equipment from DB for:', username)
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

        // Send equipment update
        this.sendEquipmentUpdate(sessionId)

        console.log('Sent playerData message to client for:', username)

        // Load stats, achievements, and daily challenges
        await this.loadEngagementData(sessionId, playerData.id, client)
      }
    } catch (error) {
      console.warn('Database unavailable, using defaults:', (error as Error).message)
    }
  }

  private async loadEngagementData(sessionId: string, playerId: number, client: Client) {
    try {
      // Load player stats
      const stats = await getPlayerStats(playerId)
      const statsMap = new Map<StatType, number>()
      for (const [statType, value] of Object.entries(stats)) {
        statsMap.set(statType as StatType, value)
      }
      this.playerStats.set(sessionId, statsMap)

      // Load achievements
      const achievementsList = await getPlayerAchievements(playerId)
      this.playerAchievements.set(sessionId, new Set(achievementsList))

      // Load cosmetics
      const cosmetics = await getPlayerCosmetics(playerId)
      this.playerCosmetics.set(sessionId, cosmetics)

      // Send achievements data to client
      client.send('achievementsData', {
        achievements: achievementsList,
        stats,
        cosmetics
      })

      // Load daily challenges
      const today = new Date().toISOString().split('T')[0]
      const challengeProgress = await initPlayerDailyChallenges(playerId, today, 3)
      const progressMap = new Map<number, { progress: number; completed: boolean; claimed: boolean }>()
      for (const challenge of challengeProgress) {
        progressMap.set(challenge.challengeIndex, {
          progress: challenge.progress,
          completed: challenge.completed,
          claimed: challenge.claimed
        })
      }
      this.playerChallengeProgress.set(sessionId, progressMap)

      // Get today's challenge definitions
      const todaysChallenges = getDailyChallenges(new Date())

      // Send daily challenges to client
      client.send('dailyChallenges', {
        date: today,
        challenges: todaysChallenges.map((def, index) => ({
          definition: def,
          progress: progressMap.get(index)?.progress || 0,
          completed: progressMap.get(index)?.completed || false,
          claimed: progressMap.get(index)?.claimed || false
        })),
        timeUntilReset: getTimeUntilReset()
      })
    } catch (error) {
      console.warn('Failed to load engagement data:', (error as Error).message)
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
    this.playerStats.delete(client.sessionId)
    this.playerAchievements.delete(client.sessionId)
    this.playerCosmetics.delete(client.sessionId)
    this.playerChallengeProgress.delete(client.sessionId)
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

  // ===== Engagement Features =====

  private async handleClaimChallengeReward(client: Client, challengeIndex: number) {
    const playerId = this.playerDbIds.get(client.sessionId)
    if (!playerId) return

    const progressMap = this.playerChallengeProgress.get(client.sessionId)
    if (!progressMap) return

    const progress = progressMap.get(challengeIndex)
    if (!progress || !progress.completed || progress.claimed) {
      client.send('actionError', { message: 'Cannot claim this reward' })
      return
    }

    const today = new Date().toISOString().split('T')[0]
    const claimed = await claimChallengeReward(playerId, today, challengeIndex)
    if (!claimed) {
      client.send('actionError', { message: 'Failed to claim reward' })
      return
    }

    // Mark as claimed in memory
    progress.claimed = true

    // Get challenge definition and grant reward
    const todaysChallenges = getDailyChallenges(new Date())
    const challengeDef = todaysChallenges[challengeIndex]
    if (!challengeDef) return

    const player = this.state.players.get(client.sessionId)
    if (!player) return

    // Grant XP or coins
    if (challengeDef.rewardXp && challengeDef.rewardSkill) {
      const skillData = player.skills.get(challengeDef.rewardSkill)
      if (skillData) {
        const oldLevel = getLevelFromXp(skillData.xp)
        skillData.xp += challengeDef.rewardXp
        const newLevel = getLevelFromXp(skillData.xp)

        if (newLevel > oldLevel) {
          this.broadcast('levelUp', {
            playerName: player.name,
            skill: challengeDef.rewardSkill,
            newLevel
          })
        }
      }
      this.pendingSaves.add(client.sessionId)
    }

    if (challengeDef.rewardCoins) {
      this.addItemToInventory(player, ItemType.COINS, challengeDef.rewardCoins)
      this.pendingSaves.add(client.sessionId)
    }

    // Send confirmation
    client.send('challengeRewardClaimed', {
      challengeIndex,
      rewardXp: challengeDef.rewardXp,
      rewardSkill: challengeDef.rewardSkill,
      rewardCoins: challengeDef.rewardCoins
    })

    // Send state update
    this.sendStateUpdate(client.sessionId)
  }

  private async handleSetActiveTitle(client: Client, title: string | null) {
    const playerId = this.playerDbIds.get(client.sessionId)
    if (!playerId) return

    // Validate title is one the player has earned
    if (title) {
      const achievements = this.playerAchievements.get(client.sessionId)
      const validTitle = [...(achievements || [])].some((achievementType) => {
        const def = ACHIEVEMENT_DEFINITIONS[achievementType]
        return def?.title === title
      })
      if (!validTitle) {
        client.send('actionError', { message: 'You have not earned this title' })
        return
      }
    }

    // Update in memory
    const cosmetics = this.playerCosmetics.get(client.sessionId) || { activeTitle: null, activeBadge: null }
    cosmetics.activeTitle = title
    this.playerCosmetics.set(client.sessionId, cosmetics)

    // Update in database
    await setPlayerCosmetics(playerId, { activeTitle: title })

    // Send confirmation
    client.send('cosmeticsUpdated', cosmetics)
  }

  private async handleSetActiveBadge(client: Client, badge: string | null) {
    const playerId = this.playerDbIds.get(client.sessionId)
    if (!playerId) return

    // Validate badge is one the player has earned
    if (badge) {
      const achievements = this.playerAchievements.get(client.sessionId)
      const validBadge = [...(achievements || [])].some((achievementType) => {
        const def = ACHIEVEMENT_DEFINITIONS[achievementType]
        return def?.chatBadge === badge
      })
      if (!validBadge) {
        client.send('actionError', { message: 'You have not earned this badge' })
        return
      }
    }

    // Update in memory
    const cosmetics = this.playerCosmetics.get(client.sessionId) || { activeTitle: null, activeBadge: null }
    cosmetics.activeBadge = badge
    this.playerCosmetics.set(client.sessionId, cosmetics)

    // Update in database
    await setPlayerCosmetics(playerId, { activeBadge: badge })

    // Send confirmation
    client.send('cosmeticsUpdated', cosmetics)
  }

  private async trackStat(sessionId: string, statType: StatType, amount: number = 1) {
    const playerId = this.playerDbIds.get(sessionId)
    if (!playerId) return

    // Update in memory
    const statsMap = this.playerStats.get(sessionId) || new Map<StatType, number>()
    const currentValue = statsMap.get(statType) || 0
    const newValue = currentValue + amount
    statsMap.set(statType, newValue)
    this.playerStats.set(sessionId, statsMap)

    // Update in database
    await incrementPlayerStat(playerId, statType, amount)

    // Check for stat-based achievements
    await this.checkStatAchievements(sessionId, statType, newValue)

    // Check for challenge progress
    await this.updateChallengeProgressForStat(sessionId, statType, newValue)
  }

  private async checkStatAchievements(sessionId: string, statType: StatType, newValue: number) {
    const playerId = this.playerDbIds.get(sessionId)
    if (!playerId) return

    const achievementsToCheck = getAchievementsForStat(statType)
    const earnedSet = this.playerAchievements.get(sessionId) || new Set<AchievementType>()

    for (const achievementType of achievementsToCheck) {
      if (earnedSet.has(achievementType)) continue

      if (checkStatAchievement(achievementType, newValue)) {
        const granted = await grantAchievement(playerId, achievementType)
        if (granted) {
          earnedSet.add(achievementType)
          this.playerAchievements.set(sessionId, earnedSet)

          // Notify client
          const client = this.clients.find((c) => c.sessionId === sessionId)
          client?.send('achievementUnlocked', { achievementType })

          // Broadcast achievement
          const player = this.state.players.get(sessionId)
          const def = ACHIEVEMENT_DEFINITIONS[achievementType]
          if (player && def) {
            this.broadcast('chat', {
              sender: 'System',
              text: `${player.name} earned achievement: ${def.name}!`
            })
          }
        }
      }
    }
  }

  private async checkSkillLevelAchievements(sessionId: string, level: number) {
    const playerId = this.playerDbIds.get(sessionId)
    if (!playerId) return

    const achievementsToCheck = getSkillLevelAchievements()
    const earnedSet = this.playerAchievements.get(sessionId) || new Set<AchievementType>()

    for (const achievementType of achievementsToCheck) {
      if (earnedSet.has(achievementType)) continue

      if (checkSkillAchievement(achievementType, level)) {
        const granted = await grantAchievement(playerId, achievementType)
        if (granted) {
          earnedSet.add(achievementType)
          this.playerAchievements.set(sessionId, earnedSet)

          // Notify client
          const client = this.clients.find((c) => c.sessionId === sessionId)
          client?.send('achievementUnlocked', { achievementType })

          // Broadcast achievement
          const player = this.state.players.get(sessionId)
          const def = ACHIEVEMENT_DEFINITIONS[achievementType]
          if (player && def) {
            this.broadcast('chat', {
              sender: 'System',
              text: `${player.name} earned achievement: ${def.name}!`
            })
          }
        }
      }
    }
  }

  private async updateChallengeProgressForStat(sessionId: string, statType: StatType, _totalValue: number) {
    const playerId = this.playerDbIds.get(sessionId)
    if (!playerId) return

    const progressMap = this.playerChallengeProgress.get(sessionId)
    if (!progressMap) return

    const today = new Date().toISOString().split('T')[0]
    const todaysChallenges = getDailyChallenges(new Date())

    for (let i = 0; i < todaysChallenges.length; i++) {
      const challenge = todaysChallenges[i]
      if (challenge.statType !== statType) continue

      const progress = progressMap.get(i)
      if (!progress || progress.completed) continue

      // Get session-specific progress (we track total stat, but challenges are per-day)
      // For simplicity, we'll track challenge progress separately
      const newProgress = Math.min(progress.progress + 1, challenge.targetCount)
      const completed = newProgress >= challenge.targetCount

      progress.progress = newProgress
      progress.completed = completed

      // Update in database
      await updateChallengeProgress(playerId, today, i, newProgress, completed)

      // Notify client
      const client = this.clients.find((c) => c.sessionId === sessionId)
      client?.send('challengeProgress', {
        challengeIndex: i,
        progress: newProgress,
        completed
      })
    }
  }

  // ========================================
  // Helper: Grant XP to a skill
  // ========================================

  private grantXp(sessionId: string, skill: SkillType, xpAmount: number) {
    const player = this.state.players.get(sessionId)
    if (!player) return

    const skillData = player.skills.get(skill)
    if (!skillData) return

    const oldLevel = getLevelFromXp(skillData.xp)
    skillData.xp += Math.floor(xpAmount)
    const newLevel = getLevelFromXp(skillData.xp)

    // Level up notification
    if (newLevel > oldLevel) {
      this.broadcast('levelUp', {
        playerName: player.name,
        skill,
        level: newLevel
      })

      // Update max HP if hitpoints
      if (skill === SkillType.HITPOINTS) {
        player.maxHp = calculateMaxHp(newLevel)
      }

      // Check for skill-based achievements
      this.checkSkillLevelAchievements(sessionId, newLevel)
    }

    this.pendingSaves.add(sessionId)
  }

  // ========================================
  // Veil Expedition System
  // ========================================

  private handleEnterRift(client: Client, objectId: string) {
    const player = this.state.players.get(client.sessionId)
    if (!player) return

    // Check if already in expedition
    if (this.activeExpeditions.has(client.sessionId)) {
      client.send('chat', {
        sender: 'System',
        text: 'You are already on an expedition!'
      })
      return
    }

    // Find the rift by object ID
    const worldObject = this.state.worldObjects.get(objectId)
    if (!worldObject || worldObject.objectType !== WorldObjectType.VEIL_RIFT) {
      client.send('chat', {
        sender: 'System',
        text: 'That rift has closed...'
      })
      return
    }

    // Get rift data by matching position (object IDs don't match rift IDs directly)
    const objTile = worldToTile({ x: worldObject.x, y: worldObject.y })
    const allRifts = getActiveRifts()
    const rift = allRifts.find(r => r.position.tileX === objTile.tileX && r.position.tileY === objTile.tileY)

    if (!rift) {
      console.log(`[Expedition] No rift found at tile ${objTile.tileX}, ${objTile.tileY}`)
      client.send('chat', {
        sender: 'System',
        text: 'This rift is unstable...'
      })
      return
    }

    console.log(`[Expedition] Found rift: ${rift.name} (tier ${rift.destinationTier})`)

    // Get player's Veilwalking level
    const veilwalkingXp = player.skills.get(SkillType.VEILWALKING)?.xp ?? 0
    const veilwalkingLevel = getLevelFromXp(veilwalkingXp)

    // Check level requirement (use rift data or defaults)
    const stabilityRequired = rift?.stabilityRequired ?? 1
    if (veilwalkingLevel < stabilityRequired) {
      client.send('chat', {
        sender: 'System',
        text: `You need level ${stabilityRequired} Veilwalking to enter this rift. (Current: ${veilwalkingLevel})`
      })
      return
    }

    // Get tier info
    const tier = rift?.destinationTier ?? 1
    const tierInfo = getExpeditionTier(tier)
    if (!tierInfo) {
      client.send('chat', {
        sender: 'System',
        text: 'The rift leads nowhere...'
      })
      return
    }

    // Create expedition
    const maxStability = calculateMaxStability(veilwalkingLevel)
    const drainRate = calculateDrainRate(tier, 0) // depth 0 initially

    const expedition: Expedition = {
      id: `exp_${client.sessionId}_${Date.now()}`,
      playerId: client.sessionId,
      riftId: objectId,
      startTime: Date.now(),
      maxDuration: tierInfo.baseDuration,

      maxStability,
      currentStability: maxStability,
      stabilityDrainRate: drainRate,

      currentDepth: 0,
      creaturesKilled: 0,
      resourcesGathered: 0,

      securedLoot: [],
      unsecuredLoot: [],

      status: 'active'
    }

    this.activeExpeditions.set(client.sessionId, expedition)

    // Start stability drain interval (every second)
    const drainInterval = setInterval(() => {
      this.tickExpeditionStability(client.sessionId)
    }, 1000)
    this.expeditionIntervals.set(client.sessionId, drainInterval)

    // Spawn Veil creatures near the player
    this.spawnVeilCreatures(client.sessionId, player, tier)

    // Notify client of expedition start
    client.send('expeditionStart', {
      expedition: {
        id: expedition.id,
        riftId: expedition.riftId,
        tier,
        tierName: tierInfo.name,
        maxDuration: expedition.maxDuration,
        maxStability: expedition.maxStability,
        currentStability: expedition.currentStability,
        stabilityDrainRate: expedition.stabilityDrainRate
      }
    })

    // Broadcast to room
    this.broadcast('chat', {
      sender: 'System',
      text: `${player.name} has entered the ${tierInfo.name}...`
    })

    console.log(`[Expedition] ${player.name} entered ${tierInfo.name} (Tier ${tier})`)
  }

  private tickExpeditionStability(sessionId: string) {
    const expedition = this.activeExpeditions.get(sessionId)
    if (!expedition || expedition.status !== 'active') return

    // Drain stability
    expedition.currentStability -= expedition.stabilityDrainRate

    // Check time limit
    const elapsed = Date.now() - expedition.startTime
    if (elapsed >= expedition.maxDuration) {
      this.forceExtractExpedition(sessionId, 'time_expired')
      return
    }

    // Check stability depletion
    if (expedition.currentStability <= 0) {
      expedition.currentStability = 0
      this.forceExtractExpedition(sessionId, 'stability_depleted')
      return
    }

    // Send stability update to client
    const client = this.clients.find(c => c.sessionId === sessionId)
    client?.send('expeditionUpdate', {
      currentStability: expedition.currentStability,
      timeRemaining: expedition.maxDuration - elapsed
    })
  }

  private forceExtractExpedition(sessionId: string, reason: 'time_expired' | 'stability_depleted' | 'death') {
    const expedition = this.activeExpeditions.get(sessionId)
    if (!expedition) return

    expedition.status = 'failed'
    expedition.exitReason = reason

    // Clear drain interval
    const interval = this.expeditionIntervals.get(sessionId)
    if (interval) {
      clearInterval(interval)
      this.expeditionIntervals.delete(sessionId)
    }

    // Clean up Veil creatures
    this.cleanupExpeditionNpcs(sessionId)

    const player = this.state.players.get(sessionId)
    const client = this.clients.find(c => c.sessionId === sessionId)

    // Lose unsecured loot on forced extraction
    const lostItems = expedition.unsecuredLoot.length

    // Grant only secured loot
    if (player) {
      for (const loot of expedition.securedLoot) {
        this.addItemToInventory(player, loot.itemType as ItemType, loot.quantity)
      }
    }

    // Grant Veilwalking XP based on time spent (minimum 10 XP for attempting)
    const timeSpentMinutes = (Date.now() - expedition.startTime) / 60000
    const veilwalkingXp = Math.max(10, Math.floor(timeSpentMinutes * 10 + expedition.currentDepth * 50))
    this.grantXp(sessionId, SkillType.VEILWALKING, veilwalkingXp)

    // Notify client
    client?.send('expeditionEnd', {
      reason,
      securedLoot: expedition.securedLoot,
      lostItems,
      veilwalkingXp,
      creaturesKilled: expedition.creaturesKilled,
      resourcesGathered: expedition.resourcesGathered,
      depthReached: expedition.currentDepth
    })

    // Broadcast
    const reasonText = reason === 'time_expired' ? 'ran out of time' :
                       reason === 'stability_depleted' ? 'lost their stability' : 'was overwhelmed'
    if (player) {
      this.broadcast('chat', {
        sender: 'System',
        text: `${player.name} ${reasonText} in the Veil and was forced to extract!`
      })
    }

    this.activeExpeditions.delete(sessionId)
    console.log(`[Expedition] ${player?.name} force-extracted: ${reason}`)
  }

  private voluntaryExtractExpedition(sessionId: string) {
    const expedition = this.activeExpeditions.get(sessionId)
    if (!expedition || expedition.status !== 'active') return

    expedition.status = 'completed'
    expedition.exitReason = 'voluntary'

    // Clear drain interval
    const interval = this.expeditionIntervals.get(sessionId)
    if (interval) {
      clearInterval(interval)
      this.expeditionIntervals.delete(sessionId)
    }

    // Clean up Veil creatures
    this.cleanupExpeditionNpcs(sessionId)

    const player = this.state.players.get(sessionId)
    const client = this.clients.find(c => c.sessionId === sessionId)

    // Grant all loot (secured + unsecured)
    if (player) {
      const allLoot = [...expedition.securedLoot, ...expedition.unsecuredLoot]
      for (const loot of allLoot) {
        this.addItemToInventory(player, loot.itemType as ItemType, loot.quantity)
      }
    }

    // Grant Veilwalking XP with completion bonus
    const timeSpentMinutes = (Date.now() - expedition.startTime) / 60000
    const timeXp = Math.floor(timeSpentMinutes * 10)
    const depthXp = expedition.currentDepth * 50
    const baseXp = timeXp + depthXp
    const completionBonus = Math.max(25, Math.floor(baseXp * 0.25)) // Minimum 25 XP for completing
    const veilwalkingXp = baseXp + completionBonus
    this.grantXp(sessionId, SkillType.VEILWALKING, veilwalkingXp)

    // Notify client
    client?.send('expeditionEnd', {
      reason: 'voluntary',
      securedLoot: expedition.securedLoot,
      unsecuredLoot: expedition.unsecuredLoot,
      lostItems: 0,
      veilwalkingXp,
      creaturesKilled: expedition.creaturesKilled,
      resourcesGathered: expedition.resourcesGathered,
      depthReached: expedition.currentDepth,
      completionBonus
    })

    // Broadcast success
    if (player) {
      this.broadcast('chat', {
        sender: 'System',
        text: `${player.name} successfully extracted from the Veil!`
      })
    }

    this.activeExpeditions.delete(sessionId)
    console.log(`[Expedition] ${player?.name} voluntary extraction successful`)
  }

  // Called when player takes damage in the Veil
  private applyExpeditionDamageStabilityLoss(sessionId: string, damage: number, creatureStabilityDrain: number = 5) {
    const expedition = this.activeExpeditions.get(sessionId)
    if (!expedition || expedition.status !== 'active') return

    // Stability loss from taking damage
    const stabilityLoss = creatureStabilityDrain + Math.floor(damage * 0.5)
    expedition.currentStability = Math.max(0, expedition.currentStability - stabilityLoss)

    const client = this.clients.find(c => c.sessionId === sessionId)
    client?.send('stabilityDamage', {
      stabilityLost: stabilityLoss,
      currentStability: expedition.currentStability
    })

    if (expedition.currentStability <= 0) {
      this.forceExtractExpedition(sessionId, 'stability_depleted')
    }
  }

  // Get expedition for a player (for other systems to check)
  getActiveExpedition(sessionId: string): Expedition | undefined {
    return this.activeExpeditions.get(sessionId)
  }

  // Spawn Veil creatures around a player for their expedition
  private spawnVeilCreatures(sessionId: string, player: Player, tier: number) {
    const veilCreatureTypes = getVeilCreaturesForTier(tier)
    if (veilCreatureTypes.length === 0) return

    const spawnedIds = new Set<string>()
    const playerTile = worldToTile({ x: player.x, y: player.y })

    // Spawn 3-5 creatures around the player
    const creatureCount = 3 + Math.floor(Math.random() * 3)

    for (let i = 0; i < creatureCount; i++) {
      // Pick a random creature type for this tier
      const creatureType = veilCreatureTypes[Math.floor(Math.random() * veilCreatureTypes.length)]
      const def = NPC_DEFINITIONS[creatureType]
      if (!def) continue

      // Spawn 3-6 tiles away from player in random direction
      const distance = 3 + Math.floor(Math.random() * 4)
      const angle = Math.random() * Math.PI * 2
      const spawnTileX = playerTile.tileX + Math.round(Math.cos(angle) * distance)
      const spawnTileY = playerTile.tileY + Math.round(Math.sin(angle) * distance)
      const spawnPos = tileToWorld({ tileX: spawnTileX, tileY: spawnTileY })

      // Create NPC
      const npcId = `veil_${sessionId}_${creatureType}_${i}_${Date.now()}`
      const npc = new NPC()
      npc.id = npcId
      npc.npcType = creatureType
      npc.x = spawnPos.x
      npc.y = spawnPos.y
      npc.spawnX = spawnPos.x
      npc.spawnY = spawnPos.y
      npc.currentHp = def.hitpoints
      npc.maxHp = def.hitpoints
      npc.isDead = false
      npc.targetId = ''
      npc.lastAttackTime = 0

      this.state.npcs.set(npcId, npc)
      this.npcGrid.insert(npc)
      spawnedIds.add(npcId)

      console.log(`[Expedition] Spawned ${def.name} at (${spawnTileX}, ${spawnTileY}) for ${sessionId}`)
    }

    this.expeditionNpcs.set(sessionId, spawnedIds)
  }

  // Clean up Veil creatures when expedition ends
  private cleanupExpeditionNpcs(sessionId: string) {
    const npcIds = this.expeditionNpcs.get(sessionId)
    if (!npcIds) return

    for (const npcId of npcIds) {
      const npc = this.state.npcs.get(npcId)
      if (npc) {
        this.npcGrid.remove(npc)
        this.state.npcs.delete(npcId)
      }
    }

    this.expeditionNpcs.delete(sessionId)
    console.log(`[Expedition] Cleaned up ${npcIds.size} Veil creatures for ${sessionId}`)
  }
}
