import { ArcRotateCamera, Scene, Vector3, AbstractMesh, Mesh } from '@babylonjs/core'
import { TILE_SIZE } from '@realm/shared'
import type { Position } from '@realm/shared'

export class Camera {
  private screenWidth: number
  private screenHeight: number
  private worldWidth: number
  private worldHeight: number
  private smoothing: number = 0.1

  private arcCamera: ArcRotateCamera
  private scene: Scene
  private pickableMeshes: Set<AbstractMesh> | null = null
  private panOffsetX: number = 0
  private panOffsetZ: number = 0

  // Current camera target in 3D world coordinates
  private targetX: number = 0
  private targetZ: number = 0

  constructor(
    screenWidth: number,
    screenHeight: number,
    worldWidth: number,
    worldHeight: number,
    arcCamera: ArcRotateCamera,
    scene: Scene
  ) {
    this.screenWidth = screenWidth
    this.screenHeight = screenHeight
    this.worldWidth = worldWidth
    this.worldHeight = worldHeight
    this.arcCamera = arcCamera
    this.scene = scene
  }

  follow(target: Position, heightY: number = 0) {
    // Convert 2D position to 3D coordinates
    const scale = 1 / TILE_SIZE
    const target3DX = target.x * scale
    const target3DZ = target.y * scale

    // Smooth interpolation
    this.targetX += (target3DX - this.targetX) * this.smoothing
    this.targetZ += (target3DZ - this.targetZ) * this.smoothing

    // Apply pan offset
    this.targetX += this.panOffsetX
    this.targetZ += this.panOffsetZ

    // Clamp to world bounds (in 3D units)
    const worldWidth3D = this.worldWidth / TILE_SIZE
    const worldHeight3D = this.worldHeight / TILE_SIZE

    // Camera view bounds depend on ortho size
    const orthoWidth = (this.arcCamera.orthoRight ?? 0) - (this.arcCamera.orthoLeft ?? 0)
    const orthoHeight = (this.arcCamera.orthoTop ?? 0) - (this.arcCamera.orthoBottom ?? 0)

    // Adjust clamping for isometric view
    const halfViewX = orthoWidth / 2
    const halfViewZ = orthoHeight / 2

    this.targetX = Math.max(halfViewX, Math.min(this.targetX, worldWidth3D - halfViewX))
    this.targetZ = Math.max(halfViewZ, Math.min(this.targetZ, worldHeight3D - halfViewZ))

    // Handle case where world is smaller than view
    if (worldWidth3D < orthoWidth) {
      this.targetX = worldWidth3D / 2
    }
    if (worldHeight3D < orthoHeight) {
      this.targetZ = worldHeight3D / 2
    }

    // Update camera target
    this.arcCamera.setTarget(new Vector3(this.targetX, heightY, this.targetZ))
  }

  resize(screenWidth: number, screenHeight: number) {
    this.screenWidth = screenWidth
    this.screenHeight = screenHeight
  }

  setPickableMeshes(meshes: Mesh[]) {
    this.pickableMeshes = new Set(meshes)
  }

  nudgePan(dx: number, dz: number) {
    this.panOffsetX += dx
    this.panOffsetZ += dz
  }

  screenToWorld(screenX: number, screenY: number): Position | null {
    const canvas = this.scene.getEngine().getRenderingCanvas()
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const canvasX = screenX - rect.left
    const canvasY = screenY - rect.top

    const pick = this.scene.pick(
      canvasX,
      canvasY,
      (mesh) => {
        if (!mesh) return false
        if (!this.pickableMeshes) return true
        if (this.pickableMeshes.has(mesh)) return true
        const sourceMesh = (mesh as { sourceMesh?: AbstractMesh }).sourceMesh
        return sourceMesh ? this.pickableMeshes.has(sourceMesh) : false
      },
      false,
      this.arcCamera
    )

    if (!pick?.hit || !pick.pickedPoint) {
      return null
    }

    // Convert back to 2D game coordinates
    return {
      x: pick.pickedPoint.x * TILE_SIZE,
      y: pick.pickedPoint.z * TILE_SIZE // z in 3D maps to y in 2D
    }
  }

  worldToScreen(worldX: number, worldY: number): Position {
    // Convert 2D game position to 3D
    const scale = 1 / TILE_SIZE
    const pos3D = new Vector3(worldX * scale, 0, worldY * scale)

    // Project to screen coordinates
    const projected = Vector3.Project(
      pos3D,
      this.scene.getTransformMatrix(),
      this.arcCamera.getViewMatrix(),
      this.arcCamera.viewport.toGlobal(
        this.scene.getEngine().getRenderWidth(),
        this.scene.getEngine().getRenderHeight()
      )
    )

    return {
      x: projected.x,
      y: projected.y
    }
  }
}
