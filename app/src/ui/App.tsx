import React from 'react'
import { Canvas } from './canvas/Canvas'
import type { BoardDocument } from '../model/types'
import { makeEmptyDoc } from '../state'
import { invoke } from '../bridge/tauri'

export function App() {
  const [doc, setDoc] = React.useState<BoardDocument>(() => ({
    ...makeEmptyDoc(),
    notes: [
      { id: 'n1', text: 'Double-click to add notes (soon)', frame: { x: 100, y: 100, w: 220, h: 90 } },
      { id: 'n2', text: 'Pan: drag • Zoom: wheel', frame: { x: 420, y: 240, w: 220, h: 90 } },
      { id: 'n3', text: 'Zero-latency feel target', frame: { x: 260, y: 420, w: 200, h: 72 }, faded: true },
    ],
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
        <Canvas notes={doc.notes} selectedIds={selection} onSelectionChange={setSelection} />
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
