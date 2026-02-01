export interface PointerEvent {
  tileX: number
  tileY: number
  button: number // 0 = left, 2 = right
  shiftKey: boolean
  ctrlKey: boolean
}

export interface Tool {
  name: string
  cursor: string
  onPointerDown(event: PointerEvent): void
  onPointerMove(event: PointerEvent): void
  onPointerUp(event: PointerEvent): void
  onActivate?(): void
  onDeactivate?(): void
}
