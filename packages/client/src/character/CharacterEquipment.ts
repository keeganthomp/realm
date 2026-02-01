/**
 * CharacterEquipment - Skinned equipment system with body part hiding
 *
 * Manages equipment meshes that are skinned to the character skeleton.
 * When equipment is worn, it can hide underlying body parts to prevent clipping.
 */

import { Scene, Mesh, MeshBuilder, Vector3 } from '@babylonjs/core'
import { EquipmentSlot, ItemType } from '@realm/shared'
import { SharedResources } from '../systems/SharedResources'
import {
  applySkinning,
  getBoneRestPosition,
  BoneName,
  CharacterSkeletonResult
} from './CharacterSkeleton'
import { BodyPartName } from './CharacterMeshBuilder'

/**
 * Body parts that should be hidden when equipment is worn in each slot
 */
export const EQUIPMENT_HIDE_RULES: Record<EquipmentSlot, BodyPartName[]> = {
  [EquipmentSlot.HEAD]: ['head'],
  [EquipmentSlot.BODY]: ['torso', 'upperArmL', 'upperArmR'],
  [EquipmentSlot.LEGS]: ['upperLegL', 'upperLegR', 'lowerLegL', 'lowerLegR'],
  [EquipmentSlot.HANDS]: ['handL', 'handR'],
  [EquipmentSlot.FEET]: ['footL', 'footR'],
  [EquipmentSlot.WEAPON]: [], // Weapons don't hide body parts
  [EquipmentSlot.OFFHAND]: [] // Shields don't hide body parts
}

/**
 * Which bone each equipment slot attaches to
 */
const EQUIPMENT_SLOT_BONES: Record<EquipmentSlot, BoneName> = {
  [EquipmentSlot.HEAD]: 'Head',
  [EquipmentSlot.BODY]: 'Chest',
  [EquipmentSlot.LEGS]: 'Hips',
  [EquipmentSlot.HANDS]: 'HandR', // Primary hand for gloves
  [EquipmentSlot.FEET]: 'FootR', // Primary foot
  [EquipmentSlot.WEAPON]: 'HandR',
  [EquipmentSlot.OFFHAND]: 'HandL'
}

/**
 * Get tier material based on item type name
 */
function getTierMaterial(itemType: ItemType) {
  const res = SharedResources.get()
  const name = itemType.toString()

  if (name.startsWith('bronze_')) return res.bronzeEquipmentMaterial
  if (name.startsWith('iron_')) return res.ironEquipmentMaterial
  if (name.startsWith('steel_')) return res.steelEquipmentMaterial
  if (name.startsWith('wooden_')) return res.woodenEquipmentMaterial
  if (name.startsWith('leather_')) return res.leatherEquipmentMaterial

  return res.ironEquipmentMaterial
}

/**
 * Creates a skinned helmet mesh
 */
function createSkinnedHelmet(
  scene: Scene,
  itemType: ItemType,
  skeletonResult: CharacterSkeletonResult
): Mesh {
  const material = getTierMaterial(itemType)
  const parent = new Mesh('helmet_' + itemType, scene)

  // Main helmet dome
  const dome = MeshBuilder.CreateSphere(
    'helmetDome',
    { diameter: 0.32, segments: 8, slice: 0.5 },
    scene
  )
  dome.material = material
  dome.rotation.x = Math.PI
  dome.position.y = 0.02
  dome.parent = parent

  // Helmet rim
  const rim = MeshBuilder.CreateTorus(
    'helmetRim',
    { diameter: 0.32, thickness: 0.025, tessellation: 12 },
    scene
  )
  rim.material = material
  rim.position.y = -0.02
  rim.parent = parent

  // Position at head bone
  const headPos = getBoneRestPosition(skeletonResult.bones, 'Head')
  parent.position.copyFrom(headPos)
  parent.position.y += 0.1

  // Apply skinning
  applySkinning(dome, skeletonResult.skeleton, 'Head')
  applySkinning(rim, skeletonResult.skeleton, 'Head')

  return parent
}

/**
 * Creates a skinned chestplate mesh
 */
