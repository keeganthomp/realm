import type { WorldObjectType } from '@realm/shared'
import type { Command } from './Command'

export interface ObjectPlacement {
  id: string
  objectType: WorldObjectType
  tileX: number
  tileY: number
}

export class PlaceObjectCommand implements Command {
  description: string
  private placement: ObjectPlacement
  private addObject: (placement: ObjectPlacement) => void
  private removeObject: (id: string) => void

  constructor(
    placement: ObjectPlacement,
    addObject: (placement: ObjectPlacement) => void,
    removeObject: (id: string) => void
  ) {
    this.placement = placement
    this.addObject = addObject
    this.removeObject = removeObject
    this.description = `Place ${placement.objectType}`
  }

  execute() {
    this.addObject(this.placement)
  }

  undo() {
    this.removeObject(this.placement.id)
  }
}

export class RemoveObjectCommand implements Command {
  description: string
  private placement: ObjectPlacement
  private addObject: (placement: ObjectPlacement) => void
  private removeObject: (id: string) => void

  constructor(
    placement: ObjectPlacement,
    addObject: (placement: ObjectPlacement) => void,
    removeObject: (id: string) => void
  ) {
    this.placement = placement
    this.addObject = addObject
    this.removeObject = removeObject
    this.description = `Remove ${placement.objectType}`
  }

  execute() {
    this.removeObject(this.placement.id)
  }

  undo() {
    this.addObject(this.placement)
  }
}
