import { TileType, CHUNK_SIZE } from '../index'
import type { WorldObjectType } from '../worldObjects'

export const EDITOR_CHUNK_VERSION = 1

export interface EditorPropPlacement {
  id: string
  objectType: WorldObjectType
  localX: number // 0 to CHUNK_SIZE-1
  localY: number // 0 to CHUNK_SIZE-1
}

export interface EditorSpawnPlacement {
  id: string
  spawnType: string // NPC type or resource type
  localX: number
  localY: number
  respawnTime?: number
}

export interface EditorChunkSchema {
  version: typeof EDITOR_CHUNK_VERSION
  chunkX: number
  chunkY: number
  modifiedAt: string // ISO date string

  tiles: TileType[][] // CHUNK_SIZE x CHUNK_SIZE
  heights: number[][] // 0-5 height levels

  props: EditorPropPlacement[]
  spawns: EditorSpawnPlacement[]
}

export function createEmptyEditorChunk(chunkX: number, chunkY: number): EditorChunkSchema {
  const tiles: TileType[][] = []
  const heights: number[][] = []

  for (let y = 0; y < CHUNK_SIZE; y++) {
    tiles[y] = []
    heights[y] = []
    for (let x = 0; x < CHUNK_SIZE; x++) {
      tiles[y][x] = TileType.GRASS
      heights[y][x] = 0
    }
  }

  return {
    version: EDITOR_CHUNK_VERSION,
    chunkX,
    chunkY,
    modifiedAt: new Date().toISOString(),
    tiles,
    heights,
    props: [],
    spawns: []
  }
}

export function editorChunkToRuntimeChunk(editorChunk: EditorChunkSchema): import('../index').ChunkData {
  const objects: import('../index').ChunkObjectData[] = editorChunk.props.map(prop => ({
    id: prop.id,
    objectType: prop.objectType,
    x: editorChunk.chunkX * CHUNK_SIZE + prop.localX,
    y: editorChunk.chunkY * CHUNK_SIZE + prop.localY,
    depleted: false
  }))

  return {
    chunkX: editorChunk.chunkX,
    chunkY: editorChunk.chunkY,
    tiles: editorChunk.tiles,
    heights: editorChunk.heights,
    objects
  }
}
