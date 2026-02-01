import type { TileType } from '@realm/shared'
import type { Tool, PointerEvent } from './Tool'
import type { EditorState } from '../EditorState'
import { TileCommand, type TileChange } from '../history/TileCommand'
import type { CommandHistory } from '../history/CommandHistory'

export interface TileBrushContext {
  state: EditorState
  history: CommandHistory
  getTile: (x: number, y: number) => TileType | null
  setTile: (x: number, y: number, type: TileType) => void
}

export class TileBrush implements Tool {
  name = 'Tile Brush'
  cursor = 'crosshair'

  private context: TileBrushContext
  private painting = false
  private pendingChanges: Map<string, TileChange> = new Map()
  private lastPaintTile: { x: number; y: number } | null = null

  constructor(context: TileBrushContext) {
    this.context = context
  }

  onPointerDown(event: PointerEvent) {
    if (event.button !== 0) return
    console.log(`[TileBrush] Painting at (${event.tileX}, ${event.tileY})`)
    this.painting = true
    this.pendingChanges.clear()
    this.paintAt(event.tileX, event.tileY)
    this.lastPaintTile = { x: event.tileX, y: event.tileY }
  }

  onPointerMove(event: PointerEvent) {
    if (!this.painting) return

    // Interpolate between last and current to avoid gaps when moving fast
    if (this.lastPaintTile) {
      this.interpolatePaint(this.lastPaintTile.x, this.lastPaintTile.y, event.tileX, event.tileY)
    } else {
      this.paintAt(event.tileX, event.tileY)
    }
    this.lastPaintTile = { x: event.tileX, y: event.tileY }
  }

  onPointerUp(_event: PointerEvent) {
    if (!this.painting) return
    this.painting = false
    this.lastPaintTile = null

    // Commit all pending changes as a single command
    if (this.pendingChanges.size > 0) {
      const changes = Array.from(this.pendingChanges.values())
      const command = new TileCommand(changes, (x, y, type) => {
        this.context.setTile(x, y, type)
      })
      // Don't re-execute since we already applied the changes visually
      this.context.history['undoStack'].push(command)
      this.context.history['redoStack'] = []
      this.context.history['notifyChange']()
      this.context.state.setModified(true)
      this.pendingChanges.clear()
    }
  }

  private interpolatePaint(x0: number, y0: number, x1: number, y1: number) {
    const dx = Math.abs(x1 - x0)
    const dy = Math.abs(y1 - y0)
    const sx = x0 < x1 ? 1 : -1
    const sy = y0 < y1 ? 1 : -1
    let err = dx - dy
    let x = x0
    let y = y0

    while (true) {
      this.paintAt(x, y)
      if (x === x1 && y === y1) break
      const e2 = 2 * err
      if (e2 > -dy) {
        err -= dy
        x += sx
      }
      if (e2 < dx) {
        err += dx
        y += sy
      }
    }
  }

  private paintAt(centerX: number, centerY: number) {
    const { brushSize, selectedTileType } = this.context.state.get()
    const radius = Math.floor(brushSize / 2)

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        // For brush size > 1, use circular brush
        if (brushSize > 1) {
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist > radius + 0.5) continue
        }

        const x = centerX + dx
        const y = centerY + dy
        const key = `${x},${y}`

        const currentType = this.context.getTile(x, y)
        if (currentType === null) {
          console.log(`[TileBrush] Tile at (${x}, ${y}) is outside editable area (null)`)
          continue
        }
        if (currentType === selectedTileType) continue

        // Track original value only once per stroke
        if (!this.pendingChanges.has(key)) {
          this.pendingChanges.set(key, {
            tileX: x,
            tileY: y,
            oldType: currentType,
            newType: selectedTileType
          })
        } else {
          // Update the new type if painting over same tile with different selection
          const existing = this.pendingChanges.get(key)!
          existing.newType = selectedTileType
        }

        // Apply immediately for visual feedback
        this.context.setTile(x, y, selectedTileType)
      }
    }
  }
}
