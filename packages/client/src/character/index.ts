/**
 * Character system - Procedural characters with shared skeleton
 *
 * Exports:
 * - ProceduralCharacter: Main character class
 * - CharacterSkeleton utilities for creating/manipulating skeletons
 * - CharacterMeshBuilder for creating body parts
 * - CharacterEquipment for managing skinned equipment
 */

export { ProceduralCharacter, type ProceduralCharacterConfig } from './ProceduralCharacter'

export {
  createCharacterSkeleton,
  applySkinning,
  applySkinningSingle,
  applySkinningWeighted,
  getBoneRestPosition,
  createSkeletonDebugView,
  BONE_HIERARCHY,
  EQUIPMENT_BONE_MAP,
  type BoneName,
  type BoneDefinition,
  type CharacterSkeletonResult,
  type VertexWeight
} from './CharacterSkeleton'

export {
  CharacterMeshBuilder,
  ALL_BODY_PARTS,
  type BodyPartName
} from './CharacterMeshBuilder'

export {
  CharacterEquipment,
  EQUIPMENT_HIDE_RULES
} from './CharacterEquipment'

export {
  CharacterAnimator,
  type AnimationType
} from './CharacterAnimator'
