/**
 * Expeditions - The Veil expedition system
 *
 * Players enter the Veil through rifts and go on timed expeditions.
 * They must manage Veil Stability while collecting resources.
 */

import type { TilePosition } from './types'

/**
 * A Veil Rift - entry point into the Veil dimension
 */
export interface VeilRift {
  id: string
  name: string
  position: TilePosition
  stabilityRequired: number     // Minimum Veilwalking level to enter
  destinationTier: number       // Difficulty tier of the Veil zone
  active: boolean               // Whether the rift is currently open
  description: string
}

/**
 * An active expedition in the Veil
 */
export interface Expedition {
  id: string
  playerId: string
  riftId: string
  startTime: number             // Unix timestamp
  maxDuration: number           // Max expedition time in ms

  // Stability system
  maxStability: number          // Total stability (based on Veilwalking level)
  currentStability: number      // Current stability (depletes over time)
  stabilityDrainRate: number    // Base drain per second

  // Progress
  currentDepth: number          // How far into the Veil (affects difficulty/rewards)
  creaturesKilled: number
  resourcesGathered: number

  // Loot
  securedLoot: ExpeditionLoot[] // Saved at anchors, safe on death
  unsecuredLoot: ExpeditionLoot[] // Lost if forced extraction

  // State
  status: 'active' | 'extracting' | 'completed' | 'failed'
  exitReason?: 'voluntary' | 'stability_depleted' | 'time_expired' | 'death'
}

export interface ExpeditionLoot {
  itemType: string
  quantity: number
  securedAt?: number  // Timestamp when secured
}

/**
 * Veil Anchor - checkpoint in the Veil for securing loot
 */
export interface VeilAnchor {
  id: string
  position: TilePosition
  charges: number         // Uses remaining before it fades
  maxCharges: number
  ownerId?: string        // Player who created it (if player-created)
  expiresAt?: number      // When the anchor disappears
}

/**
 * Calculate max stability based on Veilwalking level
 */
export function calculateMaxStability(veilwalkingLevel: number): number {
  // Base 100 + 5 per level
  return 100 + veilwalkingLevel * 5
}

/**
 * Calculate stability drain rate based on tier and depth
 */
export function calculateDrainRate(tier: number, depth: number): number {
  // Base drain of 1/sec, increased by tier and depth
  const baseDrain = 1.0
  const tierMultiplier = 1 + (tier - 1) * 0.2  // +20% per tier
  const depthMultiplier = 1 + depth * 0.1       // +10% per depth level
  return baseDrain * tierMultiplier * depthMultiplier
}

/**
 * Calculate stability loss from taking damage
 */
export function calculateDamageDrain(damage: number, creatureStabilityDrain: number): number {
  // Base drain from creature + scaling with damage
  return creatureStabilityDrain + Math.floor(damage * 0.5)
}

/**
 * Calculate time remaining before stability depletes
 */
export function calculateTimeToDepletion(
  currentStability: number,
  drainRate: number
): number {
  if (drainRate <= 0) return Infinity
  return Math.floor((currentStability / drainRate) * 1000) // ms
}

/**
 * Format time remaining in human-readable format
 */
