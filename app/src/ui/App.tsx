import React from 'react'
import { Canvas } from './canvas/Canvas'
import { Inspector } from './Inspector'
import { HelpOverlay } from './HelpOverlay'
import { SearchDialog } from './SearchDialog'
import { RecentFiles } from './RecentFiles'
import { RecoveryDialog } from './RecoveryDialog'
import { AutosaveIndicator } from './AutosaveIndicator'
import type { BoardDocument, BackgroundShape } from '../model/types'
import { makeEmptyDoc } from '../state'
import { useCommandStack } from '../hooks/useCommandStack'
import { useAutosave } from '../hooks/useAutosave'
import { openDocument, openSpecificDocument, saveDocument, checkRecoveryFiles, exportDocumentAsText, exportDocumentAsPNG, savePngToFile } from '../bridge/tauri'
import { exportToPNG, exportToTXT, exportToPDF, exportToRTF, exportToOPML, downloadFile, downloadText } from '../export/canvasExport'
import { UpdateNotesCommand, UpdateConnectionsCommand, CreateShapesCommand, UpdateShapesCommand, SearchCommand } from '../state/commands'
import { SearchResult, findConnectedCluster } from '../utils/search'

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
  const [showSearch, setShowSearch] = React.useState(false)
  const [currentFilePath, setCurrentFilePath] = React.useState<string | null>(null)
  const [recoveryFiles, setRecoveryFiles] = React.useState<AutosaveInfo[]>([])
  const [showRecoveryDialog, setShowRecoveryDialog] = React.useState(false)
  const [isDirty, setIsDirty] = React.useState(false)
  const [textOrdering, setTextOrdering] = React.useState<'spatial' | 'connections' | 'hierarchical'>('spatial')
  const [pdfPageSize, setPdfPageSize] = React.useState<'a3' | 'a4' | 'a5' | 'letter' | 'legal'>('a4')
  const [pdfOrientation, setPdfOrientation] = React.useState<'auto' | 'portrait' | 'landscape'>('auto')
  const [pngDPI, setPngDPI] = React.useState<1 | 2 | 3>(2)

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
      // Get file path from native dialog
      const filePath = await exportDocumentAsPNG(pngDPI)

      // Generate PNG data using existing export function
      const blob = await exportToPNG(doc, { format: 'png', scale: pngDPI })

      // Convert blob to Uint8Array
      const arrayBuffer = await blob.arrayBuffer()
      const pngData = new Uint8Array(arrayBuffer)

      // Save PNG data to file using Tauri
      await savePngToFile(filePath, pngData)

      console.log('PNG exported:', filePath, `at ${pngDPI}x DPI`)
    } catch (e) {
      console.warn('PNG export failed', e)
    }
  }

  const onExportTXT = async (ordering = 'spatial') => {
    try {
      const savedPath = await exportDocumentAsText(doc, 'txt', ordering)
      console.log('TXT exported:', savedPath)
    } catch (e) {
      console.warn('TXT export failed', e)
    }
  }

  const onExportRTF = async (ordering = 'spatial') => {
    try {
      const savedPath = await exportDocumentAsText(doc, 'rtf', ordering)
      console.log('RTF exported:', savedPath)
    } catch (e) {
      console.warn('RTF export failed', e)
    }
  }

  const onExportOPML = async (ordering = 'spatial') => {
    try {
      const savedPath = await exportDocumentAsText(doc, 'opml', ordering)
      console.log('OPML exported:', savedPath)
    } catch (e) {
      console.warn('OPML export failed', e)
    }
  }

  const onCreateShape = () => {
    const newShape = {
      id: `shape_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      frame: { x: 200, y: 200, w: 200, h: 150 },
      radius: 8,
      label: 'Background Shape'
    }
    executeCommand(new CreateShapesCommand([newShape]))
    setSelection([newShape.id])
  }

  const onExportPDF = async () => {
    try {
      const blob = await exportToPDF(doc, {
        format: 'pdf',
        pageSize: pdfPageSize,
        orientation: pdfOrientation,
        quality: 'high',
        includeFaded: true,
        margin: 50
      })
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

  // Search handlers
  const handleSearchResultSelect = (result: SearchResult) => {
    setSelection([result.id])

    // Pan camera to the result position
    if (result.position) {
      // This will need to be implemented in the Canvas component
      // For now, just selecting the item
    }
  }

  const handleSearchMultiSelect = (resultIds: string[]) => {
    setSelection(resultIds)
  }

  // Global keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if we're in an input field
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return
      }

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
      // Ctrl/Cmd + F to search
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyF') {
        e.preventDefault()
        setShowSearch(true)
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
        <button onClick={onCreateShape} style={btnStyle} title="Create Background Shape">
          ⬜ Shape
        </button>
        <div style={{ height: 24, width: 1, background: '#333', margin: '0 4px' }} />
        <button onClick={onExportPNG} style={btnStyle}>Export PNG</button>
        <select
          value={pngDPI}
          onChange={(e) => setPngDPI(parseInt(e.target.value) as 1 | 2 | 3)}
          style={{
            background: '#222',
            color: '#eee',
            border: '1px solid #555',
            padding: '2px 6px',
            fontSize: '12px',
            borderRadius: '3px',
            marginRight: '4px'
          }}
          title="PNG export DPI"
        >
          <option value="1">1x DPI</option>
          <option value="2">2x DPI</option>
          <option value="3">3x DPI</option>
        </select>
        <button onClick={onExportPDF} style={btnStyle}>Export PDF</button>
        <select
          value={pdfPageSize}
          onChange={(e) => setPdfPageSize(e.target.value as 'a3' | 'a4' | 'a5' | 'letter' | 'legal')}
          style={{
            background: '#222',
            color: '#eee',
            border: '1px solid #555',
            padding: '2px 6px',
            fontSize: '12px',
            borderRadius: '3px',
            marginRight: '4px'
          }}
          title="PDF page size"
        >
          <option value="a4">A4</option>
          <option value="a3">A3</option>
          <option value="a5">A5</option>
          <option value="letter">Letter</option>
          <option value="legal">Legal</option>
        </select>
        <select
          value={pdfOrientation}
          onChange={(e) => setPdfOrientation(e.target.value as 'auto' | 'portrait' | 'landscape')}
          style={{
            background: '#222',
            color: '#eee',
            border: '1px solid #555',
            padding: '2px 6px',
            fontSize: '12px',
            borderRadius: '3px'
          }}
          title="PDF orientation"
        >
          <option value="auto">Auto</option>
          <option value="portrait">Portrait</option>
          <option value="landscape">Landscape</option>
        </select>
        <div style={{ height: 24, width: 1, background: '#333', margin: '0 4px' }} />
        <select
          value={textOrdering}
          onChange={(e) => setTextOrdering(e.target.value as 'spatial' | 'connections' | 'hierarchical')}
          style={{
            background: '#222',
            color: '#eee',
            border: '1px solid #555',
            padding: '2px 6px',
            fontSize: '12px',
            borderRadius: '3px'
          }}
          title="Text ordering heuristic"
        >
          <option value="spatial">Spatial Order</option>
          <option value="connections">Connection Order</option>
          <option value="hierarchical">Hierarchical Order</option>
        </select>
        <button onClick={() => onExportTXT(textOrdering)} style={btnStyle}>Export TXT</button>
        <button onClick={() => onExportRTF(textOrdering)} style={btnStyle}>Export RTF</button>
        <button onClick={() => onExportOPML(textOrdering)} style={btnStyle}>Export OPML</button>
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
            shapes={currentDoc.shapes}
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
            onShapesChange={(shapes) => {
              // Update temporary state for continuous operations
              setTempDoc(prev => prev ? { ...prev, shapes } : { ...doc, shapes })
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
          shapes={currentDoc.shapes}
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
          onShapesChange={(shapes) => {
            // Find what changed and create undo commands
            const updatedShapes = shapes.filter(newShape => {
              const originalShape = currentDoc.shapes.find(s => s.id === newShape.id)
              return originalShape && JSON.stringify(originalShape) !== JSON.stringify(newShape)
            })

            if (updatedShapes.length > 0) {
              const updatedIds = updatedShapes.map(s => s.id)
              const updates = updatedShapes[0] // Get the updates from first shape
              const originalShape = currentDoc.shapes.find(s => s.id === updatedIds[0])!

              // Calculate the updates by comparing properties
              const calculatedUpdates: Partial<BackgroundShape> = {}
              if (updates.label !== originalShape.label) calculatedUpdates.label = updates.label
              if (updates.radius !== originalShape.radius) calculatedUpdates.radius = updates.radius
              if (updates.magnetic !== originalShape.magnetic) calculatedUpdates.magnetic = updates.magnetic
              if (JSON.stringify(updates.frame) !== JSON.stringify(originalShape.frame)) {
                calculatedUpdates.frame = updates.frame
              }

              const previousStates = updatedIds.map(id => currentDoc.shapes.find(s => s.id === id)!).filter(Boolean)
              executeCommand(new UpdateShapesCommand(updatedIds, calculatedUpdates, previousStates))
            }
          }}
          onDocumentChange={setDocument}
        />
      </div>
      <HelpOverlay isVisible={showHelp} onClose={() => setShowHelp(false)} />
      <SearchDialog
        isVisible={showSearch}
        onClose={() => setShowSearch(false)}
        notes={currentDoc.notes}
        connections={currentDoc.connections}
        onResultSelect={handleSearchResultSelect}
        onMultiSelect={handleSearchMultiSelect}
      />
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
