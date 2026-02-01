// Thornwick - The First Town
// Inspired by RuneScape's Varrock - a bustling medieval market town

import { TileType } from '../types'
import { WorldObjectType } from '../worldObjects'
import { NpcType } from '../npcs'
import type {
  TownDefinition,
  BuildingDefinition,
  NpcSpawnDefinition,
  WorldObjectPlacement,
  TileOverride
} from './index'

// Town dimensions - 48x48 tiles
const TOWN_WIDTH = 48
const TOWN_HEIGHT = 48

// Town origin (top-left corner in world tile coordinates)
// Centered around spawn point so players start in town
const TOWN_X = -14
const TOWN_Y = -14

// Helper to create stone path tiles
function createPath(
  startX: number,
  startY: number,
  endX: number,
  endY: number
): TileOverride[] {
  const tiles: TileOverride[] = []
  const dx = endX > startX ? 1 : endX < startX ? -1 : 0
  const dy = endY > startY ? 1 : endY < startY ? -1 : 0

  let x = startX
  let y = startY

  while (x !== endX || y !== endY) {
    tiles.push({ x, y, tileType: TileType.STONE, height: 1 })
    if (x !== endX) x += dx
    if (y !== endY) y += dy
  }
  tiles.push({ x: endX, y: endY, tileType: TileType.STONE, height: 1 })

  return tiles
}

// Helper to create a rectangular area of tiles
function createArea(
  x: number,
  y: number,
  width: number,
  height: number,
  tileType: TileType,
  tileHeight: number = 1
): TileOverride[] {
  const tiles: TileOverride[] = []
  for (let ty = y; ty < y + height; ty++) {
    for (let tx = x; tx < x + width; tx++) {
      tiles.push({ x: tx, y: ty, tileType, height: tileHeight })
    }
  }
  return tiles
}

// Buildings
const buildings: BuildingDefinition[] = [
  // Thornwick Keep - Northern castle
  {
    id: 'thornwick_keep',
    name: 'Thornwick Keep',
    x: 16,
    y: 2,
    width: 16,
    height: 12,
    floorTile: TileType.STONE,
    hasWalls: true,
    doors: [{ x: 8, y: 11, facing: 'south' }],
    heightLevel: 2
  },

  // Bank - East side
  {
    id: 'thornwick_bank',
    name: 'Thornwick Bank',
    x: 36,
    y: 18,
    width: 8,
    height: 6,
    floorTile: TileType.STONE,
    hasWalls: true,
    doors: [{ x: 0, y: 3, facing: 'west' }],
    heightLevel: 1
  },

  // General Store - West side
  {
    id: 'general_store',
    name: 'General Store',
    x: 4,
    y: 18,
    width: 7,
    height: 6,
    floorTile: TileType.STONE,
    hasWalls: true,
    doors: [{ x: 6, y: 3, facing: 'east' }],
    heightLevel: 1
  },

  // Blacksmith - Southwest
  {
    id: 'blacksmith',
    name: 'Blacksmith',
    x: 4,
    y: 30,
    width: 8,
    height: 7,
    floorTile: TileType.STONE,
    hasWalls: true,
    doors: [{ x: 7, y: 3, facing: 'east' }],
    heightLevel: 1
  },

  // Inn - Southeast
  {
    id: 'thornwick_inn',
    name: 'The Rusty Sword Inn',
    x: 34,
    y: 30,
    width: 10,
    height: 8,
    floorTile: TileType.STONE,
    hasWalls: true,
    doors: [{ x: 0, y: 4, facing: 'west' }],
    heightLevel: 1
  }
]

// NPCs
const npcs: NpcSpawnDefinition[] = [
  // Guards at the main gates (passive - won't attack players)
  {
    id: 'guard_south_1',
    npcType: NpcType.GUARD,
    x: 22,
    y: 44,
    patrolArea: { x: 20, y: 42, width: 8, height: 4 },
    respawns: true
  },
  {
    id: 'guard_south_2',
    npcType: NpcType.GUARD,
    x: 26,
    y: 44,
    patrolArea: { x: 20, y: 42, width: 8, height: 4 },
    respawns: true
  },

  // Guards at the keep
  {
    id: 'guard_keep_1',
    npcType: NpcType.GUARD,
    x: 22,
    y: 14,
    patrolArea: { x: 18, y: 12, width: 12, height: 6 },
    respawns: true
  },
  {
    id: 'guard_keep_2',
    npcType: NpcType.GUARD,
    x: 26,
    y: 14,
    patrolArea: { x: 18, y: 12, width: 12, height: 6 },
    respawns: true
  },

  // Chickens near the inn
  {
    id: 'chicken_1',
    npcType: NpcType.CHICKEN,
    x: 38,
    y: 40,
    patrolArea: { x: 36, y: 38, width: 8, height: 6 },
    respawns: true
  },
  {
    id: 'chicken_2',
    npcType: NpcType.CHICKEN,
    x: 40,
    y: 42,
    patrolArea: { x: 36, y: 38, width: 8, height: 6 },
    respawns: true
  },

  // Rats in the alleys
  {
    id: 'rat_1',
    npcType: NpcType.GIANT_RAT,
    x: 6,
    y: 40,
    patrolArea: { x: 4, y: 38, width: 6, height: 6 },
    respawns: true
  }
]

