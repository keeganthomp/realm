/**
 * Veil Creatures - Enemies exclusive to the Veil dimension
 *
 * These creatures have unique visuals (bioluminescent, ethereal)
 * and drop Veil-specific resources.
 */

import { ItemType } from './items'

export enum VeilCreatureType {
  // Tier 1 - Entry level
  WISP = 'wisp',                    // Floating light orb
  LUMINOUS_MOTH = 'luminous_moth',  // Glowing insect

  // Tier 2 - Medium
  SHADE = 'shade',                  // Shadow creature
  CRYSTAL_GOLEM = 'crystal_golem',  // Defensive crystal being

  // Tier 3 - Hard
  VEIL_STALKER = 'veil_stalker',    // Fast, aggressive hunter
  VOID_WEAVER = 'void_weaver',      // Magic-based enemy

  // Bosses
  LUMINARCH = 'luminarch',          // Mini-boss, humanoid light being
  VOID_HORROR = 'void_horror'       // Final boss, massive tentacled horror
}

export interface VeilLootEntry {
  itemType: ItemType | string  // Can be regular items or veil items
  minQuantity: number
  maxQuantity: number
  chance: number  // 0-1
}

export interface VeilCreatureDefinition {
  type: VeilCreatureType
  name: string
  combatLevel: number
  hitpoints: number
  maxHit: number
  attackLevel: number
  strengthLevel: number
  defenceLevel: number
  attackSpeed: number  // ticks (4 = 2.4s like OSRS)
  aggroRange: number   // 0 = passive
  respawnTime: number  // ms
  veilOnly: true

  // Visual properties
  glowColor: string    // Hex color for bioluminescence
  baseColor: string    // Base body color
  size: number         // Scale multiplier (1 = normal)
  floats: boolean      // Whether creature hovers

  // Drops
  drops: VeilLootEntry[]

  // Veil-specific
  stabilityDrain: number  // How much stability player loses per hit taken
}

