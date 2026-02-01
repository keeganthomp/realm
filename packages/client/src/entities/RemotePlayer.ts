import {
  Scene,
  TransformNode,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  Mesh
} from '@babylonjs/core'
import { AdvancedDynamicTexture, TextBlock } from '@babylonjs/gui'
import { Direction, TILE_SIZE } from '@realm/shared'
import type { Position } from '@realm/shared'

const INTERPOLATION_SPEED = 0.15

export class RemotePlayer {
  public position: Position
  public direction: Direction = Direction.DOWN

  private scene: Scene
  private node: TransformNode
  private body!: Mesh
  private head!: Mesh
  private leftLeg!: Mesh
  private rightLeg!: Mesh
  private cachedTileX: number = -1
  private cachedTileY: number = -1
  private cachedHeightY: number = 0

  private targetPosition: Position
  private playerName: string
  private heightProvider: ((tileX: number, tileY: number) => number) | null = null

  private guiTexture: AdvancedDynamicTexture | null = null
  private nameLabel: TextBlock | null = null

  constructor(startPosition: Position, name: string, scene: Scene) {
    this.position = { ...startPosition }
    this.targetPosition = { ...startPosition }
    this.playerName = name
    this.scene = scene
    this.node = new TransformNode('remotePlayer_' + name, scene)
  }

  async init() {
    this.createCharacterMeshes()
    this.createNameLabel()
    this.updateNodePosition()
  }
  setHeightProvider(provider: (tileX: number, tileY: number) => number) {
    this.heightProvider = provider
    this.updateNodePosition()
  }

