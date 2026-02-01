/**
 * CharacterSkeleton - Canonical skeleton for all characters
 *
 * Creates a shared bone hierarchy that can be used by both player bodies
 * and equipment meshes. Uses rigid skinning (1 bone per vertex) for
 * performance and OSRS-style low-poly aesthetic.
 *
 * Bone hierarchy:
 * Root
 *  └─ Hips
 *      ├─ Spine
 *      │   └─ Chest
 *      │       ├─ Neck
 *      │       │   └─ Head
 *      │       ├─ ShoulderL
 *      │       │   └─ UpperArmL
 *      │       │       └─ LowerArmL
 *      │       │           └─ HandL
 *      │       └─ ShoulderR
 *      │           └─ UpperArmR
 *      │               └─ LowerArmR
 *      │                   └─ HandR
 *      ├─ UpperLegL
 *      │   └─ LowerLegL
 *      │       └─ FootL
 *      └─ UpperLegR
 *          └─ LowerLegR
 *              └─ FootR
 */

import { Skeleton, Bone, Matrix, Vector3, Scene, Mesh, VertexBuffer } from '@babylonjs/core'

// All possible bone names - used for type safety
export type BoneName =
  | 'Root'
  | 'Hips'
  | 'Spine'
  | 'Chest'
  | 'Neck'
  | 'Head'
  | 'ShoulderL'
  | 'UpperArmL'
  | 'LowerArmL'
  | 'HandL'
  | 'ShoulderR'
  | 'UpperArmR'
  | 'LowerArmR'
  | 'HandR'
  | 'UpperLegL'
  | 'LowerLegL'
  | 'FootL'
  | 'UpperLegR'
  | 'LowerLegR'
  | 'FootR'

export interface BoneDefinition {
  name: BoneName
  parent: BoneName | null
  localPosition: Vector3
}

/**
 * Canonical bone hierarchy with rest pose positions.
 * Character is ~1.8 units tall in rest pose.
 * Positions are LOCAL to parent bone.
 */
export const BONE_HIERARCHY: BoneDefinition[] = [
  // Root and core
  { name: 'Root', parent: null, localPosition: new Vector3(0, 0, 0) },
  { name: 'Hips', parent: 'Root', localPosition: new Vector3(0, 0.9, 0) },
  { name: 'Spine', parent: 'Hips', localPosition: new Vector3(0, 0.15, 0) },
  { name: 'Chest', parent: 'Spine', localPosition: new Vector3(0, 0.25, 0) },
  { name: 'Neck', parent: 'Chest', localPosition: new Vector3(0, 0.2, 0) },
  { name: 'Head', parent: 'Neck', localPosition: new Vector3(0, 0.15, 0) },

  // Left arm chain - positioned outside the torso
  { name: 'ShoulderL', parent: 'Chest', localPosition: new Vector3(-0.22, 0.12, 0) },
  { name: 'UpperArmL', parent: 'ShoulderL', localPosition: new Vector3(-0.05, -0.05, 0) },
  { name: 'LowerArmL', parent: 'UpperArmL', localPosition: new Vector3(0, -0.28, 0) },
  { name: 'HandL', parent: 'LowerArmL', localPosition: new Vector3(0, -0.28, 0) },

  // Right arm chain - positioned outside the torso
  { name: 'ShoulderR', parent: 'Chest', localPosition: new Vector3(0.22, 0.12, 0) },
  { name: 'UpperArmR', parent: 'ShoulderR', localPosition: new Vector3(0.05, -0.05, 0) },
  { name: 'LowerArmR', parent: 'UpperArmR', localPosition: new Vector3(0, -0.28, 0) },
  { name: 'HandR', parent: 'LowerArmR', localPosition: new Vector3(0, -0.28, 0) },

  // Left leg chain
  { name: 'UpperLegL', parent: 'Hips', localPosition: new Vector3(-0.1, -0.05, 0) },
  { name: 'LowerLegL', parent: 'UpperLegL', localPosition: new Vector3(0, -0.4, 0) },
  { name: 'FootL', parent: 'LowerLegL', localPosition: new Vector3(0, -0.4, 0.05) },

  // Right leg chain
  { name: 'UpperLegR', parent: 'Hips', localPosition: new Vector3(0.1, -0.05, 0) },
  { name: 'LowerLegR', parent: 'UpperLegR', localPosition: new Vector3(0, -0.4, 0) },
  { name: 'FootR', parent: 'LowerLegR', localPosition: new Vector3(0, -0.4, 0.05) }
]

/**
 * Result of creating a character skeleton
 */
export interface CharacterSkeletonResult {
  skeleton: Skeleton
  bones: Map<BoneName, Bone>
  getBoneIndex: (name: BoneName) => number
}

/**
 * Creates the canonical character skeleton.
 * All characters (players, NPCs) should use this same bone structure.
 */
export function createCharacterSkeleton(scene: Scene, id: string = 'character'): CharacterSkeletonResult {
  const skeleton = new Skeleton(`${id}Skeleton`, `${id}SkeletonId`, scene)
  const bones = new Map<BoneName, Bone>()

  // Create bones in order (parents before children)
  for (const def of BONE_HIERARCHY) {
    const parentBone = def.parent ? bones.get(def.parent) : undefined
    const localMatrix = Matrix.Translation(
      def.localPosition.x,
      def.localPosition.y,
      def.localPosition.z
    )

    const bone = new Bone(def.name, skeleton, parentBone, localMatrix, localMatrix.clone())
    bone.setBindMatrix(localMatrix.clone())
    bones.set(def.name, bone)
  }

  // Build index lookup (bone order in skeleton.bones array)
  const boneIndexMap = new Map<BoneName, number>()
  skeleton.bones.forEach((bone, index) => {
    boneIndexMap.set(bone.name as BoneName, index)
  })

  return {
    skeleton,
    bones,
    getBoneIndex: (name: BoneName) => {
      const idx = boneIndexMap.get(name)
      if (idx === undefined) {
        throw new Error(`Bone "${name}" not found in skeleton`)
      }
      return idx
    }
  }
}

