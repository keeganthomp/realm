import { Application, Container } from 'pixi.js'
import { Player } from './entities/Player'
import { RemotePlayer } from './entities/RemotePlayer'
import { WorldObjectEntity } from './entities/WorldObjectEntity'
import { TilemapRenderer } from './systems/TilemapRenderer'
import { Camera } from './systems/Camera'
import { Pathfinding } from './systems/Pathfinding'
import { worldToTile, tileToWorld, WorldObjectType, TILE_SIZE } from '@realm/shared'
import type { Position, Direction } from '@realm/shared'

export class Game {
  private app!: Application
  private worldContainer!: Container
  private objectsContainer!: Container
  private entitiesContainer!: Container
  private player!: Player
  private remotePlayers: Map<string, RemotePlayer> = new Map()
  private worldObjects: Map<string, WorldObjectEntity> = new Map()
  private tilemap!: TilemapRenderer
  private camera!: Camera
  private pathfinding!: Pathfinding

  // Callbacks
  public onLocalPlayerMove?: (position: Position, path: Position[]) => void
  public onWorldObjectClick?: (objectId: string, objectPosition: Position) => void

  // eslint-disable-next-line no-undef
  async init(container: HTMLElement) {
    this.app = new Application()
    await this.app.init({
      background: '#1a1a2e',
      resizeTo: container,
      antialias: false,
      roundPixels: true
    })

    container.appendChild(this.app.canvas)

    // Create containers (order matters for z-index)
    this.worldContainer = new Container()
    this.objectsContainer = new Container() // Trees, fishing spots
    this.entitiesContainer = new Container() // Players
    this.worldContainer.addChild(this.objectsContainer)
    this.worldContainer.addChild(this.entitiesContainer)
    this.app.stage.addChild(this.worldContainer)

    await this.initSystems()
    await this.initPlayer()
    this.setupInput()

    window.addEventListener('resize', this.handleResize)
  }

  private async initSystems() {
    this.tilemap = new TilemapRenderer()
    await this.tilemap.init()
    // Insert tilemap at bottom of world container
    this.worldContainer.addChildAt(this.tilemap.container, 0)

    this.pathfinding = new Pathfinding(this.tilemap.getCollisionGrid())

    this.camera = new Camera(
      this.app.screen.width,
      this.app.screen.height,
      this.tilemap.worldWidth,
      this.tilemap.worldHeight
    )
  }

  private async initPlayer() {
    const startTile = { tileX: 10, tileY: 10 }
    const startPos = tileToWorld(startTile)

    this.player = new Player(startPos)
    await this.player.init()
    this.entitiesContainer.addChild(this.player.sprite)

    this.camera.follow(this.player.position)
  }

  private setupInput() {
    this.app.canvas.addEventListener('click', this.handleClick)
    this.app.canvas.addEventListener('contextmenu', this.handleContextMenu)
  }

  private handleClick = (e: MouseEvent) => {
    this.processClick(e)
  }

  private handleContextMenu = (e: MouseEvent) => {
    e.preventDefault()
    this.processClick(e)
  }

  private processClick(e: MouseEvent) {
    const rect = this.app.canvas.getBoundingClientRect()
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top
    const worldPos = this.camera.screenToWorld(screenX, screenY)

    // Check if clicking on a world object
    const clickedObject = this.findWorldObjectAt(worldPos)
    if (clickedObject && !clickedObject.depleted) {
      // Walk to adjacent tile, then start action
      const adjacentTile = this.findAdjacentWalkableTile(
        worldToTile({ x: clickedObject.sprite.x, y: clickedObject.sprite.y })
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
            this.onWorldObjectClick?.(clickedObject.id, {
              x: clickedObject.sprite.x,
              y: clickedObject.sprite.y
            })
          })
          this.onLocalPlayerMove?.(this.player.position, worldPath)
        } else if (
          Math.abs(playerTile.tileX - adjacentTile.tileX) <= 1 &&
          Math.abs(playerTile.tileY - adjacentTile.tileY) <= 1
        ) {
          // Already adjacent
          this.onWorldObjectClick?.(clickedObject.id, {
            x: clickedObject.sprite.x,
            y: clickedObject.sprite.y
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
      const dx = pos.x - obj.sprite.x
      const dy = pos.y - obj.sprite.y
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
    this.camera.resize(this.app.screen.width, this.app.screen.height)
  }

  // World object management
  addWorldObject(id: string, objectType: WorldObjectType, x: number, y: number) {
    if (this.worldObjects.has(id)) return

    const obj = new WorldObjectEntity(id, objectType, x, y)
    this.worldObjects.set(id, obj)
    this.objectsContainer.addChild(obj.sprite)
  }

  removeWorldObject(id: string) {
    const obj = this.worldObjects.get(id)
    if (obj) {
      this.objectsContainer.removeChild(obj.sprite)
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

    const remotePlayer = new RemotePlayer(position, name)
    await remotePlayer.init()
    this.remotePlayers.set(id, remotePlayer)
    this.entitiesContainer.addChild(remotePlayer.sprite)
  }

  removeRemotePlayer(id: string) {
    const remotePlayer = this.remotePlayers.get(id)
    if (remotePlayer) {
      this.entitiesContainer.removeChild(remotePlayer.sprite)
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
    this.app.ticker.add((ticker) => {
      const delta = ticker.deltaTime

      this.player.update(delta)

      for (const remotePlayer of this.remotePlayers.values()) {
        remotePlayer.update(delta)
      }

      this.camera.follow(this.player.position)

      this.worldContainer.x = -this.camera.x
      this.worldContainer.y = -this.camera.y

      // Sort entities by Y for depth
      this.entitiesContainer.children.sort((a, b) => a.y - b.y)
    })
  }

  destroy() {
    window.removeEventListener('resize', this.handleResize)
    this.app.canvas.removeEventListener('click', this.handleClick)
    this.app.canvas.removeEventListener('contextmenu', this.handleContextMenu)
    this.app.destroy(true, { children: true })
  }
}
