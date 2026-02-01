/**
 * SimpleCharacter - Simple procedural character using TransformNode hierarchy
 *
 * Instead of GPU skinning, uses a TransformNode hierarchy where each body part
 * is parented to a "joint" node. Animating the joint rotates the body part.
 * This is simpler and more predictable than skinning for rigid body parts.
 */

import { Scene, TransformNode, Mesh, MeshBuilder, Vector3, Color3 } from '@babylonjs/core'
import { EquipmentSlot, ItemType } from '@realm/shared'
import { SharedResources } from '../systems/SharedResources'

/**
 * Joint names in the hierarchy
 */
type JointName =
  | 'root'
  | 'hips'
  | 'spine'
  | 'chest'
  | 'neck'
  | 'head'
  | 'shoulderL'
  | 'upperArmL'
  | 'lowerArmL'
  | 'handL'
  | 'shoulderR'
  | 'upperArmR'
  | 'lowerArmR'
  | 'handR'
  | 'upperLegL'
  | 'lowerLegL'
  | 'footL'
  | 'upperLegR'
  | 'lowerLegR'
  | 'footR'

/**
 * Body part mesh names
 */
type BodyPartName =
  | 'head'
  | 'torso'
  | 'upperArmL'
  | 'upperArmR'
  | 'lowerArmL'
  | 'lowerArmR'
  | 'handL'
  | 'handR'
  | 'upperLegL'
  | 'upperLegR'
  | 'lowerLegL'
  | 'lowerLegR'
  | 'footL'
  | 'footR'

interface JointDef {
  name: JointName
  parent: JointName | null
  position: Vector3  // Position relative to parent
}

/**
 * Joint hierarchy with positions
 */
/**
 * OSRS-style joint hierarchy
 * Designed so feet touch Y=0 when root is at origin
 * Total height ~1.75 units
 *
 * Foot position math:
 * root(0) + hips(0.86) + upperLeg(-0.04) + lowerLeg(-0.40) + foot(-0.38) = 0.04 (ankle)
 * With foot mesh bottom at -0.04 from ankle = 0.00 (ground!)
 */
const JOINTS: JointDef[] = [
  // Root at origin - character's ground contact point
  { name: 'root', parent: null, position: new Vector3(0, 0, 0) },

  // Hips - center of pelvis, positioned so legs reach ground
  { name: 'hips', parent: 'root', position: new Vector3(0, 0.86, 0) },

  // Spine - base of torso
  { name: 'spine', parent: 'hips', position: new Vector3(0, 0.08, 0) },

  // Chest - upper torso where arms attach
  { name: 'chest', parent: 'spine', position: new Vector3(0, 0.28, 0) },

  // Neck - visible neck joint
  { name: 'neck', parent: 'chest', position: new Vector3(0, 0.14, 0) },

  // Head - center of head
  { name: 'head', parent: 'neck', position: new Vector3(0, 0.12, 0) },

  // Left arm - shoulder at chest, offset outward
  { name: 'shoulderL', parent: 'chest', position: new Vector3(-0.22, 0.10, 0) },
  { name: 'upperArmL', parent: 'shoulderL', position: new Vector3(-0.04, -0.02, 0) },
  { name: 'lowerArmL', parent: 'upperArmL', position: new Vector3(0, -0.26, 0) },
  { name: 'handL', parent: 'lowerArmL', position: new Vector3(0, -0.24, 0) },

  // Right arm
  { name: 'shoulderR', parent: 'chest', position: new Vector3(0.22, 0.10, 0) },
  { name: 'upperArmR', parent: 'shoulderR', position: new Vector3(0.04, -0.02, 0) },
  { name: 'lowerArmR', parent: 'upperArmR', position: new Vector3(0, -0.26, 0) },
  { name: 'handR', parent: 'lowerArmR', position: new Vector3(0, -0.24, 0) },

  // Left leg - positioned to reach ground
  { name: 'upperLegL', parent: 'hips', position: new Vector3(-0.10, -0.04, 0) },
  { name: 'lowerLegL', parent: 'upperLegL', position: new Vector3(0, -0.40, 0) },
  { name: 'footL', parent: 'lowerLegL', position: new Vector3(0, -0.38, 0.02) },

  // Right leg
  { name: 'upperLegR', parent: 'hips', position: new Vector3(0.10, -0.04, 0) },
  { name: 'lowerLegR', parent: 'upperLegR', position: new Vector3(0, -0.40, 0) },
  { name: 'footR', parent: 'lowerLegR', position: new Vector3(0, -0.38, 0.02) },
]

