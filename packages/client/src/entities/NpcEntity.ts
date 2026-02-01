import {
  Scene,
  TransformNode,
  MeshBuilder,
  Mesh
} from '@babylonjs/core'
import { TextBlock, Rectangle } from '@babylonjs/gui'
import { NpcType, NPC_DEFINITIONS, TILE_SIZE } from '@realm/shared'
import { SharedResources } from '../systems/SharedResources'

export class NpcEntity {
  public id: string
  public npcType: NpcType
  public isDead: boolean = false

  private scene: Scene
  private node: TransformNode
  private meshes: Mesh[] = []

  private x: number
  private y: number
  private targetX: number
  private targetY: number
  private currentHp: number
  private maxHp: number
  private heightProvider: ((tileX: number, tileY: number) => number) | null = null
  private cachedTileX: number = -1
  private cachedTileY: number = -1
  private cachedHeightY: number = 0

  private nameLabel: TextBlock | null = null
  private healthBarContainer: Rectangle | null = null
  private healthBarFill: Rectangle | null = null
  private isHovered: boolean = false

  // Hit splat display
  private hitSplatLabel: TextBlock | null = null
  private hitSplatTimeout: ReturnType<typeof setTimeout> | null = null

  constructor(
    id: string,
    npcType: NpcType,
    x: number,
    y: number,
    currentHp: number,
    maxHp: number,
    scene: Scene
  ) {
    this.id = id
    this.npcType = npcType
    this.x = x
    this.y = y
    this.targetX = x
    this.targetY = y
    this.currentHp = currentHp
    this.maxHp = maxHp
    this.scene = scene
    this.node = new TransformNode('npc_' + id, scene)

    this.createNpc()
    this.createUI()
    this.updateNodePosition()
  }

  setHeightProvider(provider: (tileX: number, tileY: number) => number) {
    this.heightProvider = provider
    // Invalidate cache to force height recalculation with new provider
    this.cachedTileX = -1
    this.cachedTileY = -1
    this.updateNodePosition()
  }

  private createNpc() {
    this.clearMeshes()

    if (this.isDead) {
      return
    }

    switch (this.npcType) {
      case NpcType.CHICKEN:
        this.createChicken()
        break
      case NpcType.COW:
        this.createCow()
        break
      case NpcType.GOBLIN:
        this.createGoblin()
        break
      case NpcType.GIANT_RAT:
        this.createRat()
        break
      case NpcType.GUARD:
        this.createGuard()
        break
      default:
        this.createDefaultNpc()
    }
  }

  private createChicken() {
    const res = SharedResources.get()

    // Body (ellipsoid)
    const body = MeshBuilder.CreateSphere(
      'chickenBody_' + this.id,
      { diameterX: 0.4, diameterY: 0.35, diameterZ: 0.5, segments: 8 },
      this.scene
    )
    body.material = res.chickenMaterial
    body.position.y = 0.2
    body.parent = this.node
    this.meshes.push(body)

    // Head
    const head = MeshBuilder.CreateSphere(
      'chickenHead_' + this.id,
      { diameter: 0.2, segments: 8 },
      this.scene
    )
    head.material = res.chickenMaterial
    head.position.set(0, 0.4, 0.2)
    head.parent = this.node
    this.meshes.push(head)

    // Beak
    const beak = MeshBuilder.CreateCylinder(
      'chickenBeak_' + this.id,
      { height: 0.1, diameterTop: 0, diameterBottom: 0.06, tessellation: 6 },
      this.scene
    )
    beak.material = res.chickenBeakMaterial
    beak.rotation.x = Math.PI / 2
    beak.position.set(0, 0.4, 0.35)
    beak.parent = this.node
    this.meshes.push(beak)

    // Comb (red thing on head)
    const comb = MeshBuilder.CreateBox(
      'chickenComb_' + this.id,
      { width: 0.04, height: 0.1, depth: 0.1 },
      this.scene
    )
    comb.material = res.chickenCombMaterial
    comb.position.set(0, 0.5, 0.2)
    comb.parent = this.node
    this.meshes.push(comb)
  }