  private createCharacterMeshes() {
    const bodyColor = new Color3(0.15, 0.15, 0.16) // #262829 Dark vest
    const trimColor = new Color3(0.9, 0.9, 0.9) // #e5e5e5 Shirt
    const beltColor = new Color3(0.18, 0.12, 0.07) // #2e1f12 Leather
    const skinColor = new Color3(0.96, 0.82, 0.66) // #f5d0a9 Skin tone
    const legColor = new Color3(0.17, 0.17, 0.18) // #2c2c2d Dark pants
    const bootColor = new Color3(0.34, 0.2, 0.08) // #573314 Boots
    const hairColor = new Color3(0.24, 0.18, 0.1) // #3d2e1a

    // Body material
    const bodyMat = new StandardMaterial('remoteBodyMat_' + this.playerName, this.scene)
    bodyMat.diffuseColor = bodyColor
    bodyMat.specularColor = Color3.Black()

    // Skin material
    const skinMat = new StandardMaterial('remoteSkinMat_' + this.playerName, this.scene)
    skinMat.diffuseColor = skinColor
    skinMat.specularColor = Color3.Black()

    // Leg material
    const legMat = new StandardMaterial('remoteLegMat_' + this.playerName, this.scene)
    legMat.diffuseColor = legColor
    legMat.specularColor = Color3.Black()

    const trimMat = new StandardMaterial('remoteTrimMat_' + this.playerName, this.scene)
    trimMat.diffuseColor = trimColor
    trimMat.specularColor = Color3.Black()

    const beltMat = new StandardMaterial('remoteBeltMat_' + this.playerName, this.scene)
    beltMat.diffuseColor = beltColor
    beltMat.specularColor = Color3.Black()

    const applyFlat = (mesh: Mesh) => {
      mesh.convertToFlatShadedMesh()
    }

    // Torso (low-poly cylinder)
    this.body = MeshBuilder.CreateCylinder(
      'remoteBody_' + this.playerName,
      { height: 0.66, diameterTop: 0.28, diameterBottom: 0.34, tessellation: 6 },
      this.scene
    )
    this.body.material = bodyMat
    this.body.position.y = 0.8
    this.body.parent = this.node
    applyFlat(this.body)

    // Head (low-poly sphere)
    this.head = MeshBuilder.CreateSphere(
      'remoteHead_' + this.playerName,
      { diameter: 0.34, segments: 6 },
      this.scene
    )
    this.head.material = skinMat
    this.head.position.y = 1.22
    this.head.parent = this.node
    applyFlat(this.head)

    // Left leg (low-poly cylinder)
    this.leftLeg = MeshBuilder.CreateCylinder(
      'remoteLeftLeg_' + this.playerName,
      { height: 0.6, diameterTop: 0.1, diameterBottom: 0.13, tessellation: 6 },
      this.scene
    )
    this.leftLeg.material = legMat
    this.leftLeg.position.set(-0.1, 0.3, 0)
    this.leftLeg.parent = this.node
    applyFlat(this.leftLeg)

    // Right leg (low-poly cylinder)
    this.rightLeg = MeshBuilder.CreateCylinder(
      'remoteRightLeg_' + this.playerName,
      { height: 0.6, diameterTop: 0.1, diameterBottom: 0.13, tessellation: 6 },
      this.scene
    )
    this.rightLeg.material = legMat
    this.rightLeg.position.set(0.1, 0.3, 0)
    this.rightLeg.parent = this.node
    applyFlat(this.rightLeg)

    // Arms
    const leftArm = MeshBuilder.CreateCylinder(
      'remoteLeftArm_' + this.playerName,
      { height: 0.5, diameterTop: 0.085, diameterBottom: 0.11, tessellation: 6 },
      this.scene
    )
    leftArm.material = skinMat
    leftArm.position.set(-0.24, 0.84, 0)
    leftArm.parent = this.node
    applyFlat(leftArm)

    const rightArm = MeshBuilder.CreateCylinder(
      'remoteRightArm_' + this.playerName,
      { height: 0.5, diameterTop: 0.085, diameterBottom: 0.11, tessellation: 6 },
      this.scene
    )
    rightArm.material = skinMat
    rightArm.position.set(0.24, 0.84, 0)
    rightArm.parent = this.node
    applyFlat(rightArm)

    // Boots
    const bootMat = new StandardMaterial('remoteBootMat_' + this.playerName, this.scene)
    bootMat.diffuseColor = bootColor
    bootMat.specularColor = Color3.Black()

    const leftBoot = MeshBuilder.CreateBox(
      'remoteLeftBoot_' + this.playerName,
      { height: 0.12, width: 0.16, depth: 0.22 },
      this.scene
    )
    leftBoot.material = bootMat
    leftBoot.position.set(-0.1, 0.06, 0.04)
    leftBoot.parent = this.node
    applyFlat(leftBoot)

    const rightBoot = leftBoot.clone('remoteRightBoot_' + this.playerName)
    if (rightBoot) {
      rightBoot.position.set(0.1, 0.06, 0.04)
      rightBoot.parent = this.node
    }

    // Hair cap
    const hat = MeshBuilder.CreateBox(
      'remoteHat_' + this.playerName,
      { height: 0.14, width: 0.4, depth: 0.36 },
      this.scene
    )
    const hatMat = new StandardMaterial('remoteHatMat_' + this.playerName, this.scene)
    hatMat.diffuseColor = hairColor
    hatMat.specularColor = Color3.Black()
    hat.material = hatMat
    hat.position.set(0, 1.34, 0)
    hat.parent = this.node
    applyFlat(hat)

    const hatBrim = MeshBuilder.CreateBox(
      'remoteHatBrim_' + this.playerName,
      { height: 0.03, width: 0.48, depth: 0.44 },
      this.scene
    )
    hatBrim.material = hatMat
    hatBrim.position.set(0, 1.26, 0.02)
    hatBrim.parent = this.node
    applyFlat(hatBrim)

    const shirtFront = MeshBuilder.CreateBox(
      'remoteShirtFront_' + this.playerName,
      { height: 0.4, width: 0.18, depth: 0.04 },
      this.scene
    )
    shirtFront.material = trimMat
    shirtFront.position.set(0, 0.82, 0.19)
    shirtFront.parent = this.node
    applyFlat(shirtFront)

    const shirtCollar = MeshBuilder.CreateBox(
      'remoteShirtCollar_' + this.playerName,
      { height: 0.1, width: 0.22, depth: 0.04 },
      this.scene
    )
    shirtCollar.material = trimMat
    shirtCollar.position.set(0, 1.06, 0.18)
    shirtCollar.parent = this.node
    applyFlat(shirtCollar)

    const vestLeft = MeshBuilder.CreateBox(
      'remoteVestLeft_' + this.playerName,
      { height: 0.46, width: 0.12, depth: 0.05 },
      this.scene
    )
    vestLeft.material = bodyMat
    vestLeft.position.set(-0.11, 0.8, 0.18)
    vestLeft.parent = this.node
    applyFlat(vestLeft)

    const vestRight = vestLeft.clone('remoteVestRight_' + this.playerName)
    if (vestRight) {
      vestRight.position.set(0.11, 0.8, 0.18)
      vestRight.parent = this.node
    }

    const belt = MeshBuilder.CreateBox(
      'remoteBelt_' + this.playerName,
      { height: 0.06, width: 0.32, depth: 0.22 },
      this.scene
    )
    belt.material = beltMat
    belt.position.set(0, 0.62, 0)
    belt.parent = this.node
    applyFlat(belt)

    const beltBuckle = MeshBuilder.CreateBox(
      'remoteBuckle_' + this.playerName,
      { height: 0.05, width: 0.08, depth: 0.04 },
      this.scene
    )
    beltBuckle.material = trimMat
    beltBuckle.position.set(0, 0.62, 0.13)
    beltBuckle.parent = this.node
    applyFlat(beltBuckle)

    const leftShoulder = MeshBuilder.CreateBox(
      'remoteLeftShoulder_' + this.playerName,
      { height: 0.08, width: 0.1, depth: 0.12 },
      this.scene
    )
    leftShoulder.material = bodyMat
    leftShoulder.position.set(-0.22, 0.98, 0)
    leftShoulder.parent = this.node
    applyFlat(leftShoulder)

    const rightShoulder = leftShoulder.clone('remoteRightShoulder_' + this.playerName)
    if (rightShoulder) {
      rightShoulder.position.set(0.22, 0.98, 0)
      rightShoulder.parent = this.node
    }

    const leftGlove = MeshBuilder.CreateSphere(
      'remoteLeftGlove_' + this.playerName,
      { diameter: 0.1, segments: 6 },
      this.scene
    )
    leftGlove.material = beltMat
    leftGlove.position.set(-0.24, 0.58, 0.02)
    leftGlove.parent = this.node
    applyFlat(leftGlove)

    const rightGlove = leftGlove.clone('remoteRightGlove_' + this.playerName)
    if (rightGlove) {
      rightGlove.position.set(0.24, 0.58, 0.02)
      rightGlove.parent = this.node
    }

    const cape = MeshBuilder.CreateBox(
      'remoteCape_' + this.playerName,
      { height: 0.74, width: 0.24, depth: 0.04 },
      this.scene
    )
    cape.material = bodyMat
    cape.position.set(0, 0.86, -0.18)
    cape.parent = this.node
    applyFlat(cape)

    this.node.scaling.set(1.45, 1.45, 1.45)
  }

