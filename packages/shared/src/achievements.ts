// Achievement System for Realm

import { SkillType } from './skills'

// Stat types tracked for achievements
export enum StatType {
  TOTAL_KILLS = 'total_kills',
  CHICKENS_KILLED = 'chickens_killed',
  GOBLINS_KILLED = 'goblins_killed',
  FISH_CAUGHT = 'fish_caught',
  SHRIMP_CAUGHT = 'shrimp_caught',
  LOGS_CHOPPED = 'logs_chopped',
  FOOD_COOKED = 'food_cooked',
  DAMAGE_DEALT = 'damage_dealt',
  COINS_EARNED = 'coins_earned',
  PLAYTIME_MINUTES = 'playtime_minutes'
}

// Achievement types
export enum AchievementType {
  // Combat achievements
  FIRST_BLOOD = 'first_blood',
  MONSTER_HUNTER = 'monster_hunter',
  CHICKEN_SLAYER = 'chicken_slayer',

  // Fishing achievements
  FIRST_CATCH = 'first_catch',
  FISH_CATCHER = 'fish_catcher',
  SHRIMP_SPECIALIST = 'shrimp_specialist',

  // Woodcutting achievements
  FIRST_CHOP = 'first_chop',
  LUMBERJACK = 'lumberjack',

  // Cooking achievements
  FIRST_COOK = 'first_cook',
  MASTER_CHEF = 'master_chef',

  // Skill milestones
  GETTING_STARTED = 'getting_started',
  SKILLED = 'skilled',
  MASTER = 'master',

  // Economy achievements
  WEALTHY = 'wealthy',

  // Playtime achievements
  DEDICATED = 'dedicated'
}

export interface AchievementDefinition {
  type: AchievementType
  name: string
  description: string
  icon: string
  points: number
  // Optional cosmetic rewards
  title?: string
  chatBadge?: string
  // Unlock conditions
  statType?: StatType
  statTarget?: number
  skillType?: SkillType
  skillLevel?: number
}

export const ACHIEVEMENT_DEFINITIONS: Record<AchievementType, AchievementDefinition> = {
  // Combat achievements
  [AchievementType.FIRST_BLOOD]: {
    type: AchievementType.FIRST_BLOOD,
    name: 'First Blood',
    description: 'Kill your first monster',
    icon: '⚔️',
    points: 5,
    title: 'Warrior',
    statType: StatType.TOTAL_KILLS,
    statTarget: 1
  },
  [AchievementType.MONSTER_HUNTER]: {
    type: AchievementType.MONSTER_HUNTER,
    name: 'Monster Hunter',
    description: 'Kill 100 monsters',
    icon: '💀',
    points: 25,
    statType: StatType.TOTAL_KILLS,
    statTarget: 100
  },
  [AchievementType.CHICKEN_SLAYER]: {
    type: AchievementType.CHICKEN_SLAYER,
    name: 'Chicken Slayer',
    description: 'Kill 50 chickens',
    icon: '🐔',
    points: 10,
    statType: StatType.CHICKENS_KILLED,
    statTarget: 50
  },

  // Fishing achievements
  [AchievementType.FIRST_CATCH]: {
    type: AchievementType.FIRST_CATCH,
    name: 'First Catch',
    description: 'Catch your first fish',
    icon: '🐟',
    points: 5,
    statType: StatType.FISH_CAUGHT,
    statTarget: 1
  },
  [AchievementType.FISH_CATCHER]: {
    type: AchievementType.FISH_CATCHER,
    name: 'Fish Catcher',
    description: 'Catch 50 fish',
    icon: '🎣',
    points: 15,
    title: 'Angler',
    statType: StatType.FISH_CAUGHT,
    statTarget: 50
  },
  [AchievementType.SHRIMP_SPECIALIST]: {
    type: AchievementType.SHRIMP_SPECIALIST,
    name: 'Shrimp Specialist',
    description: 'Catch 100 shrimp',
    icon: '🦐',
    points: 10,
    statType: StatType.SHRIMP_CAUGHT,
    statTarget: 100
  },

  // Woodcutting achievements
  [AchievementType.FIRST_CHOP]: {
    type: AchievementType.FIRST_CHOP,
    name: 'First Chop',
    description: 'Chop your first tree',
    icon: '🪓',
    points: 5,
    statType: StatType.LOGS_CHOPPED,
    statTarget: 1
  },
  [AchievementType.LUMBERJACK]: {
    type: AchievementType.LUMBERJACK,
    name: 'Lumberjack',
    description: 'Chop 100 logs',
    icon: '🪵',
    points: 15,
    title: 'Lumberjack',
    statType: StatType.LOGS_CHOPPED,
    statTarget: 100
  },

  // Cooking achievements
  [AchievementType.FIRST_COOK]: {
    type: AchievementType.FIRST_COOK,
    name: 'First Cook',
    description: 'Cook your first food',
    icon: '🍳',
    points: 5,
    statType: StatType.FOOD_COOKED,
    statTarget: 1
  },
  [AchievementType.MASTER_CHEF]: {
    type: AchievementType.MASTER_CHEF,
    name: 'Master Chef',
    description: 'Cook 100 food items',
    icon: '👨‍🍳',
    points: 20,
    title: 'Chef',
    statType: StatType.FOOD_COOKED,
    statTarget: 100
  },

  // Skill milestones
  [AchievementType.GETTING_STARTED]: {
    type: AchievementType.GETTING_STARTED,
    name: 'Getting Started',
    description: 'Reach level 10 in any skill',
    icon: '📈',
    points: 5,
    skillLevel: 10
  },
  [AchievementType.SKILLED]: {
    type: AchievementType.SKILLED,
    name: 'Skilled',
    description: 'Reach level 50 in any skill',
    icon: '⭐',
    points: 25,
    skillLevel: 50
  },
  [AchievementType.MASTER]: {
    type: AchievementType.MASTER,
    name: 'Master',
    description: 'Reach level 99 in any skill',
    icon: '👑',
    points: 100,
    chatBadge: '👑',
    skillLevel: 99
  },

  // Economy achievements
  [AchievementType.WEALTHY]: {
    type: AchievementType.WEALTHY,
    name: 'Wealthy',
    description: 'Earn 10,000 coins total',
    icon: '💰',
    points: 25,
    statType: StatType.COINS_EARNED,
    statTarget: 10000
  },

  // Playtime achievements
  [AchievementType.DEDICATED]: {
    type: AchievementType.DEDICATED,
    name: 'Dedicated',
    description: 'Play for 10 hours',
    icon: '⏰',
    points: 30,
    statType: StatType.PLAYTIME_MINUTES,
    statTarget: 600
  }
}

