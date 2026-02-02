/**
 * VeilCreatureEntity - Renders Veil-specific creatures with bioluminescent effects
 *
 * These creatures have unique visual properties:
 * - Glowing materials with pulsing effects
 * - Floating/hovering animation
 * - Ethereal particle effects
 * - Semi-transparency for some types
 */

import {
  Scene,
  Mesh,
  MeshBuilder,
  Vector3,
  TransformNode,
  Color3,
  ParticleSystem,
  Texture,
  Color4
} from '@babylonjs/core'
import { TextBlock, Rectangle, Control } from '@babylonjs/gui'
import { VeilCreatureType, VEIL_CREATURE_DEFINITIONS, VeilCreatureDefinition } from '@realm/shared'
import { SharedResources } from '../systems/SharedResources'
import { ShaderManager } from '../systems/ShaderManager'
import { PostProcessManager } from '../systems/PostProcessManager'

export class VeilCreatureEntity {
  private scene: Scene
  private root: TransformNode
  private bodyMesh: Mesh | null = null
  private glowParticles: ParticleSystem | null = null

  // Definition
  private definition: VeilCreatureDefinition
  private creatureType: VeilCreatureType

  // State
  private _position: { x: number; y: number } = { x: 0, y: 0 }
  private _currentHp: number
  private _maxHp: number
  private _isDead: boolean = false
  private targetId: string | null = null

  // Animation
  private floatOffset: number = 0
  private floatSpeed: number = 2
  private pulseTime: number = 0
  private baseY: number = 0

  // UI elements
  private healthBarContainer: Rectangle | null = null
  private healthBarFill: Rectangle | null = null
  private nameLabel: TextBlock | null = null

  // Height provider
  private heightProvider?: (tileX: number, tileY: number) => number

  constructor(
    id: string,
    creatureType: VeilCreatureType,
    position: { x: number; y: number },
    scene: Scene
  ) {
    this.scene = scene
    this.creatureType = creatureType
    this.definition = VEIL_CREATURE_DEFINITIONS[creatureType]
    this._position = position
    this._currentHp = this.definition.hitpoints
    this._maxHp = this.definition.hitpoints

    // Create root transform
    this.root = new TransformNode(`veilCreature_${id}`, scene)

    // Random float offset for variety
    this.floatOffset = Math.random() * Math.PI * 2
    this.floatSpeed = 1.5 + Math.random() * 1.0

    this.createMesh()
    this.createUI()

    if (this.definition.floats) {
      this.createGlowParticles()
    }

    this.updatePosition()
  }

  /**
   * Create the creature mesh with glow material
   */
  private createMesh(): void {
    let shaderManager: ShaderManager | null = null
    try {
      shaderManager = ShaderManager.getInstance()
    } catch {
      // Shader manager not available
    }

    const baseColor = Color3.FromHexString(this.definition.baseColor)
    const glowColor = Color3.FromHexString(this.definition.glowColor)

    // Create body based on creature type
    switch (this.creatureType) {
      case VeilCreatureType.WISP:
        this.createWispMesh(shaderManager, baseColor, glowColor)
        break
      case VeilCreatureType.LUMINOUS_MOTH:
        this.createMothMesh(shaderManager, baseColor, glowColor)
        break
      case VeilCreatureType.SHADE:
        this.createShadeMesh(shaderManager, baseColor, glowColor)
        break
      case VeilCreatureType.CRYSTAL_GOLEM:
        this.createGolemMesh(shaderManager, baseColor, glowColor)
        break
      case VeilCreatureType.VEIL_STALKER:
        this.createStalkerMesh(shaderManager, baseColor, glowColor)
        break
      case VeilCreatureType.VOID_WEAVER:
        this.createWeaverMesh(shaderManager, baseColor, glowColor)
        break
      case VeilCreatureType.LUMINARCH:
        this.createLuminarchMesh(shaderManager, baseColor, glowColor)
        break
      case VeilCreatureType.VOID_HORROR:
        this.createVoidHorrorMesh(shaderManager, baseColor, glowColor)
        break
      default:
        this.createDefaultMesh(shaderManager, baseColor, glowColor)
    }

    // Apply scale
    if (this.bodyMesh) {
      this.bodyMesh.scaling = new Vector3(
        this.definition.size,
        this.definition.size,
        this.definition.size
      )
    }

    // Add to glow layer
    try {
      const postProcess = PostProcessManager.getInstance()
      const glowLayer = postProcess.getGlowLayer()
      if (glowLayer && this.bodyMesh) {
        glowLayer.addIncludedOnlyMesh(this.bodyMesh)
      }
    } catch {
      // Post-process manager not available
    }
  }