  private createNameLabel() {
    this.guiTexture = AdvancedDynamicTexture.CreateFullscreenUI(
      'remotePlayerUI_' + this.playerName,
      true,
      this.scene
    )

    this.nameLabel = new TextBlock('remoteName_' + this.playerName, this.playerName)
    this.nameLabel.color = 'white'
    this.nameLabel.fontSize = 14
    this.nameLabel.fontFamily = 'Inter, sans-serif'
    this.nameLabel.outlineWidth = 2
    this.nameLabel.outlineColor = 'black'

    this.guiTexture.addControl(this.nameLabel)
    this.nameLabel.linkWithMesh(this.node)
    this.nameLabel.linkOffsetY = -72
  }

  setTargetPosition(position: Position, direction: Direction) {
    this.targetPosition = { ...position }
    if (direction !== this.direction) {
      this.direction = direction
      this.updateFacing()
    }
  }

  update(_delta: number) {
    // Interpolate towards target position
    const dx = this.targetPosition.x - this.position.x
    const dy = this.targetPosition.y - this.position.y

    const distSq = dx * dx + dy * dy
    if (distSq < 0.0001) {
      return
    }

    this.position.x += dx * INTERPOLATION_SPEED
    this.position.y += dy * INTERPOLATION_SPEED
    this.updateNodePosition()
  }

  private updateFacing() {
    // Rotate character to face direction
    switch (this.direction) {
      case Direction.DOWN:
        this.node.rotation.y = 0
        break
      case Direction.UP:
        this.node.rotation.y = Math.PI
        break
      case Direction.LEFT:
        this.node.rotation.y = Math.PI / 2
        break
      case Direction.RIGHT:
        this.node.rotation.y = -Math.PI / 2
        break
    }
  }

  private updateNodePosition() {
    // Map 2D position to 3D: x stays x, y becomes z
    // Scale down from pixel coordinates to 3D world units
    const scale = 1 / TILE_SIZE // TILE_SIZE = 32, so 1 tile = 1 unit in 3D
    const tileX = Math.floor(this.position.x / TILE_SIZE)
    const tileY = Math.floor(this.position.y / TILE_SIZE)
    if (tileX !== this.cachedTileX || tileY !== this.cachedTileY) {
      this.cachedHeightY = this.heightProvider ? this.heightProvider(tileX, tileY) : 0
      this.cachedTileX = tileX
      this.cachedTileY = tileY
    }
    this.node.position.set(this.position.x * scale, this.cachedHeightY, this.position.y * scale)
  }

  dispose() {
    this.node.dispose()
    if (this.guiTexture) {
      this.guiTexture.dispose()
    }
  }
}
