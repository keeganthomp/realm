/* eslint-disable no-undef */
import { Scene } from '@babylonjs/core'
import {
  TileType,
  CHUNK_SIZE,
  editorChunkToRuntimeChunk,
  WorldObjectType
} from '@realm/shared'
import { EditorState, type EditorTool } from './EditorState'
import { CommandHistory } from './history/CommandHistory'
import { GridOverlay } from './GridOverlay'
import { ChunkManager } from './ChunkManager'
import { TileBrush } from './tools/TileBrush'
import { HeightBrush } from './tools/HeightBrush'
import { FillTool } from './tools/FillTool'
import { PropPlacer } from './tools/PropPlacer'
import type { Tool, PointerEvent } from './tools/Tool'
import type { ObjectPlacement } from './history/ObjectCommand'

export interface EditorCallbacks {
  onTileChange: (worldX: number, worldY: number, tileType: TileType) => void
  onHeightChange: (worldX: number, worldY: number, height: number) => void
  onObjectAdd: (id: string, objectType: WorldObjectType, worldX: number, worldY: number) => void
  onObjectRemove: (id: string) => void
  onChunkApply: (chunk: import('@realm/shared').ChunkData) => void
  getHeight: (tileX: number, tileY: number) => number
  getTile: (tileX: number, tileY: number) => TileType | null
  getPlayerTile?: () => { tileX: number; tileY: number }
}

export class Editor {
  public readonly state: EditorState
  public readonly history: CommandHistory

  private scene: Scene
  private callbacks: EditorCallbacks
  private gridOverlay: GridOverlay
  private chunkManager: ChunkManager
  private tools: Map<EditorTool, Tool> = new Map()
  private activeTool: Tool | null = null
  private objectIdCounter = 0
  private editorObjects: Map<string, ObjectPlacement> = new Map()

  constructor(scene: Scene, callbacks: EditorCallbacks) {
    this.scene = scene
    this.callbacks = callbacks

    this.state = new EditorState()
    this.history = new CommandHistory()
    this.chunkManager = new ChunkManager()

    this.gridOverlay = new GridOverlay(scene, (tileX, tileY) => {
      return callbacks.getHeight(tileX, tileY)
    })

    this.history.setOnHistoryChange((canUndo, canRedo) => {
      this.state.updateHistoryState(canUndo, canRedo)
    })

    this.initTools()

    // Subscribe to state changes for tool switching
    this.state.subscribe((s) => {
      if (s.active) {
        this.activateTool(s.tool)
      }
    })
  }

  private initTools() {
    // Tile brush
    this.tools.set('tile', new TileBrush({
      state: this.state,
      history: this.history,
      getTile: (x, y) => this.getTileWorld(x, y),
      setTile: (x, y, type) => this.setTileWorld(x, y, type)
    }))

    // Height brush
    this.tools.set('height', new HeightBrush({
      state: this.state,
      history: this.history,
      getHeight: (x, y) => this.getHeightWorld(x, y),
      setHeight: (x, y, h) => this.setHeightWorld(x, y, h)
    }))

    // Fill tool
    this.tools.set('fill', new FillTool({
      state: this.state,
      history: this.history,
      getTile: (x, y) => this.getTileWorld(x, y),
      setTile: (x, y, type) => this.setTileWorld(x, y, type),
      getChunkBounds: () => this.getChunkBounds()
    }))

    // Prop placer
    this.tools.set('prop', new PropPlacer({
      state: this.state,
      history: this.history,
      getObjectAt: (x, y) => this.getObjectAtWorld(x, y),
      addObject: (p) => this.addObjectWorld(p),
      removeObject: (id) => this.removeObjectWorld(id),
      generateObjectId: () => this.generateObjectId()
    }))
  }

  private activateTool(toolType: EditorTool) {
    const tool = this.tools.get(toolType)
    console.log(`[Editor] Activating tool: ${toolType}, found: ${!!tool}`)
    if (tool === this.activeTool) return

    this.activeTool?.onDeactivate?.()
    this.activeTool = tool ?? null
    this.activeTool?.onActivate?.()
  }

