import {
  Scene,
  TransformNode,
  MeshBuilder,
  StandardMaterial,
  Color3,
  AnimationGroup,
  SceneLoader
} from '@babylonjs/core'
import '@babylonjs/loaders/glTF'
import { AdvancedDynamicTexture, TextBlock } from '@babylonjs/gui'
import { Direction, TILE_SIZE } from '@realm/shared'
import type { Position } from '@realm/shared'

const INTERPOLATION_SPEED = 0.15
const MODEL_PATH = '/assets/models/'
const MODEL_FILE = 'player.glb'

export class RemotePlayer {
  public position: Position
  public direction: Direction = Direction.DOWN

  private scene: Scene
  private node: TransformNode
  private modelLoaded: boolean = false
  private cachedTileX: number = -1
  private cachedTileY: number = -1
  private cachedHeightY: number = 0

  // Animation
  private idleAnim: AnimationGroup | null = null
  private walkAnim: AnimationGroup | null = null
  private currentAnim: AnimationGroup | null = null
  private isMoving: boolean = false

  private targetPosition: Position
  private playerName: string
  private heightProvider: ((tileX: number, tileY: number) => number) | null = null

  private guiTexture: AdvancedDynamicTexture | null = null
  private nameLabel: TextBlock | null = null

  constructor(startPosition: Position, name: string, scene: Scene) {
    this.position = { ...startPosition }
    this.targetPosition = { ...startPosition }
    this.playerName = name
    this.scene = scene
    this.node = new TransformNode('remotePlayer_' + name, scene)
  }

  async init() {
    await this.loadModel()
    this.createNameLabel()
    this.updateNodePosition()
  }

  private async loadModel() {
    try {
      const result = await SceneLoader.ImportMeshAsync('', MODEL_PATH, MODEL_FILE, this.scene)

      // Parent all meshes to our node
      for (const mesh of result.meshes) {
        if (!mesh.parent) {
          mesh.parent = this.node
        }
      }

      // Find animations - look for common naming patterns
      for (const animGroup of result.animationGroups) {
        const name = animGroup.name.toLowerCase()
        if (name.includes('idle') || name.includes('standing')) {
          this.idleAnim = animGroup
        } else if (name.includes('walk') || name.includes('run') || name.includes('locomotion')) {
          this.walkAnim = animGroup
        }
      }

      // If no specific animations found, use first two if available
      if (!this.idleAnim && result.animationGroups.length > 0) {
        this.idleAnim = result.animationGroups[0]
      }
      if (!this.walkAnim && result.animationGroups.length > 1) {
        this.walkAnim = result.animationGroups[1]
      }

      // Stop all animations initially
      for (const animGroup of result.animationGroups) {
        animGroup.stop()
      }

      // Start idle animation
      this.playAnimation(this.idleAnim)

      // Scale the model appropriately
      this.node.scaling.setAll(1.0)

      this.modelLoaded = true
    } catch (error) {
      console.warn('Failed to load remote player model, using fallback:', error)
      this.createFallbackMeshes()
    }
  }

  private playAnimation(anim: AnimationGroup | null) {
    if (!anim || anim === this.currentAnim) return

    if (this.currentAnim) {
      this.currentAnim.stop()
    }

    anim.start(true)
    this.currentAnim = anim
  }

  private createFallbackMeshes() {
    const bodyMat = new StandardMaterial('remoteBodyMat_' + this.playerName, this.scene)
    bodyMat.diffuseColor = new Color3(0.15, 0.15, 0.16)
    bodyMat.specularColor = Color3.Black()

    const skinMat = new StandardMaterial('remoteSkinMat_' + this.playerName, this.scene)
    skinMat.diffuseColor = new Color3(0.96, 0.82, 0.66)
    skinMat.specularColor = Color3.Black()

    // Body
    const body = MeshBuilder.CreateCylinder(
      'remoteBody_' + this.playerName,
      { height: 0.8, diameter: 0.4, tessellation: 8 },
      this.scene
    )
    body.material = bodyMat
    body.position.y = 0.6
    body.parent = this.node

    // Head
    const head = MeshBuilder.CreateSphere(
      'remoteHead_' + this.playerName,
      { diameter: 0.35, segments: 8 },
      this.scene
    )
    head.material = skinMat
    head.position.y = 1.2
    head.parent = this.node

    this.node.scaling.setAll(1.5)
    this.modelLoaded = true
  }

  setHeightProvider(provider: (tileX: number, tileY: number) => number) {
    this.heightProvider = provider
    this.updateNodePosition()
  }

  private createNameLabel() {
    this.guiTexture = AdvancedDynamicTexture.CreateFullscreenUI(
      'remotePlayerUI_' + this.playerName,
      true,
      this.scene
    )

    this.nameLabel = new TextBlock('remoteName_' + this.playerName, this.playerName)
    this.nameLabel.color = 'white'
    this.nameLabel.fontSize = 14
    this.nameLabel.fontFamily = 'Inter, sans-serif'
    this.nameLabel.outlineWidth = 2
    this.nameLabel.outlineColor = 'black'

    this.guiTexture.addControl(this.nameLabel)
    this.nameLabel.linkWithMesh(this.node)
    this.nameLabel.linkOffsetY = -72
  }

  setTargetPosition(position: Position, direction: Direction) {
    this.targetPosition = { ...position }
    if (direction !== this.direction) {
      this.direction = direction
      this.updateFacing()
    }
  }

  update(_delta: number) {
    // Interpolate towards target position
    const dx = this.targetPosition.x - this.position.x
    const dy = this.targetPosition.y - this.position.y

    const distSq = dx * dx + dy * dy
    const wasMoving = this.isMoving
    this.isMoving = distSq > 1 // threshold for "moving"

    // Switch animations based on movement
    if (this.isMoving && !wasMoving) {
      this.playAnimation(this.walkAnim)
    } else if (!this.isMoving && wasMoving) {
      this.playAnimation(this.idleAnim)
    }

    if (distSq < 0.0001) {
      return
    }

    this.position.x += dx * INTERPOLATION_SPEED
    this.position.y += dy * INTERPOLATION_SPEED
    this.updateNodePosition()
  }

  private updateFacing() {
    // Rotate character to face direction
    // Add Math.PI offset since model faces -Z by default
    switch (this.direction) {
      case Direction.DOWN:
        this.node.rotation.y = Math.PI
        break
      case Direction.UP:
        this.node.rotation.y = 0
        break
      case Direction.LEFT:
        this.node.rotation.y = -Math.PI / 2
        break
      case Direction.RIGHT:
        this.node.rotation.y = Math.PI / 2
        break
    }
  }

  private updateNodePosition() {
    const scale = 1 / TILE_SIZE
    const tileX = Math.floor(this.position.x / TILE_SIZE)
    const tileY = Math.floor(this.position.y / TILE_SIZE)
    if (tileX !== this.cachedTileX || tileY !== this.cachedTileY) {
      this.cachedHeightY = this.heightProvider ? this.heightProvider(tileX, tileY) : 0
      this.cachedTileX = tileX
      this.cachedTileY = tileY
    }
    this.node.position.set(this.position.x * scale, this.cachedHeightY, this.position.y * scale)
  }

  dispose() {
    this.node.dispose()
    if (this.guiTexture) {
      this.guiTexture.dispose()
    }
  }
}
