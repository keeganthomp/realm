// World Objects for Realm

import { SkillType } from './skills'
import { ItemType } from './items'

export enum WorldObjectType {
  // Trees
  TREE = 'tree',
  OAK_TREE = 'oak_tree',
  WILLOW_TREE = 'willow_tree',

  // Fishing spots
  FISHING_SPOT_NET = 'fishing_spot_net',
  FISHING_SPOT_ROD = 'fishing_spot_rod',

  // Fire
  FIRE = 'fire',

  // Bank
  BANK_BOOTH = 'bank_booth',

  // Cooking
  COOKING_RANGE = 'cooking_range',

  // Market stalls (shops)
  MARKET_STALL_FOOD = 'market_stall_food',
  MARKET_STALL_WEAPONS = 'market_stall_weapons',
  MARKET_STALL_GENERAL = 'market_stall_general',
  MARKET_STALL_FISH = 'market_stall_fish',

  // Water features
  FOUNTAIN = 'fountain',
  WELL = 'well',

  // Lighting
  TORCH_STAND = 'torch_stand',

  // Containers
  BARREL = 'barrel',
  CRATE = 'crate',

  // Smithing
  ANVIL = 'anvil',

  // Furniture
  BENCH = 'bench',
  TABLE = 'table',

  // Decorative
  FLOWER_PATCH = 'flower_patch',
  SIGN_POST = 'sign_post',
  HAY_BALE = 'hay_bale',
  BUSH = 'bush',
  ROCK = 'rock',

  // Mining ores
  COPPER_ORE = 'copper_ore',
  TIN_ORE = 'tin_ore',
  IRON_ORE = 'iron_ore',
  COAL_ORE = 'coal_ore',

  // Interior furniture
  COUNTER = 'counter',
  BOOKSHELF = 'bookshelf',
  BED = 'bed',
  CHAIR = 'chair',
  STOOL = 'stool',
  FIREPLACE = 'fireplace',
  CHEST = 'chest',
  LADDER = 'ladder',
  BAR_COUNTER = 'bar_counter',

  // Wilderness structures
  GOBLIN_TENT = 'goblin_tent',
  PALISADE_WALL = 'palisade_wall',
  CAMPFIRE_LARGE = 'campfire_large',
  BONES_PILE = 'bones_pile',

  // Ruins
  RUINED_WALL = 'ruined_wall',
  RUINED_COLUMN = 'ruined_column',
  STONE_RUBBLE = 'stone_rubble',
  ANCIENT_ALTAR = 'ancient_altar',

  // Nature
  FALLEN_LOG = 'fallen_log',
  MUSHROOM_PATCH = 'mushroom_patch',
  OLD_STUMP = 'old_stump',

  // Mine props
  MINE_CART = 'mine_cart',
  MINE_ENTRANCE = 'mine_entrance',

  // Veil dimension
  VEIL_RIFT = 'veil_rift',
  VEIL_CRYSTAL = 'veil_crystal',
  VEIL_TOUCHED_PLANT = 'veil_touched_plant',
  WARDEN_MONUMENT = 'warden_monument',

  // Signs and lore
  TOWN_SIGN = 'town_sign',
  LORE_PLAQUE = 'lore_plaque',
  NOTICE_BOARD = 'notice_board'
}

// Action categories determine how interactions are handled
export enum ActionCategory {
  SKILL = 'skill',       // Skilling action - checks level, inventory, grants XP
  EXAMINE = 'examine',   // Just shows examine text
  READ = 'read',         // Shows readable content (signs, books)
  SHOP = 'shop',         // Opens shop interface
  BANK = 'bank',         // Opens bank interface
  VEIL = 'veil',         // Veil rift - enter expedition
  NONE = 'none'          // No interaction (pure decoration)
}

export interface WorldObjectDefinition {
  type: WorldObjectType
  name: string
  action: string // "Chop", "Fish", "Cook", "Examine", "Read", "Trade"
  actionCategory: ActionCategory
  examineText?: string // Text shown when examined/read
  shopId?: string // Shop identifier for shop objects
  // Skill-related (only used when actionCategory === SKILL)
  skill?: SkillType
  levelRequired?: number
  xpGain?: number
  actionTime?: number // milliseconds
  yields?: ItemType
  respawnTime?: number // milliseconds (0 = never despawns)
  depletionChance?: number // 0-1, chance to deplete after each action
}

