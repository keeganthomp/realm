import { Schema, MapSchema, type } from '@colyseus/schema'
import { Player } from './Player'
import { WorldObject } from './WorldObject'
import { NPC } from './NPC'

export class WorldState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>()
  @type({ map: WorldObject }) worldObjects = new MapSchema<WorldObject>()
  @type({ map: NPC }) npcs = new MapSchema<NPC>()
}
