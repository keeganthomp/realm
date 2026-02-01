/**
 * EquipmentMeshes - Visual mesh creation for equipped items
 *
 * Creates 3D meshes for weapons, shields, and armor that attach to player models.
 * Meshes are styled to match the OSRS-inspired low-poly aesthetic.
 */

import {
  Scene,
  Mesh,
  MeshBuilder,
  Vector3,
  StandardMaterial
} from '@babylonjs/core'
import { ItemType, EquipmentSlot } from '@realm/shared'
import { SharedResources } from '../systems/SharedResources'

export type AttachPoint = 'rightHand' | 'leftHand' | 'head' | 'body'

export interface EquipmentMeshConfig {
  slot: EquipmentSlot
  attachPoint: AttachPoint
  createMesh: (scene: Scene) => Mesh
  offset?: Vector3
  rotation?: Vector3
  scale?: Vector3
}

/**
 * Get the material for a given item type based on its tier
 */
function getMaterialForItem(itemType: ItemType): StandardMaterial {
  const res = SharedResources.get()

  if (itemType.startsWith('bronze_')) return res.bronzeEquipmentMaterial
  if (itemType.startsWith('iron_')) return res.ironEquipmentMaterial
  if (itemType.startsWith('steel_')) return res.steelEquipmentMaterial
  if (itemType.startsWith('wooden_')) return res.woodenEquipmentMaterial
  if (itemType.startsWith('leather_')) return res.leatherEquipmentMaterial

  return res.ironEquipmentMaterial // Default
}

/**
 * Create a sword mesh - elongated blade with crossguard and handle
 */
function createSwordMesh(scene: Scene, itemType: ItemType): Mesh {
  const material = getMaterialForItem(itemType)
  const parent = new Mesh('sword_' + itemType, scene)

  // Blade - elongated box
  const blade = MeshBuilder.CreateBox('blade', {
    width: 0.04,
    height: 0.5,
    depth: 0.01
  }, scene)
  blade.material = material
  blade.position.y = 0.3
  blade.parent = parent

  // Crossguard
  const crossguard = MeshBuilder.CreateBox('crossguard', {
    width: 0.12,
    height: 0.03,
    depth: 0.03
  }, scene)
  crossguard.material = material
  crossguard.position.y = 0.05
  crossguard.parent = parent

  // Handle
  const handle = MeshBuilder.CreateCylinder('handle', {
    height: 0.12,
    diameter: 0.03,
    tessellation: 6
  }, scene)
  handle.material = SharedResources.get().darkWoodMaterial
  handle.position.y = -0.02
  handle.parent = parent

  return parent
}

/**
 * Create a two-handed sword mesh - larger version
 */
function createTwoHandedSwordMesh(scene: Scene, itemType: ItemType): Mesh {
  const material = getMaterialForItem(itemType)
  const parent = new Mesh('2hsword_' + itemType, scene)

  // Blade - larger elongated box
  const blade = MeshBuilder.CreateBox('blade', {
    width: 0.06,
    height: 0.75,
    depth: 0.015
  }, scene)
  blade.material = material
  blade.position.y = 0.45
  blade.parent = parent

  // Crossguard - wider
  const crossguard = MeshBuilder.CreateBox('crossguard', {
    width: 0.18,
    height: 0.04,
    depth: 0.04
  }, scene)
  crossguard.material = material
  crossguard.position.y = 0.08
  crossguard.parent = parent

  // Handle - longer
  const handle = MeshBuilder.CreateCylinder('handle', {
    height: 0.2,
    diameter: 0.035,
    tessellation: 6
  }, scene)
  handle.material = SharedResources.get().darkWoodMaterial
  handle.position.y = -0.04
  handle.parent = parent

  return parent
}

/**
 * Create a shield mesh - rounded rectangle
 */
function createShieldMesh(scene: Scene, itemType: ItemType): Mesh {
  const material = getMaterialForItem(itemType)
  const parent = new Mesh('shield_' + itemType, scene)

  // Main shield body
  const shield = MeshBuilder.CreateBox('shieldBody', {
    width: 0.25,
    height: 0.35,
    depth: 0.03
  }, scene)
  shield.material = material
  shield.parent = parent

  // Shield boss (center bump)
  const boss = MeshBuilder.CreateSphere('boss', {
    diameter: 0.08,
    segments: 6
  }, scene)
  boss.material = material
  boss.position.z = 0.02
  boss.parent = parent

  return parent
}

/**
 * Create a helmet mesh - rounded cap shape
 */
function createHelmetMesh(scene: Scene, itemType: ItemType): Mesh {
  const material = getMaterialForItem(itemType)
  const parent = new Mesh('helmet_' + itemType, scene)

  // Main helmet dome
  const dome = MeshBuilder.CreateSphere('helmetDome', {
    diameter: 0.28,
    segments: 8,
    slice: 0.5
  }, scene)
  dome.material = material
  dome.rotation.x = Math.PI
  dome.parent = parent

  // Helmet rim
  const rim = MeshBuilder.CreateTorus('helmetRim', {
    diameter: 0.28,
    thickness: 0.02,
    tessellation: 12
  }, scene)
  rim.material = material
  rim.position.y = -0.02
  rim.parent = parent

  return parent
}