  /**
   * Wisp - Simple glowing orb
   */
  private createWispMesh(
    shaderManager: ShaderManager | null,
    baseColor: Color3,
    glowColor: Color3
  ): void {
    this.bodyMesh = MeshBuilder.CreateSphere(
      `wisp_body_${this.root.name}`,
      { diameter: 0.4, segments: 12 },
      this.scene
    )

    if (shaderManager) {
      this.bodyMesh.material = shaderManager.createGlowMaterial(
        `wisp_mat_${this.root.name}`,
        baseColor,
        glowColor,
        1.5,
        { pulseSpeed: 3.0 }
      )
    } else {
      const res = SharedResources.get()
      this.bodyMesh.material = res.getStandardMaterial('wisp', baseColor, {
        emissive: glowColor
      })
    }

    this.bodyMesh.parent = this.root
  }

  /**
   * Luminous Moth - Wings and body
   */
  private createMothMesh(
    shaderManager: ShaderManager | null,
    baseColor: Color3,
    glowColor: Color3
  ): void {
    // Body
    this.bodyMesh = MeshBuilder.CreateCapsule(
      `moth_body_${this.root.name}`,
      { height: 0.3, radius: 0.08 },
      this.scene
    )

    // Wings (simple triangles)
    const wing1 = MeshBuilder.CreateDisc(
      `moth_wing1_${this.root.name}`,
      { radius: 0.25, tessellation: 3 },
      this.scene
    )
    wing1.rotation.x = Math.PI / 2
    wing1.rotation.y = Math.PI / 4
    wing1.position.set(0.1, 0, 0)
    wing1.parent = this.bodyMesh

    const wing2 = MeshBuilder.CreateDisc(
      `moth_wing2_${this.root.name}`,
      { radius: 0.25, tessellation: 3 },
      this.scene
    )
    wing2.rotation.x = Math.PI / 2
    wing2.rotation.y = -Math.PI / 4
    wing2.position.set(-0.1, 0, 0)
    wing2.parent = this.bodyMesh

    if (shaderManager) {
      const mat = shaderManager.createGlowMaterial(
        `moth_mat_${this.root.name}`,
        baseColor,
        glowColor,
        1.2,
        { pulseSpeed: 4.0 }
      )
      this.bodyMesh.material = mat
      wing1.material = mat
      wing2.material = mat
    }

    this.bodyMesh.parent = this.root
  }

  /**
   * Shade - Dark ethereal humanoid
   */
  private createShadeMesh(
    shaderManager: ShaderManager | null,
    baseColor: Color3,
    glowColor: Color3
  ): void {
    // Hooded figure shape
    this.bodyMesh = MeshBuilder.CreateCylinder(
      `shade_body_${this.root.name}`,
      { height: 1.2, diameterTop: 0.2, diameterBottom: 0.6, tessellation: 8 },
      this.scene
    )

    // Head/hood
    const head = MeshBuilder.CreateSphere(
      `shade_head_${this.root.name}`,
      { diameter: 0.35, segments: 8 },
      this.scene
    )
    head.position.y = 0.6
    head.parent = this.bodyMesh

    if (shaderManager) {
      const mat = shaderManager.createGlowMaterial(
        `shade_mat_${this.root.name}`,
        baseColor,
        glowColor,
        0.5,
        { pulseSpeed: 1.5 }
      )
      this.bodyMesh.material = mat
      head.material = mat
    }

    this.bodyMesh.parent = this.root
  }