// World Objects
const worldObjects: WorldObjectPlacement[] = [
  // Bank booth inside the bank
  {
    id: 'bank_booth_1',
    objectType: WorldObjectType.BANK_BOOTH,
    x: 40,
    y: 20
  },

  // Trees around the town
  {
    id: 'tree_nw_1',
    objectType: WorldObjectType.TREE,
    x: 6,
    y: 6
  },
  {
    id: 'tree_nw_2',
    objectType: WorldObjectType.TREE,
    x: 8,
    y: 8
  },
  {
    id: 'tree_ne_1',
    objectType: WorldObjectType.TREE,
    x: 40,
    y: 6
  },
  {
    id: 'tree_ne_2',
    objectType: WorldObjectType.TREE,
    x: 42,
    y: 8
  },

  // Oak trees near the keep
  {
    id: 'oak_keep_1',
    objectType: WorldObjectType.OAK_TREE,
    x: 14,
    y: 8
  },
  {
    id: 'oak_keep_2',
    objectType: WorldObjectType.OAK_TREE,
    x: 34,
    y: 8
  },

  // Trees in the marketplace corners
  {
    id: 'tree_market_1',
    objectType: WorldObjectType.TREE,
    x: 15,
    y: 20
  },
  {
    id: 'tree_market_2',
    objectType: WorldObjectType.TREE,
    x: 32,
    y: 20
  },
  {
    id: 'tree_market_3',
    objectType: WorldObjectType.TREE,
    x: 15,
    y: 32
  },
  {
    id: 'tree_market_4',
    objectType: WorldObjectType.TREE,
    x: 32,
    y: 32
  },

  // Willow tree near a small pond (southwest)
  {
    id: 'willow_pond',
    objectType: WorldObjectType.WILLOW_TREE,
    x: 8,
    y: 42
  },

  // Fishing spots at the pond
  {
    id: 'fishing_pond_1',
    objectType: WorldObjectType.FISHING_SPOT_NET,
    x: 6,
    y: 44
  },

  // ============ COOKING ============
  // Cooking fire inside the inn
  {
    id: 'inn_fire',
    objectType: WorldObjectType.FIRE,
    x: 38,
    y: 34
  },

  // ============ MARKETPLACE ============
  // Central fountain
  {
    id: 'fountain_central',
    objectType: WorldObjectType.FOUNTAIN,
    x: 24,
    y: 26
  },

  // Market stalls around the edges
  {
    id: 'stall_north_1',
    objectType: WorldObjectType.MARKET_STALL_RED,
    x: 20,
    y: 23
  },
  {
    id: 'stall_north_2',
    objectType: WorldObjectType.MARKET_STALL_BLUE,
    x: 26,
    y: 23
  },
  {
    id: 'stall_south_1',
    objectType: WorldObjectType.MARKET_STALL_GREEN,
    x: 20,
    y: 30
  },
  {
    id: 'stall_south_2',
    objectType: WorldObjectType.MARKET_STALL_YELLOW,
    x: 26,
    y: 30
  },

  // Corner torches at marketplace
  {
    id: 'torch_market_nw',
    objectType: WorldObjectType.TORCH_STAND,
    x: 18,
    y: 22
  },
  {
    id: 'torch_market_ne',
    objectType: WorldObjectType.TORCH_STAND,
    x: 29,
    y: 22
  },
  {
    id: 'torch_market_sw',
    objectType: WorldObjectType.TORCH_STAND,
    x: 18,
    y: 31
  },
  {
    id: 'torch_market_se',
    objectType: WorldObjectType.TORCH_STAND,
    x: 29,
    y: 31
  },

  // ============ BLACKSMITH ============
  // Anvil outside the blacksmith
  {
    id: 'anvil_blacksmith',
    objectType: WorldObjectType.ANVIL,
    x: 13,
    y: 33
  },
  // Barrel at blacksmith
  {
    id: 'barrel_blacksmith_1',
    objectType: WorldObjectType.BARREL,
    x: 3,
    y: 31
  },
  // Crate at blacksmith
  {
    id: 'crate_blacksmith_1',
    objectType: WorldObjectType.CRATE,
    x: 3,
    y: 33
  },

  // ============ THE RUSTY SWORD INN ============
  // Bench outside inn
  {
    id: 'bench_inn',
    objectType: WorldObjectType.BENCH,
    x: 33,
    y: 36
  },
  // Table outside inn
  {
    id: 'table_inn',
    objectType: WorldObjectType.TABLE,
    x: 32,
    y: 34
  },
  // Barrels at inn side
  {
    id: 'barrel_inn_1',
    objectType: WorldObjectType.BARREL,
    x: 44,
    y: 31
  },
  {
    id: 'barrel_inn_2',
    objectType: WorldObjectType.BARREL,
    x: 44,
    y: 33
  },

  // ============ BANK ============
  // Torches at bank entrance
  {
    id: 'torch_bank_1',
    objectType: WorldObjectType.TORCH_STAND,
    x: 35,
    y: 20
  },
  {
    id: 'torch_bank_2',
    objectType: WorldObjectType.TORCH_STAND,
    x: 35,
    y: 22
  },

  // ============ GENERAL STORE ============
  // Crate at general store
  {
    id: 'crate_store_1',
    objectType: WorldObjectType.CRATE,
    x: 12,
    y: 20
  },
  // Barrel at general store
  {
    id: 'barrel_store_1',
    objectType: WorldObjectType.BARREL,
    x: 12,
    y: 22
  },
  // Sign post at general store
  {
    id: 'sign_store',
    objectType: WorldObjectType.SIGN_POST,
    x: 11,
    y: 18
  },

  // ============ THORNWICK KEEP ============
  // Torches at keep entrance
  {
    id: 'torch_keep_1',
    objectType: WorldObjectType.TORCH_STAND,
    x: 22,
    y: 14
  },
  {
    id: 'torch_keep_2',
    objectType: WorldObjectType.TORCH_STAND,
    x: 26,
    y: 14
  },

  // ============ SOUTH GATE AREA ============
  // Hay bales near gate
  {
    id: 'hay_gate_1',
    objectType: WorldObjectType.HAY_BALE,
    x: 18,
    y: 44
  },
  {
    id: 'hay_gate_2',
    objectType: WorldObjectType.HAY_BALE,
    x: 30,
    y: 44
  },

  // ============ CORNERS & EDGES ============
  // Bushes in corners
  {
    id: 'bush_nw',
    objectType: WorldObjectType.BUSH,
    x: 4,
    y: 4
  },
  {
    id: 'bush_ne',
    objectType: WorldObjectType.BUSH,
    x: 44,
    y: 4
  },

  // ============ NEAR INN / DECORATIVE ============
  // Flower patches near inn
  {
    id: 'flowers_inn_1',
    objectType: WorldObjectType.FLOWER_PATCH,
    x: 43,
    y: 38
  },
  {
    id: 'flowers_inn_2',
    objectType: WorldObjectType.FLOWER_PATCH,
    x: 45,
    y: 38
  },

  // ============ POND AREA ============
  // Rocks near pond
  {
    id: 'rock_pond_1',
    objectType: WorldObjectType.ROCK,
    x: 2,
    y: 44
  },
  {
    id: 'rock_pond_2',
    objectType: WorldObjectType.ROCK,
    x: 11,
    y: 45
  }
]