  private createCow() {
    const res = SharedResources.get()

    // Body (large box)
    const body = MeshBuilder.CreateBox(
      'cowBody_' + this.id,
      { width: 0.5, height: 0.5, depth: 0.8 },
      this.scene
    )
    body.material = res.cowMaterial
    body.position.y = 0.35
    body.parent = this.node
    this.meshes.push(body)

    // Head
    const head = MeshBuilder.CreateBox(
      'cowHead_' + this.id,
      { width: 0.25, height: 0.25, depth: 0.3 },
      this.scene
    )
    head.material = res.cowHeadMaterial
    head.position.set(0, 0.45, 0.5)
    head.parent = this.node
    this.meshes.push(head)

    // White spots
    const spot = MeshBuilder.CreateDisc(
      'cowSpot_' + this.id,
      { radius: 0.12, tessellation: 8 },
      this.scene
    )
    spot.material = res.cowSpotMaterial
    spot.rotation.y = Math.PI / 2
    spot.position.set(0.26, 0.4, 0)
    spot.parent = this.node
    this.meshes.push(spot)
  }

  private createGoblin() {
    const res = SharedResources.get()

    // Body (green) - using cylinder instead of capsule for compatibility
    const body = MeshBuilder.CreateCylinder(
      'goblinBody_' + this.id,
      { height: 0.4, diameterTop: 0.2, diameterBottom: 0.3, tessellation: 8 },
      this.scene
    )
    body.material = res.goblinMaterial
    body.position.y = 0.25
    body.parent = this.node
    this.meshes.push(body)

    // Head (green sphere)
    const head = MeshBuilder.CreateSphere(
      'goblinHead_' + this.id,
      { diameter: 0.3, segments: 8 },
      this.scene
    )
    head.material = res.goblinMaterial
    head.position.set(0, 0.55, 0)
    head.parent = this.node
    this.meshes.push(head)

    // Ears (pointy)
    const leftEar = MeshBuilder.CreateCylinder(
      'goblinLeftEar_' + this.id,
      { height: 0.18, diameterTop: 0, diameterBottom: 0.08, tessellation: 6 },
      this.scene
    )
    leftEar.material = res.goblinDarkMaterial
    leftEar.rotation.z = Math.PI / 4
    leftEar.position.set(-0.18, 0.7, 0)
    leftEar.parent = this.node
    this.meshes.push(leftEar)

    const rightEar = MeshBuilder.CreateCylinder(
      'goblinRightEar_' + this.id,
      { height: 0.18, diameterTop: 0, diameterBottom: 0.08, tessellation: 6 },
      this.scene
    )
    rightEar.material = res.goblinDarkMaterial
    rightEar.rotation.z = -Math.PI / 4
    rightEar.position.set(0.18, 0.7, 0)
    rightEar.parent = this.node
    this.meshes.push(rightEar)

    // Nose (small cone)
    const nose = MeshBuilder.CreateCylinder(
      'goblinNose_' + this.id,
      { height: 0.1, diameterTop: 0, diameterBottom: 0.06, tessellation: 6 },
      this.scene
    )
    nose.material = res.goblinDarkMaterial
    nose.rotation.x = Math.PI / 2
    nose.position.set(0, 0.55, 0.18)
    nose.parent = this.node
    this.meshes.push(nose)
  }

  private createRat() {
    const res = SharedResources.get()

    // Body
    const body = MeshBuilder.CreateSphere(
      'ratBody_' + this.id,
      { diameterX: 0.3, diameterY: 0.2, diameterZ: 0.5, segments: 8 },
      this.scene
    )
    body.material = res.ratMaterial
    body.position.y = 0.15
    body.parent = this.node
    this.meshes.push(body)

    // Head
    const head = MeshBuilder.CreateSphere(
      'ratHead_' + this.id,
      { diameterX: 0.15, diameterY: 0.12, diameterZ: 0.2, segments: 8 },
      this.scene
    )
    head.material = res.ratMaterial
    head.position.set(0, 0.15, 0.25)
    head.parent = this.node
    this.meshes.push(head)

    // Tail
    const tail = MeshBuilder.CreateCylinder(
      'ratTail_' + this.id,
      { height: 0.4, diameterTop: 0.01, diameterBottom: 0.03, tessellation: 6 },
      this.scene
    )
    tail.material = res.ratTailMaterial
    tail.rotation.x = Math.PI / 3
    tail.position.set(0, 0.1, -0.35)
    tail.parent = this.node
    this.meshes.push(tail)
  }

