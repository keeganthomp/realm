import type { TileType } from '@realm/shared'
import type { Command } from './Command'

export interface TileChange {
  tileX: number
  tileY: number
  oldType: TileType
  newType: TileType
}

export class TileCommand implements Command {
  description: string
  private changes: TileChange[]
  private applyTile: (x: number, y: number, type: TileType) => void

  constructor(
    changes: TileChange[],
    applyTile: (x: number, y: number, type: TileType) => void
  ) {
    this.changes = changes
    this.applyTile = applyTile
    this.description = `Paint ${changes.length} tile(s)`
  }

  execute() {
    for (const change of this.changes) {
      this.applyTile(change.tileX, change.tileY, change.newType)
    }
  }

  undo() {
    for (const change of this.changes) {
      this.applyTile(change.tileX, change.tileY, change.oldType)
    }
  }
}
