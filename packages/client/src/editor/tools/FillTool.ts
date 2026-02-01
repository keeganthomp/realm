import type { TileType } from '@realm/shared'
import type { Tool, PointerEvent } from './Tool'
import type { EditorState } from '../EditorState'
import { TileCommand, type TileChange } from '../history/TileCommand'
import type { CommandHistory } from '../history/CommandHistory'

const MAX_FILL = 10000 // Prevent infinite fills

export interface FillToolContext {
  state: EditorState
  history: CommandHistory
  getTile: (x: number, y: number) => TileType | null
  setTile: (x: number, y: number, type: TileType) => void
  getChunkBounds: () => { minX: number; minY: number; maxX: number; maxY: number } | null
}

export class FillTool implements Tool {
  name = 'Fill Tool'
  cursor = 'cell'

  private context: FillToolContext

  constructor(context: FillToolContext) {
    this.context = context
  }

  onPointerDown(event: PointerEvent) {
    if (event.button !== 0) return
    this.fill(event.tileX, event.tileY)
  }

  onPointerMove(_event: PointerEvent) {
    // No drag behavior for fill
  }

  onPointerUp(_event: PointerEvent) {
    // No drag behavior for fill
  }

  private fill(startX: number, startY: number) {
    const { selectedTileType } = this.context.state.get()
    const targetType = this.context.getTile(startX, startY)

    if (targetType === null || targetType === selectedTileType) return

    const bounds = this.context.getChunkBounds()
    if (!bounds) return

    const changes: TileChange[] = []
    const visited = new Set<string>()
    const queue: Array<{ x: number; y: number }> = [{ x: startX, y: startY }]

    while (queue.length > 0 && changes.length < MAX_FILL) {
      const { x, y } = queue.shift()!
      const key = `${x},${y}`

      if (visited.has(key)) continue
      visited.add(key)

      // Check bounds
      if (x < bounds.minX || x > bounds.maxX || y < bounds.minY || y > bounds.maxY) continue

      const currentType = this.context.getTile(x, y)
      if (currentType !== targetType) continue

      changes.push({
        tileX: x,
        tileY: y,
        oldType: currentType,
        newType: selectedTileType
      })

      // Apply immediately for visual feedback
      this.context.setTile(x, y, selectedTileType)

      // Add neighbors (4-directional)
      queue.push({ x: x + 1, y })
      queue.push({ x: x - 1, y })
      queue.push({ x, y: y + 1 })
      queue.push({ x, y: y - 1 })
    }

    if (changes.length > 0) {
      const command = new TileCommand(changes, (x, y, type) => {
        this.context.setTile(x, y, type)
      })
      this.context.history['undoStack'].push(command)
      this.context.history['redoStack'] = []
      this.context.history['notifyChange']()
      this.context.state.setModified(true)
    }
  }
}