export const WORLD_OBJECT_DEFINITIONS: Record<WorldObjectType, WorldObjectDefinition> = {
  // ============ SKILL OBJECTS ============
  // Trees
  [WorldObjectType.TREE]: {
    type: WorldObjectType.TREE,
    name: 'Tree',
    action: 'Chop',
    actionCategory: ActionCategory.SKILL,
    skill: SkillType.WOODCUTTING,
    levelRequired: 1,
    xpGain: 25,
    actionTime: 2400,
    yields: ItemType.LOGS,
    respawnTime: 10000,
    depletionChance: 0.125
  },
  [WorldObjectType.OAK_TREE]: {
    type: WorldObjectType.OAK_TREE,
    name: 'Oak Tree',
    action: 'Chop',
    actionCategory: ActionCategory.SKILL,
    skill: SkillType.WOODCUTTING,
    levelRequired: 15,
    xpGain: 37.5,
    actionTime: 2800,
    yields: ItemType.OAK_LOGS,
    respawnTime: 15000,
    depletionChance: 0.125
  },
  [WorldObjectType.WILLOW_TREE]: {
    type: WorldObjectType.WILLOW_TREE,
    name: 'Willow Tree',
    action: 'Chop',
    actionCategory: ActionCategory.SKILL,
    skill: SkillType.WOODCUTTING,
    levelRequired: 30,
    xpGain: 67.5,
    actionTime: 3200,
    yields: ItemType.WILLOW_LOGS,
    respawnTime: 20000,
    depletionChance: 0.125
  },

  // Fishing spots
  [WorldObjectType.FISHING_SPOT_NET]: {
    type: WorldObjectType.FISHING_SPOT_NET,
    name: 'Fishing Spot',
    action: 'Net',
    actionCategory: ActionCategory.SKILL,
    skill: SkillType.FISHING,
    levelRequired: 1,
    xpGain: 10,
    actionTime: 2000,
    yields: ItemType.RAW_SHRIMP,
    respawnTime: 0,
    depletionChance: 0
  },
  [WorldObjectType.FISHING_SPOT_ROD]: {
    type: WorldObjectType.FISHING_SPOT_ROD,
    name: 'Fishing Spot',
    action: 'Lure',
    actionCategory: ActionCategory.SKILL,
    skill: SkillType.FISHING,
    levelRequired: 20,
    xpGain: 50,
    actionTime: 3000,
    yields: ItemType.RAW_TROUT,
    respawnTime: 0,
    depletionChance: 0
  },

  // Mining ores
  [WorldObjectType.COPPER_ORE]: {
    type: WorldObjectType.COPPER_ORE,
    name: 'Copper Rock',
    action: 'Mine',
    actionCategory: ActionCategory.SKILL,
    skill: SkillType.MINING,
    levelRequired: 1,
    xpGain: 17.5,
    actionTime: 2400,
    yields: ItemType.COPPER_ORE,
    respawnTime: 4000,
    depletionChance: 1.0
  },
  [WorldObjectType.TIN_ORE]: {
    type: WorldObjectType.TIN_ORE,
    name: 'Tin Rock',
    action: 'Mine',
    actionCategory: ActionCategory.SKILL,
    skill: SkillType.MINING,
    levelRequired: 1,
    xpGain: 17.5,
    actionTime: 2400,
    yields: ItemType.TIN_ORE,
    respawnTime: 4000,
    depletionChance: 1.0
  },
  [WorldObjectType.IRON_ORE]: {
    type: WorldObjectType.IRON_ORE,
    name: 'Iron Rock',
    action: 'Mine',
    actionCategory: ActionCategory.SKILL,
    skill: SkillType.MINING,
    levelRequired: 15,
    xpGain: 35,
    actionTime: 3000,
    yields: ItemType.IRON_ORE,
    respawnTime: 8000,
    depletionChance: 1.0
  },
  [WorldObjectType.COAL_ORE]: {
    type: WorldObjectType.COAL_ORE,
    name: 'Coal Rock',
    action: 'Mine',
    actionCategory: ActionCategory.SKILL,
    skill: SkillType.MINING,
    levelRequired: 30,
    xpGain: 50,
    actionTime: 3500,
    yields: ItemType.COAL,
    respawnTime: 30000,
    depletionChance: 1.0
  },

  // Cooking
  [WorldObjectType.FIRE]: {
    type: WorldObjectType.FIRE,
    name: 'Fire',
    action: 'Cook',
    actionCategory: ActionCategory.SKILL,
    skill: SkillType.COOKING,
    levelRequired: 1,
    xpGain: 30,
    actionTime: 1800,
    yields: ItemType.COOKED_SHRIMP,
    respawnTime: 60000,
    depletionChance: 0
  },
  [WorldObjectType.COOKING_RANGE]: {
    type: WorldObjectType.COOKING_RANGE,
    name: 'Cooking Range',
    action: 'Cook',
    actionCategory: ActionCategory.SKILL,
    skill: SkillType.COOKING,
    levelRequired: 1,
    xpGain: 30,
    actionTime: 1800,
    yields: ItemType.COOKED_SHRIMP,
    respawnTime: 0,
    depletionChance: 0
  },

  // ============ BANK ============
  [WorldObjectType.BANK_BOOTH]: {
    type: WorldObjectType.BANK_BOOTH,
    name: 'Bank Booth',
    action: 'Bank',
    actionCategory: ActionCategory.BANK,
    examineText: 'A bank booth where you can store your items.'
  },

  // ============ SHOPS ============
  [WorldObjectType.MARKET_STALL_FOOD]: {
    type: WorldObjectType.MARKET_STALL_FOOD,
    name: 'Food Stall',
    action: 'Trade',
    actionCategory: ActionCategory.SHOP,
    shopId: 'food_stall',
    examineText: 'A market stall selling food and provisions.'
  },
  [WorldObjectType.MARKET_STALL_WEAPONS]: {
    type: WorldObjectType.MARKET_STALL_WEAPONS,
    name: 'Weapons Stall',
    action: 'Trade',
    actionCategory: ActionCategory.SHOP,
    shopId: 'weapons_stall',
    examineText: 'A market stall selling basic weapons and armor.'
  },
  [WorldObjectType.MARKET_STALL_GENERAL]: {
    type: WorldObjectType.MARKET_STALL_GENERAL,
    name: 'General Store',
    action: 'Trade',
    actionCategory: ActionCategory.SHOP,
    shopId: 'general_store',
    examineText: 'A general store selling various supplies.'
  },
  [WorldObjectType.MARKET_STALL_FISH]: {
    type: WorldObjectType.MARKET_STALL_FISH,
    name: 'Fish Stall',
    action: 'Trade',
    actionCategory: ActionCategory.SHOP,
    shopId: 'fish_stall',
    examineText: 'A market stall selling fresh fish and fishing supplies.'
  },

  // ============ EXAMINE/DECORATIVE ============
  [WorldObjectType.FOUNTAIN]: {
    type: WorldObjectType.FOUNTAIN,
    name: 'Fountain',
    action: 'Examine',
    actionCategory: ActionCategory.EXAMINE,
    examineText: 'A beautiful stone fountain. Water flows gently from the top.'
  },
  [WorldObjectType.WELL]: {
    type: WorldObjectType.WELL,
    name: 'Well',
    action: 'Examine',
    actionCategory: ActionCategory.EXAMINE,
    examineText: 'A deep stone well. You can hear water at the bottom.'
  },
  [WorldObjectType.TORCH_STAND]: {
    type: WorldObjectType.TORCH_STAND,
    name: 'Torch',
    action: 'Examine',
    actionCategory: ActionCategory.EXAMINE,
    examineText: 'A burning torch providing light.'
  },
  [WorldObjectType.BARREL]: {
    type: WorldObjectType.BARREL,
    name: 'Barrel',
    action: 'Examine',
    actionCategory: ActionCategory.EXAMINE,
    examineText: 'A wooden barrel. It seems to be empty.'
  },
  [WorldObjectType.CRATE]: {
    type: WorldObjectType.CRATE,
    name: 'Crate',
    action: 'Examine',
    actionCategory: ActionCategory.EXAMINE,
    examineText: 'A wooden crate used for storage.'
  },
  [WorldObjectType.ANVIL]: {
    type: WorldObjectType.ANVIL,
    name: 'Anvil',
    action: 'Examine',
    actionCategory: ActionCategory.EXAMINE,
    examineText: 'A sturdy iron anvil for smithing.'
  },
  [WorldObjectType.BENCH]: {
    type: WorldObjectType.BENCH,
    name: 'Bench',
    action: 'Examine',
    actionCategory: ActionCategory.EXAMINE,
    examineText: 'A wooden bench for resting.'
  },
  [WorldObjectType.TABLE]: {
    type: WorldObjectType.TABLE,
    name: 'Table',
    action: 'Examine',
    actionCategory: ActionCategory.EXAMINE,
    examineText: 'A simple wooden table.'
  },
  [WorldObjectType.FLOWER_PATCH]: {
    type: WorldObjectType.FLOWER_PATCH,
    name: 'Flowers',
    action: 'Examine',
    actionCategory: ActionCategory.EXAMINE,
    examineText: 'A colorful patch of wildflowers.'
  },
  [WorldObjectType.HAY_BALE]: {
    type: WorldObjectType.HAY_BALE,
    name: 'Hay Bale',
    action: 'Examine',
    actionCategory: ActionCategory.EXAMINE,
    examineText: 'A bundle of dried hay.'
  },
  [WorldObjectType.BUSH]: {
    type: WorldObjectType.BUSH,
    name: 'Bush',
    action: 'Examine',
    actionCategory: ActionCategory.EXAMINE,
    examineText: 'A leafy green bush.'
  },
  [WorldObjectType.ROCK]: {
    type: WorldObjectType.ROCK,
    name: 'Rock',
    action: 'Examine',
    actionCategory: ActionCategory.EXAMINE,
    examineText: 'A large boulder.'
  },

  // ============ READ (shows dialog content) ============
  [WorldObjectType.SIGN_POST]: {
    type: WorldObjectType.SIGN_POST,
    name: 'Sign Post',
    action: 'Read',
    actionCategory: ActionCategory.READ,
    examineText: 'Welcome to Thornwick!\nThe heart of the realm.'
  },

  // ============ INTERIOR FURNITURE ============
  [WorldObjectType.COUNTER]: {
    type: WorldObjectType.COUNTER,
    name: 'Counter',
    action: 'Examine',
    actionCategory: ActionCategory.EXAMINE,
    examineText: 'A wooden service counter.'
  },
  [WorldObjectType.BOOKSHELF]: {
    type: WorldObjectType.BOOKSHELF,
    name: 'Bookshelf',
    action: 'Examine',
    actionCategory: ActionCategory.EXAMINE,
    examineText: 'Shelves filled with dusty tomes.'
  },
  [WorldObjectType.BED]: {
    type: WorldObjectType.BED,
    name: 'Bed',
    action: 'Examine',
    actionCategory: ActionCategory.EXAMINE,
    examineText: 'A cozy bed for weary travelers.'
  },
  [WorldObjectType.CHAIR]: {
    type: WorldObjectType.CHAIR,
    name: 'Chair',
    action: 'Examine',
    actionCategory: ActionCategory.EXAMINE,
    examineText: 'A wooden chair.'
  },
  [WorldObjectType.STOOL]: {
    type: WorldObjectType.STOOL,
    name: 'Stool',
    action: 'Examine',
    actionCategory: ActionCategory.EXAMINE,
    examineText: 'A simple bar stool.'
  },
  [WorldObjectType.FIREPLACE]: {
    type: WorldObjectType.FIREPLACE,
    name: 'Fireplace',
    action: 'Examine',
    actionCategory: ActionCategory.EXAMINE,
    examineText: 'A warm stone fireplace. The fire crackles invitingly.'
  },
  [WorldObjectType.CHEST]: {
    type: WorldObjectType.CHEST,
    name: 'Chest',
    action: 'Examine',
    actionCategory: ActionCategory.EXAMINE,
    examineText: 'A wooden chest. It appears to be locked.'
  },
  [WorldObjectType.LADDER]: {
    type: WorldObjectType.LADDER,
    name: 'Ladder',
    action: 'Examine',
    actionCategory: ActionCategory.EXAMINE,
    examineText: 'A wooden ladder leading up.'
  },
  [WorldObjectType.BAR_COUNTER]: {
    type: WorldObjectType.BAR_COUNTER,
    name: 'Bar Counter',
    action: 'Examine',
    actionCategory: ActionCategory.EXAMINE,
    examineText: 'A polished bar counter with drink stains.'
  },

  // ============ WILDERNESS STRUCTURES ============
  [WorldObjectType.GOBLIN_TENT]: {
    type: WorldObjectType.GOBLIN_TENT,
    name: 'Goblin Tent',
    action: 'Examine',
    actionCategory: ActionCategory.EXAMINE,
    examineText: 'A crude tent made of animal hides. It smells terrible.'
  },
  [WorldObjectType.PALISADE_WALL]: {
    type: WorldObjectType.PALISADE_WALL,
    name: 'Palisade Wall',
    action: 'Examine',
    actionCategory: ActionCategory.EXAMINE,
    examineText: 'Sharpened wooden stakes forming a defensive wall.'
  },
  [WorldObjectType.CAMPFIRE_LARGE]: {
    type: WorldObjectType.CAMPFIRE_LARGE,
    name: 'Campfire',
    action: 'Examine',
    actionCategory: ActionCategory.EXAMINE,
    examineText: 'A large campfire. The embers glow hot.'
  },
  [WorldObjectType.BONES_PILE]: {
    type: WorldObjectType.BONES_PILE,
    name: 'Bones',
    action: 'Examine',
    actionCategory: ActionCategory.EXAMINE,
    examineText: 'A pile of old bones. Best not to think about their origin.'
  },

  // ============ RUINS ============
  [WorldObjectType.RUINED_WALL]: {
    type: WorldObjectType.RUINED_WALL,
    name: 'Ruined Wall',
    action: 'Examine',
    actionCategory: ActionCategory.EXAMINE,
    examineText: 'The remains of an ancient stone wall, crumbling with age.'
  },
  [WorldObjectType.RUINED_COLUMN]: {
    type: WorldObjectType.RUINED_COLUMN,
    name: 'Ruined Column',
    action: 'Examine',
    actionCategory: ActionCategory.EXAMINE,
    examineText: 'A broken stone column from a forgotten era.'
  },
  [WorldObjectType.STONE_RUBBLE]: {
    type: WorldObjectType.STONE_RUBBLE,
    name: 'Stone Rubble',
    action: 'Examine',
    actionCategory: ActionCategory.EXAMINE,
    examineText: 'A pile of ancient stone rubble.'
  },
  [WorldObjectType.ANCIENT_ALTAR]: {
    type: WorldObjectType.ANCIENT_ALTAR,
    name: 'Ancient Altar',
    action: 'Examine',
    actionCategory: ActionCategory.EXAMINE,
    examineText: 'A mysterious stone altar covered in strange symbols.'
  },

  // ============ NATURE ============
  [WorldObjectType.FALLEN_LOG]: {
    type: WorldObjectType.FALLEN_LOG,
    name: 'Fallen Log',
    action: 'Examine',
    actionCategory: ActionCategory.EXAMINE,
    examineText: 'A moss-covered fallen tree.'
  },
  [WorldObjectType.MUSHROOM_PATCH]: {
    type: WorldObjectType.MUSHROOM_PATCH,
    name: 'Mushrooms',
    action: 'Examine',
    actionCategory: ActionCategory.EXAMINE,
    examineText: 'A cluster of colorful mushrooms.'
  },
  [WorldObjectType.OLD_STUMP]: {
    type: WorldObjectType.OLD_STUMP,
    name: 'Tree Stump',
    action: 'Examine',
    actionCategory: ActionCategory.EXAMINE,
    examineText: 'The stump of a tree long since felled.'
  },

  // ============ MINE PROPS ============
  [WorldObjectType.MINE_CART]: {
    type: WorldObjectType.MINE_CART,
    name: 'Mine Cart',
    action: 'Examine',
    actionCategory: ActionCategory.EXAMINE,
    examineText: 'An old rusty mine cart. It looks abandoned.'
  },
  [WorldObjectType.MINE_ENTRANCE]: {
    type: WorldObjectType.MINE_ENTRANCE,
    name: 'Mine Entrance',
    action: 'Examine',
    actionCategory: ActionCategory.EXAMINE,
    examineText: 'A boarded-up mine entrance. Something lurks within...'
  },

  // ============ VEIL DIMENSION ============
  [WorldObjectType.VEIL_RIFT]: {
    type: WorldObjectType.VEIL_RIFT,
    name: 'Veil Rift',
    action: 'Enter',
    actionCategory: ActionCategory.VEIL,
    examineText: 'A shimmering tear in reality. Strange energies pulse from within.'
  },
  [WorldObjectType.VEIL_CRYSTAL]: {
    type: WorldObjectType.VEIL_CRYSTAL,
    name: 'Veil Crystal',
    action: 'Examine',
    actionCategory: ActionCategory.EXAMINE,
    examineText:
      'A crystallized shard of Veil energy. It pulses with an otherworldly glow, a remnant of The Sundering.'
  },
  [WorldObjectType.VEIL_TOUCHED_PLANT]: {
    type: WorldObjectType.VEIL_TOUCHED_PLANT,
    name: 'Veil-Touched Plant',
    action: 'Examine',
    actionCategory: ActionCategory.EXAMINE,
    examineText:
      'A plant mutated by proximity to the rift. Its leaves shimmer with faint purple luminescence.'
  },
  [WorldObjectType.WARDEN_MONUMENT]: {
    type: WorldObjectType.WARDEN_MONUMENT,
    name: 'Warden Monument',
    action: 'Examine',
    actionCategory: ActionCategory.EXAMINE,
    examineText:
      'A weathered statue of a Veil Warden. These guardians once protected the boundary between worlds.'
  },

  // ============ SIGNS AND LORE ============
  [WorldObjectType.TOWN_SIGN]: {
    type: WorldObjectType.TOWN_SIGN,
    name: 'Town Sign',
    action: 'Read',
    actionCategory: ActionCategory.READ,
    examineText: 'Welcome to Thornwick\nLast bastion before The Veil'
  },
  [WorldObjectType.LORE_PLAQUE]: {
    type: WorldObjectType.LORE_PLAQUE,
    name: 'Memorial Plaque',
    action: 'Read',
    actionCategory: ActionCategory.READ,
    examineText:
      'In memory of the Veil Wardens\nWho gave their lives during The Sundering\nMay their sacrifice never be forgotten'
  },
  [WorldObjectType.NOTICE_BOARD]: {
    type: WorldObjectType.NOTICE_BOARD,
    name: 'Notice Board',
    action: 'Read',
    actionCategory: ActionCategory.READ,
    examineText:
      'ADVENTURERS WANTED\nThe Veil grows unstable. Brave souls needed to venture within.\nSpeak to the Veil Scholar for training.\n\n- Town Council of Thornwick'
  }
}

