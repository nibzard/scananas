import React, { useState } from 'react'
import type { Note, Connection, BoardDocument } from '../model/types'
import { hasMarkdownSyntax } from '../utils/markdown'

interface InspectorProps {
  selectedIds: string[]
  notes: Note[]
  connections: Connection[]
  document: BoardDocument
  onNotesChange?: (notes: Note[]) => void
  onConnectionsChange?: (connections: Connection[]) => void
  onDocumentChange?: (doc: BoardDocument) => void
}

type Tab = 'note' | 'connection' | 'document'

export function Inspector({ 
  selectedIds, 
  notes, 
  connections, 
  document, 
  onNotesChange, 
  onConnectionsChange, 
  onDocumentChange 
}: InspectorProps) {
  const [activeTab, setActiveTab] = useState<Tab>('note')
  
  const selectedNotes = notes.filter(n => selectedIds.includes(n.id))
  const selectedConnections = connections.filter(c => selectedIds.includes(c.id))

  const updateSelectedNotes = (updates: Partial<Note>) => {
    if (!onNotesChange) return
    const updatedNotes = notes.map(note => 
      selectedIds.includes(note.id) ? { ...note, ...updates } : note
    )
    onNotesChange(updatedNotes)
  }

  const tabs = [
    { id: 'note' as Tab, label: 'Note', count: selectedNotes.length },
    { id: 'connection' as Tab, label: 'Connection', count: selectedConnections.length },
    { id: 'document' as Tab, label: 'Document', count: 1 }
  ]

  return (
    <div style={{
      width: 280,
      height: '100%',
      background: '#1a1a1a',
      borderLeft: '1px solid #333',
      display: 'flex',
      flexDirection: 'column',
      color: '#fff'
    }}>
      {/* Tab Header */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #333',
        background: '#111'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '12px 8px',
              border: 'none',
              background: activeTab === tab.id ? '#333' : 'transparent',
              color: activeTab === tab.id ? '#fff' : '#999',
              fontSize: '12px',
              cursor: 'pointer',
              borderBottom: activeTab === tab.id ? '2px solid #4aa3ff' : 'none'
            }}
          >
            {tab.label}
            {tab.count > 0 && <span style={{ marginLeft: 4, opacity: 0.7 }}>({tab.count})</span>}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, padding: 16, overflow: 'auto' }}>
        {activeTab === 'note' && (
          <NotePanel 
            selectedNotes={selectedNotes}
            onUpdate={updateSelectedNotes}
          />
        )}
        {activeTab === 'connection' && (
          <ConnectionPanel 
            selectedConnections={selectedConnections}
            onUpdate={(updates) => {
              if (!onConnectionsChange) return
              const updatedConnections = connections.map(conn => 
                selectedIds.includes(conn.id) ? { ...conn, ...updates } : conn
              )
              onConnectionsChange(updatedConnections)
            }}
          />
        )}
        {activeTab === 'document' && (
          <DocumentPanel document={document} onChange={onDocumentChange} />
        )}
      </div>
    </div>
  )
}