export function formatExpeditionTime(ms: number): string {
  if (ms <= 0) return '0:00'

  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/**
 * Calculate expedition rewards based on performance
 */
export interface ExpeditionRewards {
  baseXp: number
  bonusXp: number
  totalXp: number
  veilwalkingXp: number
}

export function calculateExpeditionRewards(expedition: Expedition): ExpeditionRewards {
  const baseXp = expedition.creaturesKilled * 50 + expedition.resourcesGathered * 25
  const depthBonus = expedition.currentDepth * 100
  const survivalBonus = expedition.status === 'completed' ? baseXp * 0.25 : 0

  const bonusXp = depthBonus + survivalBonus
  const totalXp = baseXp + bonusXp

  // Veilwalking XP based on time spent and depth reached
  const timeSpent = Date.now() - expedition.startTime
  const veilwalkingXp = Math.floor(
    (timeSpent / 60000) * 10 + // 10 XP per minute
      expedition.currentDepth * 50   // 50 XP per depth level
  )

  return {
    baseXp,
    bonusXp,
    totalXp,
    veilwalkingXp
  }
}

/**
 * Expedition tiers and their properties
 */
export interface ExpeditionTierInfo {
  tier: number
  name: string
  minVeilwalkingLevel: number
  baseDuration: number      // ms
  drainMultiplier: number
  lootMultiplier: number
  creatureLevelRange: [number, number]
}

export const EXPEDITION_TIERS: ExpeditionTierInfo[] = [
  {
    tier: 1,
    name: 'Shallow Veil',
    minVeilwalkingLevel: 1,
    baseDuration: 600000,    // 10 minutes
    drainMultiplier: 1.0,
    lootMultiplier: 1.0,
    creatureLevelRange: [1, 15]
  },
  {
    tier: 2,
    name: 'Deep Veil',
    minVeilwalkingLevel: 25,
    baseDuration: 480000,    // 8 minutes
    drainMultiplier: 1.3,
    lootMultiplier: 1.5,
    creatureLevelRange: [16, 40]
  },
  {
    tier: 3,
    name: 'Abyssal Veil',
    minVeilwalkingLevel: 50,
    baseDuration: 360000,    // 6 minutes
    drainMultiplier: 1.6,
    lootMultiplier: 2.0,
    creatureLevelRange: [41, 70]
  },
  {
    tier: 4,
    name: 'Void Depths',
    minVeilwalkingLevel: 75,
    baseDuration: 300000,    // 5 minutes
    drainMultiplier: 2.0,
    lootMultiplier: 3.0,
    creatureLevelRange: [71, 120]
  },
  {
    tier: 5,
    name: 'The Unnamed Dark',
    minVeilwalkingLevel: 90,
    baseDuration: 240000,    // 4 minutes
    drainMultiplier: 2.5,
    lootMultiplier: 5.0,
    creatureLevelRange: [121, 200]
  }
]

/**
 * Get tier info by tier number
 */
export function getExpeditionTier(tier: number): ExpeditionTierInfo | undefined {
  return EXPEDITION_TIERS.find((t) => t.tier === tier)
}

/**
 * Get the highest tier a player can access
 */
export function getMaxAccessibleTier(veilwalkingLevel: number): number {
  let maxTier = 1
  for (const tier of EXPEDITION_TIERS) {
    if (veilwalkingLevel >= tier.minVeilwalkingLevel) {
      maxTier = tier.tier
    }
  }
  return maxTier
}

/**
 * Pre-defined rifts in the game world
 */
// Thornwick town bounds start at (-14, -14)
// World position = town.bounds + local position
export const WORLD_RIFTS: VeilRift[] = [
  {
    id: 'veil_rift_thornwick',
    name: 'Thornwick Rift',
    position: { tileX: 8, tileY: 14 },  // Local (22, 28) + bounds (-14, -14)
    stabilityRequired: 1,
    destinationTier: 1,
    active: true,
    description: 'A shimmering tear in reality near the town fountain.'
  },
  {
    id: 'thornwick_pond',
    name: 'Pond Rift',
    position: { tileX: -8, tileY: 30 },  // Local (6, 44) + bounds (-14, -14)
    stabilityRequired: 10,
    destinationTier: 1,
    active: true,
    description: 'The pond waters ripple unnaturally around this rift.'
  }
  // More rifts added as towns are created
]

/**
 * Get a rift by ID
 */
export function getRiftById(id: string): VeilRift | undefined {
  return WORLD_RIFTS.find((rift) => rift.id === id)
}

/**
 * Get all active rifts
 */
export function getActiveRifts(): VeilRift[] {
  return WORLD_RIFTS.filter((rift) => rift.active)
}
