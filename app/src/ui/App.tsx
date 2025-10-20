import React from 'react'
import { Canvas } from './canvas/Canvas'
import { Inspector } from './Inspector'
import { HelpOverlay } from './HelpOverlay'
import type { BoardDocument } from '../model/types'
import { makeEmptyDoc } from '../state'
import { useCommandStack } from '../hooks/useCommandStack'
import { invoke } from '../bridge/tauri'
import { exportToPNG, exportToTXT, downloadFile, downloadText } from '../export/canvasExport'

export function App() {
  const initialDoc: BoardDocument = React.useMemo(() => ({
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
  }), [])

  const {
    document: doc,
    executeCommand,
    undo,
    redo,
    setDocument,
    canUndo,
    canRedo,
    undoDescription,
    redoDescription
  } = useCommandStack(initialDoc)

  // Temporary state for continuous operations (like dragging)
  const [tempDoc, setTempDoc] = React.useState<BoardDocument | null>(null)
  const currentDoc = tempDoc || doc

  const [selection, setSelection] = React.useState<string[]>([])
  const [showHelp, setShowHelp] = React.useState(false)

  // Clear temp state when document changes via commands
  React.useEffect(() => {
    setTempDoc(null)
  }, [doc])

  const onOpen = async () => {
    try {
      const opened = await invoke<BoardDocument>('open_document')
      setDocument(opened)
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

  const onExportPNG = async () => {
    try {
      const blob = await exportToPNG(doc, { format: 'png', scale: 2 })
      const filename = `fim-export-${Date.now()}.png`
      await downloadFile(blob, filename)
      console.log('PNG exported:', filename)
    } catch (e) {
      console.warn('PNG export failed', e)
    }
  }

  const onExportTXT = async () => {
    try {
      const content = exportToTXT(doc)
      const filename = `fim-export-${Date.now()}.txt`
      downloadText(content, filename)
      console.log('TXT exported:', filename)
    } catch (e) {
      console.warn('TXT export failed', e)
    }
  }

  // Global keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
        e.preventDefault()
        onSave()
      }
      // Ctrl/Cmd + O to open
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyO') {
        e.preventDefault()
        onOpen()
      }
      // ? or F1 for help
      if (e.code === 'Slash' && e.shiftKey) { // ? key
        e.preventDefault()
        setShowHelp(true)
      }
      if (e.code === 'F1') {
        e.preventDefault()
        setShowHelp(true)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onSave, onOpen])

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', gap: 8, padding: '8px 12px', background: '#111', color: '#eee', alignItems: 'center' }}>
        <button onClick={onOpen} style={btnStyle}>Open…</button>
        <button onClick={onSave} style={btnStyle}>Save As…</button>
        <div style={{ height: 24, width: 1, background: '#333', margin: '0 4px' }} />
        <button onClick={undo} disabled={!canUndo} style={{ ...btnStyle, opacity: canUndo ? 1 : 0.5 }} title={`Undo ${undoDescription || ''} (Ctrl+Z)`}>
          ↶ Undo
        </button>
        <button onClick={redo} disabled={!canRedo} style={{ ...btnStyle, opacity: canRedo ? 1 : 0.5 }} title={`Redo ${redoDescription || ''} (Ctrl+Shift+Z)`}>
          ↷ Redo
        </button>
        <div style={{ height: 24, width: 1, background: '#333', margin: '0 4px' }} />
        <button onClick={onExportPNG} style={btnStyle}>Export PNG</button>
        <button onClick={onExportTXT} style={btnStyle}>Export TXT</button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setShowHelp(true)} style={{ ...btnStyle, background: '#333' }}>
            Help (?)
          </button>
          <div style={{ opacity: 0.7, fontSize: 12 }}>schema v{doc.schemaVersion}</div>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex' }}>
        <div style={{ flex: 1 }}>
          <Canvas
            notes={currentDoc.notes}
            connections={currentDoc.connections}
            selectedIds={selection}
            onSelectionChange={setSelection}
            onExecuteCommand={executeCommand}
            onNotesChange={(notes) => {
              // Update temporary state for continuous operations
              setTempDoc(prev => prev ? { ...prev, notes } : { ...doc, notes })
            }}
            onConnectionsChange={(connections) => {
              // Update temporary state for continuous operations
              setTempDoc(prev => prev ? { ...prev, connections } : { ...doc, connections })
            }}
            onDragEnd={() => {
              // When drag ends, clear the temporary state
              setTempDoc(null)
            }}
          />
        </div>
        <Inspector
          selectedIds={selection}
          notes={currentDoc.notes}
          connections={currentDoc.connections}
          document={currentDoc}
          onNotesChange={(notes) => {
            // TODO: Convert Inspector changes to commands
            console.warn('Inspector onNotesChange called - needs command integration')
          }}
          onConnectionsChange={(connections) => {
            // TODO: Convert Inspector changes to commands
            console.warn('Inspector onConnectionsChange called - needs command integration')
          }}
          onDocumentChange={setDocument}
        />
      </div>
      <HelpOverlay isVisible={showHelp} onClose={() => setShowHelp(false)} />
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
