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

  // Market stalls
  MARKET_STALL_RED = 'market_stall_red',
  MARKET_STALL_BLUE = 'market_stall_blue',
  MARKET_STALL_GREEN = 'market_stall_green',
  MARKET_STALL_YELLOW = 'market_stall_yellow',

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
  ROCK = 'rock'
}

export interface WorldObjectDefinition {
  type: WorldObjectType
  name: string
  action: string // "Chop", "Fish", "Cook"
  skill: SkillType
  levelRequired: number
  xpGain: number
  actionTime: number // milliseconds
  yields: ItemType
  respawnTime: number // milliseconds (0 = never despawns)
  depletionChance: number // 0-1, chance to deplete after each action
}

export const WORLD_OBJECT_DEFINITIONS: Record<WorldObjectType, WorldObjectDefinition> = {
  // Trees
  [WorldObjectType.TREE]: {
    type: WorldObjectType.TREE,
    name: 'Tree',
    action: 'Chop',
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
    skill: SkillType.FISHING,
    levelRequired: 1,
    xpGain: 10,
    actionTime: 2000,
    yields: ItemType.RAW_SHRIMP,
    respawnTime: 0, // never despawns
    depletionChance: 0
  },
  [WorldObjectType.FISHING_SPOT_ROD]: {
    type: WorldObjectType.FISHING_SPOT_ROD,
    name: 'Fishing Spot',
    action: 'Lure',
    skill: SkillType.FISHING,
    levelRequired: 20,
    xpGain: 50,
    actionTime: 3000,
    yields: ItemType.RAW_TROUT, // can also give salmon at higher levels
    respawnTime: 0,
    depletionChance: 0
  },

  // Fire
  [WorldObjectType.FIRE]: {
    type: WorldObjectType.FIRE,
    name: 'Fire',
    action: 'Cook',
    skill: SkillType.COOKING,
    levelRequired: 1,
    xpGain: 30, // varies by fish
    actionTime: 1800,
    yields: ItemType.COOKED_SHRIMP, // depends on what you're cooking
    respawnTime: 60000, // fires burn out
    depletionChance: 0
  },

  // Bank Booth (special - doesn't grant XP, opens bank UI)
  [WorldObjectType.BANK_BOOTH]: {
    type: WorldObjectType.BANK_BOOTH,
    name: 'Bank Booth',
    action: 'Bank',
    skill: SkillType.WOODCUTTING, // Not used, placeholder
    levelRequired: 1,
    xpGain: 0,
    actionTime: 0, // Instant
    yields: ItemType.LOGS, // Not used, placeholder
    respawnTime: 0,
    depletionChance: 0
  },

  // Cooking Range (permanent cooking station, better than fire)
  [WorldObjectType.COOKING_RANGE]: {
    type: WorldObjectType.COOKING_RANGE,
    name: 'Cooking Range',
    action: 'Cook',
    skill: SkillType.COOKING,
    levelRequired: 1,
    xpGain: 30,
    actionTime: 1800,
    yields: ItemType.COOKED_SHRIMP,
    respawnTime: 0, // Never depletes
    depletionChance: 0
  },

  // Market Stalls (decorative, non-interactive)
  [WorldObjectType.MARKET_STALL_RED]: {
    type: WorldObjectType.MARKET_STALL_RED,
    name: 'Market Stall',
    action: 'Examine',
    skill: SkillType.WOODCUTTING,
    levelRequired: 1,
    xpGain: 0,
    actionTime: 0,
    yields: ItemType.LOGS,
    respawnTime: 0,
    depletionChance: 0
  },
  [WorldObjectType.MARKET_STALL_BLUE]: {
    type: WorldObjectType.MARKET_STALL_BLUE,
    name: 'Market Stall',
    action: 'Examine',
    skill: SkillType.WOODCUTTING,
    levelRequired: 1,
    xpGain: 0,
    actionTime: 0,
    yields: ItemType.LOGS,
    respawnTime: 0,
    depletionChance: 0
  },
  [WorldObjectType.MARKET_STALL_GREEN]: {
    type: WorldObjectType.MARKET_STALL_GREEN,
    name: 'Market Stall',
    action: 'Examine',
    skill: SkillType.WOODCUTTING,
    levelRequired: 1,
    xpGain: 0,
    actionTime: 0,
    yields: ItemType.LOGS,
    respawnTime: 0,
    depletionChance: 0
  },
  [WorldObjectType.MARKET_STALL_YELLOW]: {
    type: WorldObjectType.MARKET_STALL_YELLOW,
    name: 'Market Stall',
    action: 'Examine',
    skill: SkillType.WOODCUTTING,
    levelRequired: 1,
    xpGain: 0,
    actionTime: 0,
    yields: ItemType.LOGS,
    respawnTime: 0,
    depletionChance: 0
  },

  // Water features (decorative)
  [WorldObjectType.FOUNTAIN]: {
    type: WorldObjectType.FOUNTAIN,
    name: 'Fountain',
    action: 'Examine',
    skill: SkillType.WOODCUTTING,
    levelRequired: 1,
    xpGain: 0,
    actionTime: 0,
    yields: ItemType.LOGS,
    respawnTime: 0,
    depletionChance: 0
  },
  [WorldObjectType.WELL]: {
    type: WorldObjectType.WELL,
    name: 'Well',
    action: 'Examine',
    skill: SkillType.WOODCUTTING,
    levelRequired: 1,
    xpGain: 0,
    actionTime: 0,
    yields: ItemType.LOGS,
    respawnTime: 0,
    depletionChance: 0
  },

  // Lighting
  [WorldObjectType.TORCH_STAND]: {
    type: WorldObjectType.TORCH_STAND,
    name: 'Torch',
    action: 'Examine',
    skill: SkillType.WOODCUTTING,
    levelRequired: 1,
    xpGain: 0,
    actionTime: 0,
    yields: ItemType.LOGS,
    respawnTime: 0,
    depletionChance: 0
  },

  // Containers (decorative)
  [WorldObjectType.BARREL]: {
    type: WorldObjectType.BARREL,
    name: 'Barrel',
    action: 'Examine',
    skill: SkillType.WOODCUTTING,
    levelRequired: 1,
    xpGain: 0,
    actionTime: 0,
    yields: ItemType.LOGS,
    respawnTime: 0,
    depletionChance: 0
  },
  [WorldObjectType.CRATE]: {
    type: WorldObjectType.CRATE,
    name: 'Crate',
    action: 'Examine',
    skill: SkillType.WOODCUTTING,
    levelRequired: 1,
    xpGain: 0,
    actionTime: 0,
    yields: ItemType.LOGS,
    respawnTime: 0,
    depletionChance: 0
  },

  // Smithing
  [WorldObjectType.ANVIL]: {
    type: WorldObjectType.ANVIL,
    name: 'Anvil',
    action: 'Smith',
    skill: SkillType.SMITHING,
    levelRequired: 1,
    xpGain: 0, // XP varies by item
    actionTime: 0,
    yields: ItemType.LOGS,
    respawnTime: 0,
    depletionChance: 0
  },

  // Furniture (decorative)
  [WorldObjectType.BENCH]: {
    type: WorldObjectType.BENCH,
    name: 'Bench',
    action: 'Examine',
    skill: SkillType.WOODCUTTING,
    levelRequired: 1,
    xpGain: 0,
    actionTime: 0,
    yields: ItemType.LOGS,
    respawnTime: 0,
    depletionChance: 0
  },
  [WorldObjectType.TABLE]: {
    type: WorldObjectType.TABLE,
    name: 'Table',
    action: 'Examine',
    skill: SkillType.WOODCUTTING,
    levelRequired: 1,
    xpGain: 0,
    actionTime: 0,
    yields: ItemType.LOGS,
    respawnTime: 0,
    depletionChance: 0
  },

  // Decorative
  [WorldObjectType.FLOWER_PATCH]: {
    type: WorldObjectType.FLOWER_PATCH,
    name: 'Flowers',
    action: 'Examine',
    skill: SkillType.WOODCUTTING,
    levelRequired: 1,
    xpGain: 0,
    actionTime: 0,
    yields: ItemType.LOGS,
    respawnTime: 0,
    depletionChance: 0
  },
  [WorldObjectType.SIGN_POST]: {
    type: WorldObjectType.SIGN_POST,
    name: 'Sign Post',
    action: 'Read',
    skill: SkillType.WOODCUTTING,
    levelRequired: 1,
    xpGain: 0,
    actionTime: 0,
    yields: ItemType.LOGS,
    respawnTime: 0,
    depletionChance: 0
  },
  [WorldObjectType.HAY_BALE]: {
    type: WorldObjectType.HAY_BALE,
    name: 'Hay Bale',
    action: 'Examine',
    skill: SkillType.WOODCUTTING,
    levelRequired: 1,
    xpGain: 0,
    actionTime: 0,
    yields: ItemType.LOGS,
    respawnTime: 0,
    depletionChance: 0
  },
  [WorldObjectType.BUSH]: {
    type: WorldObjectType.BUSH,
    name: 'Bush',
    action: 'Examine',
    skill: SkillType.WOODCUTTING,
    levelRequired: 1,
    xpGain: 0,
    actionTime: 0,
    yields: ItemType.LOGS,
    respawnTime: 0,
    depletionChance: 0
  },
  [WorldObjectType.ROCK]: {
    type: WorldObjectType.ROCK,
    name: 'Rock',
    action: 'Examine',
    skill: SkillType.WOODCUTTING,
    levelRequired: 1,
    xpGain: 0,
    actionTime: 0,
    yields: ItemType.LOGS,
    respawnTime: 0,
    depletionChance: 0
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
