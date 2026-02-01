// Equipment System for Realm

import { ItemType } from './items'

export enum EquipmentSlot {
  HEAD = 'head',
  BODY = 'body',
  LEGS = 'legs',
  FEET = 'feet',
  HANDS = 'hands',
  WEAPON = 'weapon',
  OFFHAND = 'offhand'
}

export interface EquipmentBonuses {
  attackBonus: number
  strengthBonus: number
  defenceBonus: number
}

export interface EquipmentRequirements {
  attack?: number
  defence?: number
  strength?: number
}

export interface EquipmentDefinition {
  slot: EquipmentSlot
  attackBonus?: number
  strengthBonus?: number
  defenceBonus?: number
  twoHanded?: boolean
  requirements?: EquipmentRequirements
}

// Lookup table for equipment stats - keyed by ItemType
export const EQUIPMENT_DEFINITIONS: Partial<Record<ItemType, EquipmentDefinition>> = {
  // Bronze tier (level 1)
  [ItemType.BRONZE_SWORD]: {
    slot: EquipmentSlot.WEAPON,
    attackBonus: 4,
    strengthBonus: 3
  },
  [ItemType.BRONZE_SHIELD]: {
    slot: EquipmentSlot.OFFHAND,
    defenceBonus: 5
  },
  [ItemType.BRONZE_HELMET]: {
    slot: EquipmentSlot.HEAD,
    defenceBonus: 3
  },
  [ItemType.BRONZE_CHESTPLATE]: {
    slot: EquipmentSlot.BODY,
    defenceBonus: 7
  },
  [ItemType.BRONZE_LEGS]: {
    slot: EquipmentSlot.LEGS,
    defenceBonus: 5
  },

  // Iron tier (level 10)
  [ItemType.IRON_SWORD]: {
    slot: EquipmentSlot.WEAPON,
    attackBonus: 8,
    strengthBonus: 6,
    requirements: { attack: 10 }
  },
  [ItemType.IRON_SHIELD]: {
    slot: EquipmentSlot.OFFHAND,
    defenceBonus: 9,
    requirements: { defence: 10 }
  },
  [ItemType.IRON_HELMET]: {
    slot: EquipmentSlot.HEAD,
    defenceBonus: 6,
    requirements: { defence: 10 }
  },
  [ItemType.IRON_CHESTPLATE]: {
    slot: EquipmentSlot.BODY,
    defenceBonus: 14,
    requirements: { defence: 10 }
  },
  [ItemType.IRON_LEGS]: {
    slot: EquipmentSlot.LEGS,
    defenceBonus: 10,
    requirements: { defence: 10 }
  },

  // Steel tier (level 20)
  [ItemType.STEEL_SWORD]: {
    slot: EquipmentSlot.WEAPON,
    attackBonus: 12,
    strengthBonus: 10,
    requirements: { attack: 20 }
  },
  [ItemType.STEEL_2H_SWORD]: {
    slot: EquipmentSlot.WEAPON,
    attackBonus: 18,
    strengthBonus: 16,
    twoHanded: true,
    requirements: { attack: 20 }
  },
  [ItemType.STEEL_SHIELD]: {
    slot: EquipmentSlot.OFFHAND,
    defenceBonus: 13,
    requirements: { defence: 20 }
  },
  [ItemType.STEEL_HELMET]: {
    slot: EquipmentSlot.HEAD,
    defenceBonus: 9,
    requirements: { defence: 20 }
  },
  [ItemType.STEEL_CHESTPLATE]: {
    slot: EquipmentSlot.BODY,
    defenceBonus: 21,
    requirements: { defence: 20 }
  },
  [ItemType.STEEL_LEGS]: {
    slot: EquipmentSlot.LEGS,
    defenceBonus: 15,
    requirements: { defence: 20 }
  },

  // Basic wooden shield (no requirements)
  [ItemType.WOODEN_SHIELD]: {
    slot: EquipmentSlot.OFFHAND,
    defenceBonus: 3
  },

  // Leather armor (no requirements, lower defence)
  [ItemType.LEATHER_BODY]: {
    slot: EquipmentSlot.BODY,
    defenceBonus: 4
  }
}

/**
 * Check if an item type can be equipped
 */
export function isEquippable(itemType: ItemType): boolean {
  return itemType in EQUIPMENT_DEFINITIONS
}

/**
 * Get equipment definition for an item type
 */
export function getEquipmentDefinition(itemType: ItemType): EquipmentDefinition | null {
  return EQUIPMENT_DEFINITIONS[itemType] ?? null
}

/**
 * Calculate total bonuses from all equipped items
 */
export function calculateTotalBonuses(
  equipment: Partial<Record<EquipmentSlot, ItemType | null>>
): EquipmentBonuses {
  let attackBonus = 0
  let strengthBonus = 0
  let defenceBonus = 0

  for (const slot of Object.values(EquipmentSlot)) {
    const itemType = equipment[slot]
    if (!itemType) continue

    const def = EQUIPMENT_DEFINITIONS[itemType]
    if (!def) continue

    attackBonus += def.attackBonus ?? 0
    strengthBonus += def.strengthBonus ?? 0
    defenceBonus += def.defenceBonus ?? 0
  }

  return { attackBonus, strengthBonus, defenceBonus }
}

/**
 * Get the slot an item goes into
 */
export function getEquipmentSlot(itemType: ItemType): EquipmentSlot | null {
  const def = EQUIPMENT_DEFINITIONS[itemType]
  return def?.slot ?? null
}

/**
 * Check if an item is two-handed
 */
export function isTwoHanded(itemType: ItemType): boolean {
  const def = EQUIPMENT_DEFINITIONS[itemType]
  return def?.twoHanded ?? false
}

/**
 * Get requirements for equipping an item
 */
export function getEquipmentRequirements(itemType: ItemType): EquipmentRequirements | null {
  const def = EQUIPMENT_DEFINITIONS[itemType]
  return def?.requirements ?? null
}