  // Convert world tile coords to local chunk coords
  private worldToLocal(worldX: number, worldY: number): { localX: number; localY: number } | null {
    const chunk = this.chunkManager.getCurrentChunk()
    if (!chunk) return null

    const localX = worldX - chunk.chunkX * CHUNK_SIZE
    const localY = worldY - chunk.chunkY * CHUNK_SIZE

    if (localX < 0 || localX >= CHUNK_SIZE || localY < 0 || localY >= CHUNK_SIZE) {
      return null
    }

    return { localX, localY }
  }

  // World-coordinate accessors that delegate to ChunkManager
  private getTileWorld(worldX: number, worldY: number): TileType | null {
    const local = this.worldToLocal(worldX, worldY)
    if (!local) {
      console.log(`[Editor] getTileWorld(${worldX}, ${worldY}) - outside current chunk bounds`)
      return null
    }
    return this.chunkManager.getTile(local.localX, local.localY)
  }

  private setTileWorld(worldX: number, worldY: number, tileType: TileType) {
    const local = this.worldToLocal(worldX, worldY)
    if (!local) return

    this.chunkManager.setTile(local.localX, local.localY, tileType)
    this.callbacks.onTileChange(worldX, worldY, tileType)
  }

  private getHeightWorld(worldX: number, worldY: number): number {
    const local = this.worldToLocal(worldX, worldY)
    if (!local) return 0
    return this.chunkManager.getHeight(local.localX, local.localY)
  }

  private setHeightWorld(worldX: number, worldY: number, height: number) {
    const local = this.worldToLocal(worldX, worldY)
    if (!local) return

    this.chunkManager.setHeight(local.localX, local.localY, height)
    this.callbacks.onHeightChange(worldX, worldY, height)
  }

  private getChunkBounds(): { minX: number; minY: number; maxX: number; maxY: number } | null {
    const chunk = this.chunkManager.getCurrentChunk()
    if (!chunk) return null

    return {
      minX: chunk.chunkX * CHUNK_SIZE,
      minY: chunk.chunkY * CHUNK_SIZE,
      maxX: chunk.chunkX * CHUNK_SIZE + CHUNK_SIZE - 1,
      maxY: chunk.chunkY * CHUNK_SIZE + CHUNK_SIZE - 1
    }
  }

  private getObjectAtWorld(worldX: number, worldY: number): ObjectPlacement | null {
    for (const obj of this.editorObjects.values()) {
      if (obj.tileX === worldX && obj.tileY === worldY) {
        return obj
      }
    }
    return null
  }

  private addObjectWorld(placement: ObjectPlacement) {
    this.editorObjects.set(placement.id, placement)

    const local = this.worldToLocal(placement.tileX, placement.tileY)
    if (local) {
      this.chunkManager.addProp({
        id: placement.id,
        objectType: placement.objectType,
        localX: local.localX,
        localY: local.localY
      })
    }

    this.callbacks.onObjectAdd(
      placement.id,
      placement.objectType,
      placement.tileX,
      placement.tileY
    )
  }

  private removeObjectWorld(id: string) {
    this.editorObjects.delete(id)
    this.chunkManager.removeProp(id)
    this.callbacks.onObjectRemove(id)
  }

  private generateObjectId(): string {
    return `editor_obj_${Date.now()}_${this.objectIdCounter++}`
  }

  // Public API
  toggle() {
    this.state.toggle()
    const isActive = this.state.get().active

    if (isActive) {
      // Enter editor mode
      this.loadCurrentViewChunk()
      this.gridOverlay.setVisible(true)
    } else {
      // Exit editor mode
      this.gridOverlay.setVisible(false)
    }
  }

  isActive(): boolean {
    return this.state.get().active
  }

  loadCurrentViewChunk() {
    // Load chunk at player's current position
    if (this.callbacks.getPlayerTile) {
      const playerTile = this.callbacks.getPlayerTile()
      const chunkX = Math.floor(playerTile.tileX / CHUNK_SIZE)
      const chunkY = Math.floor(playerTile.tileY / CHUNK_SIZE)
      this.loadChunk(chunkX, chunkY)
    } else {
      // Fallback to chunk 0,0
      this.loadChunk(0, 0)
    }
  }

