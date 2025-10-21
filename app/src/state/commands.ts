import type { BoardDocument, Note, Connection } from '../model/types'

// Base command interface
export interface Command {
  description: string
  execute(doc: BoardDocument): BoardDocument
  undo(doc: BoardDocument): BoardDocument
  canCoalesceWith?(command: Command): boolean
  coalesce?(command: Command): Command
}

// Command stack for undo/redo functionality
export class CommandStack {
  private undoStack: Command[] = []
  private redoStack: Command[] = []
  private readonly maxStackSize = 100

  // Execute a new command
  execute(command: Command, currentDoc: BoardDocument): BoardDocument {
    // Try to coalesce with the last command if possible
    const lastCommand = this.undoStack[this.undoStack.length - 1]
    if (lastCommand && command.canCoalesceWith?.(lastCommand)) {
      const coalesced = command.coalesce!(lastCommand)
      this.undoStack[this.undoStack.length - 1] = coalesced
      return coalesced.execute(currentDoc)
    }

    // Execute the command
    const newDoc = command.execute(currentDoc)

    // Add to undo stack and clear redo stack
    this.undoStack.push(command)
    this.redoStack.length = 0 // Clear redo stack

    // Limit stack size
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift()
    }

    return newDoc
  }

  // Undo the last command
  undo(currentDoc: BoardDocument): BoardDocument | null {
    const command = this.undoStack.pop()
    if (!command) return null

    const undoneDoc = command.undo(currentDoc)
    this.redoStack.push(command)
    return undoneDoc
  }

  // Redo the last undone command
  redo(currentDoc: BoardDocument): BoardDocument | null {
    const command = this.redoStack.pop()
    if (!command) return null

    const redoneDoc = command.execute(currentDoc)
    this.undoStack.push(command)
    return redoneDoc
  }

  // Check if we can undo
  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  // Check if we can redo
  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  // Get description of next undo action
  getUndoDescription(): string | null {
    const command = this.undoStack[this.undoStack.length - 1]
    return command?.description || null
  }

  // Get description of next redo action
  getRedoDescription(): string | null {
    const command = this.redoStack[this.redoStack.length - 1]
    return command?.description || null
  }

  // Clear all history
  clear(): void {
    this.undoStack.length = 0
    this.redoStack.length = 0
  }
}

// Concrete command implementations

export class CreateNotesCommand implements Command {
  description = 'Create notes'
  private readonly newNotes: Note[]

  constructor(notes: Note[]) {
    this.newNotes = notes
  }

  execute(doc: BoardDocument): BoardDocument {
    return {
      ...doc,
      notes: [...doc.notes, ...this.newNotes]
    }
  }

  undo(doc: BoardDocument): BoardDocument {
    const newIds = new Set(this.newNotes.map(n => n.id))
    return {
      ...doc,
      notes: doc.notes.filter(n => !newIds.has(n.id))
    }
  }
}

export class DeleteNotesCommand implements Command {
  description = 'Delete notes'
  private readonly deletedNotes: Note[]
  private readonly deletedConnections: Connection[]

  constructor(deletedNotes: Note[], deletedConnections: Connection[]) {
    this.deletedNotes = deletedNotes
    this.deletedConnections = deletedConnections
  }

  execute(doc: BoardDocument): BoardDocument {
    const deletedIds = new Set(this.deletedNotes.map(n => n.id))
    return {
      ...doc,
      notes: doc.notes.filter(n => !deletedIds.has(n.id)),
      connections: doc.connections.filter(c =>
        !deletedIds.has(c.srcNoteId) && !deletedIds.has(c.dstNoteId)
      )
    }
  }

  undo(doc: BoardDocument): BoardDocument {
    return {
      ...doc,
      notes: [...doc.notes, ...this.deletedNotes],
      connections: [...doc.connections, ...this.deletedConnections]
    }
  }
}

export class MoveNotesCommand implements Command {
  description = 'Move notes'
  private readonly noteMovements: Map<string, { dx: number; dy: number }>

  constructor(movements: Map<string, { dx: number; dy: number }>) {
    this.noteMovements = movements
  }

  execute(doc: BoardDocument): BoardDocument {
    return {
      ...doc,
      notes: doc.notes.map(note => {
        const movement = this.noteMovements.get(note.id)
        if (movement) {
          return {
            ...note,
            frame: {
              ...note.frame,
              x: note.frame.x + movement.dx,
              y: note.frame.y + movement.dy
            }
          }
        }
        return note
      })
    }
  }