/**
 * Create a chestplate mesh - curved torso armor
 */
function createChestplateMesh(scene: Scene, itemType: ItemType): Mesh {
  const material = getMaterialForItem(itemType)
  const parent = new Mesh('chestplate_' + itemType, scene)

  // Front plate
  const frontPlate = MeshBuilder.CreateBox('frontPlate', {
    width: 0.35,
    height: 0.4,
    depth: 0.04
  }, scene)
  frontPlate.material = material
  frontPlate.position.z = 0.12
  frontPlate.parent = parent

  // Back plate
  const backPlate = MeshBuilder.CreateBox('backPlate', {
    width: 0.32,
    height: 0.38,
    depth: 0.03
  }, scene)
  backPlate.material = material
  backPlate.position.z = -0.1
  backPlate.parent = parent

  // Shoulder guards
  for (let side of [-1, 1]) {
    const shoulder = MeshBuilder.CreateSphere('shoulder', {
      diameter: 0.12,
      segments: 6
    }, scene)
    shoulder.material = material
    shoulder.position.set(side * 0.2, 0.18, 0.05)
    shoulder.scaling.set(1, 0.7, 0.8)
    shoulder.parent = parent
  }

  return parent
}

/**
 * Create leg armor mesh
 */
function createLegsMesh(scene: Scene, itemType: ItemType): Mesh {
  const material = getMaterialForItem(itemType)
  const parent = new Mesh('legs_' + itemType, scene)

  // Two leg plates
  for (let side of [-1, 1]) {
    const legPlate = MeshBuilder.CreateBox('legPlate', {
      width: 0.1,
      height: 0.35,
      depth: 0.08
    }, scene)
    legPlate.material = material
    legPlate.position.set(side * 0.08, -0.1, 0)
    legPlate.parent = parent
  }

  // Waist band
  const waistBand = MeshBuilder.CreateBox('waistBand', {
    width: 0.28,
    height: 0.06,
    depth: 0.12
  }, scene)
  waistBand.material = material
  waistBand.position.y = 0.1
  waistBand.parent = parent

  return parent
}

/**
 * Equipment mesh configurations for each item type
 */
