import type { EditorTool, EditorStateData } from '../../editor/EditorState'

interface EditorToolbarProps {
  state: EditorStateData
  onSelectTool: (tool: EditorTool) => void
  onUndo: () => void
  onRedo: () => void
  onSave: () => void
  onLoad: () => void
  onDownload: () => void
}

const TOOLS: { id: EditorTool; label: string; shortcut: string }[] = [
  { id: 'tile', label: 'TILE', shortcut: 'B' },
  { id: 'height', label: 'HEIGHT', shortcut: 'H' },
  { id: 'fill', label: 'FILL', shortcut: 'G' },
  { id: 'prop', label: 'PROP', shortcut: 'P' }
]

const buttonStyle: React.CSSProperties = {
  padding: '8px 12px',
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: 4,
  color: '#a3a3a3',
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: '0.05em',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  fontFamily: 'Inter, system-ui, sans-serif'
}

const activeButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: 'rgba(184, 134, 11, 0.3)',
  borderColor: '#b8860b',
  color: '#b8860b'
}

const disabledButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  opacity: 0.4,
  cursor: 'not-allowed'
}

export function EditorToolbar({
  state,
  onSelectTool,
  onUndo,
  onRedo,
  onSave,
  onLoad,
  onDownload
}: EditorToolbarProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 48,
        background: 'rgba(10, 10, 10, 0.95)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 8,
        zIndex: 100
      }}
    >
      {/* Editor mode indicator */}
      <div
        style={{
          padding: '6px 12px',
          background: 'rgba(184, 134, 11, 0.2)',
          borderRadius: 4,
          marginRight: 8
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.1em',
            color: '#b8860b',
            fontFamily: 'Inter, system-ui, sans-serif'
          }}
        >
          EDITOR
        </span>
      </div>

      {/* Separator */}
      <div style={{ width: 1, height: 24, background: 'rgba(255, 255, 255, 0.1)' }} />

      {/* Tool buttons */}
      <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onSelectTool(tool.id)}
            style={state.tool === tool.id ? activeButtonStyle : buttonStyle}
            title={`${tool.label} (${tool.shortcut})`}
          >
            {tool.label}
          </button>
        ))}
      </div>

      {/* Separator */}
      <div style={{ width: 1, height: 24, background: 'rgba(255, 255, 255, 0.1)', marginLeft: 8 }} />

      {/* Undo/Redo */}
      <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
        <button
          onClick={onUndo}
          disabled={!state.canUndo}
          style={state.canUndo ? buttonStyle : disabledButtonStyle}
          title="Undo (Ctrl+Z)"
        >
          UNDO
        </button>
        <button
          onClick={onRedo}
          disabled={!state.canRedo}
          style={state.canRedo ? buttonStyle : disabledButtonStyle}
          title="Redo (Ctrl+Shift+Z)"
        >
          REDO
        </button>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Save/Load */}
      <div style={{ display: 'flex', gap: 4 }}>
        <button onClick={onSave} style={buttonStyle} title="Save to localStorage (Ctrl+S)">
          SAVE
        </button>
        <button onClick={onLoad} style={buttonStyle} title="Load from file">
          LOAD
        </button>
        <button onClick={onDownload} style={buttonStyle} title="Download as JSON">
          EXPORT
        </button>
      </div>

      {/* Chunk info */}
      <div
        style={{
          marginLeft: 16,
          padding: '6px 12px',
          background: state.isModified ? 'rgba(255, 100, 100, 0.2)' : 'rgba(255, 255, 255, 0.05)',
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: '#a3a3a3',
            fontFamily: 'Inter, system-ui, sans-serif'
          }}
        >
          Chunk ({state.currentChunkX}, {state.currentChunkY})
        </span>
        {state.isModified && (
          <span
            style={{
              fontSize: 9,
              color: '#ff6b6b',
              fontWeight: 600,
              letterSpacing: '0.05em'
            }}
          >
            MODIFIED
          </span>
        )}
      </div>
    </div>
  )
}