// Cooking recipes
export interface CookingRecipe {
  raw: ItemType
  cooked: ItemType
  levelRequired: number
  xpGain: number
  burnStopLevel: number // level at which you stop burning
}

export const COOKING_RECIPES: CookingRecipe[] = [
  {
    raw: ItemType.RAW_SHRIMP,
    cooked: ItemType.COOKED_SHRIMP,
    levelRequired: 1,
    xpGain: 30,
    burnStopLevel: 34
  },
  {
    raw: ItemType.RAW_CHICKEN,
    cooked: ItemType.COOKED_CHICKEN,
    levelRequired: 1,
    xpGain: 30,
    burnStopLevel: 34
  },
  {
    raw: ItemType.RAW_BEEF,
    cooked: ItemType.COOKED_BEEF,
    levelRequired: 1,
    xpGain: 30,
    burnStopLevel: 34
  },
  {
    raw: ItemType.RAW_TROUT,
    cooked: ItemType.COOKED_TROUT,
    levelRequired: 15,
    xpGain: 70,
    burnStopLevel: 49
  },
  {
    raw: ItemType.RAW_SALMON,
    cooked: ItemType.COOKED_SALMON,
    levelRequired: 25,
    xpGain: 90,
    burnStopLevel: 58
  },
  {
    raw: ItemType.RAW_LOBSTER,
    cooked: ItemType.COOKED_LOBSTER,
    levelRequired: 40,
    xpGain: 120,
    burnStopLevel: 74
  }
]

// Calculate burn chance
export function getBurnChance(cookingLevel: number, recipe: CookingRecipe): number {
  if (cookingLevel >= recipe.burnStopLevel) return 0
  const levelDiff = recipe.burnStopLevel - cookingLevel
  return Math.min(0.6, levelDiff * 0.02) // max 60% burn chance
}
