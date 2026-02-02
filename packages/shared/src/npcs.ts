// NPC System for Realm

import { ItemType } from './items'

export enum NpcType {
  CHICKEN = 'chicken',
  COW = 'cow',
  GOBLIN = 'goblin',
  GIANT_RAT = 'giant_rat',
  GUARD = 'guard',

  // Town NPCs
  VEIL_SCHOLAR = 'veil_scholar',

  // Veil creatures
  SHADE = 'shade',
  VOID_CRAWLER = 'void_crawler',
  SHADOW_BEAST = 'shadow_beast',
  VEIL_WRAITH = 'veil_wraith'
}

export interface LootTableEntry {
  item: ItemType
  minQuantity: number
  maxQuantity: number
  weight: number // Higher weight = more likely to drop
}

export interface NpcDefinition {
  type: NpcType
  name: string
  combatLevel: number
  hitpoints: number
  maxHit: number
  attackLevel: number
  strengthLevel: number
  defenceLevel: number
  attackSpeed: number // ticks between attacks (4 = 2.4s)
  aggroRange: number // 0 = not aggressive
  respawnTime: number // milliseconds
  drops: LootTableEntry[]

  // Veil creature properties
  isVeilCreature?: boolean
  stabilityDrain?: number // Extra stability damage per hit
  veilTier?: number // Minimum expedition tier to spawn
}

