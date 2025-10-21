import type { BoardDocument, Note, Connection, Stack } from '../model/types'
import { jsPDF } from 'jspdf'

export interface ExportOptions {
  format: 'png' | 'pdf' | 'txt' | 'rtf' | 'opml'
  scale?: number
  background?: string
  includeFaded?: boolean
  margin?: number
  textOrdering?: 'spatial' | 'connections' | 'hierarchical'
  pageSize?: 'a3' | 'a4' | 'a5' | 'letter' | 'legal'
  orientation?: 'auto' | 'portrait' | 'landscape'
  quality?: 'low' | 'medium' | 'high'
}

export async function exportToPNG(
  document: BoardDocument,
  options: ExportOptions = { format: 'png' }
): Promise<Blob> {
  const scale = options.scale || 2 // 2x for high quality
  const margin = options.margin || 50
  const background = options.background || '#202124'
  
  // Calculate content bounds
  const bounds = calculateContentBounds(document.notes)
  
  // Create offscreen canvas
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  
  // Set canvas size
  const canvasWidth = (bounds.width + margin * 2) * scale
  const canvasHeight = (bounds.height + margin * 2) * scale
  canvas.width = canvasWidth
  canvas.height = canvasHeight
  
  // Set up rendering context
  ctx.scale(scale, scale)
  ctx.translate(margin - bounds.minX, margin - bounds.minY)
  
  // Clear background
  ctx.fillStyle = background
  ctx.fillRect(bounds.minX - margin, bounds.minY - margin, bounds.width + margin * 2, bounds.height + margin * 2)
  
  // Render connections first (behind notes)
  for (const connection of document.connections) {
    renderConnection(ctx, connection, document.notes)
  }
  
  // Render notes
  for (const note of document.notes) {
    if (!note.faded || options.includeFaded !== false) {
      renderNote(ctx, note)
    }
  }
  
  // Convert to blob
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob!)
    }, 'image/png', 1.0)
  })
}

export function exportToTXT(document: BoardDocument, options: ExportOptions = { format: 'txt' }): string {
  const ordering = options.textOrdering || 'spatial'
  let output = 'Freeform Idea Map Export\n'
  output += '='.repeat(30) + '\n\n'

  // Get ordered notes based on heuristic
  const orderedNotes = orderNotesByHeuristic(document, ordering)

  // Add notes
  output += 'NOTES:\n\n'
  orderedNotes.forEach((note, index) => {
    output += `${index + 1}. ${note.text}\n`
    if (note.faded) output += '   (faded)\n'
    output += '\n'
  })

  // Add connections with context
  if (document.connections.length > 0) {
    output += '\nCONNECTIONS:\n\n'
    document.connections.forEach((conn, index) => {
      const srcNote = document.notes.find(n => n.id === conn.srcNoteId)
      const dstNote = document.notes.find(n => n.id === conn.dstNoteId)
      if (srcNote && dstNote) {
        const srcIndex = orderedNotes.findIndex(n => n.id === srcNote.id) + 1
        const dstIndex = orderedNotes.findIndex(n => n.id === dstNote.id) + 1
        output += `${index + 1}. [${srcIndex}] → [${dstIndex}]: "${srcNote.text}" → "${dstNote.text}"\n`
        if (conn.label) output += `   Label: ${conn.label}\n`
        if (conn.style?.kind) output += `   Style: ${conn.style.kind}\n`
        if (conn.style?.arrows && conn.style.arrows !== 'none') output += `   Arrows: ${conn.style.arrows}\n`
      }
    })
  }

  // Add stacks information
  if (document.stacks.length > 0) {
    output += '\nSTACKS:\n\n'
    document.stacks.forEach((stack, index) => {
      output += `${index + 1}. Stack (${stack.noteIds.length} notes):\n`
      stack.noteIds.forEach(noteId => {
        const note = document.notes.find(n => n.id === noteId)
        const noteIndex = orderedNotes.findIndex(n => n.id === noteId) + 1
        if (note) {
          output += `   - [${noteIndex}] ${note.text}\n`
        }
      })
      output += '\n'
    })
  }

  output += `\nGenerated: ${new Date().toLocaleString()}\n`
  output += `Ordering: ${ordering}\n`
  output += `${document.notes.length} notes, ${document.connections.length} connections\n`

  return output
}

