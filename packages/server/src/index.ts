import debug from 'debug'
import appConfig from './app.config'
import { initDatabase } from './database'

const port = Number(process.env.PORT) || 2567

async function main() {
  debug.enable('colyseus:matchmaking,colyseus:connection,colyseus:errors')

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
