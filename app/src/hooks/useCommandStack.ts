import { useReducer, useCallback, useEffect, useRef } from 'react'
import { CommandStack, type Command } from '../state/commands'
import type { BoardDocument } from '../model/types'

type CommandStackState = {
  document: BoardDocument
  commandStack: CommandStack
}

type CommandStackAction =
  | { type: 'EXECUTE_COMMAND'; command: Command }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SET_DOCUMENT'; document: BoardDocument }

function commandStackReducer(state: CommandStackState, action: CommandStackAction): CommandStackState {
  switch (action.type) {
    case 'EXECUTE_COMMAND':
      return {
        ...state,
        document: state.commandStack.execute(action.command, state.document)
      }
    case 'UNDO':
      const undoneDoc = state.commandStack.undo(state.document)
      return undoneDoc ? { ...state, document: undoneDoc } : state
    case 'REDO':
      const redoneDoc = state.commandStack.redo(state.document)
      return redoneDoc ? { ...state, document: redoneDoc } : state
    case 'SET_DOCUMENT':
      return {
        document: action.document,
        commandStack: new CommandStack() // Reset command stack when document is replaced
      }
    default:
      return state
  }
}

export function useCommandStack(initialDocument: BoardDocument) {
  const [state, dispatch] = useReducer(commandStackReducer, {
    document: initialDocument,
    commandStack: new CommandStack()
  })

  // Execute a command
  const executeCommand = useCallback((command: Command) => {
    dispatch({ type: 'EXECUTE_COMMAND', command })
  }, [])

  // Undo last action
  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' })
  }, [])

  // Redo last action
  const redo = useCallback(() => {
    dispatch({ type: 'REDO' })
  }, [])

  // Set document directly (used for file operations)
  const setDocument = useCallback((document: BoardDocument) => {
    dispatch({ type: 'SET_DOCUMENT', document })
  }, [])

  // Getters for UI state
  const canUndo = state.commandStack.canUndo()
  const canRedo = state.commandStack.canRedo()
  const undoDescription = state.commandStack.getUndoDescription()
  const redoDescription = state.commandStack.getRedoDescription()

  // Set up keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if we're in an input field or textarea - don't intercept undo/redo there
      const activeElement = document.activeElement
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        return
      }

      // Undo: Ctrl+Z or Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !e.shiftKey) {
        e.preventDefault()
        if (canUndo) {
          undo()
        }
      }

      // Redo: Ctrl+Shift+Z or Cmd+Shift+Z, or Ctrl+Y or Cmd+Y
      if ((e.ctrlKey || e.metaKey) &&
          ((e.code === 'KeyZ' && e.shiftKey) || e.code === 'KeyY')) {
        e.preventDefault()
        if (canRedo) {
          redo()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [canUndo, canRedo, undo, redo])

  return {
    document: state.document,
    executeCommand,
    undo,
    redo,
    setDocument,
    canUndo,
    canRedo,
    undoDescription,
    redoDescription
  }
}