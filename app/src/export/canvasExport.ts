import type { BoardDocument, Note, Connection } from '../model/types'
import { jsPDF } from 'jspdf'

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

export async function exportToPDF(
  document: BoardDocument,
  options: ExportOptions = { format: 'pdf' }
): Promise<Blob> {
  const scale = options.scale || 2 // 2x for high quality
  const margin = options.margin || 50
  const background = options.background || '#202124'

  // Calculate content bounds
  const bounds = calculateContentBounds(document.notes)

  // Create offscreen canvas for rendering
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

  // Convert canvas to image data
  return new Promise((resolve, reject) => {
    canvas.toBlob((canvasBlob) => {
      if (!canvasBlob) {
        reject(new Error('Failed to render canvas to blob'))
        return
      }

      // Convert canvas blob to base64
      const reader = new FileReader()
      reader.onload = () => {
        const imgData = reader.result as string

        // Calculate PDF dimensions (A4 size as default, but scale to fit content)
        const pdfWidth = Math.max(210, (bounds.width + margin * 2) / 3.78) // Convert pixels to mm (3.78 pixels per mm at 96 DPI)
        const pdfHeight = Math.max(297, (bounds.height + margin * 2) / 3.78)

        // Create PDF
        const pdf = new jsPDF({
          orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
          unit: 'mm',
          format: 'a4'
        })

        // Calculate image dimensions to fit PDF page
        const pageWidth = pdf.internal.pageSize.getWidth()
        const pageHeight = pdf.internal.pageSize.getHeight()
        const imgWidth = pageWidth - 20 // 10mm margin on each side
        const imgHeight = (canvasHeight / canvasWidth) * imgWidth

        let imgX = 10 // 10mm margin from left
        let imgY = 10 // 10mm margin from top

        // If image is too tall, scale it to fit page height
        let finalImgWidth = imgWidth
        let finalImgHeight = imgHeight
        if (imgHeight > pageHeight - 20) {
          finalImgHeight = pageHeight - 20
          finalImgWidth = (canvasWidth / canvasHeight) * finalImgHeight
          imgX = (pageWidth - finalImgWidth) / 2 // Center horizontally
        }

        // Add image to PDF
        pdf.addImage(imgData, 'PNG', imgX, imgY, finalImgWidth, finalImgHeight)

        // Convert PDF to blob
        const pdfBlob = pdf.output('blob')
        resolve(pdfBlob)
      }

      reader.onerror = () => reject(new Error('Failed to read canvas blob'))
      reader.readAsDataURL(canvasBlob)
    }, 'image/png', 1.0)
  })
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
