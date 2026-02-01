import { Container, Graphics, Text } from 'pixi.js'
import { Direction, getDirection, TILE_SIZE } from '@realm/shared'
import type { Position } from '@realm/shared'

const MOVE_SPEED = 3 // pixels per frame at 60fps

export class Player {
  public sprite: Container
  public position: Position
  public direction: Direction = Direction.DOWN
  public isMoving: boolean = false
  public isActioning: boolean = false

  private path: Position[] = []
  private currentTarget: Position | null = null
  private onPathComplete?: () => void
  private body: Graphics
  private nameTag: Text
  private actionIndicator: Graphics

  constructor(startPosition: Position) {
    this.position = { ...startPosition }
    this.sprite = new Container()
    this.body = new Graphics()
    this.nameTag = new Text({ text: '' })
    this.actionIndicator = new Graphics()
  }

  async init() {
    this.body = new Graphics()
    this.drawCharacter()
    this.sprite.addChild(this.body)

    // Action indicator (shown when chopping/fishing)
    this.actionIndicator = new Graphics()
    this.actionIndicator.visible = false
    this.sprite.addChild(this.actionIndicator)

    this.nameTag = new Text({
      text: 'You',
      style: {
        fontFamily: 'Inter, sans-serif',
        fontSize: 11,
        fill: 0xffffff,
        letterSpacing: 1
      }
    })
    this.nameTag.anchor.set(0.5, 1)
    this.nameTag.y = -TILE_SIZE / 2 - 4
    this.sprite.addChild(this.nameTag)

    this.updateSpritePosition()
  }

  private drawCharacter() {
    this.body.clear()

    // Shadow
    this.body.ellipse(0, TILE_SIZE / 2 - 4, 10, 4)
    this.body.fill({ color: 0x000000, alpha: 0.2 })

    const bodyColor = 0x4a90d9 // Blue tunic
    const skinColor = 0xf5d0a9 // Skin tone

    // Legs
    this.body.rect(-6, 4, 5, 12)
    this.body.rect(1, 4, 5, 12)
    this.body.fill({ color: 0x3d3d3d })

    // Body/tunic
    this.body.roundRect(-8, -8, 16, 14, 2)
    this.body.fill({ color: bodyColor })

    // Head
    this.body.circle(0, -14, 8)
    this.body.fill({ color: skinColor })

    // Eyes based on direction
    this.drawDirectionIndicator()
  }

  private drawDirectionIndicator() {
    const eyeColor = 0x2d2d2d
    const eyeSize = 2

    switch (this.direction) {
      case Direction.DOWN:
        this.body.circle(-3, -14, eyeSize)
        this.body.circle(3, -14, eyeSize)
        break
      case Direction.UP:
        break
      case Direction.LEFT:
        this.body.circle(-4, -14, eyeSize)
        break
      case Direction.RIGHT:
        this.body.circle(4, -14, eyeSize)
        break
    }
    this.body.fill({ color: eyeColor })
  }

  private drawActionIndicator() {
    this.actionIndicator.clear()
    if (!this.isActioning) {
      this.actionIndicator.visible = false
      return
    }

    this.actionIndicator.visible = true

    // Spinning dots around player
    const time = Date.now() / 200
    for (let i = 0; i < 3; i++) {
      const angle = time + (i * Math.PI * 2) / 3
      const x = Math.cos(angle) * 20
      const y = Math.sin(angle) * 10 - 10
      this.actionIndicator.circle(x, y, 3)
    }
    this.actionIndicator.fill({ color: 0xb8860b, alpha: 0.8 })
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
      this.actionIndicator.visible = false
    }
  }

  update(delta: number) {
    // Update action indicator animation
    if (this.isActioning) {
      this.drawActionIndicator()
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
      this.drawCharacter()
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

    this.updateSpritePosition()
  }

  private updateSpritePosition() {
    this.sprite.x = this.position.x
    this.sprite.y = this.position.y
  }
}
