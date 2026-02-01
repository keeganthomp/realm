import { drizzle } from 'drizzle-orm/node-postgres'
import { eq, and } from 'drizzle-orm'
import { Pool } from 'pg'
import { players, playerSkills, playerInventory } from './schema'
import { getInitialSkills } from '@realm/shared'

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'realm',
  password: process.env.DB_PASSWORD || 'realm_dev',
  database: process.env.DB_NAME || 'realm'
})

export const db = drizzle(pool)

export async function initDatabase() {
  // Create tables if they don't exist (using raw SQL for simplicity)
  // In production, use drizzle-kit migrations
  const client = await pool.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS players (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS player_skills (
        id SERIAL PRIMARY KEY,
        player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
        skill_type VARCHAR(50) NOT NULL,
        xp INTEGER DEFAULT 0 NOT NULL,
        UNIQUE(player_id, skill_type)
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS player_inventory (
        id SERIAL PRIMARY KEY,
        player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
        slot INTEGER NOT NULL,
        item_type VARCHAR(50) NOT NULL,
        quantity INTEGER DEFAULT 1 NOT NULL,
        UNIQUE(player_id, slot)
      )
    `)

    console.log('Database tables initialized')
  } finally {
    client.release()
  }
}

export interface PlayerData {
  id: number
  username: string
  skills: Record<string, number>
  inventory: Array<{ itemType: string; quantity: number }>
}

export async function getOrCreatePlayer(username: string): Promise<PlayerData> {
  // Try to get existing player
  let [player] = await db.select().from(players).where(eq(players.username, username))

  if (!player) {
    // Create new player
    const [newPlayer] = await db.insert(players).values({ username }).returning()
    player = newPlayer

    // Initialize skills with defaults
    const initialSkills = getInitialSkills()
    const skillInserts = Object.entries(initialSkills).map(([skillType, xp]) => ({
      playerId: player.id,
      skillType,
      xp
    }))
    await db.insert(playerSkills).values(skillInserts)

    console.log(`Created new player: ${username}`)
  } else {
    // Update last login
    await db.update(players).set({ lastLogin: new Date() }).where(eq(players.id, player.id))
  }

  // Load skills
  const skillRows = await db.select().from(playerSkills).where(eq(playerSkills.playerId, player.id))
  const skills: Record<string, number> = {}
  for (const row of skillRows) {
    skills[row.skillType] = row.xp
  }

  // Load inventory
  const inventoryRows = await db
    .select()
    .from(playerInventory)
    .where(eq(playerInventory.playerId, player.id))
    .orderBy(playerInventory.slot)

  const inventory = inventoryRows.map((row) => ({
    itemType: row.itemType,
    quantity: row.quantity
  }))

  return {
    id: player.id,
    username,
    skills,
    inventory
  }
}

export async function savePlayerSkills(playerId: number, skills: Record<string, number>) {
  for (const [skillType, xp] of Object.entries(skills)) {
    // Upsert skill
    const [existing] = await db
      .select()
      .from(playerSkills)
      .where(and(eq(playerSkills.playerId, playerId), eq(playerSkills.skillType, skillType)))

    if (existing) {
      await db.update(playerSkills).set({ xp }).where(eq(playerSkills.id, existing.id))
    } else {
      await db.insert(playerSkills).values({ playerId, skillType, xp })
    }
  }
}

export async function savePlayerInventory(
  playerId: number,
  inventory: Array<{ itemType: string; quantity: number }>
) {
  // Clear existing inventory
  await db.delete(playerInventory).where(eq(playerInventory.playerId, playerId))

  // Insert current inventory
  if (inventory.length > 0) {
    const inventoryInserts = inventory.map((item, slot) => ({
      playerId,
      slot,
      itemType: item.itemType,
      quantity: item.quantity
    }))
    await db.insert(playerInventory).values(inventoryInserts)
  }
}

export { pool }
