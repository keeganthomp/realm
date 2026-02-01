import { Container, Graphics, Text } from 'pixi.js'
import { Direction, TILE_SIZE } from '@realm/shared'
import type { Position } from '@realm/shared'

const INTERPOLATION_SPEED = 0.15

export class RemotePlayer {
  public sprite: Container
  public position: Position
  public direction: Direction = Direction.DOWN

  private targetPosition: Position
  private body: Graphics
  private nameTag: Text
  private playerName: string

  constructor(startPosition: Position, name: string) {
    this.position = { ...startPosition }
    this.targetPosition = { ...startPosition }
    this.playerName = name
    this.sprite = new Container()
    this.body = new Graphics()
    this.nameTag = new Text({ text: '' })
  }

  async init() {
    // Create a simple placeholder sprite (different color from local player)
    this.body = new Graphics()
    this.drawCharacter()
    this.sprite.addChild(this.body)

    // Add name tag above player
    this.nameTag = new Text({
      text: this.playerName,
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

    // Body (green tunic for remote players)
    const bodyColor = 0x6b8e23
    const skinColor = 0xf5d0a9

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

    // Direction indicator (eyes/facing)
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

  setTargetPosition(position: Position, direction: Direction) {
    this.targetPosition = { ...position }
    if (direction !== this.direction) {
      this.direction = direction
      this.drawCharacter()
    }
  }

  update(_delta: number) {
    // Interpolate towards target position
    const dx = this.targetPosition.x - this.position.x
    const dy = this.targetPosition.y - this.position.y

    this.position.x += dx * INTERPOLATION_SPEED
    this.position.y += dy * INTERPOLATION_SPEED

    this.updateSpritePosition()
  }

  private updateSpritePosition() {
    this.sprite.x = this.position.x
    this.sprite.y = this.position.y
  }
}
