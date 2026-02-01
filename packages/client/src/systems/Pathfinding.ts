import type { TilePosition } from '@realm/shared'

export class Pathfinding {
  private grid: number[][]
  private heights: number[][] | null = null
  private offsetX: number = 0
  private offsetY: number = 0

  constructor(
    collisionGrid: number[][],
    heights?: number[][],
    offsetX: number = 0,
    offsetY: number = 0
  ) {
    this.grid = collisionGrid
    this.heights = heights ?? null
    this.offsetX = offsetX
    this.offsetY = offsetY
  }

  findPath(startX: number, startY: number, endX: number, endY: number): TilePosition[] | null {
    const localStartX = startX - this.offsetX
    const localStartY = startY - this.offsetY
    const localEndX = endX - this.offsetX
    const localEndY = endY - this.offsetY

    if (!this.isWalkable(localStartX, localStartY) || !this.isWalkable(localEndX, localEndY)) {
      return null
    }

    const nodes: { x: number; y: number; g: number; f: number; parent: number | null }[] = []
    const open: number[] = []
    const closed = new Set<string>()
    const indexByPos = new Map<string, number>()

    const startKey = `${localStartX},${localStartY}`
    const endKey = `${localEndX},${localEndY}`

    const h = (x: number, y: number) => {
      const dx = Math.abs(x - localEndX)
      const dy = Math.abs(y - localEndY)
      return Math.max(dx, dy)
    }

    nodes.push({
      x: localStartX,
      y: localStartY,
      g: 0,
      f: h(localStartX, localStartY),
      parent: null
    })
    open.push(0)
    indexByPos.set(startKey, 0)

    const directions = [
      { dx: 0, dy: -1, cost: 1 },
      { dx: 0, dy: 1, cost: 1 },
      { dx: 1, dy: 0, cost: 1 },
      { dx: -1, dy: 0, cost: 1 },
      { dx: 1, dy: -1, cost: 1.4 },
      { dx: -1, dy: -1, cost: 1.4 },
      { dx: 1, dy: 1, cost: 1.4 },
      { dx: -1, dy: 1, cost: 1.4 }
    ]

    while (open.length > 0) {
      // Find lowest f
      let bestOpenIdx = 0
      for (let i = 1; i < open.length; i++) {
        if (nodes[open[i]].f < nodes[open[bestOpenIdx]].f) {
          bestOpenIdx = i
        }
      }

      const currentIndex = open.splice(bestOpenIdx, 1)[0]
      const current = nodes[currentIndex]
      const currentKey = `${current.x},${current.y}`
      indexByPos.delete(currentKey)
      closed.add(currentKey)

      if (currentKey === endKey) {
        const path: TilePosition[] = []
        let nodeIndex: number | null = currentIndex
        while (nodeIndex !== null) {
          const node: (typeof nodes)[number] = nodes[nodeIndex]
          if (node.parent !== null) {
            path.push({ tileX: node.x + this.offsetX, tileY: node.y + this.offsetY })
          }
          nodeIndex = node.parent
        }
        path.reverse()
        return path
      }

      for (const dir of directions) {
        const nx = current.x + dir.dx
        const ny = current.y + dir.dy
        const nKey = `${nx},${ny}`

        if (closed.has(nKey)) continue
        if (!this.isWalkable(nx, ny)) continue
        if (!this.isHeightAllowed(current.x, current.y, nx, ny)) continue

        // Diagonal corner cutting check
        if (dir.dx !== 0 && dir.dy !== 0) {
          const adj1 = { x: current.x + dir.dx, y: current.y }
          const adj2 = { x: current.x, y: current.y + dir.dy }
          if (!this.isWalkable(adj1.x, adj1.y) || !this.isWalkable(adj2.x, adj2.y)) {
            continue
          }
          if (
            !this.isHeightAllowed(current.x, current.y, adj1.x, adj1.y) ||
            !this.isHeightAllowed(current.x, current.y, adj2.x, adj2.y)
          ) {
            continue
          }
        }

        const g = current.g + dir.cost
        const existingIndex = indexByPos.get(nKey)
        if (existingIndex !== undefined) {
          if (g < nodes[existingIndex].g) {
            nodes[existingIndex].g = g
            nodes[existingIndex].f = g + h(nx, ny)
            nodes[existingIndex].parent = currentIndex
          }
        } else {
          const nodeIndex = nodes.length
          nodes.push({ x: nx, y: ny, g, f: g + h(nx, ny), parent: currentIndex })
          open.push(nodeIndex)
          indexByPos.set(nKey, nodeIndex)
        }
      }
    }

    return null
  }

  updateGrid(
    collisionGrid: number[][],
    heights?: number[][],
    offsetX: number = 0,
    offsetY: number = 0
  ) {
    this.grid = collisionGrid
    if (heights) {
      this.heights = heights
    }
    this.offsetX = offsetX
    this.offsetY = offsetY
  }

  private isWalkable(x: number, y: number) {
    if (this.grid.length === 0 || this.grid[0].length === 0) {
      return false
    }
    if (y < 0 || y >= this.grid.length || x < 0 || x >= this.grid[0].length) {
      return false
    }
    return this.grid[y][x] === 0
  }

  private isHeightAllowed(x0: number, y0: number, x1: number, y1: number) {
    if (!this.heights) return true
    const h0 = this.heights[y0]?.[x0] ?? 0
    const h1 = this.heights[y1]?.[x1] ?? 0
    return Math.abs(h1 - h0) <= 1
  }
}