  undo(doc: BoardDocument): BoardDocument {
    return {
      ...doc,
      notes: doc.notes.map(note => {
        const movement = this.noteMovements.get(note.id)
        if (movement) {
          return {
            ...note,
            frame: {
              ...note.frame,
              x: note.frame.x - movement.dx,
              y: note.frame.y - movement.dy
            }
          }
        }
        return note
      })
    }
  }

  canCoalesceWith(command: Command): boolean {
    return command instanceof MoveNotesCommand &&
           command.noteMovements.size === this.noteMovements.size &&
           Array.from(command.noteMovements.keys()).every(id => this.noteMovements.has(id))
  }

  coalesce(command: MoveNotesCommand): MoveNotesCommand {
    const coalescedMovements = new Map<string, { dx: number; dy: number }>()

    // Sum the movements for each note
    for (const [id, movement] of this.noteMovements) {
      const otherMovement = command.noteMovements.get(id)
      if (otherMovement) {
        coalescedMovements.set(id, {
          dx: movement.dx + otherMovement.dx,
          dy: movement.dy + otherMovement.dy
        })
      }
    }

    return new MoveNotesCommand(coalescedMovements)
  }
}

export class EditNoteTextCommand implements Command {
  description = 'Edit note text'
  private readonly noteId: string
  private readonly oldText: string
  private readonly newText: string
  private readonly timestamp: number

  constructor(noteId: string, oldText: string, newText: string) {
    this.noteId = noteId
    this.oldText = oldText
    this.newText = newText
    this.timestamp = Date.now()
  }

  execute(doc: BoardDocument): BoardDocument {
    return {
      ...doc,
      notes: doc.notes.map(note =>
        note.id === this.noteId
          ? { ...note, text: this.newText }
          : note
      )
    }
  }

  undo(doc: BoardDocument): BoardDocument {
    return {
      ...doc,
      notes: doc.notes.map(note =>
        note.id === this.noteId
          ? { ...note, text: this.oldText }
          : note
      )
    }
  }

  canCoalesceWith(command: Command): boolean {
    return command instanceof EditNoteTextCommand &&
           command.noteId === this.noteId &&
           (command.timestamp - this.timestamp) < 1000 // Coalesce if within 1 second
  }

  coalesce(command: EditNoteTextCommand): EditNoteTextCommand {
    return new EditNoteTextCommand(this.noteId, this.oldText, command.newText)
  }
}

export class ResizeNoteCommand implements Command {
  description = 'Resize note'
  private readonly noteId: string
  private readonly oldFrame: { x: number; y: number; w: number; h: number }
  private readonly newFrame: { x: number; y: number; w: number; h: number }

  constructor(noteId: string, oldFrame: { x: number; y: number; w: number; h: number }, newFrame: { x: number; y: number; w: number; h: number }) {
    this.noteId = noteId
    this.oldFrame = oldFrame
    this.newFrame = newFrame
  }

  execute(doc: BoardDocument): BoardDocument {
    return {
      ...doc,
      notes: doc.notes.map(note =>
        note.id === this.noteId
          ? { ...note, frame: this.newFrame }
          : note
      )
    }
  }

  undo(doc: BoardDocument): BoardDocument {
    return {
      ...doc,
      notes: doc.notes.map(note =>
        note.id === this.noteId
          ? { ...note, frame: this.oldFrame }
          : note
      )
    }
  }
}

export class CreateConnectionCommand implements Command {
  description = 'Create connection'
  private readonly connection: Connection

  constructor(connection: Connection) {
    this.connection = connection
  }

  execute(doc: BoardDocument): BoardDocument {
    return {
      ...doc,
      connections: [...doc.connections, this.connection]
    }
  }

  undo(doc: BoardDocument): BoardDocument {
    return {
      ...doc,
      connections: doc.connections.filter(c => c.id !== this.connection.id)
    }
  }
}

export class DeleteConnectionCommand implements Command {
  description = 'Delete connection'
  private readonly connection: Connection

  constructor(connection: Connection) {
    this.connection = connection
  }

  execute(doc: BoardDocument): BoardDocument {
    return {
      ...doc,
      connections: doc.connections.filter(c => c.id !== this.connection.id)
    }
  }

  undo(doc: BoardDocument): BoardDocument {
    return {
      ...doc,
      connections: [...doc.connections, this.connection]
    }
  }
}

