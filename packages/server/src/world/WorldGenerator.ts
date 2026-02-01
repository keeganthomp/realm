import { CHUNK_SIZE, TILE_SIZE, TileType } from '@realm/shared'
import type { ChunkData, ChunkObjectData } from '@realm/shared'
import { WorldObjectType } from '@realm/shared'

export class WorldGenerator {
  private seed: number

  constructor(seed: number) {
    this.seed = seed
  }

  generateChunk(chunkX: number, chunkY: number): ChunkData {
    const tiles: TileType[][] = Array(CHUNK_SIZE)
      .fill(null)
      .map(() => Array(CHUNK_SIZE).fill(TileType.GRASS))
    const heights: number[][] = Array(CHUNK_SIZE)
      .fill(null)
      .map(() => Array(CHUNK_SIZE).fill(0))
    const objects: ChunkObjectData[] = []

    for (let localY = 0; localY < CHUNK_SIZE; localY++) {
      for (let localX = 0; localX < CHUNK_SIZE; localX++) {
        const worldX = chunkX * CHUNK_SIZE + localX
        const worldY = chunkY * CHUNK_SIZE + localY

        const heightNoise = this.fractalNoise(worldX, worldY, 0.05)
        const moistureNoise = this.fractalNoise(worldX + 9999, worldY - 9999, 0.04)

        const heightLevel = heightNoise < 0.35 ? 0 : heightNoise < 0.65 ? 1 : 2
        heights[localY][localX] = heightLevel

        let tileType = TileType.GRASS
        if (heightLevel === 0 && moistureNoise > 0.55) {
          tileType = TileType.WATER
        } else if (moistureNoise > 0.7 && heightLevel <= 1) {
          tileType = TileType.SAND
        } else if (heightLevel >= 2 || heightNoise > 0.8) {
          tileType = TileType.STONE
        }

        tiles[localY][localX] = tileType

        const object = this.tryPlaceObject(worldX, worldY, tileType, moistureNoise)
        if (object) {
          objects.push(object)
        }
      }
    }

    return { chunkX, chunkY, tiles, heights, objects }
  }

  private tryPlaceObject(
    worldX: number,
    worldY: number,
    tileType: TileType,
    moistureNoise: number
  ): ChunkObjectData | null {
    const rnd = this.hash2d(this.seed, worldX, worldY)

    if (tileType === TileType.GRASS && rnd < 0.045) {
      return this.makeObject(WorldObjectType.TREE, worldX, worldY)
    }

    if (tileType === TileType.WATER && moistureNoise > 0.6 && rnd < 0.03) {
      return this.makeObject(WorldObjectType.FISHING_SPOT_NET, worldX, worldY)
    }

    if (tileType === TileType.STONE && rnd < 0.002) {
      return this.makeObject(WorldObjectType.BANK_BOOTH, worldX, worldY)
    }

    return null
  }

  private makeObject(type: WorldObjectType, worldX: number, worldY: number): ChunkObjectData {
    return {
      id: `obj_${type}_${worldX}_${worldY}`,
      objectType: type,
      x: worldX * TILE_SIZE + TILE_SIZE / 2,
      y: worldY * TILE_SIZE + TILE_SIZE / 2
    }
  }

  private hash2d(seed: number, x: number, y: number): number {
    let n = x * 374761393 + y * 668265263 + seed * 1013904223
    n = (n ^ (n >> 13)) * 1274126177
    n = n ^ (n >> 16)
    return (n >>> 0) / 4294967295
  }

  private fractalNoise(x: number, y: number, scale: number): number {
    let value = 0
    let amplitude = 1
    let frequency = scale
    let max = 0

    for (let i = 0; i < 4; i++) {
      value +=
        this.hash2d(this.seed + i * 1013, Math.floor(x * frequency), Math.floor(y * frequency)) *
        amplitude
      max += amplitude
      amplitude *= 0.5
      frequency *= 2
    }

    return value / max
  }
}
