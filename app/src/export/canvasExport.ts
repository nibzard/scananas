import type { BoardDocument, Note, Connection } from '../model/types'

export interface ExportOptions {
  format: 'png' | 'pdf' | 'txt'
  scale?: number
  background?: string
  includeFaded?: boolean
  margin?: number
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

export function exportToTXT(document: BoardDocument): string {
  let output = 'Freeform Idea Map Export\n'
  output += '='.repeat(30) + '\n\n'
  
  // Add notes
  output += 'NOTES:\n\n'
  document.notes.forEach((note, index) => {
    output += `${index + 1}. ${note.text}\n`
    if (note.faded) output += '   (faded)\n'
    output += '\n'
  })
  
  // Add connections
  if (document.connections.length > 0) {
    output += '\nCONNECTIONS:\n\n'
    document.connections.forEach((conn, index) => {
      const srcNote = document.notes.find(n => n.id === conn.srcNoteId)
      const dstNote = document.notes.find(n => n.id === conn.dstNoteId)
      if (srcNote && dstNote) {
        output += `${index + 1}. "${srcNote.text}" → "${dstNote.text}"\n`
        if (conn.label) output += `   Label: ${conn.label}\n`
      }
    })
  }
  
  output += `\nGenerated: ${new Date().toLocaleString()}\n`
  output += `${document.notes.length} notes, ${document.connections.length} connections\n`
  
  return output
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
  
  ctx.save()
  ctx.strokeStyle = connection.style?.color || 'rgba(255,255,255,0.6)'
  ctx.lineWidth = connection.style?.width || 2
  
  if (connection.style?.kind === 'dotted') {
    ctx.setLineDash([5, 5])
  }
  
  ctx.beginPath()
  ctx.moveTo(srcX, srcY)
  ctx.lineTo(dstX, dstY)
  ctx.stroke()
  
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
