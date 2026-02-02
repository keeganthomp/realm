import {
  Scene,
  TransformNode,
  MeshBuilder,
  Mesh,
  InstancedMesh,
  Color3
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
  private meshes: (Mesh | InstancedMesh)[] = []

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
    // Note: Don't freeze here - height provider not set yet
    // Meshes will be frozen in setHeightProvider after correct position is set
  }

  setHeightProvider(provider: (tileX: number, tileY: number) => number) {
    this.heightProvider = provider
    // Invalidate cache to force height recalculation with new provider
    this.cachedTileX = -1
    this.cachedTileY = -1
    this.updateNodePosition()
    // Now that we have correct height, freeze meshes for performance
    this.freezeMeshes()
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
      case WorldObjectType.MARKET_STALL_FOOD:
      case WorldObjectType.MARKET_STALL_WEAPONS:
      case WorldObjectType.MARKET_STALL_GENERAL:
      case WorldObjectType.MARKET_STALL_FISH:
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
      // Mining ores
      case WorldObjectType.COPPER_ORE:
      case WorldObjectType.TIN_ORE:
      case WorldObjectType.IRON_ORE:
      case WorldObjectType.COAL_ORE:
        this.createOreRock()
        break
      // Interior furniture
      case WorldObjectType.COUNTER:
      case WorldObjectType.BAR_COUNTER:
        this.createCounter()
        break
      case WorldObjectType.BOOKSHELF:
        this.createBookshelf()
        break
      case WorldObjectType.BED:
        this.createBed()
        break
      case WorldObjectType.CHAIR:
        this.createChair()
        break
      case WorldObjectType.STOOL:
        this.createStool()
        break
      case WorldObjectType.FIREPLACE:
        this.createFireplace()
        break
      case WorldObjectType.CHEST:
        this.createChest()
        break
      case WorldObjectType.LADDER:
        this.createLadder()
        break
      // Wilderness structures
      case WorldObjectType.GOBLIN_TENT:
        this.createGoblinTent()
        break
      case WorldObjectType.PALISADE_WALL:
        this.createPalisadeWall()
        break
      case WorldObjectType.CAMPFIRE_LARGE:
        this.createLargeCampfire()
        break
      case WorldObjectType.BONES_PILE:
        this.createBonesPile()
        break
      // Ruins
      case WorldObjectType.RUINED_WALL:
        this.createRuinedWall()
        break
      case WorldObjectType.RUINED_COLUMN:
        this.createRuinedColumn()
        break
      case WorldObjectType.STONE_RUBBLE:
        this.createStoneRubble()
        break
      case WorldObjectType.ANCIENT_ALTAR:
        this.createAncientAltar()
        break
      // Nature
      case WorldObjectType.FALLEN_LOG:
        this.createFallenLog()
        break
      case WorldObjectType.MUSHROOM_PATCH:
        this.createMushroomPatch()
        break
      case WorldObjectType.OLD_STUMP:
        this.createOldStump()
        break
      // Mine props
      case WorldObjectType.MINE_CART:
        this.createMineCart()
        break
      case WorldObjectType.MINE_ENTRANCE:
        this.createMineEntrance()
        break
      // Veil dimension
      case WorldObjectType.VEIL_RIFT:
        this.createVeilRift()
        break
      case WorldObjectType.VEIL_CRYSTAL:
        this.createVeilCrystal()
        break
      case WorldObjectType.VEIL_TOUCHED_PLANT:
        this.createVeilTouchedPlant()
        break
      case WorldObjectType.WARDEN_MONUMENT:
        this.createWardenMonument()
        break

      // Signs and lore
      case WorldObjectType.TOWN_SIGN:
        this.createTownSign()
        break
      case WorldObjectType.LORE_PLAQUE:
        this.createLorePlaque()
        break
      case WorldObjectType.NOTICE_BOARD:
        this.createNoticeBoard()
        break
    }
  }

  private createTree() {
    const res = SharedResources.get()

    // Initialize trunk template and create instance
    res.getTreeTrunkTemplate()
    const trunk = res.createMeshInstance('treeTrunk', this.id, this.node)
    if (trunk) {
      trunk.position.y = 0.35
      this.meshes.push(trunk)
    }

    // Canopy - different materials per tree type, so create individually
    // (Could be further optimized with per-material templates if needed)
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

    // Awning - color based on shop type
    let awningMat = res.redAwningMaterial
    if (this.objectType === WorldObjectType.MARKET_STALL_WEAPONS) {
      awningMat = res.blueAwningMaterial
    } else if (this.objectType === WorldObjectType.MARKET_STALL_GENERAL) {
      awningMat = res.greenAwningMaterial
    } else if (this.objectType === WorldObjectType.MARKET_STALL_FISH) {
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

    // Initialize templates (creates once, reuses thereafter)
    res.getBarrelBodyTemplate()
    res.getBarrelBulgeTemplate()
    res.getBarrelBandTemplate()

    // Create instances from templates
    const body = res.createMeshInstance('barrelBody', this.id, this.node)
    if (body) {
      body.position.y = 0.25
      this.meshes.push(body)
    }

    const bulge = res.createMeshInstance('barrelBulge', this.id + '_bulge', this.node)
    if (bulge) {
      bulge.position.y = 0.25
      this.meshes.push(bulge)
    }

    const bandTop = res.createMeshInstance('barrelBand', this.id + '_top', this.node)
    if (bandTop) {
      bandTop.rotation.x = Math.PI / 2
      bandTop.position.y = 0.45
      this.meshes.push(bandTop)
    }

    const bandBottom = res.createMeshInstance('barrelBand', this.id + '_bottom', this.node)
    if (bandBottom) {
      bandBottom.rotation.x = Math.PI / 2
      bandBottom.position.y = 0.05
      this.meshes.push(bandBottom)
    }
  }

  private createCrate() {
    const res = SharedResources.get()

    // Initialize templates
    res.getCrateTemplate()
    res.getCrateTopTemplate()

    // Create instances
    const crate = res.createMeshInstance('crate', this.id, this.node)
    if (crate) {
      crate.position.y = 0.2
      this.meshes.push(crate)
    }

    const topEdge = res.createMeshInstance('crateTop', this.id + '_top', this.node)
    if (topEdge) {
      topEdge.position.y = 0.42
      this.meshes.push(topEdge)
    }
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

    // Initialize template and create instance
    res.getBushTemplate()
    const bush = res.createMeshInstance('bush', this.id, this.node)
    if (bush) {
      bush.position.y = 0.2
      this.meshes.push(bush)
    }
  }

  private createRock() {
    const res = SharedResources.get()

    // Initialize template and create instance
    res.getRockTemplate()
    const rock = res.createMeshInstance('rock', this.id, this.node)
    if (rock) {
      rock.position.y = 0.15
      rock.rotation.y = Math.random() * Math.PI * 2 // Random rotation per instance
      this.meshes.push(rock)
    }
  }

  // ============ ORE ROCKS ============
  private createOreRock() {
    const res = SharedResources.get()

    // Base rock boulder
    const rock = MeshBuilder.CreateSphere(
      'oreBase_' + this.id,
      { diameterX: 0.7, diameterY: 0.5, diameterZ: 0.6, segments: 6 },
      this.scene
    )
    rock.material = res.rockMaterial
    rock.position.y = 0.25
    rock.parent = this.node
    this.meshes.push(rock)

    // Ore veins - color based on type
    let veinMat = res.copperVeinMaterial
    if (this.objectType === WorldObjectType.TIN_ORE) {
      veinMat = res.tinVeinMaterial
    } else if (this.objectType === WorldObjectType.IRON_ORE) {
      veinMat = res.ironVeinMaterial
    } else if (this.objectType === WorldObjectType.COAL_ORE) {
      veinMat = res.coalVeinMaterial
    }

    // Add ore vein patches
    const veinPositions = [
      { x: 0.2, y: 0.3, z: 0.2 },
      { x: -0.15, y: 0.35, z: 0.15 },
      { x: 0.1, y: 0.2, z: -0.2 }
    ]

    veinPositions.forEach((pos, i) => {
      const vein = MeshBuilder.CreateSphere(
        `oreVein${i}_` + this.id,
        { diameter: 0.12, segments: 4 },
        this.scene
      )
      vein.material = veinMat
      vein.position.set(pos.x, pos.y, pos.z)
      vein.parent = this.node
      this.meshes.push(vein)
    })
  }

  // ============ INTERIOR FURNITURE ============
  private createCounter() {
    const res = SharedResources.get()

    const counter = MeshBuilder.CreateBox(
      'counter_' + this.id,
      { width: 0.9, height: 0.5, depth: 0.4 },
      this.scene
    )
    counter.material = res.darkWoodMaterial
    counter.position.y = 0.25
    counter.parent = this.node
    this.meshes.push(counter)

    const top = MeshBuilder.CreateBox(
      'counterTop_' + this.id,
      { width: 0.95, height: 0.05, depth: 0.45 },
      this.scene
    )
    top.material = res.woodMaterial
    top.position.y = 0.525
    top.parent = this.node
    this.meshes.push(top)
  }

  private createBookshelf() {
    const res = SharedResources.get()

    const back = MeshBuilder.CreateBox(
      'bookshelfBack_' + this.id,
      { width: 0.8, height: 1.0, depth: 0.1 },
      this.scene
    )
    back.material = res.darkWoodMaterial
    back.position.set(0, 0.5, -0.15)
    back.parent = this.node
    this.meshes.push(back)

    // Shelves
    for (let i = 0; i < 4; i++) {
      const shelf = MeshBuilder.CreateBox(
        `bookshelfShelf${i}_` + this.id,
        { width: 0.8, height: 0.04, depth: 0.25 },
        this.scene
      )
      shelf.material = res.woodMaterial
      shelf.position.set(0, 0.2 + i * 0.25, 0)
      shelf.parent = this.node
      this.meshes.push(shelf)
    }
  }

  private createBed() {
    const res = SharedResources.get()

    // Frame
    const frame = MeshBuilder.CreateBox(
      'bedFrame_' + this.id,
      { width: 0.8, height: 0.2, depth: 1.2 },
      this.scene
    )
    frame.material = res.darkWoodMaterial
    frame.position.y = 0.1
    frame.parent = this.node
    this.meshes.push(frame)

    // Mattress
    const mattress = MeshBuilder.CreateBox(
      'bedMattress_' + this.id,
      { width: 0.7, height: 0.15, depth: 1.0 },
      this.scene
    )
    mattress.material = res.fabricMaterial
    mattress.position.y = 0.275
    mattress.parent = this.node
    this.meshes.push(mattress)

    // Pillow
    const pillow = MeshBuilder.CreateBox(
      'bedPillow_' + this.id,
      { width: 0.5, height: 0.1, depth: 0.2 },
      this.scene
    )
    pillow.material = res.fabricMaterial
    pillow.position.set(0, 0.4, -0.35)
    pillow.parent = this.node
    this.meshes.push(pillow)
  }

  private createChair() {
    const res = SharedResources.get()

    // Seat
    const seat = MeshBuilder.CreateBox(
      'chairSeat_' + this.id,
      { width: 0.35, height: 0.04, depth: 0.35 },
      this.scene
    )
    seat.material = res.woodMaterial
    seat.position.y = 0.3
    seat.parent = this.node
    this.meshes.push(seat)

    // Back
    const back = MeshBuilder.CreateBox(
      'chairBack_' + this.id,
      { width: 0.35, height: 0.35, depth: 0.04 },
      this.scene
    )
    back.material = res.woodMaterial
    back.position.set(0, 0.5, -0.15)
    back.parent = this.node
    this.meshes.push(back)

    // Legs
    const legPositions = [
      { x: -0.12, z: -0.12 },
      { x: 0.12, z: -0.12 },
      { x: -0.12, z: 0.12 },
      { x: 0.12, z: 0.12 }
    ]
    legPositions.forEach((pos, i) => {
      const leg = MeshBuilder.CreateCylinder(
        `chairLeg${i}_` + this.id,
        { height: 0.28, diameter: 0.04, tessellation: 6 },
        this.scene
      )
      leg.material = res.darkWoodMaterial
      leg.position.set(pos.x, 0.14, pos.z)
      leg.parent = this.node
      this.meshes.push(leg)
    })
  }

  private createStool() {
    const res = SharedResources.get()

    const seat = MeshBuilder.CreateCylinder(
      'stoolSeat_' + this.id,
      { height: 0.05, diameter: 0.3, tessellation: 12 },
      this.scene
    )
    seat.material = res.woodMaterial
    seat.position.y = 0.35
    seat.parent = this.node
    this.meshes.push(seat)

    // Three legs
    for (let i = 0; i < 3; i++) {
      const angle = (i * 2 * Math.PI) / 3
      const leg = MeshBuilder.CreateCylinder(
        `stoolLeg${i}_` + this.id,
        { height: 0.32, diameter: 0.04, tessellation: 6 },
        this.scene
      )
      leg.material = res.darkWoodMaterial
      leg.position.set(Math.sin(angle) * 0.1, 0.16, Math.cos(angle) * 0.1)
      leg.parent = this.node
      this.meshes.push(leg)
    }
  }

  private createFireplace() {
    const res = SharedResources.get()

    // Stone back
    const back = MeshBuilder.CreateBox(
      'fireplaceBack_' + this.id,
      { width: 1.0, height: 0.9, depth: 0.3 },
      this.scene
    )
    back.material = res.stoneMaterial
    back.position.set(0, 0.45, -0.3)
    back.parent = this.node
    this.meshes.push(back)

    // Stone sides
    const leftSide = MeshBuilder.CreateBox(
      'fireplaceLeft_' + this.id,
      { width: 0.2, height: 0.6, depth: 0.4 },
      this.scene
    )
    leftSide.material = res.stoneMaterial
    leftSide.position.set(-0.45, 0.3, -0.1)
    leftSide.parent = this.node
    this.meshes.push(leftSide)

    const rightSide = MeshBuilder.CreateBox(
      'fireplaceRight_' + this.id,
      { width: 0.2, height: 0.6, depth: 0.4 },
      this.scene
    )
    rightSide.material = res.stoneMaterial
    rightSide.position.set(0.45, 0.3, -0.1)
    rightSide.parent = this.node
    this.meshes.push(rightSide)

    // Fire
    const flame = MeshBuilder.CreateCylinder(
      'fireplaceFlame_' + this.id,
      { height: 0.35, diameterTop: 0, diameterBottom: 0.3, tessellation: 6 },
      this.scene
    )
    flame.material = res.flameMaterial
    flame.position.set(0, 0.3, -0.1)
    flame.parent = this.node
    this.meshes.push(flame)

    // Mantle
    const mantle = MeshBuilder.CreateBox(
      'fireplaceMantle_' + this.id,
      { width: 1.2, height: 0.08, depth: 0.4 },
      this.scene
    )
    mantle.material = res.darkWoodMaterial
    mantle.position.set(0, 0.75, -0.05)
    mantle.parent = this.node
    this.meshes.push(mantle)
  }

  private createChest() {
    const res = SharedResources.get()

    // Body
    const body = MeshBuilder.CreateBox(
      'chestBody_' + this.id,
      { width: 0.5, height: 0.3, depth: 0.35 },
      this.scene
    )
    body.material = res.woodMaterial
    body.position.y = 0.15
    body.parent = this.node
    this.meshes.push(body)

    // Lid
    const lid = MeshBuilder.CreateCylinder(
      'chestLid_' + this.id,
      { height: 0.5, diameter: 0.35, tessellation: 12, arc: 0.5 },
      this.scene
    )
    lid.material = res.woodMaterial
    lid.rotation.z = Math.PI / 2
    lid.position.set(0, 0.3, 0)
    lid.parent = this.node
    this.meshes.push(lid)

    // Metal bands
    const band = MeshBuilder.CreateBox(
      'chestBand_' + this.id,
      { width: 0.52, height: 0.35, depth: 0.02 },
      this.scene
    )
    band.material = res.ironMaterial
    band.position.set(0, 0.22, 0.17)
    band.parent = this.node
    this.meshes.push(band)
  }

  private createLadder() {
    const res = SharedResources.get()

    // Side rails
    const leftRail = MeshBuilder.CreateBox(
      'ladderLeft_' + this.id,
      { width: 0.05, height: 1.2, depth: 0.05 },
      this.scene
    )
    leftRail.material = res.woodMaterial
    leftRail.position.set(-0.15, 0.6, 0)
    leftRail.parent = this.node
    this.meshes.push(leftRail)

    const rightRail = MeshBuilder.CreateBox(
      'ladderRight_' + this.id,
      { width: 0.05, height: 1.2, depth: 0.05 },
      this.scene
    )
    rightRail.material = res.woodMaterial
    rightRail.position.set(0.15, 0.6, 0)
    rightRail.parent = this.node
    this.meshes.push(rightRail)

    // Rungs
    for (let i = 0; i < 5; i++) {
      const rung = MeshBuilder.CreateBox(
        `ladderRung${i}_` + this.id,
        { width: 0.25, height: 0.03, depth: 0.05 },
        this.scene
      )
      rung.material = res.darkWoodMaterial
      rung.position.set(0, 0.2 + i * 0.22, 0)
      rung.parent = this.node
      this.meshes.push(rung)
    }
  }

  // ============ WILDERNESS STRUCTURES ============
  private createGoblinTent() {
    const res = SharedResources.get()

    // Cone-shaped tent
    const tent = MeshBuilder.CreateCylinder(
      'goblinTent_' + this.id,
      { height: 0.9, diameterTop: 0.05, diameterBottom: 1.0, tessellation: 6 },
      this.scene
    )
    tent.material = res.leatherMaterial
    tent.position.y = 0.45
    tent.parent = this.node
    this.meshes.push(tent)

    // Support poles
    const poleAngles = [0, Math.PI * 0.66, Math.PI * 1.33]
    poleAngles.forEach((angle, i) => {
      const pole = MeshBuilder.CreateCylinder(
        `tentPole${i}_` + this.id,
        { height: 1.0, diameter: 0.04, tessellation: 4 },
        this.scene
      )
      pole.material = res.woodMaterial
      pole.rotation.z = 0.3
      pole.rotation.y = angle
      pole.position.y = 0.5
      pole.parent = this.node
      this.meshes.push(pole)
    })
  }

  private createPalisadeWall() {
    const res = SharedResources.get()

    // Row of wooden stakes
    for (let i = 0; i < 5; i++) {
      const stake = MeshBuilder.CreateCylinder(
        `palisadeStake${i}_` + this.id,
        { height: 0.9 + Math.random() * 0.2, diameterTop: 0.02, diameterBottom: 0.08, tessellation: 6 },
        this.scene
      )
      stake.material = res.woodMaterial
      stake.position.set(-0.3 + i * 0.15, 0.45, 0)
      stake.parent = this.node
      this.meshes.push(stake)
    }
  }

  private createLargeCampfire() {
    const res = SharedResources.get()

    // Stone ring
    for (let i = 0; i < 8; i++) {
      const angle = (i * 2 * Math.PI) / 8
      const stone = MeshBuilder.CreateSphere(
        `campfireStone${i}_` + this.id,
        { diameter: 0.15, segments: 4 },
        this.scene
      )
      stone.material = res.stoneMaterial
      stone.position.set(Math.sin(angle) * 0.35, 0.07, Math.cos(angle) * 0.35)
      stone.parent = this.node
      this.meshes.push(stone)
    }

    // Logs
    for (let i = 0; i < 3; i++) {
      const log = MeshBuilder.CreateCylinder(
        `campfireLog${i}_` + this.id,
        { height: 0.4, diameter: 0.1, tessellation: 6 },
        this.scene
      )
      log.material = res.trunkMaterial
      log.rotation.z = Math.PI / 2
      log.rotation.y = (i * Math.PI) / 3
      log.position.y = 0.08
      log.parent = this.node
      this.meshes.push(log)
    }

    // Large flame
    const flame = MeshBuilder.CreateCylinder(
      'campfireFlame_' + this.id,
      { height: 0.6, diameterTop: 0, diameterBottom: 0.4, tessellation: 6 },
      this.scene
    )
    flame.material = res.flameMaterial
    flame.position.y = 0.4
    flame.parent = this.node
    this.meshes.push(flame)
  }

  private createBonesPile() {
    const res = SharedResources.get()

    // Pile of bones (small cylinders)
    const positions = [
      { x: 0, y: 0.05, z: 0, rx: 0.3, ry: 0 },
      { x: 0.1, y: 0.08, z: 0.05, rx: 0.5, ry: 0.5 },
      { x: -0.08, y: 0.06, z: -0.05, rx: 0.2, ry: 1.0 },
      { x: 0.05, y: 0.04, z: -0.1, rx: 0.4, ry: 1.5 }
    ]

    positions.forEach((pos, i) => {
      const bone = MeshBuilder.CreateCylinder(
        `bone${i}_` + this.id,
        { height: 0.2, diameterTop: 0.02, diameterBottom: 0.03, tessellation: 6 },
        this.scene
      )
      bone.material = res.boneMaterial
      bone.position.set(pos.x, pos.y, pos.z)
      bone.rotation.x = pos.rx
      bone.rotation.y = pos.ry
      bone.parent = this.node
      this.meshes.push(bone)
    })
  }

  // ============ RUINS ============
  private createRuinedWall() {
    const res = SharedResources.get()

    // Broken wall segment
    const wall = MeshBuilder.CreateBox(
      'ruinedWall_' + this.id,
      { width: 0.9, height: 0.6 + Math.random() * 0.3, depth: 0.2 },
      this.scene
    )
    wall.material = res.oldStoneMaterial
    wall.position.y = 0.4
    wall.parent = this.node
    this.meshes.push(wall)

    // Rubble at base
    const rubble = MeshBuilder.CreateSphere(
      'wallRubble_' + this.id,
      { diameterX: 0.4, diameterY: 0.15, diameterZ: 0.3, segments: 4 },
      this.scene
    )
    rubble.material = res.oldStoneMaterial
    rubble.position.set(0.2, 0.07, 0.15)
    rubble.parent = this.node
    this.meshes.push(rubble)
  }

  private createRuinedColumn() {
    const res = SharedResources.get()

    // Base
    const base = MeshBuilder.CreateBox(
      'columnBase_' + this.id,
      { width: 0.45, height: 0.12, depth: 0.45 },
      this.scene
    )
    base.material = res.oldStoneMaterial
    base.position.y = 0.06
    base.parent = this.node
    this.meshes.push(base)

    // Shaft (variable height)
    const height = 0.5 + Math.random() * 0.4
    const shaft = MeshBuilder.CreateCylinder(
      'columnShaft_' + this.id,
      { height, diameter: 0.3, tessellation: 8 },
      this.scene
    )
    shaft.material = res.oldStoneMaterial
    shaft.position.y = 0.12 + height / 2
    shaft.parent = this.node
    this.meshes.push(shaft)
  }

  private createStoneRubble() {
    const res = SharedResources.get()

    // Pile of stone chunks
    for (let i = 0; i < 4; i++) {
      const chunk = MeshBuilder.CreateSphere(
        `rubbleChunk${i}_` + this.id,
        { diameterX: 0.15 + Math.random() * 0.1, diameterY: 0.1, diameterZ: 0.12, segments: 4 },
        this.scene
      )
      chunk.material = res.oldStoneMaterial
      chunk.position.set(
        (Math.random() - 0.5) * 0.3,
        0.05 + Math.random() * 0.05,
        (Math.random() - 0.5) * 0.3
      )
      chunk.parent = this.node
      this.meshes.push(chunk)
    }
  }

  private createAncientAltar() {
    const res = SharedResources.get()

    // Large stone base
    const base = MeshBuilder.CreateBox(
      'altarBase_' + this.id,
      { width: 0.9, height: 0.4, depth: 0.6 },
      this.scene
    )
    base.material = res.oldStoneMaterial
    base.position.y = 0.2
    base.parent = this.node
    this.meshes.push(base)

    // Top slab
    const top = MeshBuilder.CreateBox(
      'altarTop_' + this.id,
      { width: 1.0, height: 0.1, depth: 0.7 },
      this.scene
    )
    top.material = res.darkStoneMaterial
    top.position.y = 0.45
    top.parent = this.node
    this.meshes.push(top)

    // Mystical symbol (simple decoration)
    const symbol = MeshBuilder.CreateTorus(
      'altarSymbol_' + this.id,
      { diameter: 0.3, thickness: 0.02, tessellation: 16 },
      this.scene
    )
    symbol.material = res.goldMaterial
    symbol.rotation.x = Math.PI / 2
    symbol.position.y = 0.51
    symbol.parent = this.node
    this.meshes.push(symbol)
  }

  // ============ NATURE ============
  private createFallenLog() {
    const res = SharedResources.get()

    const log = MeshBuilder.CreateCylinder(
      'fallenLog_' + this.id,
      { height: 1.0, diameterTop: 0.2, diameterBottom: 0.25, tessellation: 8 },
      this.scene
    )
    log.material = res.stumpMaterial
    log.rotation.z = Math.PI / 2
    log.position.y = 0.12
    log.parent = this.node
    this.meshes.push(log)

    // Moss patches
    const moss = MeshBuilder.CreateDisc(
      'logMoss_' + this.id,
      { radius: 0.15, tessellation: 6 },
      this.scene
    )
    moss.material = res.greenCanopyMaterial
    moss.rotation.x = Math.PI / 2
    moss.position.set(0.2, 0.25, 0)
    moss.parent = this.node
    this.meshes.push(moss)
  }

  private createMushroomPatch() {
    const res = SharedResources.get()

    const positions = [
      { x: 0, z: 0, scale: 1.0, mat: res.mushroomRedMaterial },
      { x: 0.15, z: 0.1, scale: 0.7, mat: res.mushroomBrownMaterial },
      { x: -0.1, z: 0.12, scale: 0.8, mat: res.mushroomRedMaterial },
      { x: 0.08, z: -0.08, scale: 0.6, mat: res.mushroomBrownMaterial }
    ]

    positions.forEach((pos, i) => {
      // Stem
      const stem = MeshBuilder.CreateCylinder(
        `mushroomStem${i}_` + this.id,
        { height: 0.1 * pos.scale, diameter: 0.04 * pos.scale, tessellation: 6 },
        this.scene
      )
      stem.material = res.fabricMaterial
      stem.position.set(pos.x, 0.05 * pos.scale, pos.z)
      stem.parent = this.node
      this.meshes.push(stem)

      // Cap
      const cap = MeshBuilder.CreateCylinder(
        `mushroomCap${i}_` + this.id,
        { height: 0.05 * pos.scale, diameterTop: 0.02 * pos.scale, diameterBottom: 0.1 * pos.scale, tessellation: 8 },
        this.scene
      )
      cap.material = pos.mat
      cap.position.set(pos.x, 0.12 * pos.scale, pos.z)
      cap.parent = this.node
      this.meshes.push(cap)
    })
  }

  private createOldStump() {
    const res = SharedResources.get()

    const stump = MeshBuilder.CreateCylinder(
      'oldStump_' + this.id,
      { height: 0.25, diameterTop: 0.35, diameterBottom: 0.4, tessellation: 8 },
      this.scene
    )
    stump.material = res.stumpMaterial
    stump.position.y = 0.125
    stump.parent = this.node
    this.meshes.push(stump)

    // Rings on top
    const top = MeshBuilder.CreateDisc(
      'stumpTop_' + this.id,
      { radius: 0.175, tessellation: 8 },
      this.scene
    )
    top.material = res.stumpTopMaterial
    top.rotation.x = -Math.PI / 2
    top.position.y = 0.251
    top.parent = this.node
    this.meshes.push(top)
  }

  // ============ MINE PROPS ============
  private createMineCart() {
    const res = SharedResources.get()

    // Cart body
    const body = MeshBuilder.CreateBox(
      'cartBody_' + this.id,
      { width: 0.5, height: 0.25, depth: 0.35 },
      this.scene
    )
    body.material = res.woodMaterial
    body.position.y = 0.25
    body.parent = this.node
    this.meshes.push(body)

    // Wheels
    const wheelPositions = [
      { x: -0.2, z: 0.15 },
      { x: 0.2, z: 0.15 },
      { x: -0.2, z: -0.15 },
      { x: 0.2, z: -0.15 }
    ]
    wheelPositions.forEach((pos, i) => {
      const wheel = MeshBuilder.CreateCylinder(
        `cartWheel${i}_` + this.id,
        { height: 0.04, diameter: 0.15, tessellation: 12 },
        this.scene
      )
      wheel.material = res.ironMaterial
      wheel.rotation.x = Math.PI / 2
      wheel.position.set(pos.x, 0.08, pos.z)
      wheel.parent = this.node
      this.meshes.push(wheel)
    })
  }

  private createMineEntrance() {
    const res = SharedResources.get()

    // Frame posts
    const leftPost = MeshBuilder.CreateBox(
      'minePostLeft_' + this.id,
      { width: 0.12, height: 1.0, depth: 0.12 },
      this.scene
    )
    leftPost.material = res.darkWoodMaterial
    leftPost.position.set(-0.35, 0.5, 0)
    leftPost.parent = this.node
    this.meshes.push(leftPost)

    const rightPost = MeshBuilder.CreateBox(
      'minePostRight_' + this.id,
      { width: 0.12, height: 1.0, depth: 0.12 },
      this.scene
    )
    rightPost.material = res.darkWoodMaterial
    rightPost.position.set(0.35, 0.5, 0)
    rightPost.parent = this.node
    this.meshes.push(rightPost)

    // Top beam
    const beam = MeshBuilder.CreateBox(
      'mineBeam_' + this.id,
      { width: 0.85, height: 0.12, depth: 0.12 },
      this.scene
    )
    beam.material = res.darkWoodMaterial
    beam.position.y = 1.0
    beam.parent = this.node
    this.meshes.push(beam)

    // Dark entrance
    const entrance = MeshBuilder.CreateBox(
      'mineEntrance_' + this.id,
      { width: 0.6, height: 0.85, depth: 0.1 },
      this.scene
    )
    entrance.material = res.darkStoneMaterial
    entrance.position.set(0, 0.45, -0.05)
    entrance.parent = this.node
    this.meshes.push(entrance)

    // Boards (boarded up)
    for (let i = 0; i < 3; i++) {
      const board = MeshBuilder.CreateBox(
        `mineBoard${i}_` + this.id,
        { width: 0.7, height: 0.08, depth: 0.02 },
        this.scene
      )
      board.material = res.woodMaterial
      board.position.set(0, 0.25 + i * 0.25, 0.02)
      board.rotation.z = (Math.random() - 0.5) * 0.15
      board.parent = this.node
      this.meshes.push(board)
    }
  }

  // ============ VEIL DIMENSION ============
  private createVeilRift() {
    const res = SharedResources.get()

    // Outer ring frame - dark ethereal stone
    const outerRing = MeshBuilder.CreateTorus(
      'riftOuter_' + this.id,
      { diameter: 1.2, thickness: 0.12, tessellation: 24 },
      this.scene
    )
    outerRing.material = res.darkStoneMaterial
    outerRing.position.y = 0.7
    outerRing.parent = this.node
    this.meshes.push(outerRing)

    // Inner portal disc - glowing purple/cyan
    const portalMat = res.getStandardMaterial('veilPortal',
      new Color3(0.4, 0.2, 0.8),
      { emissive: new Color3(0.3, 0.5, 1.0), alpha: 0.7 }
    )

    const portal = MeshBuilder.CreateDisc(
      'riftPortal_' + this.id,
      { radius: 0.5, tessellation: 24 },
      this.scene
    )
    portal.material = portalMat
    portal.position.y = 0.7
    portal.parent = this.node
    this.meshes.push(portal)

    // Back side of portal
    const portalBack = MeshBuilder.CreateDisc(
      'riftPortalBack_' + this.id,
      { radius: 0.5, tessellation: 24 },
      this.scene
    )
    portalBack.material = portalMat
    portalBack.rotation.y = Math.PI
    portalBack.position.y = 0.7
    portalBack.parent = this.node
    this.meshes.push(portalBack)

    // Inner glow ring
    const glowMat = res.getStandardMaterial('veilGlow',
      new Color3(0.2, 0.8, 1.0),
      { emissive: new Color3(0.2, 0.8, 1.0) }
    )
    const innerRing = MeshBuilder.CreateTorus(
      'riftInner_' + this.id,
      { diameter: 1.0, thickness: 0.04, tessellation: 24 },
      this.scene
    )
    innerRing.material = glowMat
    innerRing.position.y = 0.7
    innerRing.parent = this.node
    this.meshes.push(innerRing)

    // Base pedestal
    const base = MeshBuilder.CreateCylinder(
      'riftBase_' + this.id,
      { height: 0.15, diameter: 0.8, tessellation: 12 },
      this.scene
    )
    base.material = res.darkStoneMaterial
    base.position.y = 0.075
    base.parent = this.node
    this.meshes.push(base)

    // Floating crystals around the rift
    const crystalPositions = [
      { x: 0.5, y: 0.4, z: 0.3 },
      { x: -0.5, y: 0.5, z: 0.2 },
      { x: 0.3, y: 0.9, z: -0.4 },
      { x: -0.4, y: 1.0, z: -0.3 }
    ]

    crystalPositions.forEach((pos, i) => {
      const crystal = MeshBuilder.CreateCylinder(
        `riftCrystal${i}_` + this.id,
        { height: 0.15, diameterTop: 0, diameterBottom: 0.06, tessellation: 6 },
        this.scene
      )
      crystal.material = glowMat
      crystal.position.set(pos.x, pos.y, pos.z)
      crystal.rotation.z = Math.random() * 0.5 - 0.25
      crystal.rotation.x = Math.random() * 0.5 - 0.25
      crystal.parent = this.node
      this.meshes.push(crystal)
    })
  }

  private createVeilCrystal() {
    const res = SharedResources.get()

    // Glowing cyan/purple material for the crystal
    const crystalMat = res.getStandardMaterial(
      'veilCrystal',
      new Color3(0.4, 0.2, 0.9),
      { emissive: new Color3(0.3, 0.6, 1.0) }
    )

    // Main crystal shard
    const mainCrystal = MeshBuilder.CreateCylinder(
      'veilCrystalMain_' + this.id,
      { height: 0.5, diameterTop: 0, diameterBottom: 0.2, tessellation: 6 },
      this.scene
    )
    mainCrystal.material = crystalMat
    mainCrystal.position.y = 0.25
    mainCrystal.rotation.z = 0.1
    mainCrystal.parent = this.node
    this.meshes.push(mainCrystal)

    // Smaller crystal shards around it
    const shardPositions = [
      { x: 0.12, y: 0.15, z: 0.08, scale: 0.6, rz: -0.2 },
      { x: -0.1, y: 0.1, z: 0.05, scale: 0.5, rz: 0.3 },
      { x: 0.05, y: 0.12, z: -0.1, scale: 0.4, rz: -0.15 }
    ]

    shardPositions.forEach((pos, i) => {
      const shard = MeshBuilder.CreateCylinder(
        `veilCrystalShard${i}_` + this.id,
        { height: 0.3 * pos.scale, diameterTop: 0, diameterBottom: 0.12 * pos.scale, tessellation: 6 },
        this.scene
      )
      shard.material = crystalMat
      shard.position.set(pos.x, pos.y, pos.z)
      shard.rotation.z = pos.rz
      shard.parent = this.node
      this.meshes.push(shard)
    })

    // Base rock
    const base = MeshBuilder.CreateSphere(
      'veilCrystalBase_' + this.id,
      { diameterX: 0.3, diameterY: 0.1, diameterZ: 0.25, segments: 4 },
      this.scene
    )
    base.material = res.darkStoneMaterial
    base.position.y = 0.05
    base.parent = this.node
    this.meshes.push(base)
  }

  private createVeilTouchedPlant() {
    const res = SharedResources.get()

    // Mutated purple/cyan plant material
    const plantMat = res.getStandardMaterial(
      'veilPlant',
      new Color3(0.3, 0.15, 0.4),
      { emissive: new Color3(0.1, 0.2, 0.3) }
    )

    // Ground disc with a purple tint
    const ground = MeshBuilder.CreateDisc(
      'veilPlantGround_' + this.id,
      { radius: 0.25, tessellation: 8 },
      this.scene
    )
    ground.material = plantMat
    ground.rotation.x = Math.PI / 2
    ground.position.y = 0.01
    ground.parent = this.node
    this.meshes.push(ground)

    // Twisted stems with glowing tips
    const glowMat = res.getStandardMaterial(
      'veilPlantGlow',
      new Color3(0.2, 0.6, 0.8),
      { emissive: new Color3(0.2, 0.5, 0.7) }
    )

    const stems = [
      { x: 0, z: 0, height: 0.25, twist: 0.2 },
      { x: 0.1, z: 0.05, height: 0.2, twist: -0.15 },
      { x: -0.08, z: 0.08, height: 0.18, twist: 0.25 },
      { x: 0.05, z: -0.1, height: 0.22, twist: -0.1 }
    ]

    stems.forEach((s, i) => {
      // Stem
      const stem = MeshBuilder.CreateCylinder(
        `veilPlantStem${i}_` + this.id,
        { height: s.height, diameter: 0.03, tessellation: 4 },
        this.scene
      )
      stem.material = plantMat
      stem.position.set(s.x, s.height / 2, s.z)
      stem.rotation.z = s.twist
      stem.parent = this.node
      this.meshes.push(stem)

      // Glowing tip
      const tip = MeshBuilder.CreateSphere(
        `veilPlantTip${i}_` + this.id,
        { diameter: 0.06, segments: 6 },
        this.scene
      )
      tip.material = glowMat
      tip.position.set(s.x + s.twist * 0.2, s.height + 0.02, s.z)
      tip.parent = this.node
      this.meshes.push(tip)
    })
  }

  private createWardenMonument() {
    const res = SharedResources.get()

    // Base pedestal
    const base = MeshBuilder.CreateBox(
      'monumentBase_' + this.id,
      { width: 0.6, height: 0.2, depth: 0.6 },
      this.scene
    )
    base.material = res.stoneMaterial
    base.position.y = 0.1
    base.parent = this.node
    this.meshes.push(base)

    // Main body/torso of the statue
    const body = MeshBuilder.CreateCylinder(
      'monumentBody_' + this.id,
      { height: 0.8, diameterTop: 0.3, diameterBottom: 0.4, tessellation: 8 },
      this.scene
    )
    body.material = res.oldStoneMaterial
    body.position.y = 0.6
    body.parent = this.node
    this.meshes.push(body)

    // Head
    const head = MeshBuilder.CreateSphere(
      'monumentHead_' + this.id,
      { diameter: 0.25, segments: 8 },
      this.scene
    )
    head.material = res.oldStoneMaterial
    head.position.y = 1.15
    head.parent = this.node
    this.meshes.push(head)

    // Warden symbol - glowing ring
    const glowMat = res.getStandardMaterial(
      'wardenGlow',
      new Color3(0.2, 0.6, 0.8),
      { emissive: new Color3(0.1, 0.4, 0.6) }
    )
    const symbol = MeshBuilder.CreateTorus(
      'monumentSymbol_' + this.id,
      { diameter: 0.2, thickness: 0.02, tessellation: 16 },
      this.scene
    )
    symbol.material = glowMat
    symbol.rotation.x = Math.PI / 2
    symbol.position.y = 0.7
    symbol.position.z = 0.18
    symbol.parent = this.node
    this.meshes.push(symbol)

    // Arms (simple blocks representing outstretched or holding stance)
    const leftArm = MeshBuilder.CreateBox(
      'monumentLeftArm_' + this.id,
      { width: 0.3, height: 0.1, depth: 0.1 },
      this.scene
    )
    leftArm.material = res.oldStoneMaterial
    leftArm.position.set(-0.28, 0.75, 0)
    leftArm.parent = this.node
    this.meshes.push(leftArm)

    const rightArm = MeshBuilder.CreateBox(
      'monumentRightArm_' + this.id,
      { width: 0.3, height: 0.1, depth: 0.1 },
      this.scene
    )
    rightArm.material = res.oldStoneMaterial
    rightArm.position.set(0.28, 0.75, 0)
    rightArm.parent = this.node
    this.meshes.push(rightArm)
  }

  private createTownSign() {
    const res = SharedResources.get()

    // Two support posts
    const leftPost = MeshBuilder.CreateCylinder(
      'townSignLeftPost_' + this.id,
      { height: 1.2, diameter: 0.1, tessellation: 6 },
      this.scene
    )
    leftPost.material = res.woodMaterial
    leftPost.position.set(-0.35, 0.6, 0)
    leftPost.parent = this.node
    this.meshes.push(leftPost)

    const rightPost = MeshBuilder.CreateCylinder(
      'townSignRightPost_' + this.id,
      { height: 1.2, diameter: 0.1, tessellation: 6 },
      this.scene
    )
    rightPost.material = res.woodMaterial
    rightPost.position.set(0.35, 0.6, 0)
    rightPost.parent = this.node
    this.meshes.push(rightPost)

    // Crossbeam
    const beam = MeshBuilder.CreateBox(
      'townSignBeam_' + this.id,
      { width: 0.8, height: 0.08, depth: 0.08 },
      this.scene
    )
    beam.material = res.darkWoodMaterial
    beam.position.y = 1.15
    beam.parent = this.node
    this.meshes.push(beam)

    // Sign board
    const board = MeshBuilder.CreateBox(
      'townSignBoard_' + this.id,
      { width: 0.7, height: 0.4, depth: 0.05 },
      this.scene
    )
    board.material = res.woodMaterial
    board.position.set(0, 0.9, 0.04)
    board.parent = this.node
    this.meshes.push(board)

    // Decorative trim
    const trim = MeshBuilder.CreateBox(
      'townSignTrim_' + this.id,
      { width: 0.75, height: 0.45, depth: 0.02 },
      this.scene
    )
    trim.material = res.darkWoodMaterial
    trim.position.set(0, 0.9, 0.06)
    trim.parent = this.node
    this.meshes.push(trim)
  }

  private createLorePlaque() {
    const res = SharedResources.get()

    // Stone slab
    const slab = MeshBuilder.CreateBox(
      'lorePlaqueSlab_' + this.id,
      { width: 0.5, height: 0.6, depth: 0.08 },
      this.scene
    )
    slab.material = res.stoneMaterial
    slab.position.y = 0.4
    slab.parent = this.node
    this.meshes.push(slab)

    // Decorative border
    const border = MeshBuilder.CreateBox(
      'lorePlaqueBorder_' + this.id,
      { width: 0.55, height: 0.65, depth: 0.04 },
      this.scene
    )
    border.material = res.darkStoneMaterial
    border.position.set(0, 0.4, -0.03)
    border.parent = this.node
    this.meshes.push(border)

    // Base support
    const base = MeshBuilder.CreateCylinder(
      'lorePlaqueBase_' + this.id,
      { height: 0.1, diameter: 0.3, tessellation: 8 },
      this.scene
    )
    base.material = res.stoneMaterial
    base.position.y = 0.05
    base.parent = this.node
    this.meshes.push(base)

    // Small golden emblem
    const emblem = MeshBuilder.CreateTorus(
      'lorePlaqueEmblem_' + this.id,
      { diameter: 0.12, thickness: 0.015, tessellation: 12 },
      this.scene
    )
    emblem.material = res.goldMaterial
    emblem.rotation.x = Math.PI / 2
    emblem.position.set(0, 0.6, 0.045)
    emblem.parent = this.node
    this.meshes.push(emblem)
  }

  private createNoticeBoard() {
    const res = SharedResources.get()

    // Main posts
    const leftPost = MeshBuilder.CreateBox(
      'noticeBoardLeftPost_' + this.id,
      { width: 0.1, height: 1.0, depth: 0.1 },
      this.scene
    )
    leftPost.material = res.darkWoodMaterial
    leftPost.position.set(-0.4, 0.5, 0)
    leftPost.parent = this.node
    this.meshes.push(leftPost)

    const rightPost = MeshBuilder.CreateBox(
      'noticeBoardRightPost_' + this.id,
      { width: 0.1, height: 1.0, depth: 0.1 },
      this.scene
    )
    rightPost.material = res.darkWoodMaterial
    rightPost.position.set(0.4, 0.5, 0)
    rightPost.parent = this.node
    this.meshes.push(rightPost)

    // Board backing
    const board = MeshBuilder.CreateBox(
      'noticeBoardBoard_' + this.id,
      { width: 0.75, height: 0.6, depth: 0.04 },
      this.scene
    )
    board.material = res.woodMaterial
    board.position.set(0, 0.65, 0.02)
    board.parent = this.node
    this.meshes.push(board)

    // Frame
    const frame = MeshBuilder.CreateBox(
      'noticeBoardFrame_' + this.id,
      { width: 0.8, height: 0.65, depth: 0.02 },
      this.scene
    )
    frame.material = res.darkWoodMaterial
    frame.position.set(0, 0.65, 0.04)
    frame.parent = this.node
    this.meshes.push(frame)

    // Roof/cover
    const roof = MeshBuilder.CreateBox(
      'noticeBoardRoof_' + this.id,
      { width: 0.9, height: 0.08, depth: 0.2 },
      this.scene
    )
    roof.material = res.darkWoodMaterial
    roof.position.set(0, 1.0, 0.05)
    roof.rotation.x = 0.2
    roof.parent = this.node
    this.meshes.push(roof)

    // Paper notices (visual flair)
    const noticeMat = res.getStandardMaterial('noticePaper', new Color3(0.95, 0.9, 0.8))
    const noticePositions = [
      { x: -0.15, y: 0.7, rot: 0.05 },
      { x: 0.1, y: 0.6, rot: -0.08 },
      { x: -0.05, y: 0.55, rot: 0.02 }
    ]

    noticePositions.forEach((pos, i) => {
      const notice = MeshBuilder.CreateBox(
        `noticeBoardNotice${i}_` + this.id,
        { width: 0.15, height: 0.2, depth: 0.01 },
        this.scene
      )
      notice.material = noticeMat
      notice.position.set(pos.x, pos.y, 0.06)
      notice.rotation.z = pos.rot
      notice.parent = this.node
      this.meshes.push(notice)
    })
  }

  private createDepletedObject() {
    const res = SharedResources.get()

    if (
      this.objectType === WorldObjectType.TREE ||
      this.objectType === WorldObjectType.OAK_TREE ||
      this.objectType === WorldObjectType.WILLOW_TREE
    ) {
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
    } else if (
      this.objectType === WorldObjectType.COPPER_ORE ||
      this.objectType === WorldObjectType.TIN_ORE ||
      this.objectType === WorldObjectType.IRON_ORE ||
      this.objectType === WorldObjectType.COAL_ORE
    ) {
      // Depleted ore - grey rock without ore veins
      const rock = MeshBuilder.CreateSphere(
        'depletedOre_' + this.id,
        { diameterX: 0.65, diameterY: 0.4, diameterZ: 0.55, segments: 6 },
        this.scene
      )
      rock.material = res.darkStoneMaterial
      rock.position.y = 0.2
      rock.parent = this.node
      this.meshes.push(rock)
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

  /**
   * Freeze world matrices on all meshes for performance (static objects)
   * Must compute world matrices first to ensure parent transforms are propagated
   */
  private freezeMeshes() {
    // Only freeze if height provider is set (position is correct)
    if (!this.heightProvider) return

    // Force parent world matrix computation first
    this.node.computeWorldMatrix(true)
    // Then compute and freeze each child mesh
    for (const mesh of this.meshes) {
      mesh.computeWorldMatrix(true)
      mesh.freezeWorldMatrix()
    }
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
      // Re-freeze meshes after recreation
      this.freezeMeshes()
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