export function exportToRTF(document: BoardDocument, options: ExportOptions = { format: 'rtf' }): string {
  const ordering = options.textOrdering || 'spatial'
  const orderedNotes = orderNotesByHeuristic(document, ordering)

  let rtf = '{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}'
  rtf += '{\\colortbl ;\\red0\\green0\\blue0;\\red100\\green100\\blue100;}'
  rtf += '\\fs24\\pard\\qc\\b Freeform Idea Map Export\\b0\\par\\par\\pard\\ql'

  // Notes section
  rtf += '\\b Notes\\b0\\par\\par'
  orderedNotes.forEach((note, index) => {
    rtf += `${index + 1}. ${rtfEscape(note.text)}`
    if (note.faded) rtf += '\\cf1 (faded)\\cf0'
    rtf += '\\par\\par'
  })

  // Connections section
  if (document.connections.length > 0) {
    rtf += '\\b Connections\\b0\\par\\par'
    document.connections.forEach((conn, index) => {
      const srcNote = document.notes.find(n => n.id === conn.srcNoteId)
      const dstNote = document.notes.find(n => n.id === conn.dstNoteId)
      if (srcNote && dstNote) {
        const srcIndex = orderedNotes.findIndex(n => n.id === srcNote.id) + 1
        const dstIndex = orderedNotes.findIndex(n => n.id === dstNote.id) + 1
        rtf += `${index + 1}. [${srcIndex}] → [${dstIndex}]: ${rtfEscape(srcNote.text)} → ${rtfEscape(dstNote.text)}\\par`
        if (conn.label) rtf += `   Label: ${rtfEscape(conn.label)}\\par`
      }
    })
  }

  // Metadata
  rtf += '\\par\\par'
  rtf += `Generated: ${new Date().toLocaleString()}\\par`
  rtf += `Ordering: ${ordering}\\par`
  rtf += `${document.notes.length} notes, ${document.connections.length} connections\\par`
  rtf += '}'

  return rtf
}

export function exportToOPML(document: BoardDocument, options: ExportOptions = { format: 'opml' }): string {
  const ordering = options.textOrdering || 'spatial'
  const orderedNotes = orderNotesByHeuristic(document, ordering)

  let opml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  opml += '<opml version="2.0">\n'
  opml += '  <head>\n'
  opml += `    <title>Freeform Idea Map Export</title>\n`
  opml += `    <dateCreated>${new Date().toISOString()}</dateCreated>\n`
  opml += `    <expansionState>1,2,3</expansionState>\n`
  opml += '  </head>\n'
  opml += '  <body>\n'

  // Create hierarchical structure based on connections
  const processed = new Set<string>()
  const rootNotes = orderedNotes.filter(note => {
    const hasIncoming = document.connections.some(c => c.dstNoteId === note.id)
    return !hasIncoming
  })

  // Add root notes and their connections
  rootNotes.forEach(note => {
    opml += `    <outline text="${opmlEscape(note.text)}"${note.faded ? ' _faded="true"' : ''}>\n`
    processed.add(note.id)

    // Add connected notes as children
    const children = document.connections
      .filter(c => c.srcNoteId === note.id)
      .map(c => document.notes.find(n => n.id === c.dstNoteId))
      .filter(Boolean) as Note[]

    children.forEach(child => {
      opml += addNoteToOPML(child, document, processed, 6)
    })

    opml += '    </outline>\n'
  })

  // Add any remaining notes (orphans)
  orderedNotes.forEach(note => {
    if (!processed.has(note.id)) {
      opml += `    <outline text="${opmlEscape(note.text)}"${note.faded ? ' _faded="true"' : ''}/>\n`
    }
  })

  // Add connections as separate outlines for reference
  if (document.connections.length > 0) {
    opml += '    <outline text="Connections" _isConnections="true">\n'
    document.connections.forEach((conn, index) => {
      const srcNote = document.notes.find(n => n.id === conn.srcNoteId)
      const dstNote = document.notes.find(n => n.id === conn.dstNoteId)
      if (srcNote && dstNote) {
        const srcIndex = orderedNotes.findIndex(n => n.id === srcNote.id) + 1
        const dstIndex = orderedNotes.findIndex(n => n.id === dstNote.id) + 1
        opml += `      <outline text="[${srcIndex}] → [${dstIndex}]: ${opmlEscape(srcNote.text)} → ${opmlEscape(dstNote.text)}"`
        if (conn.label) opml += ` _label="${opmlEscape(conn.label)}"`
        opml += '/>\n'
      }
    })
    opml += '    </outline>\n'
  }

  opml += '  </body>\n'
  opml += '</opml>\n'

  return opml
}