export class UpdateNotesCommand implements Command {
  description = 'Update note properties'
  private readonly noteIds: string[]
  private readonly updates: Partial<Note>
  private readonly previousStates: Note[]

  constructor(noteIds: string[], updates: Partial<Note>, previousStates: Note[]) {
    this.noteIds = noteIds
    this.updates = updates
    this.previousStates = previousStates
  }

  execute(doc: BoardDocument): BoardDocument {
    return {
      ...doc,
      notes: doc.notes.map(note =>
        this.noteIds.includes(note.id) ? { ...note, ...this.updates } : note
      )
    }
  }

  undo(doc: BoardDocument): BoardDocument {
    const idToPrevious = new Map(this.previousStates.map(n => [n.id, n]))
    return {
      ...doc,
      notes: doc.notes.map(note =>
        idToPrevious.has(note.id) ? idToPrevious.get(note.id)! : note
      )
    }
  }
}

export class UpdateConnectionsCommand implements Command {
  description = 'Update connection properties'
  private readonly connectionIds: string[]
  private readonly updates: Partial<Connection>
  private readonly previousStates: Connection[]

  constructor(connectionIds: string[], updates: Partial<Connection>, previousStates: Connection[]) {
    this.connectionIds = connectionIds
    this.updates = updates
    this.previousStates = previousStates
  }

  execute(doc: BoardDocument): BoardDocument {
    return {
      ...doc,
      connections: doc.connections.map(conn =>
        this.connectionIds.includes(conn.id) ? { ...conn, ...this.updates } : conn
      )
    }
  }

  undo(doc: BoardDocument): BoardDocument {
    const idToPrevious = new Map(this.previousStates.map(c => [c.id, c]))
    return {
      ...doc,
      connections: doc.connections.map(conn =>
        idToPrevious.has(conn.id) ? idToPrevious.get(conn.id)! : conn
      )
    }
  }
}

export class UpdateConnectionEndpointsCommand implements Command {
  description = 'Update connection endpoints'
  private readonly connectionId: string
  private readonly oldSrcNoteId: string
  private readonly oldDstNoteId: string
  private readonly newSrcNoteId: string
  private readonly newDstNoteId: string

  constructor(connectionId: string, oldSrcNoteId: string, oldDstNoteId: string, newSrcNoteId: string, newDstNoteId: string) {
    this.connectionId = connectionId
    this.oldSrcNoteId = oldSrcNoteId
    this.oldDstNoteId = oldDstNoteId
    this.newSrcNoteId = newSrcNoteId
    this.newDstNoteId = newDstNoteId
  }

  execute(doc: BoardDocument): BoardDocument {
    return {
      ...doc,
      connections: doc.connections.map(conn =>
        conn.id === this.connectionId
          ? { ...conn, srcNoteId: this.newSrcNoteId, dstNoteId: this.newDstNoteId }
          : conn
      )
    }
  }

  undo(doc: BoardDocument): BoardDocument {
    return {
      ...doc,
      connections: doc.connections.map(conn =>
        conn.id === this.connectionId
          ? { ...conn, srcNoteId: this.oldSrcNoteId, dstNoteId: this.oldDstNoteId }
          : conn
      )
    }
  }
}

export class InsertNoteOnConnectionCommand implements Command {
  description = 'Insert note on connection'
  private readonly originalConnection: Connection
  private readonly newNote: Note
  private readonly firstNewConnection: Connection
  private readonly secondNewConnection: Connection

  constructor(
    originalConnection: Connection,
    newNote: Note,
    firstNewConnection: Connection,
    secondNewConnection: Connection
  ) {
    this.originalConnection = originalConnection
    this.newNote = newNote
    this.firstNewConnection = firstNewConnection
    this.secondNewConnection = secondNewConnection
  }

  execute(doc: BoardDocument): BoardDocument {
    return {
      ...doc,
      notes: [...doc.notes, this.newNote],
      connections: [
        ...doc.connections.filter(c => c.id !== this.originalConnection.id),
        this.firstNewConnection,
        this.secondNewConnection
      ]
    }
  }

  undo(doc: BoardDocument): BoardDocument {
    return {
      ...doc,
      notes: doc.notes.filter(n => n.id !== this.newNote.id),
      connections: [
        ...doc.connections.filter(c => c.id !== this.firstNewConnection.id && c.id !== this.secondNewConnection.id),
        this.originalConnection
      ]
    }
  }
}