/**
 * Animation state
 */
type AnimationType = 'idle' | 'walk' | 'attack'

// Static array to avoid per-frame allocation in resetLimbRotations
const LIMB_JOINTS: readonly JointName[] = [
  'upperLegL', 'upperLegR', 'lowerLegL', 'lowerLegR',
  'upperArmL', 'upperArmR', 'lowerArmL', 'lowerArmR'
] as const

export class SimpleCharacter {
  public readonly node: TransformNode
  public readonly id: string

  private scene: Scene
  private joints: Map<JointName, TransformNode> = new Map()
  private bodyParts: Map<BodyPartName, Mesh> = new Map()
  private equipmentMeshes: Map<EquipmentSlot, Mesh> = new Map()

  // Animation
  private currentAnimation: AnimationType = 'idle'
  private animTime: number = 0
  private isAttacking: boolean = false
  private attackTime: number = 0

  constructor(id: string, scene: Scene) {
    this.id = id
    this.scene = scene
    this.node = new TransformNode(`simpleChar_${id}`, scene)
  }

  /**
   * Initialize the character
   */
  init(): void {
    this.createJoints()
    this.createBodyParts()
  }

  /**
   * Create the joint hierarchy
   */
  private createJoints(): void {
    for (const def of JOINTS) {
      const joint = new TransformNode(`joint_${def.name}`, this.scene)
      joint.position.copyFrom(def.position)

      if (def.parent) {
        const parentJoint = this.joints.get(def.parent)
        if (parentJoint) {
          joint.parent = parentJoint
        }
      } else {
        joint.parent = this.node
      }

      this.joints.set(def.name, joint)
    }
  }

  /**
   * Create body part meshes attached to joints
   * OSRS-style chunky proportions with visible gaps at joints
   */
  private createBodyParts(): void {
    const res = SharedResources.get()

    // HEAD - Blocky sphere (no neck mesh - gap like waist for OSRS style)
    const head = MeshBuilder.CreateSphere('head', { diameter: 0.32, segments: 8 }, this.scene)
    head.material = res.playerSkinMaterial
    head.position.y = 0.14 // Adjusted for no neck
    head.parent = this.joints.get('head')!
    this.bodyParts.set('head', head)

    // TORSO - Cylinder from spine up
    const torso = MeshBuilder.CreateCylinder('torso', {
      height: 0.42,
      diameterTop: 0.32,     // Shoulders
      diameterBottom: 0.26,  // Narrower waist
      tessellation: 8
    }, this.scene)
    torso.material = res.playerBodyMaterial
    torso.position.y = 0.21 // Center above spine
    torso.parent = this.joints.get('spine')!
    this.bodyParts.set('torso', torso)

    // Arms and legs
    this.createArm('L', res)
    this.createArm('R', res)
    this.createLeg('L', res)
    this.createLeg('R', res)
  }

  private createArm(side: 'L' | 'R', res: SharedResources): void {
    // Upper arm - thick cylinder
    const upperArm = MeshBuilder.CreateCylinder(`upperArm${side}`, {
      height: 0.26,
      diameterTop: 0.12,
      diameterBottom: 0.10,
      tessellation: 6
    }, this.scene)
    upperArm.material = res.playerBodyMaterial
    upperArm.position.y = -0.13 // Hang below shoulder
    upperArm.parent = this.joints.get(`upperArm${side}` as JointName)!
    this.bodyParts.set(`upperArm${side}` as BodyPartName, upperArm)

    // Lower arm (forearm) - skin colored
    const lowerArm = MeshBuilder.CreateCylinder(`lowerArm${side}`, {
      height: 0.24,
      diameterTop: 0.10,
      diameterBottom: 0.08,
      tessellation: 6
    }, this.scene)
    lowerArm.material = res.playerSkinMaterial
    lowerArm.position.y = -0.12
    lowerArm.parent = this.joints.get(`lowerArm${side}` as JointName)!
    this.bodyParts.set(`lowerArm${side}` as BodyPartName, lowerArm)

    // Hand - blocky box
    const hand = MeshBuilder.CreateBox(`hand${side}`, {
      width: 0.08,
      height: 0.12,
      depth: 0.05
    }, this.scene)
    hand.material = res.playerSkinMaterial
    hand.position.y = -0.06
    hand.parent = this.joints.get(`hand${side}` as JointName)!
    this.bodyParts.set(`hand${side}` as BodyPartName, hand)
  }

