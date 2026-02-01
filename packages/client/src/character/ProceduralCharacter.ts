/**
 * ProceduralCharacter - Code-only character with shared skeleton
 *
 * Creates a fully procedural character with:
 * - Canonical skeleton shared across all body parts and equipment
 * - Separate body part meshes that can be hidden by equipment
 * - Skinned equipment meshes that animate with the skeleton
 * - Procedural animations (idle, walk, attack)
 */

import { Scene, TransformNode, Mesh } from '@babylonjs/core'
import { EquipmentSlot, ItemType } from '@realm/shared'
import { createCharacterSkeleton, CharacterSkeletonResult } from './CharacterSkeleton'
import { CharacterMeshBuilder, BodyPartName, ALL_BODY_PARTS } from './CharacterMeshBuilder'
import { CharacterEquipment } from './CharacterEquipment'
import { CharacterAnimator, AnimationType } from './CharacterAnimator'

/**
 * Configuration for creating a procedural character
 */
export interface ProceduralCharacterConfig {
  id: string
  scene: Scene
}

/**
 * ProceduralCharacter is a fully code-generated character with skeletal animation support
 */
export class ProceduralCharacter {
  public readonly id: string
  public readonly node: TransformNode

  private scene: Scene
  private skeletonResult: CharacterSkeletonResult
  private bodyParts: Map<BodyPartName, Mesh> = new Map()
  private equipment: CharacterEquipment
  private animator: CharacterAnimator
  private initialized: boolean = false

  constructor(config: ProceduralCharacterConfig) {
    this.id = config.id
    this.scene = config.scene
    this.node = new TransformNode(`proceduralCharacter_${config.id}`, this.scene)

    // Create skeleton
    this.skeletonResult = createCharacterSkeleton(this.scene, config.id)

    // Create equipment system
    this.equipment = new CharacterEquipment(this.scene, this.skeletonResult)

    // Create animator
    this.animator = new CharacterAnimator(this.skeletonResult)
  }

  /**
   * Initialize the character (creates all body meshes)
   */
  init(): void {
    if (this.initialized) return

    this.createBodyParts()
    this.initialized = true
  }

  /**
   * Creates all body part meshes
   */
  private createBodyParts(): void {
    const builder = new CharacterMeshBuilder(this.scene, this.skeletonResult)

    for (const partName of ALL_BODY_PARTS) {
      const mesh = builder.createBodyPart(partName, this.id)
      mesh.parent = this.node
      this.bodyParts.set(partName, mesh)

      // Debug: log mesh positions
      console.log(`Body part ${partName}: pos=(${mesh.position.x.toFixed(2)}, ${mesh.position.y.toFixed(2)}, ${mesh.position.z.toFixed(2)}), visible=${mesh.isVisible}`)
    }
  }

  /**
   * Update equipment for a specific slot
   */
  updateEquipmentSlot(slot: EquipmentSlot, itemType: ItemType | null): void {
    // Equip/unequip and get parts to hide
    const partsToHide = this.equipment.equip(slot, itemType)

    // Parent equipment mesh to our node
    const equipMesh = this.equipment.getMesh(slot)
    if (equipMesh) {
      equipMesh.parent = this.node
    }

    // Update body part visibility
    this.updateBodyPartVisibility()
  }

  /**
   * Update all equipment at once
   */
  updateAllEquipment(equipment: Record<string, string | null>): void {
    for (const slotKey of Object.values(EquipmentSlot)) {
      const itemType = equipment[slotKey] as ItemType | null
      this.updateEquipmentSlot(slotKey, itemType)
    }
  }

  /**
   * Updates visibility of body parts based on equipped items
   */
  private updateBodyPartVisibility(): void {
    const hiddenParts = this.equipment.getHiddenParts()

    for (const [partName, mesh] of this.bodyParts) {
      mesh.isVisible = !hiddenParts.has(partName)
    }
  }

  /**
   * Get a specific body part mesh
   */
  getBodyPart(name: BodyPartName): Mesh | undefined {
    return this.bodyParts.get(name)
  }

  /**
   * Get the skeleton for external animation control
   */
  getSkeleton(): CharacterSkeletonResult {
    return this.skeletonResult
  }

  /**
   * Update the character (call each frame)
   */
  update(deltaTime: number): void {
    this.animator.update(deltaTime)
  }

  /**
   * Play an animation
   */
  playAnimation(animation: AnimationType): void {
    this.animator.play(animation)
  }

  /**
   * Start an attack animation
   */
  attack(onComplete?: () => void): void {
    this.animator.startAttack(onComplete)
  }

  /**
   * Check if currently attacking
   */
  isAttacking(): boolean {
    return this.animator.isPlayingAttack()
  }

  /**
   * Set visibility of the entire character
   */
  setVisible(visible: boolean): void {
    for (const mesh of this.bodyParts.values()) {
      mesh.isVisible = visible && !this.equipment.getHiddenParts().has(
        [...this.bodyParts.entries()].find(([_, m]) => m === mesh)?.[0] as BodyPartName
      )
    }
  }

  /**
   * Dispose the character and all its resources
   */
  dispose(): void {
    // Dispose body parts
    for (const mesh of this.bodyParts.values()) {
      mesh.dispose()
    }
    this.bodyParts.clear()

    // Dispose equipment
    this.equipment.dispose()

    // Dispose skeleton
    this.skeletonResult.skeleton.dispose()

    // Dispose node
    this.node.dispose()

    this.initialized = false
  }
}
