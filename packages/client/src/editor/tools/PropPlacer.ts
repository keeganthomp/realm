import type { WorldObjectType } from '@realm/shared'
import type { Tool, PointerEvent } from './Tool'
import type { EditorState } from '../EditorState'
import { PlaceObjectCommand, RemoveObjectCommand, type ObjectPlacement } from '../history/ObjectCommand'
import type { CommandHistory } from '../history/CommandHistory'

export interface PropPlacerContext {
  state: EditorState
  history: CommandHistory
  getObjectAt: (tileX: number, tileY: number) => ObjectPlacement | null
  addObject: (placement: ObjectPlacement) => void
  removeObject: (id: string) => void
  generateObjectId: () => string
}

export class PropPlacer implements Tool {
  name = 'Prop Placer'
  cursor = 'copy'

  private context: PropPlacerContext

  constructor(context: PropPlacerContext) {
    this.context = context
  }

  onPointerDown(event: PointerEvent) {
    const { selectedPropType } = this.context.state.get()

    if (event.button === 2) {
      // Right click = remove
      const existing = this.context.getObjectAt(event.tileX, event.tileY)
      if (existing) {
        const command = new RemoveObjectCommand(
          existing,
          (p) => this.context.addObject(p),
          (id) => this.context.removeObject(id)
        )
        this.context.history.execute(command)
        this.context.state.setModified(true)
      }
      return
    }

    if (event.button !== 0 || !selectedPropType) return

    // Check if tile already has an object
    const existing = this.context.getObjectAt(event.tileX, event.tileY)
    if (existing) return // Don't stack objects

    const placement: ObjectPlacement = {
      id: this.context.generateObjectId(),
      objectType: selectedPropType,
      tileX: event.tileX,
      tileY: event.tileY
    }

    const command = new PlaceObjectCommand(
      placement,
      (p) => this.context.addObject(p),
      (id) => this.context.removeObject(id)
    )
    this.context.history.execute(command)
    this.context.state.setModified(true)
  }

  onPointerMove(_event: PointerEvent) {
    // Could show ghost preview here
  }

  onPointerUp(_event: PointerEvent) {
    // No drag behavior
  }
}