function createSkinnedChestplate(
  scene: Scene,
  itemType: ItemType,
  skeletonResult: CharacterSkeletonResult
): Mesh {
  const material = getTierMaterial(itemType)
  const parent = new Mesh('chestplate_' + itemType, scene)

  // Front plate
  const frontPlate = MeshBuilder.CreateBox(
    'frontPlate',
    { width: 0.38, height: 0.42, depth: 0.05 },
    scene
  )
  frontPlate.material = material
  frontPlate.position.z = 0.08
  frontPlate.parent = parent

  // Back plate
  const backPlate = MeshBuilder.CreateBox(
    'backPlate',
    { width: 0.35, height: 0.4, depth: 0.04 },
    scene
  )
  backPlate.material = material
  backPlate.position.z = -0.08
  backPlate.parent = parent

  // Shoulder guards
  for (const side of [-1, 1]) {
    const shoulder = MeshBuilder.CreateSphere(
      'shoulder',
      { diameter: 0.14, segments: 6 },
      scene
    )
    shoulder.material = material
    shoulder.position.set(side * 0.2, 0.18, 0.02)
    shoulder.scaling.set(1, 0.7, 0.8)
    shoulder.parent = parent
  }

  // Position at chest bone
  const chestPos = getBoneRestPosition(skeletonResult.bones, 'Chest')
  parent.position.copyFrom(chestPos)
  parent.position.y -= 0.05

  // Apply skinning to main pieces
  applySkinning(frontPlate, skeletonResult.skeleton, 'Chest')
  applySkinning(backPlate, skeletonResult.skeleton, 'Chest')

  return parent
}

/**
 * Creates skinned leg armor
 */
function createSkinnedLegs(
  scene: Scene,
  itemType: ItemType,
  skeletonResult: CharacterSkeletonResult
): Mesh {
  const material = getTierMaterial(itemType)
  const parent = new Mesh('legs_' + itemType, scene)

  // Waist band
  const waistBand = MeshBuilder.CreateBox(
    'waistBand',
    { width: 0.32, height: 0.08, depth: 0.16 },
    scene
  )
  waistBand.material = material
  const hipsPos = getBoneRestPosition(skeletonResult.bones, 'Hips')
  waistBand.position.copyFrom(hipsPos)
  waistBand.parent = parent
  applySkinning(waistBand, skeletonResult.skeleton, 'Hips')

  // Upper leg plates (thighs)
  for (const [side, boneName] of [
    [-1, 'UpperLegL'],
    [1, 'UpperLegR']
  ] as const) {
    const legPlate = MeshBuilder.CreateCylinder(
      'upperLegPlate_' + boneName,
      { height: 0.36, diameterTop: 0.15, diameterBottom: 0.12, tessellation: 8 },
      scene
    )
    legPlate.material = material
    const legPos = getBoneRestPosition(skeletonResult.bones, boneName)
    legPlate.position.copyFrom(legPos)
    legPlate.position.y -= 0.18
    legPlate.parent = parent
    applySkinning(legPlate, skeletonResult.skeleton, boneName)
  }

  // Lower leg plates (shins)
  for (const [side, boneName] of [
    [-1, 'LowerLegL'],
    [1, 'LowerLegR']
  ] as const) {
    const shinPlate = MeshBuilder.CreateCylinder(
      'lowerLegPlate_' + boneName,
      { height: 0.36, diameterTop: 0.11, diameterBottom: 0.09, tessellation: 8 },
      scene
    )
    shinPlate.material = material
    const shinPos = getBoneRestPosition(skeletonResult.bones, boneName)
    shinPlate.position.copyFrom(shinPos)
    shinPlate.position.y -= 0.18
    shinPlate.parent = parent
    applySkinning(shinPlate, skeletonResult.skeleton, boneName)
  }

  return parent
}

/**
 * Creates a skinned sword (held weapon)
 */
function createSkinnedSword(
  scene: Scene,
  itemType: ItemType,
  skeletonResult: CharacterSkeletonResult
): Mesh {
  const material = getTierMaterial(itemType)
  const res = SharedResources.get()
  const parent = new Mesh('sword_' + itemType, scene)

  // Blade
  const blade = MeshBuilder.CreateBox(
    'blade',
    { width: 0.04, height: 0.5, depth: 0.01 },
    scene
  )
  blade.material = material
  blade.position.y = 0.3
  blade.parent = parent

  // Crossguard
  const crossguard = MeshBuilder.CreateBox(
    'crossguard',
    { width: 0.12, height: 0.03, depth: 0.03 },
    scene
  )
  crossguard.material = material
  crossguard.position.y = 0.05
  crossguard.parent = parent

  // Handle
  const handle = MeshBuilder.CreateCylinder(
    'handle',
    { height: 0.12, diameter: 0.03, tessellation: 6 },
    scene
  )
  handle.material = res.darkWoodMaterial
  handle.position.y = -0.02
  handle.parent = parent

  // Position at right hand
  const handPos = getBoneRestPosition(skeletonResult.bones, 'HandR')
  parent.position.copyFrom(handPos)
  parent.rotation.z = -Math.PI / 6 // Slight angle

  // Apply skinning
  applySkinning(blade, skeletonResult.skeleton, 'HandR')
  applySkinning(crossguard, skeletonResult.skeleton, 'HandR')
  applySkinning(handle, skeletonResult.skeleton, 'HandR')

  return parent
}

