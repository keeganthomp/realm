import EasyStar from 'easystarjs'
import type { TilePosition } from '@realm/shared'

export class Pathfinding {
  private easystar: EasyStar.js
  private grid: number[][]

  constructor(collisionGrid: number[][]) {
    this.grid = collisionGrid
    this.easystar = new EasyStar.js()

    // Set up the grid
    this.easystar.setGrid(this.grid)

    // 0 = walkable, 1 = blocked
    this.easystar.setAcceptableTiles([0])

    // Enable diagonal movement
    this.easystar.enableDiagonals()

    // Disable corner cutting (can't walk through diagonal walls)
    this.easystar.disableCornerCutting()

    // Use synchronous calculation for immediate results
    this.easystar.enableSync()
  }

  findPath(startX: number, startY: number, endX: number, endY: number): TilePosition[] | null {
    let result: TilePosition[] | null = null

    this.easystar.findPath(startX, startY, endX, endY, (path) => {
      if (path) {
        // Convert to our TilePosition format, skip the starting position
        result = path.slice(1).map((p) => ({
          tileX: p.x,
          tileY: p.y
        }))
      }
    })

    this.easystar.calculate()

    return result
  }

  updateGrid(collisionGrid: number[][]) {
    this.grid = collisionGrid
    this.easystar.setGrid(this.grid)
  }
}
