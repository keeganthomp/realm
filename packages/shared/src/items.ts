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
  FISHING_BAIT = 'fishing_bait',

  // Combat drops
  BONES = 'bones',
  COWHIDE = 'cowhide',

  // Raw meat
  RAW_CHICKEN = 'raw_chicken',
  RAW_BEEF = 'raw_beef',

  // Cooked meat
  COOKED_CHICKEN = 'cooked_chicken',
  COOKED_BEEF = 'cooked_beef',

  // Mining ores
  COPPER_ORE = 'copper_ore',
  TIN_ORE = 'tin_ore',
  IRON_ORE = 'iron_ore',
  COAL = 'coal',

  // Metal bars (smelted)
  BRONZE_BAR = 'bronze_bar',
  IRON_BAR = 'iron_bar',
  STEEL_BAR = 'steel_bar',

  // Equipment - Bronze tier
  BRONZE_SWORD = 'bronze_sword',
  BRONZE_SHIELD = 'bronze_shield',
  BRONZE_HELMET = 'bronze_helmet',
  BRONZE_CHESTPLATE = 'bronze_chestplate',
  BRONZE_LEGS = 'bronze_legs',

  // Equipment - Iron tier
  IRON_SWORD = 'iron_sword',
  IRON_SHIELD = 'iron_shield',
  IRON_HELMET = 'iron_helmet',
  IRON_CHESTPLATE = 'iron_chestplate',
  IRON_LEGS = 'iron_legs',

  // Equipment - Steel tier
  STEEL_SWORD = 'steel_sword',
  STEEL_2H_SWORD = 'steel_2h_sword',
  STEEL_SHIELD = 'steel_shield',
  STEEL_HELMET = 'steel_helmet',
  STEEL_CHESTPLATE = 'steel_chestplate',
  STEEL_LEGS = 'steel_legs',

  // Basic equipment (no requirements)
  WOODEN_SHIELD = 'wooden_shield',
  LEATHER_BODY = 'leather_body'
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
  },

  // Combat drops
  [ItemType.BONES]: {
    type: ItemType.BONES,
    name: 'Bones',
    description: 'Bury these for Prayer XP',
    stackable: false,
    value: 1
  },
  [ItemType.COWHIDE]: {
    type: ItemType.COWHIDE,
    name: 'Cowhide',
    description: 'Can be tanned into leather',
    stackable: false,
    value: 10
  },

  // Raw meat
  [ItemType.RAW_CHICKEN]: {
    type: ItemType.RAW_CHICKEN,
    name: 'Raw Chicken',
    description: 'Needs to be cooked',
    stackable: false,
    value: 5
  },
  [ItemType.RAW_BEEF]: {
    type: ItemType.RAW_BEEF,
    name: 'Raw Beef',
    description: 'Needs to be cooked',
    stackable: false,
    value: 5
  },

  // Cooked meat
  [ItemType.COOKED_CHICKEN]: {
    type: ItemType.COOKED_CHICKEN,
    name: 'Cooked Chicken',
    description: 'Heals 3 HP',
    stackable: false,
    value: 10
  },
  [ItemType.COOKED_BEEF]: {
    type: ItemType.COOKED_BEEF,
    name: 'Cooked Beef',
    description: 'Heals 3 HP',
    stackable: false,
    value: 10
  },

  // Mining ores
  [ItemType.COPPER_ORE]: {
    type: ItemType.COPPER_ORE,
    name: 'Copper Ore',
    description: 'Can be smelted with tin to make bronze',
    stackable: false,
    value: 5
  },
  [ItemType.TIN_ORE]: {
    type: ItemType.TIN_ORE,
    name: 'Tin Ore',
    description: 'Can be smelted with copper to make bronze',
    stackable: false,
    value: 5
  },
  [ItemType.IRON_ORE]: {
    type: ItemType.IRON_ORE,
    name: 'Iron Ore',
    description: 'Can be smelted into an iron bar',
    stackable: false,
    value: 25
  },
  [ItemType.COAL]: {
    type: ItemType.COAL,
    name: 'Coal',
    description: 'Used to smelt higher-level ores',
    stackable: false,
    value: 45
  },

  // Metal bars
  [ItemType.BRONZE_BAR]: {
    type: ItemType.BRONZE_BAR,
    name: 'Bronze Bar',
    description: 'Used to smith bronze items',
    stackable: false,
    value: 15
  },
  [ItemType.IRON_BAR]: {
    type: ItemType.IRON_BAR,
    name: 'Iron Bar',
    description: 'Used to smith iron items',
    stackable: false,
    value: 75
  },
  [ItemType.STEEL_BAR]: {
    type: ItemType.STEEL_BAR,
    name: 'Steel Bar',
    description: 'Used to smith steel items',
    stackable: false,
    value: 150
  },

  // Equipment - Bronze tier
  [ItemType.BRONZE_SWORD]: {
    type: ItemType.BRONZE_SWORD,
    name: 'Bronze Sword',
    description: 'A basic bronze sword',
    stackable: false,
    value: 26
  },
  [ItemType.BRONZE_SHIELD]: {
    type: ItemType.BRONZE_SHIELD,
    name: 'Bronze Shield',
    description: 'A basic bronze shield',
    stackable: false,
    value: 32
  },
  [ItemType.BRONZE_HELMET]: {
    type: ItemType.BRONZE_HELMET,
    name: 'Bronze Helmet',
    description: 'A basic bronze helmet',
    stackable: false,
    value: 24
  },
  [ItemType.BRONZE_CHESTPLATE]: {
    type: ItemType.BRONZE_CHESTPLATE,
    name: 'Bronze Chestplate',
    description: 'A basic bronze chestplate',
    stackable: false,
    value: 80
  },
  [ItemType.BRONZE_LEGS]: {
    type: ItemType.BRONZE_LEGS,
    name: 'Bronze Platelegs',
    description: 'Basic bronze leg armor',
    stackable: false,
    value: 52
  },

  // Equipment - Iron tier
  [ItemType.IRON_SWORD]: {
    type: ItemType.IRON_SWORD,
    name: 'Iron Sword',
    description: 'A sturdy iron sword',
    stackable: false,
    value: 91
  },
  [ItemType.IRON_SHIELD]: {
    type: ItemType.IRON_SHIELD,
    name: 'Iron Shield',
    description: 'A sturdy iron shield',
    stackable: false,
    value: 112
  },
  [ItemType.IRON_HELMET]: {
    type: ItemType.IRON_HELMET,
    name: 'Iron Helmet',
    description: 'A sturdy iron helmet',
    stackable: false,
    value: 84
  },
  [ItemType.IRON_CHESTPLATE]: {
    type: ItemType.IRON_CHESTPLATE,
    name: 'Iron Chestplate',
    description: 'A sturdy iron chestplate',
    stackable: false,
    value: 280
  },
  [ItemType.IRON_LEGS]: {
    type: ItemType.IRON_LEGS,
    name: 'Iron Platelegs',
    description: 'Sturdy iron leg armor',
    stackable: false,
    value: 182
  },

  // Equipment - Steel tier
  [ItemType.STEEL_SWORD]: {
    type: ItemType.STEEL_SWORD,
    name: 'Steel Sword',
    description: 'A strong steel sword',
    stackable: false,
    value: 325
  },
  [ItemType.STEEL_2H_SWORD]: {
    type: ItemType.STEEL_2H_SWORD,
    name: 'Steel 2H Sword',
    description: 'A powerful two-handed steel sword',
    stackable: false,
    value: 650
  },
  [ItemType.STEEL_SHIELD]: {
    type: ItemType.STEEL_SHIELD,
    name: 'Steel Shield',
    description: 'A strong steel shield',
    stackable: false,
    value: 400
  },
  [ItemType.STEEL_HELMET]: {
    type: ItemType.STEEL_HELMET,
    name: 'Steel Helmet',
    description: 'A strong steel helmet',
    stackable: false,
    value: 300
  },
  [ItemType.STEEL_CHESTPLATE]: {
    type: ItemType.STEEL_CHESTPLATE,
    name: 'Steel Chestplate',
    description: 'A strong steel chestplate',
    stackable: false,
    value: 1000
  },
  [ItemType.STEEL_LEGS]: {
    type: ItemType.STEEL_LEGS,
    name: 'Steel Platelegs',
    description: 'Strong steel leg armor',
    stackable: false,
    value: 650
  },

  // Basic equipment (no requirements)
  [ItemType.WOODEN_SHIELD]: {
    type: ItemType.WOODEN_SHIELD,
    name: 'Wooden Shield',
    description: 'A simple wooden shield',
    stackable: false,
    value: 10
  },
  [ItemType.LEATHER_BODY]: {
    type: ItemType.LEATHER_BODY,
    name: 'Leather Body',
    description: 'Basic leather armor',
    stackable: false,
    value: 20
  }
}

// Healing amounts for food
export const FOOD_HEALING: Partial<Record<ItemType, number>> = {
  [ItemType.COOKED_SHRIMP]: 3,
  [ItemType.COOKED_TROUT]: 7,
  [ItemType.COOKED_SALMON]: 9,
  [ItemType.COOKED_LOBSTER]: 12,
  [ItemType.COOKED_CHICKEN]: 3,
  [ItemType.COOKED_BEEF]: 3
}

// Check if an item is edible
export function isFood(itemType: ItemType): boolean {
  return FOOD_HEALING[itemType] !== undefined
}
