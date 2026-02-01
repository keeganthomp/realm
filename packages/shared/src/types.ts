// Core types for Realm - no dependencies to avoid circular imports

export const TILE_SIZE = 32
export const CHUNK_SIZE = 32 // tiles per chunk

// Tile types
export enum TileType {
  GRASS = 0,
  WATER = 1,
  SAND = 2,
  STONE = 3,
  TREE = 4,
  WALL = 5
}

// Which tiles block movement
export const WALKABLE_TILES = new Set([TileType.GRASS, TileType.SAND, TileType.STONE])

export interface Position {
  x: number
  y: number
}

export interface TilePosition {
  tileX: number
  tileY: number
}

export interface ChunkCoord {
  chunkX: number
  chunkY: number
}

export type ChunkKey = string

export enum Direction {
  DOWN = 0,
  LEFT = 1,
  RIGHT = 2,
  UP = 3
}

// Convert world position to tile position
export function worldToTile(pos: Position): TilePosition {
  return {
    tileX: Math.floor(pos.x / TILE_SIZE),
    tileY: Math.floor(pos.y / TILE_SIZE)
  }
}

// Convert tile position to world position (center of tile)
export function tileToWorld(tile: TilePosition): Position {
  return {
    x: tile.tileX * TILE_SIZE + TILE_SIZE / 2,
    y: tile.tileY * TILE_SIZE + TILE_SIZE / 2
  }
}

export function getChunkKey(chunkX: number, chunkY: number): ChunkKey {
  return `${chunkX},${chunkY}`
}

// Calculate direction from one position to another
export function getDirection(from: Position, to: Position): Direction {
  const dx = to.x - from.x
  const dy = to.y - from.y

  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? Direction.RIGHT : Direction.LEFT
  } else {
    return dy > 0 ? Direction.DOWN : Direction.UP
  }
}