  /**
   * Crystal Golem - Large crystalline body
   */
  private createGolemMesh(
    shaderManager: ShaderManager | null,
    baseColor: Color3,
    glowColor: Color3
  ): void {
    // Body - large icosahedron
    this.bodyMesh = MeshBuilder.CreatePolyhedron(
      `golem_body_${this.root.name}`,
      { type: 3, size: 0.5 },
      this.scene
    )

    // Crystal spikes
    for (let i = 0; i < 4; i++) {
      const spike = MeshBuilder.CreateCylinder(
        `golem_spike_${i}_${this.root.name}`,
        { height: 0.4, diameterTop: 0, diameterBottom: 0.15, tessellation: 6 },
        this.scene
      )
      spike.rotation.z = Math.PI / 4 + (i * Math.PI) / 2
      spike.rotation.x = Math.PI / 6
      spike.position.y = 0.2
      spike.parent = this.bodyMesh
    }

    if (shaderManager) {
      this.bodyMesh.material = shaderManager.createCrystalMaterial(
        `golem_mat_${this.root.name}`,
        glowColor,
        { transparency: 0.7 }
      )
    }

    this.bodyMesh.parent = this.root
  }

  /**
   * Veil Stalker - Predatory quadruped
   */
  private createStalkerMesh(
    shaderManager: ShaderManager | null,
    baseColor: Color3,
    glowColor: Color3
  ): void {
    // Body
    this.bodyMesh = MeshBuilder.CreateBox(
      `stalker_body_${this.root.name}`,
      { width: 0.6, height: 0.35, depth: 1.0 },
      this.scene
    )

    // Head
    const head = MeshBuilder.CreateBox(
      `stalker_head_${this.root.name}`,
      { width: 0.3, height: 0.25, depth: 0.35 },
      this.scene
    )
    head.position.set(0, 0.1, 0.5)
    head.parent = this.bodyMesh

    // Legs
    for (let i = 0; i < 4; i++) {
      const leg = MeshBuilder.CreateCylinder(
        `stalker_leg_${i}_${this.root.name}`,
        { height: 0.4, diameter: 0.08 },
        this.scene
      )
      const x = (i % 2 === 0 ? 1 : -1) * 0.25
      const z = (i < 2 ? 1 : -1) * 0.35
      leg.position.set(x, -0.35, z)
      leg.parent = this.bodyMesh
    }

    if (shaderManager) {
      const mat = shaderManager.createGlowMaterial(
        `stalker_mat_${this.root.name}`,
        baseColor,
        glowColor,
        0.8,
        { pulseSpeed: 2.0 }
      )
      this.bodyMesh.material = mat
      head.material = mat
    }

    this.bodyMesh.parent = this.root
  }

  /**
   * Void Weaver - Floating magical creature
   */
  private createWeaverMesh(
    shaderManager: ShaderManager | null,
    baseColor: Color3,
    glowColor: Color3
  ): void {
    // Central orb
    this.bodyMesh = MeshBuilder.CreateSphere(
      `weaver_core_${this.root.name}`,
      { diameter: 0.4, segments: 12 },
      this.scene
    )

    // Orbiting rings
    for (let i = 0; i < 3; i++) {
      const ring = MeshBuilder.CreateTorus(
        `weaver_ring_${i}_${this.root.name}`,
        { diameter: 0.6 + i * 0.15, thickness: 0.03, tessellation: 24 },
        this.scene
      )
      ring.rotation.x = Math.PI / 4 + (i * Math.PI) / 6
      ring.rotation.y = (i * Math.PI) / 3
      ring.parent = this.bodyMesh
    }

    if (shaderManager) {
      this.bodyMesh.material = shaderManager.createGlowMaterial(
        `weaver_mat_${this.root.name}`,
        baseColor,
        glowColor,
        1.5,
        { pulseSpeed: 2.5 }
      )
    }

    this.bodyMesh.parent = this.root
  }

  /**
   * Luminarch - Humanoid light being (mini-boss)
   */
  private createLuminarchMesh(
    shaderManager: ShaderManager | null,
    baseColor: Color3,
    glowColor: Color3
  ): void {
    // Humanoid body
    this.bodyMesh = MeshBuilder.CreateCapsule(
      `luminarch_body_${this.root.name}`,
      { height: 1.5, radius: 0.25 },
      this.scene
    )

    // Crown/halo
    const halo = MeshBuilder.CreateTorus(
      `luminarch_halo_${this.root.name}`,
      { diameter: 0.5, thickness: 0.05, tessellation: 32 },
      this.scene
    )
    halo.rotation.x = Math.PI / 2
    halo.position.y = 0.9
    halo.parent = this.bodyMesh

    // Wings (light shapes)
    for (let side = -1; side <= 1; side += 2) {
      const wing = MeshBuilder.CreateDisc(
        `luminarch_wing_${side}_${this.root.name}`,
        { radius: 0.8, tessellation: 6 },
        this.scene
      )
      wing.rotation.y = (side * Math.PI) / 3
      wing.position.set(side * 0.4, 0.3, -0.2)
      wing.parent = this.bodyMesh
    }

    if (shaderManager) {
      const mat = shaderManager.createGlowMaterial(
        `luminarch_mat_${this.root.name}`,
        baseColor,
        glowColor,
        2.0,
        { pulseSpeed: 1.5 }
      )
      this.bodyMesh.material = mat
      halo.material = mat
    }

    this.bodyMesh.parent = this.root
  }