// Helper functions for text ordering heuristics
function orderNotesByHeuristic(document: BoardDocument, ordering: 'spatial' | 'connections' | 'hierarchical'): Note[] {
  switch (ordering) {
    case 'spatial':
      return orderNotesSpatially(document.notes)
    case 'connections':
      return orderNotesByConnections(document.notes, document.connections)
    case 'hierarchical':
      return orderNotesHierarchically(document.notes, document.connections, document.stacks)
    default:
      return document.notes
  }
}

function orderNotesSpatially(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => {
    // Sort by row first, then by column
    const rowA = Math.floor(a.frame.y / 100) // Group notes in 100px rows
    const rowB = Math.floor(b.frame.y / 100)
    if (rowA !== rowB) return rowA - rowB

    return a.frame.x - b.frame.x
  })
}

function orderNotesByConnections(notes: Note[], connections: Connection[]): Note[] {
  const noteIds = new Set(notes.map(n => n.id))
  const ordered: Note[] = []
  const processed = new Set<string>()

  // Find root notes (no incoming connections)
  const rootNotes = notes.filter(note =>
    !connections.some(c => c.dstNoteId === note.id)
  )

  // Process each root note and its connections
  rootNotes.forEach(root => {
    if (!processed.has(root.id)) {
      ordered.push(root)
      processed.add(root.id)
      addConnectedNotes(root.id, connections, notes, processed, ordered)
    }
  })

  // Add any remaining notes (orphans)
  notes.forEach(note => {
    if (!processed.has(note.id)) {
      ordered.push(note)
    }
  })

  return ordered
}

function addConnectedNotes(noteId: string, connections: Connection[], notes: Note[], processed: Set<string>, ordered: Note[]) {
  const outgoing = connections
    .filter(c => c.srcNoteId === noteId)
    .sort((a, b) => {
      // Sort by label alphabetically if present, otherwise by note text
      const aLabel = a.label || notes.find(n => n.id === a.dstNoteId)?.text || ''
      const bLabel = b.label || notes.find(n => n.id === b.dstNoteId)?.text || ''
      return aLabel.localeCompare(bLabel)
    })

  outgoing.forEach(conn => {
    if (!processed.has(conn.dstNoteId)) {
      const targetNote = notes.find(n => n.id === conn.dstNoteId)
      if (targetNote) {
        ordered.push(targetNote)
        processed.add(targetNote.id)
        addConnectedNotes(targetNote.id, connections, notes, processed, ordered)
      }
    }
  })
}

function orderNotesHierarchically(notes: Note[], connections: Connection[], stacks: Stack[]): Note[] {
  const ordered: Note[] = []
  const processed = new Set<string>()

  // First, process stacks in order
  stacks.forEach(stack => {
    stack.noteIds.forEach(noteId => {
      const note = notes.find(n => n.id === noteId)
      if (note && !processed.has(noteId)) {
        ordered.push(note)
        processed.add(noteId)
      }
    })
  })

  // Then process remaining notes by connections
  const remainingNotes = notes.filter(n => !processed.has(n.id))
  const connectionOrdered = orderNotesByConnections(remainingNotes, connections)
  ordered.push(...connectionOrdered)

  return ordered
}

function rtfEscape(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/{/g, '\\{')
    .replace(/}/g, '\\}')
    .replace(/\n/g, '\\par ')
    .replace(/\t/g, '\\tab ')
}