export const EQUIPMENT_MESH_CONFIGS: Partial<Record<ItemType, EquipmentMeshConfig>> = {
  // Bronze weapons
  [ItemType.BRONZE_SWORD]: {
    slot: EquipmentSlot.WEAPON,
    attachPoint: 'rightHand',
    createMesh: (scene) => createSwordMesh(scene, ItemType.BRONZE_SWORD),
    offset: new Vector3(0, 0, 0),
    rotation: new Vector3(0, 0, -Math.PI / 6)
  },

  // Iron weapons
  [ItemType.IRON_SWORD]: {
    slot: EquipmentSlot.WEAPON,
    attachPoint: 'rightHand',
    createMesh: (scene) => createSwordMesh(scene, ItemType.IRON_SWORD),
    offset: new Vector3(0, 0, 0),
    rotation: new Vector3(0, 0, -Math.PI / 6)
  },

  // Steel weapons
  [ItemType.STEEL_SWORD]: {
    slot: EquipmentSlot.WEAPON,
    attachPoint: 'rightHand',
    createMesh: (scene) => createSwordMesh(scene, ItemType.STEEL_SWORD),
    offset: new Vector3(0, 0, 0),
    rotation: new Vector3(0, 0, -Math.PI / 6)
  },
  [ItemType.STEEL_2H_SWORD]: {
    slot: EquipmentSlot.WEAPON,
    attachPoint: 'rightHand',
    createMesh: (scene) => createTwoHandedSwordMesh(scene, ItemType.STEEL_2H_SWORD),
    offset: new Vector3(0, 0.1, 0),
    rotation: new Vector3(0, 0, -Math.PI / 6),
    scale: new Vector3(1.2, 1.2, 1.2)
  },

  // Shields
  [ItemType.BRONZE_SHIELD]: {
    slot: EquipmentSlot.OFFHAND,
    attachPoint: 'leftHand',
    createMesh: (scene) => createShieldMesh(scene, ItemType.BRONZE_SHIELD),
    offset: new Vector3(0, 0.1, 0.08),
    rotation: new Vector3(0, Math.PI / 2, 0)
  },
  [ItemType.IRON_SHIELD]: {
    slot: EquipmentSlot.OFFHAND,
    attachPoint: 'leftHand',
    createMesh: (scene) => createShieldMesh(scene, ItemType.IRON_SHIELD),
    offset: new Vector3(0, 0.1, 0.08),
    rotation: new Vector3(0, Math.PI / 2, 0)
  },
  [ItemType.STEEL_SHIELD]: {
    slot: EquipmentSlot.OFFHAND,
    attachPoint: 'leftHand',
    createMesh: (scene) => createShieldMesh(scene, ItemType.STEEL_SHIELD),
    offset: new Vector3(0, 0.1, 0.08),
    rotation: new Vector3(0, Math.PI / 2, 0)
  },
  [ItemType.WOODEN_SHIELD]: {
    slot: EquipmentSlot.OFFHAND,
    attachPoint: 'leftHand',
    createMesh: (scene) => createShieldMesh(scene, ItemType.WOODEN_SHIELD),
    offset: new Vector3(0, 0.1, 0.08),
    rotation: new Vector3(0, Math.PI / 2, 0)
  },

  // Helmets
  [ItemType.BRONZE_HELMET]: {
    slot: EquipmentSlot.HEAD,
    attachPoint: 'head',
    createMesh: (scene) => createHelmetMesh(scene, ItemType.BRONZE_HELMET),
    offset: new Vector3(0, 0.12, 0)
  },
  [ItemType.IRON_HELMET]: {
    slot: EquipmentSlot.HEAD,
    attachPoint: 'head',
    createMesh: (scene) => createHelmetMesh(scene, ItemType.IRON_HELMET),
    offset: new Vector3(0, 0.12, 0)
  },
  [ItemType.STEEL_HELMET]: {
    slot: EquipmentSlot.HEAD,
    attachPoint: 'head',
    createMesh: (scene) => createHelmetMesh(scene, ItemType.STEEL_HELMET),
    offset: new Vector3(0, 0.12, 0)
  },

  // Chestplates
  [ItemType.BRONZE_CHESTPLATE]: {
    slot: EquipmentSlot.BODY,
    attachPoint: 'body',
    createMesh: (scene) => createChestplateMesh(scene, ItemType.BRONZE_CHESTPLATE),
    offset: new Vector3(0, 0, 0),
    scale: new Vector3(0.9, 0.9, 0.9)
  },
  [ItemType.IRON_CHESTPLATE]: {
    slot: EquipmentSlot.BODY,
    attachPoint: 'body',
    createMesh: (scene) => createChestplateMesh(scene, ItemType.IRON_CHESTPLATE),
    offset: new Vector3(0, 0, 0),
    scale: new Vector3(0.9, 0.9, 0.9)
  },
  [ItemType.STEEL_CHESTPLATE]: {
    slot: EquipmentSlot.BODY,
    attachPoint: 'body',
    createMesh: (scene) => createChestplateMesh(scene, ItemType.STEEL_CHESTPLATE),
    offset: new Vector3(0, 0, 0),
    scale: new Vector3(0.9, 0.9, 0.9)
  },
  [ItemType.LEATHER_BODY]: {
    slot: EquipmentSlot.BODY,
    attachPoint: 'body',
    createMesh: (scene) => createChestplateMesh(scene, ItemType.LEATHER_BODY),
    offset: new Vector3(0, 0, 0),
    scale: new Vector3(0.85, 0.85, 0.85)
  },

  // Leg armor
  [ItemType.BRONZE_LEGS]: {
    slot: EquipmentSlot.LEGS,
    attachPoint: 'body',
    createMesh: (scene) => createLegsMesh(scene, ItemType.BRONZE_LEGS),
    offset: new Vector3(0, -0.3, 0),
    scale: new Vector3(0.9, 0.9, 0.9)
  },
  [ItemType.IRON_LEGS]: {
    slot: EquipmentSlot.LEGS,
    attachPoint: 'body',
    createMesh: (scene) => createLegsMesh(scene, ItemType.IRON_LEGS),
    offset: new Vector3(0, -0.3, 0),
    scale: new Vector3(0.9, 0.9, 0.9)
  },
  [ItemType.STEEL_LEGS]: {
    slot: EquipmentSlot.LEGS,
    attachPoint: 'body',
    createMesh: (scene) => createLegsMesh(scene, ItemType.STEEL_LEGS),
    offset: new Vector3(0, -0.3, 0),
    scale: new Vector3(0.9, 0.9, 0.9)
  }
}

/**
 * Create equipment mesh for a given item type
 */
export function createEquipmentMesh(scene: Scene, itemType: ItemType): Mesh | null {
  const config = EQUIPMENT_MESH_CONFIGS[itemType]
  if (!config) return null

  const mesh = config.createMesh(scene)

  // Apply transforms
  if (config.offset) {
    mesh.position.copyFrom(config.offset)
  }
  if (config.rotation) {
    mesh.rotation.copyFrom(config.rotation)
  }
  if (config.scale) {
    mesh.scaling.copyFrom(config.scale)
  }

  return mesh
}

/**
 * Get attachment point configuration for an item
 */
export function getEquipmentAttachPoint(itemType: ItemType): AttachPoint | null {
  const config = EQUIPMENT_MESH_CONFIGS[itemType]
  return config?.attachPoint ?? null
}

/**
 * Check if item type has visual equipment mesh
 */
export function hasEquipmentMesh(itemType: ItemType): boolean {
  return itemType in EQUIPMENT_MESH_CONFIGS
}
