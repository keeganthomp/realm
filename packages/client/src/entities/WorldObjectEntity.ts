import {
  Scene,
  TransformNode,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  Mesh,
  PointLight,
  ParticleSystem,
  Texture
} from '@babylonjs/core'
import { AdvancedDynamicTexture, TextBlock } from '@babylonjs/gui'
import { WorldObjectType, WORLD_OBJECT_DEFINITIONS, TILE_SIZE } from '@realm/shared'

export class WorldObjectEntity {
  public id: string
  public objectType: WorldObjectType
  public depleted: boolean = false

  private scene: Scene
  private node: TransformNode
  private meshes: Mesh[] = []
  private light: PointLight | null = null
  private particles: ParticleSystem | null = null

  private x: number
  private y: number

  private guiTexture: AdvancedDynamicTexture | null = null
  private label: TextBlock | null = null

  constructor(id: string, objectType: WorldObjectType, x: number, y: number, scene: Scene) {
    this.id = id
    this.objectType = objectType
    this.x = x
    this.y = y
    this.scene = scene
    this.node = new TransformNode('worldObject_' + id, scene)

    this.createObject()
    this.createLabel()
    this.updateNodePosition()
  }

  private createObject() {
    this.clearMeshes()

    if (this.depleted) {
      this.createDepletedObject()
      return
    }

    switch (this.objectType) {
      case WorldObjectType.TREE:
      case WorldObjectType.OAK_TREE:
      case WorldObjectType.WILLOW_TREE:
        this.createTree()
        break
      case WorldObjectType.FISHING_SPOT_NET:
      case WorldObjectType.FISHING_SPOT_ROD:
        this.createFishingSpot()
        break
      case WorldObjectType.FIRE:
        this.createFire()
        break
      case WorldObjectType.BANK_BOOTH:
        this.createBankBooth()
        break
    }
  }

  private createTree() {
    // Trunk (cylinder)
    const trunkMat = new StandardMaterial('trunkMat_' + this.id, this.scene)
    trunkMat.diffuseColor = new Color3(0.36, 0.25, 0.2) // #5c4033
    trunkMat.specularColor = Color3.Black()

    const trunk = MeshBuilder.CreateCylinder(
      'trunk_' + this.id,
      { height: 0.6, diameter: 0.25, tessellation: 8 },
      this.scene
    )
    trunk.material = trunkMat
    trunk.position.y = 0.3
    trunk.parent = this.node
    this.meshes.push(trunk)

    // Canopy (sphere) - different colors for different tree types
    let canopyColor = new Color3(0.13, 0.55, 0.13) // #228b22 Forest Green
    if (this.objectType === WorldObjectType.OAK_TREE) {
      canopyColor = new Color3(0.18, 0.55, 0.34) // #2e8b57 Sea Green
    } else if (this.objectType === WorldObjectType.WILLOW_TREE) {
      canopyColor = new Color3(0.42, 0.56, 0.14) // #6b8e23 Olive Drab
    }

    const canopyMat = new StandardMaterial('canopyMat_' + this.id, this.scene)
    canopyMat.diffuseColor = canopyColor
    canopyMat.specularColor = Color3.Black()

    const canopy = MeshBuilder.CreateSphere(
      'canopy_' + this.id,
      { diameter: 1.0, segments: 8 },
      this.scene
    )
    canopy.material = canopyMat
    canopy.position.y = 0.9
    canopy.parent = this.node
    this.meshes.push(canopy)
  }