function opmlEscape(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function addNoteToOPML(note: Note, document: BoardDocument, processed: Set<string>, indent: string): string {
  if (processed.has(note.id)) return ''

  let opml = `${indent}<outline text="${opmlEscape(note.text)}"${note.faded ? ' _faded="true"' : ''}`
  processed.add(note.id)

  // Find children
  const children = document.connections
    .filter(c => c.srcNoteId === note.id)
    .map(c => document.notes.find(n => n.id === c.dstNoteId))
    .filter(Boolean) as Note[]

  if (children.length > 0) {
    opml += '>\n'
    children.forEach(child => {
      opml += addNoteToOPML(child, document, processed, indent + '  ')
    })
    opml += `${indent}</outline>\n`
  } else {
    opml += '/>\n'
  }

  return opml
}

export async function exportToPDF(
  document: BoardDocument,
  options: ExportOptions = { format: 'pdf' }
): Promise<Blob> {
  const margin = options.margin || 50
  const background = options.background || '#202124'
  const pageSize = options.pageSize || 'a4'
  const orientation = options.orientation || 'auto'

  // Calculate content bounds
  const bounds = calculateContentBounds(document.notes)

  // Convert pixels to mm (3.78 pixels per mm at 96 DPI)
  const contentWidthMm = (bounds.width + margin * 2) / 3.78
  const contentHeightMm = (bounds.height + margin * 2) / 3.78

  // Determine page orientation
  let finalOrientation: 'portrait' | 'landscape' = 'portrait'
  if (orientation === 'auto') {
    finalOrientation = contentWidthMm > contentHeightMm ? 'landscape' : 'portrait'
  } else {
    finalOrientation = orientation
  }

  // Create PDF with vector graphics
  const pdf = new jsPDF({
    orientation: finalOrientation,
    unit: 'mm',
    format: pageSize
  })

  // Get page dimensions
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  // Calculate scale to fit content on page with margins
  const marginMm = 10 // 10mm margin
  const maxWidth = pageWidth - (marginMm * 2)
  const maxHeight = pageHeight - (marginMm * 2)

  const scaleX = maxWidth / contentWidthMm
  const scaleY = maxHeight / contentHeightMm
  const scale = Math.min(scaleX, scaleY, 1) // Don't scale up, only down

  // Calculate offsets to center content
  const scaledWidth = contentWidthMm * scale
  const scaledHeight = contentHeightMm * scale
  const offsetX = marginMm + (maxWidth - scaledWidth) / 2
  const offsetY = marginMm + (maxHeight - scaledHeight) / 2

  // Save current state
  pdf.saveGraphicsState()

  // Apply clipping rectangle for content area
  pdf.rect(offsetX, offsetY, scaledWidth, scaledHeight)
  pdf.clip()

  // Fill background
  if (background && background !== 'transparent') {
    pdf.setFillColor(background)
    pdf.rect(offsetX, offsetY, scaledWidth, scaledHeight, 'F')
  }

  // Set up transformation matrix
  // First translate to the content area
  // Then apply scaling
  // Finally convert from pixels to mm
  const pixelToMm = 1 / 3.78
  const finalScale = scale * pixelToMm

  // For jsPDF, we need to manually transform coordinates
  const transformX = (x: number) => offsetX + (x + margin - bounds.minX) * finalScale
  const transformY = (y: number) => offsetY + (y + margin - bounds.minY) * finalScale
  const transformScale = (length: number) => length * finalScale

  // Render connections first (behind notes)
  for (const connection of document.connections) {
    renderConnectionVector(pdf, connection, document.notes, transformX, transformY, transformScale)
  }

  // Render notes
  for (const note of document.notes) {
    if (!note.faded || options.includeFaded !== false) {
      renderNoteVector(pdf, note, transformX, transformY, transformScale)
    }
  }

  // Restore graphics state
  pdf.restoreGraphicsState()

  // Convert PDF to blob
  const pdfBlob = pdf.output('blob')
  return pdfBlob
}

interface ContentBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
}

function calculateContentBounds(notes: Note[]): ContentBounds {
  if (notes.length === 0) {
    return { minX: 0, minY: 0, maxX: 200, maxY: 100, width: 200, height: 100 }
  }
  
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  
  for (const note of notes) {
    minX = Math.min(minX, note.frame.x)
    minY = Math.min(minY, note.frame.y)
    maxX = Math.max(maxX, note.frame.x + note.frame.w)
    maxY = Math.max(maxY, note.frame.y + note.frame.h)
  }
  
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  }
}

function renderNote(ctx: CanvasRenderingContext2D, note: Note) {
  const alpha = note.faded ? 0.5 : 1.0
  
  // Save context
  ctx.save()
  ctx.globalAlpha = alpha
  
  // Draw note background
  ctx.fillStyle = '#fff'
  ctx.strokeStyle = '#ccc'
  ctx.lineWidth = 1
  
  // Rounded rectangle
  const radius = 8
  ctx.beginPath()
  roundRect(ctx, note.frame.x, note.frame.y, note.frame.w, note.frame.h, radius)
  ctx.fill()
  ctx.stroke()
  
  // Draw text
  ctx.fillStyle = '#202124'
  ctx.font = '14px -apple-system, system-ui, sans-serif'
  ctx.textBaseline = 'top'
  
  const padding = 8
  wrapText(ctx, note.text, note.frame.x + padding, note.frame.y + padding, note.frame.w - padding * 2, 18)
  
  ctx.restore()
}

