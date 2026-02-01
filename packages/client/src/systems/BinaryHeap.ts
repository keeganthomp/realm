/**
 * BinaryHeap - A min-heap priority queue for A* pathfinding
 *
 * Provides O(log n) push and pop operations, compared to
 * O(n) linear search in the original implementation.
 */

export interface HeapNode {
  f: number
  index: number
}

export class BinaryHeap<T extends HeapNode> {
  private heap: T[] = []

  get length(): number {
    return this.heap.length
  }

  push(item: T): void {
    this.heap.push(item)
    this.bubbleUp(this.heap.length - 1)
  }

  pop(): T | undefined {
    if (this.heap.length === 0) return undefined

    const min = this.heap[0]
    const last = this.heap.pop()

    if (this.heap.length > 0 && last) {
      this.heap[0] = last
      this.bubbleDown(0)
    }

    return min
  }

  peek(): T | undefined {
    return this.heap[0]
  }

  /**
   * Update the priority of an item (used when a better path is found)
   */
  decreaseKey(item: T): void {
    const idx = this.heap.indexOf(item)
    if (idx !== -1) {
      this.bubbleUp(idx)
    }
  }

  contains(item: T): boolean {
    return this.heap.includes(item)
  }

  clear(): void {
    this.heap = []
  }

  private bubbleUp(idx: number): void {
    while (idx > 0) {
      const parentIdx = Math.floor((idx - 1) / 2)
      if (this.heap[idx].f >= this.heap[parentIdx].f) break

      this.swap(idx, parentIdx)
      idx = parentIdx
    }
  }

  private bubbleDown(idx: number): void {
    const length = this.heap.length

    while (true) {
      const leftIdx = 2 * idx + 1
      const rightIdx = 2 * idx + 2
      let smallest = idx

      if (leftIdx < length && this.heap[leftIdx].f < this.heap[smallest].f) {
        smallest = leftIdx
      }

      if (rightIdx < length && this.heap[rightIdx].f < this.heap[smallest].f) {
        smallest = rightIdx
      }

      if (smallest === idx) break

      this.swap(idx, smallest)
      idx = smallest
    }
  }

  private swap(i: number, j: number): void {
    const temp = this.heap[i]
    this.heap[i] = this.heap[j]
    this.heap[j] = temp
  }
}
