// Item System for Realm

export enum ItemType {
  // Currency
  COINS = 'coins',

  // Logs
  LOGS = 'logs',
  OAK_LOGS = 'oak_logs',
  WILLOW_LOGS = 'willow_logs',

  // Raw Fish
  RAW_SHRIMP = 'raw_shrimp',
  RAW_TROUT = 'raw_trout',
  RAW_SALMON = 'raw_salmon',
  RAW_LOBSTER = 'raw_lobster',

  // Cooked Fish
  COOKED_SHRIMP = 'cooked_shrimp',
  COOKED_TROUT = 'cooked_trout',
  COOKED_SALMON = 'cooked_salmon',
  COOKED_LOBSTER = 'cooked_lobster',

  // Burnt
  BURNT_FISH = 'burnt_fish',

  // Fishing bait/equipment (stackable)
  FEATHERS = 'feathers',
  FISHING_BAIT = 'fishing_bait'
}

export interface ItemDefinition {
  type: ItemType
  name: string
  description: string
  stackable: boolean
  value: number // base gold value
}

export const ITEM_DEFINITIONS: Record<ItemType, ItemDefinition> = {
  // Currency
  [ItemType.COINS]: {
    type: ItemType.COINS,
    name: 'Coins',
    description: 'Gold coins',
    stackable: true,
    value: 1
  },

  // Stackable supplies
  [ItemType.FEATHERS]: {
    type: ItemType.FEATHERS,
    name: 'Feathers',
    description: 'Used for fly fishing',
    stackable: true,
    value: 2
  },
  [ItemType.FISHING_BAIT]: {
    type: ItemType.FISHING_BAIT,
    name: 'Fishing Bait',
    description: 'Used for bait fishing',
    stackable: true,
    value: 3
  },

  // Logs
  [ItemType.LOGS]: {
    type: ItemType.LOGS,
    name: 'Logs',
    description: 'Regular logs from a tree',
    stackable: false,
    value: 4
  },
  [ItemType.OAK_LOGS]: {
    type: ItemType.OAK_LOGS,
    name: 'Oak Logs',
    description: 'Logs from an oak tree',
    stackable: false,
    value: 20
  },
  [ItemType.WILLOW_LOGS]: {
    type: ItemType.WILLOW_LOGS,
    name: 'Willow Logs',
    description: 'Logs from a willow tree',
    stackable: false,
    value: 40
  },

  // Raw Fish
  [ItemType.RAW_SHRIMP]: {
    type: ItemType.RAW_SHRIMP,
    name: 'Raw Shrimp',
    description: 'Needs to be cooked',
    stackable: false,
    value: 5
  },
  [ItemType.RAW_TROUT]: {
    type: ItemType.RAW_TROUT,
    name: 'Raw Trout',
    description: 'Needs to be cooked',
    stackable: false,
    value: 20
  },
  [ItemType.RAW_SALMON]: {
    type: ItemType.RAW_SALMON,
    name: 'Raw Salmon',
    description: 'Needs to be cooked',
    stackable: false,
    value: 50
  },
  [ItemType.RAW_LOBSTER]: {
    type: ItemType.RAW_LOBSTER,
    name: 'Raw Lobster',
    description: 'Needs to be cooked',
    stackable: false,
    value: 120
  },

  // Cooked Fish
  [ItemType.COOKED_SHRIMP]: {
    type: ItemType.COOKED_SHRIMP,
    name: 'Shrimp',
    description: 'Heals 3 HP',
    stackable: false,
    value: 10
  },
  [ItemType.COOKED_TROUT]: {
    type: ItemType.COOKED_TROUT,
    name: 'Trout',
    description: 'Heals 7 HP',
    stackable: false,
    value: 40
  },
  [ItemType.COOKED_SALMON]: {
    type: ItemType.COOKED_SALMON,
    name: 'Salmon',
    description: 'Heals 9 HP',
    stackable: false,
    value: 100
  },
  [ItemType.COOKED_LOBSTER]: {
    type: ItemType.COOKED_LOBSTER,
    name: 'Lobster',
    description: 'Heals 12 HP',
    stackable: false,
    value: 250
  },

  // Burnt
  [ItemType.BURNT_FISH]: {
    type: ItemType.BURNT_FISH,
    name: 'Burnt Fish',
    description: 'Oops...',
    stackable: false,
    value: 0
  }
}

// Healing amounts for food
export const FOOD_HEALING: Partial<Record<ItemType, number>> = {
  [ItemType.COOKED_SHRIMP]: 3,
  [ItemType.COOKED_TROUT]: 7,
  [ItemType.COOKED_SALMON]: 9,
  [ItemType.COOKED_LOBSTER]: 12
}
