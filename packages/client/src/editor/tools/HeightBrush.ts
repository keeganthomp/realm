import type { Tool, PointerEvent } from './Tool'
import type { EditorState } from '../EditorState'
import { HeightCommand, type HeightChange } from '../history/HeightCommand'
import type { CommandHistory } from '../history/CommandHistory'

const MAX_HEIGHT = 5
const MIN_HEIGHT = 0

export interface HeightBrushContext {
  state: EditorState
  history: CommandHistory
  getHeight: (x: number, y: number) => number
  setHeight: (x: number, y: number, height: number) => void
}

export class HeightBrush implements Tool {
  name = 'Height Brush'
  cursor = 'ns-resize'

  private context: HeightBrushContext
  private painting = false
  private pendingChanges: Map<string, HeightChange> = new Map()
  private lastPaintTile: { x: number; y: number } | null = null

  constructor(context: HeightBrushContext) {
    this.context = context
  }

  onPointerDown(event: PointerEvent) {
    if (event.button !== 0 && event.button !== 2) return
    this.painting = true
    this.pendingChanges.clear()

    // Right click = lower, left click = raise
    const delta = event.button === 2 ? -1 : this.context.state.get().heightDelta
    this.paintAt(event.tileX, event.tileY, delta)
    this.lastPaintTile = { x: event.tileX, y: event.tileY }
  }

  onPointerMove(event: PointerEvent) {
    if (!this.painting) return

    const delta = this.context.state.get().heightDelta
    if (this.lastPaintTile) {
      this.interpolatePaint(this.lastPaintTile.x, this.lastPaintTile.y, event.tileX, event.tileY, delta)
    } else {
      this.paintAt(event.tileX, event.tileY, delta)
    }
    this.lastPaintTile = { x: event.tileX, y: event.tileY }
  }

  onPointerUp(_event: PointerEvent) {
    if (!this.painting) return
    this.painting = false
    this.lastPaintTile = null

    if (this.pendingChanges.size > 0) {
      const changes = Array.from(this.pendingChanges.values())
      const command = new HeightCommand(changes, (x, y, height) => {
        this.context.setHeight(x, y, height)
      })
      this.context.history['undoStack'].push(command)
      this.context.history['redoStack'] = []
      this.context.history['notifyChange']()
      this.context.state.setModified(true)
      this.pendingChanges.clear()
    }
  }

  private interpolatePaint(x0: number, y0: number, x1: number, y1: number, delta: number) {
    const dx = Math.abs(x1 - x0)
    const dy = Math.abs(y1 - y0)
    const sx = x0 < x1 ? 1 : -1
    const sy = y0 < y1 ? 1 : -1
    let err = dx - dy
    let x = x0
    let y = y0

    while (true) {
      this.paintAt(x, y, delta)
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

  private paintAt(centerX: number, centerY: number, delta: number) {
    const { brushSize } = this.context.state.get()
    const radius = Math.floor(brushSize / 2)

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (brushSize > 1) {
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist > radius + 0.5) continue
        }

        const x = centerX + dx
        const y = centerY + dy
        const key = `${x},${y}`

        const currentHeight = this.context.getHeight(x, y)
        const newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, currentHeight + delta))

        if (newHeight === currentHeight) continue

        if (!this.pendingChanges.has(key)) {
          this.pendingChanges.set(key, {
            tileX: x,
            tileY: y,
            oldHeight: currentHeight,
            newHeight: newHeight
          })
        } else {
          const existing = this.pendingChanges.get(key)!
          existing.newHeight = newHeight
        }

        this.context.setHeight(x, y, newHeight)
      }
    }
  }
}