export const NPC_DEFINITIONS: Record<NpcType, NpcDefinition> = {
  [NpcType.CHICKEN]: {
    type: NpcType.CHICKEN,
    name: 'Chicken',
    combatLevel: 1,
    hitpoints: 3,
    maxHit: 1,
    attackLevel: 1,
    strengthLevel: 1,
    defenceLevel: 1,
    attackSpeed: 4,
    aggroRange: 0,
    respawnTime: 30000,
    drops: [
      { item: ItemType.FEATHERS, minQuantity: 5, maxQuantity: 15, weight: 100 },
      { item: ItemType.RAW_CHICKEN, minQuantity: 1, maxQuantity: 1, weight: 100 },
      { item: ItemType.BONES, minQuantity: 1, maxQuantity: 1, weight: 100 }
    ]
  },
  [NpcType.COW]: {
    type: NpcType.COW,
    name: 'Cow',
    combatLevel: 2,
    hitpoints: 8,
    maxHit: 2,
    attackLevel: 1,
    strengthLevel: 1,
    defenceLevel: 1,
    attackSpeed: 4,
    aggroRange: 0,
    respawnTime: 60000,
    drops: [
      { item: ItemType.RAW_BEEF, minQuantity: 1, maxQuantity: 1, weight: 100 },
      { item: ItemType.COWHIDE, minQuantity: 1, maxQuantity: 1, weight: 100 },
      { item: ItemType.BONES, minQuantity: 1, maxQuantity: 1, weight: 100 }
    ]
  },
  [NpcType.GOBLIN]: {
    type: NpcType.GOBLIN,
    name: 'Goblin',
    combatLevel: 5,
    hitpoints: 5,
    maxHit: 2,
    attackLevel: 1,
    strengthLevel: 1,
    defenceLevel: 1,
    attackSpeed: 4,
    aggroRange: 3,
    respawnTime: 45000,
    drops: [
      // Always drops
      { item: ItemType.BONES, minQuantity: 1, maxQuantity: 1, weight: 100 },
      // Common drops
      { item: ItemType.COINS, minQuantity: 1, maxQuantity: 15, weight: 75 },
      // Bronze equipment (rare - goblins hoard scraps)
      { item: ItemType.BRONZE_SWORD, minQuantity: 1, maxQuantity: 1, weight: 4 },
      { item: ItemType.BRONZE_HELMET, minQuantity: 1, maxQuantity: 1, weight: 4 },
      { item: ItemType.BRONZE_SHIELD, minQuantity: 1, maxQuantity: 1, weight: 3 },
      { item: ItemType.BRONZE_LEGS, minQuantity: 1, maxQuantity: 1, weight: 2 },
      { item: ItemType.BRONZE_CHESTPLATE, minQuantity: 1, maxQuantity: 1, weight: 1 }
    ]
  },
  [NpcType.GIANT_RAT]: {
    type: NpcType.GIANT_RAT,
    name: 'Giant Rat',
    combatLevel: 3,
    hitpoints: 4,
    maxHit: 1,
    attackLevel: 1,
    strengthLevel: 1,
    defenceLevel: 1,
    attackSpeed: 4,
    aggroRange: 0,
    respawnTime: 40000,
    drops: [
      { item: ItemType.BONES, minQuantity: 1, maxQuantity: 1, weight: 100 },
      { item: ItemType.COINS, minQuantity: 1, maxQuantity: 5, weight: 40 }
    ]
  },
  [NpcType.GUARD]: {
    type: NpcType.GUARD,
    name: 'Guard',
    combatLevel: 21,
    hitpoints: 22,
    maxHit: 4,
    attackLevel: 19,
    strengthLevel: 18,
    defenceLevel: 18,
    attackSpeed: 4,
    aggroRange: 0, // Passive - town guards don't attack players
    respawnTime: 60000,
    drops: [
      // Always drops
      { item: ItemType.BONES, minQuantity: 1, maxQuantity: 1, weight: 100 },
      // Common drops
      { item: ItemType.COINS, minQuantity: 15, maxQuantity: 60, weight: 70 },
      // Iron equipment (rare - guards are well equipped)
      { item: ItemType.IRON_SWORD, minQuantity: 1, maxQuantity: 1, weight: 3 },
      { item: ItemType.IRON_HELMET, minQuantity: 1, maxQuantity: 1, weight: 3 },
      { item: ItemType.IRON_SHIELD, minQuantity: 1, maxQuantity: 1, weight: 2 },
      { item: ItemType.IRON_LEGS, minQuantity: 1, maxQuantity: 1, weight: 2 },
      { item: ItemType.IRON_CHESTPLATE, minQuantity: 1, maxQuantity: 1, weight: 1 }
    ]
  },

  // ========================================
  // TOWN NPCs
  // ========================================

  [NpcType.VEIL_SCHOLAR]: {
    type: NpcType.VEIL_SCHOLAR,
    name: 'Veil Scholar',
    combatLevel: 15,
    hitpoints: 30,
    maxHit: 3,
    attackLevel: 10,
    strengthLevel: 10,
    defenceLevel: 15,
    attackSpeed: 4,
    aggroRange: 0, // Passive - scholars don't fight
    respawnTime: 120000,
    drops: [
      { item: ItemType.BONES, minQuantity: 1, maxQuantity: 1, weight: 100 },
      { item: ItemType.COINS, minQuantity: 20, maxQuantity: 50, weight: 50 },
      // Scholars may carry veil materials from their research
      { item: ItemType.ETHEREAL_DUST, minQuantity: 1, maxQuantity: 2, weight: 15 },
      { item: ItemType.VEIL_ESSENCE, minQuantity: 1, maxQuantity: 1, weight: 5 }
    ]
  },

  // ========================================
  // VEIL CREATURES
  // ========================================

  [NpcType.SHADE]: {
    type: NpcType.SHADE,
    name: 'Shade',
    combatLevel: 8,
    hitpoints: 12,
    maxHit: 3,
    attackLevel: 8,
    strengthLevel: 6,
    defenceLevel: 5,
    attackSpeed: 4,
    aggroRange: 4,
    respawnTime: 0, // Don't respawn - expedition only
    drops: [
      { item: ItemType.VEIL_BONES, minQuantity: 1, maxQuantity: 1, weight: 100 },
      { item: ItemType.ETHEREAL_DUST, minQuantity: 1, maxQuantity: 3, weight: 60 },
      { item: ItemType.VEIL_ESSENCE, minQuantity: 1, maxQuantity: 1, weight: 25 },
      { item: ItemType.COINS, minQuantity: 10, maxQuantity: 30, weight: 50 }
    ],
    isVeilCreature: true,
    stabilityDrain: 3,
    veilTier: 1
  },

  [NpcType.VOID_CRAWLER]: {
    type: NpcType.VOID_CRAWLER,
    name: 'Void Crawler',
    combatLevel: 15,
    hitpoints: 20,
    maxHit: 5,
    attackLevel: 14,
    strengthLevel: 12,
    defenceLevel: 10,
    attackSpeed: 3, // Faster attacks
    aggroRange: 5,
    respawnTime: 0,
    drops: [
      { item: ItemType.VEIL_BONES, minQuantity: 1, maxQuantity: 1, weight: 100 },
      { item: ItemType.CORRUPTED_HIDE, minQuantity: 1, maxQuantity: 1, weight: 40 },
      { item: ItemType.SHADOW_FRAGMENT, minQuantity: 1, maxQuantity: 2, weight: 35 },
      { item: ItemType.VEIL_ESSENCE, minQuantity: 1, maxQuantity: 2, weight: 45 },
      { item: ItemType.COINS, minQuantity: 20, maxQuantity: 60, weight: 60 }
    ],
    isVeilCreature: true,
    stabilityDrain: 5,
    veilTier: 1
  },

  [NpcType.SHADOW_BEAST]: {
    type: NpcType.SHADOW_BEAST,
    name: 'Shadow Beast',
    combatLevel: 28,
    hitpoints: 35,
    maxHit: 8,
    attackLevel: 25,
    strengthLevel: 22,
    defenceLevel: 20,
    attackSpeed: 4,
    aggroRange: 6,
    respawnTime: 0,
    drops: [
      { item: ItemType.VEIL_BONES, minQuantity: 1, maxQuantity: 1, weight: 100 },
      { item: ItemType.CORRUPTED_HIDE, minQuantity: 1, maxQuantity: 2, weight: 60 },
      { item: ItemType.SHADOW_FRAGMENT, minQuantity: 2, maxQuantity: 4, weight: 50 },
      { item: ItemType.VEIL_ESSENCE, minQuantity: 2, maxQuantity: 4, weight: 55 },
      { item: ItemType.VOID_SHARD, minQuantity: 1, maxQuantity: 1, weight: 10 },
      { item: ItemType.COINS, minQuantity: 50, maxQuantity: 150, weight: 70 }
    ],
    isVeilCreature: true,
    stabilityDrain: 8,
    veilTier: 2
  },

  [NpcType.VEIL_WRAITH]: {
    type: NpcType.VEIL_WRAITH,
    name: 'Veil Wraith',
    combatLevel: 45,
    hitpoints: 55,
    maxHit: 12,
    attackLevel: 40,
    strengthLevel: 38,
    defenceLevel: 35,
    attackSpeed: 4,
    aggroRange: 8,
    respawnTime: 0,
    drops: [
      { item: ItemType.VEIL_BONES, minQuantity: 1, maxQuantity: 1, weight: 100 },
      { item: ItemType.CORRUPTED_HIDE, minQuantity: 2, maxQuantity: 3, weight: 70 },
      { item: ItemType.SHADOW_FRAGMENT, minQuantity: 3, maxQuantity: 6, weight: 60 },
      { item: ItemType.VEIL_ESSENCE, minQuantity: 3, maxQuantity: 6, weight: 65 },
      { item: ItemType.VOID_SHARD, minQuantity: 1, maxQuantity: 2, weight: 25 },
      { item: ItemType.COINS, minQuantity: 100, maxQuantity: 300, weight: 75 }
    ],
    isVeilCreature: true,
    stabilityDrain: 12,
    veilTier: 3
  }
}

