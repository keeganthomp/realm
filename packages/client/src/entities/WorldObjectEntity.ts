import { Container, Graphics, Text } from 'pixi.js'
import { WorldObjectType, WORLD_OBJECT_DEFINITIONS, TILE_SIZE } from '@realm/shared'

export class WorldObjectEntity {
  public sprite: Container
  public id: string
  public objectType: WorldObjectType
  public depleted: boolean = false

  private body: Graphics
  private label: Text

  constructor(id: string, objectType: WorldObjectType, x: number, y: number) {
    this.id = id
    this.objectType = objectType
    this.sprite = new Container()
    this.sprite.x = x
    this.sprite.y = y

    this.body = new Graphics()
    this.label = new Text({ text: '' })

    this.drawObject()
    this.sprite.addChild(this.body)

    // Add hover label
    const def = WORLD_OBJECT_DEFINITIONS[objectType]
    if (def) {
      this.label = new Text({
        text: `${def.action} ${def.name}`,
        style: {
          fontFamily: 'Inter, sans-serif',
          fontSize: 10,
          fill: 0xffffff,
          letterSpacing: 0.5
        }
      })
      this.label.anchor.set(0.5, 1)
      this.label.y = -TILE_SIZE
      this.label.visible = false
      this.sprite.addChild(this.label)
    }

    // Make interactive
    this.sprite.eventMode = 'static'
    this.sprite.cursor = 'pointer'
    this.sprite.on('pointerover', () => {
      this.label.visible = true
    })
    this.sprite.on('pointerout', () => {
      this.label.visible = false
    })
  }

  private drawObject() {
    this.body.clear()

    if (this.depleted) {
      this.drawDepletedObject()
      return
    }

    switch (this.objectType) {
      case WorldObjectType.TREE:
      case WorldObjectType.OAK_TREE:
      case WorldObjectType.WILLOW_TREE:
        this.drawTree()
        break
      case WorldObjectType.FISHING_SPOT_NET:
      case WorldObjectType.FISHING_SPOT_ROD:
        this.drawFishingSpot()
        break
      case WorldObjectType.FIRE:
        this.drawFire()
        break
    }
  }

  private drawTree() {
    // Trunk
    this.body.rect(-4, 0, 8, 16)
    this.body.fill(0x5c4033)

    // Canopy - darker green for different tree types
    let canopyColor = 0x228b22
    if (this.objectType === WorldObjectType.OAK_TREE) {
      canopyColor = 0x2e8b57
    } else if (this.objectType === WorldObjectType.WILLOW_TREE) {
      canopyColor = 0x6b8e23
    }

    this.body.circle(0, -8, 16)
    this.body.fill(canopyColor)

    // Highlight
    this.body.circle(-4, -12, 6)
    this.body.fill({ color: canopyColor, alpha: 0.6 })
  }

  private drawFishingSpot() {
    // Water ripples
    this.body.ellipse(0, 0, 14, 8)
    this.body.fill({ color: 0x4a90d9, alpha: 0.6 })

    // Fish jumping animation hint
    this.body.ellipse(4, -2, 6, 4)
    this.body.fill({ color: 0x6bb3f0, alpha: 0.8 })

    // Bubbles
    this.body.circle(-6, 2, 2)
    this.body.circle(-3, 4, 1.5)
    this.body.fill({ color: 0xffffff, alpha: 0.5 })
  }

  private drawFire() {
    // Fire glow
    this.body.circle(0, 0, 12)
    this.body.fill({ color: 0xff6600, alpha: 0.3 })

    // Logs
    this.body.rect(-10, 4, 8, 4)
    this.body.rect(2, 4, 8, 4)
    this.body.fill({ color: 0x5c4033 })

    // Flames
    this.body.moveTo(0, 4)
    this.body.lineTo(-6, -8)
    this.body.lineTo(0, -4)
    this.body.lineTo(6, -10)
    this.body.lineTo(2, -2)
    this.body.lineTo(8, -6)
    this.body.lineTo(0, 4)
    this.body.fill({ color: 0xff4500 })

    // Inner flame
    this.body.moveTo(0, 2)
    this.body.lineTo(-3, -4)
    this.body.lineTo(0, -2)
    this.body.lineTo(3, -6)
    this.body.lineTo(0, 2)
    this.body.fill({ color: 0xffcc00 })
  }

  private drawDepletedObject() {
    if (
      this.objectType === WorldObjectType.TREE ||
      this.objectType === WorldObjectType.OAK_TREE ||
      this.objectType === WorldObjectType.WILLOW_TREE
    ) {
      // Tree stump
      this.body.rect(-6, 4, 12, 8)
      this.body.fill({ color: 0x5c4033 })
      this.body.ellipse(0, 4, 6, 2)
      this.body.fill({ color: 0x8b7355 })
    }
  }

  setDepleted(depleted: boolean) {
    if (this.depleted !== depleted) {
      this.depleted = depleted
      this.drawObject()
      this.sprite.cursor = depleted ? 'default' : 'pointer'
    }
  }
}
