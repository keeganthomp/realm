import { TileType, CHUNK_SIZE } from '../index'
import { WorldObjectType } from '../worldObjects'
import { EDITOR_CHUNK_VERSION, type EditorChunkSchema } from './ChunkSchema'

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export function validateEditorChunk(data: unknown): ValidationResult {
  const errors: string[] = []

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Data is not an object'] }
  }

  const chunk = data as Record<string, unknown>

  // Version check
  if (chunk.version !== EDITOR_CHUNK_VERSION) {
    errors.push(`Invalid version: expected ${EDITOR_CHUNK_VERSION}, got ${chunk.version}`)
  }

  // Chunk coordinates
  if (typeof chunk.chunkX !== 'number' || !Number.isInteger(chunk.chunkX)) {
    errors.push('chunkX must be an integer')
  }
  if (typeof chunk.chunkY !== 'number' || !Number.isInteger(chunk.chunkY)) {
    errors.push('chunkY must be an integer')
  }

  // Modified timestamp
  if (typeof chunk.modifiedAt !== 'string') {
    errors.push('modifiedAt must be a string')
  }

  // Tiles array
  if (!Array.isArray(chunk.tiles)) {
    errors.push('tiles must be an array')
  } else if (chunk.tiles.length !== CHUNK_SIZE) {
    errors.push(`tiles must have ${CHUNK_SIZE} rows, got ${chunk.tiles.length}`)
  } else {
    for (let y = 0; y < CHUNK_SIZE; y++) {
      const row = chunk.tiles[y]
      if (!Array.isArray(row)) {
        errors.push(`tiles[${y}] must be an array`)
        continue
      }
      if (row.length !== CHUNK_SIZE) {
        errors.push(`tiles[${y}] must have ${CHUNK_SIZE} columns, got ${row.length}`)
        continue
      }
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const tile = row[x]
        if (!Object.values(TileType).includes(tile)) {
          errors.push(`tiles[${y}][${x}] has invalid tile type: ${tile}`)
        }
      }
    }
  }

  // Heights array
  if (!Array.isArray(chunk.heights)) {
    errors.push('heights must be an array')
  } else if (chunk.heights.length !== CHUNK_SIZE) {
    errors.push(`heights must have ${CHUNK_SIZE} rows, got ${chunk.heights.length}`)
  } else {
    for (let y = 0; y < CHUNK_SIZE; y++) {
      const row = chunk.heights[y]
      if (!Array.isArray(row)) {
        errors.push(`heights[${y}] must be an array`)
        continue
      }
      if (row.length !== CHUNK_SIZE) {
        errors.push(`heights[${y}] must have ${CHUNK_SIZE} columns, got ${row.length}`)
        continue
      }
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const height = row[x]
        if (typeof height !== 'number' || height < 0 || height > 5) {
          errors.push(`heights[${y}][${x}] must be a number 0-5, got ${height}`)
        }
      }
    }
  }

  // Props array
  if (!Array.isArray(chunk.props)) {
    errors.push('props must be an array')
  } else {
    for (let i = 0; i < chunk.props.length; i++) {
      const prop = chunk.props[i] as Record<string, unknown>
      if (typeof prop.id !== 'string') {
        errors.push(`props[${i}].id must be a string`)
      }
      if (!Object.values(WorldObjectType).includes(prop.objectType as WorldObjectType)) {
        errors.push(`props[${i}].objectType is invalid: ${prop.objectType}`)
      }
      if (typeof prop.localX !== 'number' || prop.localX < 0 || prop.localX >= CHUNK_SIZE) {
        errors.push(`props[${i}].localX must be 0-${CHUNK_SIZE - 1}`)
      }
      if (typeof prop.localY !== 'number' || prop.localY < 0 || prop.localY >= CHUNK_SIZE) {
        errors.push(`props[${i}].localY must be 0-${CHUNK_SIZE - 1}`)
      }
    }
  }

  // Spawns array
  if (!Array.isArray(chunk.spawns)) {
    errors.push('spawns must be an array')
  } else {
    for (let i = 0; i < chunk.spawns.length; i++) {
      const spawn = chunk.spawns[i] as Record<string, unknown>
      if (typeof spawn.id !== 'string') {
        errors.push(`spawns[${i}].id must be a string`)
      }
      if (typeof spawn.spawnType !== 'string') {
        errors.push(`spawns[${i}].spawnType must be a string`)
      }
      if (typeof spawn.localX !== 'number' || spawn.localX < 0 || spawn.localX >= CHUNK_SIZE) {
        errors.push(`spawns[${i}].localX must be 0-${CHUNK_SIZE - 1}`)
      }
      if (typeof spawn.localY !== 'number' || spawn.localY < 0 || spawn.localY >= CHUNK_SIZE) {
        errors.push(`spawns[${i}].localY must be 0-${CHUNK_SIZE - 1}`)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

export function parseEditorChunk(json: string): EditorChunkSchema | null {
  try {
    const data = JSON.parse(json)
    const result = validateEditorChunk(data)
    if (!result.valid) {
      console.error('Chunk validation failed:', result.errors)
      return null
    }
    return data as EditorChunkSchema
  } catch (e) {
    console.error('Failed to parse chunk JSON:', e)
    return null
  }
}
