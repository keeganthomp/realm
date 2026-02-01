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
  FIRE = 'fire'
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
