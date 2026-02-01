/* eslint-disable no-undef */
import {
  Engine,
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  Vector3,
  Color4,
  PointerEventTypes,
  Mesh,
  MeshBuilder,
  Color3,
  StandardMaterial
} from '@babylonjs/core'
import { AdvancedDynamicTexture, TextBlock } from '@babylonjs/gui'
import { Player } from './entities/Player'
import { RemotePlayer } from './entities/RemotePlayer'
import { WorldObjectEntity } from './entities/WorldObjectEntity'
import { NpcEntity } from './entities/NpcEntity'
import { TilemapRenderer, LEVEL_H, TILE_THICK } from './systems/TilemapRenderer'
import { Camera } from './systems/Camera'
import { Pathfinding } from './systems/Pathfinding'
import { worldToTile, tileToWorld, WorldObjectType, NpcType, TILE_SIZE } from '@realm/shared'
import type { Position, Direction } from '@realm/shared'

export class Game {
  private engine!: Engine
  private scene!: Scene
  private arcCamera!: ArcRotateCamera
  private player!: Player
  private remotePlayers: Map<string, RemotePlayer> = new Map()
  private worldObjects: Map<string, WorldObjectEntity> = new Map()
  private npcs: Map<string, NpcEntity> = new Map()
  private tilemap!: TilemapRenderer
  private camera!: Camera
  private pathfinding!: Pathfinding
  private lastTime: number = 0
  private rotationStep: number = Math.PI / 2
  private hoveredObjectId: string | null = null
  private hoveredNpcId: string | null = null
  private hoverIndicator!: Mesh
  private hoverUi!: AdvancedDynamicTexture
  private hoverLabel!: TextBlock
  private lastActionTarget: Position | null = null
  private panKeys: Set<string> = new Set()
  private skillingActionActive: boolean = false
  private combatTargetId: string | null = null
  private chunkObjects: Map<string, string[]> = new Map()
  private lastCameraX: number = -1
  private lastCameraY: number = -1

  // Callbacks
  public onLocalPlayerMove?: (position: Position, path: Position[]) => void
  public onWorldObjectClick?: (objectId: string, objectPosition: Position) => void
  public onNpcClick?: (npcId: string, npcPosition: Position) => void

