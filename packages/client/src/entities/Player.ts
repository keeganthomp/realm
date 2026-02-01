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
import { Direction, getDirection, TILE_SIZE } from '@realm/shared'
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
  private leftArm!: Mesh
  private rightArm!: Mesh
  private actionIndicators: Mesh[] = []
  private baseBodyY: number = 0
  private baseHeadY: number = 0
  private baseLeftLegY: number = 0
  private baseRightLegY: number = 0
  private baseLeftArmY: number = 0
  private baseRightArmY: number = 0

  private path: Position[] = []
  private currentTarget: Position | null = null
  private onPathComplete?: () => void
  private walkTime: number = 0
  private actionTime: number = 0
  private actionTarget: Position | null = null
  private actionMode: 'skilling' | 'combat' | 'cooking' | 'chopping' | null = null
  private heightProvider: ((tileX: number, tileY: number) => number) | null = null

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
    const bootColor = new Color3(0.17, 0.11, 0.07) // #2b1c12
    const hairColor = new Color3(0.25, 0.18, 0.07) // #3f2e12

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

    const applyFlat = (mesh: Mesh) => {
      mesh.convertToFlatShadedMesh()
    }

    // Torso (boxy, slightly shorter)
    this.body = MeshBuilder.CreateBox(
      'playerBody',
      { height: 0.45, width: 0.42, depth: 0.2 },
      this.scene
    )
    this.body.material = bodyMat
    this.body.position.y = 0.58
    this.body.parent = this.node
    applyFlat(this.body)
    this.baseBodyY = this.body.position.y

    // Head (boxy, slightly larger)
    this.head = MeshBuilder.CreateBox('playerHead', { size: 0.36 }, this.scene)
    this.head.material = skinMat
    this.head.position.y = 0.97
    this.head.parent = this.node
    applyFlat(this.head)
    this.baseHeadY = this.head.position.y

    // Left leg (box)
    this.leftLeg = MeshBuilder.CreateBox(
      'playerLeftLeg',
      { height: 0.32, width: 0.13, depth: 0.15 },
      this.scene
    )
    this.leftLeg.material = legMat
    this.leftLeg.position.set(-0.12, 0.2, 0)
    this.leftLeg.parent = this.node
    applyFlat(this.leftLeg)
    this.baseLeftLegY = this.leftLeg.position.y

    // Right leg (box)
    this.rightLeg = MeshBuilder.CreateBox(
      'playerRightLeg',
      { height: 0.32, width: 0.13, depth: 0.15 },
      this.scene
    )
    this.rightLeg.material = legMat
    this.rightLeg.position.set(0.12, 0.2, 0)
    this.rightLeg.parent = this.node
    applyFlat(this.rightLeg)
    this.baseRightLegY = this.rightLeg.position.y

    // Arms (simple blocks)
    this.leftArm = MeshBuilder.CreateBox(
      'playerLeftArm',
      { height: 0.34, width: 0.11, depth: 0.15 },
      this.scene
    )
    this.leftArm.material = skinMat
    this.leftArm.position.set(-0.29, 0.6, 0)
    this.leftArm.parent = this.node
    applyFlat(this.leftArm)
    this.baseLeftArmY = this.leftArm.position.y

    this.rightArm = MeshBuilder.CreateBox(
      'playerRightArm',
      { height: 0.34, width: 0.11, depth: 0.15 },
      this.scene
    )
    this.rightArm.material = skinMat
    this.rightArm.position.set(0.29, 0.6, 0)
    this.rightArm.parent = this.node
    applyFlat(this.rightArm)
    this.baseRightArmY = this.rightArm.position.y

    // Boots
    const bootMat = new StandardMaterial('playerBootMat', this.scene)
    bootMat.diffuseColor = bootColor
    bootMat.specularColor = Color3.Black()

    const leftBoot = MeshBuilder.CreateBox(
      'playerLeftBoot',
      { height: 0.1, width: 0.17, depth: 0.22 },
      this.scene
    )
    leftBoot.material = bootMat
    leftBoot.position.set(-0.12, 0.05, 0.03)
    leftBoot.parent = this.node
    applyFlat(leftBoot)

    const rightBoot = leftBoot.clone('playerRightBoot')
    if (rightBoot) {
      rightBoot.position.set(0.11, 0.04, 0.02)
      rightBoot.parent = this.node
    }

    // Hair cap
    const hair = MeshBuilder.CreateBox(
      'playerHair',
      { height: 0.1, width: 0.36, depth: 0.36 },
      this.scene
    )
    const hairMat = new StandardMaterial('playerHairMat', this.scene)
    hairMat.diffuseColor = hairColor
    hairMat.specularColor = Color3.Black()
    hair.material = hairMat
    hair.position.set(0, 1.07, 0)
    hair.parent = this.node
    applyFlat(hair)

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

  setHeightProvider(provider: (tileX: number, tileY: number) => number) {
    this.heightProvider = provider
    this.updateNodePosition()
  }

  setActionTarget(target: Position | null) {
    this.actionTarget = target ? { ...target } : null
  }

  setActionMode(mode: 'skilling' | 'combat' | 'cooking' | 'chopping' | null) {
    this.actionMode = mode
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
      this.walkTime = 0
      this.updateWalkPose(0)
      this.updateActionPose(delta)
      this.updateActionFacing()
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
    }
    this.updateFacingFromVector(dx, dy)

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

    this.walkTime += delta
    this.updateWalkPose(this.walkTime)
    this.updateActionPose(delta)
    this.updateActionFacing()
    this.updateNodePosition()
  }

  private updateWalkPose(time: number) {
    if (!this.isMoving) {
      if (!this.isActioning) {
        if (this.leftLeg) this.leftLeg.rotation.x = 0
        if (this.rightLeg) this.rightLeg.rotation.x = 0
        if (this.leftArm) this.leftArm.rotation.x = 0
        if (this.rightArm) this.rightArm.rotation.x = 0
      }
      return
    }

    const speed = 6
    const swing = Math.sin(time * speed)
    const legSwing = swing * 0.6
    const armSwing = -swing * 0.5

    if (this.leftLeg) this.leftLeg.rotation.x = legSwing
    if (this.rightLeg) this.rightLeg.rotation.x = -legSwing
    if (this.leftArm) this.leftArm.rotation.x = armSwing
    if (this.rightArm) this.rightArm.rotation.x = -armSwing
  }

  private updateActionPose(delta: number) {
    if (!this.isActioning || this.isMoving) {
      this.actionTime = 0
      if (!this.isMoving) {
        if (this.leftArm) this.leftArm.rotation.x = 0
        if (this.rightArm) this.rightArm.rotation.x = 0
        if (this.leftLeg) this.leftLeg.rotation.x = 0
        if (this.rightLeg) this.rightLeg.rotation.x = 0
        if (this.body) this.body.rotation.x = 0
        if (this.body) this.body.position.y = this.baseBodyY
        if (this.head) this.head.position.y = this.baseHeadY
        if (this.leftLeg) this.leftLeg.position.y = this.baseLeftLegY
        if (this.rightLeg) this.rightLeg.position.y = this.baseRightLegY
        if (this.leftArm) this.leftArm.position.y = this.baseLeftArmY
        if (this.rightArm) this.rightArm.position.y = this.baseRightArmY
      }
      return
    }

    this.actionTime += delta
    const mode = this.actionMode ?? 'skilling'
    const speed = mode === 'combat' ? 7 : mode === 'cooking' ? 3.5 : mode === 'chopping' ? 6 : 5
    const swing = Math.sin(this.actionTime * speed)

    if (mode === 'combat') {
      if (this.leftArm) this.leftArm.rotation.x = -0.6 + swing * 0.55
      if (this.rightArm) this.rightArm.rotation.x = -0.2 - swing * 0.4
      if (this.body) this.body.rotation.x = swing * 0.12
      if (this.leftLeg) this.leftLeg.rotation.x = -swing * 0.15
      if (this.rightLeg) this.rightLeg.rotation.x = swing * 0.15
    } else if (mode === 'cooking') {
      const bob = Math.sin(this.actionTime * 2.5) * 0.02
      if (this.body) this.body.position.y = this.baseBodyY - 0.16 + bob
      if (this.head) this.head.position.y = this.baseHeadY - 0.16 + bob
      if (this.leftLeg) this.leftLeg.position.y = this.baseLeftLegY - 0.1
      if (this.rightLeg) this.rightLeg.position.y = this.baseRightLegY - 0.1
      if (this.leftArm) this.leftArm.position.y = this.baseLeftArmY - 0.08
      if (this.rightArm) this.rightArm.position.y = this.baseRightArmY - 0.08
      if (this.leftArm) this.leftArm.rotation.x = -1.1 + swing * 0.3
      if (this.rightArm) this.rightArm.rotation.x = -1.1 - swing * 0.3
      if (this.body) this.body.rotation.x = -0.35 + swing * 0.08
      if (this.leftLeg) this.leftLeg.rotation.x = 0.9
      if (this.rightLeg) this.rightLeg.rotation.x = 0.9
    } else if (mode === 'chopping') {
      if (this.leftArm) this.leftArm.rotation.x = -0.8 + swing * 0.7
      if (this.rightArm) this.rightArm.rotation.x = -0.8 - swing * 0.7
      if (this.body) this.body.rotation.x = -0.05 + swing * 0.1
      if (this.leftLeg) this.leftLeg.rotation.x = -swing * 0.12
      if (this.rightLeg) this.rightLeg.rotation.x = swing * 0.12
    } else {
      if (this.leftArm) this.leftArm.rotation.x = -0.4 + swing * 0.35
      if (this.rightArm) this.rightArm.rotation.x = -0.4 - swing * 0.35
      if (this.body) this.body.rotation.x = swing * 0.08
      if (this.leftLeg) this.leftLeg.rotation.x = -swing * 0.1
      if (this.rightLeg) this.rightLeg.rotation.x = swing * 0.1
    }
  }

  private updateActionFacing() {
    if (!this.isActioning || this.isMoving || !this.actionTarget) {
      return
    }
    const dx = this.actionTarget.x - this.position.x
    const dy = this.actionTarget.y - this.position.y
    this.updateFacingFromVector(dx, dy)
  }

  private updateFacingFromVector(dx: number, dy: number) {
    if (dx === 0 && dy === 0) return
    const ang = Math.atan2(dx, dy)
    const step = Math.PI / 4
    this.node.rotation.y = Math.round(ang / step) * step
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
