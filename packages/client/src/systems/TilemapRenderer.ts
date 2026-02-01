import { Scene, MeshBuilder, StandardMaterial, Color3, Mesh, Vector3 } from '@babylonjs/core'
import { TILE_SIZE, TileType, WALKABLE_TILES } from '@realm/shared'

// Tile colors (RGB normalized 0-1)
const TILE_COLORS: Record<TileType, { r: number; g: number; b: number }> = {
  [TileType.GRASS]: { r: 0.29, g: 0.49, b: 0.14 }, // #4a7c23
  [TileType.WATER]: { r: 0.24, g: 0.52, b: 0.78 }, // #3d85c6
  [TileType.SAND]: { r: 0.79, g: 0.71, b: 0.35 }, // #c9b458
  [TileType.STONE]: { r: 0.5, g: 0.5, b: 0.5 }, // #808080
  [TileType.TREE]: { r: 0.29, g: 0.49, b: 0.14 }, // Trees show grass underneath
  [TileType.WALL]: { r: 0.29, g: 0.29, b: 0.29 } // #4a4a4a
}

// Map dimensions in tiles
const MAP_WIDTH = 40
const MAP_HEIGHT = 30

export const LEVEL_H = 0.25
export const TILE_THICK = 0.08
const CLIFF_THICK = 0.08

export class TilemapRenderer {
  public worldWidth: number
  public worldHeight: number

  private scene: Scene
  private tiles: TileType[][] = []
  private heights: number[][] = []
  private terrainMeshes: Mesh[] = []

  constructor(scene: Scene) {
    this.scene = scene
    this.worldWidth = MAP_WIDTH * TILE_SIZE
    this.worldHeight = MAP_HEIGHT * TILE_SIZE
  }

  async init() {
    this.generateTestMap()
    this.buildTerrainMeshes()
  }

