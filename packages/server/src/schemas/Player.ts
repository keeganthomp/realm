import { Schema, MapSchema, ArraySchema, type } from '@colyseus/schema'

export class SkillData extends Schema {
  @type('number') xp: number = 0
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
}
