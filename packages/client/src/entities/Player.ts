import {
  Scene,
  TransformNode,
  MeshBuilder,
  Mesh,
  AnimationGroup
} from '@babylonjs/core'
import '@babylonjs/loaders/glTF'
import { TextBlock } from '@babylonjs/gui'
import { Direction, getDirection, TILE_SIZE } from '@realm/shared'
import type { Position } from '@realm/shared'
import { SharedResources } from '../systems/SharedResources'
import { AssetManager } from '../systems/AssetManager'

const MOVE_SPEED = 3 // pixels per frame at 60fps
const MODEL_PATH = '/assets/models/'
const MODEL_FILE = 'player.glb'

export class Player {
  public position: Position
  public direction: Direction = Direction.DOWN
  public isMoving: boolean = false
  public isActioning: boolean = false

  private scene: Scene
  private node: TransformNode
  private modelLoaded: boolean = false
  private actionIndicators: Mesh[] = []
  private actionIndicatorTime: number = 0
  private cachedTileX: number = -1
  private cachedTileY: number = -1
  private cachedHeightY: number = 0

  // Animation
  private idleAnim: AnimationGroup | null = null
  private walkAnim: AnimationGroup | null = null
  private currentAnim: AnimationGroup | null = null

  private path: Position[] = []
  private pathIndex: number = 0 // Use index pointer instead of shift() for O(1) access
  private currentTarget: Position | null = null
  private onPathComplete?: () => void
  private actionTarget: Position | null = null
  private actionMode: 'skilling' | 'combat' | 'cooking' | 'chopping' | null = null
  private heightProvider: ((tileX: number, tileY: number) => number) | null = null

  private nameLabel: TextBlock | null = null

  constructor(startPosition: Position, scene: Scene) {
    this.position = { ...startPosition }
    this.scene = scene
    this.node = new TransformNode('player', scene)
  }

  async init() {
    await this.loadModel()
    this.createNameLabel()
    this.createActionIndicators()
    this.updateNodePosition()
  }

  private async loadModel() {
    try {
      // Use AssetManager for efficient model loading and sharing
      const assetManager = AssetManager.get()
      const result = await assetManager.instantiate(MODEL_PATH, MODEL_FILE, 'player')

      // Parent the instantiated model to our node
      result.rootNode.parent = this.node

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

      // Scale the model appropriately (adjust as needed for your model)
      this.node.scaling.setAll(1.0)

      this.modelLoaded = true
      console.log(
        `Player model loaded. Animations found: ${result.animationGroups.map((a) => a.name).join(', ')}`
      )
    } catch (error) {
      console.warn('Failed to load player model, using fallback:', error)
      this.createFallbackMeshes()
    }
  }

  private playAnimation(anim: AnimationGroup | null) {
    if (!anim || anim === this.currentAnim) return

    // Stop current animation
    if (this.currentAnim) {
      this.currentAnim.stop()
    }

    // Play new animation
    anim.start(true) // true = loop
    this.currentAnim = anim
  }

  private createFallbackMeshes() {
    const res = SharedResources.get()

    // Body - center at half height so bottom is at y=0 (ground level)
    const body = MeshBuilder.CreateCylinder(
      'playerBody',
      { height: 0.8, diameter: 0.4, tessellation: 8 },
      this.scene
    )
    body.material = res.playerBodyMaterial
    body.position.y = 0.4  // Half of 0.8 height, so bottom is at y=0
    body.parent = this.node

    // Head - positioned above body
    const head = MeshBuilder.CreateSphere('playerHead', { diameter: 0.35, segments: 8 }, this.scene)
    head.material = res.playerSkinMaterial
    head.position.y = 1.0  // Adjusted to maintain relative position to body
    head.parent = this.node

    this.node.scaling.setAll(1.5)
    this.modelLoaded = true
  }

  private createNameLabel() {
    const res = SharedResources.get()
    this.nameLabel = res.createLabel('player', 'You')
    this.nameLabel.fontSize = 14
    this.nameLabel.isVisible = true
    this.nameLabel.linkWithMesh(this.node)
    this.nameLabel.linkOffsetY = -72
  }