// Create tile overrides
const tileOverrides: TileOverride[] = [
  // Main town ground is grass at height 1
  ...createArea(0, 0, TOWN_WIDTH, TOWN_HEIGHT, TileType.GRASS, 1),

  // Town walls (perimeter) - WALL tiles
  // North wall
  ...createArea(0, 0, TOWN_WIDTH, 2, TileType.WALL, 2),
  // South wall (with gap for gate)
  ...createArea(0, TOWN_HEIGHT - 2, 20, 2, TileType.WALL, 2),
  ...createArea(28, TOWN_HEIGHT - 2, 20, 2, TileType.WALL, 2),
  // West wall
  ...createArea(0, 2, 2, TOWN_HEIGHT - 4, TileType.WALL, 2),
  // East wall
  ...createArea(TOWN_WIDTH - 2, 2, 2, TOWN_HEIGHT - 4, TileType.WALL, 2),

  // Main road from south gate to keep (vertical)
  ...createPath(24, 46, 24, 14),
  ...createPath(23, 46, 23, 14),

  // Road widening at marketplace (central square)
  ...createArea(18, 22, 12, 10, TileType.STONE, 1),

  // East-west road through marketplace
  ...createPath(12, 26, 36, 26),
  ...createPath(12, 27, 36, 27),

  // Path to bank
  ...createPath(36, 21, 44, 21),

  // Path to general store
  ...createPath(4, 21, 12, 21),

  // Path to blacksmith
  ...createPath(12, 33, 18, 33),

  // Path to inn
  ...createPath(30, 34, 34, 34),

  // Small pond in southwest (water tiles)
  ...createArea(4, 42, 6, 4, TileType.WATER, 0),

  // Sand around the pond
  ...createArea(3, 41, 1, 6, TileType.SAND, 1),
  ...createArea(10, 41, 1, 6, TileType.SAND, 1),
  ...createArea(4, 41, 6, 1, TileType.SAND, 1)
]

// The complete Thornwick town definition
export const THORNWICK: TownDefinition = {
  id: 'thornwick',
  name: 'Thornwick',
  bounds: {
    x: TOWN_X,
    y: TOWN_Y,
    width: TOWN_WIDTH,
    height: TOWN_HEIGHT
  },
  baseTile: TileType.GRASS,
  baseHeight: 1,
  buildings,
  npcs,
  worldObjects,
  tileOverrides,
  exits: [
    {
      id: 'south_gate',
      x: 24,
      y: 46
    },
    {
      id: 'north_gate',
      x: 24,
      y: 2
    }
  ]
}
