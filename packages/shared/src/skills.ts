// Skill System for Realm

export enum SkillType {
  // Combat
  ATTACK = 'attack',
  STRENGTH = 'strength',
  DEFENCE = 'defence',
  HITPOINTS = 'hitpoints',
  RANGED = 'ranged',
  PRAYER = 'prayer',
  MAGIC = 'magic',

  // Gathering
  MINING = 'mining',
  FISHING = 'fishing',
  WOODCUTTING = 'woodcutting',
  FARMING = 'farming',
  HUNTER = 'hunter',

  // Production
  SMITHING = 'smithing',
  COOKING = 'cooking',
  CRAFTING = 'crafting',
  FLETCHING = 'fletching',
  HERBLORE = 'herblore',
  RUNECRAFTING = 'runecrafting',
  CONSTRUCTION = 'construction',

  // Support
  AGILITY = 'agility',
  THIEVING = 'thieving',
  SLAYER = 'slayer',
  FIREMAKING = 'firemaking'
}

export interface SkillDefinition {
  type: SkillType
  name: string
  description: string
  icon: string // emoji for now, sprite later
  maxLevel: number
}

export const SKILL_DEFINITIONS: Record<SkillType, SkillDefinition> = {
  // Combat
  [SkillType.ATTACK]: {
    type: SkillType.ATTACK,
    name: 'Attack',
    description: 'Increases melee accuracy',
    icon: '⚔️',
    maxLevel: 99
  },
  [SkillType.STRENGTH]: {
    type: SkillType.STRENGTH,
    name: 'Strength',
    description: 'Increases melee damage',
    icon: '💪',
    maxLevel: 99
  },
  [SkillType.DEFENCE]: {
    type: SkillType.DEFENCE,
    name: 'Defence',
    description: 'Reduces damage taken',
    icon: '🛡️',
    maxLevel: 99
  },
  [SkillType.HITPOINTS]: {
    type: SkillType.HITPOINTS,
    name: 'Hitpoints',
    description: 'Total health pool',
    icon: '❤️',
    maxLevel: 99
  },
  [SkillType.RANGED]: {
    type: SkillType.RANGED,
    name: 'Ranged',
    description: 'Bow and crossbow proficiency',
    icon: '🏹',
    maxLevel: 99
  },
  [SkillType.PRAYER]: {
    type: SkillType.PRAYER,
    name: 'Prayer',
    description: 'Unlocks prayers and buffs',
    icon: '🙏',
    maxLevel: 99
  },
  [SkillType.MAGIC]: {
    type: SkillType.MAGIC,
    name: 'Magic',
    description: 'Spellcasting ability',
    icon: '✨',
    maxLevel: 99
  },

  // Gathering
  [SkillType.MINING]: {
    type: SkillType.MINING,
    name: 'Mining',
    description: 'Extract ores from rocks',
    icon: '⛏️',
    maxLevel: 99
  },
  [SkillType.FISHING]: {
    type: SkillType.FISHING,
    name: 'Fishing',
    description: 'Catch fish from water',
    icon: '🎣',
    maxLevel: 99
  },
  [SkillType.WOODCUTTING]: {
    type: SkillType.WOODCUTTING,
    name: 'Woodcutting',
    description: 'Chop trees for logs',
    icon: '🪓',
    maxLevel: 99
  },
  [SkillType.FARMING]: {
    type: SkillType.FARMING,
    name: 'Farming',
    description: 'Grow crops and herbs',
    icon: '🌾',
    maxLevel: 99
  },
  [SkillType.HUNTER]: {
    type: SkillType.HUNTER,
    name: 'Hunter',
    description: 'Track and trap creatures',
    icon: '🪤',
    maxLevel: 99
  },

  // Production
  [SkillType.SMITHING]: {
    type: SkillType.SMITHING,
    name: 'Smithing',
    description: 'Forge weapons and armor',
    icon: '🔨',
    maxLevel: 99
  },
  [SkillType.COOKING]: {
    type: SkillType.COOKING,
    name: 'Cooking',
    description: 'Prepare food for healing',
    icon: '🍳',
    maxLevel: 99
  },
  [SkillType.CRAFTING]: {
    type: SkillType.CRAFTING,
    name: 'Crafting',
    description: 'Create jewelry and leather',
    icon: '🧵',
    maxLevel: 99
  },
  [SkillType.FLETCHING]: {
    type: SkillType.FLETCHING,
    name: 'Fletching',
    description: 'Make bows and arrows',
    icon: '🏹',
    maxLevel: 99
  },
  [SkillType.HERBLORE]: {
    type: SkillType.HERBLORE,
    name: 'Herblore',
    description: 'Brew potions from herbs',
    icon: '🧪',
    maxLevel: 99
  },
  [SkillType.RUNECRAFTING]: {
    type: SkillType.RUNECRAFTING,
    name: 'Runecrafting',
    description: 'Create magic runes',
    icon: '🔮',
    maxLevel: 99
  },
  [SkillType.CONSTRUCTION]: {
    type: SkillType.CONSTRUCTION,
    name: 'Construction',
    description: 'Build structures',
    icon: '🏠',
    maxLevel: 99
  },

  // Support
  [SkillType.AGILITY]: {
    type: SkillType.AGILITY,
    name: 'Agility',
    description: 'Run energy and shortcuts',
    icon: '🏃',
    maxLevel: 99
  },
  [SkillType.THIEVING]: {
    type: SkillType.THIEVING,
    name: 'Thieving',
    description: 'Pickpocket and lockpick',
    icon: '🗝️',
    maxLevel: 99
  },
  [SkillType.SLAYER]: {
    type: SkillType.SLAYER,
    name: 'Slayer',
    description: 'Kill assigned monsters',
    icon: '💀',
    maxLevel: 99
  },
  [SkillType.FIREMAKING]: {
    type: SkillType.FIREMAKING,
    name: 'Firemaking',
    description: 'Light fires',
    icon: '🔥',
    maxLevel: 99
  }
}

