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
import { Direction } from '@realm/shared'
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

  private createCharacterMeshes() {
    const bodyColor = new Color3(0.42, 0.56, 0.14) // #6b8e23 Green tunic
    const skinColor = new Color3(0.96, 0.82, 0.66) // #f5d0a9 Skin tone
    const legColor = new Color3(0.24, 0.24, 0.24) // #3d3d3d Dark pants

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

    // Body (cylinder)
    this.body = MeshBuilder.CreateCylinder(
      'remoteBody_' + this.playerName,
      { height: 0.5, diameter: 0.4, tessellation: 8 },
      this.scene
    )
    this.body.material = bodyMat
    this.body.position.y = 0.45
    this.body.parent = this.node

    // Head (sphere)
    this.head = MeshBuilder.CreateSphere(
      'remoteHead_' + this.playerName,
      { diameter: 0.35, segments: 8 },
      this.scene
    )
    this.head.material = skinMat
    this.head.position.y = 0.85
    this.head.parent = this.node

    // Left leg (cylinder)
    this.leftLeg = MeshBuilder.CreateCylinder(
      'remoteLeftLeg_' + this.playerName,
      { height: 0.25, diameter: 0.12, tessellation: 6 },
      this.scene
    )
    this.leftLeg.material = legMat
    this.leftLeg.position.set(-0.1, 0.125, 0)
    this.leftLeg.parent = this.node

    // Right leg (cylinder)
    this.rightLeg = MeshBuilder.CreateCylinder(
      'remoteRightLeg_' + this.playerName,
      { height: 0.25, diameter: 0.12, tessellation: 6 },
      this.scene
    )
    this.rightLeg.material = legMat
    this.rightLeg.position.set(0.1, 0.125, 0)
    this.rightLeg.parent = this.node
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
    const scale = 1 / 32 // TILE_SIZE = 32, so 1 tile = 1 unit in 3D
    this.node.position = new Vector3(this.position.x * scale, 0, this.position.y * scale)
  }

  dispose() {
    this.node.dispose()
    if (this.guiTexture) {
      this.guiTexture.dispose()
    }
  }
}
