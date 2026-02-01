import {
  Scene,
  TransformNode,
  MeshBuilder,
  Mesh,
  AnimationGroup,
  Vector3
} from '@babylonjs/core'
import '@babylonjs/loaders/glTF'
import { TextBlock } from '@babylonjs/gui'
import { Direction, getDirection, TILE_SIZE, EquipmentSlot, ItemType } from '@realm/shared'
import type { Position } from '@realm/shared'
import { SharedResources } from '../systems/SharedResources'
import { AssetManager } from '../systems/AssetManager'
import { createEquipmentMesh, getEquipmentAttachPoint, AttachPoint } from './EquipmentMeshes'

const MOVE_SPEED = 3 // pixels per frame at 60fps
const MODEL_PATH = '/assets/models/'
const MODEL_FILE = 'player.glb?v=2'

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

  // Equipment attachment points
  private attachPoints: Record<AttachPoint, TransformNode> | null = null
  private equipmentMeshes: Map<EquipmentSlot, Mesh> = new Map()

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
      console.log(`Loading player model from: ${MODEL_PATH}${MODEL_FILE}`)
      // Use AssetManager for efficient model loading and sharing
      const assetManager = AssetManager.get()
      const result = await assetManager.instantiate(MODEL_PATH, MODEL_FILE, 'player')
      console.log('Player model instantiated, meshes:', result.rootNode.getChildMeshes().length)

      // Debug: Log bounding info to understand model size
      const meshes = result.rootNode.getChildMeshes()
      if (meshes.length > 0) {
        let minY = Infinity, maxY = -Infinity
        let minX = Infinity, maxX = -Infinity
        for (const mesh of meshes) {
          mesh.computeWorldMatrix(true)
          const bounds = mesh.getBoundingInfo()
          if (bounds) {
            minY = Math.min(minY, bounds.boundingBox.minimumWorld.y)
            maxY = Math.max(maxY, bounds.boundingBox.maximumWorld.y)
            minX = Math.min(minX, bounds.boundingBox.minimumWorld.x)
            maxX = Math.max(maxX, bounds.boundingBox.maximumWorld.x)
          }
        }
        console.log(`Player model bounds: height=${(maxY - minY).toFixed(2)}, width=${(maxX - minX).toFixed(2)}, minY=${minY.toFixed(2)}, maxY=${maxY.toFixed(2)}`)
      }

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

      // Create equipment attachment points
      this.createAttachPoints()

      this.modelLoaded = true
      console.log(
        `Player model loaded. Animations found: ${result.animationGroups.map((a) => a.name).join(', ')}`
      )
    } catch (error) {
      console.warn('Failed to load player model, using fallback:', error)
      console.warn('THIS IS THE FALLBACK MESH - cylinder + sphere')
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

    // Create equipment attachment points for fallback mesh
    this.createAttachPoints()

    this.modelLoaded = true
  }

  /**
   * Create attachment points for equipment meshes
   */
  private createAttachPoints() {
    this.attachPoints = {
      rightHand: new TransformNode('attach_rightHand', this.scene),
      leftHand: new TransformNode('attach_leftHand', this.scene),
      head: new TransformNode('attach_head', this.scene),
      body: new TransformNode('attach_body', this.scene)
    }

    // Position attachment points relative to character
    // These values work for both GLB model and fallback mesh
    this.attachPoints.rightHand.position = new Vector3(0.25, 0.5, 0)
    this.attachPoints.leftHand.position = new Vector3(-0.25, 0.5, 0)
    this.attachPoints.head.position = new Vector3(0, 1.1, 0)
    this.attachPoints.body.position = new Vector3(0, 0.55, 0)

    // Parent all attach points to the main node
    for (const point of Object.values(this.attachPoints)) {
      point.parent = this.node
    }
  }

  /**
   * Update equipment visuals when equipment changes
   */
  updateEquipment(slot: EquipmentSlot, itemType: ItemType | null) {
    if (!this.attachPoints) return

    // Remove existing mesh for this slot
    const existingMesh = this.equipmentMeshes.get(slot)
    if (existingMesh) {
      existingMesh.dispose()
      this.equipmentMeshes.delete(slot)
    }

    // Create new mesh if item equipped
    if (itemType) {
      const mesh = createEquipmentMesh(this.scene, itemType)
      if (mesh) {
        const attachPoint = getEquipmentAttachPoint(itemType)
        if (attachPoint && this.attachPoints[attachPoint]) {
          mesh.parent = this.attachPoints[attachPoint]
          this.equipmentMeshes.set(slot, mesh)
        }
      }
    }
  }

  /**
   * Update all equipment visuals at once
   */
  updateAllEquipment(equipment: Record<string, string | null>) {
    for (const slotKey of Object.values(EquipmentSlot)) {
      const itemType = equipment[slotKey] as ItemType | null
      this.updateEquipment(slotKey, itemType)
    }
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
    // Snap rotation to 45-degree increments
    // Adjust MODEL_ROTATION_OFFSET if model faces wrong direction
    const MODEL_ROTATION_OFFSET = 0 // Was Math.PI - change if model faces wrong way
    this.node.rotation.y = Math.round(ang / step) * step + MODEL_ROTATION_OFFSET
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
    // Dispose equipment meshes
    for (const mesh of this.equipmentMeshes.values()) {
      mesh.dispose()
    }
    this.equipmentMeshes.clear()

    this.node.dispose()
    SharedResources.get().removeControl(this.nameLabel)
  }
}