function renderConnection(ctx: CanvasRenderingContext2D, connection: Connection, notes: Note[]) {
  const srcNote = notes.find(n => n.id === connection.srcNoteId)
  const dstNote = notes.find(n => n.id === connection.dstNoteId)

  if (!srcNote || !dstNote) return

  // Calculate center points
  const srcX = srcNote.frame.x + srcNote.frame.w / 2
  const srcY = srcNote.frame.y + srcNote.frame.h / 2
  const dstX = dstNote.frame.x + dstNote.frame.w / 2
  const dstY = dstNote.frame.y + dstNote.frame.h / 2

  const color = connection.style?.color || 'rgba(255,255,255,0.6)'
  const lineWidth = connection.style?.width || 2

  ctx.save()
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = lineWidth

  if (connection.style?.kind === 'dotted') {
    ctx.setLineDash([5, 5])
  }

  // Draw the line
  ctx.beginPath()
  ctx.moveTo(srcX, srcY)
  ctx.lineTo(dstX, dstY)
  ctx.stroke()
  ctx.setLineDash([])

  // Draw arrows if specified
  const arrows = connection.style?.arrows || 'none'
  if (arrows !== 'none') {
    const arrowSize = Math.max(8, lineWidth * 2)
    const dx = dstX - srcX
    const dy = dstY - srcY
    const length = Math.sqrt(dx * dx + dy * dy)
    const unitX = dx / length
    const unitY = dy / length

    if (arrows === 'dst' || arrows === 'both') {
      // Arrow at destination
      const arrowX = dstX - unitX * arrowSize
      const arrowY = dstY - unitY * arrowSize
      const perpX = -unitY * arrowSize * 0.5
      const perpY = unitX * arrowSize * 0.5

      ctx.beginPath()
      ctx.moveTo(dstX, dstY)
      ctx.lineTo(arrowX + perpX, arrowY + perpY)
      ctx.lineTo(arrowX - perpX, arrowY - perpY)
      ctx.closePath()
      ctx.fill()
    }

    if (arrows === 'src' || arrows === 'both') {
      // Arrow at source
      const arrowX = srcX + unitX * arrowSize
      const arrowY = srcY + unitY * arrowSize
      const perpX = -unitY * arrowSize * 0.5
      const perpY = unitX * arrowSize * 0.5

      ctx.beginPath()
      ctx.moveTo(srcX, srcY)
      ctx.lineTo(arrowX + perpX, arrowY + perpY)
      ctx.lineTo(arrowX - perpX, arrowY - perpY)
      ctx.closePath()
      ctx.fill()
    }
  }

  ctx.restore()
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(/\s+/)
  let line = ''
  let currentY = y
  
  for (let i = 0; i < words.length; i++) {
    const testLine = line ? `${line} ${words[i]}` : words[i]
    const metrics = ctx.measureText(testLine)
    
    if (metrics.width > maxWidth && line) {
      ctx.fillText(line, x, currentY)
      line = words[i]
      currentY += lineHeight
    } else {
      line = testLine
    }
  }
  
  if (line) {
    ctx.fillText(line, x, currentY)
  }
}

export async function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain' })
  downloadFile(blob, filename)
}

// Vector rendering functions for PDF export
function renderNoteVector(
  pdf: jsPDF,
  note: Note,
  transformX: (x: number) => number,
  transformY: (y: number) => number,
  transformScale: (length: number) => number
) {
  const alpha = note.faded ? 0.5 : 1.0

  // Save current state
  pdf.saveGraphicsState()
  pdf.setGState(pdf.GState({ opacity: alpha }))

  // Draw note background
  pdf.setFillColor(255, 255, 255) // White background
  pdf.setDrawColor(204, 204, 204) // Light gray border
  pdf.setLineWidth(transformScale(1))

  // Draw rounded rectangle with transformed coordinates
  const radius = transformScale(8)
  const x = transformX(note.frame.x)
  const y = transformY(note.frame.y)
  const width = transformScale(note.frame.w)
  const height = transformScale(note.frame.h)

  pdf.roundedRect(x, y, width, height, radius, radius, 'FD')

  // Draw text
  pdf.setTextColor(32, 33, 36) // Dark text color
  pdf.setFont('helvetica')
  pdf.setFontSize(transformScale(14))

  const padding = transformScale(8)
  const textWidth = width - padding * 2
  const textX = x + padding
  let textY = y + padding + transformScale(14) // Adjust for font height

  // Word wrap and render text
  const words = note.text.split(/\s+/)
  let line = ''
  const lineHeight = transformScale(18)

  for (let i = 0; i < words.length; i++) {
    const testLine = line ? `${line} ${words[i]}` : words[i]
    const metrics = pdf.getTextWidth(testLine)

    if (metrics > textWidth && line) {
      pdf.text(line, textX, textY)
      line = words[i]
      textY += lineHeight
    } else {
      line = testLine
    }
  }

  if (line) {
    pdf.text(line, textX, textY)
  }

  // Restore state
  pdf.restoreGraphicsState()
}

