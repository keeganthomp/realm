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
import { Direction, TILE_SIZE, EquipmentSlot, ItemType } from '@realm/shared'
import type { Position } from '@realm/shared'
import { SharedResources } from '../systems/SharedResources'
import { AssetManager } from '../systems/AssetManager'
import { createEquipmentMesh, getEquipmentAttachPoint, AttachPoint } from './EquipmentMeshes'

const INTERPOLATION_SPEED = 0.15
const MODEL_PATH = '/assets/models/'
const MODEL_FILE = 'player.glb?v=2'

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

  private nameLabel: TextBlock | null = null

  // Equipment attachment points
  private attachPoints: Record<AttachPoint, TransformNode> | null = null
  private equipmentMeshes: Map<EquipmentSlot, Mesh> = new Map()

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
      // Use AssetManager for efficient model loading and sharing
      const assetManager = AssetManager.get()
      const result = await assetManager.instantiate(MODEL_PATH, MODEL_FILE, `remote_${this.playerName}`)

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

      // Scale the model appropriately
      this.node.scaling.setAll(1.0)

      // Create equipment attachment points
      this.createAttachPoints()

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
    const res = SharedResources.get()

    // Body - center at half height so bottom is at y=0 (ground level)
    const body = MeshBuilder.CreateCylinder(
      'remoteBody_' + this.playerName,
      { height: 0.8, diameter: 0.4, tessellation: 8 },
      this.scene
    )
    body.material = res.playerBodyMaterial
    body.position.y = 0.4  // Half of 0.8 height, so bottom is at y=0
    body.parent = this.node

    // Head - positioned above body
    const head = MeshBuilder.CreateSphere(
      'remoteHead_' + this.playerName,
      { diameter: 0.35, segments: 8 },
      this.scene
    )
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
      rightHand: new TransformNode('attach_rightHand_' + this.playerName, this.scene),
      leftHand: new TransformNode('attach_leftHand_' + this.playerName, this.scene),
      head: new TransformNode('attach_head_' + this.playerName, this.scene),
      body: new TransformNode('attach_body_' + this.playerName, this.scene)
    }

    // Position attachment points relative to character
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

  setHeightProvider(provider: (tileX: number, tileY: number) => number) {
    this.heightProvider = provider
    // Invalidate cache to force height recalculation with new provider
    this.cachedTileX = -1
    this.cachedTileY = -1
    this.updateNodePosition()
  }

  private createNameLabel() {
    const res = SharedResources.get()
    this.nameLabel = res.createLabel('remote_' + this.playerName, this.playerName)
    this.nameLabel.fontSize = 14
    this.nameLabel.isVisible = true
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
    // Dispose equipment meshes
    for (const mesh of this.equipmentMeshes.values()) {
      mesh.dispose()
    }
    this.equipmentMeshes.clear()

    this.node.dispose()
    SharedResources.get().removeControl(this.nameLabel)
  }
}
