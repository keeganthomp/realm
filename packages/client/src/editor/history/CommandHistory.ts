import type { Command } from './Command'

const MAX_HISTORY = 100

export class CommandHistory {
  private undoStack: Command[] = []
  private redoStack: Command[] = []
  private onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void

  setOnHistoryChange(callback: (canUndo: boolean, canRedo: boolean) => void) {
    this.onHistoryChange = callback
    this.notifyChange()
  }

  private notifyChange() {
    this.onHistoryChange?.(this.canUndo(), this.canRedo())
  }

  execute(command: Command) {
    command.execute()
    this.undoStack.push(command)
    this.redoStack = []

    // Limit history size
    if (this.undoStack.length > MAX_HISTORY) {
      this.undoStack.shift()
    }

    this.notifyChange()
  }

  undo(): boolean {
    const command = this.undoStack.pop()
    if (!command) return false

    command.undo()
    this.redoStack.push(command)
    this.notifyChange()
    return true
  }

  redo(): boolean {
    const command = this.redoStack.pop()
    if (!command) return false

    command.execute()
    this.undoStack.push(command)
    this.notifyChange()
    return true
  }

  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  clear() {
    this.undoStack = []
    this.redoStack = []
    this.notifyChange()
  }

  getLastDescription(): string | null {
    const last = this.undoStack[this.undoStack.length - 1]
    return last?.description ?? null
  }
}
