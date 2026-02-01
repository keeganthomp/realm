import type { Command } from './Command'

export interface HeightChange {
  tileX: number
  tileY: number
  oldHeight: number
  newHeight: number
}

export class HeightCommand implements Command {
  description: string
  private changes: HeightChange[]
  private applyHeight: (x: number, y: number, height: number) => void

  constructor(
    changes: HeightChange[],
    applyHeight: (x: number, y: number, height: number) => void
  ) {
    this.changes = changes
    this.applyHeight = applyHeight
    const avgDelta = changes.reduce((sum, c) => sum + (c.newHeight - c.oldHeight), 0) / changes.length
    this.description = avgDelta > 0 ? `Raise ${changes.length} tile(s)` : `Lower ${changes.length} tile(s)`
  }

  execute() {
    for (const change of this.changes) {
      this.applyHeight(change.tileX, change.tileY, change.newHeight)
    }
  }

  undo() {
    for (const change of this.changes) {
      this.applyHeight(change.tileX, change.tileY, change.oldHeight)
    }
  }
}
