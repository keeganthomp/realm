import { defineServer, defineRoom } from '@colyseus/core'
import { WebSocketTransport } from '@colyseus/ws-transport'
import { WorldRoom } from './rooms/WorldRoom'

const server = defineServer({
  rooms: {
    world: defineRoom(WorldRoom)
  },
  transport: new WebSocketTransport()
})

export default server
