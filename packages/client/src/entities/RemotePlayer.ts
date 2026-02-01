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
    const bodyColor = new Color3(0.42, 0.56, 0.14) // #6b8e23 Green tunic
    const skinColor = new Color3(0.96, 0.82, 0.66) // #f5d0a9 Skin tone
    const legColor = new Color3(0.24, 0.24, 0.24) // #3d3d3d Dark pants
    const bootColor = new Color3(0.17, 0.11, 0.07) // #2b1c12
    const hairColor = new Color3(0.22, 0.16, 0.06) // #38280f

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

    const applyFlat = (mesh: Mesh) => {
      mesh.convertToFlatShadedMesh()
    }

    // Torso (boxy, slightly shorter)
    this.body = MeshBuilder.CreateBox(
      'remoteBody_' + this.playerName,
      { height: 0.45, width: 0.42, depth: 0.2 },
      this.scene
    )
    this.body.material = bodyMat
    this.body.position.y = 0.58
    this.body.parent = this.node
    applyFlat(this.body)

    // Head (boxy, slightly larger)
    this.head = MeshBuilder.CreateBox('remoteHead_' + this.playerName, { size: 0.36 }, this.scene)
    this.head.material = skinMat
    this.head.position.y = 0.97
    this.head.parent = this.node
    applyFlat(this.head)

    // Left leg (box)
    this.leftLeg = MeshBuilder.CreateBox(
      'remoteLeftLeg_' + this.playerName,
      { height: 0.32, width: 0.13, depth: 0.15 },
      this.scene
    )
    this.leftLeg.material = legMat
    this.leftLeg.position.set(-0.12, 0.2, 0)
    this.leftLeg.parent = this.node
    applyFlat(this.leftLeg)

    // Right leg (box)
    this.rightLeg = MeshBuilder.CreateBox(
      'remoteRightLeg_' + this.playerName,
      { height: 0.32, width: 0.13, depth: 0.15 },
      this.scene
    )
    this.rightLeg.material = legMat
    this.rightLeg.position.set(0.12, 0.2, 0)
    this.rightLeg.parent = this.node
    applyFlat(this.rightLeg)

    // Arms
    const leftArm = MeshBuilder.CreateBox(
      'remoteLeftArm_' + this.playerName,
      { height: 0.34, width: 0.11, depth: 0.15 },
      this.scene
    )
    leftArm.material = skinMat
    leftArm.position.set(-0.29, 0.6, 0)
    leftArm.parent = this.node
    applyFlat(leftArm)

    const rightArm = MeshBuilder.CreateBox(
      'remoteRightArm_' + this.playerName,
      { height: 0.34, width: 0.11, depth: 0.15 },
      this.scene
    )
    rightArm.material = skinMat
    rightArm.position.set(0.29, 0.6, 0)
    rightArm.parent = this.node
    applyFlat(rightArm)

    // Boots
    const bootMat = new StandardMaterial('remoteBootMat_' + this.playerName, this.scene)
    bootMat.diffuseColor = bootColor
    bootMat.specularColor = Color3.Black()

    const leftBoot = MeshBuilder.CreateBox(
      'remoteLeftBoot_' + this.playerName,
      { height: 0.1, width: 0.17, depth: 0.22 },
      this.scene
    )
    leftBoot.material = bootMat
    leftBoot.position.set(-0.12, 0.05, 0.03)
    leftBoot.parent = this.node
    applyFlat(leftBoot)

    const rightBoot = leftBoot.clone('remoteRightBoot_' + this.playerName)
    if (rightBoot) {
      rightBoot.position.set(0.11, 0.04, 0.02)
      rightBoot.parent = this.node
    }

    // Hair cap
    const hair = MeshBuilder.CreateBox(
      'remoteHair_' + this.playerName,
      { height: 0.1, width: 0.36, depth: 0.36 },
      this.scene
    )
    const hairMat = new StandardMaterial('remoteHairMat_' + this.playerName, this.scene)
    hairMat.diffuseColor = hairColor
    hairMat.specularColor = Color3.Black()
    hair.material = hairMat
    hair.position.set(0, 1.07, 0)
    hair.parent = this.node
    applyFlat(hair)
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
    this.nameLabel.linkOffsetY = -60
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
    const heightY = this.heightProvider ? this.heightProvider(tileX, tileY) : 0
    this.node.position = new Vector3(this.position.x * scale, heightY, this.position.y * scale)
  }

  dispose() {
    this.node.dispose()
    if (this.guiTexture) {
      this.guiTexture.dispose()
    }
  }
}
