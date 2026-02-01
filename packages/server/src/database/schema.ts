import { pgTable, serial, varchar, integer, timestamp, unique } from 'drizzle-orm/pg-core'

export const players = pgTable('players', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
  lastLogin: timestamp('last_login').defaultNow()
})

export const playerSkills = pgTable(
  'player_skills',
  {
    id: serial('id').primaryKey(),
    playerId: integer('player_id')
      .references(() => players.id, { onDelete: 'cascade' })
      .notNull(),
    skillType: varchar('skill_type', { length: 50 }).notNull(),
    xp: integer('xp').default(0).notNull()
  },
  (table) => ({
    playerSkillUnique: unique().on(table.playerId, table.skillType)
  })
)

export const playerInventory = pgTable(
  'player_inventory',
  {
    id: serial('id').primaryKey(),
    playerId: integer('player_id')
      .references(() => players.id, { onDelete: 'cascade' })
      .notNull(),
    slot: integer('slot').notNull(),
    itemType: varchar('item_type', { length: 50 }).notNull(),
    quantity: integer('quantity').default(1).notNull()
  },
  (table) => ({
    playerSlotUnique: unique().on(table.playerId, table.slot)
  })
)