  /**
   * Void Horror - Massive tentacled boss
   */
  private createVoidHorrorMesh(
    shaderManager: ShaderManager | null,
    baseColor: Color3,
    glowColor: Color3
  ): void {
    // Central mass
    this.bodyMesh = MeshBuilder.CreateSphere(
      `horror_core_${this.root.name}`,
      { diameter: 1.5, segments: 16 },
      this.scene
    )

    // Eye
    const eye = MeshBuilder.CreateSphere(
      `horror_eye_${this.root.name}`,
      { diameter: 0.5, segments: 12 },
      this.scene
    )
    eye.position.z = 0.7
    eye.parent = this.bodyMesh

    // Tentacles
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8
      const tentacle = MeshBuilder.CreateCylinder(
        `horror_tentacle_${i}_${this.root.name}`,
        { height: 1.5, diameterTop: 0.05, diameterBottom: 0.2, tessellation: 8 },
        this.scene
      )
      tentacle.rotation.x = Math.PI / 3
      tentacle.rotation.y = angle
      tentacle.position.set(
        Math.sin(angle) * 0.6,
        -0.5,
        Math.cos(angle) * 0.6
      )
      tentacle.parent = this.bodyMesh
    }

    if (shaderManager) {
      const mat = shaderManager.createGlowMaterial(
        `horror_mat_${this.root.name}`,
        baseColor,
        glowColor,
        1.0,
        { pulseSpeed: 0.8 }
      )
      this.bodyMesh.material = mat

      // Eye uses different color
      eye.material = shaderManager.createGlowMaterial(
        `horror_eye_mat_${this.root.name}`,
        new Color3(1, 0.2, 0.4),
        new Color3(1, 0, 0.5),
        2.0,
        { pulseSpeed: 1.5 }
      )
    }