  private createLeg(side: 'L' | 'R', res: SharedResources): void {
    const pantsMaterial = res.getMaterial('pants', new Color3(0.3, 0.25, 0.18))

    // Upper leg (thigh) - thick cylinder
    const upperLeg = MeshBuilder.CreateCylinder(`upperLeg${side}`, {
      height: 0.40,
      diameterTop: 0.16,
      diameterBottom: 0.12,
      tessellation: 8
    }, this.scene)
    upperLeg.material = pantsMaterial
    upperLeg.position.y = -0.20 // Center below hip
    upperLeg.parent = this.joints.get(`upperLeg${side}` as JointName)!
    this.bodyParts.set(`upperLeg${side}` as BodyPartName, upperLeg)

    // Lower leg (shin)
    const lowerLeg = MeshBuilder.CreateCylinder(`lowerLeg${side}`, {
      height: 0.38,
      diameterTop: 0.12,
      diameterBottom: 0.09,
      tessellation: 8
    }, this.scene)
    lowerLeg.material = pantsMaterial
    lowerLeg.position.y = -0.19 // Center below knee
    lowerLeg.parent = this.joints.get(`lowerLeg${side}` as JointName)!
    this.bodyParts.set(`lowerLeg${side}` as BodyPartName, lowerLeg)

    // Foot - flat blocky box that touches ground
    // Foot joint is at Y=0.04, mesh height=0.08, so center at Y=0.04 puts bottom at Y=0
    const foot = MeshBuilder.CreateBox(`foot${side}`, {
      width: 0.11,
      height: 0.08,
      depth: 0.18
    }, this.scene)
    foot.material = pantsMaterial
    foot.position.set(0, 0, 0.04) // Center at joint level, pushed forward
    foot.parent = this.joints.get(`foot${side}` as JointName)!
    this.bodyParts.set(`foot${side}` as BodyPartName, foot)
  }

  /**
   * Get a joint for animation
   */
  getJoint(name: JointName): TransformNode | undefined {
    return this.joints.get(name)
  }

  /**
   * Play an animation
   */
  playAnimation(anim: AnimationType): void {
    if (anim === 'attack') {
      this.isAttacking = true
      this.attackTime = 0
      return
    }
    this.currentAnimation = anim
  }

  /**
   * Update animation
   */
  update(deltaTime: number): void {
    this.animTime += deltaTime

    if (this.isAttacking) {
      this.updateAttackAnimation(deltaTime)
      return
    }

    switch (this.currentAnimation) {
      case 'idle':
        this.updateIdleAnimation()
        break
      case 'walk':
        this.updateWalkAnimation()
        break
    }
  }

  private updateIdleAnimation(): void {
    const t = this.animTime * 1.5

    // Subtle breathing
    const breathe = Math.sin(t) * 0.02
    const spine = this.joints.get('spine')
    if (spine) spine.rotation.x = breathe

    // Reset limbs
    this.resetLimbRotations()

    // Subtle arm sway
    const armSway = Math.sin(t * 0.8) * 0.03
    const upperArmL = this.joints.get('upperArmL')
    const upperArmR = this.joints.get('upperArmR')
    if (upperArmL) upperArmL.rotation.x = armSway
    if (upperArmR) upperArmR.rotation.x = -armSway
  }

