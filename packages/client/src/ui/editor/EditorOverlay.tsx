import { useCallback, useRef } from 'react'
import { TileType, WorldObjectType } from '@realm/shared'
import type { EditorTool, EditorStateData } from '../../editor/EditorState'
import { EditorToolbar } from './EditorToolbar'
import { EditorPalette } from './EditorPalette'

interface EditorOverlayProps {
  state: EditorStateData
  onSelectTool: (tool: EditorTool) => void
  onSelectTile: (type: TileType) => void
  onSelectProp: (type: WorldObjectType) => void
  onBrushSizeChange: (size: number) => void
  onHeightDeltaChange: (delta: number) => void
  onUndo: () => void
  onRedo: () => void
  onSave: () => void
  onDownload: () => void
  onImportFile: (file: File) => void
}

export function EditorOverlay({
  state,
  onSelectTool,
  onSelectTile,
  onSelectProp,
  onBrushSizeChange,
  onHeightDeltaChange,
  onUndo,
  onRedo,
  onSave,
  onDownload,
  onImportFile
}: EditorOverlayProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleLoad = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        onImportFile(file)
      }
      // Reset input so same file can be selected again
      e.target.value = ''
    },
    [onImportFile]
  )

  if (!state.active) return null

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 50
      }}
    >
      {/* Toolbar at top */}
      <div style={{ pointerEvents: 'auto' }}>
        <EditorToolbar
          state={state}
          onSelectTool={onSelectTool}
          onUndo={onUndo}
          onRedo={onRedo}
          onSave={onSave}
          onLoad={handleLoad}
          onDownload={onDownload}
        />
      </div>

      {/* Palette on left */}
      <div style={{ pointerEvents: 'auto' }}>
        <EditorPalette
          state={state}
          onSelectTile={onSelectTile}
          onSelectProp={onSelectProp}
          onBrushSizeChange={onBrushSizeChange}
          onHeightDeltaChange={onHeightDeltaChange}
        />
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Status bar at bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 28,
          background: 'rgba(10, 10, 10, 0.9)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: 16,
          pointerEvents: 'auto'
        }}
      >
        <span
          style={{
            fontSize: 10,
            color: '#666',
            fontFamily: 'Inter, system-ui, sans-serif'
          }}
        >
          Tool: <span style={{ color: '#b8860b' }}>{state.tool.toUpperCase()}</span>
        </span>

        {(state.tool === 'tile' || state.tool === 'fill') && (
          <span
            style={{
              fontSize: 10,
              color: '#666',
              fontFamily: 'Inter, system-ui, sans-serif'
            }}
          >
            Tile: <span style={{ color: '#b8860b' }}>{TileType[state.selectedTileType]}</span>
          </span>
        )}

        {state.tool === 'prop' && state.selectedPropType && (
          <span
            style={{
              fontSize: 10,
              color: '#666',
              fontFamily: 'Inter, system-ui, sans-serif'
            }}
          >
            Object: <span style={{ color: '#b8860b' }}>{state.selectedPropType}</span>
          </span>
        )}

        {(state.tool === 'tile' || state.tool === 'height') && (
          <span
            style={{
              fontSize: 10,
              color: '#666',
              fontFamily: 'Inter, system-ui, sans-serif'
            }}
          >
            Brush: <span style={{ color: '#b8860b' }}>{state.brushSize}x{state.brushSize}</span>
          </span>
        )}

        <div style={{ flex: 1 }} />

        <span
          style={{
            fontSize: 10,
            color: '#666',
            fontFamily: 'Inter, system-ui, sans-serif'
          }}
        >
          Grid: <span style={{ color: state.showGrid ? '#22c55e' : '#ef4444' }}>{state.showGrid ? 'ON' : 'OFF'}</span>
        </span>
      </div>
    </div>
  )
}
