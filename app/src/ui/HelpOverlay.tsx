import React from 'react'

interface HelpOverlayProps {
  isVisible: boolean
  onClose: () => void
}

export function HelpOverlay({ isVisible, onClose }: HelpOverlayProps) {
  if (!isVisible) return null

  const shortcuts = [
    { category: 'Notes', items: [
      { key: 'Double-click', action: 'Create new note' },
      { key: 'Enter', action: 'Edit selected note' },
      { key: 'Esc', action: 'Finish editing' },
      { key: 'Delete/Backspace', action: 'Delete selected notes' },
    ]},
    { category: 'Selection', items: [
      { key: 'Click', action: 'Select note' },
      { key: 'Shift+Click', action: 'Add to selection' },
      { key: 'Drag empty area', action: 'Marquee select' },
      { key: 'Alt+Drag', action: 'Subtract from selection' },
      { key: 'Ctrl/Cmd+A', action: 'Select all notes' },
    ]},
    { category: 'Movement', items: [
      { key: 'Drag note', action: 'Move note(s)' },
      { key: 'Arrow keys', action: 'Nudge 1px' },
      { key: 'Shift+Arrow', action: 'Nudge 10px' },
      { key: 'Resize handles', action: 'Resize selected note' },
    ]},
    { category: 'Canvas', items: [
      { key: 'Mouse wheel', action: 'Zoom in/out' },
      { key: 'Space+Drag', action: 'Pan canvas' },
      { key: 'Middle-click+Drag', action: 'Pan canvas' },
    ]},
    { category: 'Connections', items: [
      { key: 'Alt+Drag note to note', action: 'Create connection' },
    ]},
    { category: 'File', items: [
      { key: 'Ctrl/Cmd+O', action: 'Open document' },
      { key: 'Ctrl/Cmd+S', action: 'Save document' },
    ]},
  ]

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: 12,
          padding: 32,
          maxWidth: 600,
          maxHeight: '80vh',
          overflow: 'auto',
          color: '#fff'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 24 
        }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 'bold' }}>
            🎯 Freeform Idea Map - Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: '1px solid #555',
              color: '#ccc',
              borderRadius: 6,
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: 12
            }}
          >
            Close
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 style={{ 
                margin: '0 0 12px 0', 
                fontSize: 14, 
                fontWeight: 'bold', 
                color: '#4aa3ff',
                borderBottom: '1px solid #333',
                paddingBottom: 4
              }}>
                {section.category}
              </h3>
              
              {section.items.map((shortcut, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  marginBottom: 8,
                  fontSize: 12
                }}>
                  <span style={{ 
                    fontFamily: 'monospace',
                    background: '#333',
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontSize: 11,
                    color: '#fff'
                  }}>
                    {shortcut.key}
                  </span>
                  <span style={{ color: '#ccc', marginLeft: 12, flex: 1, textAlign: 'right' }}>
                    {shortcut.action}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={{ 
          marginTop: 24, 
          padding: 16, 
          background: '#2a2a2a', 
          borderRadius: 8,
          fontSize: 12,
          color: '#999'
        }}>
          <strong>💡 Tips:</strong>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: 16 }}>
            <li>Use the Inspector panel (right) to edit note properties</li>
            <li>Export your work as PNG or TXT from the toolbar</li>
            <li>The canvas is infinite - pan around to explore</li>
            <li>Notes auto-resize based on content</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
