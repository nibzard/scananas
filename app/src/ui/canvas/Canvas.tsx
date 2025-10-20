import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { Note, Rect, Point, Connection } from '../../model/types'

type Props = {
  notes: Note[]
  connections?: Connection[]
  selectedIds?: string[]
  onSelectionChange?: (ids: string[]) => void
  onNotesChange?: (notes: Note[]) => void
  onConnectionsChange?: (connections: Connection[]) => void
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

export function Canvas({ notes, connections = [], selectedIds = [], onSelectionChange, onNotesChange, onConnectionsChange, background = '#202124' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [transform, setTransform] = useState<Transform>({ scale: 1, tx: 0, ty: 0 })
  const [panning, setPanning] = useState(false)
  const [spacePan, setSpacePan] = useState(false)
  const panStart = useRef<Point | null>(null)
  const panStartTxTy = useRef<{ tx: number; ty: number }>({ tx: 0, ty: 0 })
  const [marquee, setMarquee] = useState<null | { start: Point; end: Point; subtract: boolean }>(null)
  const [dragging, setDragging] = useState<{ 
    type: 'move' | 'connect', 
    noteIds: string[], 
    startWorld: Point, 
    startFrames: Map<string, Rect>,
    sourceNoteId?: string
  } | null>(null)
  const [editing, setEditing] = useState<{ noteId: string, text: string } | null>(null)
  const lastClickTime = useRef<number>(0)
  const lastClickPos = useRef<Point>({ x: 0, y: 0 })

  const createNote = (worldPos: Point, text: string = 'New note') => {
    if (!onNotesChange) return
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
    onNotesChange([...notes, newNote])
    onSelectionChange?.([newNote.id])
  }

  const startEditing = (noteId: string) => {
    const note = notes.find(n => n.id === noteId)
    if (note) {
      setEditing({ noteId, text: note.text })
    }
  }

  const finishEditing = (save: boolean = true) => {
    if (!editing || !onNotesChange) return
    
    if (save) {
      const updatedNotes = notes.map(note => 
        note.id === editing.noteId ? { ...note, text: editing.text } : note
      )
      onNotesChange(updatedNotes)
    }
    setEditing(null)
  }

  const deleteSelectedNotes = () => {
    if (selectedIds.length === 0 || !onNotesChange) return
    
    const remainingNotes = notes.filter(note => !selectedIds.includes(note.id))
    onNotesChange(remainingNotes)
    
    // Also remove connections involving deleted notes
    if (onConnectionsChange) {
      const remainingConnections = connections.filter(conn => 
        !selectedIds.includes(conn.srcNoteId) && !selectedIds.includes(conn.dstNoteId)
      )
      onConnectionsChange(remainingConnections)
    }
    
    onSelectionChange?.([])
  }

  const createConnection = (srcNoteId: string, dstNoteId: string) => {
    if (!onConnectionsChange || srcNoteId === dstNoteId) return
    
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
    onConnectionsChange([...connections, newConnection])
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
      if ((e.code === 'Delete' || e.code === 'Backspace') && !editing && selectedIds.length > 0) {
        e.preventDefault()
        deleteSelectedNotes()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => { if (e.code === 'Space') setSpacePan(false) }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

      ctx.strokeStyle = conn.style?.color || 'rgba(255,255,255,0.6)'
      ctx.lineWidth = (conn.style?.width || 2) * transform.scale
      ctx.setLineDash(conn.style?.kind === 'dotted' ? [5, 5] : [])
      
      ctx.beginPath()
      ctx.moveTo(srcScreen.x, srcScreen.y)
      ctx.lineTo(dstScreen.x, dstScreen.y)
      ctx.stroke()
      ctx.setLineDash([])
    }

    // draw notes
    for (const n of notes) {
      const r = rectToScreen(transform, n.frame)
      // note fill
      const isSelected = selectedIds.includes(n.id)
      ctx.fillStyle = n.faded ? 'rgba(250,250,250,0.35)' : '#fff'
      ctx.strokeStyle = isSelected ? '#4aa3ff' : 'rgba(0,0,0,0.2)'
      ctx.lineWidth = isSelected ? 2 : 1
      const radius = 8
      roundRect(ctx, r.x, r.y, r.w, r.h, radius)
      ctx.fill()
      ctx.stroke()

      // text
      ctx.fillStyle = '#202124'
      ctx.font = `${14 * transform.scale}px -apple-system, system-ui, sans-serif`
      ctx.textBaseline = 'top'
      const pad = 8 * transform.scale
      wrapText(ctx, n.text, r.x + pad, r.y + pad, r.w - 2 * pad, 18 * transform.scale)
    }
  }

  useEffect(() => {
    draw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, connections, transform])

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
      
      if (dragging && onNotesChange && dragging.type === 'move') {
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
      }
      
      if (marquee) {
        setMarquee({ ...marquee, end: curr })
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
      
      setDragging(null)
      
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
  }, [panning, dragging, editing, transform, notes, connections, selectedIds, onNotesChange, onSelectionChange, onConnectionsChange])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', cursor: (panning || spacePan) ? 'grabbing' : 'default' }} />
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
      <div style={{ position: 'absolute', left: 12, bottom: 12, color: '#fff', fontSize: 12, opacity: 0.8 }}>
        {Math.round(transform.scale * 100)}%
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

function hitTest(notes: Note[], pWorld: Point): Note | null {
  for (let i = notes.length - 1; i >= 0; i--) {
    const n = notes[i]
    const r = n.frame
    if (pWorld.x >= r.x && pWorld.x <= r.x + r.w && pWorld.y >= r.y && pWorld.y <= r.y + r.h) return n
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
