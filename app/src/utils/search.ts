import { Note, Connection } from '../model/types'

export interface SearchResult {
  id: string
  type: 'note' | 'connection'
  text: string
  position?: { x: number, y: number }
  context?: string // Text snippet around the match
  matchStart?: number
  matchEnd?: number
}

/**
 * Performs case-insensitive search across notes and connection labels
 * @param notes - Array of notes to search through
 * @param connections - Array of connections to search through
 * @param query - Search query string
 * @returns Array of search results with position and context info
 */
export function performSearch(
  notes: Note[],
  connections: Connection[],
  query: string
): SearchResult[] {
  if (!query.trim()) {
    return []
  }

  const searchTerm = query.toLowerCase().trim()
  const results: SearchResult[] = []

  // Search through notes
  notes.forEach(note => {
    const text = note.text.toLowerCase()
    const matchIndex = text.indexOf(searchTerm)

    if (matchIndex !== -1) {
      const contextStart = Math.max(0, matchIndex - 20)
      const contextEnd = Math.min(note.text.length, matchIndex + searchTerm.length + 20)
      const context = note.text.substring(contextStart, contextEnd)

      results.push({
        id: note.id,
        type: 'note',
        text: note.text,
        position: { x: note.frame.x, y: note.frame.y },
        context: context,
        matchStart: matchIndex,
        matchEnd: matchIndex + searchTerm.length
      })
    }
  })

  // Search through connection labels
  connections.forEach(connection => {
    if (connection.label) {
      const label = connection.label.toLowerCase()
      const matchIndex = label.indexOf(searchTerm)

      if (matchIndex !== -1) {
        // Calculate midpoint for connection positioning
        const srcNote = notes.find(n => n.id === connection.srcNoteId)
        const dstNote = notes.find(n => n.id === connection.dstNoteId)

        let position: { x: number, y: number } | undefined
        if (srcNote && dstNote) {
          position = {
            x: (srcNote.frame.x + dstNote.frame.x) / 2,
            y: (srcNote.frame.y + dstNote.frame.y) / 2
          }
        }

        results.push({
          id: connection.id,
          type: 'connection',
          text: connection.label,
          position,
          context: connection.label,
          matchStart: matchIndex,
          matchEnd: matchIndex + searchTerm.length
        })
      }
    }
  })

  return results
}

/**
 * Filters search results based on type
 */
export function filterResultsByType(
  results: SearchResult[],
  type: 'note' | 'connection' | 'all'
): SearchResult[] {
  if (type === 'all') {
    return results
  }
  return results.filter(result => result.type === type)
}

/**
 * Gets the next search result from current index
 */
export function getNextResult(
  results: SearchResult[],
  currentIndex: number,
  direction: 'next' | 'previous'
): { result: SearchResult | null; index: number } {
  if (results.length === 0) {
    return { result: null, index: -1 }
  }

  let nextIndex = currentIndex
  if (direction === 'next') {
    nextIndex = (currentIndex + 1) % results.length
  } else {
    nextIndex = currentIndex <= 0 ? results.length - 1 : currentIndex - 1
  }

  return {
    result: results[nextIndex],
    index: nextIndex
  }
}

/**
 * Finds all connected notes to a given note ID
 */
export function findConnectedCluster(
  noteId: string,
  connections: Connection[],
  visited: Set<string> = new Set()
): string[] {
  if (visited.has(noteId)) {
    return []
  }

  visited.add(noteId)
  const connectedIds: string[] = [noteId]

  // Find all connections involving this note
  connections.forEach(connection => {
    let otherNoteId: string | null = null

    if (connection.srcNoteId === noteId) {
      otherNoteId = connection.dstNoteId
    } else if (connection.dstNoteId === noteId) {
      otherNoteId = connection.srcNoteId
    }

    if (otherNoteId && !visited.has(otherNoteId)) {
      connectedIds.push(...findConnectedCluster(otherNoteId, connections, visited))
    }
  })

  return connectedIds
}