  async init(container: HTMLElement) {
    // Create canvas for Babylon.js
    const canvas = document.createElement('canvas')
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.display = 'block'
    container.appendChild(canvas)

    // Initialize Babylon.js engine
    this.engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true })
    this.scene = new Scene(this.engine)
    this.scene.clearColor = new Color4(0.1, 0.1, 0.18, 1) // #1a1a2e

    // Setup perspective camera with OSRS-like angle
    this.arcCamera = new ArcRotateCamera(
      'camera',
      -Math.PI / 4, // 45° yaw
      Math.PI / 3, // 60° pitch
      22, // radius (zoom)
      Vector3.Zero(),
      this.scene
    )

    this.arcCamera.fov = 0.7
    this.arcCamera.lowerBetaLimit = 0.95
    this.arcCamera.upperBetaLimit = 1.25
    this.arcCamera.lowerRadiusLimit = 14
    this.arcCamera.upperRadiusLimit = 34
    this.arcCamera.panningSensibility = 0
    this.arcCamera.allowUpsideDown = false
    this.arcCamera.inertia = 0.85

    // Disable direct user control; we'll manage camera in code
    this.arcCamera.attachControl(canvas, true)
    this.arcCamera.inputs.clear()

    // Add ambient lighting
    const light = new HemisphericLight('light', new Vector3(0.5, 1, 0.5), this.scene)
    light.intensity = 1.0

    await this.initSystems()
    await this.initPlayer()
    this.setupInput()

    window.addEventListener('resize', this.handleResize)
    window.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('keyup', this.handleKeyUp)
  }

  private async initSystems() {
    this.tilemap = new TilemapRenderer(this.scene)
    await this.tilemap.init()

    const { grid, heights, offsetX, offsetY } = this.tilemap.buildCollisionGrid()
    this.pathfinding = new Pathfinding(grid, heights, offsetX, offsetY)

    const canvas = this.engine.getRenderingCanvas()!
    this.camera = new Camera(
      canvas.width,
      canvas.height,
      this.tilemap.worldWidth,
      this.tilemap.worldHeight,
      this.arcCamera,
      this.scene
    )
    this.camera.setPickableMeshes(this.tilemap.getTerrainMeshes())
    this.createHoverIndicator()
  }

  private async initPlayer() {
    const startTile = { tileX: 10, tileY: 10 }
    const startPos = tileToWorld(startTile)

    this.player = new Player(startPos, this.scene)
    await this.player.init()
    this.player.setHeightProvider((tileX, tileY) => this.getTileHeightY(tileX, tileY))

    this.camera.follow(this.player.position, this.getHeightAtPosition(this.player.position))
  }

  private setupInput() {
    this.scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
        // Right click for context menu prevention
        if (pointerInfo.event.button === 2) {
          pointerInfo.event.preventDefault()
        }
        this.processClick(pointerInfo.event as PointerEvent)
      }
    })

    this.scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type === PointerEventTypes.POINTERMOVE) {
        this.processHover(pointerInfo.event as PointerEvent)
      }
    })

    // Prevent context menu
    const canvas = this.engine.getRenderingCanvas()
    if (canvas) {
      canvas.addEventListener('contextmenu', (e) => e.preventDefault())
    }
  }

  private processClick(e: PointerEvent) {
    const worldPos = this.camera.screenToWorld(e.clientX, e.clientY)
    if (!worldPos) return

    // Cancel current action locally before new input
    if (this.player.isActioning) {
      this.player.setActioning(false)
      this.player.setActionTarget(null)
    }

    // Check if clicking on an NPC
    const clickedNpc = this.findNpcAt(worldPos)
    if (clickedNpc && !clickedNpc.isDead) {
      // Walk to adjacent tile, then start attack
      const npcPos = clickedNpc.getPosition()
      const adjacentTile = this.findAdjacentWalkableTile(
        worldToTile({ x: npcPos.x, y: npcPos.y }),
        worldToTile(this.player.position)
      )

      if (adjacentTile) {
        const playerTile = worldToTile(this.player.position)
        const path = this.pathfinding.findPath(
          playerTile.tileX,
          playerTile.tileY,
          adjacentTile.tileX,
          adjacentTile.tileY
        )

        if (path && path.length > 0) {
          const worldPath: Position[] = path.map((tile) => tileToWorld(tile))
          this.player.setPath(worldPath, () => {
            // Callback when path complete - trigger attack
            this.onNpcClick?.(clickedNpc.id, {
              x: npcPos.x,
              y: npcPos.y
            })
          })
          this.onLocalPlayerMove?.(this.player.position, worldPath)
        } else if (
          Math.abs(playerTile.tileX - adjacentTile.tileX) <= 1 &&
          Math.abs(playerTile.tileY - adjacentTile.tileY) <= 1
        ) {
          // Already adjacent
          this.onNpcClick?.(clickedNpc.id, {
            x: npcPos.x,
            y: npcPos.y
          })
        }
      }
      return
    }

    // Check if clicking on a world object
    const clickedObject = this.findWorldObjectAt(worldPos)
    if (clickedObject && !clickedObject.depleted) {
      // Walk to adjacent tile, then start action
      const objPos = clickedObject.getPosition()
      const adjacentTile = this.findAdjacentWalkableTile(
        worldToTile({ x: objPos.x, y: objPos.y }),
        worldToTile(this.player.position)
      )

      if (adjacentTile) {
        const playerTile = worldToTile(this.player.position)
        const path = this.pathfinding.findPath(
          playerTile.tileX,
          playerTile.tileY,
          adjacentTile.tileX,
          adjacentTile.tileY
        )

        if (path && path.length > 0) {
          const worldPath: Position[] = path.map((tile) => tileToWorld(tile))
          this.player.setPath(worldPath, () => {
            // Callback when path complete - trigger action
            this.lastActionTarget = { x: objPos.x, y: objPos.y }
            this.player.setActionTarget(this.lastActionTarget)
            this.onWorldObjectClick?.(clickedObject.id, {
              x: objPos.x,
              y: objPos.y
            })
          })
          this.onLocalPlayerMove?.(this.player.position, worldPath)
        } else if (
          Math.abs(playerTile.tileX - adjacentTile.tileX) <= 1 &&
          Math.abs(playerTile.tileY - adjacentTile.tileY) <= 1
        ) {
          // Already adjacent
          this.lastActionTarget = { x: objPos.x, y: objPos.y }
          this.player.setActionTarget(this.lastActionTarget)
          this.onWorldObjectClick?.(clickedObject.id, {
            x: objPos.x,
            y: objPos.y
          })
        }
      }
      return
    }

    // Normal movement
    const targetTile = worldToTile(worldPos)
    if (!this.tilemap.isWalkable(targetTile.tileX, targetTile.tileY)) {
      return
    }

    const playerTile = worldToTile(this.player.position)
    const path = this.pathfinding.findPath(
      playerTile.tileX,
      playerTile.tileY,
      targetTile.tileX,
      targetTile.tileY
    )

    if (path && path.length > 0) {
      const worldPath: Position[] = path.map((tile) => tileToWorld(tile))
      this.player.setPath(worldPath)
      this.player.setActionTarget(null)
      this.onLocalPlayerMove?.(this.player.position, worldPath)
    }
  }

  private processHover(e: PointerEvent) {
    const worldPos = this.camera.screenToWorld(e.clientX, e.clientY)
    if (!worldPos) {
      this.setHoveredObject(null)
      this.setHoveredNpc(null)
      this.setHoverTile(null)
      return
    }

    const hoveredObject = this.findWorldObjectAt(worldPos)
    if (hoveredObject && !hoveredObject.depleted) {
      this.setHoveredObject(hoveredObject.id)
      this.setHoveredNpc(null)
      this.setHoverTile(null)
      return
    }

    const hoveredNpc = this.findNpcAt(worldPos)
    if (hoveredNpc && !hoveredNpc.isDead) {
      this.setHoveredNpc(hoveredNpc.id)
      this.setHoveredObject(null)
      this.setHoverTile(null)
      return
    }

    const targetTile = worldToTile(worldPos)
    if (this.tilemap.isWalkable(targetTile.tileX, targetTile.tileY)) {
      this.setHoverTile(targetTile)
    } else {
      this.setHoverTile(null)
    }
    this.setHoveredObject(null)
    this.setHoveredNpc(null)
  }

  private findWorldObjectAt(pos: Position): WorldObjectEntity | null {
    const clickRadius = TILE_SIZE / 2 + 8
    for (const obj of this.worldObjects.values()) {
      const objPos = obj.getPosition()
      const dx = pos.x - objPos.x
      const dy = pos.y - objPos.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < clickRadius) {
        return obj
      }
    }
    return null
  }

  private setHoveredObject(id: string | null) {
    if (this.hoveredObjectId === id) return
    if (this.hoveredObjectId) {
      const prev = this.worldObjects.get(this.hoveredObjectId)
      prev?.setHovered(false)
    }
    this.hoveredObjectId = id
    if (id) {
      const obj = this.worldObjects.get(id)
      obj?.setHovered(true)
    }
  }

  private setHoveredNpc(id: string | null) {
    if (this.hoveredNpcId === id) return
    if (this.hoveredNpcId) {
      const prev = this.npcs.get(this.hoveredNpcId)
      prev?.setHovered(false)
    }
    this.hoveredNpcId = id
    if (id) {
      const npc = this.npcs.get(id)
      npc?.setHovered(true)
    }
  }

  private setHoverTile(tile: { tileX: number; tileY: number } | null) {
    if (!tile) {
      this.hoverIndicator.isVisible = false
      this.hoverLabel.isVisible = false
      return
    }
    const heightY = this.getTileHeightY(tile.tileX, tile.tileY)
    this.hoverIndicator.position.set(tile.tileX + 0.5, heightY + 0.01, tile.tileY + 0.5)
    this.hoverIndicator.isVisible = true
    this.hoverLabel.isVisible = true
    this.hoverLabel.linkWithMesh(this.hoverIndicator)
  }

  private findNpcAt(pos: Position): NpcEntity | null {
    const clickRadius = TILE_SIZE / 2 + 8
    for (const npc of this.npcs.values()) {
      const npcPos = npc.getPosition()
      const dx = pos.x - npcPos.x
      const dy = pos.y - npcPos.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < clickRadius) {
        return npc
      }
    }
    return null
  }

  private findAdjacentWalkableTile(
    objectTile: { tileX: number; tileY: number },
    fromTile: { tileX: number; tileY: number }
  ) {
    const directions = [
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 1 },
      { dx: 1, dy: -1 },
      { dx: -1, dy: 1 },
      { dx: -1, dy: -1 }
    ]

    let best: { tileX: number; tileY: number } | null = null
    let bestScore = Number.POSITIVE_INFINITY

    for (const dir of directions) {
      const checkX = objectTile.tileX + dir.dx
      const checkY = objectTile.tileY + dir.dy
      if (
        this.tilemap.isWalkable(checkX, checkY) &&
        Math.abs(
          this.tilemap.getHeight(checkX, checkY) -
            this.tilemap.getHeight(objectTile.tileX, objectTile.tileY)
        ) <= 1
      ) {
        const dx = checkX - fromTile.tileX
        const dy = checkY - fromTile.tileY
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < bestScore) {
          bestScore = dist
          best = { tileX: checkX, tileY: checkY }
        }
      }
    }
    return best
  }

  private handleResize = () => {
    this.engine.resize()
    const canvas = this.engine.getRenderingCanvas()!
    this.camera.resize(canvas.width, canvas.height)
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key.toLowerCase() === 'q') {
      this.arcCamera.alpha -= this.rotationStep
    } else if (e.key.toLowerCase() === 'e') {
      this.arcCamera.alpha += this.rotationStep
    } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      this.panKeys.add(e.key)
    }
  }

  private handleKeyUp = (e: KeyboardEvent) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      this.panKeys.delete(e.key)
    }
  }

  private getTileHeightY(tileX: number, tileY: number): number {
    return this.tilemap.getHeight(tileX, tileY) * LEVEL_H + TILE_THICK
  }

  private getHeightAtPosition(position: Position): number {
    const tile = worldToTile(position)
    return this.getTileHeightY(tile.tileX, tile.tileY)
  }

  // World object management
  addWorldObject(id: string, objectType: WorldObjectType, x: number, y: number) {
    if (this.worldObjects.has(id)) return

    const obj = new WorldObjectEntity(id, objectType, x, y, this.scene)
    obj.setHeightProvider((tileX, tileY) => this.getTileHeightY(tileX, tileY))
    this.worldObjects.set(id, obj)
  }

  removeWorldObject(id: string) {
    const obj = this.worldObjects.get(id)
    if (obj) {
      obj.dispose()
      this.worldObjects.delete(id)
    }
  }

  updateWorldObject(id: string, depleted: boolean) {
    const obj = this.worldObjects.get(id)
    if (obj) {
      obj.setDepleted(depleted)
    }
  }

  // NPC management
  addNpc(id: string, npcType: NpcType, x: number, y: number, currentHp: number, maxHp: number) {
    if (this.npcs.has(id)) return

    const npc = new NpcEntity(id, npcType, x, y, currentHp, maxHp, this.scene)
    npc.setHeightProvider((tileX, tileY) => this.getTileHeightY(tileX, tileY))
    this.npcs.set(id, npc)
  }

  removeNpc(id: string) {
    const npc = this.npcs.get(id)
    if (npc) {
      npc.dispose()
      this.npcs.delete(id)
    }
  }

  updateNpc(id: string, x: number, y: number, currentHp: number, maxHp: number) {
    const npc = this.npcs.get(id)
    if (npc) {
      if (x !== 0 || y !== 0) {
        npc.setPosition(x, y)
      }
      npc.setHealth(currentHp, maxHp)
    }
  }

  updateNpcHealth(id: string, currentHp: number, maxHp: number) {
    const npc = this.npcs.get(id)
    if (npc) {
      npc.setHealth(currentHp, maxHp)
    }
  }

  setNpcDead(id: string, isDead: boolean) {
    const npc = this.npcs.get(id)
    if (npc) {
      npc.setDead(isDead)
    }
  }

  showNpcHitSplat(id: string, damage: number) {
    const npc = this.npcs.get(id)
    if (npc) {
      npc.showHitSplat(damage)
    }
  }

  // Player management
  getLocalPlayerPosition(): Position {
    return { ...this.player.position }
  }

  setLocalPlayerPosition(position: Position) {
    this.player.position = { ...position }
  }

  async addRemotePlayer(id: string, name: string, position: Position) {
    if (this.remotePlayers.has(id)) return

    const remotePlayer = new RemotePlayer(position, name, this.scene)
    await remotePlayer.init()
    remotePlayer.setHeightProvider((tileX, tileY) => this.getTileHeightY(tileX, tileY))
    this.remotePlayers.set(id, remotePlayer)
  }

  removeRemotePlayer(id: string) {
    const remotePlayer = this.remotePlayers.get(id)
    if (remotePlayer) {
      remotePlayer.dispose()
      this.remotePlayers.delete(id)
    }
  }

  updateRemotePlayer(id: string, position: Position, direction: Direction) {
    const remotePlayer = this.remotePlayers.get(id)
    if (remotePlayer) {
      remotePlayer.setTargetPosition(position, direction)
    }
  }

  // Action state
  setPlayerAction(isActioning: boolean) {
    this.player.setActioning(isActioning)
    this.skillingActionActive = isActioning
    if (isActioning) {
      this.player.setActionTarget(this.lastActionTarget)
      if (!this.playerActionModeOverride) {
        this.player.setActionMode('skilling')
      }
    } else {
      if (!this.combatTargetId) {
        this.player.setActionTarget(null)
        if (!this.playerActionModeOverride) {
          this.player.setActionMode(null)
        }
      }
    }
  }

  applyChunk(chunk: import('@realm/shared').ChunkData) {
    this.tilemap.applyChunk(chunk)
    const ids: string[] = []
    for (const obj of chunk.objects) {
      this.addWorldObject(obj.id, obj.objectType, obj.x, obj.y)
      if (obj.depleted) {
        this.updateWorldObject(obj.id, true)
      }
      ids.push(obj.id)
    }
    this.chunkObjects.set(`${chunk.chunkX},${chunk.chunkY}`, ids)
    this.refreshNavigationGrid()
    this.camera.setPickableMeshes(this.tilemap.getTerrainMeshes())
    if (!this.player.isMoving) {
      this.player.setPath([])
    }
  }

  removeChunk(chunkKey: string) {
    this.tilemap.removeChunk(chunkKey)
    const ids = this.chunkObjects.get(chunkKey)
    if (ids) {
      for (const id of ids) {
        this.removeWorldObject(id)
      }
      this.chunkObjects.delete(chunkKey)
    }
    this.refreshNavigationGrid()
    this.camera.setPickableMeshes(this.tilemap.getTerrainMeshes())
  }

  private refreshNavigationGrid() {
    const { grid, heights, offsetX, offsetY } = this.tilemap.buildCollisionGrid()
    this.pathfinding.updateGrid(grid, heights, offsetX, offsetY)
    this.camera.setWorldSize(this.tilemap.worldWidth, this.tilemap.worldHeight)
  }

  private playerActionModeOverride: 'skilling' | 'combat' | 'cooking' | 'chopping' | null = null

  setSkillingAction(action: string | null) {
    if (!action) {
      this.playerActionModeOverride = null
      if (!this.combatTargetId && !this.skillingActionActive) {
        this.player.setActionMode(null)
      }
      return
    }
    if (action.toLowerCase().includes('cook')) {
      this.playerActionModeOverride = 'cooking'
      this.player.setActionMode('cooking')
    } else if (action.toLowerCase().includes('chop')) {
      this.playerActionModeOverride = 'chopping'
      this.player.setActionMode('chopping')
    } else {
      this.playerActionModeOverride = 'skilling'
      this.player.setActionMode('skilling')
    }
  }

  setCombatTarget(npcId: string | null) {
    this.combatTargetId = npcId
    if (!npcId && !this.skillingActionActive) {
      this.player.setActioning(false)
      this.player.setActionTarget(null)
      this.player.setActionMode(null)
    }
  }

  start() {
    this.lastTime = performance.now()

    this.engine.runRenderLoop(() => {
      const currentTime = performance.now()
      const delta = (currentTime - this.lastTime) / 16.67 // Normalize to 60fps
      this.lastTime = currentTime

      this.player.update(delta)

      for (const remotePlayer of this.remotePlayers.values()) {
        remotePlayer.update(delta)
      }

      for (const npc of this.npcs.values()) {
        npc.update(delta)
      }

      if (this.combatTargetId) {
        const npc = this.npcs.get(this.combatTargetId)
        if (npc && !npc.isDead) {
          const npcPos = npc.getPosition()
          this.player.setActionTarget({ x: npcPos.x, y: npcPos.y })
          this.player.setActionMode('combat')
          this.player.setActioning(true)
        } else {
          this.combatTargetId = null
          if (!this.skillingActionActive) {
            this.player.setActioning(false)
            this.player.setActionTarget(null)
            this.player.setActionMode(null)
          }
        }
      } else if (this.skillingActionActive) {
        const mode = this.playerActionModeOverride ?? 'skilling'
        this.player.setActionMode(mode)
        this.player.setActioning(true)
        this.player.setActionTarget(this.lastActionTarget)
      }

      if (
        this.player.position.x !== this.lastCameraX ||
        this.player.position.y !== this.lastCameraY
      ) {
        this.camera.follow(this.player.position, this.getHeightAtPosition(this.player.position))
        this.lastCameraX = this.player.position.x
        this.lastCameraY = this.player.position.y
      }

      if (this.panKeys.size > 0) {
        const panSpeed = 6
        let dx = 0
        let dz = 0
        if (this.panKeys.has('ArrowLeft')) dx -= panSpeed * delta * 0.1
        if (this.panKeys.has('ArrowRight')) dx += panSpeed * delta * 0.1
        if (this.panKeys.has('ArrowUp')) dz -= panSpeed * delta * 0.1
        if (this.panKeys.has('ArrowDown')) dz += panSpeed * delta * 0.1
        if (dx !== 0 || dz !== 0) {
          this.camera.nudgePan(dx, dz)
        }
      }

      this.scene.render()
    })
  }

  destroy() {
    window.removeEventListener('resize', this.handleResize)
    window.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('keyup', this.handleKeyUp)
    this.hoverIndicator?.dispose()
    this.hoverUi?.dispose()
    this.engine.dispose()
  }

  private createHoverIndicator() {
    this.hoverIndicator = MeshBuilder.CreateDisc(
      'hoverIndicator',
      { radius: 0.45, tessellation: 24 },
      this.scene
    )
    const mat = new StandardMaterial('hoverIndicatorMat', this.scene)
    mat.diffuseColor = new Color3(1, 1, 1)
    mat.emissiveColor = new Color3(0.2, 0.6, 1)
    mat.specularColor = Color3.Black()
    mat.alpha = 0.35
    this.hoverIndicator.material = mat
    this.hoverIndicator.rotation.x = Math.PI / 2
    this.hoverIndicator.isPickable = false
    this.hoverIndicator.isVisible = false

    this.hoverUi = AdvancedDynamicTexture.CreateFullscreenUI('hoverUI', true, this.scene)
    this.hoverLabel = new TextBlock('hoverLabel', 'Walk here')
    this.hoverLabel.color = 'white'
    this.hoverLabel.fontSize = 12
    this.hoverLabel.fontFamily = 'Inter, sans-serif'
    this.hoverLabel.outlineWidth = 2
    this.hoverLabel.outlineColor = 'black'
    this.hoverLabel.isVisible = false
    this.hoverLabel.linkOffsetY = -40
    this.hoverUi.addControl(this.hoverLabel)
  }
}
