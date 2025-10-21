import type { BoardDocument, Note, Connection, BackgroundShape, Stack } from '../model/types'

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

// Search command for highlighting search results (doesn't modify document)
export class SearchCommand implements Command {
  description = 'Search for text'
  readonly isSelectionCommand = true // Mark as selection-only command

  constructor(
    private readonly searchResults: string[],
    private readonly previousSelection: string[]
  ) {}

  execute(doc: BoardDocument): BoardDocument {
    // Search command doesn't modify the document, just returns it
    // The actual selection is handled by the component state
    return doc
  }

  undo(doc: BoardDocument): BoardDocument {
    // No document modification to undo
    return doc
  }

  canCoalesceWith(command: Command): boolean {
    return command instanceof SearchCommand
  }

  coalesce(command: SearchCommand): SearchCommand {
    return new SearchCommand(command.searchResults, this.previousSelection)
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

// Shape commands

export class CreateShapesCommand implements Command {
  description = 'Create shapes'
  private readonly newShapes: BackgroundShape[]

  constructor(shapes: BackgroundShape[]) {
    this.newShapes = shapes
  }

  execute(doc: BoardDocument): BoardDocument {
    return {
      ...doc,
      shapes: [...doc.shapes, ...this.newShapes]
    }
  }

  undo(doc: BoardDocument): BoardDocument {
    const newIds = new Set(this.newShapes.map(s => s.id))
    return {
      ...doc,
      shapes: doc.shapes.filter(s => !newIds.has(s.id))
    }
  }
}

export class DeleteShapesCommand implements Command {
  description = 'Delete shapes'
  private readonly deletedShapes: BackgroundShape[]

  constructor(deletedShapes: BackgroundShape[]) {
    this.deletedShapes = deletedShapes
  }

  execute(doc: BoardDocument): BoardDocument {
    const deletedIds = new Set(this.deletedShapes.map(s => s.id))
    return {
      ...doc,
      shapes: doc.shapes.filter(s => !deletedIds.has(s.id))
    }
  }

  undo(doc: BoardDocument): BoardDocument {
    return {
      ...doc,
      shapes: [...doc.shapes, ...this.deletedShapes]
    }
  }
}

export class MoveShapesCommand implements Command {
  description = 'Move shapes'
  private readonly shapeMovements: Map<string, { dx: number; dy: number }>

  constructor(movements: Map<string, { dx: number; dy: number }>) {
    this.shapeMovements = movements
  }

  execute(doc: BoardDocument): BoardDocument {
    return {
      ...doc,
      shapes: doc.shapes.map(shape => {
        const movement = this.shapeMovements.get(shape.id)
        if (movement) {
          return {
            ...shape,
            frame: {
              ...shape.frame,
              x: shape.frame.x + movement.dx,
              y: shape.frame.y + movement.dy
            }
          }
        }
        return shape
      })
    }
  }

  undo(doc: BoardDocument): BoardDocument {
    return {
      ...doc,
      shapes: doc.shapes.map(shape => {
        const movement = this.shapeMovements.get(shape.id)
        if (movement) {
          return {
            ...shape,
            frame: {
              ...shape.frame,
              x: shape.frame.x - movement.dx,
              y: shape.frame.y - movement.dy
            }
          }
        }
        return shape
      })
    }
  }

  canCoalesceWith(command: Command): boolean {
    return command instanceof MoveShapesCommand &&
           command.shapeMovements.size === this.shapeMovements.size &&
           Array.from(command.shapeMovements.keys()).every(id => this.shapeMovements.has(id))
  }

  coalesce(command: MoveShapesCommand): MoveShapesCommand {
    const coalescedMovements = new Map<string, { dx: number; dy: number }>()

    // Sum the movements for each shape
    for (const [id, movement] of this.shapeMovements) {
      const otherMovement = command.shapeMovements.get(id)
      if (otherMovement) {
        coalescedMovements.set(id, {
          dx: movement.dx + otherMovement.dx,
          dy: movement.dy + otherMovement.dy
        })
      }
    }

    return new MoveShapesCommand(coalescedMovements)
  }
}

export class ResizeShapesCommand implements Command {
  description = 'Resize shape'
  private readonly shapeId: string
  private readonly oldFrame: { x: number; y: number; w: number; h: number }
  private readonly newFrame: { x: number; y: number; w: number; h: number }

  constructor(shapeId: string, oldFrame: { x: number; y: number; w: number; h: number }, newFrame: { x: number; y: number; w: number; h: number }) {
    this.shapeId = shapeId
    this.oldFrame = oldFrame
    this.newFrame = newFrame
  }

  execute(doc: BoardDocument): BoardDocument {
    return {
      ...doc,
      shapes: doc.shapes.map(shape =>
        shape.id === this.shapeId
          ? { ...shape, frame: this.newFrame }
          : shape
      )
    }
  }

  undo(doc: BoardDocument): BoardDocument {
    return {
      ...doc,
      shapes: doc.shapes.map(shape =>
        shape.id === this.shapeId
          ? { ...shape, frame: this.oldFrame }
          : shape
      )
    }
  }
}

export class UpdateShapesCommand implements Command {
  description = 'Update shape properties'
  private readonly shapeIds: string[]
  private readonly updates: Partial<BackgroundShape>
  private readonly previousStates: BackgroundShape[]

  constructor(shapeIds: string[], updates: Partial<BackgroundShape>, previousStates: BackgroundShape[]) {
    this.shapeIds = shapeIds
    this.updates = updates
    this.previousStates = previousStates
  }

  execute(doc: BoardDocument): BoardDocument {
    return {
      ...doc,
      shapes: doc.shapes.map(shape =>
        this.shapeIds.includes(shape.id) ? { ...shape, ...this.updates } : shape
      )
    }
  }

  undo(doc: BoardDocument): BoardDocument {
    const idToPrevious = new Map(this.previousStates.map(s => [s.id, s]))
    return {
      ...doc,
      shapes: doc.shapes.map(shape =>
        idToPrevious.has(shape.id) ? idToPrevious.get(shape.id)! : shape
      )
    }
  }
}

export class MagneticMoveCommand implements Command {
  description = 'Magnetic shape and note movement'
  private readonly shapeMovements: Map<string, { dx: number; dy: number }>
  private readonly noteMovements: Map<string, { dx: number; dy: number }>
  private readonly previousShapeStates: BackgroundShape[]
  private readonly previousNoteStates: Note[]

  constructor(
    shapeMovements: Map<string, { dx: number; dy: number }>,
    noteMovements: Map<string, { dx: number; dy: number }>,
    previousShapeStates: BackgroundShape[],
    previousNoteStates: Note[]
  ) {
    this.shapeMovements = shapeMovements
    this.noteMovements = noteMovements
    this.previousShapeStates = previousShapeStates
    this.previousNoteStates = previousNoteStates
  }

  execute(doc: BoardDocument): BoardDocument {
    return {
      ...doc,
      shapes: doc.shapes.map(shape => {
        const movement = this.shapeMovements.get(shape.id)
        if (movement) {
          return {
            ...shape,
            frame: {
              ...shape.frame,
              x: shape.frame.x + movement.dx,
              y: shape.frame.y + movement.dy
            }
          }
        }
        return shape
      }),
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
    const shapeIdToPrevious = new Map(this.previousShapeStates.map(s => [s.id, s]))
    const noteIdToPrevious = new Map(this.previousNoteStates.map(n => [n.id, n]))

    return {
      ...doc,
      shapes: doc.shapes.map(shape =>
        shapeIdToPrevious.has(shape.id) ? shapeIdToPrevious.get(shape.id)! : shape
      ),
      notes: doc.notes.map(note =>
        noteIdToPrevious.has(note.id) ? noteIdToPrevious.get(note.id)! : note
      )
    }
  }
}

// Stack commands for STK-1: Make/Unstack functionality and STK-2: Stack manipulation shortcuts

export class AddSiblingNoteCommand implements Command {
  description = 'Add sibling note to stack'
  private readonly targetNoteId: ID
  private readonly position: 'above' | 'below'
  private readonly newNote: Note
  private readonly stackId: ID
  private readonly previousStack?: Stack

  constructor(targetNoteId: ID, position: 'above' | 'below', stacks: Stack[]) {
    this.targetNoteId = targetNoteId
    this.position = position

    // Find the stack that contains the target note
    const targetStack = stacks.find(stack => stack.noteIds.includes(targetNoteId))
    if (!targetStack) {
      throw new Error('Target note must be in a stack')
    }
    this.stackId = targetStack.id

    // Create the new note
    this.newNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      text: '',
      frame: { x: 0, y: 0, w: 200, h: 80 } // Position will be calculated in execute
    }

    // Store previous stack state for undo
    this.previousStack = { ...targetStack }
  }

  execute(doc: BoardDocument): BoardDocument {
    const stack = doc.stacks.find(s => s.id === this.stackId)
    if (!stack) return doc

    const targetIndex = stack.noteIds.indexOf(this.targetNoteId)
    if (targetIndex === -1) return doc

    // Calculate new position for the note
    const targetNote = doc.notes.find(n => n.id === this.targetNoteId)
    if (!targetNote) return doc

    const spacing = stack.spacing || 10
    const newY = targetNote.frame.y + (this.position === 'below' ? spacing : -spacing)

    // Create the updated note with correct position
    const noteWithPosition = {
      ...this.newNote,
      frame: {
        ...this.newNote.frame,
        x: targetNote.frame.x,
        y: newY
      },
      stackId: this.stackId
    }

    // Update the stack noteIds array
    const newNoteIds = [...stack.noteIds]
    const insertIndex = this.position === 'below' ? targetIndex + 1 : targetIndex
    newNoteIds.splice(insertIndex, 0, noteWithPosition.id)

    // Update notes with new positions for all notes below insertion point
    const updatedNotes = doc.notes.map(note => {
      if (note.id === noteWithPosition.id) {
        return noteWithPosition
      }

      const noteIndex = newNoteIds.indexOf(note.id)
      const targetNoteIndex = newNoteIds.indexOf(this.targetNoteId)

      // If this note is after the insertion point, shift it down
      if (note.stackId === this.stackId && noteIndex > targetNoteIndex) {
        return {
          ...note,
          frame: {
            ...note.frame,
            y: note.frame.y + spacing
          }
        }
      }

      return note
    })

    return {
      ...doc,
      notes: [...updatedNotes],
      stacks: doc.stacks.map(s =>
        s.id === this.stackId
          ? { ...s, noteIds: newNoteIds }
          : s
      )
    }
  }

  undo(doc: BoardDocument): BoardDocument {
    if (!this.previousStack) return doc

    // Remove the new note and restore the previous stack
    return {
      ...doc,
      notes: doc.notes.filter(n => n.id !== this.newNote.id),
      stacks: doc.stacks.map(s =>
        s.id === this.stackId
          ? this.previousStack!
          : s
      )
    }
  }
}

export class ChangeIndentCommand implements Command {
  description = 'Change note indent level in stack'
  private readonly noteId: ID
  private readonly direction: 'indent' | 'outdent'
  private readonly previousIndentLevels?: Record<ID, number>
  private readonly stackId: ID

  constructor(noteId: ID, direction: 'indent' | 'outdent', stacks: Stack[]) {
    this.noteId = noteId
    this.direction = direction

    // Find the stack that contains the target note
    const targetStack = stacks.find(stack => stack.noteIds.includes(noteId))
    if (!targetStack) {
      throw new Error('Target note must be in a stack')
    }
    this.stackId = targetStack.id

    // Store current indent levels for undo
    this.previousIndentLevels = targetStack.indentLevels ? { ...targetStack.indentLevels } : {}
  }

  execute(doc: BoardDocument): BoardDocument {
    const stack = doc.stacks.find(s => s.id === this.stackId)
    if (!stack) return doc

    const currentIndentLevels = stack.indentLevels || {}
    const currentLevel = currentIndentLevels[this.noteId] || 0

    let newLevel: number
    if (this.direction === 'indent') {
      newLevel = currentLevel + 1
    } else {
      newLevel = Math.max(0, currentLevel - 1)
    }

    const updatedIndentLevels = {
      ...currentIndentLevels,
      [this.noteId]: newLevel
    }

    return {
      ...doc,
      stacks: doc.stacks.map(s =>
        s.id === this.stackId
          ? { ...s, indentLevels: updatedIndentLevels }
          : s
      )
    }
  }

  undo(doc: BoardDocument): BoardDocument {
    if (!this.previousIndentLevels) return doc

    return {
      ...doc,
      stacks: doc.stacks.map(s =>
        s.id === this.stackId
          ? { ...s, indentLevels: this.previousIndentLevels }
          : s
      )
    }
  }
}

export class CreateStackCommand implements Command {
  description = 'Create stack'
  private readonly newStack: Stack
  private readonly previousNoteStates: Note[]

  constructor(noteIds: ID[], spacing: number = 10) {
    // Generate a unique stack ID
    const stackId = `stack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    this.newStack = {
      id: stackId,
      noteIds: [...noteIds],
      orientation: 'vertical',
      spacing
    }

    // Store previous states for undo
    this.previousNoteStates = []
  }

  execute(doc: BoardDocument): BoardDocument {
    // Store previous note states before modifying them
    const notesToStack = doc.notes.filter(note => this.newStack.noteIds.includes(note.id))
    this.previousNoteStates = notesToStack.map(note => ({ ...note }))

    // Sort notes by Y then X for consistent stacking
    const sortedNotes = notesToStack.sort((a, b) => {
      const yDiff = a.frame.y - b.frame.y
      if (Math.abs(yDiff) > 5) { // If Y difference is significant, use it
        return yDiff
      }
      return a.frame.x - b.frame.x // Otherwise use X as tiebreaker
    })

    // Calculate stack position (use the first note's position)
    const stackX = sortedNotes[0].frame.x
    const stackY = sortedNotes[0].frame.y
    const stackSpacing = this.newStack.spacing || 10

    // Update notes with stack positions
    const updatedNotes = doc.notes.map(note => {
      const noteIndex = sortedNotes.findIndex(n => n.id === note.id)
      if (noteIndex !== -1) {
        const newY = stackY + noteIndex * stackSpacing
        return {
          ...note,
          frame: {
            ...note.frame,
            x: stackX,
            y: newY
          },
          stackId: this.newStack.id
        }
      }
      return note
    })

    return {
      ...doc,
      notes: updatedNotes,
      stacks: [...doc.stacks, this.newStack]
    }
  }

  undo(doc: BoardDocument): BoardDocument {
    // Remove stack and restore notes to their original positions
    const noteIdToPrevious = new Map(this.previousNoteStates.map(n => [n.id, n]))

    return {
      ...doc,
      notes: doc.notes.map(note => {
        const previous = noteIdToPrevious.get(note.id)
        if (previous) {
          return { ...previous }
        }
        // Remove stackId from notes that were in this stack
        if (note.stackId === this.newStack.id) {
          return { ...note, stackId: undefined }
        }
        return note
      }),
      stacks: doc.stacks.filter(stack => stack.id !== this.newStack.id)
    }
  }
}

export class UnstackCommand implements Command {
  description = 'Unstack notes'
  private readonly stackId: ID
  private readonly previousNoteStates: Note[]
  private readonly previousStack?: Stack

  constructor(stackId: ID) {
    this.stackId = stackId
    this.previousNoteStates = []
  }

  execute(doc: BoardDocument): BoardDocument {
    // Find the stack to unstack
    const stack = doc.stacks.find(s => s.id === this.stackId)
    if (!stack) return doc

    // Store previous state for undo
    this.previousStack = stack

    // Get notes in the stack with their current positions
    const stackedNotes = doc.notes.filter(note => note.stackId === this.stackId)
    this.previousNoteStates = stackedNotes.map(note => ({ ...note }))

    // Calculate unstack positions in a grid layout
    const spacing = 20
    const notesPerRow = Math.ceil(Math.sqrt(stack.noteIds.length))

    const updatedNotes = doc.notes.map(note => {
      if (note.stackId === this.stackId) {
        const noteIndex = stack.noteIds.indexOf(note.id)
        const row = Math.floor(noteIndex / notesPerRow)
        const col = noteIndex % notesPerRow

        return {
          ...note,
          frame: {
            ...note.frame,
            x: note.frame.x + col * spacing,
            y: note.frame.y + row * spacing
          },
          stackId: undefined
        }
      }
      return note
    })

    return {
      ...doc,
      notes: updatedNotes,
      stacks: doc.stacks.filter(s => s.id !== this.stackId)
    }
  }

  undo(doc: BoardDocument): BoardDocument {
    if (!this.previousStack) return doc

    const noteIdToPrevious = new Map(this.previousNoteStates.map(n => [n.id, n]))

    return {
      ...doc,
      notes: doc.notes.map(note => {
        const previous = noteIdToPrevious.get(note.id)
        if (previous) {
          return { ...previous }
        }
        return note
      }),
      stacks: [...doc.stacks, this.previousStack]
    }
  }
}

// STK-3: Stack Alignment and Distribution Commands

export type AlignmentType = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'
export type DistributionType = 'horizontal' | 'vertical'

export class AlignNotesCommand implements Command {
  description = 'Align notes'
  private readonly noteIds: string[]
  private readonly alignmentType: AlignmentType
  private readonly previousNoteStates: Note[]

  constructor(noteIds: string[], alignmentType: AlignmentType) {
    this.noteIds = noteIds
    this.alignmentType = alignmentType
    this.previousNoteStates = []
  }

  execute(doc: BoardDocument): BoardDocument {
    const notesToAlign = doc.notes.filter(note => this.noteIds.includes(note.id))
    if (notesToAlign.length < 2) return doc

    // Store previous states for undo
    this.previousNoteStates = notesToAlign.map(note => ({ ...note }))

    let alignValue: number

    switch (this.alignmentType) {
      case 'left':
        alignValue = Math.min(...notesToAlign.map(n => n.frame.x))
        break
      case 'center':
        const leftmost = Math.min(...notesToAlign.map(n => n.frame.x))
        const rightmost = Math.max(...notesToAlign.map(n => n.frame.x + n.frame.w))
        alignValue = (leftmost + rightmost) / 2
        break
      case 'right':
        alignValue = Math.max(...notesToAlign.map(n => n.frame.x + n.frame.w))
        break
      case 'top':
        alignValue = Math.min(...notesToAlign.map(n => n.frame.y))
        break
      case 'middle':
        const topmost = Math.min(...notesToAlign.map(n => n.frame.y))
        const bottommost = Math.max(...notesToAlign.map(n => n.frame.y + n.frame.h))
        alignValue = (topmost + bottommost) / 2
        break
      case 'bottom':
        alignValue = Math.max(...notesToAlign.map(n => n.frame.y + n.frame.h))
        break
      default:
        return doc
    }

    const updatedNotes = doc.notes.map(note => {
      if (this.noteIds.includes(note.id)) {
        let newFrame = { ...note.frame }

        switch (this.alignmentType) {
          case 'left':
            newFrame.x = alignValue
            break
          case 'center':
            newFrame.x = alignValue - note.frame.w / 2
            break
          case 'right':
            newFrame.x = alignValue - note.frame.w
            break
          case 'top':
            newFrame.y = alignValue
            break
          case 'middle':
            newFrame.y = alignValue - note.frame.h / 2
            break
          case 'bottom':
            newFrame.y = alignValue - note.frame.h
            break
        }

        return { ...note, frame: newFrame }
      }
      return note
    })

    return { ...doc, notes: updatedNotes }
  }

  undo(doc: BoardDocument): BoardDocument {
    const noteIdToPrevious = new Map(this.previousNoteStates.map(n => [n.id, n]))

    return {
      ...doc,
      notes: doc.notes.map(note => {
        const previous = noteIdToPrevious.get(note.id)
        if (previous) {
          return { ...previous }
        }
        return note
      })
    }
  }
}

export class DistributeNotesCommand implements Command {
  description = 'Distribute notes'
  private readonly noteIds: string[]
  private readonly distributionType: DistributionType
  private readonly previousNoteStates: Note[]

  constructor(noteIds: string[], distributionType: DistributionType) {
    this.noteIds = noteIds
    this.distributionType = distributionType
    this.previousNoteStates = []
  }

  execute(doc: BoardDocument): BoardDocument {
    const notesToDistribute = doc.notes.filter(note => this.noteIds.includes(note.id))
    if (notesToDistribute.length < 3) return doc

    // Store previous states for undo
    this.previousNoteStates = notesToDistribute.map(note => ({ ...note }))

    // Sort notes based on distribution type
    const sortedNotes = [...notesToDistribute].sort((a, b) => {
      if (this.distributionType === 'horizontal') {
        return a.frame.x - b.frame.x
      } else {
        return a.frame.y - b.frame.y
      }
    })

    if (this.distributionType === 'horizontal') {
      // Calculate equal spacing horizontally
      const leftmost = sortedNotes[0].frame.x
      const rightmost = sortedNotes[sortedNotes.length - 1].frame.x + sortedNotes[sortedNotes.length - 1].frame.w
      const totalSpace = rightmost - leftmost
      const totalWidth = sortedNotes.reduce((sum, note) => sum + note.frame.w, 0)
      const availableSpace = totalSpace - totalWidth
      const spacing = availableSpace / (sortedNotes.length - 1)

      let currentX = leftmost
      const noteIdToNewX = new Map<string, number>()

      sortedNotes.forEach((note, index) => {
        if (index === 0) {
          noteIdToNewX.set(note.id, note.frame.x)
          currentX += note.frame.w + spacing
        } else if (index === sortedNotes.length - 1) {
          noteIdToNewX.set(note.id, rightmost - note.frame.w)
        } else {
          noteIdToNewX.set(note.id, currentX)
          currentX += note.frame.w + spacing
        }
      })

      return {
        ...doc,
        notes: doc.notes.map(note => {
          const newX = noteIdToNewX.get(note.id)
          if (newX !== undefined) {
            return {
              ...note,
              frame: { ...note.frame, x: newX }
            }
          }
          return note
        })
      }
    } else {
      // Calculate equal spacing vertically
      const topmost = sortedNotes[0].frame.y
      const bottommost = sortedNotes[sortedNotes.length - 1].frame.y + sortedNotes[sortedNotes.length - 1].frame.h
      const totalSpace = bottommost - topmost
      const totalHeight = sortedNotes.reduce((sum, note) => sum + note.frame.h, 0)
      const availableSpace = totalSpace - totalHeight
      const spacing = availableSpace / (sortedNotes.length - 1)

      let currentY = topmost
      const noteIdToNewY = new Map<string, number>()

      sortedNotes.forEach((note, index) => {
        if (index === 0) {
          noteIdToNewY.set(note.id, note.frame.y)
          currentY += note.frame.h + spacing
        } else if (index === sortedNotes.length - 1) {
          noteIdToNewY.set(note.id, bottommost - note.frame.h)
        } else {
          noteIdToNewY.set(note.id, currentY)
          currentY += note.frame.h + spacing
        }
      })

      return {
        ...doc,
        notes: doc.notes.map(note => {
          const newY = noteIdToNewY.get(note.id)
          if (newY !== undefined) {
            return {
              ...note,
              frame: { ...note.frame, y: newY }
            }
          }
          return note
        })
      }
    }
  }

  undo(doc: BoardDocument): BoardDocument {
    const noteIdToPrevious = new Map(this.previousNoteStates.map(n => [n.id, n]))

    return {
      ...doc,
      notes: doc.notes.map(note => {
        const previous = noteIdToPrevious.get(note.id)
        if (previous) {
          return { ...previous }
        }
        return note
      })
    }
  }
}

export class ResizeNotesCommand implements Command {
  description = 'Resize notes to same dimensions'
  private readonly noteIds: string[]
  private readonly resizeType: 'width' | 'height' | 'both'
  private readonly targetWidth?: number
  private readonly targetHeight?: number
  private readonly previousNoteStates: Note[]

  constructor(noteIds: string[], resizeType: 'width' | 'height' | 'both', targetWidth?: number, targetHeight?: number) {
    this.noteIds = noteIds
    this.resizeType = resizeType
    this.targetWidth = targetWidth
    this.targetHeight = targetHeight
    this.previousNoteStates = []
  }

  execute(doc: BoardDocument): BoardDocument {
    const notesToResize = doc.notes.filter(note => this.noteIds.includes(note.id))
    if (notesToResize.length < 2) return doc

    // Store previous states for undo
    this.previousNoteStates = notesToResize.map(note => ({ ...note }))

    // Calculate target dimensions if not provided
    let finalWidth = this.targetWidth
    let finalHeight = this.targetHeight

    if (finalWidth === undefined && (this.resizeType === 'width' || this.resizeType === 'both')) {
      // Use average width of selected notes
      finalWidth = Math.round(notesToResize.reduce((sum, note) => sum + note.frame.w, 0) / notesToResize.length)
    }

    if (finalHeight === undefined && (this.resizeType === 'height' || this.resizeType === 'both')) {
      // Use average height of selected notes
      finalHeight = Math.round(notesToResize.reduce((sum, note) => sum + note.frame.h, 0) / notesToResize.length)
    }

    const updatedNotes = doc.notes.map(note => {
      if (this.noteIds.includes(note.id)) {
        let newFrame = { ...note.frame }

        if (this.resizeType === 'width' || this.resizeType === 'both') {
          newFrame.w = finalWidth!
        }

        if (this.resizeType === 'height' || this.resizeType === 'both') {
          newFrame.h = finalHeight!
        }

        return { ...note, frame: newFrame }
      }
      return note
    })

    return { ...doc, notes: updatedNotes }
  }

  undo(doc: BoardDocument): BoardDocument {
    const noteIdToPrevious = new Map(this.previousNoteStates.map(n => [n.id, n]))

    return {
      ...doc,
      notes: doc.notes.map(note => {
        const previous = noteIdToPrevious.get(note.id)
        if (previous) {
          return { ...previous }
        }
        return note
      })
    }
  }
}