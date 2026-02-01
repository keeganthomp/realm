import {
  Scene,
  TransformNode,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  Mesh
} from '@babylonjs/core'
import { AdvancedDynamicTexture, TextBlock, Rectangle, Control } from '@babylonjs/gui'
import { NpcType, NPC_DEFINITIONS, TILE_SIZE } from '@realm/shared'

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

  private guiTexture: AdvancedDynamicTexture | null = null
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
      default:
        this.createDefaultNpc()
    }
  }

  private createChicken() {
    // Body (ellipsoid)
    const bodyMat = new StandardMaterial('chickenBody_' + this.id, this.scene)
    bodyMat.diffuseColor = new Color3(1, 1, 0.9) // White/cream
    bodyMat.specularColor = Color3.Black()

    const body = MeshBuilder.CreateSphere(
      'chickenBody_' + this.id,
      { diameterX: 0.4, diameterY: 0.35, diameterZ: 0.5, segments: 8 },
      this.scene
    )
    body.material = bodyMat
    body.position.y = 0.2
    body.parent = this.node
    this.meshes.push(body)

    // Head
    const headMat = new StandardMaterial('chickenHead_' + this.id, this.scene)
    headMat.diffuseColor = new Color3(1, 1, 0.9)
    headMat.specularColor = Color3.Black()

    const head = MeshBuilder.CreateSphere(
      'chickenHead_' + this.id,
      { diameter: 0.2, segments: 8 },
      this.scene
    )
    head.material = headMat
    head.position.set(0, 0.4, 0.2)
    head.parent = this.node
    this.meshes.push(head)

    // Beak
    const beakMat = new StandardMaterial('chickenBeak_' + this.id, this.scene)
    beakMat.diffuseColor = new Color3(1, 0.6, 0) // Orange
    beakMat.specularColor = Color3.Black()

    const beak = MeshBuilder.CreateCylinder(
      'chickenBeak_' + this.id,
      { height: 0.1, diameterTop: 0, diameterBottom: 0.06, tessellation: 6 },
      this.scene
    )
    beak.material = beakMat
    beak.rotation.x = Math.PI / 2
    beak.position.set(0, 0.4, 0.35)
    beak.parent = this.node
    this.meshes.push(beak)

    // Comb (red thing on head)
    const combMat = new StandardMaterial('chickenComb_' + this.id, this.scene)
    combMat.diffuseColor = new Color3(0.9, 0.1, 0.1) // Red
    combMat.specularColor = Color3.Black()

    const comb = MeshBuilder.CreateBox(
      'chickenComb_' + this.id,
      { width: 0.04, height: 0.1, depth: 0.1 },
      this.scene
    )
    comb.material = combMat
    comb.position.set(0, 0.5, 0.2)
    comb.parent = this.node
    this.meshes.push(comb)
  }

  private createCow() {
    // Body (large box)
    const bodyMat = new StandardMaterial('cowBody_' + this.id, this.scene)
    bodyMat.diffuseColor = new Color3(0.3, 0.2, 0.1) // Brown
    bodyMat.specularColor = Color3.Black()

    const body = MeshBuilder.CreateBox(
      'cowBody_' + this.id,
      { width: 0.5, height: 0.5, depth: 0.8 },
      this.scene
    )
    body.material = bodyMat
    body.position.y = 0.35
    body.parent = this.node
    this.meshes.push(body)

    // Head
    const headMat = new StandardMaterial('cowHead_' + this.id, this.scene)
    headMat.diffuseColor = new Color3(0.35, 0.25, 0.15)
    headMat.specularColor = Color3.Black()

    const head = MeshBuilder.CreateBox(
      'cowHead_' + this.id,
      { width: 0.25, height: 0.25, depth: 0.3 },
      this.scene
    )
    head.material = headMat
    head.position.set(0, 0.45, 0.5)
    head.parent = this.node
    this.meshes.push(head)

    // White spots
    const spotMat = new StandardMaterial('cowSpot_' + this.id, this.scene)
    spotMat.diffuseColor = new Color3(1, 1, 1)
    spotMat.specularColor = Color3.Black()

    const spot = MeshBuilder.CreateDisc(
      'cowSpot_' + this.id,
      { radius: 0.12, tessellation: 8 },
      this.scene
    )
    spot.material = spotMat
    spot.rotation.y = Math.PI / 2
    spot.position.set(0.26, 0.4, 0)
    spot.parent = this.node
    this.meshes.push(spot)
  }

  private createGoblin() {
    // Body (green) - using cylinder instead of capsule for compatibility
    const bodyMat = new StandardMaterial('goblinBody_' + this.id, this.scene)
    bodyMat.diffuseColor = new Color3(0.2, 0.7, 0.2) // Bright green
    bodyMat.specularColor = Color3.Black()

    const body = MeshBuilder.CreateCylinder(
      'goblinBody_' + this.id,
      { height: 0.4, diameterTop: 0.2, diameterBottom: 0.3, tessellation: 8 },
      this.scene
    )
    body.material = bodyMat
    body.position.y = 0.25
    body.parent = this.node
    this.meshes.push(body)

    // Head (green sphere)
    const head = MeshBuilder.CreateSphere(
      'goblinHead_' + this.id,
      { diameter: 0.3, segments: 8 },
      this.scene
    )
    head.material = bodyMat
    head.position.set(0, 0.55, 0)
    head.parent = this.node
    this.meshes.push(head)

    // Ears (pointy)
    const earMat = new StandardMaterial('goblinEar_' + this.id, this.scene)
    earMat.diffuseColor = new Color3(0.15, 0.5, 0.15) // Darker green
    earMat.specularColor = Color3.Black()

    const leftEar = MeshBuilder.CreateCylinder(
      'goblinLeftEar_' + this.id,
      { height: 0.18, diameterTop: 0, diameterBottom: 0.08, tessellation: 6 },
      this.scene
    )
    leftEar.material = earMat
    leftEar.rotation.z = Math.PI / 4
    leftEar.position.set(-0.18, 0.7, 0)
    leftEar.parent = this.node
    this.meshes.push(leftEar)

    const rightEar = MeshBuilder.CreateCylinder(
      'goblinRightEar_' + this.id,
      { height: 0.18, diameterTop: 0, diameterBottom: 0.08, tessellation: 6 },
      this.scene
    )
    rightEar.material = earMat
    rightEar.rotation.z = -Math.PI / 4
    rightEar.position.set(0.18, 0.7, 0)
    rightEar.parent = this.node
    this.meshes.push(rightEar)

    // Nose (small cone)
    const noseMat = new StandardMaterial('goblinNose_' + this.id, this.scene)
    noseMat.diffuseColor = new Color3(0.15, 0.5, 0.15)
    noseMat.specularColor = Color3.Black()

    const nose = MeshBuilder.CreateCylinder(
      'goblinNose_' + this.id,
      { height: 0.1, diameterTop: 0, diameterBottom: 0.06, tessellation: 6 },
      this.scene
    )
    nose.material = noseMat
    nose.rotation.x = Math.PI / 2
    nose.position.set(0, 0.55, 0.18)
    nose.parent = this.node
    this.meshes.push(nose)
  }

  private createRat() {
    // Body
    const bodyMat = new StandardMaterial('ratBody_' + this.id, this.scene)
    bodyMat.diffuseColor = new Color3(0.4, 0.35, 0.3) // Gray-brown
    bodyMat.specularColor = Color3.Black()

    const body = MeshBuilder.CreateSphere(
      'ratBody_' + this.id,
      { diameterX: 0.3, diameterY: 0.2, diameterZ: 0.5, segments: 8 },
      this.scene
    )
    body.material = bodyMat
    body.position.y = 0.15
    body.parent = this.node
    this.meshes.push(body)

    // Head
    const head = MeshBuilder.CreateSphere(
      'ratHead_' + this.id,
      { diameterX: 0.15, diameterY: 0.12, diameterZ: 0.2, segments: 8 },
      this.scene
    )
    head.material = bodyMat
    head.position.set(0, 0.15, 0.25)
    head.parent = this.node
    this.meshes.push(head)

    // Tail
    const tailMat = new StandardMaterial('ratTail_' + this.id, this.scene)
    tailMat.diffuseColor = new Color3(0.7, 0.6, 0.5)
    tailMat.specularColor = Color3.Black()

    const tail = MeshBuilder.CreateCylinder(
      'ratTail_' + this.id,
      { height: 0.4, diameterTop: 0.01, diameterBottom: 0.03, tessellation: 6 },
      this.scene
    )
    tail.material = tailMat
    tail.rotation.x = Math.PI / 3
    tail.position.set(0, 0.1, -0.35)
    tail.parent = this.node
    this.meshes.push(tail)
  }

  private createDefaultNpc() {
    const mat = new StandardMaterial('npcMat_' + this.id, this.scene)
    mat.diffuseColor = new Color3(0.5, 0.5, 0.5)
    mat.specularColor = Color3.Black()

    const mesh = MeshBuilder.CreateBox('npc_' + this.id, { size: 0.4 }, this.scene)
    mesh.material = mat
    mesh.position.y = 0.2
    mesh.parent = this.node
    this.meshes.push(mesh)
  }

  private createUI() {
    const def = NPC_DEFINITIONS[this.npcType]
    if (!def) return

    this.guiTexture = AdvancedDynamicTexture.CreateFullscreenUI(
      'npcUI_' + this.id,
      true,
      this.scene
    )

    // Name label
    this.nameLabel = new TextBlock('npcName_' + this.id, `${def.name} (lvl ${def.combatLevel})`)
    this.nameLabel.color = def.aggroRange > 0 ? '#ff6b6b' : '#ffff00' // Red for aggressive, yellow for passive
    this.nameLabel.fontSize = 11
    this.nameLabel.fontFamily = 'Inter, sans-serif'
    this.nameLabel.outlineWidth = 2
    this.nameLabel.outlineColor = 'black'
    this.nameLabel.isVisible = false
    this.guiTexture.addControl(this.nameLabel)
    this.nameLabel.linkWithMesh(this.node)
    this.nameLabel.linkOffsetY = -70

    // Health bar container
    this.healthBarContainer = new Rectangle('hpBarContainer_' + this.id)
    this.healthBarContainer.width = '40px'
    this.healthBarContainer.height = '6px'
    this.healthBarContainer.background = 'rgba(0, 0, 0, 0.7)'
    this.healthBarContainer.thickness = 1
    this.healthBarContainer.color = 'black'
    this.guiTexture.addControl(this.healthBarContainer)
    this.healthBarContainer.linkWithMesh(this.node)
    this.healthBarContainer.linkOffsetY = -55

    // Health bar fill
    this.healthBarFill = new Rectangle('hpBarFill_' + this.id)
    this.healthBarFill.width = '100%'
    this.healthBarFill.height = '100%'
    this.healthBarFill.background = '#22c55e' // Green
    this.healthBarFill.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT
    this.healthBarFill.thickness = 0
    this.healthBarContainer.addControl(this.healthBarFill)

    // Hit splat (hidden by default)
    this.hitSplatLabel = new TextBlock('hitSplat_' + this.id, '')
    this.hitSplatLabel.color = '#ff0000'
    this.hitSplatLabel.fontSize = 14
    this.hitSplatLabel.fontFamily = 'Inter, sans-serif'
    this.hitSplatLabel.fontWeight = 'bold'
    this.hitSplatLabel.outlineWidth = 2
    this.hitSplatLabel.outlineColor = 'black'
    this.hitSplatLabel.isVisible = false
    this.guiTexture.addControl(this.hitSplatLabel)
    this.hitSplatLabel.linkWithMesh(this.node)
    this.hitSplatLabel.linkOffsetY = -35

    this.updateHealthBar()
  }

  setHovered(isHovered: boolean) {
    this.isHovered = isHovered
    if (this.nameLabel) {
      this.nameLabel.isVisible = isHovered && !this.isDead
    }
    for (const mesh of this.meshes) {
      mesh.renderOutline = isHovered
      mesh.outlineWidth = 0.05
      mesh.outlineColor = new Color3(1, 1, 1)
    }
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
    if (this.guiTexture) {
      this.guiTexture.dispose()
    }
    if (this.hitSplatTimeout) {
      clearTimeout(this.hitSplatTimeout)
    }
  }
}
