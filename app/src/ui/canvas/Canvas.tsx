import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { Note, Rect, Point, Connection, BackgroundShape } from '../../model/types'
import type { Command } from '../../state/commands'
import { parseMarkdown, type MarkdownSegment } from '../../utils/markdown'
import { findConnectedCluster } from '../../utils/search'
import {
  CreateNotesCommand,
  DeleteNotesCommand,
  MoveNotesCommand,
  EditNoteTextCommand,
  ResizeNoteCommand,
  CreateConnectionCommand,
  DeleteConnectionCommand,
  UpdateNotesCommand,
  UpdateConnectionsCommand,
  UpdateConnectionEndpointsCommand,
  InsertNoteOnConnectionCommand,
  CreateShapesCommand,
  DeleteShapesCommand,
  MoveShapesCommand,
  ResizeShapesCommand,
  UpdateShapesCommand,
  MagneticMoveCommand
} from '../../state/commands'

type Props = {
  notes: Note[]
  connections?: Connection[]
  shapes?: BackgroundShape[]
  selectedIds?: string[]
  onSelectionChange?: (ids: string[]) => void
  onExecuteCommand?: (command: Command) => void
  // For continuous operations like dragging
  onNotesChange?: (notes: Note[]) => void
  onConnectionsChange?: (connections: Connection[]) => void
  onShapesChange?: (shapes: BackgroundShape[]) => void
  onDragEnd?: () => void
  background?: string
}

type Transform = {
  scale: number
  tx: number
  ty: number
}

function applyTransform(t: Transform, p: Point): Point {
  return { x: p.x * t.scale + t.tx, y: p.y * t.scale + t.ty }
}

function invTransform(t: Transform, p: Point): Point {
  const s = 1 / t.scale
  return { x: (p.x - t.tx) * s, y: (p.y - t.ty) * s }
}

function rectToScreen(t: Transform, r: Rect) {
  const topLeft = applyTransform(t, r)
  return { x: topLeft.x, y: topLeft.y, w: r.w * t.scale, h: r.h * t.scale }
}

