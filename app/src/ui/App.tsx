import React from 'react'
import { Canvas } from './canvas/Canvas'
import { Inspector } from './Inspector'
import { HelpOverlay } from './HelpOverlay'
import { RecentFiles } from './RecentFiles'
import { RecoveryDialog } from './RecoveryDialog'
import { AutosaveIndicator } from './AutosaveIndicator'
import type { BoardDocument } from '../model/types'
import { makeEmptyDoc } from '../state'
import { useCommandStack } from '../hooks/useCommandStack'
import { useAutosave } from '../hooks/useAutosave'
import { openDocument, openSpecificDocument, saveDocument, checkRecoveryFiles } from '../bridge/tauri'
import { exportToPNG, exportToTXT, exportToPDF, downloadFile, downloadText } from '../export/canvasExport'
import { UpdateNotesCommand, UpdateConnectionsCommand } from '../state/commands'

interface AutosaveInfo {
  original_path: string
  recovery_path: string
  timestamp: string
}

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
      { id: 'c1', srcNoteId: 'n3', dstNoteId: 'n4', style: { kind: 'dotted', arrows: 'none' }, label: 'then' },
      { id: 'c2', srcNoteId: 'n1', dstNoteId: 'n2', style: { kind: 'solid', arrows: 'dst', color: '#4aa3ff', width: 3 }, label: 'leads to' }
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
  const [currentFilePath, setCurrentFilePath] = React.useState<string | null>(null)
  const [recoveryFiles, setRecoveryFiles] = React.useState<AutosaveInfo[]>([])
  const [showRecoveryDialog, setShowRecoveryDialog] = React.useState(false)
  const [isDirty, setIsDirty] = React.useState(false)

  // Initialize autosave functionality
  const {
    checkForRecoveryFiles,
    forceAutosave
  } = useAutosave(currentDoc, currentFilePath, isDirty)

  // Check for recovery files on startup
  React.useEffect(() => {
    const checkRecovery = async () => {
      try {
        const files = await checkForRecoveryFiles()
        if (files.length > 0) {
          setRecoveryFiles(files)
          setShowRecoveryDialog(true)
        }
      } catch (error) {
        console.warn('Failed to check recovery files:', error)
      }
    }

    checkRecovery()
  }, [checkForRecoveryFiles])

  // Clear temp state when document changes via commands
  React.useEffect(() => {
    setTempDoc(null)
    setIsDirty(true) // Mark document as dirty when it changes
  }, [doc])

  const onOpen = async () => {
    try {
      const opened = await openDocument()
      setDocument(opened)
      setCurrentFilePath(null) // Reset file path since we used "Open" dialog
      setIsDirty(false)
    } catch (e) {
      console.warn('Open cancelled or failed', e)
    }
  }

  const onOpenRecentFile = async (filePath: string) => {
    try {
      const opened = await openSpecificDocument(filePath)
      setDocument(opened)
      setCurrentFilePath(filePath)
      setIsDirty(false)
    } catch (e) {
      console.warn('Failed to open recent file:', e)
    }
  }

  const onSave = async () => {
    try {
      const savedPath = await saveDocument(doc)
      setCurrentFilePath(savedPath)
      setIsDirty(false)
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

  const onExportPDF = async () => {
    try {
      const blob = await exportToPDF(doc, { format: 'pdf', scale: 2 })
      const filename = `fim-export-${Date.now()}.pdf`
      await downloadFile(blob, filename)
      console.log('PDF exported:', filename)
    } catch (e) {
      console.warn('PDF export failed', e)
    }
  }

  const handleRecovery = (recoveredDoc: BoardDocument, originalPath: string) => {
    setDocument(recoveredDoc)
    setCurrentFilePath(originalPath)
    setIsDirty(true) // Mark as dirty since it's recovered
    setShowRecoveryDialog(false)
    setRecoveryFiles([])
  }

  const handleDismissRecovery = () => {
    setShowRecoveryDialog(false)
    setRecoveryFiles([])
  }

  const handleDeleteAllRecoveryFiles = () => {
    // This would delete all recovery files
    // For now, just dismiss the dialog
    setShowRecoveryDialog(false)
    setRecoveryFiles([])
  }

  const onForceAutosave = () => {
    if (currentFilePath) {
      forceAutosave()
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
      // Ctrl/Cmd + Shift + S to force autosave
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyS') {
        e.preventDefault()
        onForceAutosave()
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
  }, [onSave, onOpen, onForceAutosave])

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', gap: 8, padding: '8px 12px', background: '#111', color: '#eee', alignItems: 'center' }}>
        <button onClick={onOpen} style={btnStyle}>Open…</button>
        <RecentFiles onOpenRecentFile={onOpenRecentFile} />
        <button onClick={onSave} style={btnStyle}>Save As…</button>
        {currentFilePath && (
          <>
            <div style={{ height: 24, width: 1, background: '#333', margin: '0 4px' }} />
            <button onClick={onForceAutosave} style={{ ...btnStyle, background: '#28a745', fontSize: '12px' }} title="Force Autosave (Ctrl+Shift+S)">
              💾 Autosave Now
            </button>
          </>
        )}
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
        <button onClick={onExportPDF} style={btnStyle}>Export PDF</button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setShowHelp(true)} style={{ ...btnStyle, background: '#333' }}>
            Help (?)
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.7, fontSize: 12 }}>
            <span>schema v{doc.schemaVersion}</span>
            {currentFilePath && (
              <>
                <span>|</span>
                <span style={{ color: isDirty ? '#ffa500' : '#4caf50' }}>
                  {isDirty ? '●' : '○'} {currentFilePath.split('/').pop() || currentFilePath}
                </span>
              </>
            )}
          </div>
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
            // Find what changed and create undo commands
            const updatedNotes = notes.filter(newNote => {
              const originalNote = currentDoc.notes.find(n => n.id === newNote.id)
              return originalNote && JSON.stringify(originalNote) !== JSON.stringify(newNote)
            })

            if (updatedNotes.length > 0) {
              const updatedIds = updatedNotes.map(n => n.id)
              const updates = updatedNotes[0] // Get the updates from first note
              const originalNote = currentDoc.notes.find(n => n.id === updatedIds[0])!

              // Calculate the updates by comparing properties
              const calculatedUpdates: Partial<BoardDocument['notes'][0]> = {}
              if (updates.text !== originalNote.text) calculatedUpdates.text = updates.text
              if (updates.frame?.x !== originalNote.frame.x) calculatedUpdates.frame = { ...originalNote.frame, x: updates.frame!.x }
              if (updates.frame?.y !== originalNote.frame.y) calculatedUpdates.frame = { ...originalNote.frame, y: updates.frame!.y }
              if (updates.frame?.w !== originalNote.frame.w) calculatedUpdates.frame = { ...originalNote.frame, w: updates.frame!.w }
              if (updates.frame?.h !== originalNote.frame.h) calculatedUpdates.frame = { ...originalNote.frame, h: updates.frame!.h }
              if (updates.faded !== originalNote.faded) calculatedUpdates.faded = updates.faded

              const previousStates = updatedIds.map(id => currentDoc.notes.find(n => n.id === id)!).filter(Boolean)
              executeCommand(new UpdateNotesCommand(updatedIds, calculatedUpdates, previousStates))
            }
          }}
          onConnectionsChange={(connections) => {
            // Find what changed and create undo commands
            const updatedConnections = connections.filter(newConn => {
              const originalConn = currentDoc.connections.find(c => c.id === newConn.id)
              return originalConn && JSON.stringify(originalConn) !== JSON.stringify(newConn)
            })

            if (updatedConnections.length > 0) {
              const updatedIds = updatedConnections.map(c => c.id)
              const updates = updatedConnections[0] // Get the updates from first connection
              const originalConnection = currentDoc.connections.find(c => c.id === updatedIds[0])!

              // Calculate the updates by comparing properties
              const calculatedUpdates: Partial<BoardDocument['connections'][0]> = {}
              if (JSON.stringify(updates.style) !== JSON.stringify(originalConnection.style)) {
                calculatedUpdates.style = updates.style
              }

              const previousStates = updatedIds.map(id => currentDoc.connections.find(c => c.id === id)!).filter(Boolean)
              executeCommand(new UpdateConnectionsCommand(updatedIds, calculatedUpdates, previousStates))
            }
          }}
          onDocumentChange={setDocument}
        />
      </div>
      <HelpOverlay isVisible={showHelp} onClose={() => setShowHelp(false)} />
      <AutosaveIndicator />
      {showRecoveryDialog && (
        <RecoveryDialog
          recoveryFiles={recoveryFiles}
          onRecover={handleRecovery}
          onDismiss={handleDismissRecovery}
          onDeleteAll={handleDeleteAllRecoveryFiles}
        />
      )}
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