  private updateWalkAnimation(): void {
    const t = this.animTime * 8

    // Leg swing
    const legSwing = Math.sin(t) * 0.5
    const upperLegL = this.joints.get('upperLegL')
    const upperLegR = this.joints.get('upperLegR')
    if (upperLegL) upperLegL.rotation.x = legSwing
    if (upperLegR) upperLegR.rotation.x = -legSwing

    // Knee bend on back swing
    const lowerLegL = this.joints.get('lowerLegL')
    const lowerLegR = this.joints.get('lowerLegR')
    if (lowerLegL) lowerLegL.rotation.x = Math.max(0, -legSwing) * 0.7
    if (lowerLegR) lowerLegR.rotation.x = Math.max(0, legSwing) * 0.7

    // Arm swing (opposite to legs)
    const armSwing = Math.sin(t) * 0.4
    const upperArmL = this.joints.get('upperArmL')
    const upperArmR = this.joints.get('upperArmR')
    if (upperArmL) upperArmL.rotation.x = -armSwing
    if (upperArmR) upperArmR.rotation.x = armSwing

    // Elbow bend
    const lowerArmL = this.joints.get('lowerArmL')
    const lowerArmR = this.joints.get('lowerArmR')
    if (lowerArmL) lowerArmL.rotation.x = Math.max(0, armSwing) * 0.3
    if (lowerArmR) lowerArmR.rotation.x = Math.max(0, -armSwing) * 0.3

    // Torso twist
    const spine = this.joints.get('spine')
    if (spine) spine.rotation.y = Math.sin(t) * 0.05
  }

  private updateAttackAnimation(deltaTime: number): void {
    this.attackTime += deltaTime
    const duration = 0.4
    const progress = Math.min(this.attackTime / duration, 1)

    const upperArmR = this.joints.get('upperArmR')
    const lowerArmR = this.joints.get('lowerArmR')
    const spine = this.joints.get('spine')

    if (progress < 0.3) {
      // Wind up
      const p = progress / 0.3
      if (upperArmR) upperArmR.rotation.x = -0.5 * p
      if (lowerArmR) lowerArmR.rotation.x = -0.3 * p
      if (spine) spine.rotation.y = -0.2 * p
    } else if (progress < 0.6) {
      // Swing
      const p = (progress - 0.3) / 0.3
      if (upperArmR) upperArmR.rotation.x = -0.5 + 1.5 * p
      if (lowerArmR) lowerArmR.rotation.x = -0.3 - 0.3 * p
      if (spine) spine.rotation.y = -0.2 + 0.5 * p
    } else {
      // Follow through
      const p = (progress - 0.6) / 0.4
      if (upperArmR) upperArmR.rotation.x = 1.0 * (1 - p)
      if (lowerArmR) lowerArmR.rotation.x = -0.6 * (1 - p)
      if (spine) spine.rotation.y = 0.3 * (1 - p)
    }

    if (progress >= 1) {
      this.isAttacking = false
      this.resetLimbRotations()
    }
  }

  private resetLimbRotations(): void {
    for (const name of LIMB_JOINTS) {
      const joint = this.joints.get(name)
      if (joint) {
        joint.rotation.x = 0
        joint.rotation.y = 0
        joint.rotation.z = 0
      }
    }
  }

  /**
   * Update equipment visuals
   */
  updateEquipmentSlot(slot: EquipmentSlot, itemType: ItemType | null): void {
    // Remove existing
    const existing = this.equipmentMeshes.get(slot)
    if (existing) {
      existing.dispose()
      this.equipmentMeshes.delete(slot)
    }

    if (!itemType) return

    // Create equipment mesh and attach to appropriate joint
    // TODO: Implement equipment meshes
  }

  updateAllEquipment(equipment: Record<string, string | null>): void {
    for (const slotKey of Object.values(EquipmentSlot)) {
      const itemType = equipment[slotKey] as ItemType | null
      this.updateEquipmentSlot(slotKey, itemType)
    }
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    for (const mesh of this.bodyParts.values()) {
      mesh.dispose()
    }
    this.bodyParts.clear()

    for (const mesh of this.equipmentMeshes.values()) {
      mesh.dispose()
    }
    this.equipmentMeshes.clear()

    for (const joint of this.joints.values()) {
      joint.dispose()
    }
    this.joints.clear()

    this.node.dispose()
  }
}
