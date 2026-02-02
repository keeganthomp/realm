// Daily Challenge System for Realm

import { SkillType } from './skills'
import { StatType } from './achievements'

// Challenge types
export enum ChallengeType {
  KILL_NPCS = 'kill_npcs',
  KILL_CHICKENS = 'kill_chickens',
  CATCH_FISH = 'catch_fish',
  CATCH_SHRIMP = 'catch_shrimp',
  CHOP_LOGS = 'chop_logs',
  COOK_FOOD = 'cook_food',
  DEAL_DAMAGE = 'deal_damage',
  GAIN_COMBAT_XP = 'gain_combat_xp'
}

export interface ChallengeDefinition {
  type: ChallengeType
  name: string
  description: string
  targetCount: number
  // Reward - either XP in a skill or coins
  rewardXp?: number
  rewardSkill?: SkillType
  rewardCoins?: number
  // Which stat this challenge tracks
  statType: StatType
}

// Pool of possible daily challenges
export const CHALLENGE_POOL: ChallengeDefinition[] = [
  {
    type: ChallengeType.CATCH_FISH,
    name: 'Gone Fishing',
    description: 'Catch 50 fish of any type',
    targetCount: 50,
    rewardXp: 500,
    rewardSkill: SkillType.FISHING,
    statType: StatType.FISH_CAUGHT
  },
  {
    type: ChallengeType.CHOP_LOGS,
    name: 'Timber!',
    description: 'Chop 30 logs from any tree',
    targetCount: 30,
    rewardXp: 400,
    rewardSkill: SkillType.WOODCUTTING,
    statType: StatType.LOGS_CHOPPED
  },
  {
    type: ChallengeType.KILL_NPCS,
    name: 'Monster Slayer',
    description: 'Kill 10 monsters',
    targetCount: 10,
    rewardCoins: 100,
    statType: StatType.TOTAL_KILLS
  },
  {
    type: ChallengeType.COOK_FOOD,
    name: 'Kitchen Duty',
    description: 'Cook 25 food items',
    targetCount: 25,
    rewardXp: 350,
    rewardSkill: SkillType.COOKING,
    statType: StatType.FOOD_COOKED
  },
  {
    type: ChallengeType.DEAL_DAMAGE,
    name: 'Damage Dealer',
    description: 'Deal 200 total damage to monsters',
    targetCount: 200,
    rewardCoins: 75,
    statType: StatType.DAMAGE_DEALT
  },
  {
    type: ChallengeType.GAIN_COMBAT_XP,
    name: 'Combat Training',
    description: 'Gain 500 combat XP (Attack, Strength, or Defence)',
    targetCount: 500,
    rewardCoins: 50,
    statType: StatType.DAMAGE_DEALT // We'll track combat XP separately
  },
  {
    type: ChallengeType.CATCH_SHRIMP,
    name: 'Shrimp Hunter',
    description: 'Catch 30 shrimp specifically',
    targetCount: 30,
    rewardXp: 300,
    rewardSkill: SkillType.FISHING,
    statType: StatType.SHRIMP_CAUGHT
  },
  {
    type: ChallengeType.KILL_CHICKENS,
    name: 'Chicken Chaser',
    description: 'Kill 20 chickens',
    targetCount: 20,
    rewardCoins: 50,
    statType: StatType.CHICKENS_KILLED
  }
]

// Deterministically select 3 challenges for a given date
// Uses a simple hash of the date to ensure all players get the same challenges
export function getDailyChallenges(date: Date): ChallengeDefinition[] {
  // Get UTC date string (YYYY-MM-DD) to ensure consistency across timezones
  const dateStr = date.toISOString().split('T')[0]

  // Simple hash function for the date string
  let hash = 0
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }
  hash = Math.abs(hash)

  // Use the hash to select 3 unique challenges
  const selected: ChallengeDefinition[] = []
  const available = [...CHALLENGE_POOL]

  for (let i = 0; i < 3 && available.length > 0; i++) {
    const index = (hash + i * 7919) % available.length // Use different primes for each selection
    selected.push(available[index])
    available.splice(index, 1) // Remove to avoid duplicates
  }

  return selected
}

// Get the challenge indices for today (for database storage)
export function getDailyChallengeIndices(date: Date): number[] {
  const challenges = getDailyChallenges(date)
  return challenges.map((c) => CHALLENGE_POOL.findIndex((p) => p.type === c.type))
}

// Get UTC midnight for a given date (for challenge reset time)
export function getUTCMidnight(date: Date): Date {
  const utc = new Date(date)
  utc.setUTCHours(0, 0, 0, 0)
  return utc
}

// Check if a date is the same UTC day as another
export function isSameUTCDay(date1: Date, date2: Date): boolean {
  return date1.toISOString().split('T')[0] === date2.toISOString().split('T')[0]
}

// Get time until next UTC midnight (challenge reset)
export function getTimeUntilReset(): number {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  tomorrow.setUTCHours(0, 0, 0, 0)
  return tomorrow.getTime() - now.getTime()
}

// Format time remaining as "Xh Ym"
export function formatTimeRemaining(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  return `${hours}h ${minutes}m`
}

// Interface for player's daily challenge state
export interface DailyChallengeProgress {
  challengeIndex: number
  progress: number
  completed: boolean
  claimed: boolean
}

// Interface for the full daily challenges data sent to client
export interface DailyChallengesData {
  date: string // UTC date string
  challenges: Array<{
    definition: ChallengeDefinition
    progress: number
    completed: boolean
    claimed: boolean
  }>
  timeUntilReset: number
}
