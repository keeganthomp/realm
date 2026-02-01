import { TileType, WorldObjectType } from '@realm/shared'

export type EditorTool = 'tile' | 'height' | 'fill' | 'prop' | 'spawn' | 'select'

export interface EditorStateData {
  active: boolean
  tool: EditorTool
  selectedTileType: TileType
  selectedPropType: WorldObjectType | null
  brushSize: number
  heightDelta: number // +1 or -1 for raise/lower
  showGrid: boolean
  canUndo: boolean
  canRedo: boolean
  currentChunkX: number
  currentChunkY: number
  isModified: boolean
}

type Listener = (state: EditorStateData) => void

export class EditorState {
  private state: EditorStateData = {
    active: false,
    tool: 'tile',
    selectedTileType: TileType.GRASS,
    selectedPropType: null,
    brushSize: 1,
    heightDelta: 1,
    showGrid: true,
    canUndo: false,
    canRedo: false,
    currentChunkX: 0,
    currentChunkY: 0,
    isModified: false
  }

  private listeners: Set<Listener> = new Set()

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    listener(this.state)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.state)
    }
  }

  get(): EditorStateData {
    return { ...this.state }
  }

  setActive(active: boolean) {
    if (this.state.active !== active) {
      this.state.active = active
      this.notify()
    }
  }

  toggle() {
    this.setActive(!this.state.active)
  }

  setTool(tool: EditorTool) {
    if (this.state.tool !== tool) {
      this.state.tool = tool
      this.notify()
    }
  }

  setSelectedTileType(type: TileType) {
    if (this.state.selectedTileType !== type) {
      this.state.selectedTileType = type
      this.notify()
    }
  }

  setSelectedPropType(type: WorldObjectType | null) {
    if (this.state.selectedPropType !== type) {
      this.state.selectedPropType = type
      this.notify()
    }
  }

  setBrushSize(size: number) {
    const clamped = Math.max(1, Math.min(5, size))
    if (this.state.brushSize !== clamped) {
      this.state.brushSize = clamped
      this.notify()
    }
  }

  setHeightDelta(delta: number) {
    const clamped = delta > 0 ? 1 : -1
    if (this.state.heightDelta !== clamped) {
      this.state.heightDelta = clamped
      this.notify()
    }
  }

  setShowGrid(show: boolean) {
    if (this.state.showGrid !== show) {
      this.state.showGrid = show
      this.notify()
    }
  }

  updateHistoryState(canUndo: boolean, canRedo: boolean) {
    if (this.state.canUndo !== canUndo || this.state.canRedo !== canRedo) {
      this.state.canUndo = canUndo
      this.state.canRedo = canRedo
      this.notify()
    }
  }

  setCurrentChunk(chunkX: number, chunkY: number) {
    if (this.state.currentChunkX !== chunkX || this.state.currentChunkY !== chunkY) {
      this.state.currentChunkX = chunkX
      this.state.currentChunkY = chunkY
      this.notify()
    }
  }

  setModified(modified: boolean) {
    if (this.state.isModified !== modified) {
      this.state.isModified = modified
      this.notify()
    }
  }
}
