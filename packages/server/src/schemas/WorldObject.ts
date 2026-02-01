import { Schema, type } from '@colyseus/schema'

export class WorldObject extends Schema {
  @type('string') id: string = ''
  @type('string') objectType: string = '' // tree, oak_tree, fishing_spot_net, etc
  @type('number') x: number = 0
  @type('number') y: number = 0
  @type('boolean') depleted: boolean = false
  @type('number') respawnAt: number = 0 // timestamp when it respawns
}
