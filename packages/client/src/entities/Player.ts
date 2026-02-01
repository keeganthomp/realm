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
import { Direction, getDirection } from '@realm/shared'
import type { Position } from '@realm/shared'

const MOVE_SPEED = 3 // pixels per frame at 60fps

export class Player {
  public position: Position
  public direction: Direction = Direction.DOWN
  public isMoving: boolean = false
  public isActioning: boolean = false

  private scene: Scene
  private node: TransformNode
  private body!: Mesh
  private head!: Mesh
  private leftLeg!: Mesh
  private rightLeg!: Mesh
  private actionIndicators: Mesh[] = []

  private path: Position[] = []
  private currentTarget: Position | null = null
  private onPathComplete?: () => void

  private guiTexture: AdvancedDynamicTexture | null = null
  private nameLabel: TextBlock | null = null

  constructor(startPosition: Position, scene: Scene) {
    this.position = { ...startPosition }
    this.scene = scene
    this.node = new TransformNode('player', scene)
  }

  async init() {
    this.createCharacterMeshes()
    this.createNameLabel()
    this.updateNodePosition()
  }

  private createCharacterMeshes() {
    const bodyColor = new Color3(0.29, 0.56, 0.85) // #4a90d9 Blue tunic
    const skinColor = new Color3(0.96, 0.82, 0.66) // #f5d0a9 Skin tone
    const legColor = new Color3(0.24, 0.24, 0.24) // #3d3d3d Dark pants

    // Body material
    const bodyMat = new StandardMaterial('playerBodyMat', this.scene)
    bodyMat.diffuseColor = bodyColor
    bodyMat.specularColor = Color3.Black()

    // Skin material
    const skinMat = new StandardMaterial('playerSkinMat', this.scene)
    skinMat.diffuseColor = skinColor
    skinMat.specularColor = Color3.Black()

    // Leg material
    const legMat = new StandardMaterial('playerLegMat', this.scene)
    legMat.diffuseColor = legColor
    legMat.specularColor = Color3.Black()

    // Body (cylinder)
    this.body = MeshBuilder.CreateCylinder(
      'playerBody',
      { height: 0.5, diameter: 0.4, tessellation: 8 },
      this.scene
    )
    this.body.material = bodyMat
    this.body.position.y = 0.45
    this.body.parent = this.node

    // Head (sphere)
    this.head = MeshBuilder.CreateSphere(
      'playerHead',
      { diameter: 0.35, segments: 8 },
      this.scene
    )
    this.head.material = skinMat
    this.head.position.y = 0.85
    this.head.parent = this.node

    // Left leg (cylinder)
    this.leftLeg = MeshBuilder.CreateCylinder(
      'playerLeftLeg',
      { height: 0.25, diameter: 0.12, tessellation: 6 },
      this.scene
    )
    this.leftLeg.material = legMat
    this.leftLeg.position.set(-0.1, 0.125, 0)
    this.leftLeg.parent = this.node

    // Right leg (cylinder)
    this.rightLeg = MeshBuilder.CreateCylinder(
      'playerRightLeg',
      { height: 0.25, diameter: 0.12, tessellation: 6 },
      this.scene
    )
    this.rightLeg.material = legMat
    this.rightLeg.position.set(0.1, 0.125, 0)
    this.rightLeg.parent = this.node

    // Create action indicator spheres (hidden by default)
    const indicatorMat = new StandardMaterial('actionIndicatorMat', this.scene)
    indicatorMat.diffuseColor = new Color3(0.72, 0.53, 0.04) // #b8860b gold
    indicatorMat.specularColor = Color3.Black()
    indicatorMat.alpha = 0.8

    for (let i = 0; i < 3; i++) {
      const indicator = MeshBuilder.CreateSphere(
        `actionIndicator${i}`,
        { diameter: 0.1, segments: 6 },
        this.scene
      )
      indicator.material = indicatorMat
      indicator.parent = this.node
      indicator.isVisible = false
      this.actionIndicators.push(indicator)
    }
  }

  private createNameLabel() {
    this.guiTexture = AdvancedDynamicTexture.CreateFullscreenUI('playerUI', true, this.scene)

    this.nameLabel = new TextBlock('playerName', 'You')
    this.nameLabel.color = 'white'
    this.nameLabel.fontSize = 14
    this.nameLabel.fontFamily = 'Inter, sans-serif'
    this.nameLabel.outlineWidth = 2
    this.nameLabel.outlineColor = 'black'

    this.guiTexture.addControl(this.nameLabel)
    this.nameLabel.linkWithMesh(this.node)
    this.nameLabel.linkOffsetY = -60
  }

  private updateActionIndicators() {
    if (!this.isActioning) {
      for (const indicator of this.actionIndicators) {
        indicator.isVisible = false
      }
      return
    }

    const time = Date.now() / 200
    for (let i = 0; i < this.actionIndicators.length; i++) {
      const angle = time + (i * Math.PI * 2) / 3
      const x = Math.cos(angle) * 0.6
      const z = Math.sin(angle) * 0.3
      this.actionIndicators[i].position.set(x, 0.7, z)
      this.actionIndicators[i].isVisible = true
    }
  }

  setPath(path: Position[], onComplete?: () => void) {
    this.path = path
    this.currentTarget = this.path.shift() || null
    this.isMoving = this.currentTarget !== null
    this.onPathComplete = onComplete
  }

  setActioning(isActioning: boolean) {
    this.isActioning = isActioning
    if (!isActioning) {
      for (const indicator of this.actionIndicators) {
        indicator.isVisible = false
      }
    }
  }

  update(delta: number) {
    // Update action indicator animation
    if (this.isActioning) {
      this.updateActionIndicators()
    }

    if (!this.currentTarget) {
      if (this.isMoving) {
        this.isMoving = false
        // Call completion callback
        if (this.onPathComplete) {
          const callback = this.onPathComplete
          this.onPathComplete = undefined
          callback()
        }
      }
      return
    }

    const dx = this.currentTarget.x - this.position.x
    const dy = this.currentTarget.y - this.position.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    const newDirection = getDirection(this.position, this.currentTarget)
    if (newDirection !== this.direction) {
      this.direction = newDirection
      this.updateFacing()
    }

    if (distance < MOVE_SPEED * delta) {
      this.position.x = this.currentTarget.x
      this.position.y = this.currentTarget.y

      this.currentTarget = this.path.shift() || null
      if (!this.currentTarget) {
        this.isMoving = false
        // Call completion callback
        if (this.onPathComplete) {
          const callback = this.onPathComplete
          this.onPathComplete = undefined
          callback()
        }
      }
    } else {
      const moveX = (dx / distance) * MOVE_SPEED * delta
      const moveY = (dy / distance) * MOVE_SPEED * delta
      this.position.x += moveX
      this.position.y += moveY
      this.isMoving = true
    }

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
