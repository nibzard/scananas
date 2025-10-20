import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { Note, Rect, Point, Connection } from '../../model/types'
import type { Command } from '../../state/commands'
import { parseMarkdown, type MarkdownSegment } from '../../utils/markdown'
import {
  CreateNotesCommand,
  DeleteNotesCommand,
  MoveNotesCommand,
  EditNoteTextCommand,
  ResizeNoteCommand,
  CreateConnectionCommand,
  DeleteConnectionCommand,
  UpdateNotesCommand,
  UpdateConnectionsCommand
} from '../../state/commands'

type Props = {
  notes: Note[]
  connections?: Connection[]
  selectedIds?: string[]
  onSelectionChange?: (ids: string[]) => void
  onExecuteCommand?: (command: Command) => void
  // For continuous operations like dragging
  onNotesChange?: (notes: Note[]) => void
  onConnectionsChange?: (connections: Connection[]) => void
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

export function Canvas({ notes, connections = [], selectedIds = [], onSelectionChange, onExecuteCommand, onNotesChange, onConnectionsChange, onDragEnd, background = '#202124' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [transform, setTransform] = useState<Transform>({ scale: 1, tx: 0, ty: 0 })
  const [panning, setPanning] = useState(false)
  const [spacePan, setSpacePan] = useState(false)
  const panStart = useRef<Point | null>(null)
  const panStartTxTy = useRef<{ tx: number; ty: number }>({ tx: 0, ty: 0 })
  const [marquee, setMarquee] = useState<null | { start: Point; end: Point; subtract: boolean }>(null)
  const [dragging, setDragging] = useState<{ 
    type: 'move' | 'connect' | 'resize', 
    noteIds: string[], 
    startWorld: Point, 
    startFrames: Map<string, Rect>,
    sourceNoteId?: string,
    resizeHandle?: 'se' | 'e' | 's'
  } | null>(null)
  const [editing, setEditing] = useState<{ noteId: string, text: string } | null>(null)
  const [editingConnection, setEditingConnection] = useState<{ connectionId: string, text: string, position: Point } | null>(null)
  const [cursor, setCursor] = useState<string>('default')
  const [movementMode, setMovementMode] = useState<boolean>(false)
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

  const deleteSelectedNotes = () => {
    if (selectedIds.length === 0 || !onExecuteCommand) return

    const deletedNotes = notes.filter(note => selectedIds.includes(note.id))
    const deletedConnections = connections.filter(conn =>
      selectedIds.includes(conn.srcNoteId) || selectedIds.includes(conn.dstNoteId)
    )

    onExecuteCommand(new DeleteNotesCommand(deletedNotes, deletedConnections))
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

      // Select All (Ctrl/Cmd + A)
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyA' && !editing && !editingConnection) {
        e.preventDefault()
        const allIds = notes.map(n => n.id)
        onSelectionChange?.(allIds)
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
  }, [movementMode, selectedIds, onExecuteCommand, onDragEnd, onNotesChange, notes])

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
    }

    // draw notes
    for (const n of notes) {
      const r = rectToScreen(transform, n.frame)
      // note fill
      const isSelected = selectedIds.includes(n.id)
      const isMovementModeActive = movementMode && isSelected

      ctx.fillStyle = n.faded ? 'rgba(250,250,250,0.35)' :
                      isMovementModeActive ? 'rgba(74,163,255,0.1)' : '#fff'
      ctx.strokeStyle = isMovementModeActive ? '#4aa3ff' :
                        isSelected ? '#4aa3ff' : 'rgba(0,0,0,0.2)'
      ctx.lineWidth = isMovementModeActive ? 3 : isSelected ? 2 : 1
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
  }

  useEffect(() => {
    draw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, connections, transform, selectedIds])

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

      // Check for connection label double-click
      if (connectionHit && timeSinceLastClick < 500 && distFromLastClick < 10) {
        // Double-click on connection label - start editing
        startEditingConnectionLabel(connectionHit.id)
        lastClickTime.current = 0 // Reset to prevent triple-click issues
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
      
      if (dragging && onNotesChange) {
        if (dragging.type === 'move') {
          const dx = currWorld.x - dragging.startWorld.x
          const dy = currWorld.y - dragging.startWorld.y
          
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
        } else if (dragging.type === 'resize' && dragging.resizeHandle) {
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
        }
      }
      
      if (marquee) {
        setMarquee({ ...marquee, end: curr })
      }
      
      // Update cursor based on hover and movement mode
      if (!panning && !dragging) {
        let newCursor = movementMode ? 'crosshair' : 'default'
        if (selectedIds.length === 1) {
          const selectedNote = notes.find(n => n.id === selectedIds[0])
          if (selectedNote) {
            const handle = hitTestResizeHandle(selectedNote, currWorld, 12 / transform.scale)
            if (handle === 'se') newCursor = 'se-resize'
            else if (handle === 'e') newCursor = 'e-resize'
            else if (handle === 's') newCursor = 's-resize'
            else {
              const hit = hitTest(notes, currWorld)
              if (hit) newCursor = movementMode ? 'move' : 'move'
            }
          } else {
            const hit = hitTest(notes, currWorld)
            if (hit) newCursor = movementMode ? 'move' : 'move'
          }
        } else {
          const hit = hitTest(notes, currWorld)
          if (hit) newCursor = movementMode ? 'move' : 'move'
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
        }

        // Reset tracking state
        continuousOperationType.current = null
        initialNoteStates.current = null
      }

      setDragging(null)

      // Call onDragEnd when dragging operations complete
      if (onDragEnd && (dragging?.type === 'move' || dragging?.type === 'resize')) {
        onDragEnd()
      }

      if (marquee) {
        const rect = toRect(marquee.start, marquee.end)
        const worldRect = screenRectToWorld(transform, rect)
        const idsIn = notes.filter(n => rectsIntersect(n.frame, worldRect)).map(n => n.id)
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
  }, [panning, dragging, editing, transform, notes, connections, selectedIds, onNotesChange, onSelectionChange, onConnectionsChange, movementMode])

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
