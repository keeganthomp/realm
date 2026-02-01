// Wilderness Zones for Realm
// Areas outside of towns with themed content

import { TileType } from './types'
import { WorldObjectType } from './worldObjects'
import { NpcType } from './npcs'

export interface WildernessZone {
  id: string
  name: string
  bounds: { x: number; y: number; width: number; height: number }
  theme: 'forest' | 'mining' | 'goblin_camp' | 'ruins'
  baseTile?: TileType
  baseHeight?: number
  // Objects to spawn in this zone
  objects: WildernessObjectPlacement[]
  // NPCs to spawn
  npcs?: WildernessNpcSpawn[]
  // Tile overrides for specific terrain features
  tileOverrides?: Array<{ x: number; y: number; tileType: TileType; height?: number }>
}

export interface WildernessObjectPlacement {
  id: string
  objectType: WorldObjectType
  x: number // relative to zone bounds
  y: number
}

export interface WildernessNpcSpawn {
  id: string
  npcType: NpcType
  x: number
  y: number
  patrolArea?: { x: number; y: number; width: number; height: number }
}

// ============ MINING QUARRY (East of Thornwick) ============
const MINING_QUARRY: WildernessZone = {
  id: 'mining_quarry',
  name: 'Dwarven Quarry',
  bounds: { x: 45, y: -5, width: 25, height: 30 },
  theme: 'mining',
  baseTile: TileType.STONE,
  baseHeight: 1,
  objects: [
    // Copper ore rocks
    { id: 'copper_1', objectType: WorldObjectType.COPPER_ORE, x: 5, y: 5 },
    { id: 'copper_2', objectType: WorldObjectType.COPPER_ORE, x: 8, y: 7 },
    { id: 'copper_3', objectType: WorldObjectType.COPPER_ORE, x: 3, y: 10 },
    { id: 'copper_4', objectType: WorldObjectType.COPPER_ORE, x: 10, y: 3 },
    // Tin ore rocks
    { id: 'tin_1', objectType: WorldObjectType.TIN_ORE, x: 15, y: 5 },
    { id: 'tin_2', objectType: WorldObjectType.TIN_ORE, x: 18, y: 8 },
    { id: 'tin_3', objectType: WorldObjectType.TIN_ORE, x: 12, y: 12 },
    { id: 'tin_4', objectType: WorldObjectType.TIN_ORE, x: 20, y: 4 },
    // Iron ore rocks (requires higher level)
    { id: 'iron_1', objectType: WorldObjectType.IRON_ORE, x: 10, y: 18 },
    { id: 'iron_2', objectType: WorldObjectType.IRON_ORE, x: 14, y: 20 },
    { id: 'iron_3', objectType: WorldObjectType.IRON_ORE, x: 8, y: 22 },
    // Coal rocks
    { id: 'coal_1', objectType: WorldObjectType.COAL_ORE, x: 18, y: 22 },
    { id: 'coal_2', objectType: WorldObjectType.COAL_ORE, x: 20, y: 25 },
    // Mine props
    { id: 'cart_1', objectType: WorldObjectType.MINE_CART, x: 6, y: 15 },
    { id: 'cart_2', objectType: WorldObjectType.MINE_CART, x: 16, y: 15 },
    { id: 'entrance', objectType: WorldObjectType.MINE_ENTRANCE, x: 12, y: 28 },
    // Decorative rocks
    { id: 'rock_1', objectType: WorldObjectType.ROCK, x: 2, y: 2 },
    { id: 'rock_2', objectType: WorldObjectType.ROCK, x: 22, y: 10 },
    { id: 'rock_3', objectType: WorldObjectType.ROCK, x: 5, y: 25 }
  ],
  tileOverrides: []
}