/**
 * Applies rigid skinning to a mesh - binds all vertices to a single bone.
 * This is the simplest skinning approach where each vertex follows exactly one bone.
 *
 * @param mesh - The mesh to skin
 * @param skeleton - The skeleton to bind to
 * @param boneName - Which bone all vertices should follow
 */
export function applySkinning(
  mesh: Mesh,
  skeleton: Skeleton,
  boneName: BoneName
): void {
  const boneIndex = skeleton.bones.findIndex((b) => b.name === boneName)
  if (boneIndex === -1) {
    throw new Error(`Bone "${boneName}" not found in skeleton`)
  }

  applySkinningSingle(mesh, skeleton, boneIndex)
}

/**
 * Internal: applies skinning with a known bone index
 */
export function applySkinningSingle(mesh: Mesh, skeleton: Skeleton, boneIndex: number): void {
  const vertexCount = mesh.getTotalVertices()
  if (vertexCount === 0) {
    console.warn(`Mesh "${mesh.name}" has no vertices to skin`)
    return
  }

  // Babylon uses 4 bone influences per vertex
  // For rigid skinning: [boneIndex, 0, 0, 0] with weights [1, 0, 0, 0]
  const matricesIndices: number[] = []
  const matricesWeights: number[] = []

  for (let i = 0; i < vertexCount; i++) {
    matricesIndices.push(boneIndex, 0, 0, 0)
    matricesWeights.push(1, 0, 0, 0)
  }

  mesh.setVerticesData(VertexBuffer.MatricesIndicesKind, matricesIndices, false)
  mesh.setVerticesData(VertexBuffer.MatricesWeightsKind, matricesWeights, false)
  mesh.skeleton = skeleton
}

/**
 * Applies multi-bone skinning with custom weights per vertex.
 * Used for smoother deformation at joints (elbows, knees, etc.)
 *
 * @param mesh - The mesh to skin
 * @param skeleton - The skeleton to bind to
 * @param weights - Array of per-vertex weights, each containing up to 4 bone influences
 */
export interface VertexWeight {
  boneIndices: [number, number, number, number]
  weights: [number, number, number, number]
}

export function applySkinningWeighted(
  mesh: Mesh,
  skeleton: Skeleton,
  vertexWeights: VertexWeight[]
): void {
  const vertexCount = mesh.getTotalVertices()
  if (vertexWeights.length !== vertexCount) {
    throw new Error(
      `Weight array length (${vertexWeights.length}) doesn't match vertex count (${vertexCount})`
    )
  }

  const matricesIndices: number[] = []
  const matricesWeights: number[] = []

  for (const vw of vertexWeights) {
    matricesIndices.push(...vw.boneIndices)
    matricesWeights.push(...vw.weights)
  }

  mesh.setVerticesData(VertexBuffer.MatricesIndicesKind, matricesIndices, false)
  mesh.setVerticesData(VertexBuffer.MatricesWeightsKind, matricesWeights, false)
  mesh.skeleton = skeleton
}

/**
 * Mapping of equipment slots to the bones they attach to.
 * Equipment pieces are skinned to these bones and will move with them.
 */
export const EQUIPMENT_BONE_MAP: Record<string, BoneName> = {
  head: 'Head',
  body: 'Chest',
  legs: 'Hips',
  hands_left: 'HandL',
  hands_right: 'HandR',
  feet_left: 'FootL',
  feet_right: 'FootR',
  weapon: 'HandR',
  offhand: 'HandL'
}

/**
 * Pre-computed world positions for each bone in rest pose.
 * Computed from BONE_HIERARCHY to avoid issues with Babylon's bone matrix methods.
 */
function computeBoneRestPositions(): Map<BoneName, Vector3> {
  const positions = new Map<BoneName, Vector3>()

  for (const def of BONE_HIERARCHY) {
    if (def.parent === null) {
      positions.set(def.name, def.localPosition.clone())
    } else {
      const parentPos = positions.get(def.parent)
      if (!parentPos) {
        throw new Error(`Parent bone "${def.parent}" not found for "${def.name}"`)
      }
      positions.set(def.name, parentPos.add(def.localPosition))
    }
  }

  return positions
}

// Compute on module load
const BONE_REST_POSITIONS: Map<BoneName, Vector3> = computeBoneRestPositions()

/**
 * Returns the world-space position of a bone in its rest pose.
 * Useful for positioning body parts relative to bone locations.
 */
export function getBoneRestPosition(bones: Map<BoneName, Bone>, boneName: BoneName): Vector3 {
  const pos = BONE_REST_POSITIONS.get(boneName)
  if (!pos) {
    throw new Error(`Bone "${boneName}" not found`)
  }
  return pos.clone()
}

/**
 * Debug utility: Creates small spheres at each bone position to visualize the skeleton
 */
export function createSkeletonDebugView(
  scene: Scene,
  skeletonResult: CharacterSkeletonResult,
  MeshBuilder: typeof import('@babylonjs/core').MeshBuilder
): Mesh[] {
  const debugMeshes: Mesh[] = []

  for (const [name] of skeletonResult.bones) {
    const pos = getBoneRestPosition(skeletonResult.bones, name)
    const sphere = MeshBuilder.CreateSphere(`debug_${name}`, { diameter: 0.05 }, scene)
    sphere.position.copyFrom(pos)
    debugMeshes.push(sphere)
  }

  return debugMeshes
}
