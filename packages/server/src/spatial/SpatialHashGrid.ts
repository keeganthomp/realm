/**
 * SpatialHashGrid - O(1) spatial partitioning for proximity queries
 *
 * Used to optimize combat tick aggro checks from O(n*m) to O(n)
 * where n = number of NPCs and m = number of players.
 *
 * Instead of checking every NPC against every player,
 * we use a grid to quickly find nearby entities.
 */

export interface SpatialEntity {
  x: number
  y: number
}

export class SpatialHashGrid<T extends SpatialEntity> {
  private cellSize: number
  private cells: Map<string, Set<T>> = new Map()
  private entityCells: Map<T, string> = new Map()

  /**
   * @param cellSize Size of each cell in world units (tiles)
   */
  constructor(cellSize: number = 5) {
    this.cellSize = cellSize
  }

  private getCellKey(x: number, y: number): string {
    const cellX = Math.floor(x / this.cellSize)
    const cellY = Math.floor(y / this.cellSize)
    return `${cellX},${cellY}`
  }

  /**
   * Insert an entity into the grid
   */
  insert(entity: T): void {
    const key = this.getCellKey(entity.x, entity.y)

    // If entity was in a different cell, remove from old cell
    const oldKey = this.entityCells.get(entity)
    if (oldKey && oldKey !== key) {
      const oldCell = this.cells.get(oldKey)
      oldCell?.delete(entity)
      if (oldCell?.size === 0) {
        this.cells.delete(oldKey)
      }
    }

    // Add to new cell
    let cell = this.cells.get(key)
    if (!cell) {
      cell = new Set()
      this.cells.set(key, cell)
    }
    cell.add(entity)
    this.entityCells.set(entity, key)
  }

  /**
   * Remove an entity from the grid
   */
  remove(entity: T): void {
    const key = this.entityCells.get(entity)
    if (!key) return

    const cell = this.cells.get(key)
    cell?.delete(entity)
    if (cell?.size === 0) {
      this.cells.delete(key)
    }
    this.entityCells.delete(entity)
  }

  /**
   * Update an entity's position in the grid
   * More efficient than remove + insert for moving entities
   */
  update(entity: T): void {
    this.insert(entity)
  }

  /**
   * Query all entities within a radius of a point
   * Returns entities that may be within the radius (uses cell-based bounds)
   */
  queryRadius(x: number, y: number, radius: number): T[] {
    const results: T[] = []
    const radiusSq = radius * radius

    // Calculate cell range to search
    const minCellX = Math.floor((x - radius) / this.cellSize)
    const maxCellX = Math.floor((x + radius) / this.cellSize)
    const minCellY = Math.floor((y - radius) / this.cellSize)
    const maxCellY = Math.floor((y + radius) / this.cellSize)

    // Search all cells in range
    for (let cellX = minCellX; cellX <= maxCellX; cellX++) {
      for (let cellY = minCellY; cellY <= maxCellY; cellY++) {
        const key = `${cellX},${cellY}`
        const cell = this.cells.get(key)
        if (!cell) continue

        // Check each entity in the cell
        for (const entity of cell) {
          const dx = entity.x - x
          const dy = entity.y - y
          if (dx * dx + dy * dy <= radiusSq) {
            results.push(entity)
          }
        }
      }
    }

    return results
  }

  /**
   * Query entities within a rectangular region
   */
  queryRect(minX: number, minY: number, maxX: number, maxY: number): T[] {
    const results: T[] = []

    // Calculate cell range
    const minCellX = Math.floor(minX / this.cellSize)
    const maxCellX = Math.floor(maxX / this.cellSize)
    const minCellY = Math.floor(minY / this.cellSize)
    const maxCellY = Math.floor(maxY / this.cellSize)

    for (let cellX = minCellX; cellX <= maxCellX; cellX++) {
      for (let cellY = minCellY; cellY <= maxCellY; cellY++) {
        const key = `${cellX},${cellY}`
        const cell = this.cells.get(key)
        if (!cell) continue

        for (const entity of cell) {
          if (entity.x >= minX && entity.x <= maxX && entity.y >= minY && entity.y <= maxY) {
            results.push(entity)
          }
        }
      }
    }

    return results
  }

  /**
   * Get all entities in the grid
   */
  getAll(): T[] {
    const results: T[] = []
    for (const cell of this.cells.values()) {
      for (const entity of cell) {
        results.push(entity)
      }
    }
    return results
  }

  /**
   * Clear all entities from the grid
   */
  clear(): void {
    this.cells.clear()
    this.entityCells.clear()
  }

  /**
   * Get the number of entities in the grid
   */
  get size(): number {
    return this.entityCells.size
  }
}