  private createFishingSpot() {
    // Water disc
    const waterMat = new StandardMaterial('waterMat_' + this.id, this.scene)
    waterMat.diffuseColor = new Color3(0.29, 0.56, 0.85) // #4a90d9
    waterMat.specularColor = Color3.Black()
    waterMat.alpha = 0.7

    const disc = MeshBuilder.CreateDisc(
      'fishingDisc_' + this.id,
      { radius: 0.5, tessellation: 16 },
      this.scene
    )
    disc.material = waterMat
    disc.rotation.x = Math.PI / 2 // Lay flat
    disc.position.y = 0.01 // Slightly above ground
    disc.parent = this.node
    this.meshes.push(disc)

    // Create bubble particle system
    this.particles = new ParticleSystem('bubbles_' + this.id, 20, this.scene)

    // Create a simple white texture for particles
    const particleTexture = new Texture('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABMSURBVChTY/z//z8DAwMDAxMQsAIxGxCzAwELELMCMRsQswMBCxCzAjEbELMDAQsQswIxGxCzAwELELMCMRsQswMBCxCzAjEbKWBgAAAS7QXPpqV9IQAAAABJRU5ErkJggg==', this.scene)
    this.particles.particleTexture = particleTexture

    this.particles.emitter = new Vector3(0, 0.1, 0)
    this.particles.minEmitBox = new Vector3(-0.2, 0, -0.2)
    this.particles.maxEmitBox = new Vector3(0.2, 0, 0.2)

    this.particles.color1 = new Color3(1, 1, 1).toColor4(0.8)
    this.particles.color2 = new Color3(0.8, 0.9, 1).toColor4(0.6)
    this.particles.colorDead = new Color3(1, 1, 1).toColor4(0)

    this.particles.minSize = 0.02
    this.particles.maxSize = 0.05

    this.particles.minLifeTime = 0.5
    this.particles.maxLifeTime = 1.0

    this.particles.emitRate = 5

    this.particles.direction1 = new Vector3(0, 1, 0)
    this.particles.direction2 = new Vector3(0, 1, 0)

    this.particles.minEmitPower = 0.1
    this.particles.maxEmitPower = 0.3

    this.particles.updateSpeed = 0.01

    // Use the disc mesh as emitter so particles follow the object
    this.particles.emitter = disc

    this.particles.start()
  }

  private createFire() {
    // Log meshes
    const logMat = new StandardMaterial('logMat_' + this.id, this.scene)
    logMat.diffuseColor = new Color3(0.36, 0.25, 0.2) // #5c4033
    logMat.specularColor = Color3.Black()

    const log1 = MeshBuilder.CreateCylinder(
      'log1_' + this.id,
      { height: 0.5, diameter: 0.12, tessellation: 6 },
      this.scene
    )
    log1.material = logMat
    log1.rotation.z = Math.PI / 2
    log1.position.set(-0.15, 0.06, 0)
    log1.parent = this.node
    this.meshes.push(log1)

    const log2 = MeshBuilder.CreateCylinder(
      'log2_' + this.id,
      { height: 0.5, diameter: 0.12, tessellation: 6 },
      this.scene
    )
    log2.material = logMat
    log2.rotation.z = Math.PI / 2
    log2.position.set(0.15, 0.06, 0)
    log2.parent = this.node
    this.meshes.push(log2)

    // Flame cone
    const flameMat = new StandardMaterial('flameMat_' + this.id, this.scene)
    flameMat.diffuseColor = new Color3(1, 0.27, 0) // #ff4500 Orange Red
    flameMat.emissiveColor = new Color3(1, 0.4, 0.1)
    flameMat.specularColor = Color3.Black()
    flameMat.alpha = 0.9

    const flame = MeshBuilder.CreateCylinder(
      'flame_' + this.id,
      { height: 0.4, diameterTop: 0, diameterBottom: 0.25, tessellation: 6 },
      this.scene
    )
    flame.material = flameMat
    flame.position.y = 0.3
    flame.parent = this.node
    this.meshes.push(flame)

    // Inner flame
    const innerFlameMat = new StandardMaterial('innerFlameMat_' + this.id, this.scene)
    innerFlameMat.diffuseColor = new Color3(1, 0.8, 0) // #ffcc00 Gold
    innerFlameMat.emissiveColor = new Color3(1, 0.9, 0.3)
    innerFlameMat.specularColor = Color3.Black()

    const innerFlame = MeshBuilder.CreateCylinder(
      'innerFlame_' + this.id,
      { height: 0.25, diameterTop: 0, diameterBottom: 0.12, tessellation: 6 },
      this.scene
    )
    innerFlame.material = innerFlameMat
    innerFlame.position.y = 0.22
    innerFlame.parent = this.node
    this.meshes.push(innerFlame)

    // Point light for fire glow
    this.light = new PointLight('fireLight_' + this.id, new Vector3(0, 0.4, 0), this.scene)
    this.light.diffuse = new Color3(1, 0.6, 0.2)
    this.light.intensity = 0.5
    this.light.range = 3
    this.light.parent = this.node
  }