/**
 * Creates a skinned shield (off-hand)
 */
function createSkinnedShield(
  scene: Scene,
  itemType: ItemType,
  skeletonResult: CharacterSkeletonResult
): Mesh {
  const material = getTierMaterial(itemType)
  const parent = new Mesh('shield_' + itemType, scene)

  // Main shield body
  const shield = MeshBuilder.CreateBox(
    'shieldBody',
    { width: 0.25, height: 0.35, depth: 0.03 },
    scene
  )
  shield.material = material
  shield.parent = parent

  // Shield boss
  const boss = MeshBuilder.CreateSphere(
    'boss',
    { diameter: 0.08, segments: 6 },
    scene
  )
  boss.material = material
  boss.position.z = 0.02
  boss.parent = parent

  // Position at left hand
  const handPos = getBoneRestPosition(skeletonResult.bones, 'HandL')
  parent.position.copyFrom(handPos)
  parent.position.z = 0.08
  parent.rotation.y = Math.PI / 2

  // Apply skinning
  applySkinning(shield, skeletonResult.skeleton, 'HandL')
  applySkinning(boss, skeletonResult.skeleton, 'HandL')

  return parent
}

/**
 * Equipment mesh creator lookup
 */
type EquipmentMeshCreator = (
  scene: Scene,
  itemType: ItemType,
  skeletonResult: CharacterSkeletonResult
) => Mesh | null

/**
 * Map item types to their mesh creators
 */
function getEquipmentCreator(itemType: ItemType): EquipmentMeshCreator | null {
  const name = itemType.toString()

  // Helmets
  if (name.includes('helmet')) return createSkinnedHelmet

  // Chestplates
  if (name.includes('chestplate') || name.includes('body')) return createSkinnedChestplate

  // Legs
  if (name.includes('legs')) return createSkinnedLegs

  // Swords
  if (name.includes('sword')) return createSkinnedSword

  // Shields
  if (name.includes('shield')) return createSkinnedShield

  return null
}

/**
 * CharacterEquipment manages equipped items as skinned meshes
 */
export class CharacterEquipment {
  private scene: Scene
  private skeletonResult: CharacterSkeletonResult
  private equippedMeshes: Map<EquipmentSlot, Mesh> = new Map()

  constructor(scene: Scene, skeletonResult: CharacterSkeletonResult) {
    this.scene = scene
    this.skeletonResult = skeletonResult
  }

  /**
   * Equip an item in a slot
   */
  equip(slot: EquipmentSlot, itemType: ItemType | null): BodyPartName[] {
    // Remove existing equipment in this slot
    this.unequip(slot)

    if (!itemType) {
      return []
    }

    // Create the equipment mesh
    const creator = getEquipmentCreator(itemType)
    if (creator) {
      const mesh = creator(this.scene, itemType, this.skeletonResult)
      if (mesh) {
        this.equippedMeshes.set(slot, mesh)
      }
    }

    // Return which body parts should be hidden
    return EQUIPMENT_HIDE_RULES[slot]
  }

  /**
   * Unequip item from a slot
   */
  unequip(slot: EquipmentSlot): void {
    const mesh = this.equippedMeshes.get(slot)
    if (mesh) {
      mesh.dispose()
      this.equippedMeshes.delete(slot)
    }
  }

  /**
   * Get which body parts should be hidden based on current equipment
   */
  getHiddenParts(): Set<BodyPartName> {
    const hidden = new Set<BodyPartName>()

    for (const slot of this.equippedMeshes.keys()) {
      for (const part of EQUIPMENT_HIDE_RULES[slot]) {
        hidden.add(part)
      }
    }

    return hidden
  }

  /**
   * Get the mesh for a specific equipment slot
   */
  getMesh(slot: EquipmentSlot): Mesh | undefined {
    return this.equippedMeshes.get(slot)
  }

  /**
   * Dispose all equipment meshes
   */
  dispose(): void {
    for (const mesh of this.equippedMeshes.values()) {
      mesh.dispose()
    }
    this.equippedMeshes.clear()
  }
}