// ============ GOBLIN CAMP (South of Thornwick) ============
const GOBLIN_CAMP: WildernessZone = {
  id: 'goblin_camp',
  name: 'Goblin Encampment',
  bounds: { x: 0, y: 45, width: 20, height: 20 },
  theme: 'goblin_camp',
  baseTile: TileType.GRASS,
  baseHeight: 1,
  objects: [
    // Tents
    { id: 'tent_1', objectType: WorldObjectType.GOBLIN_TENT, x: 5, y: 5 },
    { id: 'tent_2', objectType: WorldObjectType.GOBLIN_TENT, x: 12, y: 6 },
    { id: 'tent_3', objectType: WorldObjectType.GOBLIN_TENT, x: 8, y: 12 },
    // Central campfire
    { id: 'campfire', objectType: WorldObjectType.CAMPFIRE_LARGE, x: 9, y: 9 },
    // Palisade walls (partial perimeter)
    { id: 'wall_1', objectType: WorldObjectType.PALISADE_WALL, x: 2, y: 2 },
    { id: 'wall_2', objectType: WorldObjectType.PALISADE_WALL, x: 4, y: 2 },
    { id: 'wall_3', objectType: WorldObjectType.PALISADE_WALL, x: 14, y: 2 },
    { id: 'wall_4', objectType: WorldObjectType.PALISADE_WALL, x: 16, y: 2 },
    { id: 'wall_5', objectType: WorldObjectType.PALISADE_WALL, x: 2, y: 16 },
    { id: 'wall_6', objectType: WorldObjectType.PALISADE_WALL, x: 16, y: 16 },
    // Bone piles (grim decor)
    { id: 'bones_1', objectType: WorldObjectType.BONES_PILE, x: 6, y: 8 },
    { id: 'bones_2', objectType: WorldObjectType.BONES_PILE, x: 11, y: 11 },
    // Crates with loot
    { id: 'crate_1', objectType: WorldObjectType.CRATE, x: 4, y: 6 },
    { id: 'crate_2', objectType: WorldObjectType.CRATE, x: 13, y: 5 }
  ],
  npcs: [
    { id: 'goblin_1', npcType: NpcType.GOBLIN, x: 6, y: 6, patrolArea: { x: 4, y: 4, width: 8, height: 8 } },
    { id: 'goblin_2', npcType: NpcType.GOBLIN, x: 12, y: 8, patrolArea: { x: 10, y: 6, width: 6, height: 6 } },
    { id: 'goblin_3', npcType: NpcType.GOBLIN, x: 8, y: 12, patrolArea: { x: 6, y: 10, width: 6, height: 6 } },
    { id: 'goblin_4', npcType: NpcType.GOBLIN, x: 10, y: 4, patrolArea: { x: 8, y: 2, width: 6, height: 6 } }
  ]
}

// ============ DENSE FOREST (West of Thornwick) ============
const DENSE_FOREST: WildernessZone = {
  id: 'dense_forest',
  name: 'Darkwood Forest',
  bounds: { x: -45, y: -10, width: 25, height: 35 },
  theme: 'forest',
  baseTile: TileType.GRASS,
  baseHeight: 1,
  objects: [
    // Dense tree clusters
    { id: 'tree_1', objectType: WorldObjectType.TREE, x: 3, y: 3 },
    { id: 'tree_2', objectType: WorldObjectType.TREE, x: 5, y: 5 },
    { id: 'tree_3', objectType: WorldObjectType.TREE, x: 8, y: 2 },
    { id: 'tree_4', objectType: WorldObjectType.TREE, x: 2, y: 8 },
    { id: 'tree_5', objectType: WorldObjectType.TREE, x: 10, y: 6 },
    { id: 'tree_6', objectType: WorldObjectType.TREE, x: 15, y: 4 },
    { id: 'tree_7', objectType: WorldObjectType.TREE, x: 18, y: 7 },
    { id: 'tree_8', objectType: WorldObjectType.TREE, x: 4, y: 12 },
    { id: 'tree_9', objectType: WorldObjectType.TREE, x: 7, y: 15 },
    { id: 'tree_10', objectType: WorldObjectType.TREE, x: 12, y: 13 },
    { id: 'tree_11', objectType: WorldObjectType.TREE, x: 16, y: 16 },
    { id: 'tree_12', objectType: WorldObjectType.TREE, x: 20, y: 12 },
    { id: 'tree_13', objectType: WorldObjectType.TREE, x: 3, y: 20 },
    { id: 'tree_14', objectType: WorldObjectType.TREE, x: 8, y: 22 },
    { id: 'tree_15', objectType: WorldObjectType.TREE, x: 14, y: 20 },
    { id: 'tree_16', objectType: WorldObjectType.TREE, x: 19, y: 23 },
    { id: 'tree_17', objectType: WorldObjectType.TREE, x: 6, y: 28 },
    { id: 'tree_18', objectType: WorldObjectType.TREE, x: 11, y: 30 },
    { id: 'tree_19', objectType: WorldObjectType.TREE, x: 17, y: 28 },
    { id: 'tree_20', objectType: WorldObjectType.TREE, x: 22, y: 30 },
    // Oak trees scattered
    { id: 'oak_1', objectType: WorldObjectType.OAK_TREE, x: 10, y: 10 },
    { id: 'oak_2', objectType: WorldObjectType.OAK_TREE, x: 5, y: 18 },
    { id: 'oak_3', objectType: WorldObjectType.OAK_TREE, x: 18, y: 20 },
    { id: 'oak_4', objectType: WorldObjectType.OAK_TREE, x: 12, y: 26 },
    // Willow trees (near water, if any)
    { id: 'willow_1', objectType: WorldObjectType.WILLOW_TREE, x: 2, y: 25 },
    // Forest floor decoration
    { id: 'log_1', objectType: WorldObjectType.FALLEN_LOG, x: 6, y: 10 },
    { id: 'log_2', objectType: WorldObjectType.FALLEN_LOG, x: 15, y: 25 },
    { id: 'stump_1', objectType: WorldObjectType.OLD_STUMP, x: 9, y: 8 },
    { id: 'stump_2', objectType: WorldObjectType.OLD_STUMP, x: 20, y: 18 },
    { id: 'mushroom_1', objectType: WorldObjectType.MUSHROOM_PATCH, x: 4, y: 7 },
    { id: 'mushroom_2', objectType: WorldObjectType.MUSHROOM_PATCH, x: 13, y: 18 },
    { id: 'mushroom_3', objectType: WorldObjectType.MUSHROOM_PATCH, x: 8, y: 32 },
    { id: 'bush_1', objectType: WorldObjectType.BUSH, x: 7, y: 4 },
    { id: 'bush_2', objectType: WorldObjectType.BUSH, x: 14, y: 11 },
    { id: 'bush_3', objectType: WorldObjectType.BUSH, x: 21, y: 26 }
  ]
}

