/**
 * Basic markdown parser for note text formatting
 * Supports: **bold**, *italic*, `inline code`, ~~strikethrough~~
 */

export interface MarkdownSegment {
  text: string
  bold?: boolean
  italic?: boolean
  code?: boolean
  strike?: boolean
}

export interface MarkdownParseResult {
  segments: MarkdownSegment[]
  hasMarkdown: boolean
}

/**
 * Parse markdown text into styled segments
 */
export function parseMarkdown(text: string): MarkdownParseResult {
  if (!text || text.trim() === '') {
    return { segments: [{ text }], hasMarkdown: false }
  }

  const segments: MarkdownSegment[] = []
  let hasMarkdown = false
  let currentText = ''
  let currentIndex = 0

  const patterns = [
    { regex: /\*\*(.+?)\*\*/g, type: 'bold' as const },
    { regex: /\*(.+?)\*/g, type: 'italic' as const },
    { regex: /`(.+?)`/g, type: 'code' as const },
    { regex: /~~(.+?)~~/g, type: 'strike' as const },
  ]

  // Find all markdown positions
  const markdownPositions: Array<{
    start: number
    end: number
    content: string
    type: 'bold' | 'italic' | 'code' | 'strike'
  }> = []

  for (const pattern of patterns) {
    let match
    while ((match = pattern.regex.exec(text)) !== null) {
      markdownPositions.push({
        start: match.index,
        end: match.index + match[0].length,
        content: match[1],
        type: pattern.type,
      })
      hasMarkdown = true
    }
  }

  // Sort positions by start index
  markdownPositions.sort((a, b) => a.start - b.start)

  // Build segments
  let lastIndex = 0
  for (const pos of markdownPositions) {
    // Add plain text before markdown
    if (pos.start > lastIndex) {
      const plainText = text.slice(lastIndex, pos.start)
      if (plainText) {
        segments.push({ text: plainText })
      }
    }

    // Add markdown segment
    segments.push({
      text: pos.content,
      [pos.type]: true,
    })

    lastIndex = pos.end
  }

  // Add remaining plain text
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex)
    if (remainingText) {
      segments.push({ text: remainingText })
    }
  }

  // If no markdown found, return single segment
  if (!hasMarkdown || segments.length === 0) {
    return { segments: [{ text }], hasMarkdown: false }
  }

  return { segments, hasMarkdown }
}

/**
 * Check if text contains any markdown syntax
 */
export function hasMarkdownSyntax(text: string): boolean {
  const markdownRegex = /(\*\*.*?\*\*|_.*?_|`.*?`|~~.*?~~)/
  return markdownRegex.test(text)
}

/**
 * Strip markdown syntax from text (for plain text fallback)
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
}

/**
 * Convert styled segments back to markdown text
 */
export function segmentsToMarkdown(segments: MarkdownSegment[]): string {
  return segments
    .map(segment => {
      let text = segment.text
      if (segment.bold) text = `**${text}**`
      if (segment.italic && !segment.bold) text = `*${text}*`
      if (segment.code) text = `\`${text}\``
      if (segment.strike) text = `~~${text}~~`
      return text
    })
    .join('')
}