/* eslint-disable no-undef */
import {
  type EditorChunkSchema,
  type EditorPropPlacement,
  createEmptyEditorChunk,
  parseEditorChunk,
  CHUNK_SIZE,
  TileType
} from '@realm/shared'

const STORAGE_PREFIX = 'realm_editor_chunk_'

export class ChunkManager {
  private currentChunk: EditorChunkSchema | null = null

  // Load chunk from localStorage or create new
  loadChunk(chunkX: number, chunkY: number): EditorChunkSchema {
    const key = this.getStorageKey(chunkX, chunkY)
    const stored = localStorage.getItem(key)

    if (stored) {
      const parsed = parseEditorChunk(stored)
      if (parsed) {
        this.currentChunk = parsed
        return parsed
      }
    }

    // Create new chunk
    const newChunk = createEmptyEditorChunk(chunkX, chunkY)
    this.currentChunk = newChunk
    return newChunk
  }

  // Get current chunk
  getCurrentChunk(): EditorChunkSchema | null {
    return this.currentChunk
  }

  // Update tile type
  setTile(localX: number, localY: number, tileType: TileType) {
    if (!this.currentChunk) return
    if (localX < 0 || localX >= CHUNK_SIZE || localY < 0 || localY >= CHUNK_SIZE) return

    this.currentChunk.tiles[localY][localX] = tileType
    this.currentChunk.modifiedAt = new Date().toISOString()
  }

  // Update height
  setHeight(localX: number, localY: number, height: number) {
    if (!this.currentChunk) return
    if (localX < 0 || localX >= CHUNK_SIZE || localY < 0 || localY >= CHUNK_SIZE) return

    this.currentChunk.heights[localY][localX] = Math.max(0, Math.min(5, height))
    this.currentChunk.modifiedAt = new Date().toISOString()
  }

  // Get tile type at local coordinates
  getTile(localX: number, localY: number): TileType | null {
    if (!this.currentChunk) return null
    if (localX < 0 || localX >= CHUNK_SIZE || localY < 0 || localY >= CHUNK_SIZE) return null

    return this.currentChunk.tiles[localY][localX]
  }

  // Get height at local coordinates
  getHeight(localX: number, localY: number): number {
    if (!this.currentChunk) return 0
    if (localX < 0 || localX >= CHUNK_SIZE || localY < 0 || localY >= CHUNK_SIZE) return 0

    return this.currentChunk.heights[localY][localX]
  }

  // Add prop
  addProp(prop: EditorPropPlacement) {
    if (!this.currentChunk) return
    this.currentChunk.props.push(prop)
    this.currentChunk.modifiedAt = new Date().toISOString()
  }

  // Remove prop by ID
  removeProp(id: string) {
    if (!this.currentChunk) return
    const index = this.currentChunk.props.findIndex(p => p.id === id)
    if (index !== -1) {
      this.currentChunk.props.splice(index, 1)
      this.currentChunk.modifiedAt = new Date().toISOString()
    }
  }

  // Get prop at local coordinates
  getPropAt(localX: number, localY: number): EditorPropPlacement | null {
    if (!this.currentChunk) return null
    return this.currentChunk.props.find(p => p.localX === localX && p.localY === localY) ?? null
  }

  // Save current chunk to localStorage
  saveToLocalStorage(): boolean {
    if (!this.currentChunk) return false

    const key = this.getStorageKey(this.currentChunk.chunkX, this.currentChunk.chunkY)
    try {
      localStorage.setItem(key, JSON.stringify(this.currentChunk))
      return true
    } catch (e) {
      console.error('Failed to save chunk to localStorage:', e)
      return false
    }
  }

  // Export current chunk as JSON string
  exportAsJson(): string | null {
    if (!this.currentChunk) return null
    return JSON.stringify(this.currentChunk, null, 2)
  }

  // Download current chunk as JSON file
  downloadChunk() {
    if (!this.currentChunk) return

    const json = this.exportAsJson()
    if (!json) return

    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chunk_${this.currentChunk.chunkX}_${this.currentChunk.chunkY}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Import chunk from JSON file
  async importFromFile(file: File): Promise<EditorChunkSchema | null> {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        const parsed = parseEditorChunk(content)
        if (parsed) {
          this.currentChunk = parsed
          resolve(parsed)
        } else {
          resolve(null)
        }
      }
      reader.onerror = () => resolve(null)
      reader.readAsText(file)
    })
  }

  // List all saved chunks in localStorage
  listSavedChunks(): Array<{ chunkX: number; chunkY: number; modifiedAt: string }> {
    const chunks: Array<{ chunkX: number; chunkY: number; modifiedAt: string }> = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith(STORAGE_PREFIX)) continue

      const stored = localStorage.getItem(key)
      if (!stored) continue

      try {
        const data = JSON.parse(stored)
        if (data.chunkX !== undefined && data.chunkY !== undefined) {
          chunks.push({
            chunkX: data.chunkX,
            chunkY: data.chunkY,
            modifiedAt: data.modifiedAt || 'Unknown'
          })
        }
      } catch {
        // Skip invalid entries
      }
    }

    return chunks.sort((a, b) => {
      if (a.chunkX !== b.chunkX) return a.chunkX - b.chunkX
      return a.chunkY - b.chunkY
    })
  }

  // Delete saved chunk from localStorage
  deleteChunk(chunkX: number, chunkY: number): boolean {
    const key = this.getStorageKey(chunkX, chunkY)
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key)
      return true
    }
    return false
  }

  private getStorageKey(chunkX: number, chunkY: number): string {
    return `${STORAGE_PREFIX}${chunkX}_${chunkY}`
  }
}
