import {
  Scene,
  TransformNode,
  MeshBuilder,
  Mesh
} from '@babylonjs/core'
import { TextBlock } from '@babylonjs/gui'
import { WorldObjectType, WORLD_OBJECT_DEFINITIONS, TILE_SIZE } from '@realm/shared'
import { SharedResources } from '../systems/SharedResources'

export class WorldObjectEntity {
  public id: string
  public objectType: WorldObjectType
  public depleted: boolean = false

  private scene: Scene
  private node: TransformNode
  private meshes: Mesh[] = []

  private x: number
  private y: number
  private heightProvider: ((tileX: number, tileY: number) => number) | null = null

  // Cached tile position to avoid redundant height lookups
  private cachedTileX: number = -1
  private cachedTileY: number = -1
  private cachedHeightY: number = 0

  private label: TextBlock | null = null
  private isHovered: boolean = false

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

  setHeightProvider(provider: (tileX: number, tileY: number) => number) {
    this.heightProvider = provider
    // Invalidate cache to force height recalculation with new provider
    this.cachedTileX = -1
    this.cachedTileY = -1
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
      case WorldObjectType.COOKING_RANGE:
        this.createCookingRange()
        break
      case WorldObjectType.MARKET_STALL_RED:
      case WorldObjectType.MARKET_STALL_BLUE:
      case WorldObjectType.MARKET_STALL_GREEN:
      case WorldObjectType.MARKET_STALL_YELLOW:
        this.createMarketStall()
        break
      case WorldObjectType.FOUNTAIN:
        this.createFountain()
        break
      case WorldObjectType.WELL:
        this.createWell()
        break
      case WorldObjectType.TORCH_STAND:
        this.createTorchStand()
        break
      case WorldObjectType.BARREL:
        this.createBarrel()
        break
      case WorldObjectType.CRATE:
        this.createCrate()
        break
      case WorldObjectType.ANVIL:
        this.createAnvil()
        break
      case WorldObjectType.BENCH:
        this.createBench()
        break
      case WorldObjectType.TABLE:
        this.createTable()
        break
      case WorldObjectType.FLOWER_PATCH:
        this.createFlowerPatch()
        break
      case WorldObjectType.SIGN_POST:
        this.createSignPost()
        break
      case WorldObjectType.HAY_BALE:
        this.createHayBale()
        break
      case WorldObjectType.BUSH:
        this.createBush()
        break
      case WorldObjectType.ROCK:
        this.createRock()
        break
    }
  }

  private createTree() {
    const res = SharedResources.get()

    // Trunk (low-poly cylinder)
    const trunk = MeshBuilder.CreateCylinder(
      'trunk_' + this.id,
      { height: 0.7, diameterTop: 0.18, diameterBottom: 0.26, tessellation: 6 },
      this.scene
    )
    trunk.material = res.trunkMaterial
    trunk.position.y = 0.35
    trunk.parent = this.node
    this.meshes.push(trunk)

    // Canopy - different colors for different tree types
    let canopyMat = res.greenCanopyMaterial
    if (this.objectType === WorldObjectType.OAK_TREE) {
      canopyMat = res.oakCanopyMaterial
    } else if (this.objectType === WorldObjectType.WILLOW_TREE) {
      canopyMat = res.willowCanopyMaterial
    }

    const canopy = MeshBuilder.CreateCylinder(
      'canopy_' + this.id,
      { height: 0.7, diameterTop: 0.2, diameterBottom: 1.0, tessellation: 6 },
      this.scene
    )
    canopy.material = canopyMat
    canopy.position.y = 1.0
    canopy.parent = this.node
    this.meshes.push(canopy)
  }

  private createFishingSpot() {
    const res = SharedResources.get()

    // Simple water disc - no particles for performance
    const disc = MeshBuilder.CreateDisc(
      'fishingDisc_' + this.id,
      { radius: 0.5, tessellation: 12 },
      this.scene
    )
    disc.material = res.waterMaterial
    disc.rotation.x = Math.PI / 2
    disc.position.y = 0.01
    disc.parent = this.node
    this.meshes.push(disc)
  }

  private createFire() {
    const res = SharedResources.get()

    // Logs
    const log1 = MeshBuilder.CreateCylinder(
      'log1_' + this.id,
      { height: 0.5, diameter: 0.12, tessellation: 6 },
      this.scene
    )
    log1.material = res.trunkMaterial
    log1.rotation.z = Math.PI / 2
    log1.position.set(-0.15, 0.06, 0)
    log1.parent = this.node
    this.meshes.push(log1)

    const log2 = MeshBuilder.CreateCylinder(
      'log2_' + this.id,
      { height: 0.5, diameter: 0.12, tessellation: 6 },
      this.scene
    )
    log2.material = res.trunkMaterial
    log2.rotation.z = Math.PI / 2
    log2.position.set(0.15, 0.06, 0)
    log2.parent = this.node
    this.meshes.push(log2)

    // Flame cone (no point light for performance)
    const flame = MeshBuilder.CreateCylinder(
      'flame_' + this.id,
      { height: 0.4, diameterTop: 0, diameterBottom: 0.25, tessellation: 6 },
      this.scene
    )
    flame.material = res.flameMaterial
    flame.position.y = 0.3
    flame.parent = this.node
    this.meshes.push(flame)

    // Inner flame
    const innerFlame = MeshBuilder.CreateCylinder(
      'innerFlame_' + this.id,
      { height: 0.25, diameterTop: 0, diameterBottom: 0.12, tessellation: 6 },
      this.scene
    )
    innerFlame.material = res.innerFlameMaterial
    innerFlame.position.y = 0.22
    innerFlame.parent = this.node
    this.meshes.push(innerFlame)
  }

  private createBankBooth() {
    const res = SharedResources.get()

    // Booth base
    const counter = MeshBuilder.CreateBox(
      'bankCounter_' + this.id,
      { width: 1.2, height: 0.5, depth: 0.6 },
      this.scene
    )
    counter.material = res.woodMaterial
    counter.position.y = 0.25
    counter.parent = this.node
    this.meshes.push(counter)

    // Counter top
    const top = MeshBuilder.CreateBox(
      'bankTop_' + this.id,
      { width: 1.3, height: 0.08, depth: 0.7 },
      this.scene
    )
    top.material = res.darkWoodMaterial
    top.position.y = 0.54
    top.parent = this.node
    this.meshes.push(top)

    // Gold trim
    const goldTrim = MeshBuilder.CreateBox(
      'bankGold_' + this.id,
      { width: 1.35, height: 0.04, depth: 0.75 },
      this.scene
    )
    goldTrim.material = res.goldMaterial
    goldTrim.position.y = 0.6
    goldTrim.parent = this.node
    this.meshes.push(goldTrim)

    // Bank sign
    const sign = MeshBuilder.CreateBox(
      'bankSign_' + this.id,
      { width: 0.5, height: 0.25, depth: 0.08 },
      this.scene
    )
    sign.material = res.goldMaterial
    sign.position.set(0, 0.85, -0.3)
    sign.parent = this.node
    this.meshes.push(sign)
  }

  private createCookingRange() {
    const res = SharedResources.get()

    // Stone base
    const base = MeshBuilder.CreateBox(
      'rangeBase_' + this.id,
      { width: 0.8, height: 0.4, depth: 0.6 },
      this.scene
    )
    base.material = res.stoneMaterial
    base.position.y = 0.2
    base.parent = this.node
    this.meshes.push(base)

    // Fire opening
    const opening = MeshBuilder.CreateBox(
      'rangeOpening_' + this.id,
      { width: 0.4, height: 0.25, depth: 0.1 },
      this.scene
    )
    opening.material = res.darkStoneMaterial
    opening.position.set(0, 0.15, 0.26)
    opening.parent = this.node
    this.meshes.push(opening)

    // Inner flame
    const flame = MeshBuilder.CreateCylinder(
      'rangeFlame_' + this.id,
      { height: 0.2, diameterTop: 0, diameterBottom: 0.2, tessellation: 6 },
      this.scene
    )
    flame.material = res.flameMaterial
    flame.position.set(0, 0.2, 0.15)
    flame.parent = this.node
    this.meshes.push(flame)

    // Cooking surface
    const surface = MeshBuilder.CreateBox(
      'rangeSurface_' + this.id,
      { width: 0.85, height: 0.05, depth: 0.65 },
      this.scene
    )
    surface.material = res.ironMaterial
    surface.position.y = 0.425
    surface.parent = this.node
    this.meshes.push(surface)
  }

  private createMarketStall() {
    const res = SharedResources.get()

    // Counter
    const counter = MeshBuilder.CreateBox(
      'stallCounter_' + this.id,
      { width: 1.0, height: 0.4, depth: 0.5 },
      this.scene
    )
    counter.material = res.woodMaterial
    counter.position.y = 0.2
    counter.parent = this.node
    this.meshes.push(counter)

    // Counter top
    const top = MeshBuilder.CreateBox(
      'stallTop_' + this.id,
      { width: 1.05, height: 0.05, depth: 0.55 },
      this.scene
    )
    top.material = res.darkWoodMaterial
    top.position.y = 0.425
    top.parent = this.node
    this.meshes.push(top)

    // Left post
    const leftPost = MeshBuilder.CreateCylinder(
      'stallLeftPost_' + this.id,
      { height: 1.0, diameter: 0.08, tessellation: 6 },
      this.scene
    )
    leftPost.material = res.woodMaterial
    leftPost.position.set(-0.45, 0.5, -0.2)
    leftPost.parent = this.node
    this.meshes.push(leftPost)

    // Right post
    const rightPost = MeshBuilder.CreateCylinder(
      'stallRightPost_' + this.id,
      { height: 1.0, diameter: 0.08, tessellation: 6 },
      this.scene
    )
    rightPost.material = res.woodMaterial
    rightPost.position.set(0.45, 0.5, -0.2)
    rightPost.parent = this.node
    this.meshes.push(rightPost)

    // Awning - color based on type
    let awningMat = res.redAwningMaterial
    if (this.objectType === WorldObjectType.MARKET_STALL_BLUE) {
      awningMat = res.blueAwningMaterial
    } else if (this.objectType === WorldObjectType.MARKET_STALL_GREEN) {
      awningMat = res.greenAwningMaterial
    } else if (this.objectType === WorldObjectType.MARKET_STALL_YELLOW) {
      awningMat = res.yellowAwningMaterial
    }

    const awning = MeshBuilder.CreateBox(
      'stallAwning_' + this.id,
      { width: 1.2, height: 0.05, depth: 0.7 },
      this.scene
    )
    awning.material = awningMat
    awning.position.set(0, 1.0, 0.1)
    awning.rotation.x = 0.2 // Slight tilt
    awning.parent = this.node
    this.meshes.push(awning)
  }

  private createFountain() {
    const res = SharedResources.get()

    // Stone pool base
    const pool = MeshBuilder.CreateCylinder(
      'fountainPool_' + this.id,
      { height: 0.3, diameter: 1.2, tessellation: 12 },
      this.scene
    )
    pool.material = res.stoneMaterial
    pool.position.y = 0.15
    pool.parent = this.node
    this.meshes.push(pool)

    // Inner pool (water)
    const water = MeshBuilder.CreateCylinder(
      'fountainWater_' + this.id,
      { height: 0.1, diameter: 1.0, tessellation: 12 },
      this.scene
    )
    water.material = res.waterMaterial
    water.position.y = 0.25
    water.parent = this.node
    this.meshes.push(water)

    // Center pedestal
    const pedestal = MeshBuilder.CreateCylinder(
      'fountainPedestal_' + this.id,
      { height: 0.6, diameter: 0.25, tessellation: 8 },
      this.scene
    )
    pedestal.material = res.stoneMaterial
    pedestal.position.y = 0.5
    pedestal.parent = this.node
    this.meshes.push(pedestal)

    // Top basin
    const basin = MeshBuilder.CreateCylinder(
      'fountainBasin_' + this.id,
      { height: 0.1, diameterTop: 0.5, diameterBottom: 0.3, tessellation: 8 },
      this.scene
    )
    basin.material = res.stoneMaterial
    basin.position.y = 0.85
    basin.parent = this.node
    this.meshes.push(basin)
  }

  private createWell() {
    const res = SharedResources.get()

    // Stone base
    const base = MeshBuilder.CreateCylinder(
      'wellBase_' + this.id,
      { height: 0.5, diameter: 0.8, tessellation: 10 },
      this.scene
    )
    base.material = res.stoneMaterial
    base.position.y = 0.25
    base.parent = this.node
    this.meshes.push(base)

    // Inner dark (hole)
    const hole = MeshBuilder.CreateCylinder(
      'wellHole_' + this.id,
      { height: 0.1, diameter: 0.55, tessellation: 10 },
      this.scene
    )
    hole.material = res.darkStoneMaterial
    hole.position.y = 0.46
    hole.parent = this.node
    this.meshes.push(hole)

    // Water surface
    const water = MeshBuilder.CreateCylinder(
      'wellWater_' + this.id,
      { height: 0.02, diameter: 0.5, tessellation: 10 },
      this.scene
    )
    water.material = res.waterMaterial
    water.position.y = 0.35
    water.parent = this.node
    this.meshes.push(water)

    // Roof support left
    const leftSupport = MeshBuilder.CreateCylinder(
      'wellLeftSupport_' + this.id,
      { height: 0.8, diameter: 0.08, tessellation: 6 },
      this.scene
    )
    leftSupport.material = res.woodMaterial
    leftSupport.position.set(-0.35, 0.9, 0)
    leftSupport.parent = this.node
    this.meshes.push(leftSupport)

    // Roof support right
    const rightSupport = MeshBuilder.CreateCylinder(
      'wellRightSupport_' + this.id,
      { height: 0.8, diameter: 0.08, tessellation: 6 },
      this.scene
    )
    rightSupport.material = res.woodMaterial
    rightSupport.position.set(0.35, 0.9, 0)
    rightSupport.parent = this.node
    this.meshes.push(rightSupport)

    // Roof
    const roof = MeshBuilder.CreateBox(
      'wellRoof_' + this.id,
      { width: 0.9, height: 0.08, depth: 0.5 },
      this.scene
    )
    roof.material = res.darkWoodMaterial
    roof.position.y = 1.35
    roof.parent = this.node
    this.meshes.push(roof)
  }

  private createTorchStand() {
    const res = SharedResources.get()

    // Post
    const post = MeshBuilder.CreateCylinder(
      'torchPost_' + this.id,
      { height: 1.0, diameter: 0.1, tessellation: 6 },
      this.scene
    )
    post.material = res.woodMaterial
    post.position.y = 0.5
    post.parent = this.node
    this.meshes.push(post)

    // Torch holder
    const holder = MeshBuilder.CreateBox(
      'torchHolder_' + this.id,
      { width: 0.15, height: 0.12, depth: 0.15 },
      this.scene
    )
    holder.material = res.ironMaterial
    holder.position.y = 1.0
    holder.parent = this.node
    this.meshes.push(holder)

    // Flame
    const flame = MeshBuilder.CreateCylinder(
      'torchFlame_' + this.id,
      { height: 0.25, diameterTop: 0, diameterBottom: 0.15, tessellation: 6 },
      this.scene
    )
    flame.material = res.flameMaterial
    flame.position.y = 1.2
    flame.parent = this.node
    this.meshes.push(flame)

    // Inner flame
    const innerFlame = MeshBuilder.CreateCylinder(
      'torchInnerFlame_' + this.id,
      { height: 0.15, diameterTop: 0, diameterBottom: 0.08, tessellation: 6 },
      this.scene
    )
    innerFlame.material = res.innerFlameMaterial
    innerFlame.position.y = 1.15
    innerFlame.parent = this.node
    this.meshes.push(innerFlame)
  }

  private createBarrel() {
    const res = SharedResources.get()

    // Main barrel body
    const body = MeshBuilder.CreateCylinder(
      'barrelBody_' + this.id,
      { height: 0.5, diameterTop: 0.35, diameterBottom: 0.35, tessellation: 12 },
      this.scene
    )
    body.material = res.woodMaterial
    body.position.y = 0.25
    body.parent = this.node
    this.meshes.push(body)

    // Middle bulge (barrels are wider in the middle)
    const bulge = MeshBuilder.CreateCylinder(
      'barrelBulge_' + this.id,
      { height: 0.2, diameter: 0.4, tessellation: 12 },
      this.scene
    )
    bulge.material = res.woodMaterial
    bulge.position.y = 0.25
    bulge.parent = this.node
    this.meshes.push(bulge)

    // Metal band top
    const bandTop = MeshBuilder.CreateTorus(
      'barrelBandTop_' + this.id,
      { diameter: 0.36, thickness: 0.02, tessellation: 12 },
      this.scene
    )
    bandTop.material = res.ironMaterial
    bandTop.rotation.x = Math.PI / 2
    bandTop.position.y = 0.45
    bandTop.parent = this.node
    this.meshes.push(bandTop)

    // Metal band bottom
    const bandBottom = MeshBuilder.CreateTorus(
      'barrelBandBottom_' + this.id,
      { diameter: 0.36, thickness: 0.02, tessellation: 12 },
      this.scene
    )
    bandBottom.material = res.ironMaterial
    bandBottom.rotation.x = Math.PI / 2
    bandBottom.position.y = 0.05
    bandBottom.parent = this.node
    this.meshes.push(bandBottom)
  }

  private createCrate() {
    const res = SharedResources.get()

    // Simple wooden crate
    const crate = MeshBuilder.CreateBox(
      'crate_' + this.id,
      { width: 0.45, height: 0.4, depth: 0.45 },
      this.scene
    )
    crate.material = res.woodMaterial
    crate.position.y = 0.2
    crate.parent = this.node
    this.meshes.push(crate)

    // Top edge (darker wood)
    const topEdge = MeshBuilder.CreateBox(
      'crateTop_' + this.id,
      { width: 0.48, height: 0.04, depth: 0.48 },
      this.scene
    )
    topEdge.material = res.darkWoodMaterial
    topEdge.position.y = 0.42
    topEdge.parent = this.node
    this.meshes.push(topEdge)
  }

  private createAnvil() {
    const res = SharedResources.get()

    // Base
    const base = MeshBuilder.CreateBox(
      'anvilBase_' + this.id,
      { width: 0.4, height: 0.2, depth: 0.25 },
      this.scene
    )
    base.material = res.ironMaterial
    base.position.y = 0.1
    base.parent = this.node
    this.meshes.push(base)

    // Working surface
    const surface = MeshBuilder.CreateBox(
      'anvilSurface_' + this.id,
      { width: 0.5, height: 0.15, depth: 0.3 },
      this.scene
    )
    surface.material = res.ironMaterial
    surface.position.y = 0.275
    surface.parent = this.node
    this.meshes.push(surface)

    // Horn (pointed end)
    const horn = MeshBuilder.CreateCylinder(
      'anvilHorn_' + this.id,
      { height: 0.2, diameterTop: 0.02, diameterBottom: 0.12, tessellation: 8 },
      this.scene
    )
    horn.material = res.ironMaterial
    horn.rotation.z = Math.PI / 2
    horn.position.set(0.35, 0.3, 0)
    horn.parent = this.node
    this.meshes.push(horn)
  }

  private createBench() {
    const res = SharedResources.get()

    // Seat
    const seat = MeshBuilder.CreateBox(
      'benchSeat_' + this.id,
      { width: 0.8, height: 0.06, depth: 0.25 },
      this.scene
    )
    seat.material = res.woodMaterial
    seat.position.y = 0.3
    seat.parent = this.node
    this.meshes.push(seat)

    // Left leg
    const leftLeg = MeshBuilder.CreateBox(
      'benchLeftLeg_' + this.id,
      { width: 0.08, height: 0.27, depth: 0.2 },
      this.scene
    )
    leftLeg.material = res.darkWoodMaterial
    leftLeg.position.set(-0.32, 0.135, 0)
    leftLeg.parent = this.node
    this.meshes.push(leftLeg)

    // Right leg
    const rightLeg = MeshBuilder.CreateBox(
      'benchRightLeg_' + this.id,
      { width: 0.08, height: 0.27, depth: 0.2 },
      this.scene
    )
    rightLeg.material = res.darkWoodMaterial
    rightLeg.position.set(0.32, 0.135, 0)
    rightLeg.parent = this.node
    this.meshes.push(rightLeg)
  }

  private createTable() {
    const res = SharedResources.get()

    // Table top
    const top = MeshBuilder.CreateBox(
      'tableTop_' + this.id,
      { width: 0.7, height: 0.05, depth: 0.5 },
      this.scene
    )
    top.material = res.woodMaterial
    top.position.y = 0.45
    top.parent = this.node
    this.meshes.push(top)

    // Four legs
    const legPositions = [
      { x: -0.28, z: -0.18 },
      { x: 0.28, z: -0.18 },
      { x: -0.28, z: 0.18 },
      { x: 0.28, z: 0.18 }
    ]

    legPositions.forEach((pos, i) => {
      const leg = MeshBuilder.CreateCylinder(
        `tableLeg${i}_` + this.id,
        { height: 0.42, diameter: 0.06, tessellation: 6 },
        this.scene
      )
      leg.material = res.darkWoodMaterial
      leg.position.set(pos.x, 0.21, pos.z)
      leg.parent = this.node
      this.meshes.push(leg)
    })
  }

  private createFlowerPatch() {
    const res = SharedResources.get()

    // Ground disc
    const ground = MeshBuilder.CreateDisc(
      'flowerGround_' + this.id,
      { radius: 0.35, tessellation: 8 },
      this.scene
    )
    ground.material = res.greenCanopyMaterial
    ground.rotation.x = Math.PI / 2
    ground.position.y = 0.01
    ground.parent = this.node
    this.meshes.push(ground)

    // Flower stems with petals
    const flowers = [
      { x: 0.1, z: 0.1, mat: res.flowerRedMaterial },
      { x: -0.15, z: 0.05, mat: res.flowerYellowMaterial },
      { x: 0, z: -0.12, mat: res.flowerPinkMaterial },
      { x: 0.12, z: -0.08, mat: res.flowerRedMaterial },
      { x: -0.08, z: -0.15, mat: res.flowerYellowMaterial }
    ]

    flowers.forEach((f, i) => {
      // Stem
      const stem = MeshBuilder.CreateCylinder(
        `flowerStem${i}_` + this.id,
        { height: 0.15, diameter: 0.02, tessellation: 4 },
        this.scene
      )
      stem.material = res.greenCanopyMaterial
      stem.position.set(f.x, 0.08, f.z)
      stem.parent = this.node
      this.meshes.push(stem)

      // Flower head
      const head = MeshBuilder.CreateSphere(
        `flowerHead${i}_` + this.id,
        { diameter: 0.08, segments: 6 },
        this.scene
      )
      head.material = f.mat
      head.position.set(f.x, 0.18, f.z)
      head.parent = this.node
      this.meshes.push(head)
    })
  }

  private createSignPost() {
    const res = SharedResources.get()

    // Post
    const post = MeshBuilder.CreateCylinder(
      'signPost_' + this.id,
      { height: 1.0, diameter: 0.1, tessellation: 6 },
      this.scene
    )
    post.material = res.woodMaterial
    post.position.y = 0.5
    post.parent = this.node
    this.meshes.push(post)

    // Sign board
    const board = MeshBuilder.CreateBox(
      'signBoard_' + this.id,
      { width: 0.5, height: 0.3, depth: 0.05 },
      this.scene
    )
    board.material = res.darkWoodMaterial
    board.position.set(0, 0.9, 0.1)
    board.parent = this.node
    this.meshes.push(board)
  }

  private createHayBale() {
    const res = SharedResources.get()

    // Horizontal cylinder
    const bale = MeshBuilder.CreateCylinder(
      'hayBale_' + this.id,
      { height: 0.5, diameter: 0.45, tessellation: 12 },
      this.scene
    )
    bale.material = res.hayMaterial
    bale.rotation.z = Math.PI / 2
    bale.position.y = 0.225
    bale.parent = this.node
    this.meshes.push(bale)
  }

  private createBush() {
    const res = SharedResources.get()

    // Squashed sphere
    const bush = MeshBuilder.CreateSphere(
      'bush_' + this.id,
      { diameterX: 0.6, diameterY: 0.4, diameterZ: 0.6, segments: 8 },
      this.scene
    )
    bush.material = res.bushMaterial
    bush.position.y = 0.2
    bush.parent = this.node
    this.meshes.push(bush)
  }

  private createRock() {
    const res = SharedResources.get()

    // Irregular-looking sphere (using icosphere for more natural look)
    const rock = MeshBuilder.CreateSphere(
      'rock_' + this.id,
      { diameterX: 0.5, diameterY: 0.35, diameterZ: 0.45, segments: 6 },
      this.scene
    )
    rock.material = res.rockMaterial
    rock.position.y = 0.15
    rock.rotation.y = Math.random() * Math.PI * 2 // Random rotation
    rock.parent = this.node
    this.meshes.push(rock)
  }

  private createDepletedObject() {
    if (
      this.objectType === WorldObjectType.TREE ||
      this.objectType === WorldObjectType.OAK_TREE ||
      this.objectType === WorldObjectType.WILLOW_TREE
    ) {
      const res = SharedResources.get()

      // Tree stump
      const stump = MeshBuilder.CreateCylinder(
        'stump_' + this.id,
        { height: 0.2, diameter: 0.35, tessellation: 8 },
        this.scene
      )
      stump.material = res.stumpMaterial
      stump.position.y = 0.1
      stump.parent = this.node
      this.meshes.push(stump)

      // Stump top
      const top = MeshBuilder.CreateDisc(
        'stumpTop_' + this.id,
        { radius: 0.175, tessellation: 8 },
        this.scene
      )
      top.material = res.stumpTopMaterial
      top.rotation.x = -Math.PI / 2
      top.position.y = 0.201
      top.parent = this.node
      this.meshes.push(top)
    }
  }

  private createLabel() {
    const def = WORLD_OBJECT_DEFINITIONS[this.objectType]
    if (!def) return

    const res = SharedResources.get()
    this.label = res.createLabel(this.id, `${def.action} ${def.name}`)
    this.label.linkWithMesh(this.node)
    this.label.linkOffsetY = -50
  }

  setHovered(isHovered: boolean) {
    this.isHovered = isHovered
    if (this.label) {
      this.label.isVisible = isHovered && !this.depleted
    }
    // Removed outline rendering for performance
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

    // Cache height lookup to avoid redundant calls
    if (tileX !== this.cachedTileX || tileY !== this.cachedTileY) {
      this.cachedHeightY = this.heightProvider ? this.heightProvider(tileX, tileY) : 0
      this.cachedTileX = tileX
      this.cachedTileY = tileY
    }

    // Use position.set() instead of creating new Vector3 to avoid allocations
    this.node.position.set(this.x * scale, this.cachedHeightY, this.y * scale)
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
    if (this.label) {
      SharedResources.get().removeControl(this.label)
    }
  }
}