// Get all achievements that are unlocked by a stat change
export function getAchievementsForStat(statType: StatType): AchievementType[] {
  return Object.values(ACHIEVEMENT_DEFINITIONS)
    .filter((a) => a.statType === statType)
    .map((a) => a.type)
}

// Get all achievements that are unlocked by reaching a skill level
export function getSkillLevelAchievements(): AchievementType[] {
  return Object.values(ACHIEVEMENT_DEFINITIONS)
    .filter((a) => a.skillLevel !== undefined && a.statType === undefined)
    .map((a) => a.type)
}

// Check if an achievement should unlock based on stat value
export function checkStatAchievement(
  achievementType: AchievementType,
  currentValue: number
): boolean {
  const def = ACHIEVEMENT_DEFINITIONS[achievementType]
  if (!def.statTarget) return false
  return currentValue >= def.statTarget
}

// Check if an achievement should unlock based on skill level
export function checkSkillAchievement(achievementType: AchievementType, level: number): boolean {
  const def = ACHIEVEMENT_DEFINITIONS[achievementType]
  if (!def.skillLevel) return false
  return level >= def.skillLevel
}

// Achievement categories for UI display
export const ACHIEVEMENT_CATEGORIES = {
  combat: [
    AchievementType.FIRST_BLOOD,
    AchievementType.MONSTER_HUNTER,
    AchievementType.CHICKEN_SLAYER
  ],
  gathering: [
    AchievementType.FIRST_CATCH,
    AchievementType.FISH_CATCHER,
    AchievementType.SHRIMP_SPECIALIST,
    AchievementType.FIRST_CHOP,
    AchievementType.LUMBERJACK
  ],
  production: [AchievementType.FIRST_COOK, AchievementType.MASTER_CHEF],
  milestones: [
    AchievementType.GETTING_STARTED,
    AchievementType.SKILLED,
    AchievementType.MASTER,
    AchievementType.WEALTHY,
    AchievementType.DEDICATED
  ]
}

// Get total achievement points
export function getTotalAchievementPoints(earnedAchievements: AchievementType[]): number {
  return earnedAchievements.reduce((total, type) => {
    return total + (ACHIEVEMENT_DEFINITIONS[type]?.points || 0)
  }, 0)
}