export function Canvas({ notes, connections = [], shapes = [], selectedIds = [], onSelectionChange, onExecuteCommand, onNotesChange, onConnectionsChange, onShapesChange, onDragEnd, background = '#202124' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [transform, setTransform] = useState<Transform>({ scale: 1, tx: 0, ty: 0 })
  const [panning, setPanning] = useState(false)
  const [spacePan, setSpacePan] = useState(false)
  const panStart = useRef<Point | null>(null)
  const panStartTxTy = useRef<{ tx: number; ty: number }>({ tx: 0, ty: 0 })
  const [marquee, setMarquee] = useState<null | { start: Point; end: Point; subtract: boolean }>(null)
  const [dragging, setDragging] = useState<{
    type: 'move' | 'connect' | 'resize' | 'move-connection-endpoint',
    noteIds: string[],
    startWorld: Point,
    startFrames: Map<string, Rect>,
    sourceNoteId?: string,
    resizeHandle?: 'se' | 'e' | 's',
    connectionId?: string,
    endpointType?: 'source' | 'destination',
    originalConnection?: Connection
  } | null>(null)
  const [editing, setEditing] = useState<{ noteId: string, text: string } | null>(null)
  const [editingConnection, setEditingConnection] = useState<{ connectionId: string, text: string, position: Point } | null>(null)
  const [cursor, setCursor] = useState<string>('default')
  const [movementMode, setMovementMode] = useState<boolean>(false)
  const [magneticActive, setMagneticActive] = useState<boolean>(false)
  const [magneticAffectedNotes, setMagneticAffectedNotes] = useState<string[]>([])
  const [magneticGroupedNotes, setMagneticGroupedNotes] = useState<string[]>([]) // New: Track overlapped notes for group translation
  const lastClickTime = useRef<number>(0)
  const lastClickPos = useRef<Point>({ x: 0, y: 0 })

  // For continuous movement tracking
  const pressedKeys = useRef<Set<string>>(new Set())
  const movementInterval = useRef<number | null>(null)

  // For undo/redo support during continuous operations
  const initialNoteStates = useRef<Map<string, Note> | null>(null)
  const initialConnectionStates = useRef<Map<string, Connection> | null>(null)
  const continuousOperationType = useRef<'move' | 'resize' | 'movement-mode' | null>(null)

  // Continuous movement function
  const performContinuousMovement = () => {
    if (!movementMode || selectedIds.length === 0 || !onNotesChange) return

    // Track initial state for undo/redo when movement mode starts
    if (continuousOperationType.current !== 'movement-mode') {
      continuousOperationType.current = 'movement-mode'
      initialNoteStates.current = new Map()
      selectedIds.forEach(id => {
        const note = notes.find(n => n.id === id)
        if (note) {
          initialNoteStates.current!.set(id, { ...note })
        }
      })
    }

    let dx = 0, dy = 0
    const moveDistance = 2 // Base movement speed for continuous mode

    if (pressedKeys.current.has('ArrowLeft')) dx = -moveDistance
    if (pressedKeys.current.has('ArrowRight')) dx = moveDistance
    if (pressedKeys.current.has('ArrowUp')) dy = -moveDistance
    if (pressedKeys.current.has('ArrowDown')) dy = moveDistance

    if (dx !== 0 || dy !== 0) {
      const updatedNotes = notes.map(note => {
        if (selectedIds.includes(note.id)) {
          return {
            ...note,
            frame: {
              ...note.frame,
              x: note.frame.x + dx,
              y: note.frame.y + dy
            }
          }
        }
        return note
      })
      onNotesChange(updatedNotes)
    }
  }

  const createNote = (worldPos: Point, text: string = 'New note') => {
    if (!onExecuteCommand) return
    const newNote: Note = {
      id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      text,
      frame: {
        x: worldPos.x,
        y: worldPos.y,
        w: 200,
        h: 80
      }
    }
    onExecuteCommand(new CreateNotesCommand([newNote]))
    onSelectionChange?.([newNote.id])
  }

  const startEditing = (noteId: string) => {
    const note = notes.find(n => n.id === noteId)
    if (note) {
      setEditing({ noteId, text: note.text })
    }
  }

  const finishEditing = (save: boolean = true) => {
    if (!editing) return

    if (save && onExecuteCommand) {
      const note = notes.find(n => n.id === editing.noteId)
      if (note && note.text !== editing.text) {
        onExecuteCommand(new EditNoteTextCommand(editing.noteId, note.text, editing.text))
      }
    }
    setEditing(null)
  }

  const startEditingConnectionLabel = (connectionId: string) => {
    const connection = connections.find(c => c.id === connectionId)
    if (!connection) return

    const srcNote = notes.find(n => n.id === connection.srcNoteId)
    const dstNote = notes.find(n => n.id === connection.dstNoteId)
    if (!srcNote || !dstNote) return

    const srcCenter = {
      x: srcNote.frame.x + srcNote.frame.w / 2,
      y: srcNote.frame.y + srcNote.frame.h / 2
    }
    const dstCenter = {
      x: dstNote.frame.x + dstNote.frame.w / 2,
      y: dstNote.frame.y + dstNote.frame.h / 2
    }

    const midPoint = {
      x: (srcCenter.x + dstCenter.x) / 2,
      y: (srcCenter.y + dstCenter.y) / 2
    }

    setEditingConnection({
      connectionId,
      text: connection.label || '',
      position: midPoint
    })
  }

  const finishEditingConnectionLabel = (save: boolean = true) => {
    if (!editingConnection) return

    if (save && onExecuteCommand) {
      const connection = connections.find(c => c.id === editingConnection.connectionId)
      if (connection) {
        const oldLabel = connection.label || ''
        const newLabel = editingConnection.text.trim()

        if (oldLabel !== newLabel) {
          const updatedConnections = connections.map(c =>
            c.id === editingConnection.connectionId
              ? { ...c, label: newLabel || undefined }
              : c
          )
          if (onConnectionsChange) {
            onConnectionsChange(updatedConnections)
          }

          // Create undo command
          const previousStates = [connection]
          const updates = { label: newLabel || undefined }
          onExecuteCommand(new UpdateConnectionsCommand([editingConnection.connectionId], updates, previousStates))
        }
      }
    }
    setEditingConnection(null)
  }

  const insertNoteOnConnection = (connection: Connection, clickWorldPos: Point) => {
    if (!onExecuteCommand) return

    const srcNote = notes.find(n => n.id === connection.srcNoteId)
    const dstNote = notes.find(n => n.id === connection.dstNoteId)
    if (!srcNote || !dstNote) return

    const srcCenter = {
      x: srcNote.frame.x + srcNote.frame.w / 2,
      y: srcNote.frame.y + srcNote.frame.h / 2
    }
    const dstCenter = {
      x: dstNote.frame.x + dstNote.frame.w / 2,
      y: dstNote.frame.y + dstNote.frame.h / 2
    }

    // Create new note at the click position (or midpoint if no specific click position)
    const newNotePosition = clickWorldPos || {
      x: (srcCenter.x + dstCenter.x) / 2,
      y: (srcCenter.y + dstCenter.y) / 2
    }

    const newNote: Note = {
      id: `n${Date.now()}`,
      text: '',
      frame: {
        x: newNotePosition.x - 60, // Center the note (120px wide) on the click point
        y: newNotePosition.y - 25, // Center the note (50px tall) on the click point
        w: 120,
        h: 50
      },
      faded: false
    }

    // Create two new connections
    const firstNewConnection: Connection = {
      id: `c${Date.now()}-1`,
      srcNoteId: connection.srcNoteId,
      dstNoteId: newNote.id,
      style: connection.style,
      label: connection.label?.substring(0, Math.floor(connection.label.length / 2)) || undefined
    }

    const secondNewConnection: Connection = {
      id: `c${Date.now()}-2`,
      srcNoteId: newNote.id,
      dstNoteId: connection.dstNoteId,
      style: connection.style,
      label: connection.label?.substring(Math.floor(connection.label.length / 2)) || undefined
    }

    // Execute the command
    onExecuteCommand(new InsertNoteOnConnectionCommand(
      connection,
      newNote,
      firstNewConnection,
      secondNewConnection
    ))
  }

  const deleteSelectedNotes = () => {
    if (selectedIds.length === 0 || !onExecuteCommand) return

    const deletedNotes = notes.filter(note => selectedIds.includes(note.id))
    const deletedConnections = connections.filter(conn =>
      selectedIds.includes(conn.srcNoteId) || selectedIds.includes(conn.dstNoteId)
    )
    const deletedShapes = shapes.filter(shape => selectedIds.includes(shape.id))

    // Create appropriate delete commands
    if (deletedNotes.length > 0) {
      onExecuteCommand(new DeleteNotesCommand(deletedNotes, deletedConnections))
    }
    if (deletedShapes.length > 0) {
      onExecuteCommand(new DeleteShapesCommand(deletedShapes))
    }

    onSelectionChange?.([])
  }

  const createConnection = (srcNoteId: string, dstNoteId: string) => {
    if (!onExecuteCommand || srcNoteId === dstNoteId) return

    // Check if connection already exists
    const exists = connections.some(c =>
      (c.srcNoteId === srcNoteId && c.dstNoteId === dstNoteId) ||
      (c.srcNoteId === dstNoteId && c.dstNoteId === srcNoteId)
    )
    if (exists) return

    const newConnection: Connection = {
      id: `conn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      srcNoteId,
      dstNoteId,
      style: { kind: 'dotted', arrows: 'none' }
    }
    onExecuteCommand(new CreateConnectionCommand(newConnection))
  }

  // Handle HiDPI
  const resize = () => {
    const c = canvasRef.current
    if (!c) return
    const dpr = window.devicePixelRatio || 1
    const rect = c.getBoundingClientRect()
    c.width = Math.max(1, Math.floor(rect.width * dpr))
    c.height = Math.max(1, Math.floor(rect.height * dpr))
    const ctx = c.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    draw()
  }

  useEffect(() => {
    resize()
    window.addEventListener('resize', resize)
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpacePan(true)

      // Movement mode toggle (M key)
      if (e.code === 'KeyM' && !editing && !editingConnection) {
        e.preventDefault()
        setMovementMode(prev => !prev)
        return
      }

      // Insert note on connection (I key)
      if (e.code === 'KeyI' && !editing && !editingConnection && selectedIds.length === 1) {
        e.preventDefault()

        // Check if the selected item is a connection
        const selectedConnection = connections.find(c => c.id === selectedIds[0])
        if (selectedConnection && onExecuteCommand) {
          const srcNote = notes.find(n => n.id === selectedConnection.srcNoteId)
          const dstNote = notes.find(n => n.id === selectedConnection.dstNoteId)

          if (srcNote && dstNote) {
            // Calculate midpoint for the new note
            const midX = (srcNote.frame.x + dstNote.frame.x + dstNote.frame.w) / 2
            const midY = (srcNote.frame.y + dstNote.frame.y + dstNote.frame.h) / 2

            // Create new note at midpoint
            const newNoteId = `note_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
            const newNote: Note = {
              id: newNoteId,
              text: '',
              frame: {
                x: midX - 60, // Default width/2
                y: midY - 30, // Default height/2
                w: 120,
                h: 60
              }
            }

            // Create two new connections
            const firstConnectionId = `conn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
            const secondConnectionId = `conn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

            const firstNewConnection: Connection = {
              id: firstConnectionId,
              srcNoteId: selectedConnection.srcNoteId,
              dstNoteId: newNoteId,
              style: selectedConnection.style,
              label: selectedConnection.label,
              bendPoints: selectedConnection.bendPoints
            }

            const secondNewConnection: Connection = {
              id: secondConnectionId,
              srcNoteId: newNoteId,
              dstNoteId: selectedConnection.dstNoteId,
              style: selectedConnection.style
            }

            // Execute the command
            const command = new InsertNoteOnConnectionCommand(
              selectedConnection,
              newNote,
              firstNewConnection,
              secondNewConnection
            )
            onExecuteCommand(command)

            // Update selection to the new note
            onSelectionChange?.([newNoteId])

            // Start editing the new note
            setEditing({ noteId: newNoteId, text: '' })
          }
        }
        return
      }

      // Select All (Ctrl/Cmd + A)
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyA' && !editing && !editingConnection) {
        e.preventDefault()
        const allIds = notes.map(n => n.id)
        onSelectionChange?.(allIds)
        return
      }

      // Select Connected Cluster (Ctrl/Cmd + G)
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyG' && !editing && !editingConnection) {
        e.preventDefault()
        if (selectedIds.length === 1) {
          const selectedNoteId = selectedIds[0]
          // Check if it's a note ID
          if (notes.some(n => n.id === selectedNoteId)) {
            const connectedIds = findConnectedCluster(selectedNoteId, connections || [])
            onSelectionChange?.(connectedIds)
          }
        }
        return
      }

      // Arrow key handling - different behavior in movement mode vs normal mode
      if (!editing && !editingConnection && selectedIds.length > 0 && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault()

        if (movementMode) {
          // Continuous movement mode
          if (!pressedKeys.current.has(e.code)) {
            pressedKeys.current.add(e.code)

            // Start continuous movement interval if this is the first arrow key
            if (pressedKeys.current.size === 1 && !movementInterval.current) {
              movementInterval.current = window.setInterval(performContinuousMovement, 16) // ~60 FPS
            }
          }
        } else {
          // Normal nudge mode (existing behavior)
          const nudgeDistance = e.shiftKey ? 10 : 1
          let dx = 0, dy = 0

          switch (e.code) {
            case 'ArrowLeft': dx = -nudgeDistance; break
            case 'ArrowRight': dx = nudgeDistance; break
            case 'ArrowUp': dy = -nudgeDistance; break
            case 'ArrowDown': dy = nudgeDistance; break
          }

          if (onExecuteCommand) {
            const movements = new Map<string, { dx: number; dy: number }>()
            selectedIds.forEach(id => {
              movements.set(id, { dx, dy })
            })
            onExecuteCommand(new MoveNotesCommand(movements))
          }
        }
        return
      }
      
      if (e.code === 'Enter' && !editing && selectedIds.length === 1) {
        e.preventDefault()
        startEditing(selectedIds[0])
      }
      if (e.code === 'Escape' && editing) {
        e.preventDefault()
        finishEditing(false)
      }
      if (e.code === 'Enter' && editing) {
        e.preventDefault()
        finishEditing(true)
      }
      if (e.code === 'Escape' && editingConnection) {
        e.preventDefault()
        finishEditingConnectionLabel(false)
      }
      if (e.code === 'Enter' && editingConnection) {
        e.preventDefault()
        finishEditingConnectionLabel(true)
      }
      if ((e.code === 'Delete' || e.code === 'Backspace') && !editing && !editingConnection && selectedIds.length > 0) {
        e.preventDefault()
        deleteSelectedNotes()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpacePan(false)

      // Handle arrow key release in movement mode
      if (movementMode && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        pressedKeys.current.delete(e.code)

        // Stop continuous movement when all arrow keys are released
        if (pressedKeys.current.size === 0 && movementInterval.current) {
          clearInterval(movementInterval.current)
          movementInterval.current = null

          // Create undo command for the entire movement session
          if (onExecuteCommand && continuousOperationType.current === 'movement-mode' && initialNoteStates.current) {
            const movements = new Map<string, { dx: number; dy: number }>()

            selectedIds.forEach(id => {
              const initialState = initialNoteStates.current!.get(id)
              const currentState = notes.find(n => n.id === id)

              if (initialState && currentState) {
                movements.set(id, {
                  dx: currentState.frame.x - initialState.frame.x,
                  dy: currentState.frame.y - initialState.frame.y
                })
              }
            })

            // Only create command if there was actual movement
            if (movements.size > 0 && Array.from(movements.values()).some(m => m.dx !== 0 || m.dy !== 0)) {
              onExecuteCommand(new MoveNotesCommand(movements))
            }

            // Reset tracking state
            continuousOperationType.current = null
            initialNoteStates.current = null
          }

          // Call onDragEnd to clear temporary state
          if (onDragEnd) {
            onDragEnd()
          }
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)

      // Clean up movement interval
      if (movementInterval.current) {
        clearInterval(movementInterval.current)
        movementInterval.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movementMode, selectedIds, onExecuteCommand, onDragEnd, onNotesChange, onShapesChange, notes, shapes])

  const draw = () => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')!
    const { width, height } = c.getBoundingClientRect()

    // background
    ctx.save()
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = background
    ctx.fillRect(0, 0, width, height)
    ctx.restore()

    // draw shapes (before notes for proper z-ordering)
    for (const shape of shapes) {
      const r = rectToScreen(transform, shape.frame)
      const isSelected = selectedIds.includes(shape.id)

      // Default shape styling
      ctx.fillStyle = shape.styleId ? 'rgba(200,200,200,0.3)' : 'rgba(240,240,240,0.4)'
      ctx.strokeStyle = isSelected ? '#4aa3ff' : 'rgba(0,0,0,0.3)'
      ctx.lineWidth = isSelected ? 2 : 1

      // Draw rounded rectangle for shape
      const radius = (shape.radius || 8) * transform.scale
      roundRect(ctx, r.x, r.y, r.w, r.h, radius)
      ctx.fill()
      ctx.stroke()

      // Draw shape label if it exists
      if (shape.label) {
        ctx.save()
        ctx.fillStyle = 'rgba(0,0,0,0.7)'
        ctx.font = `${14 * transform.scale}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const labelX = r.x + r.w / 2
        const labelY = r.y + 20 * transform.scale // Position label near top
        ctx.fillText(shape.label, labelX, labelY)
        ctx.restore()
      }
    }

    // draw connections
    for (const conn of connections) {
      const srcNote = notes.find(n => n.id === conn.srcNoteId)
      const dstNote = notes.find(n => n.id === conn.dstNoteId)
      if (!srcNote || !dstNote) continue

      const srcCenter = {
        x: srcNote.frame.x + srcNote.frame.w / 2,
        y: srcNote.frame.y + srcNote.frame.h / 2
      }
      const dstCenter = {
        x: dstNote.frame.x + dstNote.frame.w / 2,
        y: dstNote.frame.y + dstNote.frame.h / 2
      }
      
      const srcScreen = applyTransform(transform, srcCenter)
      const dstScreen = applyTransform(transform, dstCenter)

      const isSelected = selectedIds.includes(conn.id)
      const color = conn.style?.color || (isSelected ? 'rgba(74,163,255,0.8)' : 'rgba(255,255,255,0.6)')
      const lineWidth = (conn.style?.width || (isSelected ? 3 : 2)) * transform.scale

      ctx.strokeStyle = color
      ctx.fillStyle = color
      ctx.lineWidth = lineWidth
      ctx.setLineDash(conn.style?.kind === 'dotted' ? [5, 5] : [])
      
      // Draw the line
      ctx.beginPath()
      ctx.moveTo(srcScreen.x, srcScreen.y)
      ctx.lineTo(dstScreen.x, dstScreen.y)
      ctx.stroke()
      ctx.setLineDash([])

      // Draw connection label if it exists
      if (conn.label) {
        const midX = (srcScreen.x + dstScreen.x) / 2
        const midY = (srcScreen.y + dstScreen.y) / 2

        ctx.save()
        ctx.fillStyle = '#fff'
        ctx.strokeStyle = color
        ctx.lineWidth = 1

        // Measure text
        ctx.font = `${12 * transform.scale}px -apple-system, system-ui, sans-serif`
        const textMetrics = ctx.measureText(conn.label)
        const textWidth = textMetrics.width
        const textHeight = 12 * transform.scale
        const padding = 4 * transform.scale

        // Draw background rectangle
        ctx.fillRect(
          midX - textWidth / 2 - padding,
          midY - textHeight / 2 - padding,
          textWidth + padding * 2,
          textHeight + padding * 2
        )
        ctx.strokeRect(
          midX - textWidth / 2 - padding,
          midY - textHeight / 2 - padding,
          textWidth + padding * 2,
          textHeight + padding * 2
        )

        // Draw text
        ctx.fillStyle = '#202124'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(conn.label, midX, midY)
        ctx.restore()
      }

      // Draw arrows if specified
      const arrows = conn.style?.arrows || 'none'
      if (arrows !== 'none') {
        const arrowSize = Math.max(8, lineWidth * 2)
        const dx = dstScreen.x - srcScreen.x
        const dy = dstScreen.y - srcScreen.y
        const length = Math.sqrt(dx * dx + dy * dy)
        const unitX = dx / length
        const unitY = dy / length

        if (arrows === 'dst' || arrows === 'both') {
          // Arrow at destination
          const arrowX = dstScreen.x - unitX * arrowSize
          const arrowY = dstScreen.y - unitY * arrowSize
          const perpX = -unitY * arrowSize * 0.5
          const perpY = unitX * arrowSize * 0.5

          ctx.beginPath()
          ctx.moveTo(dstScreen.x, dstScreen.y)
          ctx.lineTo(arrowX + perpX, arrowY + perpY)
          ctx.lineTo(arrowX - perpX, arrowY - perpY)
          ctx.closePath()
          ctx.fill()
        }

        if (arrows === 'src' || arrows === 'both') {
          // Arrow at source
          const arrowX = srcScreen.x + unitX * arrowSize
          const arrowY = srcScreen.y + unitY * arrowSize
          const perpX = -unitY * arrowSize * 0.5
          const perpY = unitX * arrowSize * 0.5

          ctx.beginPath()
          ctx.moveTo(srcScreen.x, srcScreen.y)
          ctx.lineTo(arrowX + perpX, arrowY + perpY)
          ctx.lineTo(arrowX - perpX, arrowY - perpY)
          ctx.closePath()
          ctx.fill()
        }
      }

      // Draw connection endpoints (always visible for better UX)
      const endpointRadius = Math.max(4, 6 * transform.scale)

      // Source endpoint
      ctx.fillStyle = isSelected ? '#4aa3ff' : 'rgba(255,255,255,0.8)'
      ctx.strokeStyle = isSelected ? '#fff' : 'rgba(0,0,0,0.3)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(srcScreen.x, srcScreen.y, endpointRadius, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Destination endpoint
      ctx.beginPath()
      ctx.arc(dstScreen.x, dstScreen.y, endpointRadius, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }

    // draw notes
    for (const n of notes) {
      const r = rectToScreen(transform, n.frame)
      // note fill
      const isSelected = selectedIds.includes(n.id)
      const isMovementModeActive = movementMode && isSelected
      const isMagneticallyAffected = magneticActive && magneticAffectedNotes.includes(n.id)
      const isMagneticallyGrouped = magneticActive && magneticGroupedNotes.includes(n.id) // New: Check if note is overlapped/grouped

      // Enhanced visual feedback for SHP-2: Different colors for grouped vs proximity magnetic notes
      ctx.fillStyle = n.faded ? 'rgba(250,250,250,0.35)' :
                      isMovementModeActive ? 'rgba(74,163,255,0.1)' :
                      isMagneticallyGrouped ? 'rgba(220,53,69,0.15)' : // Red tint for overlapped/grouped notes
                      isMagneticallyAffected ? 'rgba(255,193,7,0.15)' : // Yellow tint for proximity magnetic notes
                      '#fff'
      ctx.strokeStyle = isMovementModeActive ? '#4aa3ff' :
                        isMagneticallyGrouped ? '#dc3545' : // Red border for grouped notes
                        isMagneticallyAffected ? '#ffc107' : // Yellow border for proximity magnetic notes
                        isSelected ? '#4aa3ff' : 'rgba(0,0,0,0.2)'
      ctx.lineWidth = isMovementModeActive ? 3 :
                      isMagneticallyGrouped ? 3 : // Thicker border for grouped notes
                      isMagneticallyAffected ? 2 :
                      isSelected ? 2 : 1
      const radius = 8
      roundRect(ctx, r.x, r.y, r.w, r.h, radius)
      ctx.fill()
      ctx.stroke()

      // text
      const pad = 8 * transform.scale
      renderMarkdownText(
        ctx,
        n,
        r.x + pad,
        r.y + pad,
        r.w - 2 * pad,
        18 * transform.scale,
        transform.scale
      )
    }

    // Draw resize handles for selected notes (only if single selection)
    if (selectedIds.length === 1) {
      const selectedNote = notes.find(n => n.id === selectedIds[0])
      if (selectedNote) {
        const r = rectToScreen(transform, selectedNote.frame)
        const handleSize = 8

        ctx.fillStyle = '#4aa3ff'
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 1

        // Southeast corner handle
        ctx.fillRect(r.x + r.w - handleSize/2, r.y + r.h - handleSize/2, handleSize, handleSize)
        ctx.strokeRect(r.x + r.w - handleSize/2, r.y + r.h - handleSize/2, handleSize, handleSize)

        // East edge handle
        ctx.fillRect(r.x + r.w - handleSize/2, r.y + r.h/2 - handleSize/2, handleSize, handleSize)
        ctx.strokeRect(r.x + r.w - handleSize/2, r.y + r.h/2 - handleSize/2, handleSize, handleSize)

        // South edge handle
        ctx.fillRect(r.x + r.w/2 - handleSize/2, r.y + r.h - handleSize/2, handleSize, handleSize)
        ctx.strokeRect(r.x + r.w/2 - handleSize/2, r.y + r.h - handleSize/2, handleSize, handleSize)
      }
    }

    // Draw resize handles for selected shapes (only if single selection)
    if (selectedIds.length === 1) {
      const selectedShape = shapes.find(s => s.id === selectedIds[0])
      if (selectedShape) {
        const r = rectToScreen(transform, selectedShape.frame)
        const handleSize = 8

        ctx.fillStyle = '#4aa3ff'
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 1

        // Southeast corner handle
        ctx.fillRect(r.x + r.w - handleSize/2, r.y + r.h - handleSize/2, handleSize, handleSize)
        ctx.strokeRect(r.x + r.w - handleSize/2, r.y + r.h - handleSize/2, handleSize, handleSize)

        // East edge handle
        ctx.fillRect(r.x + r.w - handleSize/2, r.y + r.h/2 - handleSize/2, handleSize, handleSize)
        ctx.strokeRect(r.x + r.w - handleSize/2, r.y + r.h/2 - handleSize/2, handleSize, handleSize)

        // South edge handle
        ctx.fillRect(r.x + r.w/2 - handleSize/2, r.y + r.h - handleSize/2, handleSize, handleSize)
        ctx.strokeRect(r.x + r.w/2 - handleSize/2, r.y + r.h - handleSize/2, handleSize, handleSize)
      }
    }
  }

  useEffect(() => {
    draw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, connections, shapes, transform, selectedIds, movementMode, magneticActive, magneticAffectedNotes])

  // Mouse interactions
  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = c.getBoundingClientRect()
      const cursorScreen = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      const before = invTransform(transform, cursorScreen)
      const delta = -e.deltaY
      const factor = Math.exp(delta * 0.001)
      const newScale = clamp(transform.scale * factor, 0.25, 3)
      // keep cursor anchored
      const afterScreen = applyTransform({ ...transform, scale: newScale }, before)
      const dx = cursorScreen.x - afterScreen.x
      const dy = cursorScreen.y - afterScreen.y
      setTransform(t => ({ scale: newScale, tx: t.tx + dx, ty: t.ty + dy }))
    }
    const onDown = (e: MouseEvent) => {
      const rect = c.getBoundingClientRect()
      const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      const world = invTransform(transform, pos)
      if (e.button === 1 || spacePan) {
        setPanning(true)
        panStart.current = pos
        panStartTxTy.current = { tx: transform.tx, ty: transform.ty }
        return
      }
      if (e.button !== 0) return

      // Double-click detection
      const now = Date.now()
      const timeSinceLastClick = now - lastClickTime.current
      const distFromLastClick = Math.sqrt(
        Math.pow(pos.x - lastClickPos.current.x, 2) + 
        Math.pow(pos.y - lastClickPos.current.y, 2)
      )
      
      const hit = hitTest(notes, world)
      const connectionHit = hitTestConnectionLabel(connections, notes, world, transform)
      const connectionLineHit = hitTestConnectionLine(connections, notes, world, 8 / transform.scale)
      const endpointHit = hitTestConnectionEndpoint(connections, notes, world, 12 / transform.scale)
      const shapeHit = hitTestShape(shapes, world)

      // Check for connection label double-click
      if (connectionHit && timeSinceLastClick < 500 && distFromLastClick < 10) {
        // Double-click on connection label - start editing
        startEditingConnectionLabel(connectionHit.id)
        lastClickTime.current = 0 // Reset to prevent triple-click issues
        return
      }

      // Check for connection line double-click
      if (connectionLineHit && timeSinceLastClick < 500 && distFromLastClick < 10) {
        // Double-click on connection line - insert note
        insertNoteOnConnection(connectionLineHit, world)
        lastClickTime.current = 0 // Reset to prevent triple-click issues
        return
      }

      // Handle endpoint dragging (takes priority over connection selection)
      if (endpointHit) {
        // Select the connection when endpoint is clicked
        onSelectionChange?.([endpointHit.connection.id])

        // Start endpoint dragging
        setDragging({
          type: 'move-connection-endpoint',
          noteIds: [], // No notes being moved
          startWorld: world,
          startFrames: new Map(),
          connectionId: endpointHit.connection.id,
          endpointType: endpointHit.endpointType,
          originalConnection: { ...endpointHit.connection }
        })

        lastClickTime.current = now
        lastClickPos.current = pos
        return
      }

      // Handle connection selection
      if (connectionHit) {
        // Single click on connection label - select connection
        if (e.shiftKey) {
          const set = new Set(selectedIds)
          if (set.has(connectionHit.id)) {
            set.delete(connectionHit.id)
          } else {
            set.add(connectionHit.id)
          }
          const newSelection = Array.from(set)
          onSelectionChange?.(newSelection)
        } else {
          onSelectionChange?.([connectionHit.id])
        }
        lastClickTime.current = now
        lastClickPos.current = pos
        return
      }

      // Check for resize handle hit on selected notes first
      if (selectedIds.length === 1) {
        const selectedNote = notes.find(n => n.id === selectedIds[0])
        if (selectedNote) {
          const resizeHandle = hitTestResizeHandle(selectedNote, world, 12 / transform.scale)
          if (resizeHandle) {
            // Start resize operation
            const startFrames = new Map<string, Rect>()
            startFrames.set(selectedNote.id, { ...selectedNote.frame })

            // Track initial state for undo/redo
            continuousOperationType.current = 'resize'
            initialNoteStates.current = new Map()
            initialNoteStates.current.set(selectedNote.id, { ...selectedNote })

            setDragging({
              type: 'resize',
              noteIds: [selectedNote.id],
              startWorld: world,
              startFrames,
              resizeHandle
            })
            return
          }
        }
      }
      
      if (!hit && timeSinceLastClick < 500 && distFromLastClick < 10) {
        // Double-click on empty area - create note
        createNote(world)
        lastClickTime.current = 0 // Reset to prevent triple-click issues
        return
      }

      lastClickTime.current = now
      lastClickPos.current = pos

      if (hit) {
        // Determine what to select/drag
        let dragIds: string[]
        if (selectedIds.includes(hit.id)) {
          // Clicked on already selected note - drag all selected
          dragIds = [...selectedIds]
        } else {
          // Clicked on unselected note
          if (e.shiftKey) {
            const set = new Set(selectedIds)
            set.add(hit.id)
            const newSelection = Array.from(set)
            onSelectionChange?.(newSelection)
            dragIds = [hit.id] // Only drag the newly selected note
          } else {
            onSelectionChange?.([hit.id])
            dragIds = [hit.id]
          }
        }

        // Start dragging
        const startFrames = new Map<string, Rect>()
        dragIds.forEach(id => {
          const note = notes.find(n => n.id === id)
          if (note) startFrames.set(id, { ...note.frame })
        })

        const dragType = e.altKey ? 'connect' : 'move'

        // Track initial state for undo/redo
        if (dragType === 'move') {
          continuousOperationType.current = 'move'
          initialNoteStates.current = new Map()
          dragIds.forEach(id => {
            const note = notes.find(n => n.id === id)
            if (note) {
              initialNoteStates.current!.set(id, { ...note })
            }
          })
        }

        setDragging({
          type: dragType,
          noteIds: dragIds,
          startWorld: world,
          startFrames,
          sourceNoteId: dragType === 'connect' ? hit.id : undefined
        })
      } else if (shapeHit) {
        // Handle shape selection and interaction
        let dragIds: string[]
        if (selectedIds.includes(shapeHit.id)) {
          // Clicked on already selected shape - drag all selected
          dragIds = [...selectedIds]
        } else {
          // Clicked on unselected shape
          if (e.shiftKey) {
            const set = new Set(selectedIds)
            set.add(shapeHit.id)
            const newSelection = Array.from(set)
            onSelectionChange?.(newSelection)
            dragIds = [shapeHit.id] // Only drag the newly selected shape
          } else {
            onSelectionChange?.([shapeHit.id])
            dragIds = [shapeHit.id]
          }
        }

        // Check for resize handle on selected shapes first
        if (selectedIds.length === 1 && selectedIds[0] === shapeHit.id) {
          const resizeHandle = hitTestShapeResizeHandle(shapeHit, world, 12 / transform.scale)
          if (resizeHandle) {
            // Start resize operation
            const startFrames = new Map<string, Rect>()
            startFrames.set(shapeHit.id, { ...shapeHit.frame })

            // Track initial state for undo/redo
            continuousOperationType.current = 'resize'
            initialNoteStates.current = new Map()
            // Note: reusing initialNoteStates for shapes - could be renamed to initialStates

            setDragging({
              type: 'resize',
              noteIds: [shapeHit.id],
              startWorld: world,
              startFrames,
              resizeHandle
            })
            return
          }
        }

        // Start dragging shapes
        const startFrames = new Map<string, Rect>()
        dragIds.forEach(id => {
          const shape = shapes.find(s => s.id === id)
          if (shape) startFrames.set(id, { ...shape.frame })
        })

        // Track initial state for undo/redo
        continuousOperationType.current = 'move'
        initialNoteStates.current = new Map()
        dragIds.forEach(id => {
          const shape = shapes.find(s => s.id === id)
          if (shape) {
            initialNoteStates.current!.set(id, shape as any) // Type hack for now
          }
        })

        setDragging({
          type: 'move',
          noteIds: dragIds, // Reusing noteIds field for shapes
          startWorld: world,
          startFrames
        })
      } else {
        setMarquee({ start: pos, end: pos, subtract: e.altKey })
      }
    }
    const onMove = (e: MouseEvent) => {
      const rect = c.getBoundingClientRect()
      const curr = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      const currWorld = invTransform(transform, curr)
      
      if (panning && panStart.current) {
        const dx = curr.x - panStart.current.x
        const dy = curr.y - panStart.current.y
        setTransform(t => ({ ...t, tx: panStartTxTy.current.tx + dx, ty: panStartTxTy.current.ty + dy }))
      }
      
      if (dragging) {
        if (dragging.type === 'move' && onNotesChange) {
          const dx = currWorld.x - dragging.startWorld.x
          const dy = currWorld.y - dragging.startWorld.y

          // Check if we're dragging notes or shapes
          const isDraggingNote = dragging.noteIds.some(id => notes.find(n => n.id === id))

          if (isDraggingNote) {
            const updatedNotes = notes.map(note => {
              if (dragging.noteIds.includes(note.id)) {
                const startFrame = dragging.startFrames.get(note.id)
                if (startFrame) {
                  return {
                    ...note,
                    frame: {
                      ...startFrame,
                      x: startFrame.x + dx,
                      y: startFrame.y + dy
                    }
                  }
                }
              }
              return note
            })
            onNotesChange(updatedNotes)
          }
        }

        // Handle shape dragging
        if (dragging.type === 'move' && onShapesChange) {
          const dx = currWorld.x - dragging.startWorld.x
          const dy = currWorld.y - dragging.startWorld.y

          const isDraggingShape = dragging.noteIds.some(id => shapes.find(s => s.id === id))

          if (isDraggingShape) {
            // Calculate magnetic snap offset
            let magneticDx = dx
            let magneticDy = dy

            for (const shapeId of dragging.noteIds) {
              const shape = shapes.find(s => s.id === shapeId)
              if (shape && shape.magnetic !== false) {
                const startFrame = dragging.startFrames.get(shapeId)
                if (startFrame) {
                  const currentFrame = {
                    ...startFrame,
                    x: startFrame.x + dx,
                    y: startFrame.y + dy
                  }
                  const nearbyNotes = findNotesNearShape(notes, { ...shape, frame: currentFrame })
                  const magneticSnap = calculateMagneticSnap(currentFrame, nearbyNotes)

                  if (magneticSnap.shouldSnap) {
                    magneticDx += magneticSnap.dx
                    magneticDy += magneticSnap.dy
                  }
                }
              }
            }

            // Check if magnetic behavior is active
            const hasMagneticEffect = magneticDx !== dx || magneticDy !== dy
            setMagneticActive(hasMagneticEffect)

            // Apply magnetic movement to shapes and nearby notes (enhanced for SHP-2)
            const { updatedShapes, updatedNotes, affectedNoteIds, groupedNoteIds } = applyMagneticMovement(
              shapes,
              notes,
              dragging.noteIds,
              magneticDx,
              magneticDy
            )

            onShapesChange(updatedShapes)
            setMagneticAffectedNotes(affectedNoteIds)
            setMagneticGroupedNotes(groupedNoteIds) // New: Track overlapped notes

            // Also update notes if they're affected by magnetic movement
            if (affectedNoteIds.length > 0 && onNotesChange) {
              onNotesChange(updatedNotes)
            }
          }
        } else if (dragging.type === 'resize' && dragging.resizeHandle && onNotesChange) {
          const dx = currWorld.x - dragging.startWorld.x
          const dy = currWorld.y - dragging.startWorld.y

          const updatedNotes = notes.map(note => {
            if (dragging.noteIds.includes(note.id)) {
              const startFrame = dragging.startFrames.get(note.id)
              if (startFrame) {
                let newFrame = { ...startFrame }

                if (dragging.resizeHandle === 'se') {
                  // Southeast corner - resize both width and height
                  newFrame.w = Math.max(100, startFrame.w + dx)
                  newFrame.h = Math.max(60, startFrame.h + dy)
                } else if (dragging.resizeHandle === 'e') {
                  // East edge - resize width only
                  newFrame.w = Math.max(100, startFrame.w + dx)
                } else if (dragging.resizeHandle === 's') {
                  // South edge - resize height only
                  newFrame.h = Math.max(60, startFrame.h + dy)
                }

                return { ...note, frame: newFrame }
              }
            }
            return note
          })
          onNotesChange(updatedNotes)

          // Handle shape resizing
          const isDraggingShape = dragging.noteIds.some(id => shapes.find(s => s.id === id))
          if (isDraggingShape && onShapesChange) {
            const updatedShapes = shapes.map(shape => {
              if (dragging.noteIds.includes(shape.id)) {
                const startFrame = dragging.startFrames.get(shape.id)
                if (startFrame) {
                  let newFrame = { ...startFrame }

                  if (dragging.resizeHandle === 'se') {
                    // Southeast corner - resize both width and height
                    newFrame.w = Math.max(100, startFrame.w + dx)
                    newFrame.h = Math.max(60, startFrame.h + dy)
                  } else if (dragging.resizeHandle === 'e') {
                    // East edge - resize width only
                    newFrame.w = Math.max(100, startFrame.w + dx)
                  } else if (dragging.resizeHandle === 's') {
                    // South edge - resize height only
                    newFrame.h = Math.max(60, startFrame.h + dy)
                  }

                  return { ...shape, frame: newFrame }
                }
              }
              return shape
            })
            onShapesChange(updatedShapes)
          }
        } else if (dragging.type === 'move-connection-endpoint' && dragging.connectionId && dragging.originalConnection && onConnectionsChange) {
          // Find the target note at current position
          const targetNote = hitTest(notes, currWorld)

          if (targetNote && targetNote.id !== dragging.originalConnection.id) {
            // Create updated connection with new endpoint
            const updatedConnections = connections.map(conn => {
              if (conn.id === dragging.connectionId) {
                const oldSrcNoteId = dragging.originalConnection!.srcNoteId
                const oldDstNoteId = dragging.originalConnection!.dstNoteId

                if (dragging.endpointType === 'source') {
                  // Don't allow connecting to the same note that's already the destination
                  if (targetNote.id === oldDstNoteId) return conn
                  return { ...conn, srcNoteId: targetNote.id }
                } else {
                  // Don't allow connecting to the same note that's already the source
                  if (targetNote.id === oldSrcNoteId) return conn
                  return { ...conn, dstNoteId: targetNote.id }
                }
              }
              return conn
            })
            onConnectionsChange(updatedConnections)
          }
        }
      }
      
      if (marquee) {
        setMarquee({ ...marquee, end: curr })
      }
      
      // Update cursor based on hover and movement mode
      if (!panning && !dragging) {
        let newCursor = movementMode ? 'crosshair' : 'default'

        // Check for connection endpoint hover first (highest priority)
        const endpointHit = hitTestConnectionEndpoint(connections, notes, currWorld, 12 / transform.scale)
        if (endpointHit) {
          newCursor = 'move'
        } else if (selectedIds.length === 1) {
          const selectedNote = notes.find(n => n.id === selectedIds[0])
          const selectedShape = shapes.find(s => s.id === selectedIds[0])

          if (selectedNote) {
            const handle = hitTestResizeHandle(selectedNote, currWorld, 12 / transform.scale)
            if (handle === 'se') newCursor = 'se-resize'
            else if (handle === 'e') newCursor = 'e-resize'
            else if (handle === 's') newCursor = 's-resize'
            else {
              const hit = hitTest(notes, currWorld)
              if (hit) newCursor = movementMode ? 'move' : 'move'
            }
          } else if (selectedShape) {
            const handle = hitTestShapeResizeHandle(selectedShape, currWorld, 12 / transform.scale)
            if (handle === 'se') newCursor = 'se-resize'
            else if (handle === 'e') newCursor = 'e-resize'
            else if (handle === 's') newCursor = 's-resize'
            else {
              const shapeHit = hitTestShape(shapes, currWorld)
              if (shapeHit) newCursor = movementMode ? 'move' : 'move'
            }
          } else {
            const hit = hitTest(notes, currWorld)
            const shapeHit = hitTestShape(shapes, currWorld)
            if (hit || shapeHit) newCursor = movementMode ? 'move' : 'move'
          }
        } else {
          const hit = hitTest(notes, currWorld)
          const shapeHit = hitTestShape(shapes, currWorld)
          if (hit || shapeHit) newCursor = movementMode ? 'move' : 'move'
        }
        setCursor(newCursor)
      }
    }
    const onUp = (e: MouseEvent) => {
      setPanning(false)
      
      // Handle connection creation
      if (dragging?.type === 'connect' && dragging.sourceNoteId) {
        const rect = canvasRef.current?.getBoundingClientRect()
        if (rect) {
          const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top }
          const world = invTransform(transform, pos)
          const targetNote = hitTest(notes, world)
          
          if (targetNote && targetNote.id !== dragging.sourceNoteId) {
            createConnection(dragging.sourceNoteId, targetNote.id)
          }
        }
      }
      
      // Create undo commands for continuous operations
      if (dragging && onExecuteCommand) {
        if (dragging.type === 'move' && continuousOperationType.current === 'move' && initialNoteStates.current) {
          const movements = new Map<string, { dx: number; dy: number }>()

          dragging.noteIds.forEach(id => {
            const initialState = initialNoteStates.current!.get(id)
            const currentState = notes.find(n => n.id === id)

            if (initialState && currentState) {
              movements.set(id, {
                dx: currentState.frame.x - initialState.frame.x,
                dy: currentState.frame.y - initialState.frame.y
              })
            }
          })

          // Only create command if there was actual movement
          if (movements.size > 0 && Array.from(movements.values()).some(m => m.dx !== 0 || m.dy !== 0)) {
            onExecuteCommand(new MoveNotesCommand(movements))
          }
        } else if (dragging.type === 'resize' && continuousOperationType.current === 'resize' && initialNoteStates.current) {
          const noteId = dragging.noteIds[0]
          const initialState = initialNoteStates.current.get(noteId)
          const currentState = notes.find(n => n.id === noteId)

          if (initialState && currentState) {
            const oldFrame = initialState.frame
            const newFrame = currentState.frame

            // Only create command if there was actual resize
            if (oldFrame.w !== newFrame.w || oldFrame.h !== newFrame.h) {
              onExecuteCommand(new ResizeNoteCommand(noteId, oldFrame, newFrame))
            }
          }
        } else if (dragging.type === 'move-connection-endpoint' && dragging.connectionId && dragging.originalConnection) {
          // Find final connection state
          const currentConnection = connections.find(c => c.id === dragging.connectionId)
          const originalConnection = dragging.originalConnection

          if (currentConnection &&
              (currentConnection.srcNoteId !== originalConnection.srcNoteId ||
               currentConnection.dstNoteId !== originalConnection.dstNoteId)) {
            // Create undo command for endpoint change
            onExecuteCommand(new UpdateConnectionEndpointsCommand(
              dragging.connectionId,
              originalConnection.srcNoteId,
              originalConnection.dstNoteId,
              currentConnection.srcNoteId,
              currentConnection.dstNoteId
            ))
          }
        }

        // Handle shape undo commands
        if (dragging.type === 'move' && continuousOperationType.current === 'move' && initialNoteStates.current) {
          const shapeMovements = new Map<string, { dx: number; dy: number }>()
          const previousShapeStates: BackgroundShape[] = []
          const previousNoteStates: Note[] = []

          // Calculate shape movements and collect previous states
          dragging.noteIds.forEach(id => {
            const initialState = initialNoteStates.current!.get(id)
            const currentState = shapes.find(s => s.id === id)
            const noteState = notes.find(n => n.id === id) // In case notes were tracked

            if (initialState && currentState) {
              const dx = currentState.frame.x - initialState.frame.x
              const dy = currentState.frame.y - initialState.frame.y

              // Determine if this is a shape or note
              if (shapes.find(s => s.id === id)) {
                shapeMovements.set(id, { dx, dy })
                previousShapeStates.push(initialState as BackgroundShape)
              }

              if (noteState) {
                previousNoteStates.push(noteState)
              }
            }
          })

          // Calculate note movements for magnetically affected notes
          const noteMovements = new Map<string, { dx: number; dy: number }>()
          magneticAffectedNotes.forEach(noteId => {
            const currentNote = notes.find(n => n.id === noteId)
            if (currentNote) {
              // Find which shape caused this note to move (simplified approach)
              for (const shapeId of dragging.noteIds) {
                const shapeMovement = shapeMovements.get(shapeId)
                if (shapeMovement) {
                  noteMovements.set(noteId, { ...shapeMovement })
                  break
                }
              }
            }
          })

          // Only create command if there was actual movement
          if ((shapeMovements.size > 0 && Array.from(shapeMovements.values()).some(m => m.dx !== 0 || m.dy !== 0)) ||
              (noteMovements.size > 0 && Array.from(noteMovements.values()).some(m => m.dx !== 0 || m.dy !== 0))) {

            // Use MagneticMoveCommand if notes were affected, otherwise use regular MoveShapesCommand
            if (noteMovements.size > 0) {
              onExecuteCommand(new MagneticMoveCommand(shapeMovements, noteMovements, previousShapeStates, previousNoteStates))
            } else {
              onExecuteCommand(new MoveShapesCommand(shapeMovements))
            }
          }
        } else if (dragging.type === 'resize' && continuousOperationType.current === 'resize' && initialNoteStates.current) {
          const shapeId = dragging.noteIds[0]
          const initialState = initialNoteStates.current.get(shapeId)
          const currentState = shapes.find(s => s.id === shapeId)

          if (initialState && currentState) {
            const oldFrame = initialState.frame
            const newFrame = currentState.frame

            // Only create command if there was actual resize
            if (oldFrame.w !== newFrame.w || oldFrame.h !== newFrame.h) {
              onExecuteCommand(new ResizeShapesCommand(shapeId, oldFrame, newFrame))
            }
          }
        }

        // Reset tracking state
        continuousOperationType.current = null
        initialNoteStates.current = null
      }

      setDragging(null)

      // Reset magnetic state
      setMagneticActive(false)
      setMagneticAffectedNotes([])
      setMagneticGroupedNotes([]) // New: Reset grouped notes state

      // Call onDragEnd when dragging operations complete
      if (onDragEnd && (dragging?.type === 'move' || dragging?.type === 'resize')) {
        onDragEnd()
      }

      if (marquee) {
        const rect = toRect(marquee.start, marquee.end)
        const worldRect = screenRectToWorld(transform, rect)
        const noteIdsIn = notes.filter(n => rectsIntersect(n.frame, worldRect)).map(n => n.id)
        const shapeIdsIn = shapes.filter(s => rectsIntersect(s.frame, worldRect)).map(s => s.id)
        const idsIn = [...noteIdsIn, ...shapeIdsIn]
        const curr = new Set(selectedIds)
        if (marquee.subtract) idsIn.forEach(id => curr.delete(id))
        else idsIn.forEach(id => curr.add(id))
        onSelectionChange?.(Array.from(curr))
      }
      setMarquee(null)
    }

    c.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('mousedown', onDown)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      c.removeEventListener('wheel', onWheel as EventListener)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panning, dragging, editing, transform, notes, connections, selectedIds, onNotesChange, onSelectionChange, onConnectionsChange, onShapesChange, movementMode, magneticActive, magneticAffectedNotes])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ 
        width: '100%', 
        height: '100%', 
        display: 'block', 
        cursor: (panning || spacePan) ? 'grabbing' : cursor 
      }} />
      {marquee && (
        <div
          style={{
            position: 'absolute',
            left: Math.min(marquee.start.x, marquee.end.x),
            top: Math.min(marquee.start.y, marquee.end.y),
            width: Math.abs(marquee.end.x - marquee.start.x),
            height: Math.abs(marquee.end.y - marquee.start.y),
            border: `1px dashed ${marquee.subtract ? '#ff6b6b' : '#4aa3ff'}`,
            background: marquee.subtract ? 'rgba(255,107,107,0.1)' : 'rgba(74,163,255,0.1)',
            pointerEvents: 'none',
          }}
        />
      )}
      {editing && (() => {
        const note = notes.find(n => n.id === editing.noteId)
        if (!note) return null
        const screenRect = rectToScreen(transform, note.frame)
        return (
          <textarea
            value={editing.text}
            onChange={(e) => setEditing({ ...editing, text: e.target.value })}
            style={{
              position: 'absolute',
              left: screenRect.x + 8,
              top: screenRect.y + 8,
              width: screenRect.w - 16,
              height: screenRect.h - 16,
              border: '2px solid #4aa3ff',
              borderRadius: 8,
              background: '#fff',
              resize: 'none',
              outline: 'none',
              font: `14px -apple-system, system-ui, sans-serif`,
              padding: 0,
              lineHeight: '18px'
            }}
            autoFocus
            onBlur={() => finishEditing(true)}
          />
        )
      })()}
      {editingConnection && (() => {
        const screenPos = applyTransform(transform, editingConnection.position)
        return (
          <input
            type="text"
            value={editingConnection.text}
            onChange={(e) => setEditingConnection({ ...editingConnection, text: e.target.value })}
            style={{
              position: 'absolute',
              left: screenPos.x - 50,
              top: screenPos.y - 10,
              width: 100,
              border: '2px solid #4aa3ff',
              borderRadius: 4,
              background: '#fff',
              outline: 'none',
              font: `12px -apple-system, system-ui, sans-serif`,
              padding: '2px 4px',
              textAlign: 'center'
            }}
            autoFocus
            onBlur={() => finishEditingConnectionLabel(true)}
          />
        )
      })()}
      <div style={{ position: 'absolute', left: 12, bottom: 12, color: '#fff', fontSize: 12, opacity: 0.8 }}>
        {Math.round(transform.scale * 100)}%
        {movementMode && (
          <span style={{ marginLeft: 8, color: '#4aa3ff', fontWeight: 'bold' }}>
            MOVEMENT MODE (M)
          </span>
        )}
      </div>
    </div>
  )
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(/\s+/)
  let line = ''
  let yy = y
  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i]
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy)
      line = words[i]
      yy += lineHeight
    } else {
      line = test
    }
  }
  if (line) ctx.fillText(line, x, yy)
}

function renderMarkdownText(
  ctx: CanvasRenderingContext2D,
  note: Note,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  scale: number,
) {
  const baseFontSize = 14 * scale
  const baseFont = `${baseFontSize}px -apple-system, system-ui, sans-serif`

  // Check if markdown is enabled for this note
  const markdownEnabled = note.richAttrs?.markdownEnabled || false

  if (!markdownEnabled) {
    // Use plain text rendering
    ctx.fillStyle = '#202124'
    ctx.font = baseFont
    ctx.textBaseline = 'top'
    wrapText(ctx, note.text, x, y, maxWidth, lineHeight)
    return
  }

  // Parse markdown
  const { segments, hasMarkdown } = parseMarkdown(note.text)

  // If no markdown found, render as plain text
  if (!hasMarkdown) {
    ctx.fillStyle = '#202124'
    ctx.font = baseFont
    ctx.textBaseline = 'top'
    wrapText(ctx, note.text, x, y, maxWidth, lineHeight)
    return
  }

  // Render markdown segments
  ctx.textBaseline = 'top'
  let currentX = x
  let currentY = y
  let currentLineHeight = lineHeight
  let currentLineSegments: Array<{ text: string; font: string; fillStyle: string }> = []

  // Function to render the current line
  const renderCurrentLine = () => {
    if (currentLineSegments.length === 0) return

    // Calculate total width of the line
    const totalWidth = currentLineSegments.reduce((sum, seg) => {
      ctx.font = seg.font
      return sum + ctx.measureText(seg.text).width
    }, 0)

    // Render each segment
    let segX = currentX
    for (const segment of currentLineSegments) {
      ctx.font = segment.font
      ctx.fillStyle = segment.fillStyle
      ctx.fillText(segment.text, segX, currentY)
      segX += ctx.measureText(segment.text).width
    }

    currentY += currentLineHeight
    currentLineSegments = []
    currentX = x
  }

  // Process each segment
  for (const segment of segments) {
    if (segment.text === '') continue

    // Apply styling
    let font = baseFont
    let fillStyle = '#202124'

    if (segment.bold) {
      font = `bold ${baseFont}`
    }
    if (segment.italic) {
      font = `italic ${font}`
    }
    if (segment.code) {
      font = `${baseFontSize}px 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace`
      fillStyle = '#d73a49'
      // Add background for code
      ctx.fillStyle = 'rgba(255, 235, 59, 0.2)' // Light yellow background
    }
    if (segment.strike) {
      // We'll add strikethrough after rendering the text
    }

    // Split text into words for line wrapping
    const words = segment.text.split(/\s+/)

    for (let i = 0; i < words.length; i++) {
      const word = i === 0 ? words[i] : ` ${words[i]}`

      // Test if word fits on current line
      ctx.font = font
      const testWidth = ctx.measureText(word).width

      // Check if adding this word would exceed maxWidth
      let currentLineWidth = 0
      if (currentLineSegments.length > 0) {
        for (const seg of currentLineSegments) {
          ctx.font = seg.font
          currentLineWidth += ctx.measureText(seg.text).width
        }
      }

      if (currentLineWidth + testWidth > maxWidth && currentLineSegments.length > 0) {
        // Render current line and start new line
        renderCurrentLine()
      }

      // Add word to current line
      currentLineSegments.push({
        text: word,
        font,
        fillStyle
      })
    }
  }

  // Render any remaining segments
  renderCurrentLine()
}

function hitTest(notes: Note[], pWorld: Point): Note | null {
  for (let i = notes.length - 1; i >= 0; i--) {
    const n = notes[i]
    const r = n.frame
    if (pWorld.x >= r.x && pWorld.x <= r.x + r.w && pWorld.y >= r.y && pWorld.y <= r.y + r.h) return n
  }
  return null
}

function hitTestResizeHandle(note: Note, pWorld: Point, tolerance = 8): 'se' | 'e' | 's' | null {
  const r = note.frame
  const handleSize = tolerance
  
  // Southeast corner handle
  if (pWorld.x >= r.x + r.w - handleSize && pWorld.x <= r.x + r.w + handleSize &&
      pWorld.y >= r.y + r.h - handleSize && pWorld.y <= r.y + r.h + handleSize) {
    return 'se'
  }
  
  // East edge handle  
  if (pWorld.x >= r.x + r.w - handleSize && pWorld.x <= r.x + r.w + handleSize &&
      pWorld.y >= r.y + handleSize && pWorld.y <= r.y + r.h - handleSize) {
    return 'e'
  }
  
  // South edge handle
  if (pWorld.x >= r.x + handleSize && pWorld.x <= r.x + r.w - handleSize &&
      pWorld.y >= r.y + r.h - handleSize && pWorld.y <= r.y + r.h + handleSize) {
    return 's'
  }
  
  return null
}

function toRect(a: Point, b: Point): { x: number; y: number; w: number; h: number } {
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  const w = Math.abs(b.x - a.x)
  const h = Math.abs(b.y - a.y)
  return { x, y, w, h }
}

function screenRectToWorld(t: Transform, r: { x: number; y: number; w: number; h: number }): { x: number; y: number; w: number; h: number } {
  const tl = invTransform(t, { x: r.x, y: r.y })
  const br = invTransform(t, { x: r.x + r.w, y: r.y + r.h })
  return { x: tl.x, y: tl.y, w: br.x - tl.x, h: br.y - tl.y }
}

function rectsIntersect(a: Rect, b: { x: number; y: number; w: number; h: number }) {
  return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y)
}

function hitTestConnectionLabel(connections: Connection[], notes: Note[], pWorld: Point, t: Transform): Connection | null {
  for (const conn of connections) {
    if (!conn.label) continue

    const srcNote = notes.find(n => n.id === conn.srcNoteId)
    const dstNote = notes.find(n => n.id === conn.dstNoteId)
    if (!srcNote || !dstNote) continue

    const srcCenter = {
      x: srcNote.frame.x + srcNote.frame.w / 2,
      y: srcNote.frame.y + srcNote.frame.h / 2
    }
    const dstCenter = {
      x: dstNote.frame.x + dstNote.frame.w / 2,
      y: dstNote.frame.y + dstNote.frame.h / 2
    }

    const midX = (srcCenter.x + dstCenter.x) / 2
    const midY = (srcCenter.y + dstCenter.y) / 2

    // Create a temporary canvas context to measure text
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    ctx.font = `${12 * t.scale}px -apple-system, system-ui, sans-serif`
    const textMetrics = ctx.measureText(conn.label)
    const textWidth = textMetrics.width / t.scale // Convert back to world coordinates
    const textHeight = 12
    const padding = 4

    // Check if point is within label bounds
    const labelBounds = {
      x: midX - textWidth / 2 - padding,
      y: midY - textHeight / 2 - padding,
      w: textWidth + padding * 2,
      h: textHeight + padding * 2
    }

    if (pWorld.x >= labelBounds.x && pWorld.x <= labelBounds.x + labelBounds.w &&
        pWorld.y >= labelBounds.y && pWorld.y <= labelBounds.y + labelBounds.h) {
      return conn
    }
  }
  return null
}

function hitTestConnectionEndpoint(connections: Connection[], notes: Note[], pWorld: Point, tolerance = 8): { connection: Connection, endpointType: 'source' | 'destination' } | null {
  for (const conn of connections) {
    const srcNote = notes.find(n => n.id === conn.srcNoteId)
    const dstNote = notes.find(n => n.id === conn.dstNoteId)
    if (!srcNote || !dstNote) continue

    const srcCenter = {
      x: srcNote.frame.x + srcNote.frame.w / 2,
      y: srcNote.frame.y + srcNote.frame.h / 2
    }
    const dstCenter = {
      x: dstNote.frame.x + dstNote.frame.w / 2,
      y: dstNote.frame.y + dstNote.frame.h / 2
    }

    // Check source endpoint
    const srcDist = Math.sqrt(Math.pow(pWorld.x - srcCenter.x, 2) + Math.pow(pWorld.y - srcCenter.y, 2))
    if (srcDist <= tolerance) {
      return { connection: conn, endpointType: 'source' }
    }

    // Check destination endpoint
    const dstDist = Math.sqrt(Math.pow(pWorld.x - dstCenter.x, 2) + Math.pow(pWorld.y - dstCenter.y, 2))
    if (dstDist <= tolerance) {
      return { connection: conn, endpointType: 'destination' }
    }
  }
  return null
}

function hitTestConnectionLine(connections: Connection[], notes: Note[], pWorld: Point, tolerance = 8): Connection | null {
  for (const conn of connections) {
    const srcNote = notes.find(n => n.id === conn.srcNoteId)
    const dstNote = notes.find(n => n.id === conn.dstNoteId)
    if (!srcNote || !dstNote) continue

    const srcCenter = {
      x: srcNote.frame.x + srcNote.frame.w / 2,
      y: srcNote.frame.y + srcNote.frame.h / 2
    }
    const dstCenter = {
      x: dstNote.frame.x + dstNote.frame.w / 2,
      y: dstNote.frame.y + dstNote.frame.h / 2
    }

    // Calculate distance from point to line segment
    const lineVec = { x: dstCenter.x - srcCenter.x, y: dstCenter.y - srcCenter.y }
    const pointVec = { x: pWorld.x - srcCenter.x, y: pWorld.y - srcCenter.y }
    const lineLengthSq = lineVec.x * lineVec.x + lineVec.y * lineVec.y

    if (lineLengthSq === 0) {
      // Source and destination are the same point
      const dist = Math.sqrt(pointVec.x * pointVec.x + pointVec.y * pointVec.y)
      if (dist <= tolerance) return conn
      continue
    }

    const t = Math.max(0, Math.min(1, (pointVec.x * lineVec.x + pointVec.y * lineVec.y) / lineLengthSq))
    const closestPoint = {
      x: srcCenter.x + t * lineVec.x,
      y: srcCenter.y + t * lineVec.y
    }

    const dist = Math.sqrt(
      Math.pow(pWorld.x - closestPoint.x, 2) +
      Math.pow(pWorld.y - closestPoint.y, 2)
    )

    if (dist <= tolerance) {
      return conn
    }
  }
  return null
}

function hitTestShape(shapes: BackgroundShape[], pWorld: Point): BackgroundShape | null {
  for (let i = shapes.length - 1; i >= 0; i--) {
    const shape = shapes[i]
    const r = shape.frame
    if (pWorld.x >= r.x && pWorld.x <= r.x + r.w && pWorld.y >= r.y && pWorld.y <= r.y + r.h) return shape
  }
  return null
}

function hitTestShapeResizeHandle(shape: BackgroundShape, pWorld: Point, tolerance = 8): 'se' | 'e' | 's' | null {
  const r = shape.frame
  const handleSize = tolerance

  // Southeast corner handle
  if (pWorld.x >= r.x + r.w - handleSize && pWorld.x <= r.x + r.w + handleSize &&
      pWorld.y >= r.y + r.h - handleSize && pWorld.y <= r.y + r.h + handleSize) {
    return 'se'
  }

  // East edge handle
  if (pWorld.x >= r.x + r.w - handleSize && pWorld.x <= r.x + r.w + handleSize &&
      pWorld.y >= r.y + handleSize && pWorld.y <= r.y + r.h - handleSize) {
    return 'e'
  }

  // South edge handle
  if (pWorld.x >= r.x + handleSize && pWorld.x <= r.x + r.w - handleSize &&
      pWorld.y >= r.y + r.h - handleSize && pWorld.y <= r.y + r.h + handleSize) {
    return 's'
  }

  return null
}

// Magnetic shape functionality
const MAGNETIC_DISTANCE = 30 // Distance threshold for magnetic behavior in world coordinates
const MAGNETIC_OVERLAP_THRESHOLD = 0.5 // Minimum overlap ratio for magnetic group translation (0.5 = 50% overlap)

function findNotesNearShape(notes: Note[], shape: BackgroundShape): Note[] {
  const threshold = MAGNETIC_DISTANCE
  const shapeBounds = shape.frame

  // Expand shape bounds by threshold distance
  const expandedBounds = {
    x: shapeBounds.x - threshold,
    y: shapeBounds.y - threshold,
    w: shapeBounds.w + threshold * 2,
    h: shapeBounds.h + threshold * 2
  }

  return notes.filter(note => {
    const noteBounds = note.frame
    return rectsIntersect(noteBounds, expandedBounds)
  })
}

// New function: Find notes that actually overlap with shape (for group translation)
function findNotesOverlappingShape(notes: Note[], shape: BackgroundShape): Note[] {
  const shapeBounds = shape.frame

  return notes.filter(note => {
    const noteBounds = note.frame
    return rectsIntersect(noteBounds, shapeBounds)
  })
}

// New function: Calculate overlap area between two rectangles
function calculateOverlapArea(a: Rect, b: Rect): number {
  const x1 = Math.max(a.x, b.x)
  const y1 = Math.max(a.y, b.y)
  const x2 = Math.min(a.x + a.w, b.x + b.w)
  const y2 = Math.min(a.y + a.h, b.y + b.h)

  if (x1 < x2 && y1 < y2) {
    return (x2 - x1) * (y2 - y1)
  }
  return 0
}

// New function: Calculate overlap ratio for magnetic group decisions
function calculateOverlapRatio(noteBounds: Rect, shapeBounds: Rect): number {
  const noteArea = noteBounds.w * noteBounds.h
  const shapeArea = shapeBounds.w * shapeBounds.h
  const overlapArea = calculateOverlapArea(noteBounds, shapeBounds)

  if (noteArea === 0) return 0
  return overlapArea / Math.min(noteArea, shapeArea)
}

// New function: Find overlapping shapes for shape-to-shape magnetic interactions
function findShapesOverlappingShape(shapes: BackgroundShape[], targetShape: BackgroundShape): BackgroundShape[] {
  return shapes.filter(shape => {
    if (shape.id === targetShape.id) return false
    return rectsIntersect(shape.frame, targetShape.frame)
  })
}

function calculateMagneticSnap(
  shapeFrame: Rect,
  notes: Note[]
): { dx: number; dy: number; shouldSnap: boolean; hasOverlapGroup: boolean } {
  if (notes.length === 0) {
    return { dx: 0, dy: 0, shouldSnap: false, hasOverlapGroup: false }
  }

  let totalDx = 0
  let totalDy = 0
  let snapCount = 0
  let hasOverlapGroup = false

  for (const note of notes) {
    const noteBounds = note.frame
    const shapeBounds = shapeFrame

    // Check for overlap (new functionality for SHP-2)
    const overlapRatio = calculateOverlapRatio(noteBounds, shapeBounds)
    if (overlapRatio >= MAGNETIC_OVERLAP_THRESHOLD) {
      hasOverlapGroup = true
      // For overlapping notes, use stronger magnetic force to keep them grouped
      const noteCenterX = noteBounds.x + noteBounds.w / 2
      const noteCenterY = noteBounds.y + noteBounds.h / 2
      const shapeCenterX = shapeBounds.x + shapeBounds.w / 2
      const shapeCenterY = shapeBounds.y + shapeBounds.h / 2

      totalDx += (noteCenterX - shapeCenterX) * 0.8 // Stronger force for overlap group
      totalDy += (noteCenterY - shapeCenterY) * 0.8
      snapCount++
      continue
    }

    // Original proximity-based magnetic behavior
    // Calculate the distance between centers
    const shapeCenterX = shapeBounds.x + shapeBounds.w / 2
    const shapeCenterY = shapeBounds.y + shapeBounds.h / 2
    const noteCenterX = noteBounds.x + noteBounds.w / 2
    const noteCenterY = noteBounds.y + noteBounds.h / 2

    const dx = noteCenterX - shapeCenterX
    const dy = noteCenterY - shapeCenterY
    const distance = Math.sqrt(dx * dx + dy * dy)

    // If within magnetic distance, calculate snap offset
    if (distance < MAGNETIC_DISTANCE && distance > 0) {
      // Calculate the snap force (stronger when closer)
      const snapForce = 1 - (distance / MAGNETIC_DISTANCE)
      totalDx += dx * snapForce * 0.3 // 30% of distance with snap force
      totalDy += dy * snapForce * 0.3
      snapCount++
    }
  }

  if (snapCount > 0) {
    return {
      dx: totalDx / snapCount,
      dy: totalDy / snapCount,
      shouldSnap: true,
      hasOverlapGroup
    }
  }

  return { dx: 0, dy: 0, shouldSnap: false, hasOverlapGroup }
}

function applyMagneticMovement(
  shapes: BackgroundShape[],
  notes: Note[],
  shapeIds: string[],
  dx: number,
  dy: number
): { updatedShapes: BackgroundShape[]; updatedNotes: Note[]; affectedNoteIds: string[]; groupedNoteIds: string[] } {
  // Enhanced for SHP-2: Handle shape-to-shape magnetic interactions
  let finalUpdatedShapes = shapes.map(shape => {
    if (shapeIds.includes(shape.id) && shape.magnetic !== false) {
      const newFrame = {
        ...shape.frame,
        x: shape.frame.x + dx,
        y: shape.frame.y + dy
      }
      return { ...shape, frame: newFrame }
    }
    return shape
  })

  // New: Check for shape-to-shape magnetic interactions
  const additionalShapeMovements: Map<string, { dx: number; dy: number }> = new Map()

  for (const movingShapeId of shapeIds) {
    const movingShape = shapes.find(s => s.id === movingShapeId)
    if (!movingShape || movingShape.magnetic === false) continue

    const updatedMovingShape = finalUpdatedShapes.find(s => s.id === movingShapeId)!
    const overlappingShapes = findShapesOverlappingShape(shapes, updatedMovingShape)

    for (const overlappedShape of overlappingShapes) {
      if (overlappedShape.magnetic === false || shapeIds.includes(overlappedShape.id)) continue

      // Calculate overlap ratio for shape-to-shape interaction
      const overlapRatio = calculateOverlapRatio(overlappedShape.frame, updatedMovingShape.frame)
      if (overlapRatio >= MAGNETIC_OVERLAP_THRESHOLD) {
        // Overlapping shapes should move together (new group translation for shapes)
        const existingMovement = additionalShapeMovements.get(overlappedShape.id) || { dx: 0, dy: 0 }
        additionalShapeMovements.set(overlappedShape.id, { dx: dx, dy: dy })
      }
    }
  }

  // Apply additional shape movements
  if (additionalShapeMovements.size > 0) {
    finalUpdatedShapes = finalUpdatedShapes.map(shape => {
      const additionalMovement = additionalShapeMovements.get(shape.id)
      if (additionalMovement) {
        return {
          ...shape,
          frame: {
            ...shape.frame,
            x: shape.frame.x + additionalMovement.dx,
            y: shape.frame.y + additionalMovement.dy
          }
        }
      }
      return shape
    })
  }

  // Find notes that should move with the shapes (enhanced for SHP-2)
  const affectedNoteIds: string[] = []
  const groupedNoteIds: string[] = [] // New: Track notes that are overlapped and should move as a group

  const updatedNotes = notes.map(note => {
    // Check if note overlaps with any moving shape (new overlap detection for SHP-2)
    for (const shapeId of shapeIds) {
      const shape = shapes.find(s => s.id === shapeId)
      if (shape && shape.magnetic !== false) {
        const updatedShape = finalUpdatedShapes.find(s => s.id === shapeId)!

        // Check for overlap (new group translation logic)
        const overlapRatio = calculateOverlapRatio(note.frame, updatedShape.frame)
        if (overlapRatio >= MAGNETIC_OVERLAP_THRESHOLD) {
          // This note overlaps with the moving shape - it MUST move with the shape
          if (!groupedNoteIds.includes(note.id)) {
            groupedNoteIds.push(note.id)
          }
          if (!affectedNoteIds.includes(note.id)) {
            affectedNoteIds.push(note.id)
          }
          return {
            ...note,
            frame: {
              ...note.frame,
              x: note.frame.x + dx,
              y: note.frame.y + dy
            }
          }
        }

        // Check for proximity-based magnetic behavior (original logic)
        const nearbyNotes = findNotesNearShape([note], updatedShape)
        if (nearbyNotes.length > 0 && !affectedNoteIds.includes(note.id)) {
          affectedNoteIds.push(note.id)
          return {
            ...note,
            frame: {
              ...note.frame,
              x: note.frame.x + dx,
              y: note.frame.y + dy
            }
          }
        }
      }
    }

    // Also check notes against shapes that were moved due to shape-to-shape interactions
    for (const [shapeId, movement] of additionalShapeMovements) {
      const shape = shapes.find(s => s.id === shapeId)
      if (shape && shape.magnetic !== false) {
        const updatedShape = finalUpdatedShapes.find(s => s.id === shapeId)!

        // Check for overlap with additionally moved shapes
        const overlapRatio = calculateOverlapRatio(note.frame, updatedShape.frame)
        if (overlapRatio >= MAGNETIC_OVERLAP_THRESHOLD) {
          if (!groupedNoteIds.includes(note.id)) {
            groupedNoteIds.push(note.id)
          }
          if (!affectedNoteIds.includes(note.id)) {
            affectedNoteIds.push(note.id)
          }
          return {
            ...note,
            frame: {
              ...note.frame,
              x: note.frame.x + movement.dx,
              y: note.frame.y + movement.dy
            }
          }
        }

        // Check for proximity with additionally moved shapes
        const nearbyNotes = findNotesNearShape([note], updatedShape)
        if (nearbyNotes.length > 0 && !affectedNoteIds.includes(note.id)) {
          affectedNoteIds.push(note.id)
          return {
            ...note,
            frame: {
              ...note.frame,
              x: note.frame.x + movement.dx,
              y: note.frame.y + movement.dy
            }
          }
        }
      }
    }

    return note
  })

  return { updatedShapes: finalUpdatedShapes, updatedNotes, affectedNoteIds, groupedNoteIds }
}
