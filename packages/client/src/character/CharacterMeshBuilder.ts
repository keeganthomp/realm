/**
 * CharacterMeshBuilder - Procedural body part mesh generation
 *
 * Creates low-poly segmented body parts for the OSRS-style character.
 * Each body part is a separate mesh that can be:
 * - Independently hidden when equipment is worn
 * - Skinned to the appropriate bone for animation
 *
 * Body parts:
 * - head: Sphere for head
 * - torso: Cylinder/box for upper body
 * - upperArmL/R: Upper arm segments
 * - lowerArmL/R: Forearm segments
 * - handL/R: Hand blocks
 * - upperLegL/R: Thigh segments
 * - lowerLegL/R: Lower leg segments
 * - footL/R: Foot blocks
 */

import { Scene, Mesh, MeshBuilder, Vector3, Color3 } from '@babylonjs/core'
import { SharedResources } from '../systems/SharedResources'
import {
  applySkinning,
  getBoneRestPosition,
  BoneName,
  CharacterSkeletonResult
} from './CharacterSkeleton'

// Body part names as a type for type safety
export type BodyPartName =
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

/**
 * Mapping of body parts to the bone they should be skinned to
 */
const BODY_PART_BONES: Record<BodyPartName, BoneName> = {
  head: 'Head',
  torso: 'Chest',
  upperArmL: 'UpperArmL',
  upperArmR: 'UpperArmR',
  lowerArmL: 'LowerArmL',
  lowerArmR: 'LowerArmR',
  handL: 'HandL',
  handR: 'HandR',
  upperLegL: 'UpperLegL',
  upperLegR: 'UpperLegR',
  lowerLegL: 'LowerLegL',
  lowerLegR: 'LowerLegR',
  footL: 'FootL',
  footR: 'FootR'
}

/**
 * Body part mesh creation configuration
 */
interface BodyPartConfig {
  create: (scene: Scene, name: string) => Mesh
  material: 'skin' | 'shirt' | 'pants'
  offset: Vector3 // Offset from bone rest position
}

/**
 * Low-poly tessellation for OSRS style
 */
const LOW_POLY_TESSELLATION = 8

/**
 * Body part creation configurations
 * Sizes are set to overlap slightly at joints for seamless appearance
 */
const BODY_PART_CONFIGS: Record<BodyPartName, BodyPartConfig> = {
  // Head - sphere
  head: {
    create: (scene, name) =>
      MeshBuilder.CreateSphere(name, {
        diameter: 0.3,
        segments: LOW_POLY_TESSELLATION
      }, scene),
    material: 'skin',
    offset: new Vector3(0, 0.05, 0)
  },

  // Torso - tall cylinder that covers from chest down to hips
  torso: {
    create: (scene, name) =>
      MeshBuilder.CreateCylinder(name, {
        height: 0.55,
        diameterTop: 0.38,
        diameterBottom: 0.32,
        tessellation: LOW_POLY_TESSELLATION
      }, scene),
    material: 'shirt',
    offset: new Vector3(0, -0.15, 0)
  },

  // Upper arms - longer cylinders that connect shoulder to elbow
  upperArmL: {
    create: (scene, name) =>
      MeshBuilder.CreateCylinder(name, {
        height: 0.28,
        diameterTop: 0.12,
        diameterBottom: 0.10,
        tessellation: 6
      }, scene),
    material: 'shirt',
    offset: new Vector3(0, -0.12, 0)
  },
  upperArmR: {
    create: (scene, name) =>
      MeshBuilder.CreateCylinder(name, {
        height: 0.28,
        diameterTop: 0.12,
        diameterBottom: 0.10,
        tessellation: 6
      }, scene),
    material: 'shirt',
    offset: new Vector3(0, -0.12, 0)
  },

  // Lower arms (forearms) - connect elbow to wrist
  lowerArmL: {
    create: (scene, name) =>
      MeshBuilder.CreateCylinder(name, {
        height: 0.28,
        diameterTop: 0.10,
        diameterBottom: 0.08,
        tessellation: 6
      }, scene),
    material: 'skin',
    offset: new Vector3(0, -0.12, 0)
  },
  lowerArmR: {
    create: (scene, name) =>
      MeshBuilder.CreateCylinder(name, {
        height: 0.28,
        diameterTop: 0.10,
        diameterBottom: 0.08,
        tessellation: 6
      }, scene),
    material: 'skin',
    offset: new Vector3(0, -0.12, 0)
  },

  // Hands - small boxes attached to wrist
  handL: {
    create: (scene, name) =>
      MeshBuilder.CreateBox(name, {
        width: 0.07,
        height: 0.12,
        depth: 0.05
      }, scene),
    material: 'skin',
    offset: new Vector3(0, -0.04, 0)
  },
  handR: {
    create: (scene, name) =>
      MeshBuilder.CreateBox(name, {
        width: 0.07,
        height: 0.12,
        depth: 0.05
      }, scene),
    material: 'skin',
    offset: new Vector3(0, -0.04, 0)
  },

  // Upper legs (thighs) - connect hips to knees
  upperLegL: {
    create: (scene, name) =>
      MeshBuilder.CreateCylinder(name, {
        height: 0.44,
        diameterTop: 0.16,
        diameterBottom: 0.12,
        tessellation: LOW_POLY_TESSELLATION
      }, scene),
    material: 'pants',
    offset: new Vector3(0, -0.20, 0)
  },
  upperLegR: {
    create: (scene, name) =>
      MeshBuilder.CreateCylinder(name, {
        height: 0.44,
        diameterTop: 0.16,
        diameterBottom: 0.12,
        tessellation: LOW_POLY_TESSELLATION
      }, scene),
    material: 'pants',
    offset: new Vector3(0, -0.20, 0)
  },

  // Lower legs (shins) - connect knees to ankles
  lowerLegL: {
    create: (scene, name) =>
      MeshBuilder.CreateCylinder(name, {
        height: 0.44,
        diameterTop: 0.12,
        diameterBottom: 0.09,
        tessellation: LOW_POLY_TESSELLATION
      }, scene),
    material: 'pants',
    offset: new Vector3(0, -0.20, 0)
  },
  lowerLegR: {
    create: (scene, name) =>
      MeshBuilder.CreateCylinder(name, {
        height: 0.44,
        diameterTop: 0.12,
        diameterBottom: 0.09,
        tessellation: LOW_POLY_TESSELLATION
      }, scene),
    material: 'pants',
    offset: new Vector3(0, -0.20, 0)
  },

  // Feet - flattened boxes at ankles
  footL: {
    create: (scene, name) =>
      MeshBuilder.CreateBox(name, {
        width: 0.10,
        height: 0.08,
        depth: 0.18
      }, scene),
    material: 'pants',
    offset: new Vector3(0, -0.02, 0.04)
  },
  footR: {
    create: (scene, name) =>
      MeshBuilder.CreateBox(name, {
        width: 0.10,
        height: 0.08,
        depth: 0.18
      }, scene),
    material: 'pants',
    offset: new Vector3(0, -0.02, 0.04)
  }
}

