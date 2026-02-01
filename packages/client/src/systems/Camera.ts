import { ArcRotateCamera, Scene, Vector3, AbstractMesh, Mesh } from '@babylonjs/core'
import { TILE_SIZE } from '@realm/shared'
import type { Position } from '@realm/shared'

export class Camera {
  private screenWidth: number
  private screenHeight: number
  private worldWidth: number
  private worldHeight: number

  private arcCamera: ArcRotateCamera
  private scene: Scene
  private pickableMeshes: Set<AbstractMesh> | null = null
  private cachedTarget: Vector3 = new Vector3()

  // Current camera target in 3D world coordinates
  private targetX: number = 0
  private targetZ: number = 0
  private initialized: boolean = false

  // Smoothing factor (0 = instant, 1 = no movement)
  private smoothing: number = 0.12

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

    // First call: instant snap to target (no smoothing)
    if (!this.initialized) {
      this.targetX = target3DX
      this.targetZ = target3DZ
      this.initialized = true
    } else {
      // Smooth interpolation for subsequent updates
      this.targetX += (target3DX - this.targetX) * this.smoothing
      this.targetZ += (target3DZ - this.targetZ) * this.smoothing
    }

    // Update camera target
    this.cachedTarget.set(this.targetX, heightY, this.targetZ)
    this.arcCamera.setTarget(this.cachedTarget)
  }

  // Instantly snap camera to position (useful for teleports)
  snapTo(target: Position, heightY: number = 0) {
    const scale = 1 / TILE_SIZE
    this.targetX = target.x * scale
    this.targetZ = target.y * scale
    this.cachedTarget.set(this.targetX, heightY, this.targetZ)
    this.arcCamera.setTarget(this.cachedTarget)
  }

  resize(screenWidth: number, screenHeight: number) {
    this.screenWidth = screenWidth
    this.screenHeight = screenHeight
  }

  setWorldSize(worldWidth: number, worldHeight: number) {
    this.worldWidth = worldWidth
    this.worldHeight = worldHeight
  }

  setPickableMeshes(meshes: Mesh[]) {
    this.pickableMeshes = new Set(meshes)
  }

  // Get current camera zoom (radius)
  getZoom(): number {
    return this.arcCamera.radius
  }

  // Set camera zoom
  setZoom(radius: number) {
    this.arcCamera.radius = Math.max(
      this.arcCamera.lowerRadiusLimit ?? 8,
      Math.min(radius, this.arcCamera.upperRadiusLimit ?? 40)
    )
  }

  // Get current camera yaw (alpha) in radians
  getYaw(): number {
    return this.arcCamera.alpha
  }

  // Set camera yaw (alpha) in radians
  setYaw(alpha: number) {
    this.arcCamera.alpha = alpha
  }

  // Get current camera pitch (beta) in radians
  getPitch(): number {
    return this.arcCamera.beta
  }

  // Set camera pitch (beta) in radians
  setPitch(beta: number) {
    this.arcCamera.beta = Math.max(
      this.arcCamera.lowerBetaLimit ?? 0.4,
      Math.min(beta, this.arcCamera.upperBetaLimit ?? 1.2)
    )
  }

  screenToWorld(screenX: number, screenY: number): Position | null {
    const canvas = this.scene.getEngine().getRenderingCanvas()
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const canvasX = screenX - rect.left
    const canvasY = screenY - rect.top

    // Try picking against terrain meshes first
    const pick = this.scene.pick(
      canvasX,
      canvasY,
      (mesh) => {
        if (!mesh) return false
        // Allow picking if no filter set
        if (!this.pickableMeshes) return true
        // Check if mesh is directly in pickable set
        if (this.pickableMeshes.has(mesh)) return true
        // Check if this is an instance of a pickable mesh
        const sourceMesh = (mesh as { sourceMesh?: AbstractMesh }).sourceMesh
        if (sourceMesh && this.pickableMeshes.has(sourceMesh)) return true
        // Also check by metadata for terrain tiles
        if (mesh.metadata?.terrainType === 'tile') return true
        // Check source mesh metadata
        if (sourceMesh?.metadata?.terrainType === 'tile') return true
        return false
      },
      false,
      this.arcCamera
    )

    if (pick?.hit && pick.pickedPoint) {
      // Convert back to 2D game coordinates
      return {
        x: pick.pickedPoint.x * TILE_SIZE,
        y: pick.pickedPoint.z * TILE_SIZE // z in 3D maps to y in 2D
      }
    }

    // Fallback: raycast to ground plane (y=0) for editor usage
    const ray = this.scene.createPickingRay(canvasX, canvasY, null, this.arcCamera)
    if (ray && ray.direction.y !== 0) {
      const t = -ray.origin.y / ray.direction.y
      if (t > 0) {
        const groundX = ray.origin.x + ray.direction.x * t
        const groundZ = ray.origin.z + ray.direction.z * t
        return {
          x: groundX * TILE_SIZE,
          y: groundZ * TILE_SIZE
        }
      }
    }

    return null
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
