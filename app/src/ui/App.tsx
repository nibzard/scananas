import React from 'react'
import { Canvas } from './canvas/Canvas'
import type { BoardDocument } from '../model/types'
import { makeEmptyDoc } from '../state'
import { invoke } from '../bridge/tauri'

export function App() {
  const [doc, setDoc] = React.useState<BoardDocument>(() => ({
    ...makeEmptyDoc(),
    notes: [
      { id: 'n1', text: '✨ Double-click empty space to create notes', frame: { x: 100, y: 100, w: 240, h: 80 } },
      { id: 'n2', text: '🖱️ Drag notes to move • Space+drag to pan', frame: { x: 380, y: 140, w: 260, h: 80 } },
      { id: 'n3', text: '⌨️ Select note → Enter to edit • Esc to finish', frame: { x: 150, y: 240, w: 280, h: 80 } },
      { id: 'n4', text: '🔗 Alt+drag from note to note = connection', frame: { x: 480, y: 280, w: 250, h: 80 } },
      { id: 'n5', text: '🗑️ Select notes → Delete/Backspace to remove', frame: { x: 220, y: 380, w: 280, h: 80 } },
    ],
    connections: [
      { id: 'c1', srcNoteId: 'n3', dstNoteId: 'n4', style: { kind: 'dotted', arrows: 'none' } }
    ]
  }))
  const [selection, setSelection] = React.useState<string[]>([])

  const onOpen = async () => {
    try {
      const opened = await invoke<BoardDocument>('open_document')
      setDoc(opened)
    } catch (e) {
      console.warn('Open cancelled or failed', e)
    }
  }

  const onSave = async () => {
    try {
      await invoke<string>('save_document', { args: { doc } })
    } catch (e) {
      console.warn('Save cancelled or failed', e)
    }
  }

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', gap: 8, padding: '8px 12px', background: '#111', color: '#eee', alignItems: 'center' }}>
        <button onClick={onOpen} style={btnStyle}>Open…</button>
        <button onClick={onSave} style={btnStyle}>Save As…</button>
        <div style={{ marginLeft: 'auto', opacity: 0.7, fontSize: 12 }}>schema v{doc.schemaVersion}</div>
      </div>
      <div style={{ flex: 1 }}>
        <Canvas 
          notes={doc.notes} 
          connections={doc.connections}
          selectedIds={selection} 
          onSelectionChange={setSelection}
          onNotesChange={(notes) => setDoc(prev => ({ ...prev, notes }))}
          onConnectionsChange={(connections) => setDoc(prev => ({ ...prev, connections }))}
        />
      </div>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  background: '#1f6feb',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '6px 10px',
  cursor: 'pointer',
}