/**
 * List of all body part names for iteration
 */
export const ALL_BODY_PARTS: BodyPartName[] = [
  'head',
  'torso',
  'upperArmL',
  'upperArmR',
  'lowerArmL',
  'lowerArmR',
  'handL',
  'handR',
  'upperLegL',
  'upperLegR',
  'lowerLegL',
  'lowerLegR',
  'footL',
  'footR'
]

/**
 * CharacterMeshBuilder creates skinned body part meshes
 */
export class CharacterMeshBuilder {
  private scene: Scene
  private skeletonResult: CharacterSkeletonResult

  constructor(scene: Scene, skeletonResult: CharacterSkeletonResult) {
    this.scene = scene
    this.skeletonResult = skeletonResult
  }

  /**
   * Creates a single body part mesh with skinning applied
   */
  createBodyPart(partName: BodyPartName, prefix: string = ''): Mesh {
    const config = BODY_PART_CONFIGS[partName]
    const boneName = BODY_PART_BONES[partName]
    const meshName = prefix ? `${prefix}_${partName}` : partName

    // Create the mesh
    const mesh = config.create(this.scene, meshName)

    // Get bone rest position and apply offset
    const bonePos = getBoneRestPosition(this.skeletonResult.bones, boneName)
    mesh.position.copyFrom(bonePos.add(config.offset))

    // IMPORTANT: Bake the position into vertices, then reset position to origin
    // This is required for skinning to work correctly - skinning transforms vertices
    // from their baked positions, so we can't also have mesh.position set
    mesh.bakeCurrentTransformIntoVertices()

    // Apply material
    const res = SharedResources.get()
    switch (config.material) {
      case 'skin':
        mesh.material = res.playerSkinMaterial
        break
      case 'shirt':
        mesh.material = res.playerBodyMaterial
        break
      case 'pants':
        mesh.material = res.getMaterial('characterPants', new Color3(0.25, 0.2, 0.15))
        break
    }

    // Apply rigid skinning to the bone
    applySkinning(mesh, this.skeletonResult.skeleton, boneName)

    return mesh
  }

  /**
   * Creates all body parts and returns them as a map
   */
  createAllBodyParts(prefix: string = ''): Map<BodyPartName, Mesh> {
    const parts = new Map<BodyPartName, Mesh>()

    for (const partName of ALL_BODY_PARTS) {
      const mesh = this.createBodyPart(partName, prefix)
      parts.set(partName, mesh)
    }

    return parts
  }

  /**
   * Get the bone associated with a body part
   */
  static getBoneForPart(partName: BodyPartName): BoneName {
    return BODY_PART_BONES[partName]
  }
}