// Get all Veil creatures for a given tier (includes lower tiers)
export function getVeilCreaturesForTier(tier: number): NpcType[] {
  return Object.values(NpcType).filter((npcType) => {
    const def = NPC_DEFINITIONS[npcType]
    return def?.isVeilCreature && def.veilTier !== undefined && def.veilTier <= tier
  })
}

// Check if NPC is a Veil creature
export function isVeilCreature(npcType: NpcType): boolean {
  return NPC_DEFINITIONS[npcType]?.isVeilCreature === true
}

// Get stability drain for a Veil creature
export function getStabilityDrain(npcType: NpcType): number {
  return NPC_DEFINITIONS[npcType]?.stabilityDrain ?? 0
}

// Roll drops from an NPC's loot table
export function rollDrops(npcType: NpcType): Array<{ item: ItemType; quantity: number }> {
  const def = NPC_DEFINITIONS[npcType]
  if (!def) return []

  const drops: Array<{ item: ItemType; quantity: number }> = []

  for (const entry of def.drops) {
    // Roll based on weight (100 = guaranteed)
    if (Math.random() * 100 < entry.weight) {
      const quantity =
        entry.minQuantity +
        Math.floor(Math.random() * (entry.maxQuantity - entry.minQuantity + 1))
      drops.push({ item: entry.item, quantity })
    }
  }

  return drops
}
