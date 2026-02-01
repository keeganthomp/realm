import { Schema, MapSchema, ArraySchema, type } from '@colyseus/schema'

export class SkillData extends Schema {
  @type('number') xp: number = 0
}

export class EquippedItem extends Schema {
  @type('string') itemType: string = ''
}

export class InventoryItem extends Schema {
  @type('string') itemType: string = ''
  @type('number') quantity: number = 1
}

export class CurrentAction extends Schema {
  @type('string') actionType: string = '' // 'woodcutting', 'fishing', 'cooking'
  @type('string') targetId: string = ''
  @type('number') startTime: number = 0
  @type('number') duration: number = 0
}

export class Player extends Schema {
  @type('string') name: string = ''
  @type('number') x: number = 0
  @type('number') y: number = 0
  @type('number') direction: number = 0

  // Skills - map of skillType to XP
  @type({ map: SkillData }) skills = new MapSchema<SkillData>()

  // Inventory - array of items (28 slots max)
  @type([InventoryItem]) inventory = new ArraySchema<InventoryItem>()

  // Current action being performed
  @type(CurrentAction) currentAction: CurrentAction | null = null

  // Combat stats
  @type('number') currentHp: number = 10
  @type('number') maxHp: number = 10
  @type('string') combatTargetId: string = '' // NPC id being attacked
  @type('number') lastAttackTime: number = 0
  @type('string') combatStyle: string = 'aggressive' // accurate, aggressive, defensive

  // Equipment slots (null = empty)
  @type(EquippedItem) equipHead: EquippedItem | null = null
  @type(EquippedItem) equipBody: EquippedItem | null = null
  @type(EquippedItem) equipLegs: EquippedItem | null = null
  @type(EquippedItem) equipFeet: EquippedItem | null = null
  @type(EquippedItem) equipHands: EquippedItem | null = null
  @type(EquippedItem) equipWeapon: EquippedItem | null = null
  @type(EquippedItem) equipOffhand: EquippedItem | null = null

  // Cached bonuses (not synced - server only)
  cachedAttackBonus: number = 0
  cachedStrengthBonus: number = 0
  cachedDefenceBonus: number = 0
  bonusesDirty: boolean = true
}
