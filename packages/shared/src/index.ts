// Shared types and constants for Realm

import type { WorldObjectType } from './worldObjects'

// Re-export core types
export * from './types'

export interface ChunkObjectData {
  id: string
  objectType: WorldObjectType
  x: number
  y: number
  depleted?: boolean
  respawnAt?: number
}

import { TileType } from './types'

export interface ChunkData {
  chunkX: number
  chunkY: number
  tiles: TileType[][]
  heights: number[][]
  objects: ChunkObjectData[]
}

import type { Position, Direction } from './types'

export interface PlayerState {
  id: string
  name: string
  position: Position
  targetPosition: Position | null
  direction: Direction
  isMoving: boolean
}

// Re-export modules
export * from './skills'
export * from './items'
export * from './worldObjects'
export * from './npcs'
export * from './combat'
export * from './chunks'
export * from './towns'
export * from './wilderness'