function renderConnectionVector(
  pdf: jsPDF,
  connection: Connection,
  notes: Note[],
  transformX: (x: number) => number,
  transformY: (y: number) => number,
  transformScale: (length: number) => number
) {
  const srcNote = notes.find(n => n.id === connection.srcNoteId)
  const dstNote = notes.find(n => n.id === connection.dstNoteId)

  if (!srcNote || !dstNote) return

  // Calculate center points
  const srcX = srcNote.frame.x + srcNote.frame.w / 2
  const srcY = srcNote.frame.y + srcNote.frame.h / 2
  const dstX = dstNote.frame.x + dstNote.frame.w / 2
  const dstY = dstNote.frame.y + dstNote.frame.h / 2

  // Parse connection color
  const color = connection.style?.color || 'rgba(255,255,255,0.6)'
  const lineWidth = transformScale(connection.style?.width || 2)

  pdf.setLineWidth(lineWidth)

  // Convert color string to RGB
  const rgb = parseColor(color)
  pdf.setDrawColor(rgb.r, rgb.g, rgb.b)

  if (connection.style?.kind === 'dotted') {
    pdf.setLineDashPattern([transformScale(5), transformScale(5)], 0)
  } else {
    pdf.setLineDashPattern([], 0) // Solid line
  }

  // Draw the line with transformed coordinates
  pdf.line(transformX(srcX), transformY(srcY), transformX(dstX), transformY(dstY))

  // Draw arrows if specified
  const arrows = connection.style?.arrows || 'none'
  if (arrows !== 'none') {
    const arrowSize = transformScale(Math.max(8, (connection.style?.width || 2) * 2))
    const dx = dstX - srcX
    const dy = dstY - srcY
    const length = Math.sqrt(dx * dx + dy * dy)
    const unitX = dx / length
    const unitY = dy / length

    if (arrows === 'dst' || arrows === 'both') {
      // Arrow at destination
      const arrowX = dstX - unitX * (arrowSize / transformScale(1))
      const arrowY = dstY - unitY * (arrowSize / transformScale(1))
      const perpX = -unitY * arrowSize * 0.5 / transformScale(1)
      const perpY = unitX * arrowSize * 0.5 / transformScale(1)

      pdf.setFillColor(rgb.r, rgb.g, rgb.b)
      pdf.triangle(
        transformX(dstX), transformY(dstY),
        transformX(arrowX + perpX), transformY(arrowY + perpY),
        transformX(arrowX - perpX), transformY(arrowY - perpY),
        'F'
      )
    }

    if (arrows === 'src' || arrows === 'both') {
      // Arrow at source
      const arrowX = srcX + unitX * (arrowSize / transformScale(1))
      const arrowY = srcY + unitY * (arrowSize / transformScale(1))
      const perpX = -unitY * arrowSize * 0.5 / transformScale(1)
      const perpY = unitX * arrowSize * 0.5 / transformScale(1)

      pdf.setFillColor(rgb.r, rgb.g, rgb.b)
      pdf.triangle(
        transformX(srcX), transformY(srcY),
        transformX(arrowX + perpX), transformY(arrowY + perpY),
        transformX(arrowX - perpX), transformY(arrowY - perpY),
        'F'
      )
    }
  }
}

function parseColor(color: string): { r: number, g: number, b: number } {
  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.slice(1)
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    return { r, g, b }
  }

  // Handle rgba colors
  if (color.startsWith('rgba(')) {
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
    if (match) {
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3])
      }
    }
  }

  // Handle rgb colors
  if (color.startsWith('rgb(')) {
    const match = color.match(/rgb?\((\d+),\s*(\d+),\s*(\d+)/)
    if (match) {
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3])
      }
    }
  }

  // Default to white
  return { r: 255, g: 255, b: 255 }
}
