import { CHUNK_SIZE, TILE_SIZE, TileType } from '@realm/shared'
import type { ChunkData, ChunkObjectData } from '@realm/shared'
import {
  WorldObjectType,
  getAllTowns,
  isInTownBounds,
  isBuildingWall,
  getAllWildernessZones,
  isInWildernessZone,
  type TownDefinition,
  type WildernessZone
} from '@realm/shared'

export class WorldGenerator {
  private seed: number
  private towns: TownDefinition[]
  private wildernessZones: WildernessZone[]

  constructor(seed: number) {
    this.seed = seed
    this.towns = getAllTowns()
    this.wildernessZones = getAllWildernessZones()
  }

  generateChunk(chunkX: number, chunkY: number): ChunkData {
    const tiles: TileType[][] = Array(CHUNK_SIZE)
      .fill(null)
      .map(() => Array(CHUNK_SIZE).fill(TileType.GRASS))
    const heights: number[][] = Array(CHUNK_SIZE)
      .fill(null)
      .map(() => Array(CHUNK_SIZE).fill(0))
    const objects: ChunkObjectData[] = []

    // Track which tiles are used by towns or wilderness zones
    const reservedTiles: Set<string> = new Set()

    // First pass: Apply town tiles
    for (const town of this.towns) {
      this.applyTownToChunk(chunkX, chunkY, town, tiles, heights, objects, reservedTiles)
    }

    // Second pass: Apply wilderness zones
    for (const zone of this.wildernessZones) {
      this.applyWildernessZoneToChunk(chunkX, chunkY, zone, tiles, heights, objects, reservedTiles)
    }

    // Fourth pass: Procedural generation for unreserved tiles
    for (let localY = 0; localY < CHUNK_SIZE; localY++) {
      for (let localX = 0; localX < CHUNK_SIZE; localX++) {
        const worldX = chunkX * CHUNK_SIZE + localX
        const worldY = chunkY * CHUNK_SIZE + localY
        const key = `${worldX},${worldY}`

        // Skip if this tile is part of a town or wilderness zone
        if (reservedTiles.has(key)) continue

        // Procedural terrain generation
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

        // Try to place procedural objects
        const object = this.tryPlaceObject(worldX, worldY, tileType, moistureNoise)
        if (object) {
          objects.push(object)
        }
      }
    }

    return { chunkX, chunkY, tiles, heights, objects }
  }

  private applyTownToChunk(
    chunkX: number,
    chunkY: number,
    town: TownDefinition,
    tiles: TileType[][],
    heights: number[][],
    objects: ChunkObjectData[],
    townTiles: Set<string>
  ): void {
    const chunkStartX = chunkX * CHUNK_SIZE
    const chunkStartY = chunkY * CHUNK_SIZE
    const chunkEndX = chunkStartX + CHUNK_SIZE
    const chunkEndY = chunkStartY + CHUNK_SIZE

    // Check if chunk overlaps with town bounds
    const townEndX = town.bounds.x + town.bounds.width
    const townEndY = town.bounds.y + town.bounds.height

    if (
      chunkStartX >= townEndX ||
      chunkEndX <= town.bounds.x ||
      chunkStartY >= townEndY ||
      chunkEndY <= town.bounds.y
    ) {
      return // No overlap
    }

    // Build a map of tile overrides for quick lookup
    const overrideMap = new Map<string, { tileType: TileType; height?: number }>()
    for (const override of town.tileOverrides) {
      // Convert town-relative coordinates to world coordinates
      const worldX = town.bounds.x + override.x
      const worldY = town.bounds.y + override.y
      overrideMap.set(`${worldX},${worldY}`, {
        tileType: override.tileType,
        height: override.height
      })
    }

    // Apply tiles within the overlap region
    for (let localY = 0; localY < CHUNK_SIZE; localY++) {
      for (let localX = 0; localX < CHUNK_SIZE; localX++) {
        const worldX = chunkStartX + localX
        const worldY = chunkStartY + localY

        if (!isInTownBounds(town, worldX, worldY)) continue

        const key = `${worldX},${worldY}`
        townTiles.add(key)

        // Check for tile override
        const override = overrideMap.get(key)
        if (override) {
          tiles[localY][localX] = override.tileType
          heights[localY][localX] = override.height ?? town.baseHeight
          continue
        }

        // Check if inside a building
        let inBuilding = false
        for (const building of town.buildings) {
          const buildingWorldX = town.bounds.x + building.x
          const buildingWorldY = town.bounds.y + building.y

          // Check if this tile is within the building bounds
          if (
            worldX >= buildingWorldX &&
            worldX < buildingWorldX + building.width &&
            worldY >= buildingWorldY &&
            worldY < buildingWorldY + building.height
          ) {
            // Check if it's a wall tile
            if (isBuildingWall(building, town.bounds.x, town.bounds.y, worldX, worldY)) {
              tiles[localY][localX] = TileType.WALL
              heights[localY][localX] = (building.heightLevel ?? town.baseHeight) + 1
            } else {
              tiles[localY][localX] = building.floorTile
              heights[localY][localX] = building.heightLevel ?? town.baseHeight
            }
            inBuilding = true
            break
          }
        }

        if (!inBuilding) {
          // Default town ground
          tiles[localY][localX] = town.baseTile
          heights[localY][localX] = town.baseHeight
        }
      }
    }

    // Add world objects that are within this chunk
    for (const obj of town.worldObjects) {
      const worldX = town.bounds.x + obj.x
      const worldY = town.bounds.y + obj.y

      // Check if object is in this chunk
      if (
        worldX >= chunkStartX &&
        worldX < chunkEndX &&
        worldY >= chunkStartY &&
        worldY < chunkEndY
      ) {
        objects.push({
          id: `town_${town.id}_${obj.id}`,
          objectType: obj.objectType,
          x: worldX * TILE_SIZE + TILE_SIZE / 2,
          y: worldY * TILE_SIZE + TILE_SIZE / 2
        })
      }
    }
  }