  private generateTestMap() {
    // Initialize with grass
    this.tiles = Array(MAP_HEIGHT)
      .fill(null)
      .map(() => Array(MAP_WIDTH).fill(TileType.GRASS))

    this.heights = Array(MAP_HEIGHT)
      .fill(null)
      .map(() => Array(MAP_WIDTH).fill(0))

    // Example plateau
    for (let y = 14; y < 22; y++) {
      for (let x = 18; x < 30; x++) {
        this.heights[y][x] = 1
      }
    }
    // higher bump
    this.heights[18][24] = 2

    // Water border
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        if (x < 2 || x >= MAP_WIDTH - 2 || y < 2 || y >= MAP_HEIGHT - 2) {
          this.tiles[y][x] = TileType.WATER
        }
        // Sand near border
        else if (x < 4 || x >= MAP_WIDTH - 4 || y < 4 || y >= MAP_HEIGHT - 4) {
          if (Math.random() < 0.5) {
            this.tiles[y][x] = TileType.SAND
          }
        }
        // Random stone patches
        else if (Math.random() < 0.03) {
          this.tiles[y][x] = TileType.STONE
        }
      }
    }

    // Create a pond in the middle
    const centerX = Math.floor(MAP_WIDTH / 2)
    const centerY = Math.floor(MAP_HEIGHT / 2)
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 3.5) {
          this.tiles[centerY + dy][centerX + dx] = TileType.WATER
        } else if (dist < 4.5) {
          this.tiles[centerY + dy][centerX + dx] = TileType.SAND
        }
      }
    }

    // Clear spawn area
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const tx = 10 + dx
        const ty = 10 + dy
        if (tx >= 0 && tx < MAP_WIDTH && ty >= 0 && ty < MAP_HEIGHT) {
          this.tiles[ty][tx] = TileType.GRASS
        }
      }
    }

    // Clear tree areas (where server will spawn trees)
    const treeAreas = [
      { x: 5, y: 5 },
      { x: 6, y: 5 },
      { x: 7, y: 5 },
      { x: 5, y: 6 },
      { x: 7, y: 6 },
      { x: 25, y: 8 },
      { x: 26, y: 8 },
      { x: 27, y: 8 },
      { x: 25, y: 9 },
      { x: 27, y: 9 },
      { x: 30, y: 15 },
      { x: 31, y: 15 },
      { x: 32, y: 15 }
    ]
    for (const loc of treeAreas) {
      if (loc.x >= 0 && loc.x < MAP_WIDTH && loc.y >= 0 && loc.y < MAP_HEIGHT) {
        this.tiles[loc.y][loc.x] = TileType.GRASS
      }
    }

    // Clear fire area
    this.tiles[12][12] = TileType.STONE
  }

  private buildTerrainMeshes() {
    this.terrainMeshes.forEach((mesh) => mesh.dispose())
    this.terrainMeshes = []

    const tileBaseMeshes: Map<TileType, Mesh> = new Map()

    for (const tileType of Object.values(TileType).filter(
      (v) => typeof v === 'number'
    ) as number[]) {
      const mesh = MeshBuilder.CreateBox(
        `tile_${tileType}`,
        { width: 1, height: TILE_THICK, depth: 1 },
        this.scene
      )
      const color = TILE_COLORS[tileType as TileType]
      const mat = new StandardMaterial(`tileMat_${tileType}`, this.scene)
      mat.diffuseColor = new Color3(color.r, color.g, color.b)
      mat.specularColor = Color3.Black()
      mesh.material = mat
      mesh.isPickable = true
      mesh.isVisible = false
      mesh.metadata = { terrainType: 'tile' }
      tileBaseMeshes.set(tileType as TileType, mesh)
      this.terrainMeshes.push(mesh)
    }

    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tileType = this.tiles[y][x]
        const height = this.heights[y][x]
        const mesh = tileBaseMeshes.get(tileType)
        if (!mesh) continue

        const instance = mesh.createInstance(`tile_${tileType}_${x}_${y}`)
        instance.isPickable = true
        instance.position = new Vector3(x + 0.5, height * LEVEL_H + TILE_THICK / 2, y + 0.5)
      }
    }

    this.buildCliffMeshes()
  }

  private buildCliffMeshes() {
    const cliffMat = new StandardMaterial('cliffMat', this.scene)
    cliffMat.diffuseColor = new Color3(0.35, 0.35, 0.35)
    cliffMat.specularColor = Color3.Black()

    const faceMesh = MeshBuilder.CreateBox(
      'cliffFace',
      { width: 1, height: 1, depth: CLIFF_THICK },
      this.scene
    )
    faceMesh.material = cliffMat
    faceMesh.isPickable = false
    faceMesh.isVisible = false
    this.terrainMeshes.push(faceMesh)

    const addFace = (
      posX: number,
      posY: number,
      posZ: number,
      scaleX: number,
      scaleY: number,
      scaleZ: number
    ) => {
      const instance = faceMesh.createInstance(`cliff_${posX}_${posZ}_${posY}`)
      instance.position = new Vector3(posX, posY, posZ)
      instance.scaling = new Vector3(scaleX, scaleY, scaleZ)
    }

    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const h0 = this.heights[y][x]
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
            nx < 0 || nx >= MAP_WIDTH || ny < 0 || ny >= MAP_HEIGHT ? 0 : this.heights[ny][nx]
          const diff = h0 - h1
          if (diff <= 0) continue

          const faceHeight = diff * LEVEL_H
          const bottomY = h1 * LEVEL_H
          const centerY = bottomY + faceHeight / 2

          if (n.edge === 'north') {
            addFace(x + 0.5, centerY, y + 0, 1, faceHeight, CLIFF_THICK)
          } else if (n.edge === 'south') {
            addFace(x + 0.5, centerY, y + 1, 1, faceHeight, CLIFF_THICK)
          } else if (n.edge === 'west') {
            addFace(x + 0, centerY, y + 0.5, CLIFF_THICK, faceHeight, 1)
          } else if (n.edge === 'east') {
            addFace(x + 1, centerY, y + 0.5, CLIFF_THICK, faceHeight, 1)
          }
        }
      }
    }
  }

  isWalkable(tileX: number, tileY: number): boolean {
    if (tileX < 0 || tileX >= MAP_WIDTH || tileY < 0 || tileY >= MAP_HEIGHT) {
      return false
    }
    const tileType = this.tiles[tileY][tileX]
    return WALKABLE_TILES.has(tileType)
  }

  getCollisionGrid(): number[][] {
    return this.tiles.map((row) => row.map((tile) => (WALKABLE_TILES.has(tile) ? 0 : 1)))
  }

  getHeight(tileX: number, tileY: number): number {
    if (tileX < 0 || tileX >= MAP_WIDTH || tileY < 0 || tileY >= MAP_HEIGHT) {
      return 0
    }
    return this.heights[tileY][tileX]
  }

  getHeights(): number[][] {
    return this.heights.map((row) => [...row])
  }

  getTerrainMeshes(): Mesh[] {
    return this.terrainMeshes
  }

  getTileAt(tileX: number, tileY: number): TileType | null {
    if (tileX < 0 || tileX >= MAP_WIDTH || tileY < 0 || tileY >= MAP_HEIGHT) {
      return null
    }
    return this.tiles[tileY][tileX]
  }
}
