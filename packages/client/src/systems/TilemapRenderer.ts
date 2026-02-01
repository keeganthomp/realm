import { Container, Graphics } from 'pixi.js'
import { TILE_SIZE, TileType, WALKABLE_TILES } from '@realm/shared'

// Tile colors
const TILE_COLORS: Record<TileType, number> = {
  [TileType.GRASS]: 0x4a7c23,
  [TileType.WATER]: 0x3d85c6,
  [TileType.SAND]: 0xc9b458,
  [TileType.STONE]: 0x808080,
  [TileType.TREE]: 0x4a7c23, // Trees are now objects, show grass under them
  [TileType.WALL]: 0x4a4a4a
}

// Map dimensions in tiles
const MAP_WIDTH = 40
const MAP_HEIGHT = 30

export class TilemapRenderer {
  public container: Container
  public worldWidth: number
  public worldHeight: number

  private tiles: TileType[][] = []
  private tileGraphics: Graphics

  constructor() {
    this.container = new Container()
    this.tileGraphics = new Graphics()
    this.worldWidth = MAP_WIDTH * TILE_SIZE
    this.worldHeight = MAP_HEIGHT * TILE_SIZE
  }

  async init() {
    this.generateTestMap()
    this.renderTiles()
    this.container.addChild(this.tileGraphics)
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

  private renderTiles() {
    this.tileGraphics.clear()

    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tileType = this.tiles[y][x]
        const color = TILE_COLORS[tileType]

        const px = x * TILE_SIZE
        const py = y * TILE_SIZE

        // Draw base tile
        this.tileGraphics.rect(px, py, TILE_SIZE, TILE_SIZE)
        this.tileGraphics.fill({ color })

        // Subtle grid
        this.tileGraphics.rect(px, py, TILE_SIZE, TILE_SIZE)
        this.tileGraphics.stroke({ color: 0x000000, alpha: 0.08, width: 1 })

        // Water detail
        if (tileType === TileType.WATER) {
          this.tileGraphics.rect(px + 4, py + 8, 10, 2)
          this.tileGraphics.rect(px + 18, py + 16, 10, 2)
          this.tileGraphics.fill({ color: 0x5a9fd4 })
        }

        // Stone detail
        if (tileType === TileType.STONE) {
          this.tileGraphics.circle(px + 8, py + 12, 4)
          this.tileGraphics.circle(px + 20, py + 8, 3)
          this.tileGraphics.circle(px + 24, py + 20, 5)
          this.tileGraphics.fill({ color: 0x6a6a6a })
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

  getTileAt(tileX: number, tileY: number): TileType | null {
    if (tileX < 0 || tileX >= MAP_WIDTH || tileY < 0 || tileY >= MAP_HEIGHT) {
      return null
    }
    return this.tiles[tileY][tileX]
  }
}
