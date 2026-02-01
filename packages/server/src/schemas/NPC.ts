import { Schema, type } from '@colyseus/schema'

export class NPC extends Schema {
  @type('string') id: string = ''
  @type('string') npcType: string = ''
  @type('number') x: number = 0
  @type('number') y: number = 0
  @type('number') currentHp: number = 0
  @type('number') maxHp: number = 0
  @type('number') direction: number = 0
  @type('number') respawnAt: number = 0 // timestamp when it respawns
  @type('string') targetId: string = '' // player sessionId being attacked
  @type('boolean') isDead: boolean = false

  // Server-side only (not synced)
  spawnX: number = 0
  spawnY: number = 0
  lastAttackTime: number = 0
  leashRange: number = 10 // tiles before returning to spawn
}
