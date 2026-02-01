/* eslint-disable no-undef */
import {
  Engine,
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  Vector3,
  Color4,
  PointerEventTypes
} from '@babylonjs/core'
import { Player } from './entities/Player'
import { RemotePlayer } from './entities/RemotePlayer'
import { WorldObjectEntity } from './entities/WorldObjectEntity'
import { TilemapRenderer } from './systems/TilemapRenderer'
import { Camera } from './systems/Camera'
import { Pathfinding } from './systems/Pathfinding'
import { worldToTile, tileToWorld, WorldObjectType, TILE_SIZE } from '@realm/shared'
import type { Position, Direction } from '@realm/shared'

export class Game {
  private engine!: Engine
  private scene!: Scene
  private arcCamera!: ArcRotateCamera
  private player!: Player
  private remotePlayers: Map<string, RemotePlayer> = new Map()
  private worldObjects: Map<string, WorldObjectEntity> = new Map()
  private tilemap!: TilemapRenderer
  private camera!: Camera
  private pathfinding!: Pathfinding
  private lastTime: number = 0

  // Callbacks
  public onLocalPlayerMove?: (position: Position, path: Position[]) => void
  public onWorldObjectClick?: (objectId: string, objectPosition: Position) => void

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

    // Setup orthographic camera with isometric angle
    // alpha = 45° rotation, beta = 55° from vertical
    this.arcCamera = new ArcRotateCamera(
      'camera',
      Math.PI / 4, // 45° alpha (rotation around Y axis)
      Math.PI / 3, // 55° beta (angle from top)
      50, // radius (will be used for ortho sizing)
      Vector3.Zero(),
      this.scene
    )

    // Set orthographic mode
    this.arcCamera.mode = ArcRotateCamera.ORTHOGRAPHIC_CAMERA
    this.updateCameraOrtho()

    // Disable camera controls (we manage camera position)
    this.arcCamera.attachControl(canvas, false)
    this.arcCamera.inputs.clear()

    // Add ambient lighting
    const light = new HemisphericLight('light', new Vector3(0.5, 1, 0.5), this.scene)
    light.intensity = 1.0

    await this.initSystems()
    await this.initPlayer()
    this.setupInput()

    window.addEventListener('resize', this.handleResize)
  }

  private updateCameraOrtho() {
    const canvas = this.engine.getRenderingCanvas()
    if (!canvas) return

    const aspect = canvas.width / canvas.height
    const orthoSize = 15 // Controls zoom level

    this.arcCamera.orthoLeft = -orthoSize * aspect
    this.arcCamera.orthoRight = orthoSize * aspect
    this.arcCamera.orthoTop = orthoSize
    this.arcCamera.orthoBottom = -orthoSize
  }

  private async initSystems() {
    this.tilemap = new TilemapRenderer(this.scene)
    await this.tilemap.init()

    this.pathfinding = new Pathfinding(this.tilemap.getCollisionGrid())

    const canvas = this.engine.getRenderingCanvas()!
    this.camera = new Camera(
      canvas.width,
      canvas.height,
      this.tilemap.worldWidth,
      this.tilemap.worldHeight,
      this.arcCamera,
      this.scene
    )
  }

  private async initPlayer() {
    const startTile = { tileX: 10, tileY: 10 }
    const startPos = tileToWorld(startTile)

    this.player = new Player(startPos, this.scene)
    await this.player.init()

    this.camera.follow(this.player.position)
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

    // Prevent context menu
    const canvas = this.engine.getRenderingCanvas()
    if (canvas) {
      canvas.addEventListener('contextmenu', (e) => e.preventDefault())
    }
  }

  private processClick(e: PointerEvent) {
    const worldPos = this.camera.screenToWorld(e.clientX, e.clientY)
    if (!worldPos) return

    // Check if clicking on a world object
    const clickedObject = this.findWorldObjectAt(worldPos)
    if (clickedObject && !clickedObject.depleted) {
      // Walk to adjacent tile, then start action
      const objPos = clickedObject.getPosition()
      const adjacentTile = this.findAdjacentWalkableTile(worldToTile({ x: objPos.x, y: objPos.y }))

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
      this.onLocalPlayerMove?.(this.player.position, worldPath)
    }
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

  private findAdjacentWalkableTile(objectTile: { tileX: number; tileY: number }) {
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

    for (const dir of directions) {
      const checkX = objectTile.tileX + dir.dx
      const checkY = objectTile.tileY + dir.dy
      if (this.tilemap.isWalkable(checkX, checkY)) {
        return { tileX: checkX, tileY: checkY }
      }
    }
    return null
  }

  private handleResize = () => {
    this.engine.resize()
    this.updateCameraOrtho()
    const canvas = this.engine.getRenderingCanvas()!
    this.camera.resize(canvas.width, canvas.height)
  }

  // World object management
  addWorldObject(id: string, objectType: WorldObjectType, x: number, y: number) {
    if (this.worldObjects.has(id)) return

    const obj = new WorldObjectEntity(id, objectType, x, y, this.scene)
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

      this.camera.follow(this.player.position)

      this.scene.render()
    })
  }

  destroy() {
    window.removeEventListener('resize', this.handleResize)
    this.engine.dispose()
  }
}
