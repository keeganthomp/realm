import debug from 'debug'
import { Encoder } from '@colyseus/schema'
import appConfig from './app.config'
import { initDatabase } from './database'

const port = Number(process.env.PORT) || 2567

async function main() {
  debug.enable('colyseus:matchmaking,colyseus:connection,colyseus:errors')

  // Increase schema buffer for chunked world state
  Encoder.BUFFER_SIZE = 512 * 1024

  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error)
  })
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason)
  })

  // Initialize database
  try {
    await initDatabase()
  } catch (error) {
    console.warn('Database not available, running without persistence:', (error as Error).message)
  }

  // Start the server
  await appConfig.listen(port)
  console.log(`Realm server listening on ws://localhost:${port}`)
}

main().catch(console.error)