// XP required for each level (OSRS-inspired formula)
// Level 1 = 0 XP, Level 2 = 83 XP, etc.
export function getXpForLevel(level: number): number {
  if (level <= 1) return 0
  let total = 0
  for (let i = 1; i < level; i++) {
    total += Math.floor(i + 300 * Math.pow(2, i / 7))
  }
  return Math.floor(total / 4)
}

// Get level from XP
export function getLevelFromXp(xp: number): number {
  for (let level = 99; level >= 1; level--) {
    if (xp >= getXpForLevel(level)) {
      return level
    }
  }
  return 1
}

// Get XP progress within current level (0-1)
export function getLevelProgress(xp: number): number {
  const level = getLevelFromXp(xp)
  if (level >= 99) return 1

  const currentLevelXp = getXpForLevel(level)
  const nextLevelXp = getXpForLevel(level + 1)
  const xpIntoLevel = xp - currentLevelXp
  const xpNeeded = nextLevelXp - currentLevelXp

  return xpIntoLevel / xpNeeded
}

// XP required to reach next level
export function getXpToNextLevel(xp: number): number {
  const level = getLevelFromXp(xp)
  if (level >= 99) return 0
  return getXpForLevel(level + 1) - xp
}

// Initial skills for new players
export function getInitialSkills(): Record<SkillType, number> {
  const skills: Partial<Record<SkillType, number>> = {}
  for (const skillType of Object.values(SkillType)) {
    // Hitpoints starts at level 10 (1154 XP)
    skills[skillType] = skillType === SkillType.HITPOINTS ? 1154 : 0
  }
  return skills as Record<SkillType, number>
}

// Skill categories for UI grouping
export const SKILL_CATEGORIES = {
  combat: [
    SkillType.ATTACK,
    SkillType.STRENGTH,
    SkillType.DEFENCE,
    SkillType.HITPOINTS,
    SkillType.RANGED,
    SkillType.PRAYER,
    SkillType.MAGIC
  ],
  gathering: [
    SkillType.MINING,
    SkillType.FISHING,
    SkillType.WOODCUTTING,
    SkillType.FARMING,
    SkillType.HUNTER
  ],
  production: [
    SkillType.SMITHING,
    SkillType.COOKING,
    SkillType.CRAFTING,
    SkillType.FLETCHING,
    SkillType.HERBLORE,
    SkillType.RUNECRAFTING,
    SkillType.CONSTRUCTION
  ],
  support: [SkillType.AGILITY, SkillType.THIEVING, SkillType.SLAYER, SkillType.FIREMAKING]
}

// Calculate total level
export function getTotalLevel(skills: Record<SkillType, number>): number {
  let total = 0
  for (const xp of Object.values(skills)) {
    total += getLevelFromXp(xp)
  }
  return total
}