export const VEIL_CREATURE_DEFINITIONS: Record<VeilCreatureType, VeilCreatureDefinition> = {
  [VeilCreatureType.WISP]: {
    type: VeilCreatureType.WISP,
    name: 'Wisp',
    combatLevel: 5,
    hitpoints: 15,
    maxHit: 2,
    attackLevel: 5,
    strengthLevel: 3,
    defenceLevel: 1,
    attackSpeed: 5,
    aggroRange: 0, // Passive
    respawnTime: 30000,
    veilOnly: true,
    glowColor: '#00ffff',
    baseColor: '#88ffff',
    size: 0.4,
    floats: true,
    drops: [
      { itemType: 'wisp_dust', minQuantity: 1, maxQuantity: 3, chance: 1.0 },
      { itemType: 'luminous_shard', minQuantity: 1, maxQuantity: 1, chance: 0.2 }
    ],
    stabilityDrain: 1
  },

  [VeilCreatureType.LUMINOUS_MOTH]: {
    type: VeilCreatureType.LUMINOUS_MOTH,
    name: 'Luminous Moth',
    combatLevel: 8,
    hitpoints: 20,
    maxHit: 3,
    attackLevel: 8,
    strengthLevel: 5,
    defenceLevel: 3,
    attackSpeed: 4,
    aggroRange: 3,
    respawnTime: 25000,
    veilOnly: true,
    glowColor: '#ff00ff',
    baseColor: '#ffaaff',
    size: 0.6,
    floats: true,
    drops: [
      { itemType: 'luminous_shard', minQuantity: 1, maxQuantity: 2, chance: 0.8 },
      { itemType: 'wisp_dust', minQuantity: 1, maxQuantity: 2, chance: 0.5 }
    ],
    stabilityDrain: 2
  },

  [VeilCreatureType.SHADE]: {
    type: VeilCreatureType.SHADE,
    name: 'Shade',
    combatLevel: 25,
    hitpoints: 45,
    maxHit: 6,
    attackLevel: 25,
    strengthLevel: 20,
    defenceLevel: 15,
    attackSpeed: 4,
    aggroRange: 5,
    respawnTime: 45000,
    veilOnly: true,
    glowColor: '#4400aa',
    baseColor: '#220044',
    size: 1.2,
    floats: true,
    drops: [
      { itemType: 'shade_cloth', minQuantity: 1, maxQuantity: 2, chance: 0.7 },
      { itemType: 'void_essence', minQuantity: 1, maxQuantity: 1, chance: 0.3 },
      { itemType: 'raw_crystal', minQuantity: 1, maxQuantity: 3, chance: 0.4 }
    ],
    stabilityDrain: 4
  },

  [VeilCreatureType.CRYSTAL_GOLEM]: {
    type: VeilCreatureType.CRYSTAL_GOLEM,
    name: 'Crystal Golem',
    combatLevel: 35,
    hitpoints: 80,
    maxHit: 8,
    attackLevel: 30,
    strengthLevel: 35,
    defenceLevel: 50,
    attackSpeed: 5,
    aggroRange: 4,
    respawnTime: 60000,
    veilOnly: true,
    glowColor: '#aaffff',
    baseColor: '#66ddff',
    size: 1.8,
    floats: false,
    drops: [
      { itemType: 'raw_crystal', minQuantity: 3, maxQuantity: 8, chance: 1.0 },
      { itemType: 'crystal_core', minQuantity: 1, maxQuantity: 1, chance: 0.15 },
      { itemType: 'luminous_shard', minQuantity: 2, maxQuantity: 5, chance: 0.6 }
    ],
    stabilityDrain: 5
  },

  [VeilCreatureType.VEIL_STALKER]: {
    type: VeilCreatureType.VEIL_STALKER,
    name: 'Veil Stalker',
    combatLevel: 50,
    hitpoints: 70,
    maxHit: 12,
    attackLevel: 55,
    strengthLevel: 50,
    defenceLevel: 35,
    attackSpeed: 3, // Fast attacker
    aggroRange: 8,
    respawnTime: 90000,
    veilOnly: true,
    glowColor: '#ff4400',
    baseColor: '#441100',
    size: 1.4,
    floats: false,
    drops: [
      { itemType: 'shade_cloth', minQuantity: 2, maxQuantity: 4, chance: 0.8 },
      { itemType: 'void_essence', minQuantity: 1, maxQuantity: 2, chance: 0.5 },
      { itemType: 'veil_fang', minQuantity: 1, maxQuantity: 1, chance: 0.25 }
    ],
    stabilityDrain: 8
  },

  [VeilCreatureType.VOID_WEAVER]: {
    type: VeilCreatureType.VOID_WEAVER,
    name: 'Void Weaver',
    combatLevel: 55,
    hitpoints: 60,
    maxHit: 14,
    attackLevel: 60,
    strengthLevel: 45,
    defenceLevel: 40,
    attackSpeed: 4,
    aggroRange: 6,
    respawnTime: 90000,
    veilOnly: true,
    glowColor: '#aa00ff',
    baseColor: '#330066',
    size: 1.0,
    floats: true,
    drops: [
      { itemType: 'void_essence', minQuantity: 2, maxQuantity: 4, chance: 0.9 },
      { itemType: 'luminous_thread', minQuantity: 1, maxQuantity: 2, chance: 0.4 },
      { itemType: 'void_gem', minQuantity: 1, maxQuantity: 1, chance: 0.1 }
    ],
    stabilityDrain: 10
  },

  [VeilCreatureType.LUMINARCH]: {
    type: VeilCreatureType.LUMINARCH,
    name: 'The Luminarch',
    combatLevel: 120,
    hitpoints: 250,
    maxHit: 25,
    attackLevel: 100,
    strengthLevel: 95,
    defenceLevel: 80,
    attackSpeed: 4,
    aggroRange: 10,
    respawnTime: 300000, // 5 minutes
    veilOnly: true,
    glowColor: '#ffdd00',
    baseColor: '#ffff88',
    size: 2.5,
    floats: true,
    drops: [
      { itemType: 'luminarch_essence', minQuantity: 1, maxQuantity: 1, chance: 1.0 },
      { itemType: 'crystal_core', minQuantity: 2, maxQuantity: 4, chance: 0.8 },
      { itemType: 'void_gem', minQuantity: 1, maxQuantity: 2, chance: 0.4 },
      { itemType: 'luminarch_crown', minQuantity: 1, maxQuantity: 1, chance: 0.02 }
    ],
    stabilityDrain: 15
  },

  [VeilCreatureType.VOID_HORROR]: {
    type: VeilCreatureType.VOID_HORROR,
    name: 'The Void Horror',
    combatLevel: 200,
    hitpoints: 500,
    maxHit: 40,
    attackLevel: 150,
    strengthLevel: 140,
    defenceLevel: 120,
    attackSpeed: 5,
    aggroRange: 15,
    respawnTime: 600000, // 10 minutes
    veilOnly: true,
    glowColor: '#ff00aa',
    baseColor: '#110011',
    size: 4.0,
    floats: true,
    drops: [
      { itemType: 'void_heart', minQuantity: 1, maxQuantity: 1, chance: 1.0 },
      { itemType: 'void_gem', minQuantity: 3, maxQuantity: 5, chance: 1.0 },
      { itemType: 'luminarch_essence', minQuantity: 1, maxQuantity: 2, chance: 0.5 },
      { itemType: 'void_tendril', minQuantity: 1, maxQuantity: 1, chance: 0.05 }
    ],
    stabilityDrain: 25
  }
}

/**
 * Get a Veil creature definition by type
 */
export function getVeilCreatureDefinition(type: VeilCreatureType): VeilCreatureDefinition {
  return VEIL_CREATURE_DEFINITIONS[type]
}

/**
 * Get all Veil creatures for a given tier (based on combat level)
 */
export function getVeilCreaturesByTier(tier: number): VeilCreatureDefinition[] {
  const tierRanges: Record<number, [number, number]> = {
    1: [0, 15],
    2: [16, 40],
    3: [41, 70],
    4: [71, 150],
    5: [151, 999]
  }

  const range = tierRanges[tier] || [0, 999]

  return Object.values(VEIL_CREATURE_DEFINITIONS).filter(
    (def) => def.combatLevel >= range[0] && def.combatLevel <= range[1]
  )
}
