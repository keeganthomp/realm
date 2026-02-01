import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
  Vector3,
  AbstractMesh
} from '@babylonjs/core'
import { CHUNK_SIZE, TILE_SIZE, TileType, WALKABLE_TILES, getChunkKey } from '@realm/shared'
import type { ChunkData, ChunkKey } from '@realm/shared'

// Tile colors (RGB normalized 0-1)
const TILE_COLORS: Record<TileType, { r: number; g: number; b: number }> = {
  [TileType.GRASS]: { r: 0.29, g: 0.49, b: 0.14 }, // #4a7c23
  [TileType.WATER]: { r: 0.24, g: 0.52, b: 0.78 }, // #3d85c6
  [TileType.SAND]: { r: 0.79, g: 0.71, b: 0.35 }, // #c9b458
  [TileType.STONE]: { r: 0.5, g: 0.5, b: 0.5 }, // #808080
  [TileType.TREE]: { r: 0.29, g: 0.49, b: 0.14 }, // Trees show grass underneath
  [TileType.WALL]: { r: 0.29, g: 0.29, b: 0.29 } // #4a4a4a
}

export const LEVEL_H = 0.25
export const TILE_THICK = 0.08
const CLIFF_THICK = 0.08

export class TilemapRenderer {
  public worldWidth: number
  public worldHeight: number

  private scene: Scene
  private chunks: Map<ChunkKey, { data: ChunkData; meshes: AbstractMesh[] }> = new Map()
  private pickableMeshes: Mesh[] = []
  private baseMeshes: Map<TileType, Mesh> = new Map()

  constructor(scene: Scene) {
    this.scene = scene
    this.worldWidth = 0
    this.worldHeight = 0
  }

  async init() {
    // chunks are streamed in from server
  }

  private ensureBaseMeshes() {
    if (this.baseMeshes.size > 0) return

    for (const tileType of Object.values(TileType).filter(
      (v) => typeof v === 'number'
    ) as number[]) {
      const mesh = MeshBuilder.CreateBox(
        `tile_${tileType}_base`,
        { width: 1, height: TILE_THICK, depth: 1 },
        this.scene
      )
      const color = TILE_COLORS[tileType as TileType]
      const mat = new StandardMaterial(`tileMat_${tileType}_base`, this.scene)
      mat.diffuseColor = new Color3(color.r, color.g, color.b)
      mat.specularColor = Color3.Black()
      mat.freeze() // Freeze material for performance
      mesh.material = mat
      mesh.isPickable = true
      mesh.isVisible = false
      mesh.metadata = { terrainType: 'tile' }
      this.baseMeshes.set(tileType as TileType, mesh)
      this.pickableMeshes.push(mesh)
    }
  }

  applyChunk(chunk: ChunkData) {
    const key = getChunkKey(chunk.chunkX, chunk.chunkY)
    if (this.chunks.has(key)) {
      console.log(`[TilemapRenderer] Chunk ${key} already exists, skipping apply`)
      return
    }
    console.log(`[TilemapRenderer] Applying chunk ${key}`)

    this.ensureBaseMeshes()
    const meshes: AbstractMesh[] = []

    const originX = chunk.chunkX * CHUNK_SIZE
    const originY = chunk.chunkY * CHUNK_SIZE

    for (let y = 0; y < CHUNK_SIZE; y++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const tileType = chunk.tiles[y][x]
        const height = chunk.heights[y][x]
        const mesh = this.baseMeshes.get(tileType)
        if (!mesh) continue
        const instance = mesh.createInstance(`tile_${key}_${x}_${y}`)
        instance.isPickable = true
        instance.position = new Vector3(
          originX + x + 0.5,
          height * LEVEL_H + TILE_THICK / 2,
          originY + y + 0.5
        )
        meshes.push(instance)
      }
    }

    // TODO: re-enable cliffs with optimized instancing

