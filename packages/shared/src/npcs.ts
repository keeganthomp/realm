// NPC System for Realm

import { ItemType } from './items'

export enum NpcType {
  CHICKEN = 'chicken',
  COW = 'cow',
  GOBLIN = 'goblin',
  GIANT_RAT = 'giant_rat'
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
      { item: ItemType.COINS, minQuantity: 1, maxQuantity: 5, weight: 80 },
      { item: ItemType.BONES, minQuantity: 1, maxQuantity: 1, weight: 100 }
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
      { item: ItemType.BONES, minQuantity: 1, maxQuantity: 1, weight: 100 }
    ]
  }
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