// ============ ANCIENT RUINS (Northwest of Thornwick) ============
const ANCIENT_RUINS: WildernessZone = {
  id: 'ancient_ruins',
  name: 'Forgotten Ruins',
  bounds: { x: -35, y: -40, width: 20, height: 20 },
  theme: 'ruins',
  baseTile: TileType.STONE,
  baseHeight: 1,
  objects: [
    // Ruined walls forming a broken structure
    { id: 'wall_1', objectType: WorldObjectType.RUINED_WALL, x: 3, y: 3 },
    { id: 'wall_2', objectType: WorldObjectType.RUINED_WALL, x: 5, y: 3 },
    { id: 'wall_3', objectType: WorldObjectType.RUINED_WALL, x: 3, y: 5 },
    { id: 'wall_4', objectType: WorldObjectType.RUINED_WALL, x: 12, y: 3 },
    { id: 'wall_5', objectType: WorldObjectType.RUINED_WALL, x: 14, y: 3 },
    { id: 'wall_6', objectType: WorldObjectType.RUINED_WALL, x: 14, y: 5 },
    { id: 'wall_7', objectType: WorldObjectType.RUINED_WALL, x: 5, y: 14 },
    { id: 'wall_8', objectType: WorldObjectType.RUINED_WALL, x: 12, y: 14 },
    // Columns at corners
    { id: 'column_1', objectType: WorldObjectType.RUINED_COLUMN, x: 4, y: 4 },
    { id: 'column_2', objectType: WorldObjectType.RUINED_COLUMN, x: 13, y: 4 },
    { id: 'column_3', objectType: WorldObjectType.RUINED_COLUMN, x: 4, y: 13 },
    { id: 'column_4', objectType: WorldObjectType.RUINED_COLUMN, x: 13, y: 13 },
    // Central altar
    { id: 'altar', objectType: WorldObjectType.ANCIENT_ALTAR, x: 9, y: 9 },
    // Scattered rubble
    { id: 'rubble_1', objectType: WorldObjectType.STONE_RUBBLE, x: 6, y: 6 },
    { id: 'rubble_2', objectType: WorldObjectType.STONE_RUBBLE, x: 11, y: 7 },
    { id: 'rubble_3', objectType: WorldObjectType.STONE_RUBBLE, x: 7, y: 11 },
    { id: 'rubble_4', objectType: WorldObjectType.STONE_RUBBLE, x: 10, y: 12 },
    // Decorative rocks
    { id: 'rock_1', objectType: WorldObjectType.ROCK, x: 2, y: 8 },
    { id: 'rock_2', objectType: WorldObjectType.ROCK, x: 16, y: 10 },
    // Trees reclaiming the ruins
    { id: 'tree_1', objectType: WorldObjectType.TREE, x: 1, y: 1 },
    { id: 'tree_2', objectType: WorldObjectType.TREE, x: 17, y: 2 },
    { id: 'tree_3', objectType: WorldObjectType.TREE, x: 2, y: 17 },
    { id: 'tree_4', objectType: WorldObjectType.TREE, x: 16, y: 16 }
  ]
}

// Registry of all wilderness zones
const WILDERNESS_ZONES: WildernessZone[] = [
  MINING_QUARRY,
  GOBLIN_CAMP,
  DENSE_FOREST,
  ANCIENT_RUINS
]

export function getAllWildernessZones(): WildernessZone[] {
  return WILDERNESS_ZONES
}

export function isInWildernessZone(zone: WildernessZone, worldX: number, worldY: number): boolean {
  return (
    worldX >= zone.bounds.x &&
    worldX < zone.bounds.x + zone.bounds.width &&
    worldY >= zone.bounds.y &&
    worldY < zone.bounds.y + zone.bounds.height
  )
}