  loadChunk(chunkX: number, chunkY: number) {
    console.log(`[Editor] Loading chunk (${chunkX}, ${chunkY})`)
    const chunk = this.chunkManager.loadChunk(chunkX, chunkY)
    this.state.setCurrentChunk(chunkX, chunkY)
    this.state.setModified(false)
    this.gridOverlay.setChunk(chunkX, chunkY)
    this.history.clear()

    // Load props into editorObjects
    this.editorObjects.clear()
    for (const prop of chunk.props) {
      const worldX = chunkX * CHUNK_SIZE + prop.localX
      const worldY = chunkY * CHUNK_SIZE + prop.localY
      this.editorObjects.set(prop.id, {
        id: prop.id,
        objectType: prop.objectType,
        tileX: worldX,
        tileY: worldY
      })
    }

    // Apply chunk to game renderer
    const runtimeChunk = editorChunkToRuntimeChunk(chunk)
    console.log(`[Editor] Applying runtime chunk to renderer`)
    this.callbacks.onChunkApply(runtimeChunk)
  }

  // Input handlers - called by Game when editor is active
  handlePointerDown(tileX: number, tileY: number, button: number, shiftKey: boolean, ctrlKey: boolean) {
    console.log(`[Editor] Pointer down at tile (${tileX}, ${tileY}), button=${button}, tool=${this.state.get().tool}`)
    if (!this.activeTool) {
      console.warn('[Editor] No active tool!')
      return
    }

    const event: PointerEvent = { tileX, tileY, button, shiftKey, ctrlKey }
    this.activeTool.onPointerDown(event)
  }

  handlePointerMove(tileX: number, tileY: number, button: number, shiftKey: boolean, ctrlKey: boolean) {
    this.gridOverlay.setHoverTile(tileX, tileY)

    if (!this.activeTool) return

    const event: PointerEvent = { tileX, tileY, button, shiftKey, ctrlKey }
    this.activeTool.onPointerMove(event)
  }

  handlePointerUp(tileX: number, tileY: number, button: number, shiftKey: boolean, ctrlKey: boolean) {
    if (!this.activeTool) return

    const event: PointerEvent = { tileX, tileY, button, shiftKey, ctrlKey }
    this.activeTool.onPointerUp(event)
  }

  // Keyboard shortcuts
  handleKeyDown(key: string, ctrlKey: boolean, shiftKey: boolean): boolean {
    // Undo: Ctrl+Z
    if (ctrlKey && key.toLowerCase() === 'z' && !shiftKey) {
      this.history.undo()
      return true
    }

    // Redo: Ctrl+Shift+Z or Ctrl+Y
    if (ctrlKey && ((key.toLowerCase() === 'z' && shiftKey) || key.toLowerCase() === 'y')) {
      this.history.redo()
      return true
    }

    // Tool shortcuts
    if (!ctrlKey && !shiftKey) {
      switch (key.toLowerCase()) {
        case 'b':
          this.state.setTool('tile')
          return true
        case 'h':
          this.state.setTool('height')
          return true
        case 'g':
          this.state.setTool('fill')
          return true
        case 'p':
          this.state.setTool('prop')
          return true
        case '[':
          this.state.setBrushSize(this.state.get().brushSize - 1)
          return true
        case ']':
          this.state.setBrushSize(this.state.get().brushSize + 1)
          return true
      }
    }

    // Save: Ctrl+S
    if (ctrlKey && key.toLowerCase() === 's') {
      this.save()
      return true
    }

    return false
  }

  // Save/Load
  save(): boolean {
    const success = this.chunkManager.saveToLocalStorage()
    if (success) {
      this.state.setModified(false)
    }
    return success
  }

  download() {
    this.chunkManager.downloadChunk()
  }

  async importFile(file: File): Promise<boolean> {
    const chunk = await this.chunkManager.importFromFile(file)
    if (chunk) {
      this.state.setCurrentChunk(chunk.chunkX, chunk.chunkY)
      this.state.setModified(false)
      this.gridOverlay.setChunk(chunk.chunkX, chunk.chunkY)
      this.history.clear()

      // Apply to renderer
      const runtimeChunk = editorChunkToRuntimeChunk(chunk)
      this.callbacks.onChunkApply(runtimeChunk)
      return true
    }
    return false
  }

  getCurrentCursor(): string {
    return this.activeTool?.cursor ?? 'default'
  }

  destroy() {
    this.gridOverlay.destroy()
  }
}
