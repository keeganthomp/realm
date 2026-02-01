import type { Position } from '@realm/shared'

export class Camera {
  public x: number = 0
  public y: number = 0

  private screenWidth: number
  private screenHeight: number
  private worldWidth: number
  private worldHeight: number
  private smoothing: number = 0.1

  constructor(screenWidth: number, screenHeight: number, worldWidth: number, worldHeight: number) {
    this.screenWidth = screenWidth
    this.screenHeight = screenHeight
    this.worldWidth = worldWidth
    this.worldHeight = worldHeight
  }

  follow(target: Position) {
    // Target camera position (centered on target)
    const targetX = target.x - this.screenWidth / 2
    const targetY = target.y - this.screenHeight / 2

    // Smooth interpolation
    this.x += (targetX - this.x) * this.smoothing
    this.y += (targetY - this.y) * this.smoothing

    // Clamp to world bounds
    this.x = Math.max(0, Math.min(this.x, this.worldWidth - this.screenWidth))
    this.y = Math.max(0, Math.min(this.y, this.worldHeight - this.screenHeight))

    // Handle case where world is smaller than screen
    if (this.worldWidth < this.screenWidth) {
      this.x = (this.worldWidth - this.screenWidth) / 2
    }
    if (this.worldHeight < this.screenHeight) {
      this.y = (this.worldHeight - this.screenHeight) / 2
    }
  }

  resize(screenWidth: number, screenHeight: number) {
    this.screenWidth = screenWidth
    this.screenHeight = screenHeight
  }

  screenToWorld(screenX: number, screenY: number): Position {
    return {
      x: screenX + this.x,
      y: screenY + this.y
    }
  }

  worldToScreen(worldX: number, worldY: number): Position {
    return {
      x: worldX - this.x,
      y: worldY - this.y
    }
  }
}