  private createBankBooth() {
    // Booth base (wooden counter)
    const woodMat = new StandardMaterial('bankWoodMat_' + this.id, this.scene)
    woodMat.diffuseColor = new Color3(0.55, 0.35, 0.2) // Warm wood color
    woodMat.specularColor = Color3.Black()

    const counter = MeshBuilder.CreateBox(
      'bankCounter_' + this.id,
      { width: 1.2, height: 0.5, depth: 0.6 },
      this.scene
    )
    counter.material = woodMat
    counter.position.y = 0.25
    counter.parent = this.node
    this.meshes.push(counter)

    // Counter top (darker wood)
    const topMat = new StandardMaterial('bankTopMat_' + this.id, this.scene)
    topMat.diffuseColor = new Color3(0.4, 0.25, 0.15)
    topMat.specularColor = Color3.Black()

    const top = MeshBuilder.CreateBox(
      'bankTop_' + this.id,
      { width: 1.3, height: 0.08, depth: 0.7 },
      this.scene
    )
    top.material = topMat
    top.position.y = 0.54
    top.parent = this.node
    this.meshes.push(top)

    // Gold trim accent
    const goldMat = new StandardMaterial('bankGoldMat_' + this.id, this.scene)
    goldMat.diffuseColor = new Color3(0.72, 0.53, 0.04) // #b8860b gold
    goldMat.emissiveColor = new Color3(0.3, 0.22, 0.02)
    goldMat.specularColor = Color3.Black()

    const goldTrim = MeshBuilder.CreateBox(
      'bankGold_' + this.id,
      { width: 1.35, height: 0.04, depth: 0.75 },
      this.scene
    )
    goldTrim.material = goldMat
    goldTrim.position.y = 0.6
    goldTrim.parent = this.node
    this.meshes.push(goldTrim)

    // Bank sign (small box with gold)
    const sign = MeshBuilder.CreateBox(
      'bankSign_' + this.id,
      { width: 0.5, height: 0.25, depth: 0.08 },
      this.scene
    )
    sign.material = goldMat
    sign.position.set(0, 0.85, -0.3)
    sign.parent = this.node
    this.meshes.push(sign)
  }

  private createDepletedObject() {
    if (
      this.objectType === WorldObjectType.TREE ||
      this.objectType === WorldObjectType.OAK_TREE ||
      this.objectType === WorldObjectType.WILLOW_TREE
    ) {
      // Tree stump
      const stumpMat = new StandardMaterial('stumpMat_' + this.id, this.scene)
      stumpMat.diffuseColor = new Color3(0.36, 0.25, 0.2) // #5c4033
      stumpMat.specularColor = Color3.Black()

      const stump = MeshBuilder.CreateCylinder(
        'stump_' + this.id,
        { height: 0.2, diameter: 0.35, tessellation: 8 },
        this.scene
      )
      stump.material = stumpMat
      stump.position.y = 0.1
      stump.parent = this.node
      this.meshes.push(stump)

      // Stump top (lighter color for rings)
      const topMat = new StandardMaterial('stumpTopMat_' + this.id, this.scene)
      topMat.diffuseColor = new Color3(0.55, 0.45, 0.33) // #8b7355
      topMat.specularColor = Color3.Black()

      const top = MeshBuilder.CreateDisc(
        'stumpTop_' + this.id,
        { radius: 0.175, tessellation: 8 },
        this.scene
      )
      top.material = topMat
      top.rotation.x = -Math.PI / 2
      top.position.y = 0.201
      top.parent = this.node
      this.meshes.push(top)
    }
  }

  private createLabel() {
    const def = WORLD_OBJECT_DEFINITIONS[this.objectType]
    if (!def) return

    this.guiTexture = AdvancedDynamicTexture.CreateFullscreenUI(
      'objectUI_' + this.id,
      true,
      this.scene
    )

    this.label = new TextBlock('objectLabel_' + this.id, `${def.action} ${def.name}`)
    this.label.color = 'white'
    this.label.fontSize = 12
    this.label.fontFamily = 'Inter, sans-serif'
    this.label.outlineWidth = 2
    this.label.outlineColor = 'black'
    this.label.isVisible = false

    this.guiTexture.addControl(this.label)
    this.label.linkWithMesh(this.node)
    this.label.linkOffsetY = -50
  }

  private clearMeshes() {
    for (const mesh of this.meshes) {
      mesh.dispose()
    }
    this.meshes = []

    if (this.light) {
      this.light.dispose()
      this.light = null
    }

    if (this.particles) {
      this.particles.dispose()
      this.particles = null
    }
  }

  private updateNodePosition() {
    // Map 2D position to 3D: x stays x, y becomes z
    const scale = 1 / TILE_SIZE
    this.node.position = new Vector3(this.x * scale, 0, this.y * scale)
  }

  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y }
  }

  setDepleted(depleted: boolean) {
    if (this.depleted !== depleted) {
      this.depleted = depleted
      this.createObject()
    }
  }

  dispose() {
    this.clearMeshes()
    this.node.dispose()
    if (this.guiTexture) {
      this.guiTexture.dispose()
    }
  }
}
