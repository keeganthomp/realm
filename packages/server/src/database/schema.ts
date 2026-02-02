import {
  pgTable,
  serial,
  varchar,
  integer,
  timestamp,
  unique,
  boolean,
  date
} from 'drizzle-orm/pg-core'

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

export const playerBank = pgTable(
  'player_bank',
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
    playerBankSlotUnique: unique().on(table.playerId, table.slot)
  })
)

export const playerEquipment = pgTable(
  'player_equipment',
  {
    id: serial('id').primaryKey(),
    playerId: integer('player_id')
      .references(() => players.id, { onDelete: 'cascade' })
      .notNull(),
    slot: varchar('slot', { length: 20 }).notNull(),
    itemType: varchar('item_type', { length: 50 }).notNull()
  },
  (table) => ({
    playerSlotUnique: unique().on(table.playerId, table.slot)
  })
)

// Stats tracking for achievements
export const playerStats = pgTable(
  'player_stats',
  {
    id: serial('id').primaryKey(),
    playerId: integer('player_id')
      .references(() => players.id, { onDelete: 'cascade' })
      .notNull(),
    statType: varchar('stat_type', { length: 50 }).notNull(),
    value: integer('value').default(0).notNull()
  },
  (table) => ({
    playerStatUnique: unique().on(table.playerId, table.statType)
  })
)

// Earned achievements
export const playerAchievements = pgTable(
  'player_achievements',
  {
    id: serial('id').primaryKey(),
    playerId: integer('player_id')
      .references(() => players.id, { onDelete: 'cascade' })
      .notNull(),
    achievementType: varchar('achievement_type', { length: 50 }).notNull(),
    earnedAt: timestamp('earned_at').defaultNow().notNull()
  },
  (table) => ({
    playerAchievementUnique: unique().on(table.playerId, table.achievementType)
  })
)

// Active cosmetics (title, badge)
export const playerCosmetics = pgTable('player_cosmetics', {
  id: serial('id').primaryKey(),
  playerId: integer('player_id')
    .references(() => players.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  activeTitle: varchar('active_title', { length: 50 }),
  activeBadge: varchar('active_badge', { length: 50 })
})

// Daily challenge progress
export const playerDailyChallenges = pgTable(
  'player_daily_challenges',
  {
    id: serial('id').primaryKey(),
    playerId: integer('player_id')
      .references(() => players.id, { onDelete: 'cascade' })
      .notNull(),
    challengeDate: date('challenge_date').notNull(),
    challengeIndex: integer('challenge_index').notNull(),
    progress: integer('progress').default(0).notNull(),
    completed: boolean('completed').default(false).notNull(),
    claimed: boolean('claimed').default(false).notNull()
  },
  (table) => ({
    playerChallengeDateUnique: unique().on(table.playerId, table.challengeDate, table.challengeIndex)
  })
)
