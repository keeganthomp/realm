// Combat System for Realm

import { SkillType, getLevelFromXp } from './skills'

export enum CombatStyle {
  ACCURATE = 'accurate', // Trains Attack
  AGGRESSIVE = 'aggressive', // Trains Strength
  DEFENSIVE = 'defensive' // Trains Defence
}

// XP constants per damage dealt
export const COMBAT_XP_PER_DAMAGE = 4 // XP to trained skill per damage
export const HITPOINTS_XP_PER_DAMAGE = 1.33 // HP XP per damage

// Combat tick rate in milliseconds (600ms = 1 game tick)
export const COMBAT_TICK_MS = 600

// Calculate combat level (simplified OSRS formula)
export function calculateCombatLevel(
  attackLevel: number,
  strengthLevel: number,
  defenceLevel: number,
  hitpointsLevel: number,
  _prayerLevel: number = 1,
  _magicLevel: number = 1,
  _rangedLevel: number = 1
): number {
  // Base = (Defence + Hitpoints + floor(Prayer/2)) / 4
  const base = (defenceLevel + hitpointsLevel + Math.floor(1 / 2)) / 4

  // Melee = (Attack + Strength) * 0.325
  const melee = (attackLevel + strengthLevel) * 0.325

  // Combat level = base + melee (simplified - not including ranged/magic)
  return Math.floor(base + melee)
}

// Calculate combat level from XP values
export function calculateCombatLevelFromXp(skills: Record<string, number>): number {
  const attack = getLevelFromXp(skills[SkillType.ATTACK] || 0)
  const strength = getLevelFromXp(skills[SkillType.STRENGTH] || 0)
  const defence = getLevelFromXp(skills[SkillType.DEFENCE] || 0)
  const hitpoints = getLevelFromXp(skills[SkillType.HITPOINTS] || 0)

  return calculateCombatLevel(attack, strength, defence, hitpoints)
}

// Calculate hit chance (accuracy roll vs defence roll)
// Returns true if the attack lands
export function calculateHitChance(
  attackLevel: number,
  attackerStrengthLevel: number,
  defenderDefenceLevel: number
): boolean {
  // Attack roll = attackLevel + random(0, attackLevel)
  const attackRoll = attackLevel + Math.floor(Math.random() * (attackLevel + 1))

  // Defence roll = defenceLevel + random(0, defenceLevel)
  const defenceRoll = defenderDefenceLevel + Math.floor(Math.random() * (defenderDefenceLevel + 1))

  // Hit if attack roll > defence roll
  return attackRoll > defenceRoll
}

// Calculate max hit based on strength level
export function calculateMaxHit(strengthLevel: number): number {
  // Simplified formula: base 1 + floor(strengthLevel / 10)
  return 1 + Math.floor(strengthLevel / 10)
}

// Roll damage (0 to maxHit inclusive)
export function rollDamage(maxHit: number): number {
  return Math.floor(Math.random() * (maxHit + 1))
}

// Get which skill gains XP based on combat style
export function getCombatXpSkill(style: CombatStyle): SkillType {
  switch (style) {
    case CombatStyle.ACCURATE:
      return SkillType.ATTACK
    case CombatStyle.AGGRESSIVE:
      return SkillType.STRENGTH
    case CombatStyle.DEFENSIVE:
      return SkillType.DEFENCE
  }
}

// Calculate XP gained from dealing damage
export function calculateCombatXp(
  damage: number,
  style: CombatStyle
): { combatXp: number; hitpointsXp: number; skill: SkillType } {
  return {
    combatXp: Math.floor(damage * COMBAT_XP_PER_DAMAGE),
    hitpointsXp: Math.floor(damage * HITPOINTS_XP_PER_DAMAGE * 100) / 100,
    skill: getCombatXpSkill(style)
  }
}

// Calculate max HP from hitpoints level
export function calculateMaxHp(hitpointsLevel: number): number {
  return hitpointsLevel
}