  private createGuard() {
    const res = SharedResources.get()

    // Legs (chainmail)
    const legs = MeshBuilder.CreateCylinder(
      'guardLegs_' + this.id,
      { height: 0.35, diameterTop: 0.22, diameterBottom: 0.18, tessellation: 8 },
      this.scene
    )
    legs.material = res.guardChainmailMaterial
    legs.position.y = 0.175
    legs.parent = this.node
    this.meshes.push(legs)

    // Torso (armored)
    const torso = MeshBuilder.CreateCylinder(
      'guardTorso_' + this.id,
      { height: 0.35, diameterTop: 0.18, diameterBottom: 0.28, tessellation: 8 },
      this.scene
    )
    torso.material = res.guardArmorMaterial
    torso.position.y = 0.525
    torso.parent = this.node
    this.meshes.push(torso)

    // Head
    const head = MeshBuilder.CreateSphere(
      'guardHead_' + this.id,
      { diameter: 0.2, segments: 8 },
      this.scene
    )
    head.material = res.playerSkinMaterial
    head.position.y = 0.8
    head.parent = this.node
    this.meshes.push(head)

    // Helmet
    const helmet = MeshBuilder.CreateSphere(
      'guardHelmet_' + this.id,
      { diameter: 0.24, segments: 8, slice: 0.5 },
      this.scene
    )
    helmet.material = res.guardHelmetMaterial
    helmet.position.y = 0.82
    helmet.rotation.x = Math.PI
    helmet.parent = this.node
    this.meshes.push(helmet)

    // Spear (pole)
    const spearPole = MeshBuilder.CreateCylinder(
      'guardSpearPole_' + this.id,
      { height: 1.2, diameter: 0.04, tessellation: 6 },
      this.scene
    )
    spearPole.material = res.trunkMaterial
    spearPole.position.set(0.25, 0.6, 0)
    spearPole.parent = this.node
    this.meshes.push(spearPole)

    // Spear tip
    const spearTip = MeshBuilder.CreateCylinder(
      'guardSpearTip_' + this.id,
      { height: 0.15, diameterTop: 0, diameterBottom: 0.06, tessellation: 6 },
      this.scene
    )
    spearTip.material = res.guardArmorMaterial
    spearTip.position.set(0.25, 1.25, 0)
    spearTip.parent = this.node
    this.meshes.push(spearTip)
  }

  private createDefaultNpc() {
    const res = SharedResources.get()

    const mesh = MeshBuilder.CreateBox('npc_' + this.id, { size: 0.4 }, this.scene)
    mesh.material = res.defaultNpcMaterial
    mesh.position.y = 0.2
    mesh.parent = this.node
    this.meshes.push(mesh)
  }

  private createUI() {
    const def = NPC_DEFINITIONS[this.npcType]
    if (!def) return

    const res = SharedResources.get()

    // Name label - use shared GUI
    const labelColor = def.aggroRange > 0 ? '#ff6b6b' : '#ffff00'
    this.nameLabel = res.createLabel(this.id, `${def.name} (lvl ${def.combatLevel})`, labelColor)
    this.nameLabel.fontSize = 11
    this.nameLabel.linkWithMesh(this.node)
    this.nameLabel.linkOffsetY = -70

    // Health bar - use shared GUI
    const healthBar = res.createHealthBar(this.id)
    this.healthBarContainer = healthBar.container
    this.healthBarFill = healthBar.fill
    this.healthBarContainer.linkWithMesh(this.node)
    this.healthBarContainer.linkOffsetY = -55

    // Hit splat - use shared GUI
    this.hitSplatLabel = res.createLabel('hitSplat_' + this.id, '', '#ff0000')
    this.hitSplatLabel.fontSize = 14
    this.hitSplatLabel.fontWeight = 'bold'
    this.hitSplatLabel.linkWithMesh(this.node)
    this.hitSplatLabel.linkOffsetY = -35

    this.updateHealthBar()
  }