  private createActionIndicators() {
    const res = SharedResources.get()

    for (let i = 0; i < 3; i++) {
      const indicator = MeshBuilder.CreateSphere(
        `actionIndicator${i}`,
        { diameter: 0.08, segments: 6 },
        this.scene
      )
      indicator.material = res.actionIndicatorMaterial
      indicator.parent = this.node
      indicator.isVisible = false
      this.actionIndicators.push(indicator)
    }
  }

  private updateActionIndicators(delta: number) {
    if (!this.isActioning) {
      for (const indicator of this.actionIndicators) {
        indicator.isVisible = false
      }
      return
    }

    this.actionIndicatorTime += delta * 0.12
    const time = this.actionIndicatorTime
    for (let i = 0; i < this.actionIndicators.length; i++) {
      const angle = time + (i * Math.PI * 2) / 3
      const x = Math.cos(angle) * 0.5
      const z = Math.sin(angle) * 0.25
      this.actionIndicators[i].position.set(x, 0.75, z)
      this.actionIndicators[i].isVisible = true
    }
  }

  setPath(path: Position[], onComplete?: () => void) {
    this.path = path
    this.pathIndex = 0 // Reset index pointer
    this.currentTarget = this.path.length > 0 ? this.path[this.pathIndex++] : null
    this.isMoving = this.currentTarget !== null
    this.onPathComplete = onComplete

    // Switch to walk animation
    if (this.isMoving) {
      this.playAnimation(this.walkAnim)
    }
  }

  setHeightProvider(provider: (tileX: number, tileY: number) => number) {
    this.heightProvider = provider
    // Invalidate cache to force height recalculation with new provider
    this.cachedTileX = -1
    this.cachedTileY = -1
    this.updateNodePosition()
  }

  setActionTarget(target: Position | null) {
    this.actionTarget = target ? { ...target } : null
  }

  setActionMode(mode: 'skilling' | 'combat' | 'cooking' | 'chopping' | null) {
    this.actionMode = mode
  }

  setActioning(isActioning: boolean) {
    this.isActioning = isActioning
    if (!isActioning) {
      for (const indicator of this.actionIndicators) {
        indicator.isVisible = false
      }
    }
  }

  update(delta: number) {
    // Update action indicator animation
    if (this.isActioning) {
      this.updateActionIndicators(delta)
    }

    if (!this.currentTarget) {
      // Switch to idle when stopped
      if (this.isMoving) {
        this.isMoving = false
        this.playAnimation(this.idleAnim)
        // Call completion callback
        if (this.onPathComplete) {
          const callback = this.onPathComplete
          this.onPathComplete = undefined
          callback()
        }
      }
      this.updateActionFacing()
      return
    }

    const dx = this.currentTarget.x - this.position.x
    const dy = this.currentTarget.y - this.position.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    const newDirection = getDirection(this.position, this.currentTarget)
    if (newDirection !== this.direction) {
      this.direction = newDirection
    }
    this.updateFacingFromVector(dx, dy)

    if (distance < MOVE_SPEED * delta) {
      this.position.x = this.currentTarget.x
      this.position.y = this.currentTarget.y

      // Use index pointer instead of shift() for O(1) access
      this.currentTarget = this.pathIndex < this.path.length ? this.path[this.pathIndex++] : null
      if (!this.currentTarget) {
        this.isMoving = false
        this.playAnimation(this.idleAnim)
        // Call completion callback
        if (this.onPathComplete) {
          const callback = this.onPathComplete
          this.onPathComplete = undefined
          callback()
        }
      }
    } else {
      const moveX = (dx / distance) * MOVE_SPEED * delta
      const moveY = (dy / distance) * MOVE_SPEED * delta
      this.position.x += moveX
      this.position.y += moveY
      this.isMoving = true
    }

    this.updateActionFacing()
    this.updateNodePosition()
  }

  private updateActionFacing() {
    if (!this.isActioning || this.isMoving || !this.actionTarget) {
      return
    }
    const dx = this.actionTarget.x - this.position.x
    const dy = this.actionTarget.y - this.position.y
    this.updateFacingFromVector(dx, dy)
  }

  private updateFacingFromVector(dx: number, dy: number) {
    if (dx === 0 && dy === 0) return
    const ang = Math.atan2(dx, dy)
    const step = Math.PI / 4
    // Add Math.PI offset since model faces -Z by default
    this.node.rotation.y = Math.round(ang / step) * step + Math.PI
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
    SharedResources.get().removeControl(this.nameLabel)
  }
}
