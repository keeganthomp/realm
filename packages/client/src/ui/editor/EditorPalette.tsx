import { TileType, WorldObjectType } from '@realm/shared'
import type { EditorTool, EditorStateData } from '../../editor/EditorState'

interface EditorPaletteProps {
  state: EditorStateData
  onSelectTile: (type: TileType) => void
  onSelectProp: (type: WorldObjectType) => void
  onBrushSizeChange: (size: number) => void
  onHeightDeltaChange: (delta: number) => void
}

const TILE_COLORS: Record<TileType, string> = {
  [TileType.GRASS]: '#4a7c23',
  [TileType.WATER]: '#3d85c6',
  [TileType.SAND]: '#c9b458',
  [TileType.STONE]: '#808080',
  [TileType.TREE]: '#2d5a14',
  [TileType.WALL]: '#4a4a4a'
}

const TILE_NAMES: Record<TileType, string> = {
  [TileType.GRASS]: 'GRASS',
  [TileType.WATER]: 'WATER',
  [TileType.SAND]: 'SAND',
  [TileType.STONE]: 'STONE',
  [TileType.TREE]: 'TREE',
  [TileType.WALL]: 'WALL'
}

const PROP_NAMES: Record<string, string> = {
  [WorldObjectType.TREE]: 'Tree',
  [WorldObjectType.OAK_TREE]: 'Oak Tree',
  [WorldObjectType.WILLOW_TREE]: 'Willow',
  [WorldObjectType.FISHING_SPOT_NET]: 'Fish (Net)',
  [WorldObjectType.FISHING_SPOT_ROD]: 'Fish (Rod)',
  [WorldObjectType.FIRE]: 'Fire',
  [WorldObjectType.BANK_BOOTH]: 'Bank'
}

const sectionStyle: React.CSSProperties = {
  marginBottom: 16
}

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.1em',
  color: '#666',
  marginBottom: 8,
  display: 'block',
  fontFamily: 'Inter, system-ui, sans-serif'
}

export function EditorPalette({
  state,
  onSelectTile,
  onSelectProp,
  onBrushSizeChange,
  onHeightDeltaChange
}: EditorPaletteProps) {
  const showTilePalette = state.tool === 'tile' || state.tool === 'fill'
  const showPropPalette = state.tool === 'prop'
  const showBrushSettings = state.tool === 'tile' || state.tool === 'height'
  const showHeightSettings = state.tool === 'height'

  return (
    <div
      style={{
        position: 'absolute',
        top: 64,
        left: 16,
        width: 180,
        background: 'rgba(10, 10, 10, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 4,
        padding: 16,
        zIndex: 100
      }}
    >
      {/* Tile palette */}
      {showTilePalette && (
        <div style={sectionStyle}>
          <span style={labelStyle}>TILE TYPE</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {Object.values(TileType)
              .filter((v) => typeof v === 'number')
              .map((type) => {
                const tileType = type as TileType
                const isSelected = state.selectedTileType === tileType

                return (
                  <button
                    key={tileType}
                    onClick={() => onSelectTile(tileType)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 12px',
                      background: isSelected ? 'rgba(184, 134, 11, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                      border: isSelected ? '1px solid #b8860b' : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 4,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 3,
                        background: TILE_COLORS[tileType],
                        border: '1px solid rgba(255, 255, 255, 0.2)'
                      }}
                    />
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        letterSpacing: '0.05em',
                        color: isSelected ? '#b8860b' : '#a3a3a3',
                        fontFamily: 'Inter, system-ui, sans-serif'
                      }}
                    >
                      {TILE_NAMES[tileType]}
                    </span>
                  </button>
                )
              })}
          </div>
        </div>
      )}

      {/* Prop palette */}
      {showPropPalette && (
        <div style={sectionStyle}>
          <span style={labelStyle}>OBJECT TYPE</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {Object.values(WorldObjectType).map((type) => {
              const isSelected = state.selectedPropType === type

              return (
                <button
                  key={type}
                  onClick={() => onSelectProp(type)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 12px',
                    background: isSelected ? 'rgba(184, 134, 11, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                    border: isSelected ? '1px solid #b8860b' : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 4,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      letterSpacing: '0.05em',
                      color: isSelected ? '#b8860b' : '#a3a3a3',
                      fontFamily: 'Inter, system-ui, sans-serif'
                    }}
                  >
                    {PROP_NAMES[type] || type}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Brush size */}
      {showBrushSettings && (
        <div style={sectionStyle}>
          <span style={labelStyle}>BRUSH SIZE</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => onBrushSizeChange(state.brushSize - 1)}
              disabled={state.brushSize <= 1}
              style={{
                width: 28,
                height: 28,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 4,
                color: '#a3a3a3',
                fontSize: 16,
                cursor: state.brushSize > 1 ? 'pointer' : 'not-allowed',
                opacity: state.brushSize <= 1 ? 0.4 : 1
              }}
            >
              -
            </button>
            <span
              style={{
                flex: 1,
                textAlign: 'center',
                fontSize: 14,
                fontWeight: 600,
                color: '#b8860b',
                fontFamily: 'Inter, system-ui, sans-serif'
              }}
            >
              {state.brushSize}
            </span>
            <button
              onClick={() => onBrushSizeChange(state.brushSize + 1)}
              disabled={state.brushSize >= 5}
              style={{
                width: 28,
                height: 28,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 4,
                color: '#a3a3a3',
                fontSize: 16,
                cursor: state.brushSize < 5 ? 'pointer' : 'not-allowed',
                opacity: state.brushSize >= 5 ? 0.4 : 1
              }}
            >
              +
            </button>
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 10,
              color: '#666',
              textAlign: 'center',
              fontFamily: 'Inter, system-ui, sans-serif'
            }}
          >
            [ / ] to adjust
          </div>
        </div>
      )}

      {/* Height delta */}
      {showHeightSettings && (
        <div style={sectionStyle}>
          <span style={labelStyle}>HEIGHT MODE</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={() => onHeightDeltaChange(1)}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: state.heightDelta > 0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                border: state.heightDelta > 0 ? '1px solid #22c55e' : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 4,
                color: state.heightDelta > 0 ? '#22c55e' : '#a3a3a3',
                fontSize: 11,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'Inter, system-ui, sans-serif'
              }}
            >
              RAISE
            </button>
            <button
              onClick={() => onHeightDeltaChange(-1)}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: state.heightDelta < 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                border: state.heightDelta < 0 ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 4,
                color: state.heightDelta < 0 ? '#ef4444' : '#a3a3a3',
                fontSize: 11,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'Inter, system-ui, sans-serif'
              }}
            >
              LOWER
            </button>
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 10,
              color: '#666',
              textAlign: 'center',
              fontFamily: 'Inter, system-ui, sans-serif'
            }}
          >
            Right-click to lower
          </div>
        </div>
      )}

      {/* Keyboard shortcuts hint */}
      <div
        style={{
          marginTop: 16,
          padding: 12,
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: 4,
          fontSize: 10,
          color: '#555',
          lineHeight: 1.6,
          fontFamily: 'Inter, system-ui, sans-serif'
        }}
      >
        <div>
          <span style={{ color: '#b8860b' }}>`</span> Toggle editor
        </div>
        <div>
          <span style={{ color: '#b8860b' }}>B/H/G/P</span> Tools
        </div>
        <div>
          <span style={{ color: '#b8860b' }}>Ctrl+Z/Y</span> Undo/Redo
        </div>
        <div>
          <span style={{ color: '#b8860b' }}>Ctrl+S</span> Save
        </div>
      </div>
    </div>
  )
}