  setHovered(isHovered: boolean) {
    this.isHovered = isHovered
    if (this.nameLabel) {
      this.nameLabel.isVisible = isHovered && !this.isDead
    }
    // Removed outline rendering for performance
  }

  private updateHealthBar() {
    if (!this.healthBarFill || !this.healthBarContainer) return

    const hpPercent = this.maxHp > 0 ? this.currentHp / this.maxHp : 0
    this.healthBarFill.width = `${hpPercent * 100}%`

    // Color based on HP percentage
    if (hpPercent > 0.5) {
      this.healthBarFill.background = '#22c55e' // Green
    } else if (hpPercent > 0.25) {
      this.healthBarFill.background = '#eab308' // Yellow
    } else {
      this.healthBarFill.background = '#ef4444' // Red
    }

    // Always show health bar (hide when dead)
    this.healthBarContainer.isVisible = !this.isDead
  }

  private clearMeshes() {
    for (const mesh of this.meshes) {
      mesh.dispose()
    }
    this.meshes = []
  }

  private updateNodePosition() {
    const scale = 1 / TILE_SIZE
    const tileX = Math.floor(this.x / TILE_SIZE)
    const tileY = Math.floor(this.y / TILE_SIZE)
    if (tileX !== this.cachedTileX || tileY !== this.cachedTileY) {
      this.cachedHeightY = this.heightProvider ? this.heightProvider(tileX, tileY) : 0
      this.cachedTileX = tileX
      this.cachedTileY = tileY
    }
    // Position node at ground level - entity meshes have their bottoms at y=0 relative to node
    this.node.position.set(this.x * scale, this.cachedHeightY, this.y * scale)
  }

  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y }
  }

  setPosition(x: number, y: number) {
    this.targetX = x
    this.targetY = y
  }

  setHealth(currentHp: number, maxHp: number) {
    this.currentHp = currentHp
    this.maxHp = maxHp
    this.updateHealthBar()
  }

  showHitSplat(damage: number) {
    if (!this.hitSplatLabel) return

    // Clear existing timeout
    if (this.hitSplatTimeout) {
      clearTimeout(this.hitSplatTimeout)
    }

    // Show hit splat
    this.hitSplatLabel.text = damage > 0 ? damage.toString() : 'Miss'
    this.hitSplatLabel.color = damage > 0 ? '#ff0000' : '#0088ff'
    this.hitSplatLabel.isVisible = true

    // Hide after 1 second
    this.hitSplatTimeout = setTimeout(() => {
      if (this.hitSplatLabel) {
        this.hitSplatLabel.isVisible = false
      }
    }, 1000)
  }

  setDead(isDead: boolean) {
    if (this.isDead !== isDead) {
      this.isDead = isDead
      this.createNpc()

      // Hide UI when dead
      if (this.nameLabel) this.nameLabel.isVisible = !isDead
      if (this.healthBarContainer) this.healthBarContainer.isVisible = false
    }
  }

  update(delta: number) {
    // Interpolate position
    const lerpSpeed = 0.15 * delta
    this.x += (this.targetX - this.x) * lerpSpeed
    this.y += (this.targetY - this.y) * lerpSpeed
    this.updateNodePosition()
  }

  dispose() {
    this.clearMeshes()
    this.node.dispose()
    const res = SharedResources.get()
    res.removeControl(this.nameLabel)
    res.removeControl(this.healthBarContainer)
    res.removeControl(this.hitSplatLabel)
    if (this.hitSplatTimeout) {
      clearTimeout(this.hitSplatTimeout)
    }
  }
}