  private applyWildernessZoneToChunk(
    chunkX: number,
    chunkY: number,
    zone: WildernessZone,
    tiles: TileType[][],
    heights: number[][],
    objects: ChunkObjectData[],
    reservedTiles: Set<string>
  ): void {
    const chunkStartX = chunkX * CHUNK_SIZE
    const chunkStartY = chunkY * CHUNK_SIZE
    const chunkEndX = chunkStartX + CHUNK_SIZE
    const chunkEndY = chunkStartY + CHUNK_SIZE

    // Check if chunk overlaps with zone bounds
    const zoneEndX = zone.bounds.x + zone.bounds.width
    const zoneEndY = zone.bounds.y + zone.bounds.height

    if (
      chunkStartX >= zoneEndX ||
      chunkEndX <= zone.bounds.x ||
      chunkStartY >= zoneEndY ||
      chunkEndY <= zone.bounds.y
    ) {
      return // No overlap
    }

    // Apply base tile and height for zone tiles
    for (let localY = 0; localY < CHUNK_SIZE; localY++) {
      for (let localX = 0; localX < CHUNK_SIZE; localX++) {
        const worldX = chunkStartX + localX
        const worldY = chunkStartY + localY

        if (!isInWildernessZone(zone, worldX, worldY)) continue

        const key = `${worldX},${worldY}`

        // Don't override town tiles
        if (reservedTiles.has(key)) continue

        reservedTiles.add(key)

        // Apply zone's base tile if specified
        if (zone.baseTile !== undefined) {
          tiles[localY][localX] = zone.baseTile
        }
        if (zone.baseHeight !== undefined) {
          heights[localY][localX] = zone.baseHeight
        }
      }
    }

    // Apply tile overrides
    if (zone.tileOverrides) {
      for (const override of zone.tileOverrides) {
        const worldX = zone.bounds.x + override.x
        const worldY = zone.bounds.y + override.y
        const localX = worldX - chunkStartX
        const localY = worldY - chunkStartY

        if (localX >= 0 && localX < CHUNK_SIZE && localY >= 0 && localY < CHUNK_SIZE) {
          tiles[localY][localX] = override.tileType
          if (override.height !== undefined) {
            heights[localY][localX] = override.height
          }
        }
      }
    }

    // Add wilderness objects within this chunk
    for (const obj of zone.objects) {
      const worldX = zone.bounds.x + obj.x
      const worldY = zone.bounds.y + obj.y

      if (
        worldX >= chunkStartX &&
        worldX < chunkEndX &&
        worldY >= chunkStartY &&
        worldY < chunkEndY
      ) {
        objects.push({
          id: `wild_${zone.id}_${obj.id}`,
          objectType: obj.objectType,
          x: worldX * TILE_SIZE + TILE_SIZE / 2,
          y: worldY * TILE_SIZE + TILE_SIZE / 2
        })
      }
    }
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

  // Get NPCs that should spawn in a given chunk
  getNpcSpawnsForChunk(chunkX: number, chunkY: number): Array<{
    id: string
    npcType: string
    x: number
    y: number
  }> {
    const spawns: Array<{ id: string; npcType: string; x: number; y: number }> = []
    const chunkStartX = chunkX * CHUNK_SIZE
    const chunkStartY = chunkY * CHUNK_SIZE
    const chunkEndX = chunkStartX + CHUNK_SIZE
    const chunkEndY = chunkStartY + CHUNK_SIZE

    // Town NPCs
    for (const town of this.towns) {
      for (const npc of town.npcs) {
        const worldX = town.bounds.x + npc.x
        const worldY = town.bounds.y + npc.y

        if (
          worldX >= chunkStartX &&
          worldX < chunkEndX &&
          worldY >= chunkStartY &&
          worldY < chunkEndY
        ) {
          spawns.push({
            id: `town_${town.id}_${npc.id}`,
            npcType: npc.npcType,
            x: worldX * TILE_SIZE + TILE_SIZE / 2,
            y: worldY * TILE_SIZE + TILE_SIZE / 2
          })
        }
      }
    }

    // Wilderness zone NPCs
    for (const zone of this.wildernessZones) {
      if (!zone.npcs) continue

      for (const npc of zone.npcs) {
        const worldX = zone.bounds.x + npc.x
        const worldY = zone.bounds.y + npc.y

        if (
          worldX >= chunkStartX &&
          worldX < chunkEndX &&
          worldY >= chunkStartY &&
          worldY < chunkEndY
        ) {
          spawns.push({
            id: `wild_${zone.id}_${npc.id}`,
            npcType: npc.npcType,
            x: worldX * TILE_SIZE + TILE_SIZE / 2,
            y: worldY * TILE_SIZE + TILE_SIZE / 2
          })
        }
      }
    }

    return spawns
  }
}