    this.chunks.set(key, { data: chunk, meshes })
    this.updateWorldSize()
  }

  removeChunk(chunkKey: ChunkKey) {
    const entry = this.chunks.get(chunkKey)
    if (!entry) {
      console.log(`[TilemapRenderer] removeChunk: ${chunkKey} not found`)
      return
    }
    console.log(`[TilemapRenderer] removeChunk: removing ${chunkKey} with ${entry.meshes.length} meshes`)
    for (const mesh of entry.meshes) {
      mesh.dispose()
    }
    this.chunks.delete(chunkKey)
    this.updateWorldSize()
  }

  private buildCliffMeshes(chunk: ChunkData): Mesh {
    const cliffMat = new StandardMaterial(`cliffMat_${chunk.chunkX}_${chunk.chunkY}`, this.scene)
    cliffMat.diffuseColor = new Color3(0.35, 0.35, 0.35)
    cliffMat.specularColor = Color3.Black()
    cliffMat.freeze() // Freeze material for performance

    const faceMesh = MeshBuilder.CreateBox(
      `cliffFace_${chunk.chunkX}_${chunk.chunkY}`,
      { width: 1, height: 1, depth: CLIFF_THICK },
      this.scene
    )
    faceMesh.material = cliffMat
    faceMesh.isPickable = false
    faceMesh.isVisible = false

    const addFace = (
      posX: number,
      posY: number,
      posZ: number,
      scaleX: number,
      scaleY: number,
      scaleZ: number
    ) => {
      const instance = faceMesh.createInstance(
        `cliff_${chunk.chunkX}_${chunk.chunkY}_${posX}_${posZ}`
      )
      instance.position = new Vector3(posX, posY, posZ)
      instance.scaling = new Vector3(scaleX, scaleY, scaleZ)
    }

    const originX = chunk.chunkX * CHUNK_SIZE
    const originY = chunk.chunkY * CHUNK_SIZE

    for (let y = 0; y < CHUNK_SIZE; y++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const h0 = chunk.heights[y][x]
        const neighbors = [
          { dx: 0, dy: -1, edge: 'north' },
          { dx: 0, dy: 1, edge: 'south' },
          { dx: -1, dy: 0, edge: 'west' },
          { dx: 1, dy: 0, edge: 'east' }
        ]

        for (const n of neighbors) {
          const nx = x + n.dx
          const ny = y + n.dy
          const h1 =
            nx < 0 || nx >= CHUNK_SIZE || ny < 0 || ny >= CHUNK_SIZE ? 0 : chunk.heights[ny][nx]
          const diff = h0 - h1
          if (diff <= 0) continue

          const faceHeight = diff * LEVEL_H
          const bottomY = h1 * LEVEL_H
          const centerY = bottomY + faceHeight / 2

          const baseX = originX + x
          const baseY = originY + y

          if (n.edge === 'north') {
            addFace(baseX + 0.5, centerY, baseY + 0, 1, faceHeight, CLIFF_THICK)
          } else if (n.edge === 'south') {
            addFace(baseX + 0.5, centerY, baseY + 1, 1, faceHeight, CLIFF_THICK)
          } else if (n.edge === 'west') {
            addFace(baseX + 0, centerY, baseY + 0.5, CLIFF_THICK, faceHeight, 1)
          } else if (n.edge === 'east') {
            addFace(baseX + 1, centerY, baseY + 0.5, CLIFF_THICK, faceHeight, 1)
          }
        }
      }
    }

    return faceMesh
  }

  isWalkable(tileX: number, tileY: number): boolean {
    const tileType = this.getTileAt(tileX, tileY)
    if (tileType === null) return false
    return WALKABLE_TILES.has(tileType)
  }

  getHeight(tileX: number, tileY: number): number {
    const chunk = this.getChunkAtTile(tileX, tileY)
    if (!chunk) return 0
    const { localX, localY } = this.getLocalTile(tileX, tileY)
    return chunk.heights[localY][localX]
  }

  getTerrainMeshes(): Mesh[] {
    return this.pickableMeshes
  }

  getTileAt(tileX: number, tileY: number): TileType | null {
    const chunk = this.getChunkAtTile(tileX, tileY)
    if (!chunk) return null
    const { localX, localY } = this.getLocalTile(tileX, tileY)
    return chunk.tiles[localY][localX]
  }

  // Editor methods for modifying tiles in real-time
  setTileAt(tileX: number, tileY: number, tileType: TileType) {
    const chunkX = Math.floor(tileX / CHUNK_SIZE)
    const chunkY = Math.floor(tileY / CHUNK_SIZE)
    const key = getChunkKey(chunkX, chunkY)
    const entry = this.chunks.get(key)
    if (!entry) return

    const { localX, localY } = this.getLocalTile(tileX, tileY)
    const oldType = entry.data.tiles[localY][localX]
    if (oldType === tileType) return

    // Update data
    entry.data.tiles[localY][localX] = tileType

    // Find and replace the mesh instance
    const instanceIndex = localY * CHUNK_SIZE + localX
    const oldInstance = entry.meshes[instanceIndex]
    if (oldInstance) {
      const newBaseMesh = this.baseMeshes.get(tileType)
      if (newBaseMesh) {
        const pos = oldInstance.position.clone()
        oldInstance.dispose()
        const newInstance = newBaseMesh.createInstance(`tile_${key}_${localX}_${localY}`)
        newInstance.isPickable = true
        newInstance.position = pos
        entry.meshes[instanceIndex] = newInstance
      }
    }
  }

  setHeightAt(tileX: number, tileY: number, height: number) {
    const chunkX = Math.floor(tileX / CHUNK_SIZE)
    const chunkY = Math.floor(tileY / CHUNK_SIZE)
    const key = getChunkKey(chunkX, chunkY)
    const entry = this.chunks.get(key)
    if (!entry) return

    const { localX, localY } = this.getLocalTile(tileX, tileY)
    const clampedHeight = Math.max(0, Math.min(5, height))

    // Update data
    entry.data.heights[localY][localX] = clampedHeight

    // Update mesh position
    const instanceIndex = localY * CHUNK_SIZE + localX
    const instance = entry.meshes[instanceIndex]
    if (instance) {
      const originX = chunkX * CHUNK_SIZE
      const originY = chunkY * CHUNK_SIZE
      instance.position = new Vector3(
        originX + localX + 0.5,
        clampedHeight * LEVEL_H + TILE_THICK / 2,
        originY + localY + 0.5
      )
    }
  }

  // Force rebuild a chunk's meshes (useful after multiple changes)
  rebuildChunk(chunkX: number, chunkY: number) {
    const key = getChunkKey(chunkX, chunkY)
    const entry = this.chunks.get(key)
    if (!entry) return

    // Dispose old meshes
    for (const mesh of entry.meshes) {
      mesh.dispose()
    }

    // Rebuild
    const meshes: AbstractMesh[] = []
    const originX = chunkX * CHUNK_SIZE
    const originY = chunkY * CHUNK_SIZE

    for (let y = 0; y < CHUNK_SIZE; y++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const tileType = entry.data.tiles[y][x]
        const height = entry.data.heights[y][x]
        const mesh = this.baseMeshes.get(tileType)
        if (!mesh) continue
        const instance = mesh.createInstance(`tile_${key}_${x}_${y}`)
        instance.isPickable = true
        instance.position = new Vector3(
          originX + x + 0.5,
          height * LEVEL_H + TILE_THICK / 2,
          originY + y + 0.5
        )
        meshes.push(instance)
      }
    }

    entry.meshes = meshes
  }

  buildCollisionGrid() {
    const bounds = this.getLoadedBounds()
    if (!bounds) {
      return { grid: [], heights: [], offsetX: 0, offsetY: 0 }
    }

    const { minTileX, minTileY, maxTileX, maxTileY } = bounds
    const width = maxTileX - minTileX + 1
    const height = maxTileY - minTileY + 1
    const grid: number[][] = Array(height)
      .fill(null)
      .map(() => Array(width).fill(1))
    const heights: number[][] = Array(height)
      .fill(null)
      .map(() => Array(width).fill(0))

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tileX = minTileX + x
        const tileY = minTileY + y
        const tile = this.getTileAt(tileX, tileY)
        grid[y][x] = tile !== null && WALKABLE_TILES.has(tile) ? 0 : 1
        heights[y][x] = this.getHeight(tileX, tileY)
      }
    }

    return { grid, heights, offsetX: minTileX, offsetY: minTileY }
  }

  private getChunkAtTile(tileX: number, tileY: number): ChunkData | null {
    const chunkX = Math.floor(tileX / CHUNK_SIZE)
    const chunkY = Math.floor(tileY / CHUNK_SIZE)
    const key = getChunkKey(chunkX, chunkY)
    const entry = this.chunks.get(key)
    return entry ? entry.data : null
  }

  private getLocalTile(tileX: number, tileY: number) {
    const localX = ((tileX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
    const localY = ((tileY % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
    return { localX, localY }
  }

  private getLoadedBounds() {
    if (this.chunks.size === 0) return null
    let minChunkX = Infinity
    let minChunkY = Infinity
    let maxChunkX = -Infinity
    let maxChunkY = -Infinity
    for (const entry of this.chunks.values()) {
      minChunkX = Math.min(minChunkX, entry.data.chunkX)
      minChunkY = Math.min(minChunkY, entry.data.chunkY)
      maxChunkX = Math.max(maxChunkX, entry.data.chunkX)
      maxChunkY = Math.max(maxChunkY, entry.data.chunkY)
    }

    return {
      minTileX: minChunkX * CHUNK_SIZE,
      minTileY: minChunkY * CHUNK_SIZE,
      maxTileX: maxChunkX * CHUNK_SIZE + CHUNK_SIZE - 1,
      maxTileY: maxChunkY * CHUNK_SIZE + CHUNK_SIZE - 1
    }
  }

  private updateWorldSize() {
    const bounds = this.getLoadedBounds()
    if (!bounds) {
      this.worldWidth = 0
      this.worldHeight = 0
      return
    }
    this.worldWidth = (bounds.maxTileX - bounds.minTileX + 1) * TILE_SIZE
    this.worldHeight = (bounds.maxTileY - bounds.minTileY + 1) * TILE_SIZE
  }
}
