/**
 * CharacterAnimator - Procedural skeletal animation system
 *
 * Animates the character skeleton with procedural keyframe animations.
 * Supports idle, walk, and attack animations that blend smoothly.
 */

import { Bone, Vector3, Quaternion } from '@babylonjs/core'
import { CharacterSkeletonResult, BoneName } from './CharacterSkeleton'

/**
 * Animation types supported by the animator
 */
export type AnimationType = 'idle' | 'walk' | 'attack'

/**
 * Bone rotation state for blending
 */
interface BoneState {
  rotation: Quaternion
}

/**
 * CharacterAnimator handles all procedural animations
 */
export class CharacterAnimator {
  private skeletonResult: CharacterSkeletonResult
  private currentAnimation: AnimationType = 'idle'
  private animationTime: number = 0
  private animationSpeed: number = 1

  // For attack animation
  private isAttacking: boolean = false
  private attackTime: number = 0
  private attackDuration: number = 0.4 // seconds
  private onAttackComplete?: () => void

  // Animation parameters
  private readonly WALK_CYCLE_SPEED = 8 // How fast legs/arms swing
  private readonly IDLE_CYCLE_SPEED = 1.5 // Subtle idle movement

  constructor(skeletonResult: CharacterSkeletonResult) {
    this.skeletonResult = skeletonResult
  }

  /**
   * Play an animation
   */
  play(animation: AnimationType, speed: number = 1): void {
    if (animation === 'attack') {
      this.startAttack()
      return
    }

    if (this.currentAnimation !== animation) {
      this.currentAnimation = animation
      this.animationTime = 0
    }
    this.animationSpeed = speed
  }

  /**
   * Start an attack animation (plays once, then returns to previous state)
   */
  startAttack(onComplete?: () => void): void {
    this.isAttacking = true
    this.attackTime = 0
    this.onAttackComplete = onComplete
  }

  /**
   * Update animations - call every frame
   */
  update(deltaTime: number): void {
    this.animationTime += deltaTime * this.animationSpeed

    // Handle attack animation (overrides other animations)
    if (this.isAttacking) {
      this.attackTime += deltaTime
      this.applyAttackAnimation(this.attackTime / this.attackDuration)

      if (this.attackTime >= this.attackDuration) {
        this.isAttacking = false
        this.attackTime = 0
        this.onAttackComplete?.()
      }
      return
    }

    // Apply current animation
    switch (this.currentAnimation) {
      case 'idle':
        this.applyIdleAnimation(this.animationTime)
        break
      case 'walk':
        this.applyWalkAnimation(this.animationTime)
        break
    }
  }

  /**
   * Get a bone by name
   */
  private getBone(name: BoneName): Bone | undefined {
    return this.skeletonResult.bones.get(name)
  }

  /**
   * Set bone rotation using euler angles (in radians)
   */
  private setBoneRotation(name: BoneName, x: number, y: number, z: number): void {
    const bone = this.getBone(name)
    if (bone) {
      bone.setRotation(new Vector3(x, y, z))
    }
  }

  /**
   * Idle animation - subtle breathing and weight shifting
   */
  private applyIdleAnimation(time: number): void {
    const t = time * this.IDLE_CYCLE_SPEED

    // Subtle spine breathing motion
    const breathe = Math.sin(t) * 0.02
    this.setBoneRotation('Spine', breathe, 0, 0)
    this.setBoneRotation('Chest', breathe * 0.5, 0, 0)

    // Subtle head movement
    const headSway = Math.sin(t * 0.7) * 0.03
    this.setBoneRotation('Head', 0, headSway, 0)

    // Arms relaxed at sides with subtle sway
    const armSway = Math.sin(t * 0.8) * 0.02
    this.setBoneRotation('UpperArmL', 0.1 + armSway, 0, 0.15)
    this.setBoneRotation('UpperArmR', 0.1 - armSway, 0, -0.15)
    this.setBoneRotation('LowerArmL', 0.05, 0, 0)
    this.setBoneRotation('LowerArmR', 0.05, 0, 0)

    // Legs straight
    this.setBoneRotation('UpperLegL', 0, 0, 0)
    this.setBoneRotation('UpperLegR', 0, 0, 0)
    this.setBoneRotation('LowerLegL', 0, 0, 0)
    this.setBoneRotation('LowerLegR', 0, 0, 0)

    // Subtle weight shift in hips
    const hipShift = Math.sin(t * 0.5) * 0.01
    this.setBoneRotation('Hips', 0, hipShift, 0)
  }