    this.bodyMesh.parent = this.root
  }

  /**
   * Default mesh for unimplemented types
   */
  private createDefaultMesh(
    shaderManager: ShaderManager | null,
    baseColor: Color3,
    glowColor: Color3
  ): void {
    this.bodyMesh = MeshBuilder.CreateSphere(
      `veil_default_${this.root.name}`,
      { diameter: 0.5, segments: 12 },
      this.scene
    )

    if (shaderManager) {
      this.bodyMesh.material = shaderManager.createGlowMaterial(
        `veil_default_mat_${this.root.name}`,
        baseColor,
        glowColor,
        1.0
      )
    }

    this.bodyMesh.parent = this.root
  }

  /**
   * Create glow particles for floating creatures
   */
  private createGlowParticles(): void {
    if (!this.bodyMesh) return

    this.glowParticles = new ParticleSystem(
      `veil_particles_${this.root.name}`,
      20,
      this.scene
    )

    this.glowParticles.particleTexture = new Texture(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAGklEQVQYV2P8////fwYGBgZGRkZGEGZgYGAAAA1OAgF+vMtUAAAAAElFTkSuQmCC',
      this.scene
    )

    this.glowParticles.emitter = this.bodyMesh
    this.glowParticles.minEmitBox = new Vector3(-0.2, -0.2, -0.2)
    this.glowParticles.maxEmitBox = new Vector3(0.2, 0.2, 0.2)

    const glowColor = Color3.FromHexString(this.definition.glowColor)
    this.glowParticles.color1 = new Color4(glowColor.r, glowColor.g, glowColor.b, 0.6)
    this.glowParticles.color2 = new Color4(glowColor.r, glowColor.g, glowColor.b, 0.3)
    this.glowParticles.colorDead = new Color4(glowColor.r, glowColor.g, glowColor.b, 0)

    this.glowParticles.minSize = 0.02
    this.glowParticles.maxSize = 0.06
    this.glowParticles.minLifeTime = 0.5
    this.glowParticles.maxLifeTime = 1.5
    this.glowParticles.emitRate = 10

    this.glowParticles.direction1 = new Vector3(-0.1, 0.1, -0.1)
    this.glowParticles.direction2 = new Vector3(0.1, 0.3, 0.1)
    this.glowParticles.minEmitPower = 0.02
    this.glowParticles.maxEmitPower = 0.05

    this.glowParticles.blendMode = ParticleSystem.BLENDMODE_ADD

    this.glowParticles.start()
  }

  /**
   * Create UI elements (health bar, name)
   */
  private createUI(): void {
    const res = SharedResources.get()

    // Name label
    this.nameLabel = res.createLabel(
      `veil_name_${this.root.name}`,
      this.definition.name,
      this.definition.glowColor
    )
    this.nameLabel.fontSize = 11
    this.nameLabel.linkOffsetY = -50

    // Health bar
    const { container, fill } = res.createHealthBar(`veil_hp_${this.root.name}`)
    this.healthBarContainer = container
    this.healthBarFill = fill
    fill.background = this.definition.glowColor

    this.updateUI()
  }

  /**
   * Update UI visibility and values
   */
  private updateUI(): void {
    if (this.nameLabel) {
      this.nameLabel.isVisible = !this._isDead
      if (this.bodyMesh) {
        this.nameLabel.linkWithMesh(this.bodyMesh)
      }
    }

    if (this.healthBarContainer && this.healthBarFill) {
      this.healthBarContainer.isVisible = !this._isDead
      if (this.bodyMesh) {
        this.healthBarContainer.linkWithMesh(this.bodyMesh)
        this.healthBarContainer.linkOffsetY = -35
      }

      const hpPercent = this._maxHp > 0 ? (this._currentHp / this._maxHp) * 100 : 0
      this.healthBarFill.width = `${hpPercent}%`

      // Color based on HP
      if (hpPercent > 50) {
        this.healthBarFill.background = '#22c55e'
      } else if (hpPercent > 25) {
        this.healthBarFill.background = '#eab308'
      } else {
        this.healthBarFill.background = '#ef4444'
      }
    }
  }

  /**
   * Update creature each frame
   */
  update(deltaTime: number): void {
    this.pulseTime += deltaTime

    // Floating animation
    if (this.definition.floats && !this._isDead) {
      const floatY = Math.sin(this.pulseTime * this.floatSpeed + this.floatOffset) * 0.15
      this.root.position.y = this.baseY + floatY + 0.5 // Base hover height
    }

    // Death animation
    if (this._isDead && this.bodyMesh) {
      this.bodyMesh.scaling.y *= 0.95
      if (this.bodyMesh.scaling.y < 0.1) {
        this.root.setEnabled(false)
      }
    }
  }

  /**
   * Set position
   */
  setPosition(x: number, y: number): void {
    this._position = { x, y }
    this.updatePosition()
  }

  private updatePosition(): void {
    const tileX = Math.floor(this._position.x / 32)
    const tileY = Math.floor(this._position.y / 32)
    const height = this.heightProvider?.(tileX, tileY) ?? 0

    this.baseY = height * 0.25
    this.root.position.x = this._position.x / 32 + 0.5
    this.root.position.z = this._position.y / 32 + 0.5
    this.root.position.y = this.baseY + (this.definition.floats ? 0.5 : 0)
  }

  /**
   * Set height provider
   */
  setHeightProvider(provider: (tileX: number, tileY: number) => number): void {
    this.heightProvider = provider
    this.updatePosition()
  }

  /**
   * Update HP
   */
  setHp(current: number, max: number): void {
    this._currentHp = current
    this._maxHp = max
    this.updateUI()
  }

  /**
   * Set dead state
   */
  setDead(isDead: boolean): void {
    this._isDead = isDead
    this.updateUI()

    if (isDead) {
      this.glowParticles?.stop()
    }
  }

  /**
   * Get position
   */
  getPosition(): { x: number; y: number } {
    return { ...this._position }
  }

  /**
   * Get if dead
   */
  get isDead(): boolean {
    return this._isDead
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    const res = SharedResources.get()

    res.removeControl(this.nameLabel)
    res.removeControl(this.healthBarContainer)
    this.glowParticles?.dispose()
    this.root.dispose()
  }
}
