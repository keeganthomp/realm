import {
  Scene,
  TransformNode,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
  AnimationGroup,
  SceneLoader
} from '@babylonjs/core'
import '@babylonjs/loaders/glTF'
import { AdvancedDynamicTexture, TextBlock } from '@babylonjs/gui'
import { Direction, getDirection, TILE_SIZE } from '@realm/shared'
import type { Position } from '@realm/shared'

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
  private currentTarget: Position | null = null
  private onPathComplete?: () => void
  private actionTarget: Position | null = null
  private actionMode: 'skilling' | 'combat' | 'cooking' | 'chopping' | null = null
  private heightProvider: ((tileX: number, tileY: number) => number) | null = null

  private guiTexture: AdvancedDynamicTexture | null = null
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
    // Simple fallback if model doesn't load
    const bodyMat = new StandardMaterial('playerBodyMat', this.scene)
    bodyMat.diffuseColor = new Color3(0.15, 0.15, 0.16)
    bodyMat.specularColor = Color3.Black()

    const skinMat = new StandardMaterial('playerSkinMat', this.scene)
    skinMat.diffuseColor = new Color3(0.96, 0.82, 0.66)
    skinMat.specularColor = Color3.Black()

    // Body
    const body = MeshBuilder.CreateCylinder(
      'playerBody',
      { height: 0.8, diameter: 0.4, tessellation: 8 },
      this.scene
    )
    body.material = bodyMat
    body.position.y = 0.6
    body.parent = this.node

    // Head
    const head = MeshBuilder.CreateSphere('playerHead', { diameter: 0.35, segments: 8 }, this.scene)
    head.material = skinMat
    head.position.y = 1.2
    head.parent = this.node

    this.node.scaling.setAll(1.5)
    this.modelLoaded = true
  }

  private createNameLabel() {
    this.guiTexture = AdvancedDynamicTexture.CreateFullscreenUI('playerUI', true, this.scene)

    this.nameLabel = new TextBlock('playerName', 'You')
    this.nameLabel.color = 'white'
    this.nameLabel.fontSize = 14
    this.nameLabel.fontFamily = 'Inter, sans-serif'
    this.nameLabel.outlineWidth = 2
    this.nameLabel.outlineColor = 'black'

    this.guiTexture.addControl(this.nameLabel)
    this.nameLabel.linkWithMesh(this.node)
    this.nameLabel.linkOffsetY = -72
  }

  private createActionIndicators() {
    const indicatorMat = new StandardMaterial('actionIndicatorMat', this.scene)
    indicatorMat.diffuseColor = new Color3(0.72, 0.53, 0.04)
    indicatorMat.specularColor = Color3.Black()
    indicatorMat.alpha = 0.8

    for (let i = 0; i < 3; i++) {
      const indicator = MeshBuilder.CreateSphere(
        `actionIndicator${i}`,
        { diameter: 0.08, segments: 6 },
        this.scene
      )
      indicator.material = indicatorMat
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
    this.currentTarget = this.path.shift() || null
    this.isMoving = this.currentTarget !== null
    this.onPathComplete = onComplete

    // Switch to walk animation
    if (this.isMoving) {
      this.playAnimation(this.walkAnim)
    }
  }

  setHeightProvider(provider: (tileX: number, tileY: number) => number) {
    this.heightProvider = provider
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

      this.currentTarget = this.path.shift() || null
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
    if (this.guiTexture) {
      this.guiTexture.dispose()
    }
  }
}
