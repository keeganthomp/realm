// Town System for Realm
// Each town is defined as data that the WorldGenerator uses to place tiles, buildings, NPCs

import { TileType } from '../types'
import { WorldObjectType } from '../worldObjects'
import { NpcType } from '../npcs'

// A rectangular area in tile coordinates
export interface TileRect {
  x: number
  y: number
  width: number
  height: number
}

// Building definition within a town
export interface BuildingDefinition {
  id: string
  name: string
  // Position relative to town origin (top-left)
  x: number
  y: number
  width: number
  height: number
  // Floor tile type (inside the walls)
  floorTile: TileType
  // Whether this building has walls (blocks movement on edges)
  hasWalls: boolean
  // Door positions relative to building origin (allows entry)
  doors: Array<{ x: number; y: number; facing: 'north' | 'south' | 'east' | 'west' }>
  // Height level for the building floor
  heightLevel?: number
}

// NPC spawn point within a town
export interface NpcSpawnDefinition {
  id: string
  npcType: NpcType
  // Position relative to town origin
  x: number
  y: number
  // Optional patrol area (NPC wanders within this area)
  patrolArea?: TileRect
  // Whether this NPC respawns after death
  respawns: boolean
}

// World object placement within a town
export interface WorldObjectPlacement {
  id: string
  objectType: WorldObjectType
  // Position relative to town origin
  x: number
  y: number
}

// Tile override - explicitly set a tile in the town
export interface TileOverride {
  x: number
  y: number
  tileType: TileType
  height?: number
}

// Complete town definition
export interface TownDefinition {
  id: string
  name: string
  // Town bounds in world tile coordinates
  bounds: TileRect
  // Base tile type for the entire town area (roads, ground)
  baseTile: TileType
  // Base height level for the town
  baseHeight: number
  // Buildings within the town
  buildings: BuildingDefinition[]
  // NPCs to spawn
  npcs: NpcSpawnDefinition[]
  // World objects (trees, banks, etc.)
  worldObjects: WorldObjectPlacement[]
  // Individual tile overrides (for paths, decorations, etc.)
  tileOverrides: TileOverride[]
  // Entry/exit points for connecting to other towns (future)
  exits: Array<{
    id: string
    x: number
    y: number
    targetTownId?: string
    targetX?: number
    targetY?: number
  }>
}

// Check if a world tile position is within a town's bounds
export function isInTownBounds(town: TownDefinition, tileX: number, tileY: number): boolean {
  return (
    tileX >= town.bounds.x &&
    tileX < town.bounds.x + town.bounds.width &&
    tileY >= town.bounds.y &&
    tileY < town.bounds.y + town.bounds.height
  )
}

// Check if a tile is inside a building
export function isInBuilding(
  building: BuildingDefinition,
  townX: number,
  townY: number,
  localX: number,
  localY: number
): boolean {
  const relX = localX - (townX + building.x)
  const relY = localY - (townY + building.y)
  return relX >= 0 && relX < building.width && relY >= 0 && relY < building.height
}

// Check if a tile is a building wall (edge tile, not a door)
export function isBuildingWall(
  building: BuildingDefinition,
  townX: number,
  townY: number,
  localX: number,
  localY: number
): boolean {
  if (!building.hasWalls) return false

  const relX = localX - (townX + building.x)
  const relY = localY - (townY + building.y)

  // Not inside building bounds
  if (relX < 0 || relX >= building.width || relY < 0 || relY >= building.height) {
    return false
  }

  // Check if on the edge
  const isEdge =
    relX === 0 || relX === building.width - 1 || relY === 0 || relY === building.height - 1

  if (!isEdge) return false

  // Check if it's a door position
  for (const door of building.doors) {
    if (relX === door.x && relY === door.y) {
      return false // Doors are not walls
    }
  }

  return true
}

// Registry of all towns
const TOWN_REGISTRY: Map<string, TownDefinition> = new Map()

export function registerTown(town: TownDefinition): void {
  TOWN_REGISTRY.set(town.id, town)
}

export function getTown(id: string): TownDefinition | undefined {
  return TOWN_REGISTRY.get(id)
}

export function getAllTowns(): TownDefinition[] {
  return Array.from(TOWN_REGISTRY.values())
}

// Find which town (if any) contains a given tile position
export function getTownAtTile(tileX: number, tileY: number): TownDefinition | undefined {
  for (const town of TOWN_REGISTRY.values()) {
    if (isInTownBounds(town, tileX, tileY)) {
      return town
    }
  }
  return undefined
}

// Import and register all towns
import { THORNWICK } from './thornwick'
registerTown(THORNWICK)

// Re-export town definitions
export { THORNWICK } from './thornwick'