function NotePanel({ selectedNotes, onUpdate }: {
  selectedNotes: Note[]
  onUpdate: (updates: Partial<Note>) => void
}) {
  if (selectedNotes.length === 0) {
    return (
      <div style={{ opacity: 0.6, fontSize: 14, textAlign: 'center', marginTop: 40 }}>
        Select notes to edit properties
      </div>
    )
  }

  const firstNote = selectedNotes[0]
  const isMultiple = selectedNotes.length > 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>
          {isMultiple ? `${selectedNotes.length} notes selected` : 'Note Properties'}
        </div>
      </div>

      {/* Text Content */}
      {!isMultiple && (
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: '#ccc' }}>
            Text Content
          </label>
          <textarea
            value={firstNote.text}
            onChange={(e) => onUpdate({ text: e.target.value })}
            style={{
              width: '100%',
              minHeight: 60,
              padding: 8,
              background: '#333',
              border: '1px solid #555',
              borderRadius: 4,
              color: '#fff',
              fontSize: 12,
              resize: 'vertical'
            }}
          />

          {/* Markdown Toggle */}
          <div style={{ marginTop: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', fontSize: 12, color: '#ccc', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={firstNote.richAttrs?.markdownEnabled || false}
                onChange={(e) => onUpdate({
                  richAttrs: {
                    ...firstNote.richAttrs,
                    markdownEnabled: e.target.checked
                  }
                })}
                style={{ marginRight: 8 }}
              />
              Enable Markdown Formatting
            </label>
            {firstNote.richAttrs?.markdownEnabled && (
              <div style={{
                marginTop: 8,
                fontSize: 11,
                color: '#999',
                background: '#2a2a2a',
                padding: 8,
                borderRadius: 4,
                border: '1px solid #444'
              }}>
                <div style={{ marginBottom: 4, fontWeight: 'bold' }}>Markdown syntax:</div>
                <div>• **bold** → <strong>bold</strong></div>
                <div>• *italic* → <em>italic</em></div>
                <div>• `code` → <code>code</code></div>
                <div>• ~~strikethrough~~ → <s>strikethrough</s></div>
                {hasMarkdownSyntax(firstNote.text) && (
                  <div style={{ marginTop: 8, color: '#4aa3ff' }}>
                    ✓ Markdown detected in text
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dimensions */}
      <div>
        <label style={{ display: 'block', fontSize: 12, marginBottom: 8, color: '#ccc' }}>
          Dimensions
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <label style={{ fontSize: 11, color: '#999' }}>Width</label>
            <input
              type="number"
              value={Math.round(firstNote.frame.w)}
              onChange={(e) => onUpdate({ 
                frame: { ...firstNote.frame, w: parseInt(e.target.value) || 0 }
              })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#999' }}>Height</label>
            <input
              type="number"
              value={Math.round(firstNote.frame.h)}
              onChange={(e) => onUpdate({ 
                frame: { ...firstNote.frame, h: parseInt(e.target.value) || 0 }
              })}
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* Position */}
      <div>
        <label style={{ display: 'block', fontSize: 12, marginBottom: 8, color: '#ccc' }}>
          Position
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <label style={{ fontSize: 11, color: '#999' }}>X</label>
            <input
              type="number"
              value={Math.round(firstNote.frame.x)}
              onChange={(e) => onUpdate({ 
                frame: { ...firstNote.frame, x: parseInt(e.target.value) || 0 }
              })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#999' }}>Y</label>
            <input
              type="number"
              value={Math.round(firstNote.frame.y)}
              onChange={(e) => onUpdate({ 
                frame: { ...firstNote.frame, y: parseInt(e.target.value) || 0 }
              })}
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* Fade Toggle */}
      <div>
        <label style={{ display: 'flex', alignItems: 'center', fontSize: 12, color: '#ccc', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={firstNote.faded || false}
            onChange={(e) => onUpdate({ faded: e.target.checked })}
            style={{ marginRight: 8 }}
          />
          Faded (50% opacity)
        </label>
      </div>
    </div>
  )
}

function ConnectionPanel({ selectedConnections, onUpdate }: { 
  selectedConnections: Connection[]
  onUpdate?: (updates: Partial<Connection>) => void
}) {
  if (selectedConnections.length === 0) {
    return (
      <div style={{ opacity: 0.6, fontSize: 14, textAlign: 'center', marginTop: 40 }}>
        Select connections to edit properties
      </div>
    )
  }

  const firstConnection = selectedConnections[0]
  const isMultiple = selectedConnections.length > 1
  const style = firstConnection.style || {}

  const updateStyle = (styleUpdates: Partial<Connection['style']>) => {
    if (!onUpdate) return
    onUpdate({
      style: { ...style, ...styleUpdates }
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>
        {isMultiple ? `${selectedConnections.length} connections selected` : 'Connection Properties'}
      </div>

      {/* Label */}
      {!isMultiple && (
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: '#ccc' }}>
            Label
          </label>
          <input
            type="text"
            value={firstConnection.label || ''}
            onChange={(e) => onUpdate({ label: e.target.value || undefined })}
            placeholder="Enter connection label..."
            style={{
              width: '100%',
              padding: 8,
              background: '#333',
              border: '1px solid #555',
              borderRadius: 4,
              color: '#fff',
              fontSize: 12
            }}
          />
        </div>
      )}

      {/* Line Style */}
      <div>
        <label style={{ display: 'block', fontSize: 12, marginBottom: 8, color: '#ccc' }}>
          Line Style
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button
            onClick={() => updateStyle({ kind: 'solid' })}
            style={{
              ...buttonStyle,
              background: (style.kind || 'solid') === 'solid' ? '#4aa3ff' : '#333'
            }}
          >
            Solid
          </button>
          <button
            onClick={() => updateStyle({ kind: 'dotted' })}
            style={{
              ...buttonStyle,
              background: style.kind === 'dotted' ? '#4aa3ff' : '#333'
            }}
          >
            Dotted
          </button>
        </div>
      </div>

      {/* Arrows */}
      <div>
        <label style={{ display: 'block', fontSize: 12, marginBottom: 8, color: '#ccc' }}>
          Arrows
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
          <button
            onClick={() => updateStyle({ arrows: 'none' })}
            style={{
              ...smallButtonStyle,
              background: (style.arrows || 'none') === 'none' ? '#4aa3ff' : '#333'
            }}
          >
            None
          </button>
          <button
            onClick={() => updateStyle({ arrows: 'dst' })}
            style={{
              ...smallButtonStyle,
              background: style.arrows === 'dst' ? '#4aa3ff' : '#333'
            }}
          >
            End →
          </button>
          <button
            onClick={() => updateStyle({ arrows: 'src' })}
            style={{
              ...smallButtonStyle,
              background: style.arrows === 'src' ? '#4aa3ff' : '#333'
            }}
          >
            ← Start
          </button>
          <button
            onClick={() => updateStyle({ arrows: 'both' })}
            style={{
              ...smallButtonStyle,
              background: style.arrows === 'both' ? '#4aa3ff' : '#333'
            }}
          >
            ↔ Both
          </button>
        </div>
      </div>

      {/* Color */}
      <div>
        <label style={{ display: 'block', fontSize: 12, marginBottom: 8, color: '#ccc' }}>
          Color
        </label>
        <input
          type="color"
          value={style.color || '#ffffff'}
          onChange={(e) => updateStyle({ color: e.target.value })}
          style={{
            width: '100%',
            height: 32,
            padding: 0,
            border: '1px solid #555',
            borderRadius: 4,
            background: 'transparent',
            cursor: 'pointer'
          }}
        />
      </div>

      {/* Width */}
      <div>
        <label style={{ display: 'block', fontSize: 12, marginBottom: 8, color: '#ccc' }}>
          Line Width
        </label>
        <input
          type="range"
          min="1"
          max="10"
          value={style.width || 2}
          onChange={(e) => updateStyle({ width: parseInt(e.target.value) })}
          style={{
            width: '100%',
            marginBottom: 4
          }}
        />
        <div style={{ fontSize: 11, color: '#999', textAlign: 'center' }}>
          {style.width || 2}px
        </div>
      </div>
    </div>
  )
}

function DocumentPanel({ document, onChange }: { 
  document: BoardDocument
  onChange?: (doc: BoardDocument) => void 
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>
        Document Properties
      </div>

      <div>
        <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: '#ccc' }}>
          Schema Version
        </label>
        <div style={{ fontSize: 12, color: '#999', padding: 8, background: '#333', borderRadius: 4 }}>
          v{document.schemaVersion}
        </div>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: '#ccc' }}>
          Statistics
        </label>
        <div style={{ fontSize: 11, color: '#999' }}>
          <div>Notes: {document.notes.length}</div>
          <div>Connections: {document.connections.length}</div>
          <div>Shapes: {document.shapes.length}</div>
          <div>Stacks: {document.stacks.length}</div>
        </div>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: 4,
  background: '#333',
  border: '1px solid #555',
  borderRadius: 2,
  color: '#fff',
  fontSize: 11
}

const buttonStyle: React.CSSProperties = {
  padding: '6px 8px',
  border: 'none',
  borderRadius: 4,
  color: '#fff',
  fontSize: 11,
  cursor: 'pointer',
  transition: 'background-color 0.2s'
}

const smallButtonStyle: React.CSSProperties = {
  padding: '4px 6px',
  border: 'none',
  borderRadius: 3,
  color: '#fff',
  fontSize: 10,
  cursor: 'pointer',
  transition: 'background-color 0.2s'
}
