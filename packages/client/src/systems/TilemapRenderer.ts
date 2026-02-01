import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  DynamicTexture,
  Color3,
  Mesh
} from '@babylonjs/core'
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

// Texture resolution multiplier (pixels per tile on texture)
const TEXTURE_PIXELS_PER_TILE = 16

export class TilemapRenderer {
  public worldWidth: number
  public worldHeight: number

  private scene: Scene
  private tiles: TileType[][] = []
  private groundMesh!: Mesh
  private texture!: DynamicTexture

  constructor(scene: Scene) {
    this.scene = scene
    this.worldWidth = MAP_WIDTH * TILE_SIZE
    this.worldHeight = MAP_HEIGHT * TILE_SIZE
  }

  async init() {
    this.generateTestMap()
    this.createGroundMesh()
    this.renderTilesToTexture()
  }

  private generateTestMap() {
    // Initialize with grass
    this.tiles = Array(MAP_HEIGHT)
      .fill(null)
      .map(() => Array(MAP_WIDTH).fill(TileType.GRASS))

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

  private createGroundMesh() {
    // Ground size in 3D units (1 tile = 1 unit)
    const groundWidth = MAP_WIDTH
    const groundHeight = MAP_HEIGHT

    // Create the ground plane
    this.groundMesh = MeshBuilder.CreateGround(
      'ground',
      {
        width: groundWidth,
        height: groundHeight,
        subdivisions: 1
      },
      this.scene
    )

    // Position ground so (0,0) tile corner is at world origin
    // The ground mesh is centered, so we offset it
    this.groundMesh.position.x = groundWidth / 2
    this.groundMesh.position.z = groundHeight / 2

    // Create dynamic texture
    const textureWidth = MAP_WIDTH * TEXTURE_PIXELS_PER_TILE
    const textureHeight = MAP_HEIGHT * TEXTURE_PIXELS_PER_TILE
    this.texture = new DynamicTexture('groundTexture', { width: textureWidth, height: textureHeight }, this.scene, false)

    // Create material with the texture
    const groundMat = new StandardMaterial('groundMat', this.scene)
    groundMat.diffuseTexture = this.texture
    groundMat.specularColor = Color3.Black()
    this.groundMesh.material = groundMat
  }

  private renderTilesToTexture() {
    const ctx = this.texture.getContext()
    const ppt = TEXTURE_PIXELS_PER_TILE // pixels per tile

    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tileType = this.tiles[y][x]
        const color = TILE_COLORS[tileType]

        // Convert to CSS color
        const r = Math.floor(color.r * 255)
        const g = Math.floor(color.g * 255)
        const b = Math.floor(color.b * 255)

        // Pixel position (flip Y for texture coords)
        const px = x * ppt
        const py = (MAP_HEIGHT - 1 - y) * ppt

        // Draw base tile
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
        ctx.fillRect(px, py, ppt, ppt)

        // Subtle grid lines
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)'
        ctx.lineWidth = 1
        ctx.strokeRect(px, py, ppt, ppt)

        // Water detail
        if (tileType === TileType.WATER) {
          ctx.fillStyle = 'rgba(90, 159, 212, 0.5)' // #5a9fd4
          ctx.fillRect(px + 2, py + 4, 5, 1)
          ctx.fillRect(px + 9, py + 8, 5, 1)
        }

        // Stone detail
        if (tileType === TileType.STONE) {
          ctx.fillStyle = 'rgba(106, 106, 106, 0.8)' // #6a6a6a
          ctx.beginPath()
          ctx.arc(px + 4, py + 6, 2, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.arc(px + 10, py + 4, 1.5, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.arc(px + 12, py + 10, 2.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    this.texture.update()
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

  getTileAt(tileX: number, tileY: number): TileType | null {
    if (tileX < 0 || tileX >= MAP_WIDTH || tileY < 0 || tileY >= MAP_HEIGHT) {
      return null
    }
    return this.tiles[tileY][tileX]
  }
}