  /**
   * Walk animation - arms and legs swing opposite to each other
   */
  private applyWalkAnimation(time: number): void {
    const t = time * this.WALK_CYCLE_SPEED

    // Leg swing - opposite phase
    const legSwing = Math.sin(t) * 0.5 // About 30 degrees
    const kneeSwing = Math.max(0, -Math.sin(t)) * 0.6 // Knee bends on back swing

    // Left leg
    this.setBoneRotation('UpperLegL', legSwing, 0, 0)
    this.setBoneRotation('LowerLegL', Math.max(0, -legSwing) * 0.8, 0, 0)

    // Right leg (opposite phase)
    this.setBoneRotation('UpperLegR', -legSwing, 0, 0)
    this.setBoneRotation('LowerLegR', Math.max(0, legSwing) * 0.8, 0, 0)

    // Arm swing - opposite to legs
    const armSwing = Math.sin(t) * 0.4

    // Left arm (opposite to left leg)
    this.setBoneRotation('UpperArmL', -armSwing, 0, 0.1)
    this.setBoneRotation('LowerArmL', Math.max(0, armSwing) * 0.3, 0, 0)

    // Right arm (opposite to right leg)
    this.setBoneRotation('UpperArmR', armSwing, 0, -0.1)
    this.setBoneRotation('LowerArmR', Math.max(0, -armSwing) * 0.3, 0, 0)

    // Torso twist (subtle counter-rotation)
    const torsoTwist = Math.sin(t) * 0.05
    this.setBoneRotation('Spine', 0.05, torsoTwist, 0)
    this.setBoneRotation('Chest', 0, -torsoTwist * 0.5, 0)

    // Hip sway
    const hipSway = Math.sin(t * 2) * 0.03
    this.setBoneRotation('Hips', 0, 0, hipSway)

    // Head stays relatively stable
    this.setBoneRotation('Head', -0.05, 0, 0)
  }

  /**
   * Attack animation - right arm swings weapon
   */
  private applyAttackAnimation(progress: number): void {
    // Use easing for more natural motion
    const easeOut = 1 - Math.pow(1 - progress, 3)
    const easeIn = Math.pow(progress, 2)

    // Phases: wind up (0-0.3), swing (0.3-0.6), follow through (0.6-1.0)
    let armRotX: number
    let armRotY: number
    let torsoRotY: number

    if (progress < 0.3) {
      // Wind up - arm goes back
      const windUp = progress / 0.3
      armRotX = -0.5 * windUp // Arm back
      armRotY = 0.3 * windUp // Arm out
      torsoRotY = -0.2 * windUp // Twist back
    } else if (progress < 0.6) {
      // Swing - arm comes forward fast
      const swing = (progress - 0.3) / 0.3
      const easeSwing = 1 - Math.pow(1 - swing, 2)
      armRotX = -0.5 + 1.5 * easeSwing // Arm forward
      armRotY = 0.3 - 0.6 * easeSwing // Arm across
      torsoRotY = -0.2 + 0.5 * easeSwing // Twist forward
    } else {
      // Follow through - return to neutral
      const followThrough = (progress - 0.6) / 0.4
      armRotX = 1.0 * (1 - followThrough)
      armRotY = -0.3 * (1 - followThrough)
      torsoRotY = 0.3 * (1 - followThrough)
    }

    // Apply attack pose
    this.setBoneRotation('UpperArmR', armRotX, armRotY, -0.3)
    this.setBoneRotation('LowerArmR', -0.5, 0, 0) // Elbow bent

    // Torso rotation
    this.setBoneRotation('Spine', 0, torsoRotY * 0.5, 0)
    this.setBoneRotation('Chest', 0, torsoRotY, 0)

    // Left arm for balance
    this.setBoneRotation('UpperArmL', 0.2, -torsoRotY * 0.3, 0.2)

    // Legs planted
    this.setBoneRotation('UpperLegL', 0.1, 0, 0)
    this.setBoneRotation('UpperLegR', -0.1, 0, 0)
    this.setBoneRotation('LowerLegL', 0.1, 0, 0)
    this.setBoneRotation('LowerLegR', 0.1, 0, 0)

    // Weight forward
    this.setBoneRotation('Hips', 0.05, torsoRotY * 0.3, 0)
  }

  /**
   * Check if currently playing attack animation
   */
  isPlayingAttack(): boolean {
    return this.isAttacking
  }

  /**
   * Get current animation type
   */
  getCurrentAnimation(): AnimationType {
    return this.isAttacking ? 'attack' : this.currentAnimation
  }

  /**
   * Reset all bones to rest pose
   */
  resetToRestPose(): void {
    for (const bone of this.skeletonResult.bones.values()) {
      bone.setRotation(Vector3.Zero())
    }
  }
}
