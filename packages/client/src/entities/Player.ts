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
  private actionIndicatorTime: number = 0
  private baseBodyY: number = 0
  private baseHeadY: number = 0
  private baseLeftLegY: number = 0
  private baseRightLegY: number = 0
  private baseLeftArmY: number = 0
  private baseRightArmY: number = 0
  private baseLeftLegZ: number = 0
  private baseRightLegZ: number = 0
  private cachedTileX: number = -1
  private cachedTileY: number = -1
  private cachedHeightY: number = 0

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
    const bodyColor = new Color3(0.15, 0.15, 0.16) // #262829 Dark vest
    const trimColor = new Color3(0.9, 0.9, 0.9) // #e5e5e5 Shirt
    const beltColor = new Color3(0.18, 0.12, 0.07) // #2e1f12 Leather
    const skinColor = new Color3(0.96, 0.82, 0.66) // #f5d0a9 Skin tone
    const legColor = new Color3(0.17, 0.17, 0.18) // #2c2c2d Dark pants
    const bootColor = new Color3(0.34, 0.2, 0.08) // #573314 Boots
    const hairColor = new Color3(0.24, 0.18, 0.1) // #3d2e1a

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

    const trimMat = new StandardMaterial('playerTrimMat', this.scene)
    trimMat.diffuseColor = trimColor
    trimMat.specularColor = Color3.Black()

    const beltMat = new StandardMaterial('playerBeltMat', this.scene)
    beltMat.diffuseColor = beltColor
    beltMat.specularColor = Color3.Black()

    const applyFlat = (mesh: Mesh) => {
      mesh.convertToFlatShadedMesh()
    }

    // Torso (low-poly cylinder)
    this.body = MeshBuilder.CreateCylinder(
      'playerBody',
      { height: 0.66, diameterTop: 0.28, diameterBottom: 0.34, tessellation: 6 },
      this.scene
    )
    this.body.material = bodyMat
    this.body.position.y = 0.8
    this.body.parent = this.node
    applyFlat(this.body)
    this.baseBodyY = this.body.position.y

    // Head (low-poly sphere)
    this.head = MeshBuilder.CreateSphere('playerHead', { diameter: 0.36, segments: 6 }, this.scene)
    this.head.material = skinMat
    this.head.position.y = 1.22
    this.head.parent = this.node
    applyFlat(this.head)
    this.baseHeadY = this.head.position.y

    // Left leg (low-poly cylinder)
    this.leftLeg = MeshBuilder.CreateCylinder(
      'playerLeftLeg',
      { height: 0.6, diameterTop: 0.1, diameterBottom: 0.13, tessellation: 6 },
      this.scene
    )
    this.leftLeg.material = legMat
    this.leftLeg.position.set(-0.1, 0.3, 0)
    this.leftLeg.parent = this.node
    applyFlat(this.leftLeg)
    this.baseLeftLegY = this.leftLeg.position.y
    this.baseLeftLegZ = this.leftLeg.position.z

    // Right leg (low-poly cylinder)
    this.rightLeg = MeshBuilder.CreateCylinder(
      'playerRightLeg',
      { height: 0.6, diameterTop: 0.1, diameterBottom: 0.13, tessellation: 6 },
      this.scene
    )
    this.rightLeg.material = legMat
    this.rightLeg.position.set(0.1, 0.3, 0)
    this.rightLeg.parent = this.node
    applyFlat(this.rightLeg)
    this.baseRightLegY = this.rightLeg.position.y
    this.baseRightLegZ = this.rightLeg.position.z

    // Arms (low-poly cylinder)
    this.leftArm = MeshBuilder.CreateCylinder(
      'playerLeftArm',
      { height: 0.5, diameterTop: 0.085, diameterBottom: 0.11, tessellation: 6 },
      this.scene
    )
    this.leftArm.material = skinMat
    this.leftArm.position.set(-0.24, 0.84, 0)
    this.leftArm.parent = this.node
    applyFlat(this.leftArm)
    this.baseLeftArmY = this.leftArm.position.y

    this.rightArm = MeshBuilder.CreateCylinder(
      'playerRightArm',
      { height: 0.5, diameterTop: 0.085, diameterBottom: 0.11, tessellation: 6 },
      this.scene
    )
    this.rightArm.material = skinMat
    this.rightArm.position.set(0.24, 0.84, 0)
    this.rightArm.parent = this.node
    applyFlat(this.rightArm)
    this.baseRightArmY = this.rightArm.position.y

    // Boots
    const bootMat = new StandardMaterial('playerBootMat', this.scene)
    bootMat.diffuseColor = bootColor
    bootMat.specularColor = Color3.Black()

    const leftBoot = MeshBuilder.CreateBox(
      'playerLeftBoot',
      { height: 0.12, width: 0.16, depth: 0.22 },
      this.scene
    )
    leftBoot.material = bootMat
    leftBoot.position.set(-0.1, 0.06, 0.04)
    leftBoot.parent = this.node
    applyFlat(leftBoot)

    const rightBoot = leftBoot.clone('playerRightBoot')
    if (rightBoot) {
      rightBoot.position.set(0.1, 0.06, 0.04)
      rightBoot.parent = this.node
    }

    // Hair cap
    const hat = MeshBuilder.CreateBox(
      'playerHat',
      { height: 0.14, width: 0.4, depth: 0.36 },
      this.scene
    )
    const hatMat = new StandardMaterial('playerHatMat', this.scene)
    hatMat.diffuseColor = hairColor
    hatMat.specularColor = Color3.Black()
    hat.material = hatMat
    hat.position.set(0, 1.34, 0)
    hat.parent = this.node
    applyFlat(hat)

    const hatBrim = MeshBuilder.CreateBox(
      'playerHatBrim',
      { height: 0.03, width: 0.48, depth: 0.44 },
      this.scene
    )
    hatBrim.material = hatMat
    hatBrim.position.set(0, 1.26, 0.02)
    hatBrim.parent = this.node
    applyFlat(hatBrim)

    const shirtFront = MeshBuilder.CreateBox(
      'playerShirtFront',
      { height: 0.4, width: 0.18, depth: 0.04 },
      this.scene
    )
    shirtFront.material = trimMat
    shirtFront.position.set(0, 0.82, 0.19)
    shirtFront.parent = this.node
    applyFlat(shirtFront)

    const shirtCollar = MeshBuilder.CreateBox(
      'playerShirtCollar',
      { height: 0.1, width: 0.22, depth: 0.04 },
      this.scene
    )
    shirtCollar.material = trimMat
    shirtCollar.position.set(0, 1.06, 0.18)
    shirtCollar.parent = this.node
    applyFlat(shirtCollar)

    const vestLeft = MeshBuilder.CreateBox(
      'playerVestLeft',
      { height: 0.46, width: 0.12, depth: 0.05 },
      this.scene
    )
    vestLeft.material = bodyMat
    vestLeft.position.set(-0.11, 0.8, 0.18)
    vestLeft.parent = this.node
    applyFlat(vestLeft)

    const vestRight = vestLeft.clone('playerVestRight')
    if (vestRight) {
      vestRight.position.set(0.11, 0.8, 0.18)
      vestRight.parent = this.node
    }

    const belt = MeshBuilder.CreateBox(
      'playerBelt',
      { height: 0.06, width: 0.32, depth: 0.22 },
      this.scene
    )
    belt.material = beltMat
    belt.position.set(0, 0.62, 0)
    belt.parent = this.node
    applyFlat(belt)

    const beltBuckle = MeshBuilder.CreateBox(
      'playerBuckle',
      { height: 0.05, width: 0.08, depth: 0.04 },
      this.scene
    )
    beltBuckle.material = trimMat
    beltBuckle.position.set(0, 0.62, 0.13)
    beltBuckle.parent = this.node
    applyFlat(beltBuckle)

    const leftShoulder = MeshBuilder.CreateBox(
      'playerLeftShoulder',
      { height: 0.08, width: 0.1, depth: 0.12 },
      this.scene
    )
    leftShoulder.material = bodyMat
    leftShoulder.position.set(-0.22, 0.98, 0)
    leftShoulder.parent = this.node
    applyFlat(leftShoulder)

    const rightShoulder = leftShoulder.clone('playerRightShoulder')
    if (rightShoulder) {
      rightShoulder.position.set(0.22, 0.98, 0)
      rightShoulder.parent = this.node
    }

    const leftGlove = MeshBuilder.CreateSphere(
      'playerLeftGlove',
      { diameter: 0.1, segments: 6 },
      this.scene
    )
    leftGlove.material = beltMat
    leftGlove.position.set(-0.24, 0.58, 0.02)
    leftGlove.parent = this.node
    applyFlat(leftGlove)

    const rightGlove = leftGlove.clone('playerRightGlove')
    if (rightGlove) {
      rightGlove.position.set(0.24, 0.58, 0.02)
      rightGlove.parent = this.node
    }

    const cape = MeshBuilder.CreateBox(
      'playerCape',
      { height: 0.74, width: 0.24, depth: 0.04 },
      this.scene
    )
    cape.material = bodyMat
    cape.position.set(0, 0.86, -0.18)
    cape.parent = this.node
    applyFlat(cape)

    this.node.scaling.set(1.45, 1.45, 1.45)

    // Create action indicator spheres (hidden by default)
    const indicatorMat = new StandardMaterial('actionIndicatorMat', this.scene)
    indicatorMat.diffuseColor = new Color3(0.72, 0.53, 0.04) // #b8860b gold
    indicatorMat.specularColor = Color3.Black()
    indicatorMat.alpha = 0.8

    for (let i = 0; i < 3; i++) {
      const indicator = MeshBuilder.CreateSphere(
        `actionIndicator${i}`,
        { diameter: 0.08, segments: 6 },
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
    this.nameLabel.linkOffsetY = -72
  }

  private updateActionIndicators(delta: number) {
    if (!this.isActioning) {
      for (const indicator of this.actionIndicators) {
        indicator.isVisible = false
      }
      return
    }

    this.actionIndicatorTime += delta * 0.12
    const time = this.actionIndicatorTime
    for (let i = 0; i < this.actionIndicators.length; i++) {
      const angle = time + (i * Math.PI * 2) / 3
      const x = Math.cos(angle) * 0.5
      const z = Math.sin(angle) * 0.25
      this.actionIndicators[i].position.set(x, 0.75, z)
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
      this.updateActionIndicators(delta)
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
        if (this.leftLeg) this.leftLeg.position.z = this.baseLeftLegZ
        if (this.rightLeg) this.rightLeg.position.z = this.baseRightLegZ
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
    if (this.leftLeg) this.leftLeg.position.z = this.baseLeftLegZ + swing * 0.05
    if (this.rightLeg) this.rightLeg.position.z = this.baseRightLegZ - swing * 0.05
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
