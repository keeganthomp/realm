import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  LinesMesh,
  Vector3,
  Mesh
} from '@babylonjs/core'
import { CHUNK_SIZE } from '@realm/shared'
import { LEVEL_H, TILE_THICK } from '../systems/TilemapRenderer'

export class GridOverlay {
  private scene: Scene
  private gridLines: LinesMesh | null = null
  private chunkBorder: LinesMesh | null = null
  private hoverTile: Mesh | null = null
  private visible = false
  private currentChunkX = 0
  private currentChunkY = 0
  private getHeight: (tileX: number, tileY: number) => number

  constructor(scene: Scene, getHeight: (tileX: number, tileY: number) => number) {
    this.scene = scene
    this.getHeight = getHeight
    this.createHoverTile()
  }

  private createHoverTile() {
    this.hoverTile = MeshBuilder.CreateBox('editorHoverTile', {
      width: 1.02,
      height: 0.02,
      depth: 1.02
    }, this.scene)

    const mat = new StandardMaterial('editorHoverMat', this.scene)
    mat.diffuseColor = new Color3(0.72, 0.53, 0.04) // Gold
    mat.emissiveColor = new Color3(0.36, 0.26, 0.02)
    mat.specularColor = Color3.Black()
    mat.alpha = 0.6
    this.hoverTile.material = mat
    this.hoverTile.isPickable = false
    this.hoverTile.isVisible = false
  }

  setChunk(chunkX: number, chunkY: number) {
    if (this.currentChunkX === chunkX && this.currentChunkY === chunkY) return

    this.currentChunkX = chunkX
    this.currentChunkY = chunkY

    if (this.visible) {
      this.rebuildGrid()
    }
  }

  setVisible(visible: boolean) {
    this.visible = visible

    if (visible) {
      this.rebuildGrid()
    } else {
      this.dispose()
    }

    if (this.hoverTile) {
      this.hoverTile.isVisible = false
    }
  }

  setHoverTile(tileX: number, tileY: number) {
    if (!this.visible || !this.hoverTile) return

    const height = this.getHeight(tileX, tileY) * LEVEL_H + TILE_THICK + 0.02
    this.hoverTile.position.set(tileX + 0.5, height, tileY + 0.5)
    this.hoverTile.isVisible = true
  }

  clearHoverTile() {
    if (this.hoverTile) {
      this.hoverTile.isVisible = false
    }
  }

  private rebuildGrid() {
    this.gridLines?.dispose()
    this.chunkBorder?.dispose()

    const originX = this.currentChunkX * CHUNK_SIZE
    const originY = this.currentChunkY * CHUNK_SIZE

    // Create grid lines for the chunk
    const points: Vector3[][] = []

    // Vertical lines
    for (let x = 0; x <= CHUNK_SIZE; x++) {
      const linePoints: Vector3[] = []
      for (let y = 0; y <= CHUNK_SIZE; y++) {
        const tileX = originX + x - (x === CHUNK_SIZE ? 1 : 0)
        const tileY = originY + y - (y === CHUNK_SIZE ? 1 : 0)
        const height = this.getHeight(tileX, tileY) * LEVEL_H + TILE_THICK + 0.01
        linePoints.push(new Vector3(originX + x, height, originY + y))
      }
      points.push(linePoints)
    }

    // Horizontal lines
    for (let y = 0; y <= CHUNK_SIZE; y++) {
      const linePoints: Vector3[] = []
      for (let x = 0; x <= CHUNK_SIZE; x++) {
        const tileX = originX + x - (x === CHUNK_SIZE ? 1 : 0)
        const tileY = originY + y - (y === CHUNK_SIZE ? 1 : 0)
        const height = this.getHeight(tileX, tileY) * LEVEL_H + TILE_THICK + 0.01
        linePoints.push(new Vector3(originX + x, height, originY + y))
      }
      points.push(linePoints)
    }

    // Create line system for grid
    const allLines: Vector3[] = []
    for (const line of points) {
      for (let i = 0; i < line.length - 1; i++) {
        allLines.push(line[i], line[i + 1])
      }
    }

    if (allLines.length > 0) {
      this.gridLines = MeshBuilder.CreateLineSystem('editorGrid', {
        lines: points,
        updatable: false
      }, this.scene)
      this.gridLines.color = new Color3(0.3, 0.3, 0.3)
      this.gridLines.alpha = 0.5
      this.gridLines.isPickable = false
    }

    // Chunk border (thicker, colored)
    const borderHeight = this.getHeight(originX, originY) * LEVEL_H + TILE_THICK + 0.02
    const borderPoints = [
      new Vector3(originX, borderHeight, originY),
      new Vector3(originX + CHUNK_SIZE, borderHeight, originY),
      new Vector3(originX + CHUNK_SIZE, borderHeight, originY + CHUNK_SIZE),
      new Vector3(originX, borderHeight, originY + CHUNK_SIZE),
      new Vector3(originX, borderHeight, originY)
    ]

    this.chunkBorder = MeshBuilder.CreateLines('editorChunkBorder', {
      points: borderPoints,
      updatable: false
    }, this.scene)
    this.chunkBorder.color = new Color3(0.72, 0.53, 0.04) // Gold
    this.chunkBorder.isPickable = false
  }

  dispose() {
    this.gridLines?.dispose()
    this.gridLines = null
    this.chunkBorder?.dispose()
    this.chunkBorder = null
  }

  destroy() {
    this.dispose()
    this.hoverTile?.dispose()
    this.hoverTile = null
  }
}
